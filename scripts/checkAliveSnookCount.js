async function main() {
  const { deployer } = await ethers.getNamedSigners();
  const SnookToken = await ethers.getContract('SnookToken');
  const Afterdeath = await ethers.getContract('Afterdeath');
  const aliveSnookCount = await Afterdeath.getAliveSnookCount();
  console.log('aliveSnookCount:', aliveSnookCount.toString());
  const totalSupply = await SnookToken.totalSupply();
  console.log('totalSupply:', totalSupply.toString());
  const morgueLength = await Afterdeath.getMorgueLength();
  console.log('Morgue length:', morgueLength.toString());
  const removedFromMorgueLength = await Afterdeath.getRemovedFromMorgueLength();
  console.log('Removed from morgue length:', removedFromMorgueLength.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.  
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
