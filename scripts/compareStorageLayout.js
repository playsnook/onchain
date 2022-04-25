const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const _ = require('lodash');
const network = 'polygon';
const deploymentBeforeUpgrade = path.resolve(`./deployments_before`, network); // A
const deploymentAfterUpgrade = path.resolve(`./deployments_after`, network); // B

/*
  
1. Take X_Implementation.json from folder A.
2. Search for X_Implementation.json from folder B.
3. If not found in folder B, throw error.
4. Open X_Implementation.json from both folders and parse it. 
5. Take the same labels from two files and compare type, slot and offset.
6. In case of differences, report. 
*/

async function main() {

  console.log(`deploymentsBefore: ${deploymentBeforeUpgrade}`);
  console.log(`deploymentsAfter: ${deploymentAfterUpgrade}`);
  const filesBeforeUpgrade = [... await fs.readdir(deploymentBeforeUpgrade)]
    .filter(f=>f.match(/_Implementation/));
  const filesAfterUpgrade = [... await fs.readdir(deploymentAfterUpgrade)]
    .filter(f=>f.match(/_Implementation/));
 
  const filesDiff = _.difference(filesAfterUpgrade, filesBeforeUpgrade);
  if (filesDiff.length > 0) {
    console.log(`Files in both folders are different: ${JSON.stringify(filesDiff, null,2)}`);
    return 1;
  }
  for (const file of filesBeforeUpgrade) {
    const jsonBeforeUpgrade = await fs.readFile(`${deploymentBeforeUpgrade}/${file}`, {encoding: 'utf8'});
    const jsonAfterUpgrade = await fs.readFile(`${deploymentAfterUpgrade}/${file}`, {encoding: 'utf8'});
    const {storageLayout: {storage: storageBeforeUpgrade}} = JSON.parse(jsonBeforeUpgrade);
    const {storageLayout: {storage: storageAfterUpgrade}} = JSON.parse(jsonAfterUpgrade);
    console.log(`file: ${file} storage lengths: before: ${storageBeforeUpgrade.length} after: ${storageAfterUpgrade.length}`)
    assert(storageAfterUpgrade.length >= storageBeforeUpgrade.length, 'Storage after upgrade is smaller than before');
    const commonLength = _.min([storageBeforeUpgrade.length, storageAfterUpgrade.length]);

    let i;
    for (i=0; i<commonLength; i++) {
      const {
        label: labelBefore,
        slot: slotBefore, 
        offset: offsetBefore, 
        type: typeBefore
      } = storageBeforeUpgrade[i];
      const {
        label: labelAfter, 
        slot: slotAfter,
        offset: offsetAfter,
        type: typeAfter
      } = storageAfterUpgrade[i];
      
      assert(labelBefore===labelAfter, `Different labels: ${labelBefore}, ${labelAfter}`);
      assert(slotBefore===slotAfter, `Different slots: ${slotBefore}, ${slotAfter}`);
      assert(offsetBefore===offsetAfter, `Different offsets: ${offsetBefore}, ${offsetAfter}`);
      //assert(typeBefore===typeAfter, `Different types: ${typeBefore}, ${typeAfter}`);

    }
    
    for (; i<storageAfterUpgrade.length; i++) {
      const {
        label, 
        slot,
        offset,
        type
      } = storageAfterUpgrade[i];
      console.log(`Added fields: label: ${label} slot: ${slot} offset: ${offset} type: ${type}`);
    }
    
  }
}

main();