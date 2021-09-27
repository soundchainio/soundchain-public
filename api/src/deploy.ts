import hre from 'hardhat';

const main = async () => {
  const factory = await hre.ethers.getContractFactory('SoundchainCollectible');

  // Start deployment, returning a promise that resolves to a contract object
  const contract = await factory.deploy();
  console.log('Contract deployed to address:', contract.address);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
