// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Vesting {
    using SafeERC20 for IERC20;
    event Released( address indexed beneficiary, uint256 amount);
    enum VestingPlan {
        Team,
        SeedRound,
        PrivateRound,
        StrategicPartners,
        Advisors,
        Treasury,
        Ecosystem,
        LiquidityPool
    }
    struct TokenAward {
        uint256 amount;
        uint256 released;
        VestingPlan vestingPlan;
    }
    uint256 constant public RESOLUTION = 1000000;
    // Tracks the token awards for each user (user => award)
    mapping(address => TokenAward) public awards;
    uint256 immutable public secondsInDay;
    uint256 immutable public vestingStart;
    IERC20 public targetToken;

    uint256 constant public cliffPeriodInMonthsTeamSeed = 2;
    uint256 constant public cliffPeriodInMonthsPrivate = 2;
    uint256 constant public cliffPeriodInMonthsStrategic = 3;
    uint256 constant public cliffPeriodInMonthsAdvisors = 6;

    uint256 constant public deltaPeriodInMonthsTeamSeed = 3;
    uint256 constant public deltaPeriodInMonthsPrivate = 2;
    uint256 constant public deltaPeriodInMonthsStrategic = 2;
    uint256 constant public deltaPeriodInMonthsAdvisors = 6;

    uint256 constant public quotaPercentagePrivate = 10 * 10000;  // 10 %
    uint256 constant public quotaPercentageStrategic = 7.6923 * 10000; // 7.6923 %
    uint256 constant public quotaPercentageAdvisors = 20 * 10000; //  20 %
    uint256 constant public quotaPercentageLiquidityPool = 25 * 10000; // 25 %

    uint256 constant public vestingEventsLiquidityPoolCount = 10;
    uint256 constant public sumTotalMonthsForVesting = 666; // sum(1:36)
    uint256 constant public totalMonthsOfVesting = 36;

    address[] public beneficiariesAlreadyReleased;
    uint256[] public amountsAlreadyReleased;

    constructor(
     IERC20 _targetToken,
     address[] memory beneficiaries,
     TokenAward[] memory _awards,
     uint _secondsInDay,
     uint256 totalAwards,

     uint256 vestingStartTimestamp,
     address[] memory _beneficiariesAlreadyReleased,
     uint256[] memory _amountsAlreadyReleased 

     ) {

        require(beneficiaries.length == _awards.length, 'invalid beneficiaries-award params');
        require(beneficiariesAlreadyReleased.length == amountsAlreadyReleased.length, "invalid already-released params");

        targetToken = _targetToken;
        initAwards(beneficiaries, _awards, totalAwards);
        secondsInDay = _secondsInDay;

        beneficiariesAlreadyReleased = _beneficiariesAlreadyReleased;
        amountsAlreadyReleased = _amountsAlreadyReleased;
        // vesting start timestamp should be equal to the current vesting contract deploy timestamp
        vestingStart = vestingStartTimestamp;
        adjustAwards();
    }

    function adjustAwards() internal {
      for (uint i=0; i<beneficiariesAlreadyReleased.length; i++) {
        TokenAward storage award = awards[beneficiariesAlreadyReleased[i]];
        award.released += amountsAlreadyReleased[i];
      }
    }

    function release(address beneficiary) external {
        TokenAward storage award = awards[beneficiary];
        uint256 awardAmount = award.amount;
        uint256 unreleased = getReleasableAmount(beneficiary);
        require(unreleased > 0, "Nothing to release");
        award.released += unreleased;
        require(award.released <= awardAmount, "cannot release more than allocated");
        targetToken.safeTransfer(beneficiary, unreleased);
        emit Released(beneficiary, unreleased);
    }

    function getReleasableAmount(address beneficiary) public view returns (uint256) {
        uint256 monthsPassed = (block.timestamp - vestingStart) / (secondsInDay * 30);
        uint256 vestedAmount;
        TokenAward storage award = awards[beneficiary];
        uint256 awardAmount = award.amount;
        VestingPlan vestingPlan = award.vestingPlan;

        if (vestingPlan <= VestingPlan.SeedRound) {
            vestedAmount = getAmountForTeamSeed(awardAmount, monthsPassed);
        } else if (
            vestingPlan > VestingPlan.SeedRound &&
            vestingPlan <= VestingPlan.Advisors
        ) {
            uint256 percentage;
            uint256 cliffPeriodInMonths;
            uint256 deltaPeriodInMonths;
            if (vestingPlan == VestingPlan.PrivateRound){
                percentage = quotaPercentagePrivate;
                cliffPeriodInMonths = cliffPeriodInMonthsPrivate;
                deltaPeriodInMonths = deltaPeriodInMonthsPrivate;
            } else if (vestingPlan == VestingPlan.StrategicPartners){
                percentage = quotaPercentageStrategic;
                cliffPeriodInMonths = cliffPeriodInMonthsStrategic;
                deltaPeriodInMonths = deltaPeriodInMonthsStrategic;
            } else {
                percentage = quotaPercentageAdvisors;
                cliffPeriodInMonths = cliffPeriodInMonthsAdvisors;
                deltaPeriodInMonths = deltaPeriodInMonthsAdvisors;
            }
            vestedAmount = getAmountForPrivateStrategicAdvisors(awardAmount, monthsPassed, percentage, cliffPeriodInMonths, deltaPeriodInMonths);
        } else if (
            vestingPlan > VestingPlan.Advisors &&
            vestingPlan <= VestingPlan.Ecosystem
        ) {
            vestedAmount = getAmountForTreasuryEcosystem(awardAmount, monthsPassed, vestingPlan);
        } else if (vestingPlan == VestingPlan.LiquidityPool) {
            vestedAmount = getAmountForLiquidityPool(awardAmount, monthsPassed, quotaPercentageLiquidityPool);
        } else {
            vestedAmount = 0;
        }

        uint256 amountToWithdraw = vestedAmount - award.released;
        return amountToWithdraw;
    }

    function getAmountForTeamSeed(uint256 awardAmount, uint256 monthsPassed)
        public
        pure
        returns (uint256)
    {
        if (monthsPassed < cliffPeriodInMonthsTeamSeed) {
            return 0;
        }
        uint256 accumulatedPercentage;
        if (monthsPassed > cliffPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 5 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 1 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 7.5 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 2 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 10 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 3 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 15 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 4 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 15 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 5 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 10 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 6 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 10 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 7 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 10 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 8 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 10 * 10000;
        }
        if (monthsPassed > cliffPeriodInMonthsTeamSeed + 9 * deltaPeriodInMonthsTeamSeed) {
            accumulatedPercentage += 7.5 * 10000;
        }

        return ((awardAmount * accumulatedPercentage) / RESOLUTION);
    }

    function getAmountForPrivateStrategicAdvisors(uint256 awardAmount, uint256 monthsPassed, uint256 percentage, uint256 cliffPeriodInMonths, uint256 deltaPeriodInMonths)
        public
        pure
        returns (uint256)
    {
        
        if (monthsPassed < cliffPeriodInMonths ) {
            return 0;
        }

        uint256 amountToWithdraw =
            (( (monthsPassed - cliffPeriodInMonths + deltaPeriodInMonths) / deltaPeriodInMonths) *
                awardAmount *
                percentage) / (RESOLUTION);

        return amountToWithdraw < awardAmount ? amountToWithdraw : awardAmount;

        
    }

    function getAmountForTreasuryEcosystem(uint256 awardAmount, uint256 monthsPassed, VestingPlan vestingPlan) public pure returns (uint256) {
        uint256 amountToWithdraw;
        for (uint256 i = 0; i <= monthsPassed; i++){
            uint256 coefficient = 0;
            if (vestingPlan == VestingPlan.Ecosystem){
                coefficient = i + 1;
            } else {
                coefficient = totalMonthsOfVesting - i;
            }
            amountToWithdraw += (awardAmount / sumTotalMonthsForVesting) * coefficient;
        }
        return amountToWithdraw;
    }

    function getAmountForLiquidityPool(uint256 awardAmount, uint256 monthsPassed, uint256 percentage)
        public
        pure
        returns (uint256)
    {
        uint256 amountToWithdraw = (percentage * awardAmount) / RESOLUTION ;
        if (monthsPassed >= 1) {
            uint256 amount =
                ((monthsPassed) * awardAmount * ((RESOLUTION - percentage) / vestingEventsLiquidityPoolCount)) / RESOLUTION;
            amountToWithdraw += amount;
        }
        amountToWithdraw = amountToWithdraw > awardAmount ? awardAmount : amountToWithdraw;
        return amountToWithdraw;
    }
     
    function initAwards(address[] memory  beneficiaries, TokenAward[] memory _awards, uint256 totalAwards) internal{
        uint256 _totalAwards = 0;
        for(uint256 i = 0; i < beneficiaries.length; i++){
            require(awards[beneficiaries[i]].amount == 0, "duplicated beneficiary");
            awards[beneficiaries[i]] = _awards[i];
            _totalAwards += _awards[i].amount;
        }
        require(_totalAwards == totalAwards, "different awards amount");
    }
}
