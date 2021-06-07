// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";


import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";

import "./SnookToken.sol";
import "./SkillToken.sol";
import "./IUniswapUSDCSkill.sol";

import 'hardhat/console.sol';

// about tokenURI in v4: https://forum.openzeppelin.com/t/function-settokenuri-in-erc721-is-gone-with-pragma-0-8-0/5978

contract SnookGame is Ownable {
    event GameAllowed(address indexed from, uint tokenId);
    event Entry(address indexed from, uint tokenId);
    event Extraction(address indexed to, uint tokenId);
    event Death(address indexed to, uint tokenId);
    event Ressurection(address indexed from, uint tokenId);
    event Birth(address indexed to, uint tokenId);
    event Bury(uint burialCount);

    SnookToken private _snook;
    SkillToken private _skill;
    IUiniswapUSDCSkill private _uniswap;
    uint private _BurialDelay; // in seconds
    address private _treasury;

    struct Descriptor {
        uint score;
        uint onRessurectionScore;
        uint stars;
        uint onRessurectionStars;
        // required to recalculate probability density on exit from the game
        uint onGameEntryTraitCount; 
        // traitCount is current trait count 
        uint traitCount;
        uint onRessurectionTraitCount;
        uint ressurectionPrice;
        uint ressurectionCount;
        string onRessurectionTokenURI;
        bool ingame;
        uint deathTime;
        bool gameAllowed; // contract get the token to play only when this flag is true
    }
    // mapping of token ids to descriptors
    mapping (uint => Descriptor) private _descriptors;

    /*
        _morgue keeps all the snooks for which setDeathTime was called.
        _sactuary keeps all the snooks which were not buried on bury() function call
        because they are still waiting to ressurection.
    */
    uint[] private _morgue;
    uint[] private _sanctuary;

    // Ressurection variables
    int128[] private _traitHist;
    uint private _aliveSnookCount; // totalSupply() cannot be used as hist is updated on death event, not on burn event
    
    // Special Skin Rewards variables
    // Why not array of structures? 
    // https://ethereum.stackexchange.com/questions/87451/solidity-error-struct-containing-a-nested-mapping-cannot-be-constructed/97883#97883
    struct Period {
        uint budget;
        uint releaseTime; // when rewards can be claimed on that period
        mapping(uint => uint) tokenStars; // default: 0
        mapping(uint => bool) tokenRewarded; // default: false
        mapping(uint => bool) tokenStarsUpdated; // default: false
        uint totalStars;
    }

    // We look back for _RewardPeriods only
    uint private _RewardPeriods;
    mapping (uint => Period) private _periods;
    uint private _currentPeriodIdx;

    constructor(
        address snook, 
        address skill, 
        address uniswap, 
        address treasury, 
        uint burialDelay,
        uint rewardPeriods
    ) 
    {
        _snook = SnookToken(snook);
        _skill = SkillToken(skill);
        _uniswap = IUiniswapUSDCSkill(uniswap);
        _morgue = new uint[](0);
        _sanctuary = new uint[](0);
        _treasury = treasury;
        _BurialDelay = burialDelay;
        _RewardPeriods = rewardPeriods;
        _traitHist = new int128[](0);
        _aliveSnookCount = 0;
        _currentPeriodIdx = 0;
    }

    function describe(uint tokenId) public view returns (
        uint ressurectionPrice, 
        uint ressurectionCount,
        uint stars,
        uint deathTime
    ) 
    {
        return (
            _descriptors[tokenId].ressurectionPrice,
            _descriptors[tokenId].ressurectionCount,
            _descriptors[tokenId].stars,
            _descriptors[tokenId].deathTime
        );

    }
    
    // rename 
    function startNewPeriod(uint budget, uint releaseTime) public {
        require(msg.sender == _treasury, 'Only treasury can call this function');
        _currentPeriodIdx += 1; // we start from 1
        Period storage period = _periods[_currentPeriodIdx];
        period.budget = budget;
        period.releaseTime = releaseTime;
        period.totalStars = _periods[_currentPeriodIdx - 1].totalStars;
    }

    // rename 
    function _updatePeriod(uint tokenId, uint currentStars, uint newStars) private {
        Period storage period = _periods[_currentPeriodIdx];
        period.totalStars = period.totalStars - currentStars + newStars;
        period.tokenStars[tokenId] = newStars;
        period.tokenStarsUpdated[tokenId] = true;
        
    }

    
    function claimRewards(uint tokenId, uint periodIdx) public {
        uint amount = computeRewards(tokenId, periodIdx);
        _periods[periodIdx].tokenRewarded[tokenId] = true; 
        _skill.transfer(_snook.ownerOf(tokenId), amount);
    }

    function getPeriodBudget(uint periodIdx) public view returns(uint) {
        return _periods[periodIdx].budget;
    }

    function getRewardablePeriods() public view returns(uint[] memory) {
        uint[] memory periods = new uint[](_RewardPeriods);
        if (_currentPeriodIdx <= 1) {
            return periods;
        }  
        uint i = _currentPeriodIdx <= _RewardPeriods ? 1 : _currentPeriodIdx - _RewardPeriods;
        uint k = 0;
        for (; i<_currentPeriodIdx; i++) {
            periods[k++] = i;
        }
        return periods;
    }

    function computeRewards(uint tokenId, uint periodIdx) public view returns (uint) {

        require(_descriptors[tokenId].deathTime == 0, 'Dead');

        // detecting upper limit of rewardable periods
        require(_currentPeriodIdx > 1, 'No reward periods');    
        require(periodIdx < _currentPeriodIdx, 'Unrewardable');

        // i is a first rewardable period back from now (lower limit)
        uint i = _currentPeriodIdx <= _RewardPeriods ? 1 : _currentPeriodIdx - _RewardPeriods;
        require(periodIdx >= i, 'Unrewardable');

        require(_periods[periodIdx].tokenRewarded[tokenId] == false, 'Rewarded');

        uint amount = 0;
        // the first of saved periods cannot be updated from previous periods therefore || periodIdx == 1
        if (_periods[periodIdx].tokenStarsUpdated[tokenId] == true || periodIdx == i) { 
            amount = _periods[periodIdx].tokenStars[tokenId] * _periods[periodIdx].budget / _periods[periodIdx].totalStars;
        } else {
            // find first updated from requested non-updated one and use it as current balance or reach the first of rewardable periods (k==1)
            for (uint k = periodIdx - 1; k >= i; k--) { 
                if (_periods[k].tokenStarsUpdated[tokenId] == true || k == i) {
                    amount = _periods[k].tokenStars[tokenId] * _periods[periodIdx].budget / _periods[periodIdx].totalStars;
                    break;
                }
            }
        }

        return amount;
    }
    
    // Mostly for tests
    function getTraitHist() public view returns (uint64[] memory) {
        uint bins = _traitHist.length;
        uint64[] memory result = new uint64[](bins);
        for (uint i=0; i<bins; i++) {
            result[i] = ABDKMath64x64.toUInt(_traitHist[i]);
        }
        return result;
    }


    function _updateTraitHistOnMint(uint traitCount) private {
        uint bin = traitCount; // bin starts from 0
        if (_traitHist.length < (bin+1) ) {
            // resize array
            int128[] memory temp = new int128[](bin+1);
            for (uint i=0; i<_traitHist.length; i++) {
                temp[i] = _traitHist[i];
            }
            _traitHist = temp;
        }
        _traitHist[bin] = ABDKMath64x64.add(_traitHist[bin], ABDKMath64x64.fromUInt(1));
    }

    function _updateTraitHistOnDeath(uint traitCount) private {
        uint bin = traitCount;
        _traitHist[bin] = ABDKMath64x64.sub(_traitHist[bin], ABDKMath64x64.fromUInt(1));
    }

    function _updateTraitHistOnRessurection(uint traitCount) private {
        _updateTraitHistOnMint(traitCount);
    }

    function _updateTraitHistOnExtraction(uint onEntryTraitCount, uint onExtractionTraitCount) private {
        _updateTraitHistOnDeath(onEntryTraitCount);
        _updateTraitHistOnRessurection(onExtractionTraitCount);
    }

    // Wallet Server got trait ids from game server and mints a token
    function mint(
        address to, 
        uint traitCount, 
        uint stars, 
        uint score,
        string memory tokenURI_
    ) public onlyOwner 
    {
        uint price = _uniswap.getSnookPriceInSkills();
        require(_skill.transferFrom(to, address(this), price), 'No funds');
        uint tokenId = _snook.mint(to, tokenURI_);
        _descriptors[tokenId] = Descriptor({
            score: score,
            onRessurectionScore: 0,
            stars: stars,
            onRessurectionStars: 0,
            onGameEntryTraitCount: traitCount,
            traitCount: traitCount,
            onRessurectionTraitCount: 0,
            onRessurectionTokenURI: "",
            deathTime: 0,
            ressurectionPrice: 0,
            ressurectionCount: 0,
            ingame: false,
            gameAllowed: false
        });
        _skill.burn(address(this), price);

        _updateTraitHistOnMint(traitCount);
        _aliveSnookCount += 1;
        _updatePeriod(tokenId, 0, stars);

        emit Birth(to, tokenId);
    }

    /*
        The function is called by anyone requesting a specific number of burials of 
        snooks in morgue. 
        If there is not enough gas in block.gasLimit for the loop, a smaller number 
        of burials can be requested.
        The length of the sanctuary is always bounded as it's <= requestedBurials. 
    */
    function bury(uint requestedBurials) public {
        // cannot bury more than in the morgue
        uint maxBurials = requestedBurials > _morgue.length ? _morgue.length : requestedBurials;
        uint burials = 0;
        for (uint i = maxBurials; i > 0; i--) {
            uint tokenId = _morgue[i-1];
            if (_descriptors[tokenId].ingame == true && _descriptors[tokenId].deathTime > 0 && _descriptors[tokenId].deathTime + _BurialDelay * 1 seconds < block.timestamp) {
                // tokens to burn
                burials += 1;
                _snook.lock(tokenId, false);
                _snook.burn(tokenId);
                delete _descriptors[tokenId];
            } else if (_descriptors[tokenId].ingame == true && _descriptors[tokenId].deathTime > 0 && _descriptors[tokenId].deathTime + _BurialDelay * 1 seconds >= block.timestamp) { 
                // tokens which are in ressurection waiting state
                _sanctuary.push(_morgue[_morgue.length-1]);
            } else {
                // tokens which were ressurected are removed from morgue and will not be in sanctuary: forget them
            }
            _morgue.pop();
        }

        // bring saved tokens from sanctury to morgue again for the next call to bury
        uint k = _sanctuary.length;
        for (uint i=0; i<k; i++) {
            uint lastElem = _sanctuary[_sanctuary.length-1];
            _morgue.push(lastElem);
            _sanctuary.pop();
        }
        
        emit Bury(burials);
    } 
    
    // Snook owner calls this function to permit game contract to get him to the game = lock his token
    function allowGame(uint256 tokenId) public {
        address owner = _snook.ownerOf(tokenId);
        require(owner == msg.sender, 'Not owner');
        require(_descriptors[tokenId].ingame == false, 'In play');
        _descriptors[tokenId].gameAllowed = true;
        emit GameAllowed(owner, tokenId);
    }

    function enterGame(uint256 tokenId, uint ressurectionCount) public onlyOwner {
        require(_descriptors[tokenId].ingame == false, 'In play');
        require(_descriptors[tokenId].gameAllowed == true, 'Not allowed');
        require(_descriptors[tokenId].ressurectionCount == ressurectionCount, 'Invalid ressurection count');

        _snook.lock(tokenId, true);
        _descriptors[tokenId].ingame = true;
        emit Entry(_snook.ownerOf(tokenId), tokenId);
    }

    // extract snook without updating traits and url
    function _extractSnookWithoutUpdate(uint256 tokenId) private {
        require(_descriptors[tokenId].ingame == true, 'Not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Dead');

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
    function extractSnook(
        uint256 tokenId, 
        uint traitCount, 
        uint stars, 
        uint score, 
        string memory tokenURI_
    ) public onlyOwner 
    {
        require(_descriptors[tokenId].ingame == true, 'Not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Dead');

        _updateTraitHistOnExtraction(_descriptors[tokenId].onGameEntryTraitCount, traitCount);
        _updatePeriod(tokenId, _descriptors[tokenId].stars, stars);

        _snook.setTokenURI(tokenId, tokenURI_); 
        _descriptors[tokenId].traitCount = traitCount; 
        _descriptors[tokenId].onGameEntryTraitCount = traitCount;
        _descriptors[tokenId].stars = stars;
        _descriptors[tokenId].score = score;
        _descriptors[tokenId].ingame = false;
        _descriptors[tokenId].gameAllowed = false;
        _snook.lock(tokenId, false);

        emit Extraction(_snook.ownerOf(tokenId), tokenId);
    }

    // called by WS when snook is dead; newTraits are updated according to penalty
    function setDeathTime(
        uint256 tokenId, 
        uint onRessurectionTraitCount,
        uint onRessurectionStars,
        uint onRessurectionScore, 
        string memory onRessurectionTokenURI
    ) public onlyOwner 
    {
        require(_descriptors[tokenId].ingame == true, 'Not in play'); // prevent wallet server from errors
        _descriptors[tokenId].deathTime = block.timestamp;

        // ressurection price is based on traits of dying snook 
        _descriptors[tokenId].ressurectionPrice = _getRessurectionPrice(tokenId);

        // remember what traits should be assigned to snook on ressurection
        _descriptors[tokenId].onRessurectionTraitCount = onRessurectionTraitCount;
        _descriptors[tokenId].onRessurectionStars = onRessurectionStars;
        _descriptors[tokenId].onRessurectionScore = onRessurectionScore;
        _descriptors[tokenId].onRessurectionTokenURI = onRessurectionTokenURI;

        _morgue.push(tokenId);

        _updateTraitHistOnDeath(_descriptors[tokenId].traitCount);
        _aliveSnookCount -= 1;
        _updatePeriod(tokenId, _descriptors[tokenId].stars, 0); // to update totalStars in the _periods

        emit Death(_snook.ownerOf(tokenId), tokenId);
    }


    // 1. user should approve contract to get amount of skill
    // 2. skill tokens should go to treasury contract address
    // 3. Ressurections is followed by penalty of ressurectionCount + 1 traits. 
    // 4. Resurrection with penalty can lead to a snook with 0 traits. 
    function ressurect(uint256 tokenId) public {
        address snookOwner = _snook.ownerOf(tokenId);
        require(snookOwner == msg.sender, 'Not owner');
        require(_descriptors[tokenId].deathTime > 0, 'Alive');
        require(_descriptors[tokenId].deathTime + _BurialDelay * 1 seconds >= block.timestamp, 'Too late');

        require(_skill.transferFrom(snookOwner, _treasury, _descriptors[tokenId].ressurectionPrice));
        
        _descriptors[tokenId].ressurectionCount += 1; // no overflow with solc8
        _descriptors[tokenId].deathTime = 0;

        _snook.setTokenURI(tokenId, _descriptors[tokenId].onRessurectionTokenURI);
        _descriptors[tokenId].traitCount = _descriptors[tokenId].onRessurectionTraitCount;
        _descriptors[tokenId].onGameEntryTraitCount = _descriptors[tokenId].onRessurectionTraitCount;
        _descriptors[tokenId].stars = _descriptors[tokenId].onRessurectionStars;
        _descriptors[tokenId].score = _descriptors[tokenId].onRessurectionScore;
        
        _descriptors[tokenId].ingame = false;
        _descriptors[tokenId].gameAllowed = false;
        _snook.lock(tokenId, false);

        _updateTraitHistOnRessurection(_descriptors[tokenId].onRessurectionTraitCount);
        _aliveSnookCount += 1;
        _updatePeriod(tokenId, 0, _descriptors[tokenId].onRessurectionStars);

        emit Ressurection(snookOwner, tokenId);
    }

    function _getRessurectionPrice(uint256 tokenId) private view returns (uint256 price) {
        require(_descriptors[tokenId].ingame == true, 'Not in play');
        uint256 k = _uniswap.getSnookPriceInSkills(); // in wei
        int128 d = _getRessurectionDifficulty(tokenId); 
        price = ABDKMath64x64.mulu(d, k); // in wei
    }

    function _getRessurectionDifficulty(uint256 tokenId) private view returns (int128) {
        uint bin = _descriptors[tokenId].traitCount;
        int128 s = ABDKMath64x64.fromUInt(0);  // difficulty to be calculated
        for (uint i=0; i<=bin ; i++) {
            s = ABDKMath64x64.add(s, _traitHist[i]);
        }

        s = ABDKMath64x64.div(s, ABDKMath64x64.fromUInt(_aliveSnookCount)); // standing, s(b)
        int128 numOfTraits = ABDKMath64x64.fromUInt(bin);
        
        // difficulty coef,  d = exp(s) * traits^2
        return ABDKMath64x64.mul(ABDKMath64x64.exp(s), ABDKMath64x64.mul(numOfTraits, numOfTraits));
    }
}