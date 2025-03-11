const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load deployment information
const deploymentPath = path.join(__dirname, '../deployment.json');
const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Connect to the local Ethereum network (Ganache)
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:7545');

// Admin wallet (using the provided private key)
const adminPrivateKey = '0x10cad5763124cef978bf07e4bedfbc13a13bae80868a642abe8750e1d8b2e5aa';
const adminWallet = new ethers.Wallet(adminPrivateKey, provider);

// Create contract instance
const voteSureContract = new ethers.Contract(
  deploymentInfo.address,
  deploymentInfo.abi,
  adminWallet
);

// Voter registration
async function registerVoter(voterAddress) {
  try {
    const tx = await voteSureContract.registerVoter(voterAddress);
    await tx.wait();
    console.log(`Voter registered: ${voterAddress}`);
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error registering voter:', error.message);
    return { success: false, error: error.message };
  }
}

// Approve voter
async function approveVoter(voterAddress) {
  try {
    const tx = await voteSureContract.approveVoter(voterAddress);
    await tx.wait();
    console.log(`Voter approved: ${voterAddress}`);
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error approving voter:', error.message);
    return { success: false, error: error.message };
  }
}

// Reject voter
async function rejectVoter(voterAddress) {
  try {
    const tx = await voteSureContract.rejectVoter(voterAddress);
    await tx.wait();
    console.log(`Voter rejected: ${voterAddress}`);
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error rejecting voter:', error.message);
    return { success: false, error: error.message };
  }
}

// Add candidate
async function addCandidate(name, party, slogan) {
  try {
    const tx = await voteSureContract.addCandidate(name, party, slogan);
    await tx.wait();
    console.log(`Candidate added: ${name} (${party})`);
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error adding candidate:', error.message);
    return { success: false, error: error.message };
  }
}

// Start election
async function startElection() {
  try {
    const tx = await voteSureContract.startElection();
    await tx.wait();
    console.log('Election started');
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error starting election:', error.message);
    return { success: false, error: error.message };
  }
}

// End election
async function endElection() {
  try {
    const tx = await voteSureContract.endElection();
    await tx.wait();
    console.log('Election ended');
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error ending election:', error.message);
    return { success: false, error: error.message };
  }
}

// Cast vote
async function castVote(voterPrivateKey, candidateId) {
  try {
    // Create voter wallet
    const voterWallet = new ethers.Wallet(voterPrivateKey, provider);
    
    // Connect voter to contract
    const voterContract = voteSureContract.connect(voterWallet);
    
    // Cast vote
    const tx = await voterContract.castVote(candidateId);
    await tx.wait();
    
    console.log(`Vote cast by ${voterWallet.address} for candidate ${candidateId}`);
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error casting vote:', error.message);
    return { success: false, error: error.message };
  }
}

// Get voter status
async function getVoterStatus(voterAddress) {
  try {
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
    console.error('Error getting voter status:', error.message);
    return { success: false, error: error.message };
  }
}

// Get candidate details
async function getCandidate(candidateId) {
  try {
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
    console.error('Error getting candidate details:', error.message);
    return { success: false, error: error.message };
  }
}

// Get election status
async function getElectionStatus() {
  try {
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
    console.error('Error getting election status:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  registerVoter,
  approveVoter,
  rejectVoter,
  addCandidate,
  startElection,
  endElection,
  castVote,
  getVoterStatus,
  getCandidate,
  getElectionStatus
}; 