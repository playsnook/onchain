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

    event GameAllowed(address indexed from, uint tokenId);
    event Entrance(address indexed from, uint tokenId);
    event Extraction(address indexed to, uint tokenId);
    event Death(address indexed to, uint tokenId);
    event Ressurection(address indexed from, uint tokenId);
    event Birth(address indexed to, uint tokenId);

    SnookToken private _snook;
    SkillToken private _skill;
    IUiniswapUSDCSkill private _uniswap;
    
    struct Descriptor {
        uint[] traitIds;
        uint ressurectionPrice;
        uint ressurectionCount;
        uint[] onRessurectionTraitIds;
        string onRessurectionTokenURI;
        bool ingame;
        uint deathTime;
        bool gameAllowed; // contract get the token to play only when this flag is true
    }
    // mapping of token ids to descriptors
    mapping (uint => Descriptor) private _descriptors;

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
    
    // Wallet Server got trait ids from game server and mints a token
    function mint(address to, uint[] memory traitIds, string memory tokenURI_) public onlyOwner {
        uint price = _uniswap.getSnookPriceInSkills();
        require(_skill.transferFrom(to, address(this), price), 'Not enough funds for minting');
        uint tokenId = _snook.mint(to, tokenURI_);
        _descriptors[tokenId] = Descriptor({
            traitIds: traitIds,
            deathTime: 0,
            ressurectionPrice: 0,
            ressurectionCount: 0,
            onRessurectionTokenURI: "",
            onRessurectionTraitIds: new uint256[](0),
            ingame: false,
            gameAllowed: false
        });
        _skill.burn(address(this), price);     
        emit Birth(to, tokenId);
    }

    // function is called by WS periodically to bury dead snooks
    function bury() public onlyOwner {
        for (uint i = 0; i < _snook.totalSupply(); i++ ) {
            uint tokenId = _snook.tokenByIndex(i);
            if (_descriptors[tokenId].ingame == true && _descriptors[tokenId].deathTime < block.timestamp + 65 minutes) {
                _snook.burn(tokenId);
                delete _descriptors[tokenId];
            }
        }
    }
    
    // Snook owner calls this function to permit game contract to get him to the game = lock his token
    function allowGame(uint256 tokenId) public {
        address owner = _snook.ownerOf(tokenId);
        require(owner == msg.sender, 'Not token owner');
        _descriptors[tokenId].gameAllowed = true;
        emit GameAllowed(owner, tokenId);
    }

    function enterGame(uint256 tokenId) public onlyOwner {
        require(_descriptors[tokenId].ingame == false, 'Snook is already in play');
        require(_descriptors[tokenId].gameAllowed == true, 'Snook is not allowed for playing');
        _snook.lock(tokenId, true);
        _descriptors[tokenId].ingame = true;
        emit Entrance(_snook.ownerOf(tokenId), tokenId);
    }

    // extract snook without updating traits and url
    function _extractSnookWithoutUpdate(uint256 tokenId) private {
        require(_descriptors[tokenId].ingame == true, 'Snook is not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Snook is dead');

        _descriptors[tokenId].ingame = false;
        _descriptors[tokenId].gameAllowed = false;
        _snook.lock(tokenId, false);

        emit Extraction(_snook.ownerOf(tokenId), tokenId);
    }

    // Extracts snooks with ids without updating traits and uris. 
    // Called on GS failure.
    // Can be replaced by looping over _extractFromGame from WS, but we want to save gas. 
    function extractSnooksWithoutUpdate(uint256[] memory tokenIds) public onlyOwner {
        for (uint i = 0; i < tokenIds.length; i++) {
            _extractSnookWithoutUpdate(tokenIds[i]);
        }
    }

    // called by WS when snook successfully extracts snook
    function extractSnook(uint256 tokenId, uint[] memory traitIds, string memory tokenURI_) public onlyOwner {
        require(_descriptors[tokenId].ingame == true, 'Snook is not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Snook is dead');
        _snook.setTokenURI(tokenId, tokenURI_); 
        _descriptors[tokenId].traitIds = traitIds; 
        
        _descriptors[tokenId].ingame = false;
        _descriptors[tokenId].gameAllowed = false;
        _snook.lock(tokenId, false);

        emit Extraction(_snook.ownerOf(tokenId), tokenId);
    }

    // called by WS when snook is dead; newTraits are updated according to penalty
    function setDeathTime(uint256 tokenId, uint[] memory onRessurectionTraitIds, string memory onRessurectionTokenURI) public onlyOwner {
        require(_descriptors[tokenId].ingame == true, 'Snook is not in play'); // prevent wallet server from errors
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
        _snook.setTokenURI(tokenId, _descriptors[tokenId].onRessurectionTokenURI);
        _descriptors[tokenId].traitIds = _descriptors[tokenId].onRessurectionTraitIds;
        
        _descriptors[tokenId].ingame = false;
        _descriptors[tokenId].gameAllowed = false;
        _snook.lock(tokenId, false);

        emit Ressurection(snookOwner, tokenId);
    }

    function _getRessurectionPrice(uint256 tokenId) private view returns (uint256 price) {
        require(_descriptors[tokenId].ingame == true, 'Snook is not in play');
        uint256 k = _uniswap.getSnookPriceInSkills();
        int128 d = _getRessurectionDifficulty(tokenId); 
        price = ABDKMath64x64.mulu(d, k);
    }

    function _getRessurectionDifficulty(uint256 tokenId) private view returns (int128) {
        int128 s = ABDKMath64x64.fromUInt(0);  // difficulty to be calculated
        int128[] memory f; // probability density
        
        uint bin; 
        // should be refactored to avoid loops
        for (uint i = 0; i < _snook.totalSupply(); i++) {
            uint _tokenId = _snook.tokenByIndex(i);
            
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

        int128 totalLiveSnooks = ABDKMath64x64.fromUInt(_snook.totalSupply());
        s = ABDKMath64x64.div(s, totalLiveSnooks); // standing, s(b)
        int128 numOfTraits = ABDKMath64x64.fromUInt(bin);
        
        // difficulty coef,  d = exp(s) * traits^2
        return ABDKMath64x64.mul(ABDKMath64x64.exp(s), ABDKMath64x64.mul(numOfTraits, numOfTraits));
    }

}