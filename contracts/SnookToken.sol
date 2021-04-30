// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";

import "hardhat/console.sol";


import "./SkillToken.sol";

// about tokenURI in v4: https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978

contract SnookToken is ERC721, ERC721Burnable, Ownable {
    uint public SNOOK_PRICE = 10; // DEBUG ONLY

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
  
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _mintRequesters;
    mapping (address => uint) _mintPrice;
    
    
    event Entrance(address indexed from, uint tokenId);
    event Extraction(address indexed to, uint tokenId);
    event Death(address indexed to, uint tokenId);
    event Ressurection(address indexed from, uint tokenId);

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
    mapping (uint => Descriptor) private _descriptors;

    SkillToken skill;
    constructor(address skillAddr) ERC721("SnookToken", "SNK") {
        skill = SkillToken(skillAddr);
    }

    function describe(uint tokenId) public view returns (
        uint[] memory traitIds, 
        uint ressurectionPrice, 
        uint ressurectionCount 
    ) {
        require(ownerOf(tokenId) == _msgSender(), 'Only token owner has access');
        return (
            _descriptors[tokenId].traitIds,
            _descriptors[tokenId].ressurectionPrice,
            _descriptors[tokenId].ressurectionCount
        );

    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _descriptors[tokenId].tokenURI;
    }
    

    // if requestMint listeners are down and missed the request
    // cronjob servers can get all pending requests for mint and do the job
    function getMintRequesters() public view onlyOwner returns(address[] memory buyers) {
        buyers = new address[](_mintRequesters.length());
        for (uint i=0; i<_mintRequesters.length(); i++) {
            buyers[i] = _mintRequesters.at(i);
        }
    }

    // send skill tokens to CONTRACT address, not to contract owner
    // we cannot steal this money
    function requestMint() public {
        address to = msg.sender;
        require(_mintRequesters.contains(to) == false, 'Previous minting is in progress');
        require(skill.transferFrom(to, address(this), SNOOK_PRICE), 'Not enough funds for minting');
        _mintRequesters.add(to);
        _mintPrice[to] = SNOOK_PRICE;
    }


    
    // Wallet Server got trait ids from game server and mints a token
    function mint(address to, uint[] memory initialTraitIds, string memory tokenURI_) public onlyOwner {
        require(_mintRequesters.contains(to), 'No payment made for snook');

        _tokenIds.increment(); // start from 1
        uint256 tokenId = _tokenIds.current();   
        _mint(to, tokenId);
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

        skill.burn(address(this), _mintPrice[to]);
        _mintRequesters.remove(to);        
    }

    // function is called by WS periodically to bury dead snooks
    function bury() public onlyOwner {
        for (uint256 tokenId = _tokenIds.current(); tokenId > 0; tokenId-- ) {
            if (_descriptors[tokenId].inplay == true && _descriptors[tokenId].deathTime < block.timestamp + 65 minutes) {
                delete _descriptors[tokenId];
                _burn(tokenId);
            }
        }
    }
    
    function enterGame(uint256 tokenId) public {
        require(ownerOf(tokenId) == _msgSender());
        require(_descriptors[tokenId].inplay == false, 'Snook is already in play');
        _descriptors[tokenId].inplay = true;
        emit Entrance(ownerOf(tokenId), tokenId);
    }

    // lock token if it's in play
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);
        require(_descriptors[tokenId].inplay == false, 'Token is locked');
    }

    // called by WS when snook successfully extracts snook
    function extractFromGame(uint256 tokenId, uint[] memory newTraitIds, string memory tokenURI_) public onlyOwner {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Snook is dead');
        
        _descriptors[tokenId].inplay = false;
        _descriptors[tokenId].tokenURI = tokenURI_;
        for (uint i=0; i<newTraitIds.length; i++) {
            _descriptors[tokenId].traitIds.push(newTraitIds[i]);
        }

        emit Extraction(ownerOf(tokenId), tokenId);
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

        emit Death(ownerOf(tokenId), tokenId);
    }

    // 1. user should approve contract to get amount of skill
    // 2. skill tokens should go to treasury contract address
    // 3. Ressurections is followed by penalty of ressurectionCount + 1 traits. 
    // 4. Resurrection with penalty can lead to a snook with 0 traits. 
    function ressurect(uint256 tokenId) public {
        require(ownerOf(tokenId) == _msgSender(), 'Only snook owner can ressurect dead snook');
        require(_descriptors[tokenId].deathTime > 0, 'Snook is not dead');
        // UNCOMMENT FOR PRODUCTION:
        // require(_descriptors[tokenId].deathTime <= block.timestamp + 60 minutes, 'Ressurection period of snook elapsed');

        require(skill.transferFrom(ownerOf(tokenId), address(this), _descriptors[tokenId].ressurectionPrice));

        _descriptors[tokenId].ressurectionCount += 1; // no overflow with solc8
        _descriptors[tokenId].deathTime = 0;
        _descriptors[tokenId].tokenURI = _descriptors[tokenId].onRessurectionTokenURI;
        _descriptors[tokenId].traitIds = _descriptors[tokenId].onRessurectionTraitIds;
        _descriptors[tokenId].inplay = false;

        emit Ressurection(_msgSender(), tokenId);
    }

    function _getRessurectionPrice(uint256 tokenId) private view returns (uint256) {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play');
        int128 k = ABDKMath64x64.fromUInt(100); // now it's set to 100 to recover fraction from D
        int128 S = ABDKMath64x64.fromUInt(1); // skill.totalSupply();
        int128 D = _getRessurectionDifficulty(tokenId); // it is a fraction
        int128 price = ABDKMath64x64.div(ABDKMath64x64.mul(D, k), S);
        return ABDKMath64x64.toUInt(price); // will truncate fraction, for example if price=6.6 as 64x64 then after toUInt it gets 6
    }

    function _getRessurectionDifficulty(uint256 tokenId) private view returns (int128) {
        int128 D = ABDKMath64x64.fromUInt(0);  // difficulty to be calculated
        int128[] memory f; // probability density
        int128 totalLiveSnooks = ABDKMath64x64.fromUInt(0);
        uint bin; // var is used for better code understanding; may be removed to save some memory usage
        
        for (uint i = _tokenIds.current(); i > 0; i--) {
            if (!_exists(i)) { // skip burnt tokens
                continue;
            }
            totalLiveSnooks = ABDKMath64x64.add(totalLiveSnooks, ABDKMath64x64.fromUInt(1));
        
            bin = _descriptors[i].traitIds.length;
            if (f.length < bin) { 
                f = new int128[](bin);
            }
            f[bin-1] = ABDKMath64x64.add(f[bin-1], ABDKMath64x64.fromUInt(1));
        }

        bin = _descriptors[tokenId].traitIds.length;
        for (uint i=0; i<bin ; i++) {
            D = ABDKMath64x64.add(D, f[i]);
        }
        D = ABDKMath64x64.div(D, totalLiveSnooks);
        return D;
    }

}