const VoteSureV2 = artifacts.require("VoteSureV2");
const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network, accounts) {
  // Deploy the contract
  await deployer.deploy(VoteSureV2);
  const voteSureV2 = await VoteSureV2.deployed();
  
  console.log(`VoteSureV2 contract deployed at: ${voteSureV2.address}`);
  
  // Save deployment info to a file
  const deploymentInfo = {
    address: voteSureV2.address,
    abi: voteSureV2.abi,
    network: network,
    deployer: accounts[0]
  };
  
  const deploymentPath = path.join(__dirname, '../deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`Deployment information saved to: ${deploymentPath}`);
}; 