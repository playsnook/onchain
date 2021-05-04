// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";

import "./SnookToken.sol";
import "./SkillToken.sol";
import "./IUniswapUSDCSkill.sol";

// about tokenURI in v4: https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978

contract SnookGame is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    
    event Entrance(address indexed from, uint tokenId);
    event Extraction(address indexed to, uint tokenId);
    event Death(address indexed to, uint tokenId);
    event Ressurection(address indexed from, uint tokenId);
    event RequestMint(address indexed to);

    SnookToken private _snook;
    SkillToken private _skill;
    IUiniswapUSDCSkill private _uniswap;
    
    EnumerableSet.AddressSet private _mintRequesters;
    mapping (address => uint) _mintPrice;
    
    // Open to public:
    // 1. trait ids
    // 2. special skin id, name, description?
    // 3. resurrectionCount
    
    // tokenURI should be several urls for in-game and off-game, contract
    struct Descriptor {
        uint[] traitIds;
        string tokenURI;
        uint ressurectionPrice;
        uint ressurectionCount;
        uint[] onRessurectionTraitIds;
        string onRessurectionTokenURI;
        bool inplay;
        uint deathTime;
    }
    // mapping of token ids to descriptors
    mapping (uint => Descriptor) private _descriptors;

    // decoupling tookenIds returned by mint of SnookToken from SnookGame;
    // we don't want to implicitly use knowledge of how tokenIds of SnookToken
    // are generated; so ids of SnookTokens can be hashes and not consequetive integers;
    // So we track these ids with enumarable set.
    // Needed by ressurection procedure which goes over all available tokens.
    EnumerableSet.UintSet private _tokenIds;

    constructor(address snook_, address skill_, address uniswap_) {
        _snook = SnookToken(snook_);
        _skill = SkillToken(skill_);
        _uniswap = IUiniswapUSDCSkill(uniswap_);
    }

    function describe(uint tokenId) public view returns (
        uint[] memory traitIds, 
        uint ressurectionPrice, 
        uint ressurectionCount
        ) 
    {
        require(_snook.ownerOf(tokenId) == msg.sender, 'Only token owner has access');
        return (
            _descriptors[tokenId].traitIds,
            _descriptors[tokenId].ressurectionPrice,
            _descriptors[tokenId].ressurectionCount
        );

    }

    // if requestMint listeners are down and missed the request
    // cronjob servers can get all pending requests for mint and do the job
    // maybe we don't need this function as all requried data can be retrieved from logs
    // if this function drops we don't need enumarable set
    function getMintRequesters() public view onlyOwner returns(address[] memory buyers) {
        buyers = new address[](_mintRequesters.length());
        for (uint i=0; i<_mintRequesters.length(); i++) {
            buyers[i] = _mintRequesters.at(i);
        }
    }

    // send skill tokens to CONTRACT address, not to contract owner
    // we cannot steal this money
    // WS listens on the requestMint events and calls game server to get initialTraitIds
    function requestMint() public {
        address to = msg.sender;
        require(_mintRequesters.contains(to) == false, 'Previous minting is in progress');
        require(_skill.transferFrom(to, address(this), _uniswap.getSnookPriceInSkills()), 'Not enough funds for minting');
        _mintRequesters.add(to);
        _mintPrice[to] = _uniswap.getSnookPriceInSkills();
        emit RequestMint(to);
    }


    
    // Wallet Server got trait ids from game server and mints a token
    function mint(address to, uint[] memory initialTraitIds, string memory tokenURI_) public onlyOwner {
        require(_mintRequesters.contains(to), 'No payment made for snook');
        uint tokenId = _snook.mint(to, tokenURI_);
        _descriptors[tokenId] = Descriptor({
            traitIds: initialTraitIds,
            deathTime: 0,
            ressurectionPrice: 0,
            ressurectionCount: 0,
            onRessurectionTokenURI: "",
            onRessurectionTraitIds: new uint256[](0),
            inplay: false,
            tokenURI: tokenURI_
        });
        _tokenIds.add(tokenId);
        _skill.burn(address(this), _mintPrice[to]);
        _mintRequesters.remove(to);        
    }

    // function is called by WS periodically to bury dead snooks
    function bury() public onlyOwner {
        for (uint i = 0; i < _tokenIds.length(); i++ ) {
            uint tokenId = _tokenIds.at(i);
            if (_descriptors[tokenId].inplay == true && _descriptors[tokenId].deathTime < block.timestamp + 65 minutes) {
                _snook.burn(tokenId);
                delete _descriptors[tokenId];
                _tokenIds.remove(tokenId);
            }
        }
    }
    
    function enterGame(uint256 tokenId) public {
        address owner = _snook.ownerOf(tokenId);
        require(owner == msg.sender);
        require(_descriptors[tokenId].inplay == false, 'Snook is already in play');
        _snook.lock(tokenId, true);
        _descriptors[tokenId].inplay = true;
        emit Entrance(owner, tokenId);
    }


    // called by WS when snook successfully extracts snook
    function extractFromGame(uint256 tokenId, uint[] memory newTraitIds, string memory tokenURI_) public onlyOwner {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Snook is dead');
        
        _descriptors[tokenId].tokenURI = tokenURI_;
        for (uint i=0; i<newTraitIds.length; i++) {
            _descriptors[tokenId].traitIds.push(newTraitIds[i]);
        }

        _descriptors[tokenId].inplay = false;
        _snook.lock(tokenId, false);

        emit Extraction(_snook.ownerOf(tokenId), tokenId);
    }

    // called by WS when snook is dead; newTraits are updated according to penalty
    function setDeathTime(uint256 tokenId, uint[] memory onRessurectionTraitIds, string memory onRessurectionTokenURI) public onlyOwner {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play'); // prevent wallet server from errors
        _descriptors[tokenId].deathTime = block.timestamp;

        // ressurection price is based on traits of dying snook 
        _descriptors[tokenId].ressurectionPrice = _getRessurectionPrice(tokenId);

        // remember what traits should be assigned to snook on ressurection
        _descriptors[tokenId].onRessurectionTraitIds = onRessurectionTraitIds;
        _descriptors[tokenId].onRessurectionTokenURI = onRessurectionTokenURI;

        emit Death(_snook.ownerOf(tokenId), tokenId);
    }

    // 1. user should approve contract to get amount of skill
    // 2. skill tokens should go to treasury contract address
    // 3. Ressurections is followed by penalty of ressurectionCount + 1 traits. 
    // 4. Resurrection with penalty can lead to a snook with 0 traits. 
    function ressurect(uint256 tokenId) public {
        address snookOwner = _snook.ownerOf(tokenId);
        require(snookOwner == msg.sender, 'Only snook owner can ressurect dead snook');
        require(_descriptors[tokenId].deathTime > 0, 'Snook is not dead');
        // UNCOMMENT FOR PRODUCTION:
        // require(_descriptors[tokenId].deathTime <= block.timestamp + 60 minutes, 'Ressurection period of snook elapsed');

        require(_skill.transferFrom(snookOwner, address(this), _descriptors[tokenId].ressurectionPrice));

        _descriptors[tokenId].ressurectionCount += 1; // no overflow with solc8
        _descriptors[tokenId].deathTime = 0;
        _descriptors[tokenId].tokenURI = _descriptors[tokenId].onRessurectionTokenURI;
        _descriptors[tokenId].traitIds = _descriptors[tokenId].onRessurectionTraitIds;
        _descriptors[tokenId].inplay = false;
        
        _snook.lock(tokenId, false);

        emit Ressurection(snookOwner, tokenId);
    }

    function _getRessurectionPrice(uint256 tokenId) private view returns (uint256 price) {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play');
        uint256 k = _uniswap.getSnookPriceInSkills();
        int128 d = _getRessurectionDifficulty(tokenId); 
        price = ABDKMath64x64.mulu(d, k);
    }

    function _getRessurectionDifficulty(uint256 tokenId) private view returns (int128) {
        int128 s = ABDKMath64x64.fromUInt(0);  // difficulty to be calculated
        int128[] memory f; // probability density
        
        uint bin; // var is used for better code understanding; may be removed to save some memory usage
        for (uint i = 0; i < _tokenIds.length(); i++) {
            uint _tokenId = _tokenIds.at(i);
            
            bin = _descriptors[_tokenId].traitIds.length;
            if (f.length < bin) { 
                f = new int128[](bin);
            }
            f[bin-1] = ABDKMath64x64.add(f[bin-1], ABDKMath64x64.fromUInt(1));
        }

        bin = _descriptors[tokenId].traitIds.length;
        for (uint i=0; i<bin ; i++) {
            s = ABDKMath64x64.add(s, f[i]);
        }

        int128 totalLiveSnooks = ABDKMath64x64.fromUInt(_tokenIds.length());
        s = ABDKMath64x64.div(s, totalLiveSnooks); // standing, s(b)
        int128 numOfTraits = ABDKMath64x64.fromUInt(bin);
        
        // difficulty coef,  d = exp(s) * traits^2
        return ABDKMath64x64.mul(ABDKMath64x64.exp(s), ABDKMath64x64.mul(numOfTraits, numOfTraits));
    }

}