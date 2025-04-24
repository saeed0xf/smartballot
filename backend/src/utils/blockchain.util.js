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
const startElectionOnBlockchain = async (electionId, electionName, candidateIds = [], candidateNames = [], signer = null) => {
  try {
    if (!voteSureContract) {
      console.error('Contract not initialized when starting election');
      return { success: false, error: 'Contract not initialized' };
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
      console.error('No signer available for blockchain transaction');
      return { success: false, error: 'No signer available. Check ADMIN_PRIVATE_KEY in .env file or connect with MetaMask.' };
    }
    
    console.log(`Starting election on blockchain: ${electionName} (ID: ${electionId})`);
    console.log(`Using signer ${typeof signer === 'object' && signer?.signMessage ? 'from MetaMask' : 'from admin wallet'}`);
    
    // Check if we're using MetaMask or admin wallet
    const usingMetaMask = typeof signer === 'object' && signer?.signMessage;
    
    // Use admin wallet if signer is invalid
    const connectedContract = voteSureContract.connect(effectiveSigner);
    
    // Check if we need to add candidates first
    if (candidateIds && candidateIds.length > 0) {
      console.log(`Ensuring ${candidateIds.length} candidates are on the blockchain`);
      
      // If we have candidate information, make sure they are all registered on the blockchain
      for (let i = 0; i < candidateIds.length; i++) {
        const candidateId = candidateIds[i];
        const candidateName = candidateNames[i] || `Candidate ${i+1}`;
        
        try {
          // Check if candidate exists on blockchain already
          let onChainCandidate = null;
          try {
            // Try to get candidate from blockchain by ID
            // This might be a blockchain-specific ID or our database ID
            onChainCandidate = await connectedContract.getCandidate(candidateId);
            console.log(`Candidate found on blockchain: ${candidateName} (ID: ${candidateId})`);
          } catch (checkError) {
            console.log(`Candidate not found on blockchain, will add: ${candidateName}`);
          }
          
          // If candidate doesn't exist, add them
          if (!onChainCandidate || onChainCandidate.name === "") {
            console.log(`Adding candidate to blockchain: ${candidateName}`);
            const addTx = await connectedContract.addCandidate(
              candidateName,
              "Party", // Default party if not provided
              "Vote for me" // Default slogan if not provided
            );
            
            const addReceipt = await addTx.wait();
            console.log(`Candidate added to blockchain: ${candidateName}, tx: ${addReceipt.transactionHash}`);
          }
        } catch (candidateError) {
          console.warn(`Error processing candidate ${candidateName}:`, candidateError.message);
          // Continue with other candidates even if one fails
        }
      }
    }
    
    // Now start the election
    console.log('Submitting startElection transaction to blockchain...');
    let txHash;
    
    if (usingMetaMask) {
      // Use eth_sendTransaction with MetaMask
      console.log('Using eth_sendTransaction with MetaMask to start election');
      
      // Get contract data for the startElection function call
      let txData;
      if (typeof connectedContract.startElectionWithId === 'function') {
        // Use the function with ID if available
        txData = voteSureContract.interface.encodeFunctionData('startElectionWithId', [electionId, electionName]);
      } else {
        // Fallback to standard method without ID
        txData = voteSureContract.interface.encodeFunctionData('startElection', []);
      }
      
      // Prepare transaction parameters
      const txParams = {
        from: signer.address,
        to: voteSureContract.address,
        data: txData,
        // Don't include gas limit or gas price - let MetaMask determine these
      };
      
      // Send transaction using MetaMask
      txHash = await provider.send('eth_sendTransaction', [txParams]);
      console.log(`MetaMask transaction submitted with hash: ${txHash}`);
      
      // Wait for transaction to be mined
      console.log('Waiting for transaction to be mined...');
      const receipt = await provider.waitForTransaction(txHash);
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return { success: true, txHash: txHash };
    } else {
      // Use standard ethers.js contract interaction
      console.log('Using standard ethers.js contract call to start election');
      
      let tx;
      // Check if our contract has a method to set the election ID
      if (typeof connectedContract.startElectionWithId === 'function') {
        tx = await connectedContract.startElectionWithId(electionId, electionName);
      } else {
        // Fallback to standard method without ID
        tx = await connectedContract.startElection();
      }
      
      console.log(`Standard transaction submitted, hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return { success: true, txHash: receipt.transactionHash };
    }
  } catch (error) {
    console.error('Error starting election on blockchain:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.toString()
    };
  }
};

// End election on blockchain
const endElectionOnBlockchain = async (signer = null) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
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
      console.error('No signer available for blockchain transaction');
      return { success: false, error: 'No signer available. Check ADMIN_PRIVATE_KEY in .env file or connect with MetaMask.' };
    }
    
    // Check if we're using MetaMask or admin wallet
    const usingMetaMask = typeof signer === 'object' && signer?.signMessage;
    
    // Connect contract to the signer
    const connectedContract = voteSureContract.connect(effectiveSigner);
    
    if (usingMetaMask) {
      // Use eth_sendTransaction with MetaMask
      console.log('Using eth_sendTransaction with MetaMask to end election');
      
      // Get contract data for the endElection function call
      const txData = voteSureContract.interface.encodeFunctionData('endElection', []);
      
      // Prepare transaction parameters
      const txParams = {
        from: signer.address,
        to: voteSureContract.address,
        data: txData,
        // Don't include gas limit or gas price - let MetaMask determine these
      };
      
      // Send transaction using MetaMask
      const txHash = await provider.send('eth_sendTransaction', [txParams]);
      console.log(`MetaMask transaction submitted with hash: ${txHash}`);
      
      // Wait for transaction to be mined
      console.log('Waiting for transaction to be mined...');
      const receipt = await provider.waitForTransaction(txHash);
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return { success: true, txHash: txHash };
    } else {
      // Use standard ethers.js contract interaction
      console.log('Using standard ethers.js contract call to end election');
      
      const tx = await connectedContract.endElection();
      const receipt = await tx.wait();
      
      console.log('Election ended on blockchain');
      return { success: true, txHash: receipt.transactionHash };
    }
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