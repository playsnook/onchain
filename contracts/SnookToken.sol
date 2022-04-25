// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// about tokenURI in v4: https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978

contract SnookToken is ERC721Upgradeable, ERC721BurnableUpgradeable, ERC721EnumerableUpgradeable, OwnableUpgradeable {
    event Locked(address indexed from, uint tokenId, bool locked, string reason);

    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    mapping (uint => string) private _tokenURIs;
    mapping (uint => bool ) private _locked;
    
    address private _game;
    address private _afterdeath;
    address private _UNUSED;

    mapping(uint => uint[2]) private _UNUSED2; 
    address private _UNUSED3; 
    mapping(uint=>uint) _tokenKillerToken;

    address private _marketplace;

    modifier onlyGameContracts {
      require(
        msg.sender == _game ||         
        msg.sender == _afterdeath ||
        msg.sender == _marketplace,
        'SnookToken: Not game contracts'
      );
      _;
    }

    function initialize(
      address game,
      address afterdeath,
      //address sge,
      string memory tokenName,
      string memory tokenSymbol
    ) initializer public {
        __ERC721_init(tokenName, tokenSymbol);
        __ERC721Burnable_init();
        __ERC721Enumerable_init();
        __Ownable_init();

        _game = game;
        _afterdeath = afterdeath;
        //_sge = sge;

    }
    
    function initialize3(address marketplace) public {
      require(_marketplace == address(0), 'SnookToken: already initialized');
      _marketplace = marketplace;
    }

    

    function setKillerTokenId(uint tokenId, uint killerTokenId) public onlyGameContracts {
      _tokenKillerToken[tokenId] = killerTokenId;
    } 

    function getKillerTokenId(uint tokenId) public view returns (uint) {
      require(_exists(tokenId), "SnookToken: token does not exist");
      return _tokenKillerToken[tokenId];
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }
    
    // used by resurrection from Game constract
    function setTokenURI(uint256 tokenId, string memory tokenURI_) public onlyGameContracts() {  
        require(_exists(tokenId), "ERC721Metadata: URI set of nonexistent token");
        _tokenURIs[tokenId] = tokenURI_;
    }

    function mint(address to, string memory tokenURI_) public onlyGameContracts() returns (uint256)
    {
        _tokenIds.increment(); // start token sequence from 1
        uint256 tokenId = _tokenIds.current();
        _mint(to, tokenId);  
        setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    function multimint(address to, string[] calldata tokenURIs) 
      external onlyGameContracts() returns (uint[] memory) 
    {
      uint[] memory tokenIds = new uint[](tokenURIs.length);
      for (uint i=0; i<tokenURIs.length; i++) {
        tokenIds[i] = mint(to, tokenURIs[i]);
      }
      return tokenIds;
    }

    function burn(uint256 tokenId) public virtual override onlyGameContracts() {
        _burn(tokenId);
    }

    function exists(uint256 tokenId) public view returns(bool) {
      return _exists(tokenId);
    }

    // lock token if it's in play
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) 
        internal virtual 
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable) 
    {
        super._beforeTokenTransfer(from, to, tokenId);
        require(_locked[tokenId] == false, 'SnookToken: Token is locked');
    }

    // https://forum.openzeppelin.com/t/derived-contract-must-override-function-supportsinterface/6315/2
    function supportsInterface(bytes4 interfaceId) public view 
      virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) 
      returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    function lock(uint tokenId, bool on, string memory reason) external onlyGameContracts() {
        _locked[tokenId] = on;
        emit Locked(ownerOf(tokenId), tokenId, on, reason);
    } 

    function isLocked(uint tokenId) view external returns (bool) {
        require(_exists(tokenId) == true, "ERC721: isLocked query for nonexistent token");
        return _locked[tokenId];
    }
}