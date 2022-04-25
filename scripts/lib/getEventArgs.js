// used in tests

const { assert } = require("chai");

async function getEventArgs(contractPromise, eventName) {
  const tx = await contractPromise;
  const receipt = await tx.wait(1);
  assert(receipt.events !== undefined, 'No events in receipt');
  const event = receipt.events.find((e) => e.event === eventName);
  assert(event !== undefined, `Event ${eventName} is not found`);
  return event.args;
}

module.exports = getEventArgs;