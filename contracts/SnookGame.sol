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
    uint constant NPERIODS = 6;

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
    uint private _burialDelay; // in seconds
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
        mapping(uint => bool) tokenStarsWereChangedInThisPeriod; // default: false
        uint totalStars;
    }
    Period[NPERIODS] private _periods;
    uint private _currentPeriod;

    constructor(
        address snook, 
        address skill, 
        address uniswap, 
        address treasury, 
        uint burialDelay
    ) 
    {
        _snook = SnookToken(snook);
        _skill = SkillToken(skill);
        _uniswap = IUiniswapUSDCSkill(uniswap);
        _morgue = new uint[](0);
        _sanctuary = new uint[](0);
        _treasury = treasury;
        _burialDelay = burialDelay;
        _traitHist = new int128[](0);
        _aliveSnookCount = 0;
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
        _periodCount += 1;
        console.log('NP: _periodCount:', _periodCount, 'budget: ', budget);
        Period storage period = _periods[_periodCount];
        period.budget = budget;
        period.releaseTime = releaseTime;
        period.totalStars = _periods[_periodCount - 1].totalStars;
    
        console.log('NP: periodTotalStars', period.totalStars);
    }

    // rename 
    function _updatePeriod(uint tokenId, uint stars) private {
        console.log('--- Start ---');
        console.log('UP: tokenId:', tokenId, 'stars: ', stars);
        console.log('UP: _periodCount: ', _periodCount);
        console.log('--- End ---');
        Period storage period = _periods[_periodCount];
        uint prevStars = period.tokenStars[tokenId];
        if (prevStars == 0 && _periodCount > 0) {
            prevStars = _periods[_periodCount - 1].tokenStars[tokenId];
        }
        period.totalStars = period.totalStars - prevStars + stars;
        period.tokenStars[tokenId] = stars;
        
    }

    // rewards user for tokenCount
    function getRewards(uint tokenId) public {
        uint rewardedPeriodNumber = _tokenRewardedPeriodNumbers[tokenId];
        console.log('rewardedPeriodNumber:', rewardedPeriodNumber, 'periodCount:', _periodCount);
        require(rewardedPeriodNumber < _periodCount, 'All periods are already rewarded');
        // take next period after rewarded one
        uint currentPeriodNumber = rewardedPeriodNumber + 1;
        Period storage period = _periods[currentPeriodNumber]; 
        console.log('GR: tokenId', tokenId, ' rewardedPeriodNumber:', rewardedPeriodNumber);
        console.log('GR: currentPeriodNumber: ', currentPeriodNumber);
        require(period.releaseTime <= block.timestamp, 'Rewards are yet not released');
        if (period.tokenStars[tokenId] == 0 && _periodCount > 0) {
            // if the current period has 0 in stars (default of storage), this can be either because of 
            // death or no change in stars from the previous period; but death means that 0 is stars is 
            // that it's 0 in stars, not that there was no change, so we should keep 0.
            
            // dead is by default (storage) is false; this false is because of either 
            // ressurection from previous dead state or the snook was alive.
            // if in previous period snook was dead and no ressurection occured in 
            // this period then we propage dead state to this period.
            

            //period.tokenDead[tokenId] = _periods[currentPeriodNumber-1].tokenDead[tokenId];
        }
        console.log('GR: tokenStars: ', period.tokenStars[tokenId], 'totalStars:', period.totalStars);
        
        uint amount = period.budget * period.tokenStars[tokenId] / period.totalStars;
        console.log('GR: amount: ', amount);
        _tokenRewardedPeriodNumbers[tokenId] = currentPeriodNumber;
        
    }

    /*
        Returns last rewarded period number for tokenId and total period count. 
    */
    function getRewardedPeriod(uint tokenId) public view returns (uint, uint) {
        uint rewardedPeriodNumber = _tokenRewardedPeriodNumbers[tokenId];
        return (rewardedPeriodNumber, _periodCount);
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
        require(_skill.transferFrom(to, address(this), price), 'Not enough funds for minting');
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
        // _updatePeriod(tokenId, stars, false);

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
            if (_descriptors[tokenId].ingame == true && _descriptors[tokenId].deathTime > 0 && _descriptors[tokenId].deathTime + _burialDelay * 1 seconds < block.timestamp) {
                // tokens to burn
                burials += 1;
                _snook.lock(tokenId, false);
                _snook.burn(tokenId);
                delete _descriptors[tokenId];
            } else if (_descriptors[tokenId].ingame == true && _descriptors[tokenId].deathTime > 0 && _descriptors[tokenId].deathTime + _burialDelay * 1 seconds >= block.timestamp) { 
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
        require(owner == msg.sender, 'Not token owner');
        _descriptors[tokenId].gameAllowed = true;
        emit GameAllowed(owner, tokenId);
    }

    function enterGame(uint256 tokenId) public onlyOwner {
        require(_descriptors[tokenId].ingame == false, 'Snook is already in play');
        require(_descriptors[tokenId].gameAllowed == true, 'Snook is not allowed for playing');
        _snook.lock(tokenId, true);
        _descriptors[tokenId].ingame = true;
        emit Entry(_snook.ownerOf(tokenId), tokenId);
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
    function extractSnook(
        uint256 tokenId, 
        uint traitCount, 
        uint stars, 
        uint score, 
        string memory tokenURI_
    ) public onlyOwner 
    {
        require(_descriptors[tokenId].ingame == true, 'Snook is not in play');
        require(_descriptors[tokenId].deathTime == 0, 'Snook is dead');

        _updateTraitHistOnExtraction(_descriptors[tokenId].onGameEntryTraitCount, traitCount);
        // _updatePeriod(tokenId, stars, false);

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
        require(_descriptors[tokenId].ingame == true, 'Snook is not in play'); // prevent wallet server from errors
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
        // _updatePeriod(tokenId, 0, true); // to update totalStars in the _periods

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
        require(_descriptors[tokenId].deathTime + _burialDelay * 1 seconds >= block.timestamp, 'Ressurection period of snook elapsed');

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
        // _updatePeriod(tokenId, _descriptors[tokenId].onRessurectionStars, false);

        emit Ressurection(snookOwner, tokenId);
    }

    function _getRessurectionPrice(uint256 tokenId) private view returns (uint256 price) {
        require(_descriptors[tokenId].ingame == true, 'Snook is not in play');
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