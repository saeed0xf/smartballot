const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Connect to the local Ethereum network (Ganache)
const provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545');

// Admin wallet (using the provided private key)
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
let adminWallet = null;

// Try to create admin wallet if private key is available
if (adminPrivateKey) {
  try {
    adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    console.log(`Admin wallet connected: ${adminWallet.address}`);
  } catch (error) {
    console.error('Error creating admin wallet:', error.message);
  }
}

// Load deployment information if available
let deploymentInfo = null;
let voteSureContract = null;

try {
  // First try to load from deployment.json
  const deploymentPath = path.join(__dirname, '../../../blockchain/deployment.json');
  if (fs.existsSync(deploymentPath)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log(`Loaded contract info from deployment.json: ${deploymentInfo.address}`);
  } else {
    console.log('Deployment file not found. Will try to use environment variables.');
  }
  
  // If we have a contract address in .env, use that (it overrides deployment.json)
  if (process.env.CONTRACT_ADDRESS) {
    // If we already have deploymentInfo but with a different address, update it
    if (deploymentInfo) {
      console.log(`Overriding address from deployment.json with .env CONTRACT_ADDRESS: ${process.env.CONTRACT_ADDRESS}`);
      deploymentInfo.address = process.env.CONTRACT_ADDRESS;
    } 
    // If we don't have deploymentInfo but have CONTRACT_ADDRESS and CONTRACT_ABI, create it
    else if (process.env.CONTRACT_ABI) {
      try {
        const abiString = process.env.CONTRACT_ABI;
        const abiObject = JSON.parse(abiString);
        deploymentInfo = {
          address: process.env.CONTRACT_ADDRESS,
          abi: abiObject
        };
        console.log(`Created deployment info from environment variables, address: ${deploymentInfo.address}`);
      } catch (abiParseError) {
        console.error('Error parsing CONTRACT_ABI from environment:', abiParseError.message);
      }
    }
    // If we have CONTRACT_ADDRESS but not ABI, still need to load it from somewhere
    else {
      console.warn('CONTRACT_ADDRESS provided but no CONTRACT_ABI found. Will try to use default ABI.');
      
      // Try to load the ABI from the VoteSure.json file
      const abiPath = path.join(__dirname, '../../../blockchain/build/contracts/VoteSure.json');
      if (fs.existsSync(abiPath)) {
        const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        deploymentInfo = {
          address: process.env.CONTRACT_ADDRESS,
          abi: contractJson.abi
        };
        console.log(`Created deployment info with address from .env and ABI from build file: ${deploymentInfo.address}`);
      } else {
        console.error('No ABI found in build files. Contract functions will be unavailable.');
      }
    }
  }
  
  // Create contract instance if admin wallet and deployment info are available
  if (adminWallet && deploymentInfo && deploymentInfo.abi && deploymentInfo.address) {
    voteSureContract = new ethers.Contract(
      deploymentInfo.address,
      deploymentInfo.abi,
      adminWallet
    );
    console.log(`Contract connected at address: ${deploymentInfo.address}`);
  } else {
    console.log('Contract instance could not be created. Check that you have:');
    console.log('1. A valid ADMIN_PRIVATE_KEY in .env');
    console.log('2. Either a valid deployment.json file or CONTRACT_ADDRESS and CONTRACT_ABI in .env');
  }
} catch (error) {
  console.error('Error loading deployment info:', error.message);
}

// Register voter on blockchain
const registerVoterOnBlockchain = async (voterAddress) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const tx = await voteSureContract.registerVoter(voterAddress);
    const receipt = await tx.wait();
    
    console.log(`Voter registered on blockchain: ${voterAddress}`);
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error('Error registering voter on blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// Approve voter on blockchain
const approveVoterOnBlockchain = async (voterAddress, options = {}) => {
  try {
    if (!voteSureContract) {
      console.error('Contract not initialized when approving voter');
      return { success: false, error: 'Contract not initialized' };
    }
    
    console.log(`Attempting to approve voter on blockchain: ${voterAddress}`);
    console.log('Options:', options);
    
    // If useMetaMask is true, then we should delegate the transaction
    // to the frontend. Just validate and return instructions.
    if (options.useMetaMask === true) {
      console.log('Using MetaMask for transaction...');
      
      // Validate address format
      if (!voterAddress || typeof voterAddress !== 'string' || !voterAddress.startsWith('0x')) {
        console.error(`Invalid wallet address format: ${voterAddress}`);
        return { success: false, error: 'Invalid wallet address format' };
      }
      
      // Return special response for MetaMask
      return { 
        success: true, 
        useMetaMask: true,
        contractAddress: deploymentInfo.address,
        methodName: 'approveVoter',
        params: [voterAddress],
        message: 'Please confirm the transaction in MetaMask to approve this voter'
      };
    }
    
    // Traditional server-side transaction flow
    if (!adminWallet) {
      console.error('Admin wallet not initialized when approving voter');
      return { success: false, error: 'Admin wallet not initialized. Check ADMIN_PRIVATE_KEY in .env file.' };
    }
    
    // Validate address format
    if (!voterAddress || typeof voterAddress !== 'string' || !voterAddress.startsWith('0x')) {
      console.error(`Invalid wallet address format: ${voterAddress}`);
      return { success: false, error: 'Invalid wallet address format' };
    }
    
    console.log(`Using admin wallet ${adminWallet.address} to approve voter ${voterAddress}`);
    
    try {
      // First check if voter is already registered in the contract
      let isRegistered = false;
      try {
        isRegistered = await voteSureContract.isVoterRegistered(voterAddress);
        console.log(`Voter registered status check: ${isRegistered}`);
      } catch (checkError) {
        console.warn(`Could not check if voter is registered: ${checkError.message}`);
        // Continue despite the check error
      }
      
      // If not registered, try to register first
      if (!isRegistered) {
        try {
          console.log(`Voter not registered, attempting to register first: ${voterAddress}`);
          const regTx = await voteSureContract.registerVoter(voterAddress);
          const regReceipt = await regTx.wait();
          console.log(`Voter registered first, hash: ${regReceipt.transactionHash}`);
        } catch (regError) {
          console.warn(`Could not register voter first (may already be registered): ${regError.message}`);
          // Continue anyway, as the voter might actually be registered
        }
      }
      
      // Now attempt to approve
      const tx = await voteSureContract.approveVoter(voterAddress);
      console.log(`Approval transaction submitted, hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      console.log(`Voter approved on blockchain: ${voterAddress}`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      return { success: true, txHash: receipt.transactionHash };
    } catch (txError) {
      console.error('Transaction error when approving voter:', txError);
      return { 
        success: false, 
        error: `Transaction failed: ${txError.message}`,
        details: txError.toString()
      };
    }
  } catch (error) {
    console.error('Error approving voter on blockchain:', error.message);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
};

// Reject voter on blockchain - this function now only simulates the process
// We don't actually register rejections on the blockchain as per requirements
const rejectVoterOnBlockchain = async (voterAddress) => {
  try {
    // We don't actually need to call the blockchain for rejections
    // Just log the information and return a successful result
    console.log(`Simulating rejection of voter on blockchain: ${voterAddress}`);
    console.log('Voter rejections are not recorded on the blockchain');
    
    // Return a simulated successful response
    return { 
      success: true, 
      txHash: `simulated-rejection-${Date.now()}`,
      note: 'This is a simulated rejection - not recorded on blockchain'
    };
  } catch (error) {
    console.error('Error in rejection simulation:', error.message);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack
    };
  }
};

// Add candidate on blockchain
const addCandidateOnBlockchain = async (name, party, slogan) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const tx = await voteSureContract.addCandidate(name, party, slogan);
    const receipt = await tx.wait();
    
    // Get the candidate ID from the event
    const event = receipt.events.find(e => e.event === 'CandidateAdded');
    const candidateId = event.args.candidateId.toNumber();
    
    console.log(`Candidate added on blockchain: ${name} (${party}), ID: ${candidateId}`);
    return { success: true, txHash: receipt.transactionHash, candidateId };
  } catch (error) {
    console.error('Error adding candidate on blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// Start election on blockchain
const startElectionOnBlockchain = async (electionId, electionName, candidateIds, candidateNames, signer = null) => {
  try {
    console.log('Attempting to start election on blockchain...');
    console.log(`Election ID: ${electionId}, Name: ${electionName}`);
    console.log(`Candidates (${candidateIds.length}): ${candidateNames.join(', ')}`);
    
    // Get contract instance
    const voteSureContract = await getVoteSureContract(signer);
    
    // Try to start the election
    let tx;
    
    if (signer) {
      console.log('Using MetaMask for transaction signing');
      tx = await voteSureContract.startElection();
    } else {
      console.log('Using standard ethers.js contract call to start election');
      tx = await voteSureContract.startElection();
    }
    
    // Wait for transaction to be mined
    console.log('Waiting for transaction to be mined...');
    const receipt = await tx.wait();
    console.log('Election started on blockchain with transaction:', receipt.transactionHash);
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error starting election on blockchain:', error, 'tx=', error.transaction, 'code=', error.code);
    
    // Check if the error message indicates the election is already started
    const errorMsg = error.message ? error.message.toLowerCase() : '';
    const errorReason = error.reason ? error.reason.toLowerCase() : '';
    const errorData = error.error?.data || {};
    const revertReason = errorData.reason ? errorData.reason.toLowerCase() : '';
    
    // Look for specific error messages indicating the election is already started
    const alreadyStartedPatterns = [
      'election already started',
      'already started',
      'active'
    ];
    
    // Check if any of these patterns appear in various error fields
    const isAlreadyStartedError = alreadyStartedPatterns.some(pattern => 
      errorMsg.includes(pattern) || 
      errorReason.includes(pattern) || 
      revertReason.includes(pattern) ||
      (error.error?.message && error.error.message.toLowerCase().includes(pattern))
    );
    
    if (isAlreadyStartedError) {
      console.log('Election is already started on blockchain - treating as success');
      return {
        success: true,
        alreadyStarted: true,
        message: 'Election was already started on blockchain'
      };
    }
    
    return {
      success: false,
      error: error.reason || error.message || 'Unknown blockchain error'
    };
  }
};

// End election on blockchain
const endElectionOnBlockchain = async (signer = null) => {
  try {
    console.log('Attempting to end election on blockchain...');
    
    // Get contract instance
    const voteSureContract = await getVoteSureContract(signer);
    
    // Try to end the election
    let tx;
    
    if (signer) {
      console.log('Using MetaMask for transaction signing');
      tx = await voteSureContract.endElection();
    } else {
      console.log('Using standard ethers.js contract call to end election');
      tx = await voteSureContract.endElection();
    }
    
    // Wait for transaction to be mined
    console.log('Waiting for transaction to be mined...');
    const receipt = await tx.wait();
    console.log('Election ended on blockchain with transaction:', receipt.transactionHash);
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error ending election on blockchain:', error, 'tx=', error.transaction, 'code=', error.code);
    
    // Check if the error message indicates the election is already ended
    const errorMsg = error.message ? error.message.toLowerCase() : '';
    const errorReason = error.reason ? error.reason.toLowerCase() : '';
    const errorData = error.error?.data || {};
    const revertReason = errorData.reason ? errorData.reason.toLowerCase() : '';
    
    // Look for specific error messages indicating the election is already ended
    const alreadyEndedPatterns = [
      'election already ended',
      'already ended',
      'not active'
    ];
    
    // Check if any of these patterns appear in various error fields
    const isAlreadyEndedError = alreadyEndedPatterns.some(pattern => 
      errorMsg.includes(pattern) || 
      errorReason.includes(pattern) || 
      revertReason.includes(pattern) ||
      (error.error?.message && error.error.message.toLowerCase().includes(pattern))
    );
    
    if (isAlreadyEndedError) {
      console.log('Election is already ended on blockchain - treating as success');
      return {
        success: true,
        alreadyEnded: true,
        message: 'Election was already ended on blockchain'
      };
    }
    
    return {
      success: false,
      error: error.reason || error.message || 'Unknown blockchain error'
    };
  }
};

// Cast vote on blockchain
const castVoteOnBlockchain = async (voterPrivateKey, candidateId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // Create voter wallet
    const voterWallet = new ethers.Wallet(voterPrivateKey, provider);
    
    // Connect voter to contract
    const voterContract = voteSureContract.connect(voterWallet);
    
    // Cast vote
    const tx = await voterContract.castVote(candidateId);
    const receipt = await tx.wait();
    
    console.log(`Vote cast on blockchain by ${voterWallet.address} for candidate ${candidateId}`);
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error('Error casting vote on blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// Get voter status from blockchain
const getVoterStatusFromBlockchain = async (voterAddress) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const status = await voteSureContract.getVoterStatus(voterAddress);
    
    return {
      success: true,
      data: {
        isRegistered: status[0],
        isApproved: status[1],
        hasVoted: status[2],
        votedCandidateId: status[3].toNumber()
      }
    };
  } catch (error) {
    console.error('Error getting voter status from blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// Get candidate details from blockchain
const getCandidateFromBlockchain = async (candidateId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const candidate = await voteSureContract.getCandidate(candidateId);
    
    return {
      success: true,
      data: {
        id: candidate[0].toNumber(),
        name: candidate[1],
        party: candidate[2],
        slogan: candidate[3],
        voteCount: candidate[4].toNumber()
      }
    };
  } catch (error) {
    console.error('Error getting candidate from blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// Get election status from blockchain
const getElectionStatusFromBlockchain = async () => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const status = await voteSureContract.getElectionStatus();
    
    return {
      success: true,
      data: {
        started: status[0],
        ended: status[1],
        totalCandidates: status[2].toNumber(),
        totalApprovedVoters: status[3].toNumber(),
        totalVotes: status[4].toNumber()
      }
    };
  } catch (error) {
    console.error('Error getting election status from blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// Update contract instance with new deployment info
const updateContractInstance = (address, abi) => {
  try {
    if (!adminWallet) {
      return { success: false, error: 'Admin wallet not initialized' };
    }
    
    voteSureContract = new ethers.Contract(address, abi, adminWallet);
    console.log(`Contract updated at address: ${address}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating contract instance:', error.message);
    return { success: false, error: error.message };
  }
};

// Helper function to get the contract instance with proper signer
const getVoteSureContract = async (signer = null) => {
  // Check if deployment info is available
  if (!deploymentInfo || !deploymentInfo.abi || !deploymentInfo.address) {
    // Try to refresh deployment info from environment
    if (process.env.CONTRACT_ADDRESS) {
      console.log(`Attempting to use CONTRACT_ADDRESS from .env: ${process.env.CONTRACT_ADDRESS}`);
      
      let abi = null;
      // Try to get ABI from environment or file
      if (process.env.CONTRACT_ABI) {
        try {
          abi = JSON.parse(process.env.CONTRACT_ABI);
        } catch (error) {
          console.error('Error parsing CONTRACT_ABI:', error.message);
        }
      }
      
      // If no ABI from environment, try to load from build file
      if (!abi) {
        try {
          const abiPath = path.join(__dirname, '../../../blockchain/build/contracts/VoteSure.json');
          if (fs.existsSync(abiPath)) {
            const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
            abi = contractJson.abi;
          }
        } catch (error) {
          console.error('Error loading ABI from build file:', error.message);
        }
      }
      
      if (abi) {
        deploymentInfo = {
          address: process.env.CONTRACT_ADDRESS,
          abi: abi
        };
      } else {
        throw new Error('Contract ABI not available. Check CONTRACT_ABI in .env or ensure build files exist.');
      }
    } else {
      throw new Error('Contract deployment information not available');
    }
  }

  // Check if signer is just an address string
  if (signer && typeof signer === 'object' && signer.address && !signer.signMessage) {
    console.warn('Received only address object, not a full signer. Using admin wallet instead.');
    // Just use the admin wallet if signer is just an address
    signer = null;
  }
  
  // Use provided signer (from MetaMask) or fall back to admin wallet
  const effectiveSigner = signer || adminWallet;
  
  if (!effectiveSigner) {
    throw new Error('No signer available. Check ADMIN_PRIVATE_KEY in .env file or connect with MetaMask.');
  }
  
  // Check if contract address has changed from what voteSureContract was initialized with
  if (voteSureContract && voteSureContract.address !== deploymentInfo.address) {
    console.log(`Contract address has changed from ${voteSureContract.address} to ${deploymentInfo.address}. Updating...`);
    // We need to reinitialize the voteSureContract
    voteSureContract = new ethers.Contract(
      deploymentInfo.address,
      deploymentInfo.abi,
      adminWallet
    );
  }
  
  // Connect contract to the signer (this doesn't change the underlying contract, just returns a connected instance)
  return new ethers.Contract(
    deploymentInfo.address,
    deploymentInfo.abi,
    effectiveSigner
  );
};

module.exports = {
  registerVoterOnBlockchain,
  approveVoterOnBlockchain,
  rejectVoterOnBlockchain,
  addCandidateOnBlockchain,
  startElectionOnBlockchain,
  endElectionOnBlockchain,
  castVoteOnBlockchain,
  getVoterStatusFromBlockchain,
  getCandidateFromBlockchain,
  getElectionStatusFromBlockchain,
  updateContractInstance,
  getVoteSureContract
}; 