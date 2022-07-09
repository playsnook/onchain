require('dotenv').config();
const { expect } = require("chai");
const {deployments, ethers, getNamedAccounts } = require('hardhat');
const { 
  utils: {
    formatEther: FE, 
    formatUnits: FU, 
    parseUnits: PU, 
    parseEther: PE, 
    formatBytes32String,
    parseBytes32String
  }, 
  BigNumber,
  constants: {MaxUint256}
} = ethers;
const { getEventArgs } = require('../scripts/lib');
const { Ecosystem: [EcosytemAddress ]} = require('../.vesting.json');
const FOUNDERS_ADDRESS = process.env.FOUNDERS_ADDRESS;


const pwdRef = "000-000-000";
const roomMode = 0;
// 0x0000000000000000000000000000000000000000000000000000000000000000
const collectionId = formatBytes32String(0);
const rounds = 1;
describe('BigBoyTable', () => {
  let UniswapUSDCSkill;
  let SkillTokenDeployer;
  let SkillTokenGamer1;
  let SkillTokenGamer2;
  let BigBoyTableGamer1;
  let BigBoyTableGamer2;
  let BigBoyTableDeployer;
  
  let snookPriceInSNK; 
  let gamer1;
  let gamer2;
  let deployer;
  let minParticipants;
  let maxParticipants;
  let minStakeSNK;
  let minStakeNative;
  let stakingWindowInSeconds;

  beforeEach(async () => {
    await deployments.fixture(['L2']);
    ({ deployer, gamer1, gamer2 } = await getNamedAccounts());
    UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
    SkillTokenDeployer = await ethers.getContract('SkillToken', deployer); 
    SkillTokenGamer1 = await ethers.getContract('SkillToken', gamer1);
    SkillTokenGamer2 = await ethers.getContract('SkillToken', gamer2);
    SnookGameGamer1 = await ethers.getContract('SnookGame', gamer1);
    SnookGameGamer2 = await ethers.getContract('SnookGame', gamer2);
    SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
    BigBoyTableGamer1 = await ethers.getContract('BigBoyTable', gamer1);
    BigBoyTableGamer2 = await ethers.getContract('BigBoyTable', gamer2);
    BigBoyTableDeployer = await ethers.getContract('BigBoyTable', deployer);
    minParticipants = await BigBoyTableDeployer.getMinParticipantsPerRoom();
    maxParticipants = await BigBoyTableDeployer.getMaxParticipantsPerRoom();
    minStakeSNK = await BigBoyTableDeployer.getMinimalStakeInSNK();
    minStakeNative = await BigBoyTableDeployer.getMinimalStakeInNative();
    stakingWindowInSeconds = await BigBoyTableDeployer.getStakingWindowInSeconds();

    snookPriceInSNK = await UniswapUSDCSkill.getSnookPriceInSkills();
    
    // give some SNK to deployer
    await SkillTokenGamer1.transfer(deployer, PU('1000', 'ether'));
    expect(await SkillTokenDeployer.balanceOf(deployer)).eq(PU('1000', 'ether'));
    expect(await SkillTokenDeployer.balanceOf(gamer1)).eq(PU('4000', 'ether'));
    expect(await SkillTokenDeployer.balanceOf(gamer2)).eq(PU('5000', 'ether'));

    await SkillTokenGamer1.approve(BigBoyTableGamer1.address, ethers.constants.MaxUint256);
    await SkillTokenGamer2.approve(BigBoyTableGamer2.address, ethers.constants.MaxUint256);
    await SkillTokenDeployer.approve(BigBoyTableDeployer.address, ethers.constants.MaxUint256);
    
  });
  
  describe('Rooms with native currency', function() {
    describe('Free rooms', function() {

      describe.skip('emergencyUnstake', function() { 
        let deployerBalanceBefore;
        beforeEach(async function () {
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            minStakeNative,
            true,
            roomMode,
            pwdRef,
            collectionId,
            rounds,
            {value: minStakeNative}
          );
          deployerBalanceBefore = await ethers.provider.getBalance(deployer); 
        });

        it('returns Native stake to room owner', async function() {
          const tx = await BigBoyTableDeployer.emergencyUnstake(1); 
          const receipt = await tx.wait(1);
          const gasFee = tx.gasPrice.mul(receipt.gasUsed);
          const deployerBalanceAfter = await ethers.provider.getBalance(deployer);
          expect(deployerBalanceAfter.add(gasFee)).eq(deployerBalanceBefore.add(minStakeNative));
        });

      });


      describe('createFreeRoom()', function() {

        it('reverts if invalid room mode is requetsed', async function() {
          const totalStake = minStakeNative;
          
          await expect(
            BigBoyTableDeployer.createFreeRoom(
              minParticipants,
              totalStake,
              true,
              2,
              pwdRef,
              collectionId,
              rounds,
              {value: totalStake}
            )
          ).to.be.revertedWith('BBT: unsupported mode');
        });

        it('decreases creator balance (native) by total stake and gas', async function() {
          const totalStake = minStakeNative;
          const deployerBalanceMATIC1 = await ethers.provider.getBalance(deployer);
          
          const tx = await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            true,
            roomMode,
            pwdRef,
            collectionId,
            rounds,
            {value: totalStake}
          );
          const receipt = await tx.wait(1);
          const gasFeeInMATIC = tx.gasPrice.mul(receipt.gasUsed);    
          const deployerBalanceMATIC2 = await ethers.provider.getBalance(deployer);
          expect(deployerBalanceMATIC1).eq(deployerBalanceMATIC2.add(totalStake.add(gasFeeInMATIC)));
        });
        
        it('decreases creator balance (SNK) by room creation price (fee paid in SNK)', async function() {
          const totalStake = minStakeNative;
          const deployerBalanceSNK1 = await SkillTokenDeployer.balanceOf(deployer);
          
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            true,
            roomMode,
            pwdRef,
            collectionId,
            rounds,
            {value: totalStake}
          );
          
          const deployerBalanceSNK2 = await SkillTokenDeployer.balanceOf(deployer);
          const roomCreationPriceInSNK = await BigBoyTableDeployer.getRoomCreationPriceInSNK();
          
          expect(deployerBalanceSNK1).eq(deployerBalanceSNK2.add(roomCreationPriceInSNK));
        });

        it('transfers total native stake from creator to the BBT contract', async function() {
          const totalStake = minStakeNative;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            true,
            roomMode,
            pwdRef,
            collectionId,
            rounds,
            {value: totalStake}
          );      
          expect(await ethers.provider.getBalance(BigBoyTableDeployer.address)).eq(totalStake);
        });
      });
    });

    describe('Non-free rooms', function() {
      describe('emergencyUnstake', function() {
        let balanceBeforeGamer1; 
        let balanceBeforeGamer2; 
        beforeEach(async function () {
          await BigBoyTableDeployer.createRoom(
            minParticipants,
            minStakeNative,
            true,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.stakeNative(1, {value: minStakeNative});
          await BigBoyTableGamer2.stakeNative(1, {value: minStakeNative});
          balanceBeforeGamer1 = await ethers.provider.getBalance(gamer1);
          balanceBeforeGamer2 = await ethers.provider.getBalance(gamer2);
        });

        it('returns Native stakes to stakers while room is active', async function() {
          await BigBoyTableDeployer.emergencyUnstake(1);
          const balanceAfterGamer1 = await ethers.provider.getBalance(gamer1);
          const balanceAfterGamer2 = await ethers.provider.getBalance(gamer2);
          expect(balanceAfterGamer1).eq(balanceBeforeGamer1.add(minStakeNative));
          expect(balanceAfterGamer2).eq(balanceBeforeGamer2.add(minStakeNative));
        });

      });
      describe('stakeNative()', function() {
        beforeEach(async function() {
          await BigBoyTableDeployer.createRoom(
            minParticipants,
            minStakeNative,
            true,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
        });

        it('transfers required stake balance from staker to BBT contract', async function() {
          const gamer1NativeBalance1 = await ethers.provider.getBalance(gamer1);
          const bbtNativeBalance1 = await ethers.provider.getBalance(BigBoyTableDeployer.address);
          const tx = await BigBoyTableGamer1.stakeNative(1, {value: minStakeNative});
          const receipt = await tx.wait(1);
          const gasFee = receipt.gasUsed.mul(tx.gasPrice);
          const gamer1NativeBalance2 = await ethers.provider.getBalance(gamer1);
          const bbtNativeBalance2 = await ethers.provider.getBalance(BigBoyTableDeployer.address);
          const gamerDiff = gamer1NativeBalance1.sub(gamer1NativeBalance2).sub(gasFee);
          const bbtDiff = bbtNativeBalance2.sub(bbtNativeBalance1);
          expect(gamerDiff).eq(bbtDiff);
          expect(bbtDiff).eq(minStakeNative);
        });
      });
    });
  });

  describe('Rooms with SNK', function() { 
    describe('Free rooms', function() {

      describe('getRoom()', function() {
        let deployerBalanceBefore;
        beforeEach(async function () {
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            minStakeSNK,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          deployerBalanceBefore = await SkillTokenDeployer.balanceOf(deployer); 
        });

        it('returns room with id = 1', async function() {
          const room = await BigBoyTableDeployer.getRoom(1);
          expect(room.id).eq(1);
        });
        it('reverts when asked for a non-existant room with id=2', async function() {
          await expect(
            BigBoyTableDeployer.getRoom(2)
          ).to.be.revertedWith('BBT: invalid room id');
        });
      });

      describe.skip('emergencyUnstake()', function() {
        let deployerBalanceBefore;
        beforeEach(async function () {
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            minStakeSNK,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          deployerBalanceBefore = await SkillTokenDeployer.balanceOf(deployer); 
        });

        it('returns SNK stakes to owner', async function() {
          await BigBoyTableDeployer.emergencyUnstake(1);
          const deployerBalanceAfter = await SkillTokenDeployer.balanceOf(deployer);
          expect(deployerBalanceAfter).eq(deployerBalanceBefore.add(minStakeSNK));
        });

      });

      describe('createFreeRoom()', function() {
  
        it('reverts when stake is less than minimal stake', async function() {
          const totalStake = minStakeSNK.mul(9).div(10);
          await expect(
            BigBoyTableDeployer.createFreeRoom(
              minParticipants,
              totalStake,
              false,
              roomMode,
              pwdRef,
              collectionId,
              rounds
            )
          ).to.be.revertedWith("BBT: requiredStake is less than minimal");
        });
    
        it('reverts when not enough SNK for stake on creator balance', async function() {
          const totalStake = await SkillTokenDeployer.totalSupply();
          await expect(BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          )).to.be.reverted;
        });
    
        it('reverts when not enough SNK for room creation', async function() {
          const roomCreationPrice = await BigBoyTableDeployer.getRoomCreationPriceInSNK();
          const deployerBalance = await SkillTokenDeployer.balanceOf(deployer);
    
          const totalStake = await BigBoyTableDeployer.getMinimalStakeInSNK();
          await SkillTokenDeployer.transfer(gamer1, deployerBalance);
          await SkillTokenGamer1.transfer(deployer, totalStake.add(roomCreationPrice.mul(9).div(10)));
          await expect(BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          )).to.be.reverted;
        });
    
        it('transfers total SNK stake from creator to the BBT contract', async function() {
          const totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );      
          expect(await SkillTokenDeployer.balanceOf(BigBoyTableDeployer.address)).eq(totalStake);
        });
    
        it('decreases creator balance (SNK) by total stake and room creation price (SNK)', async function() {
          const totalStake = minStakeSNK;
          const deployerBalance1 = await SkillTokenDeployer.balanceOf(deployer);
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          const deployerBalance2 = await SkillTokenDeployer.balanceOf(deployer);
          const roomCreationPriceInSNK = await BigBoyTableDeployer.getRoomCreationPriceInSNK();
          expect(deployerBalance1).eq(deployerBalance2.add(totalStake).add(roomCreationPriceInSNK));
        });
    
        it('transfers total SNK stake from creator to the BBT contract', async function() {
          const totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );      
          expect(await SkillTokenDeployer.balanceOf(BigBoyTableDeployer.address)).eq(totalStake);
        });
    
        it('transfers room creation fee to ecosystem', async function() {
          const totalStake = minStakeSNK;
          const roomCreationPriceInSNK = await BigBoyTableDeployer.getRoomCreationPriceInSNK();
          const ecosystemBalance1 = await SkillTokenDeployer.balanceOf(EcosytemAddress);
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );      
          const ecosystemBalance2 = await SkillTokenDeployer.balanceOf(EcosytemAddress);
          expect(ecosystemBalance2).eq(ecosystemBalance1.add(roomCreationPriceInSNK));
        });
    
        it('creates a room with id 1', async function() {
          const totalStake = minStakeSNK;
          await expect(BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          )).to.emit(BigBoyTableDeployer, 'FreeRoomCreated').withArgs(1, deployer);
        });
    
        it('creates an active room', async function() {
          const totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );      
          
          const roomCount = await BigBoyTableDeployer.getActiveRoomCount();
          expect(roomCount).eq(1);
          const activeRooms = await BigBoyTableDeployer.getActiveRooms(0,roomCount);
          expect(activeRooms[0].id).eq(1);
        });
    
        it('creates a room with owner who is creator of the room', async function() {
          const totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );      
          const activeRooms = await BigBoyTableDeployer.getActiveRooms(0,1);
          expect(activeRooms[0].owner).eq(deployer);
        });

        it('reverts if participants exceed max allowed', async function() {
          await expect(
            BigBoyTableDeployer.createFreeRoom(
              maxParticipants.add(1),
              minStakeSNK,
              false,
              roomMode,
              pwdRef,
              collectionId,
              rounds
            )
          ).to.be.revertedWith('BBT: invalid max number of participants');
        });

        it('reverts if participants is less than min allowed', async function() {
          await expect(
            BigBoyTableDeployer.createFreeRoom(
              minParticipants.sub(1),
              minStakeSNK,
              false,
              roomMode,
              pwdRef,
              collectionId,
              rounds
            )
          ).to.be.revertedWith('BBT: invalid max number of participants');
        })
      });
  
      describe('lockRoom()', function() {
        let totalStake;
        beforeEach(async function() {
          totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
        });
  
        it('reverts being called by room non-owner', async function() {
          await expect(BigBoyTableGamer1.lockRoom(1)).
            to.be.revertedWith('BBT: not a room owner');
        });
  
        it('reverts if room is already locked', async function() {
          await expect(BigBoyTableDeployer.lockRoom(1));
          await expect(
            BigBoyTableDeployer.lockRoom(1)
          ).to.be.revertedWith('BBT: room already locked');
        });

        it('reverts if locking window elapsed', async function() {
          const lockingWindowInSeconds = await BigBoyTableDeployer.getLockingWindowInSeconds();
          await network.provider.send("evm_increaseTime", [lockingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableDeployer.lockRoom(1)
          ).to.be.revertedWith('BBT: locking window is closed');
        });
  
        it('reverts if room is finished', async function() {
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.stakeSNK(1);
          await BigBoyTableGamer2.stakeSNK(1);
          const stakingWindowInSeconds = await BigBoyTableDeployer.getStakingWindowInSeconds();
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1], [gamer1, gamer2]);
          await expect(
            BigBoyTableDeployer.lockRoom(1)
          ).to.be.revertedWith('BBT: room is not active');
        });
      });
  
      describe('joinFreeRoom()', function() {
        let totalStake;
        beforeEach(async function() {
          totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
        });
        it('reverts if room is not locked', async function() {
          await expect(
            BigBoyTableGamer1.joinFreeRoom(1)
          ).to.be.revertedWith('BBT: room is not locked');
        });
        it('reverts if staking window has elapsed', async function() {
          await BigBoyTableDeployer.lockRoom(1);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableGamer1.joinFreeRoom(1)
          ).to.be.revertedWith('BBT: staking window closed');
        });
        it('reverts if joining non-free room', async function() {
          await BigBoyTableDeployer.createRoom(
            minParticipants,
            minStakeSNK,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(2);
          await expect(
            BigBoyTableGamer1.joinFreeRoom(2)
          ).to.be.revertedWith('BBT: room is not free');
        });
        it('reverts if room is not active)', async function() {
          const activeRoomCount = await BigBoyTableDeployer.getActiveRoomCount();
          await expect(
            BigBoyTableGamer1.joinFreeRoom(activeRoomCount.add(1))
          ).to.be.revertedWith('BBT: room is not active');
        });
      });
  
      describe('reportWinners(), no collection attached', function() {
        let totalStake;
        beforeEach(async function() {
          totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.joinFreeRoom(1);
          await BigBoyTableGamer2.joinFreeRoom(1);
        });
    
        it('distributes prize to a single winner (gamer 1) and winning fee to Founders', async function() {
          const gamer1Balance1 = await SkillTokenDeployer.balanceOf(gamer1);
          const foundersBalance1 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1], [gamer1, gamer2]);
          const winningFeeInPercents = await BigBoyTableDeployer.getWinningFeeInPercents();
          const winningFee = totalStake.mul(winningFeeInPercents).div(100);
          const prizeToWinner = totalStake.sub(winningFee);
          const gamer1Balance2 = await SkillTokenDeployer.balanceOf(gamer1);
          const foundersBalance2 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);
          expect(gamer1Balance2).eq(gamer1Balance1.add(prizeToWinner));
          expect(foundersBalance2).eq(foundersBalance1.add(winningFee));
        });
    
        it('distributes prize to two winners (gamer 1 and 2) - and winning fee to founders', async function() {
          const gamer1Balance1 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance1 = await SkillTokenDeployer.balanceOf(gamer2);
          const foundersBalance1 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);

          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2]);
          const winningFeeInPercents = await BigBoyTableDeployer.getWinningFeeInPercents();
          const winningFee = totalStake.mul(winningFeeInPercents).div(100);
          const prizeToWinner = totalStake.sub(winningFee).div(2);
          const gamer1Balance2 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance2 = await SkillTokenDeployer.balanceOf(gamer2);
    
          const foundersBalance2 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);

          expect(gamer1Balance2).eq(gamer1Balance1.add(prizeToWinner));
          expect(gamer2Balance2).eq(gamer2Balance1.add(prizeToWinner));
          expect(foundersBalance2).eq(foundersBalance1.add(winningFee));
    
        });
    
        it('reverts if called by non-extractor', async function() {
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableGamer1.reportWinners(1, [gamer1], [gamer1, gamer2])
          ).to.be.reverted;
        });
  
        it('reverts if non-participant is reported as a winner', async function() {
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableDeployer.reportWinners(1, [deployer], [gamer1, gamer2])
          ).to.be.revertedWith('BBT: one or more of reported winners are not participant');
        });

        it('emits RoomFinished event', async function() {
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2])
          ).to.emit(BigBoyTableDeployer, 'RoomFinished').withArgs(1, [gamer1, gamer2], []);
        });

        it('reverts if called before staking window closes', async function() {
          await expect(
            BigBoyTableDeployer.reportWinners(1, [gamer1], [gamer1, gamer2])
          ).to.be.revertedWith("BBT: cannot report winners before staking window is closed");
        });
        
      });

      describe('reportWinners() with active collection, non-zero revshare', function() {
        let totalStake;
        let CollectionListDeployer;
        let CollectionListGamer1;
        let CollectionListGamer2;
        let accessThresholdInCollectionTokens;
        let activityThresholdInSNK;
        let lockPeriodInSeconds;
        let revshareInPercents;
        let revshareRecipient;
        let chainId;
        let collectionId;
        let gamer1Deposit;
        let gamer2Deposit;
        beforeEach(async function() {
          gamer1Deposit = PE('250');
          gamer2Deposit = PE('250');
          accessThresholdInCollectionTokens = PE('100');
          activityThresholdInSNK = gamer1Deposit.add(gamer2Deposit);
          lockPeriodInSeconds = 3600;
          revshareInPercents = 10;
          revshareRecipient = deployer;
          chainId = 80001;
          CollectionListDeployer = await ethers.getContract('CollectionList', deployer);
          CollectionListGamer1 = await ethers.getContract('CollectionList', gamer1);
          CollectionListGamer2 = await ethers.getContract('CollectionList', gamer2);
          await SkillTokenGamer1.approve(CollectionListDeployer.address, MaxUint256);
          await SkillTokenGamer2.approve(CollectionListDeployer.address, MaxUint256);
          await SkillTokenDeployer.approve(CollectionListDeployer.address, MaxUint256);

          ({collectionId} = await getEventArgs(
            CollectionListDeployer.addCollection(
              `PunkyMonkey`,
              chainId,
              SkillTokenDeployer.address,
              accessThresholdInCollectionTokens,
              activityThresholdInSNK,
              lockPeriodInSeconds,
              revshareInPercents,
              revshareRecipient
            ), 'CollectionAdded')
          );
          
          await CollectionListGamer1.depositSNK(collectionId, gamer1Deposit);
          await CollectionListGamer2.depositSNK(collectionId, gamer2Deposit);
          expect(await CollectionListDeployer.getCollectionCount()).eq(1);
          expect(await CollectionListDeployer.getDepositRecordCount(collectionId)).eq(2);
          totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.joinFreeRoom(1);
          await BigBoyTableGamer2.joinFreeRoom(1);
        });
    

        it('distributes prize to two winners (gamer 1 and 2)', async function() {
          const gamer1Balance1 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance1 = await SkillTokenDeployer.balanceOf(gamer2);
          
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2]);
          
          const revshareInPercents = await CollectionListDeployer.getRevshareInPercents(collectionId);
          const revshareAmount = totalStake.mul(revshareInPercents).div(100);
        
          const winningFeeInPercents = await BigBoyTableDeployer.getWinningFeeInPercents();
          const winningFeeAmount = totalStake.mul(winningFeeInPercents).div(100);
          
          const prizeToWinner = totalStake.sub(winningFeeAmount).sub(revshareAmount).div(2);
          const gamer1Balance2 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance2 = await SkillTokenDeployer.balanceOf(gamer2);
    
          expect(gamer1Balance2).eq(gamer1Balance1.add(prizeToWinner));
          expect(gamer2Balance2).eq(gamer2Balance1.add(prizeToWinner));
        });

        it('distributes part of prize as revshare to collection owner', async function() {
          const revshareInPercents = await CollectionListDeployer.getRevshareInPercents(collectionId);
          const revshareAmount = totalStake.mul(revshareInPercents).div(100);
          const revshareRecipient = await CollectionListDeployer.getRevshareRecipient(collectionId);
          const revshareRecipientBalance1 = await SkillTokenDeployer.balanceOf(revshareRecipient);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2]);
          const revshareRecipientBalance2 = await SkillTokenDeployer.balanceOf(revshareRecipient);
          expect(revshareRecipientBalance2).eq(revshareRecipientBalance1.add(revshareAmount));
        });

        it('distributes part of prize as winning fee to founders', async function() {
          const foundersBalance1 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2]);
          const winningFeeInPercents = await BigBoyTableDeployer.getWinningFeeInPercents();
          const winningFeeAmount = totalStake.mul(winningFeeInPercents).div(100);
          const foundersBalance2 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);
          expect(foundersBalance2).eq(foundersBalance1.add(winningFeeAmount));
        });
    
      });

      describe('reportWinners() with active collection, zero revshare', function() {
        let totalStake;
        let CollectionListDeployer;
        let CollectionListGamer1;
        let CollectionListGamer2;
        let accessThresholdInCollectionTokens;
        let activityThresholdInSNK;
        let lockPeriodInSeconds;
        let revshareInPercents;
        let revshareRecipient;
        let chainId;
        let collectionId;
        let gamer1Deposit;
        let gamer2Deposit;
        beforeEach(async function() {
          gamer1Deposit = PE('250');
          gamer2Deposit = PE('250');
          accessThresholdInCollectionTokens = PE('100');
          activityThresholdInSNK = gamer1Deposit.add(gamer2Deposit);
          lockPeriodInSeconds = 3600;
          revshareInPercents = 0;
          revshareRecipient = deployer;
          chainId = 80001;
          CollectionListDeployer = await ethers.getContract('CollectionList', deployer);
          CollectionListGamer1 = await ethers.getContract('CollectionList', gamer1);
          CollectionListGamer2 = await ethers.getContract('CollectionList', gamer2);
          await SkillTokenGamer1.approve(CollectionListDeployer.address, MaxUint256);
          await SkillTokenGamer2.approve(CollectionListDeployer.address, MaxUint256);
          await SkillTokenDeployer.approve(CollectionListDeployer.address, MaxUint256);

          ({collectionId} = await getEventArgs(
            CollectionListDeployer.addCollection(
              `PunkyMonkey`,
              chainId,
              SkillTokenDeployer.address,
              accessThresholdInCollectionTokens,
              activityThresholdInSNK,
              lockPeriodInSeconds,
              revshareInPercents,
              revshareRecipient
            ), 'CollectionAdded')
          );
          
          await CollectionListGamer1.depositSNK(collectionId, gamer1Deposit);
          await CollectionListGamer2.depositSNK(collectionId, gamer2Deposit);
          expect(await CollectionListDeployer.getCollectionCount()).eq(1);
          expect(await CollectionListDeployer.getDepositRecordCount(collectionId)).eq(2);
          totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.joinFreeRoom(1);
          await BigBoyTableGamer2.joinFreeRoom(1);
        });
    

        it('distributes prize to two winners (gamer 1 and 2)', async function() {
          const gamer1Balance1 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance1 = await SkillTokenDeployer.balanceOf(gamer2);
          
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2]);
          
          const revshareInPercents = await CollectionListDeployer.getRevshareInPercents(collectionId);
          const revshareAmount = totalStake.mul(revshareInPercents).div(100);
        
          const winningFeeInPercents = await BigBoyTableDeployer.getWinningFeeInPercents();
          const winningFeeAmount = totalStake.mul(winningFeeInPercents).div(100);
          
          const prizeToWinner = totalStake.sub(winningFeeAmount).sub(revshareAmount).div(2);
          const gamer1Balance2 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance2 = await SkillTokenDeployer.balanceOf(gamer2);
    
          expect(gamer1Balance2).eq(gamer1Balance1.add(prizeToWinner));
          expect(gamer2Balance2).eq(gamer2Balance1.add(prizeToWinner));
        });

        it('distributes 0 of prize as revshare to collection owner', async function() {
          const revshareInPercents = await CollectionListDeployer.getRevshareInPercents(collectionId);
          const revshareAmount = totalStake.mul(revshareInPercents).div(100);
          const revshareRecipient = await CollectionListDeployer.getRevshareRecipient(collectionId);
          const revshareRecipientBalance1 = await SkillTokenDeployer.balanceOf(revshareRecipient);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2]);
          const revshareRecipientBalance2 = await SkillTokenDeployer.balanceOf(revshareRecipient);
          expect(revshareRecipientBalance2).eq(revshareRecipientBalance1.add(revshareAmount));
        });

        it('distributes part of prize as winning fee to founders', async function() {
          const foundersBalance1 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.reportWinners(1, [gamer1, gamer2], [gamer1, gamer2]);
          const winningFeeInPercents = await BigBoyTableDeployer.getWinningFeeInPercents();
          const winningFeeAmount = totalStake.mul(winningFeeInPercents).div(100);
          const foundersBalance2 = await SkillTokenDeployer.balanceOf(FOUNDERS_ADDRESS);
          expect(foundersBalance2).eq(foundersBalance1.add(winningFeeAmount));
        });
    
      });
  
      describe('deleteAgedActiveRoom()', function() {
        let totalStake;
        beforeEach(async function() {
          totalStake = minStakeSNK;
          await BigBoyTableDeployer.createFreeRoom(
            minParticipants,
            totalStake,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.joinFreeRoom(1);
          await BigBoyTableGamer2.joinFreeRoom(1);
        });
  
        it('reverted when called on non-aged room', async function(){
          await expect(
            BigBoyTableDeployer.deleteAgedActiveRoom(1)
          ).to.be.revertedWith("BBT: room is not aged enough");
        });
  
        it('deletes an active room when it is aged', async function() {
          const deletionDelay = await BigBoyTableDeployer.getActiveRoomDeletionDelayInSeconds();
          await network.provider.send("evm_increaseTime", [deletionDelay.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableDeployer.deleteAgedActiveRoom(1)
          ).to.emit(BigBoyTableDeployer, "AgedActiveRoomDeleted").withArgs(1);
          expect(await BigBoyTableDeployer.getActiveRoomCount()).eq(0);
        });

        it('returns total stake to the room creator', async function() {
          const deletionDelay = await BigBoyTableDeployer.getActiveRoomDeletionDelayInSeconds();
          await network.provider.send("evm_increaseTime", [deletionDelay.toNumber()]);
          await network.provider.send("evm_mine");
          const creatorBalance1 = await SkillTokenDeployer.balanceOf(deployer);
          await BigBoyTableDeployer.deleteAgedActiveRoom(1);
          const creatorBalance2 = await SkillTokenDeployer.balanceOf(deployer);
          expect(creatorBalance2).eq(creatorBalance1.add(totalStake));
        });
      });
    });
    
    describe('Non-free rooms', function() {

      describe('deleteAgedActiveRoom()', function() {
        let totalStake;
        beforeEach(async function() {
          await BigBoyTableDeployer.createRoom(
            maxParticipants,
            minStakeSNK,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.stakeSNK(1);
          await BigBoyTableGamer2.stakeSNK(1);
          
        });
  
        it('reverted when called on non-aged room', async function(){
          await expect(
            BigBoyTableDeployer.deleteAgedActiveRoom(1)
          ).to.be.revertedWith("BBT: room is not aged enough");
        });
  
        it('deletes an active room when it is aged', async function() {
          const deletionDelay = await BigBoyTableDeployer.getActiveRoomDeletionDelayInSeconds();
          await network.provider.send("evm_increaseTime", [deletionDelay.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableDeployer.deleteAgedActiveRoom(1)
          ).to.emit(BigBoyTableDeployer, "AgedActiveRoomDeleted").withArgs(1);
          expect(await BigBoyTableDeployer.getActiveRoomCount()).eq(0);
        });

        it('returns minStakeSNK stake to the participants', async function() {
          const deletionDelay = await BigBoyTableDeployer.getActiveRoomDeletionDelayInSeconds();
          await network.provider.send("evm_increaseTime", [deletionDelay.toNumber()]);
          await network.provider.send("evm_mine");
          const gamer1Balance1 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance1 = await SkillTokenDeployer.balanceOf(gamer2);
          await BigBoyTableDeployer.deleteAgedActiveRoom(1);
          const gamer1Balance2 = await SkillTokenDeployer.balanceOf(gamer1);
          const gamer2Balance2 = await SkillTokenDeployer.balanceOf(gamer2);
          expect(gamer1Balance2).eq(gamer1Balance1.add(minStakeSNK));
          expect(gamer2Balance2).eq(gamer2Balance1.add(minStakeSNK));
          
        });
      });
    
      describe('reportWinners(), no collection attached', function() {
        beforeEach(async function() {
          await BigBoyTableDeployer.createRoom(
            3,
            minStakeSNK,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableDeployer.stakeSNK(1);
          await BigBoyTableGamer1.stakeSNK(1);
          await BigBoyTableGamer2.stakeSNK(1);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds*2]);
          await network.provider.send("evm_mine");
        });

        it('emits RoomFinished with empty unseen participants', async function() {
          await expect(
            BigBoyTableDeployer.reportWinners(1,[gamer1], [gamer1, gamer2, deployer])
          ).to.emit(BigBoyTableDeployer, 'RoomFinished').withArgs(1,[gamer1],[]);
        });

        it('emits RoomFinished with unseen participants having deployer', async function() {
          await expect(
            BigBoyTableDeployer.reportWinners(1,[gamer1], [gamer1, gamer2])
          ).to.emit(BigBoyTableDeployer, 'RoomFinished').withArgs(1,[gamer1],[deployer]);
        });

        it('returns stake to deployer', async function() {
          const deployerBalance1 = await SkillTokenDeployer.balanceOf(deployer);
          await BigBoyTableDeployer.reportWinners(1,[gamer1], [gamer1, gamer2]);
          const deployerBalance2 = await SkillTokenDeployer.balanceOf(deployer);
          expect(deployerBalance2).eq(deployerBalance1.add(minStakeSNK));
        });

        it('reverts if number of players greater than number of participants', async function() {
          await expect(
            BigBoyTableDeployer.reportWinners(1, [gamer1], [gamer1, gamer1, gamer1, gamer1])
          ).to.be.revertedWith('BBT: invalid number of players')
        });

        it('reverts if one reported player is not among participants', async function() {
          const w = new ethers.Wallet.createRandom();
          await expect(
            BigBoyTableDeployer.reportWinners(1, [gamer1], [gamer1, gamer2, w.address])
          ).to.be.revertedWith('BBT: one or more of reported players are not participant')
        });
        
      });


      describe.skip('emergencyUnstake', function() {
        let balanceBeforeGamer1; 
        let balanceBeforeGamer2; 
        let totalStakeBefore;
        let lockedAtBefore;
        let createdAtBefore;
        let participantCountBefore;
        beforeEach(async function () {
          await BigBoyTableDeployer.createRoom(
            minParticipants,
            minStakeSNK,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(1);
          balanceBeforeGamer1 = await SkillTokenDeployer.balanceOf(gamer1);
          balanceBeforeGamer2 = await SkillTokenDeployer.balanceOf(gamer2);
          await BigBoyTableGamer1.stakeSNK(1);
          await BigBoyTableGamer2.stakeSNK(1);
          const activeRoomsBefore = await BigBoyTableDeployer.getActiveRooms(0,1);
          ({ 
            totalStake: totalStakeBefore,
            lockedAt: lockedAtBefore,
            createdAt: createdAtBefore,
            participantCount: participantCountBefore
          } = activeRoomsBefore[0]);
          expect(lockedAtBefore).gt(0);
          expect(totalStakeBefore).gt(0);
          expect(participantCountBefore).gt(0);
        });

        it('returns SNK stakes to stakers while room is active', async function() {
          await BigBoyTableDeployer.emergencyUnstake(1);
          const balanceAfterGamer1 = await SkillTokenDeployer.balanceOf(gamer1);
          const balanceAfterGamer2 = await SkillTokenDeployer.balanceOf(gamer2);
          expect(balanceBeforeGamer1).eq(balanceAfterGamer1);
          expect(balanceBeforeGamer2).eq(balanceAfterGamer2);
        });

        it('resets room creation time to the time of the function call', async function() {
          await network.provider.send("evm_increaseTime", [60]); // wait 60 sec
          await network.provider.send("evm_mine");
          await BigBoyTableDeployer.emergencyUnstake(1);
          const activeRoomsAfter = await BigBoyTableDeployer.getActiveRooms(0,1);
          const {createdAt: createdAtAfter } = activeRoomsAfter[0];
          expect(createdAtBefore).lt(createdAtAfter);
        });

        it('resets room lock time to 0 (unlocks room)', async function() {
          await BigBoyTableDeployer.emergencyUnstake(1);
          const activeRoomsAfter = await BigBoyTableDeployer.getActiveRooms(0,1);
          const {lockedAt: lockedAtAfter } = activeRoomsAfter[0];
          expect(lockedAtAfter).eq(0);
        });

        it('resets total stake to 0', async function() {
          await BigBoyTableDeployer.emergencyUnstake(1);
          const activeRoomsAfter = await BigBoyTableDeployer.getActiveRooms(0,1);
          const {totalStake: totalStakeAfter } = activeRoomsAfter[0];
          expect(totalStakeAfter).eq(0);
        });

        it('resets participant count to 0', async function() {
          await BigBoyTableDeployer.emergencyUnstake(1);
          const activeRoomsAfter = await BigBoyTableDeployer.getActiveRooms(0,1);
          const {participantCount: participantCountAfter } = activeRoomsAfter[0];
          expect(participantCountAfter).eq(0);
        });

        it('allows owner to relock the room and gamers to rejoin the room', async function() {
          await BigBoyTableDeployer.emergencyUnstake(1);
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.stakeSNK(1);
          await BigBoyTableGamer2.stakeSNK(1);
        });

        it('reverts when called by user without required role', async function() {
          await expect(
            BigBoyTableGamer1.emergencyUnstake(1)
          ).to.be.reverted;
        });

      });


      describe('stakeSNK()', function() {
        beforeEach(async function() {
          await BigBoyTableDeployer.createRoom(
            minParticipants,
            minStakeSNK,
            false,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
        });

        it('reverts on non-locked room', async function(){
          await expect(
            BigBoyTableDeployer.stakeSNK(1)
          ).to.revertedWith('BBT: room is not locked');
        });

        it('reverts being called after staking window closes', async function() {
          await BigBoyTableDeployer.lockRoom(1);
          await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
          await network.provider.send("evm_mine");
          await expect(
            BigBoyTableGamer1.stakeSNK(1)
          ).to.be.revertedWith('BBT: staking window closed');
        });

        it('reverts if staking participant is more than allowed', async function() {
          await BigBoyTableDeployer.lockRoom(1);
          await BigBoyTableGamer1.stakeSNK(1);
          await BigBoyTableGamer2.stakeSNK(1);
          await expect(
            BigBoyTableDeployer.stakeSNK(1)
          ).to.be.revertedWith('BBT: no more participants possible');
        });

        it('reverts being called on native room', async function() {
          await BigBoyTableDeployer.createRoom(
            minParticipants,
            minStakeNative,
            true,
            roomMode,
            pwdRef,
            collectionId,
            rounds
          );
          await BigBoyTableDeployer.lockRoom(2);
          await expect(
            BigBoyTableGamer1.stakeSNK(2)
          ).to.be.revertedWith('BBT: stakes should be in native currency');
        })
      });
    });
  });

  describe('Active and finished room order', function() {
    it('when 3 rooms are created, then 2nd room is finished', async function() {
      const maxParticipantCount = 2;
      const requiredStakeAmount = await BigBoyTableDeployer.getMinimalStakeInSNK();
      const isStakeInNativeCurrency = false;
      const roomMode = 0;
      for (let i=1; i<=3; i++) {
        await BigBoyTableDeployer.createRoom(
          maxParticipantCount,
          requiredStakeAmount,
          isStakeInNativeCurrency,
          roomMode,
          pwdRef,
          collectionId,
          rounds
        );
        await BigBoyTableDeployer.lockRoom(i);
        await BigBoyTableGamer1.stakeSNK(i);
        await BigBoyTableGamer2.stakeSNK(i);
      }
      const stakingWindowInSeconds = await BigBoyTableDeployer.getStakingWindowInSeconds();
      await network.provider.send("evm_increaseTime", [stakingWindowInSeconds.toNumber()]);
      await network.provider.send("evm_mine");
      await BigBoyTableDeployer.reportWinners(2,[gamer1], [gamer1, gamer2]);
      const activeRoomsCount = await BigBoyTableDeployer.getActiveRoomCount();
      expect(activeRoomsCount).eq(2);
      const activeRooms = await BigBoyTableDeployer.getActiveRooms(0,activeRoomsCount);
      expect(activeRooms.map(room=>room.id.toNumber())).to.include.ordered.members([1,3]);

      const finishedRoomCount = await BigBoyTableDeployer.getFinishedRoomCount();
      expect(finishedRoomCount).eq(1);

      const [finishedRoom] = await BigBoyTableDeployer.getFinishedRooms(0,finishedRoomCount);
      expect(finishedRoom.id).eq(2);
    });
  });

  describe("Unit conversions", function() {
    const usdcUnits = PU("1", "mwei");
    const snkUnits = PU("1", "ether");
    const nativeUnits = PU("1", "ether"); // ethereum compatible networks
    let roomCreationPriceInUSDC;
    let minimalStakeInUSDC;
    let SNKPriceInUSDC;
  
    before(async function() {
      roomCreationPriceInUSDC = await BigBoyTableDeployer.getRoomCreationPriceInUSDC();
      minimalStakeInUSDC = await BigBoyTableDeployer.getMinimalStakeInUSDC();
      SNKPriceInUSDC = snookPriceInSNK.mul(25).div(100).mul(usdcUnits).div(snkUnits);
    });

    it('convert room creation price from USDC to SNK', async function() {
      const roomCreationPriceInSNK = await BigBoyTableDeployer.getRoomCreationPriceInSNK();
      const expectedRoomCreationPriceInSNK = roomCreationPriceInUSDC.div(SNKPriceInUSDC).mul(snkUnits);
      expect(roomCreationPriceInSNK).eq(expectedRoomCreationPriceInSNK);
    });

    it('convert minimal stake from USDC to Native', async function() {
      const minimalStakeInNative = await BigBoyTableDeployer.getMinimalStakeInNative();
      const [numerator, denominator] = await BigBoyTableDeployer.getNative2USDCRatioInEtherUnits();
      const expectedRoomCreationPriceInNative = minimalStakeInUSDC
        .mul(numerator).div(denominator).div(usdcUnits).mul(nativeUnits);
      expect(minimalStakeInNative).eq(expectedRoomCreationPriceInNative);
    });

    it('convert minimal stale from USDC to SNK', async function() {
      const minimalStakeInSNK = await BigBoyTableDeployer.getMinimalStakeInSNK();
      const expectedMinimalStakeInSNK = minimalStakeInUSDC.div(SNKPriceInUSDC).mul(snkUnits);
      expect(minimalStakeInSNK).eq(expectedMinimalStakeInSNK);
    });
  });

  
});