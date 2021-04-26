// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";

import "./SkillToken.sol";

// about tokenURI in v4: https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978

contract SnookToken is ERC721, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    event Entrance(address indexed from, uint tokenId);
    event Extraction(address indexed to, uint tokenId);
    event Death(address indexed to, uint tokenId, uint timestamp);
    event Ressurection(address indexed from, uint tokenId);

    struct Descriptor {
        uint[] traitIds;
        uint specialSkinId;
        string tokenURI;
        uint ressurectionPrice;
        uint ressurectionCount;
        bool inplay;
        uint deathTime;
    }
    mapping (uint => Descriptor) private _descriptors;

    SkillToken skill;

    constructor(address skillAddr) ERC721("SnookToken", "SNK") {
        skill = SkillToken(skillAddr);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _descriptors[tokenId].tokenURI;
    }
    
    // mint will be done by contract itself not by owner to mint in exchange for SKILL
    function mint(address to, string memory metaTokenURI) public onlyOwner {
        _tokenIds.increment(); // start from 1
        uint256 newItemId = _tokenIds.current();   
        _mint(to, newItemId);
        _descriptors[newItemId] = Descriptor({
            traitIds: new uint256[](0),
            specialSkinId: 0, 
            deathTime: 0,
            ressurectionPrice: 0,
            ressurectionCount: 0,
            inplay: false,
            tokenURI: metaTokenURI
        });
        _descriptors[newItemId].traitIds.push(1 + _random(26));
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
    function extractFromGame(uint256 tokenId, uint[] memory newTraitIds, uint specialSkinId, string memory tokenURI_) public onlyOwner {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Snook is dead');
        
        _descriptors[tokenId].inplay = false;
        _descriptors[tokenId].specialSkinId = specialSkinId;
        _descriptors[tokenId].tokenURI = tokenURI_;
        for (uint i=0; i<newTraitIds.length; i++) {
            _descriptors[tokenId].traitIds.push(newTraitIds[i]);
        }

        emit Extraction(ownerOf(tokenId), tokenId);
    }

    // called by WS when snook is dead
    function setDeathTime(uint256 tokenId) public onlyOwner {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play'); // prevent wallet server from errors
        _descriptors[tokenId].deathTime = block.timestamp;
        _descriptors[tokenId].ressurectionPrice = _getRessurectionPrice(tokenId);
        emit Death(ownerOf(tokenId), tokenId, _descriptors[tokenId].deathTime);
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

        // here introduce the penalty as trait loss
        // code is here

        _descriptors[tokenId].ressurectionCount += 1; // no overflow with solc8
        _descriptors[tokenId].deathTime = 0;
        _descriptors[tokenId].inplay = false;
    }

    function _getRessurectionPrice(uint256 tokenId) public view returns (uint256) {
        require(_descriptors[tokenId].inplay == true, 'Snook is not in play');
        int128 k = ABDKMath64x64.fromUInt(100); // now it's set to 100 to recover fraction from D
        int128 S = ABDKMath64x64.fromUInt(1); // skill.totalSupply();
        int128 D = _getRessurectionDifficulty(tokenId); // it is a fraction
        int128 price = ABDKMath64x64.div(ABDKMath64x64.mul(D, k), S);
        return ABDKMath64x64.toUInt(price); // will truncate fraction, for example if price=6.6 as 64x64 then after toUInt it gets 6
    }

    function _getRessurectionDifficulty(uint256 tokenId) public view returns (int128) {
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

    // generates number between 0 and maxvalue including
    function _random(uint256 maxvalue) private view returns (uint) {
        uint randomHash = uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty)));
        return randomHash % maxvalue;
    }

    // for tests
    function getDescriptor(uint tokenId) public onlyOwner view returns (Descriptor memory) {
        return _descriptors[tokenId];
    }

}