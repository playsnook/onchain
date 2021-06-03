// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


// about tokenURI in v4: https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978

contract SnookToken is ERC721, AccessControl, ERC721Burnable, ERC721Enumerable {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    Counters.Counter private _tokenIds;
    mapping (uint => string) private _tokenURIs;
    mapping (uint => bool ) private _locked;
    
    constructor() ERC721("SnookToken", "SNK") {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }  

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }
    
    // used by resserection from Game constract
    function setTokenURI(uint256 tokenId, string memory tokenURI_) public {
        require(hasRole(MINTER_ROLE, _msgSender()), "Caller is not a minter");  
        require(_exists(tokenId), "ERC721Metadata: URI set of nonexistent token");

        _tokenURIs[tokenId] = tokenURI_;
    }

    function mint(address to, string memory tokenURI_) public returns (uint256)
    {
        require(hasRole(MINTER_ROLE, _msgSender()), "Caller is not a minter");  
        
        _tokenIds.increment(); // start token sequence from 1
        uint256 tokenId = _tokenIds.current();
        _mint(to, tokenId);  
        setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    function burn(uint256 tokenId) public virtual override {
        require(hasRole(MINTER_ROLE, _msgSender()), 'Caller is not a burner');
        _burn(tokenId);
    }

    // lock token if it's in play
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
        require(_locked[tokenId] == false, 'Token is locked');
    }

    // https://forum.openzeppelin.com/t/derived-contract-must-override-function-supportsinterface/6315/2
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function lock(uint tokenId, bool on) public {
        require(hasRole(MINTER_ROLE, _msgSender()), "Caller is not a minter"); 
        _locked[tokenId] = on;
    } 

    function isLocked(uint tokenId) view public returns (bool) {
        require(ownerOf(tokenId) == _msgSender(), 'Not token owner');
        return _locked[tokenId];
    }

}