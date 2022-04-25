require('dotenv').config();
module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('SkillTokenL1', {
    from: deployer,
    gasLimit: 4_000_000,
    args: [
      process.env.SKILL_TOKEN_L1_NAME,
      process.env.SKILL_TOKEN_L1_SYMBOL
    ],
    log: true,
  });
};
module.exports.tags = ['L1'];