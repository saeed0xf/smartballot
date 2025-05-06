const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  // Connect to the local Ethereum network (Ganache)
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:7545');
  
  // Admin wallet (using the provided private key)
  const privateKey = '0x10cad5763124cef978bf07e4bedfbc13a13bae80868a642abe8750e1d8b2e5aa';
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('Deploying contracts with the account:', wallet.address);
  
  // Read the compiled contract artifact
  const contractPath = path.join(__dirname, '../build/contracts/VoteSureV2.json');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  // Create a contract factory
  const contractFactory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.bytecode,
    wallet
  );
  
  // Deploy the contract
  const contract = await contractFactory.deploy();
  await contract.deployed();
  
  console.log('VoteSureV2 contract deployed to:', contract.address);
  
  // Save the contract address and ABI to a file for easy access
  const deploymentInfo = {
    address: contract.address,
    abi: contractJson.abi,
    network: 'ganache',
    deployer: wallet.address
  };
  
  const deploymentPath = path.join(__dirname, '../deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('Deployment information saved to:', deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  }); 