async function getGasFees() {
  const { baseFeePerGas } = await provider.getBlock(-1);
  const maxPriorityFeePerGas = PU('30', 'gwei');
  const maxFeePerGas = baseFeePerGas.add(maxPriorityFeePerGas);
  return { maxPriorityFeePerGas, maxFeePerGas };
}

module.exports = getGasFees;