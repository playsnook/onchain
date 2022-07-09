require('dotenv').config();
const { network: {config: {chainId}} } = require('hardhat');
const { expect } = require("chai");
const {deployments, ethers, getNamedAccounts } = require('hardhat');
const {getEventArgs} = require('../scripts/lib');
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

describe('CollectionList', () => {
  let SkillTokenDeployer;
  let SkillTokenGamer1;
  let SkillTokenGamer2;
  let CollectionListDeployer;
  let CollectionListGamer1;
  let CollectionListGamer2;
  
  let gamer1;
  let gamer2;
  let deployer;
  

  beforeEach(async () => {
    await deployments.fixture(['L2']);
    ({ deployer, gamer1, gamer2 } = await getNamedAccounts());
    SkillTokenDeployer = await ethers.getContract('SkillToken', deployer); 
    SkillTokenGamer1 = await ethers.getContract('SkillToken', gamer1);
    SkillTokenGamer2 = await ethers.getContract('SkillToken', gamer2);
    CollectionListDeployer = await ethers.getContract('CollectionList', deployer);
    CollectionListGamer1 = await ethers.getContract('CollectionList', gamer1);
    CollectionListGamer2 = await ethers.getContract('CollectionList', gamer2);

    // give some SNK to deployer
    await SkillTokenGamer1.transfer(deployer, PU('1000', 'ether'));
    expect(await SkillTokenDeployer.balanceOf(deployer)).eq(PU('1000', 'ether'));
    expect(await SkillTokenDeployer.balanceOf(gamer1)).eq(PU('4000', 'ether'));
    expect(await SkillTokenDeployer.balanceOf(gamer2)).eq(PU('5000', 'ether'));

    await SkillTokenGamer1.approve(CollectionListDeployer.address, MaxUint256);
    await SkillTokenGamer2.approve(CollectionListDeployer.address, MaxUint256);
    await SkillTokenDeployer.approve(CollectionListDeployer.address, MaxUint256);
    
  });
  
  describe('getCollection()', function() {
    const collectionIds = Array(2);
    const nonexistantCollectionId = formatBytes32String(String.fromCharCode(1));
    beforeEach(async ()=>{
      const {collectionId: collectionId1} = await getEventArgs(
        CollectionListDeployer.addCollection(
          "PunkyMonkey1",
          80001,
          SkillTokenDeployer.address,
          PE("100"),
          PE("100"),
          3600,
          10,
          gamer2
        ), 'CollectionAdded');

      const {collectionId: collectionId2} = await getEventArgs(
        CollectionListDeployer.addCollection(
          "PunkyMonkey2",
          80001,
          SkillTokenDeployer.address,
          PE("100"),
          PE("100"),
          3600,
          10,
          gamer2
        ), 'CollectionAdded');
      collectionIds[0] = collectionId1;
      collectionIds[1] = collectionId2;
      expect(collectionIds).not.to.have.members([nonexistantCollectionId]);
    });

    it('reads the first collection', async function() {
      const c = await CollectionListDeployer.getCollection(collectionIds[0]);
      expect(c.id).eq(collectionIds[0]);
    });

    it('reverts on non-existance collection id', async function() {
      await expect(
        CollectionListDeployer.getCollection(nonexistantCollectionId)
      ).to.be.revertedWith('CollectionList: invalid collection id')
    });
  });

  describe('addCollection()', function() {
    it('increases collection count to 1', async function() {
      await CollectionListDeployer.addCollection(
        "PunkyMonkey",
        80001,
        SkillTokenDeployer.address,
        PE("100"),
        PE("100"),
        3600,
        10,
        gamer2
      );

      expect(
        await CollectionListDeployer.getCollectionCount()
      ).eq(1)
    });

    it('reverts being called by non-pauser', async function() {
      await expect(
        CollectionListGamer1.addCollection(
          "PunkyMonkey",
          80001,
          SkillTokenDeployer.address,
          PE("100"),
          PE("100"),
          3600,
          10,
          gamer2
        )
      ).to.be.reverted;
    });

    it('creates a locked, non-active collection with 0 deposited SNK', async function() {
      await CollectionListDeployer.addCollection(
        "PunkyMonkey",
        80001,
        SkillTokenDeployer.address,
        PE("100"),
        PE("100"),
        3600,
        10,
        gamer2
      );
      const startIdx = 0;
      const endIdx = await CollectionListDeployer.getCollectionCount();
      const [collection] = await CollectionListDeployer.getCollections(startIdx,endIdx);
      expect(collection.lockedAt).gt(0);
      expect(collection.active).eq(false);
      expect(collection.depositedSNK).eq(0);
    });
  });
  
  describe('getDepositRecordCount()', function() {
    let accessThresholdInCollectionTokens;
    let activityThresholdInSNK;
    let lockPeriodInSeconds;
    let revshareInPercents;
    let revshareRecipient;
    let chainId;
    let collectionId;
    beforeEach(async function() {
      accessThresholdInCollectionTokens = PE("100");
      activityThresholdInSNK = PE("1000");
      lockPeriodInSeconds = 3600;
      revshareInPercents = 10;
      revshareRecipient = gamer2;
      chainId = 80001;
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
      
    });
    it('returns number of deposits made to collection', async function() {
      await CollectionListGamer2.depositSNK(collectionId, PE('100'));
      await CollectionListGamer1.depositSNK(collectionId, PE('200'));
      expect(
        await CollectionListDeployer.getDepositRecordCount(collectionId)
      ).eq(2);
    });
  });

  describe('removeCollection()', function() {
    const nonexistantCollectionId = formatBytes32String('1');
    describe('when collection is empty', function() {
      it('reverts', async function() {
        await expect(
          CollectionListDeployer.removeCollection(nonexistantCollectionId)
        ).to.be.revertedWith('CollectionList: invalid collection id');
      });
    });

    describe('when collection is not empty', function() {
      let collectionId;
      beforeEach(async function() {
        ({collectionId} = await getEventArgs(
          CollectionListDeployer.addCollection(
            "PunkyMonkey",
            80001,
            SkillTokenDeployer.address,
            PE("100"),
            PE("100"),
            3600,
            10,
            gamer2
          ), 'CollectionAdded')
        );
        expect(await CollectionListDeployer.getCollectionCount()).eq(1);
      });
      
      it('reverts if called on non-existing collection', async function() {
        await expect(
          CollectionListDeployer.removeCollection(nonexistantCollectionId)
        ).to.be.revertedWith('CollectionList: invalid collection id');
      });

      it('reverts if called by non-pauser', async function() {
        await expect(
          CollectionListGamer1.removeCollection(collectionId)
        ).to.be.reverted;
      });

      it('removes collection with valid id when no deposits are done', async function() {
        await CollectionListDeployer.removeCollection(collectionId);
        expect(await CollectionListDeployer.getCollectionCount()).eq(0);
      });

      it('reverts if collection has deposits', async function() {
        await CollectionListGamer1.depositSNK(collectionId,PE("100"));
        await expect(
          CollectionListDeployer.removeCollection(collectionId)
        ).to.be.revertedWith('CollectionList: release deposits first');
      });
    }); 

  });

  describe('toggleDespositAccepting()', function() {
    let accessThresholdInCollectionTokens;
    let activityThresholdInSNK;
    let lockPeriodInSeconds;
    let revshareInPercents;
    let revshareRecipient;
    let chainId;
    let collectionId;
    beforeEach(async function() {
      accessThresholdInCollectionTokens = PE("100");
      activityThresholdInSNK = PE("1000");
      lockPeriodInSeconds = 3600;
      revshareInPercents = 10;
      revshareRecipient = gamer2;
      chainId = 80001;
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
        ), "CollectionAdded")
      );
      await CollectionListGamer1.depositSNK(collectionId, PE('100'));
      await CollectionListGamer2.depositSNK(collectionId, PE('200'));
      expect(await CollectionListDeployer.getCollectionCount()).eq(1);
      expect(await CollectionListDeployer.getDepositRecordCount(collectionId)).eq(2);
    });
    it('makes created collection to refuse accepting deposits anymore', async function() {
      await CollectionListDeployer.toggleDepositAccepting(collectionId);
      await expect(
        CollectionListGamer1.depositSNK(collectionId,PE("100"))
      ).to.be.revertedWith("CollectionList: deposits disabled");
    });
  });

  describe('releaseDeposits()', function() {
    let accessThresholdInCollectionTokens;
    let activityThresholdInSNK;
    let lockPeriodInSeconds;
    let revshareInPercents;
    let revshareRecipient;
    let chainId;
    let gamer1Deposit = PE('100');
    let gamer2Deposit = PE('200');
    let collectionId;
    beforeEach(async function() {
      accessThresholdInCollectionTokens = PE("100");
      activityThresholdInSNK = PE("1000");
      lockPeriodInSeconds = 3600;
      revshareInPercents = 10;
      revshareRecipient = gamer2;
      chainId = 80001;
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
        ), "CollectionAdded")
      );
      await CollectionListGamer1.depositSNK(collectionId, gamer1Deposit);
      await CollectionListGamer2.depositSNK(collectionId, gamer2Deposit);
      expect(await CollectionListDeployer.getCollectionCount()).eq(1);
      expect(await CollectionListDeployer.getDepositRecordCount(collectionId)).eq(2);
    });
    it('fails if collection can accept deposits', async function() {
      const count = await CollectionListDeployer.getDepositRecordCount(collectionId);
      await expect(
        CollectionListDeployer.releaseDeposits(collectionId,count)
      ).to.be.revertedWith('CollectionList: depositing should be disabled');
    });
    it('releases deposits when collection is disabled from accepting deposits', async function() {
      const balanceAfterGettingDeposits = await SkillTokenDeployer.balanceOf(CollectionListDeployer.address);
      expect(balanceAfterGettingDeposits).eq(gamer1Deposit.add(gamer2Deposit));
      await CollectionListDeployer.toggleDepositAccepting(collectionId);
      const gamer1balance1 = await SkillTokenDeployer.balanceOf(gamer1);
      const gamer2balance1 = await SkillTokenDeployer.balanceOf(gamer2);
      const count = await CollectionListDeployer.getDepositRecordCount(collectionId);
      await expect(
        CollectionListDeployer.releaseDeposits(collectionId,count)
      ).to.emit(CollectionListDeployer, 'DepositsReleased').withArgs(collectionId,count,0);
      const balanceAfterReleasingDeposits = await SkillTokenDeployer.balanceOf(CollectionListDeployer.address);
      expect(balanceAfterReleasingDeposits).eq(0);
      const gamer1balance2 = await SkillTokenDeployer.balanceOf(gamer1);
      const gamer2balance2 = await SkillTokenDeployer.balanceOf(gamer2);
      expect(gamer1balance2).eq(gamer1balance1.add(gamer1Deposit));
      expect(gamer2balance2).eq(gamer2balance1.add(gamer2Deposit));
    });
  });

  describe('Collection removal procedure', function() {
    let accessThresholdInCollectionTokens;
    let activityThresholdInSNK;
    let lockPeriodInSeconds;
    let revshareInPercents;
    let revshareRecipient;
    let chainId;
    let collectionId;
    beforeEach(async function() {
      accessThresholdInCollectionTokens = PE("100");
      activityThresholdInSNK = PE("1000");
      lockPeriodInSeconds = 3600;
      revshareInPercents = 10;
      revshareRecipient = gamer2;
      chainId = 80001;
      ({ collectionId } = await getEventArgs(
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

      await CollectionListGamer1.depositSNK(collectionId, PE('100'));
      await CollectionListGamer2.depositSNK(collectionId, PE('200'));
      expect(await CollectionListDeployer.getCollectionCount()).eq(1);
      expect(await CollectionListDeployer.getDepositRecordCount(collectionId)).eq(2);
    });

    it('removes collection', async function() {
      await CollectionListDeployer.toggleDepositAccepting(collectionId);
      const count = await CollectionListDeployer.getDepositRecordCount(collectionId);
      await expect(
        CollectionListDeployer.releaseDeposits(collectionId,count)
      ).to.emit(CollectionListDeployer, 'DepositsReleased').withArgs(collectionId,2,0);

      expect(
        await CollectionListDeployer.getDepositRecordCount(collectionId)
      ).eq(0);

      await expect(
        CollectionListDeployer.removeCollection(collectionId)
      ).to.emit(CollectionListDeployer, "CollectionRemoved").withArgs(collectionId);

      expect(
        await CollectionListDeployer.getCollectionCount()
      ).eq(0)

    });
    
  });

  describe('getCollections()', function() {
    describe('when there is 10 collections', function() {
      const N=10;
      const collectionIds = Array(N);
      beforeEach(async function() {
        for (let i=0; i<N; i++) {
          ({collectionId} = await getEventArgs(
            CollectionListDeployer.addCollection(
            `PunkyMonkey${i}`,
            80001,
            SkillTokenDeployer.address,
            PE("100"),
            PE("100"),
            3600,
            10,
            gamer2
          ), 'CollectionAdded'));
          collectionIds[i] = collectionId;
        }
        expect(await CollectionListDeployer.getCollectionCount()).eq(N);
      });

      it('returns subarray of collections between startIdx and endIdx ', async function() {
        const slice = await CollectionListDeployer.getCollections(0,2);
        expect(slice.map(s=>s.id)).to.have.members(collectionIds.slice(0,2));
      });

    });
  });

  describe('collection activation', function() {
    let accessThresholdInCollectionTokens;
    let activityThresholdInSNK;
    let lockPeriodInSeconds;
    let revshareInPercents;
    let revshareRecipient;
    let collectionId;
    const chainId = 80001;
    beforeEach(async function() {
      accessThresholdInCollectionTokens = PE("100");
      activityThresholdInSNK = PE("1000");
      lockPeriodInSeconds = 3600;
      revshareInPercents = 10;
      revshareRecipient = gamer2;
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
        ),'CollectionAdded')
      );
      expect(await CollectionListDeployer.getCollectionCount()).eq(1);
    });

    it('collection is not activated if deposited amount is less than threshold', async function() {
      await CollectionListGamer1.depositSNK(collectionId,activityThresholdInSNK.div(2));
      expect(await CollectionListDeployer.isActive(collectionId)).eq(false);
    });

    it('collection is activated if deposited amount is more or equal to threshold', async function() {
      await CollectionListGamer1.depositSNK(collectionId,activityThresholdInSNK);
      expect(await CollectionListDeployer.isActive(collectionId)).eq(true);
    });
  });

  describe('collection deactivation', function() {
    let accessThresholdInCollectionTokens ;
    let activityThresholdInSNK;
    let lockPeriodInSeconds;
    let revshareInPercents;
    let revshareRecipient;
    let collectionId;
    const chainId = 80001;
    beforeEach(async function() {
      accessThresholdInCollectionTokens = PE("100");
      activityThresholdInSNK = PE("1000");
      lockPeriodInSeconds = 3600;
      revshareInPercents = 10;
      revshareRecipient = gamer2;
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
        ),
        'CollectionAdded'
      ));
      
      await CollectionListGamer1.depositSNK(collectionId,activityThresholdInSNK);  
      expect(await CollectionListDeployer.isActive(collectionId)).eq(true);
    });

    it('deactivation is impossible because user cannot withdraw deposit', async function() {
      await expect(
        CollectionListGamer1.withdrawSNK(collectionId)
      ).to.be.revertedWith('CollectionList: funds are locked');
    });

    it('collection is deactivated when withdrawal decreases deposit under threshold', async function() {
      await network.provider.send("evm_increaseTime", [lockPeriodInSeconds]);
      await network.provider.send("evm_mine");
      await CollectionListGamer1.withdrawSNK(collectionId);
      expect(await CollectionListDeployer.isActive(collectionId)).eq(false);
    });
  });

});