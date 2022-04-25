const TotalPeriods = 100;
const periodTotalStars = Array(TotalPeriods).fill(0); // total stars of tokens eligible for rewards

// per token
const periodStars = Array(TotalPeriods).fill(0); // = user played in the period
const periodStarsUpdated = Array(TotalPeriods).fill(false);
const periodTraits = Array(TotalPeriods).fill(0);
const periodEligible = Array(TotalPeriods).fill(false);
let _currentPeriodIdx = 0;

// in Token
const eligiblePeriods = Array(2).fill(0);

function printStatus() {
  const currentPeriodIdx = getCurrentPeriodIdx();
  const currentEligiblePeriodIdx = getCurrentEligiblePeriodIdx();
  const previousEligiblePeriodIdx = getPreviousEligiblePeriodIdx();
  console.log(`------- Status ------`);
  for (let i=0; i<=currentPeriodIdx; i++) {
    const totalStars = periodTotalStars[i];
    console.log(`period: ${i} eligible: ${periodEligible[i]} totalStars: ${totalStars}`)
  }
  console.log(`curPeriod: ${currentPeriodIdx} curEligible: ${currentEligiblePeriodIdx} prevEligible: ${previousEligiblePeriodIdx}`);
  console.log(`------- /Status ------`);
}

function getCurrentPeriodIdx() {
  return _currentPeriodIdx;
}

function nextPeriod() {
  _currentPeriodIdx++;
}

function getCurrentEligiblePeriodIdx() {
  return eligiblePeriods[0];
}

function setCurrentEligiblePeriodIdx(idx) {
  eligiblePeriods[0] = idx;
}

function getPreviousEligiblePeriodIdx() {
  return eligiblePeriods[1];
}

function setPreviousEligiblePeriodIdx(idx) {
  eligiblePeriods[1] = idx;
}

function extract(traitCount, stars) {
  let currentPeriodIdx = getCurrentPeriodIdx();
  let currentEligiblePeriodIdx = getCurrentEligiblePeriodIdx(); // before update
  let previousEligiblePeriodIdx = getPreviousEligiblePeriodIdx();
  
  const starsOfCurrentEligiblePeriodBeforeUpdate = periodStars[currentEligiblePeriodIdx];
  const isCurrentPeriodEligibleBeforeUpdate = periodEligible[currentPeriodIdx];
  
  let previousTraitCount; 
  if (periodStarsUpdated[currentPeriodIdx] === true) { // second entry to the period
    previousTraitCount = periodTraits[previousEligiblePeriodIdx];
    if (traitCount>previousTraitCount && traitCount-previousTraitCount>5) {
      periodEligible[currentPeriodIdx] = true;
      setCurrentEligiblePeriodIdx(currentPeriodIdx);
    } else {
      periodEligible[currentPeriodIdx] = false;
      setCurrentEligiblePeriodIdx(previousEligiblePeriodIdx);
    }
  } else {
    previousTraitCount = periodTraits[currentEligiblePeriodIdx];
    if (traitCount>previousTraitCount && traitCount-previousTraitCount>5) {
      periodEligible[currentPeriodIdx] = true;
      setCurrentEligiblePeriodIdx(currentPeriodIdx);
    } else {
      periodEligible[currentPeriodIdx] = false;
    }
    setPreviousEligiblePeriodIdx(currentEligiblePeriodIdx);
  }
  
  periodTraits[currentPeriodIdx] = traitCount;
  periodStars[currentPeriodIdx] = stars; 
  periodStarsUpdated[currentPeriodIdx] = true;

  const isCurrentPeriodEligibleAfterUpdate = periodEligible[currentPeriodIdx];
  const starsOfCurrentEligiblePeriodAfterUpdate = periodStars[getCurrentEligiblePeriodIdx()];

  console.log(`isCurrentPeriodEligibleBeforeUpdate: ${isCurrentPeriodEligibleBeforeUpdate}, isCurrentPeriodEligibleAfterUpdate: ${isCurrentPeriodEligibleAfterUpdate}`)
  console.log(`starsOfCurrentEligiblePeriodBeforeUpdate: ${starsOfCurrentEligiblePeriodBeforeUpdate}, starsOfCurrentEligiblePeriodAfterUpdate: ${starsOfCurrentEligiblePeriodAfterUpdate}`)


  if (isCurrentPeriodEligibleBeforeUpdate === false && isCurrentPeriodEligibleAfterUpdate === false) {
    // not eligible->not eligible: no update to total stars
  }
  if (isCurrentPeriodEligibleBeforeUpdate === false && isCurrentPeriodEligibleAfterUpdate === true) {
    // not eligible->eligible: update to total stars
    console.log(`!eligible->eligible`);
    periodTotalStars[currentPeriodIdx] = periodTotalStars[currentPeriodIdx] + starsOfCurrentEligiblePeriodAfterUpdate;
  }
  if (isCurrentPeriodEligibleBeforeUpdate === true && isCurrentPeriodEligibleAfterUpdate === true) {
    // eligible->eligible: update to total stars
    periodTotalStars[currentPeriodIdx] = 
      periodTotalStars[currentPeriodIdx] - starsOfCurrentEligiblePeriodBeforeUpdate + starsOfCurrentEligiblePeriodAfterUpdate;
  }
  if (isCurrentPeriodEligibleBeforeUpdate === true && isCurrentPeriodEligibleAfterUpdate === false) {
    // eligible->not eligible: update to total stars
    periodTotalStars[currentPeriodIdx] = periodTotalStars[currentPeriodIdx] - starsOfCurrentEligiblePeriodBeforeUpdate;
  }

}

function test1() {
  nextPeriod(); // 1
  nextPeriod(); // 2
  
  extract(10,1);
  printStatus();

  nextPeriod(); // 3
  
  extract(20,2);
  printStatus();

  nextPeriod(); // 4

  extract(26,3);
  printStatus();

  extract(25,1);
  printStatus();

  extract(35,2);
  printStatus();
  
  nextPeriod();
  nextPeriod();
  nextPeriod();
  nextPeriod();

  nextPeriod();
  extract(50,2);
  extract(0,0);
  extract(0,0);
  printStatus();
}

function main() {
  test1();
  
}

main();