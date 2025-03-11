const VoteSure = artifacts.require("VoteSure");
const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network, accounts) {
  // Deploy the contract
  await deployer.deploy(VoteSure);
  const voteSure = await VoteSure.deployed();
  
  console.log(`VoteSure contract deployed at: ${voteSure.address}`);
  
  // Save deployment info to a file
  const deploymentInfo = {
    address: voteSure.address,
    abi: voteSure.abi,
    network: network,
    deployer: accounts[0]
  };
  
  const deploymentPath = path.join(__dirname, '../deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`Deployment information saved to: ${deploymentPath}`);
}; 