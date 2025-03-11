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
  const deploymentPath = path.join(__dirname, '../../../blockchain/deployment.json');
  if (fs.existsSync(deploymentPath)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Create contract instance if admin wallet and deployment info are available
    if (adminWallet && deploymentInfo && deploymentInfo.abi && deploymentInfo.address) {
      voteSureContract = new ethers.Contract(
        deploymentInfo.address,
        deploymentInfo.abi,
        adminWallet
      );
      console.log(`Contract connected at address: ${deploymentInfo.address}`);
    }
  } else {
    console.log('Deployment file not found. Contract functions will be unavailable until deployment.');
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
const approveVoterOnBlockchain = async (voterAddress) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const tx = await voteSureContract.approveVoter(voterAddress);
    const receipt = await tx.wait();
    
    console.log(`Voter approved on blockchain: ${voterAddress}`);
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error('Error approving voter on blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// Reject voter on blockchain
const rejectVoterOnBlockchain = async (voterAddress) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const tx = await voteSureContract.rejectVoter(voterAddress);
    const receipt = await tx.wait();
    
    console.log(`Voter rejected on blockchain: ${voterAddress}`);
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error('Error rejecting voter on blockchain:', error.message);
    return { success: false, error: error.message };
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
const startElectionOnBlockchain = async () => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const tx = await voteSureContract.startElection();
    const receipt = await tx.wait();
    
    console.log('Election started on blockchain');
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error('Error starting election on blockchain:', error.message);
    return { success: false, error: error.message };
  }
};

// End election on blockchain
const endElectionOnBlockchain = async () => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const tx = await voteSureContract.endElection();
    const receipt = await tx.wait();
    
    console.log('Election ended on blockchain');
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error('Error ending election on blockchain:', error.message);
    return { success: false, error: error.message };
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
  updateContractInstance
}; 