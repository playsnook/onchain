// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./ISkillToken.sol";
import "./SnookToken.sol";
import "./IDescriptorUser.sol";
import "./ISnookState.sol";
import "./IAfterdeath.sol";
import "./IUniswapUSDCSkill.sol";
import "./ISnookGame.sol";
import "./IPRNG.sol";
import "./ITreasury.sol";

// about tokenURI in v4: https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978

contract SnookGame is ISnookGame, AccessControlEnumerableUpgradeable, PausableUpgradeable {
    event GasUsage(uint g1, uint g2);

    uint private constant LIVES_PER_SNOOK = 5;
    uint public constant TRAITCOUNT_MINT2 = 1;

    bytes32 public constant EXTRACTOR_ROLE = keccak256("EXTRACTOR_ROLE");
    bytes32 public constant EMERGENCY_EXTRACTOR_ROLE = keccak256("EMERGENCY_EXTRACTOR_ROLE");
    bytes32 public constant KILLER_ROLE = keccak256("KILLER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    string private constant IPFS_URL_PREFIX = 'ipfs://';

    uint private constant BASE_COLORS = 0;
    uint64 private constant LENGTH_COLORS = 20;

    uint private constant BASE_PATTERNS = BASE_COLORS + LENGTH_COLORS;
    uint64 private constant LENGTH_PATTERNS = 20;

    uint private constant BASE_WEARABLE_UPPER_BODY = BASE_PATTERNS + LENGTH_PATTERNS;
    uint64 private constant LENGTH_WEARABLE_UPPER_BODY = 3;

    uint private constant BASE_WEARABLE_BOTTOM_BODY = BASE_WEARABLE_UPPER_BODY + LENGTH_WEARABLE_UPPER_BODY;
    uint64 private constant LENGTH_WEARABLE_BOTTOM_BODY = 3;

    uint private constant BASE_WEARABLE_UPPER_HEAD = BASE_WEARABLE_BOTTOM_BODY + LENGTH_WEARABLE_BOTTOM_BODY;
    uint64 private constant LENGTH_WEARABLE_UPPER_HEAD = 3;

    uint private constant BASE_WEARABLE_BOTTOM_HEAD = BASE_WEARABLE_UPPER_HEAD + LENGTH_WEARABLE_UPPER_HEAD;
    uint64 private constant LENGTH_WEARABLE_BOTTOM_HEAD = 3;

    uint public constant MINT_BURN_PERCENTAGE = 20;
    uint public constant MINT_ECOSYSTEM_PERCENTAGE = 4;
    uint public constant MINT_TREASURY_PERCENTAGE = 76;

    SnookToken private _snook;
    ISkillToken private _skill;
    IUniswapUSDCSkill private _uniswap;
    // ISkinRewards private _skinRewards;
    uint private _UNUSED; // has non-default value (removed skinRewards contract address)
    ISnookState private _state;
    IAfterdeath private _afterdeath;

    IPRNG private _prng;
    string[52] private _mintTokenCIDs;

    // ev2
    uint private _spc; // adjusted on reward claim;
    mapping(address => uint) private accountKills;
    address private _ecosystem;  
    ITreasury private _treasury; 

    address private _burnsafe;
    bool private _isBridged;
    bool private _isInitialized4;

    function getBurnSafeAddress() view external override returns(address) {
      return _burnsafe; 
    }

    function isBridged() view external override returns(bool) {
      return _isBridged;
    }

    function getSNOOKAddress() external override view returns (address) {
      return address(_snook);
    }

    function getSNKAddress() external override view returns (address) {
      return address(_skill);
    }

    function getUniswapUSDCSkillAddress() external override view returns (address) {
      return address(_uniswap);
    }

    function getSnookStateAddress() external override view returns (address) {
      return address(_state);
    }

    function getAfterdeathAddress() external override view returns (address) {
      return address(_afterdeath);
    }

    function getLivesPerSnook() external override pure returns (uint) {
      return LIVES_PER_SNOOK;
    }

    function initialize(
        address state, 
        address snook, 
        address skill, 
        address uniswap,
        address afterdeath,
        address adminAccount 
    ) initializer public {
        __AccessControlEnumerable_init();
        __Pausable_init();
        _uniswap = IUniswapUSDCSkill(uniswap);
        _snook = SnookToken(snook);
        _skill = ISkillToken(skill);
        _state = ISnookState(state);
        _afterdeath = IAfterdeath(afterdeath);

        _setupRole(DEFAULT_ADMIN_ROLE, adminAccount);
        _setupRole(PAUSER_ROLE, adminAccount);
    }

    function initialize2(
      address prng,
      string[52] memory mintTokenCIDs
    ) public {
      require(address(_prng) == address(0), 'SnookGame: already executed');
      _prng = IPRNG(prng);
      _mintTokenCIDs = mintTokenCIDs;
    }

    // ev2
    modifier onlyAfterdeath {
      require(msg.sender == address(_afterdeath), 'Not afterdeath');
      _;
    }

    function initialize3(address ecosystem, address treasury) public {
      require(_ecosystem == address(0), 'SnookGame: already executed');
      _ecosystem = ecosystem;
      _treasury = ITreasury(treasury);
      _spc = _afterdeath.getAliveSnookCount();
    }

    function initialize4(bool isBridged_, address burnsafe) public {
      require(_isInitialized4 == false, 'SnookGame: already executed');
      _UNUSED = 0; // to make it default 0 value
      _isBridged = isBridged_;
      _burnsafe = burnsafe;
      _isInitialized4 = true;
    }

    function increamentPpkCounter() external override onlyAfterdeath {
      _spc++;
    }

    function getPpkCounter() view external override returns(uint) {
      return _spc;
    }

    function describe(uint tokenId) external override view returns (Descriptor memory d)
    {
      d = _state.getDescriptor(tokenId);
    }

    function strConcat(string memory s1, string memory s2) pure internal returns (string memory) {
      bytes memory b1 = bytes(s1);
      bytes memory b2 = bytes(s2);
      bytes memory b3 = new bytes(b1.length + b2.length);
      uint i = 0;
      for (uint j=0; j<b1.length; j++) {
        b3[i++] = b1[j];
      }
      for (uint j=0; j<b2.length; j++) {
        b3[i++] = b2[j];
      }
      return string(b3);
    }
    
    function _generateTokenURI() internal returns (string memory, uint) {
      _prng.generate();
      uint traitId = _prng.read(27) + 1; // getRnd(1,27)
      string memory tokenURI = '';
      uint base = 0;
      uint offset = 0;
      

      if (traitId >= 1 && traitId <=5) {
        base = BASE_COLORS;
        offset = _prng.read(LENGTH_COLORS); // rnd[0,19]
      } 
      else if (traitId >= 6 && traitId <= 15) { 
        base = BASE_PATTERNS;
        offset = _prng.read(LENGTH_PATTERNS); // rnd[0,19]
      } 
      else if (traitId >= 16 && traitId <=18) {
        base = BASE_WEARABLE_UPPER_BODY;
        offset = _prng.read(LENGTH_WEARABLE_UPPER_BODY); // rnd[0,2] 
      }

      else if (traitId >= 19 && traitId <= 21) {
        base = BASE_WEARABLE_BOTTOM_BODY;
        offset = _prng.read(LENGTH_WEARABLE_BOTTOM_BODY);
      }

      else if (traitId >= 22 && traitId <= 24) {
        base = BASE_WEARABLE_UPPER_HEAD; // rnd[16,18]
        offset = _prng.read(LENGTH_WEARABLE_UPPER_HEAD);
      }

      else if (traitId >= 25 && traitId <= 27) {
        base = BASE_WEARABLE_BOTTOM_HEAD;
        offset = _prng.read(LENGTH_WEARABLE_BOTTOM_HEAD);
      }

      else { // exception 
      }

      tokenURI = strConcat(IPFS_URL_PREFIX, _mintTokenCIDs[base+offset]);
      return (tokenURI, traitId);
    }

    function mint2(uint count) external override whenNotPaused() returns (uint[] memory){
      require(count > 0, 'SnookGame: should be greater than 0');
      
      uint price = _uniswap.getSnookPriceInSkills();
      uint amountPaid = count * price * LIVES_PER_SNOOK;
      require(
        _skill.transferFrom(
          msg.sender, // from 
          address(this),  // to 
          amountPaid
        ), 
        'SnookGame: No funds'
      );
      
      string[] memory tokenURIs = new string[](count);
      Descriptor[] memory descriptors = new Descriptor[](count);

      for (uint i=0; i<count; i++) {
        (string memory tokenURI, ) = _generateTokenURI();
        tokenURIs[i] = tokenURI;

        descriptors[i] = Descriptor({
            score: 0,
            onResurrectionScore: 0,
            stars: 0,
            onResurrectionStars: 0,
            onGameEntryTraitCount: TRAITCOUNT_MINT2,
            traitCount: TRAITCOUNT_MINT2,
            onResurrectionTraitCount: 0,
            onResurrectionTokenURI: "",
            deathTime: 0,
            resurrectionPrice: 0,
            resurrectionCount: 0,
            gameAllowed: false,
            lives: LIVES_PER_SNOOK,
            forSale: false
        });
      }

      uint[] memory tokenIds = _snook.multimint(msg.sender, tokenURIs);
      _state.setDescriptors(tokenIds, descriptors); 
      
      _spc += count * LIVES_PER_SNOOK;
      uint amountToBurn = amountPaid * MINT_BURN_PERCENTAGE / 100;
      if (_isBridged == false) {
        _skill.burn(address(this), amountToBurn);
      } else {
        _skill.transfer(_burnsafe, amountToBurn);
      }
        
      uint amountToTreasury = amountPaid * MINT_TREASURY_PERCENTAGE / 100;
      // let treasury pull it's part from this contract and distribute it as it wants
      _skill.approve(address(_treasury), amountToTreasury);     
      _treasury.acceptMintFunds(amountToTreasury);

      uint amountToEcosystem = amountPaid - amountToBurn - amountToTreasury;
      _skill.transfer(_ecosystem, amountToEcosystem);

      _afterdeath.updateOnMint(TRAITCOUNT_MINT2*count, count);

      return tokenIds;
    }

    function enterGame2(uint256 tokenId) external override whenNotPaused() {
      require(msg.sender == _snook.ownerOf(tokenId), 'Not snook owner');
      require(_snook.isLocked(tokenId) == false, 'In play');
      _snook.lock(tokenId, true, 'enterGame2');
      emit Entry(_snook.ownerOf(tokenId), tokenId);
    }

    // extract snook without updating traits and url
    function _extractSnookWithoutUpdate(uint256 tokenId) private {
      Descriptor memory d = _state.getDescriptor(tokenId);
      require(_snook.isLocked(tokenId) == true, 'Not in play');
      require(d.deathTime == 0, 'Dead');
      _snook.lock(tokenId, false, 'emergencyExtract');
      emit Extraction(_snook.ownerOf(tokenId), tokenId);
    }

    // Extracts snooks with ids without updating traits and uris. 
    // Called on GS failure.
    // Can be replaced by looping over _extractFromGame from WS, but we want to save gas. 
    function extractSnooksWithoutUpdate(uint256[] memory tokenIds) 
      external override onlyRole(EMERGENCY_EXTRACTOR_ROLE) whenNotPaused()
    {
      for (uint i = 0; i < tokenIds.length; i++) {
        _extractSnookWithoutUpdate(tokenIds[i]);
      }
    }

    // called by WS when snook successfully extracts snook
    function extractSnook(
      uint256 tokenId, 
      uint traitCount, 
      uint stars, 
      uint score, 
      string calldata tokenURI_
    ) external override onlyRole(EXTRACTOR_ROLE) whenNotPaused()
    {
      Descriptor memory d = _state.getDescriptor(tokenId);
      require(_snook.isLocked(tokenId) == true, 'Not in play');
      require(d.deathTime == 0, 'Dead');

      require(stars<=4, 'SnookGame: cannot assign more than 4 stars');

      _afterdeath.updateOnExtraction(d.onGameEntryTraitCount, traitCount);
      _snook.setTokenURI(tokenId, tokenURI_); 
      d.traitCount = traitCount; 
      d.onGameEntryTraitCount = traitCount;
      d.stars = stars;
      d.score = score;
    
      _state.setDescriptor(tokenId, d);
      _snook.lock(tokenId, false, 'extract');

      emit Extraction(_snook.ownerOf(tokenId), tokenId);
    }

    
    function reportKiller(
      uint tokenId,
      uint killedTokenId,   // for log only
      uint killedChainId    // for log only
    ) external override onlyRole(KILLER_ROLE) whenNotPaused 
    {
      require(_snook.exists(tokenId) == true, 'SnookGame: killer token does not exist');
      address account = _snook.ownerOf(tokenId);
      accountKills[account] += 1;

      emit Killing(
        _snook.ownerOf(tokenId),
        tokenId,
        killedTokenId, 
        killedChainId
      );
    }

    function reportKilled(
      uint tokenId,
      uint traitCount,
      uint stars,
      string calldata tokenURI,
      uint killerTokenId,
      bool unlock,
      uint killerChainId // for log only
    ) external override onlyRole(KILLER_ROLE) whenNotPaused
    {
      Descriptor memory d = _state.getDescriptor(tokenId);
      require(_snook.isLocked(tokenId) == true, 'SnookGame: not in play'); // prevent wallet server from errors
      require(d.deathTime == 0, 'SnookGame: token is already dead');

      if (killerTokenId == tokenId) {
        _spc -= 1;
      }

      if (d.lives > 0) {
        d.lives -= 1;
      }
     
      if (d.lives == 0) { 
        d.deathTime = block.timestamp;
        d.resurrectionPrice = _afterdeath.getResurrectionPrice(tokenId);
        d.onResurrectionTraitCount = traitCount;
        d.onResurrectionStars = stars; 
        d.onResurrectionTokenURI = tokenURI;
        _afterdeath.toMorgue(tokenId);
        _afterdeath.updateOnDeath(d.traitCount);
      } else { // lives > 0 therefore we look at unlock request by user
        if (unlock == true) {
          _snook.lock(tokenId, false, 'unlock by user');
        }
      }
      _state.setDescriptor(tokenId, d);
      emit Death(_snook.ownerOf(tokenId), tokenId, killerTokenId, d.lives, killerChainId);
    }

    function reportKill(
      uint256 tokenId, 
      uint traitCount,
      uint stars,
      string calldata tokenURI,
      uint killerTokenId,
      bool unlock
    ) external override onlyRole(KILLER_ROLE) whenNotPaused {
      Descriptor memory d = _state.getDescriptor(tokenId);
      require(_snook.exists(killerTokenId) == true, 'Killer token does not exist');
      require(_snook.isLocked(tokenId) == true, 'Not in play'); // prevent wallet server from errors
            
      require(d.deathTime == 0, 'SnookGame: token is already dead');
      
      if (killerTokenId == tokenId) {
        _spc -= 1;
      }
      else { // not suicide
        address account = _snook.ownerOf(killerTokenId);
        accountKills[account] += 1;
      }
      // Commented out to save gas: no usage except tracking
      // _snook.setKillerTokenId(tokenId, killerTokenId); 
      
      if (d.lives > 0) {
        d.lives -= 1;
      }
     
      if (d.lives == 0) { 
        d.deathTime = block.timestamp;
        d.resurrectionPrice = _afterdeath.getResurrectionPrice(tokenId);
        d.onResurrectionTraitCount = traitCount;
        d.onResurrectionStars = stars; 
        d.onResurrectionTokenURI = tokenURI;
        _afterdeath.toMorgue(tokenId);
        _afterdeath.updateOnDeath(d.traitCount);
      } else { // lives > 0 therefore we look at unlock request by user
        if (unlock == true) {
          _snook.lock(tokenId, false, 'unlock by user');
        }
      }
      _state.setDescriptor(tokenId, d);
      
      emit Death(_snook.ownerOf(tokenId), tokenId, killerTokenId, d.lives, block.chainid);
    }

    function _computePpk() view internal returns (uint) {
      uint ppk = 0;
      if (_spc > 0) {
        ppk = _treasury.getPpkBalance() / _spc;
      }
      return ppk;
    }

    function computePpk() view external override returns(uint) {
      return _computePpk();
    }

    function _getKillsAndComputePpkRewards(address account) view internal returns(uint, uint) {
      uint rewards = _computePpk() * accountKills[account];
      return (accountKills[account], rewards);
    }

    function getKillsAndComputePpkRewards(address account) view external override returns(uint, uint) {
      return _getKillsAndComputePpkRewards(account);
    }

    function claimPpkRewards() external override {
      address account = msg.sender;
      (, uint rewardsAmount) = _getKillsAndComputePpkRewards(account);
      require(rewardsAmount>0, 'No rewards');
      _spc -= accountKills[account];
      accountKills[account] = 0;
      _treasury.payPpkRewards(account, rewardsAmount);
      emit PpkClaimed(account, rewardsAmount);
    }

    function pause() external override onlyRole(PAUSER_ROLE) whenNotPaused() {
      _pause();
    }

    function unpause() external override onlyRole(PAUSER_ROLE) whenPaused() {
      _unpause();
    }
}