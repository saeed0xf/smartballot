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
      
      // Try to load the ABI from the VoteSureV2.json file
      const abiPath = path.join(__dirname, '../../../blockchain/build/contracts/VoteSureV2.json');
      
      // If VoteSureV2.json doesn't exist, fall back to VoteSure.json
      let contractJson;
      if (fs.existsSync(abiPath)) {
        contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        console.log('Found VoteSureV2.json contract ABI');
      } else {
        const fallbackPath = path.join(__dirname, '../../../blockchain/build/contracts/VoteSure.json');
        if (fs.existsSync(fallbackPath)) {
          contractJson = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
          console.log('Falling back to VoteSure.json contract ABI');
        }
      }

      if (contractJson) {
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
const registerVoterOnBlockchain = async (voterAddress, electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // Validate parameters
    if (!voterAddress || typeof voterAddress !== 'string' || !voterAddress.startsWith('0x')) {
      return { success: false, error: 'Invalid wallet address format' };
    }
    
    if (!electionId) {
      return { success: false, error: 'Election ID is required for voter registration' };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { success: false, error: `Invalid election ID format: "${electionId}"` };
    }
    
    console.log(`Registering voter ${voterAddress} for election ${numericElectionId}`);
    
    const tx = await voteSureContract.registerVoter(voterAddress, numericElectionId);
    const receipt = await tx.wait();
    
    console.log(`Voter registered on blockchain: ${voterAddress} for election ${numericElectionId}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error('Error registering voter on blockchain:', error.message);
    
    // Check if the error indicates the voter is already registered
    if (error.message && error.message.includes('Voter already registered')) {
      return {
        success: true,
        alreadyRegistered: true,
        message: 'Voter was already registered on blockchain'
      };
    }
    
    return { success: false, error: error.message };
  }
};

// Approve voter on blockchain
const approveVoterOnBlockchain = async (voterAddress, electionId, options = {}) => {
  try {
    if (!voteSureContract) {
      console.error('Contract not initialized when approving voter');
      return { success: false, error: 'Contract not initialized' };
    }
    
    // Validate parameters
    if (!voterAddress || typeof voterAddress !== 'string' || !voterAddress.startsWith('0x')) {
      return { success: false, error: 'Invalid wallet address format' };
    }
    
    if (!electionId) {
      return { success: false, error: 'Election ID is required for voter approval' };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { success: false, error: `Invalid election ID format: "${electionId}"` };
    }
    
    console.log(`Attempting to approve voter ${voterAddress} for election ${numericElectionId}`);
    console.log('Options:', options);
    
    // If useMetaMask is true, then we should delegate the transaction
    // to the frontend. Just validate and return instructions.
    if (options.useMetaMask === true) {
      console.log('Using MetaMask for transaction...');
      
      // Return special response for MetaMask
      return { 
        success: true, 
        useMetaMask: true,
        contractAddress: deploymentInfo.address,
        methodName: 'approveVoter',
        params: [voterAddress, numericElectionId],
        message: 'Please confirm the transaction in MetaMask to approve this voter'
      };
    }
    
    // Traditional server-side transaction flow
    if (!adminWallet) {
      console.error('Admin wallet not initialized when approving voter');
      return { success: false, error: 'Admin wallet not initialized. Check ADMIN_PRIVATE_KEY in .env file.' };
    }
    
    console.log(`Using admin wallet ${adminWallet.address} to approve voter ${voterAddress} for election ${numericElectionId}`);
    
    try {
      // First check if voter is already registered in the contract
      let isRegistered = false;
      try {
        const status = await voteSureContract.getVoterStatus(voterAddress, numericElectionId);
        isRegistered = status[0]; // isRegistered from status tuple
        const isApproved = status[1]; // isApproved from status tuple
        
        console.log(`Voter status check: registered=${isRegistered}, approved=${isApproved}`);
        
        // If already approved, return success
        if (isApproved) {
          return {
            success: true,
            alreadyApproved: true,
            message: 'Voter was already approved on blockchain'
          };
        }
      } catch (checkError) {
        console.warn(`Could not check voter status: ${checkError.message}`);
        // Continue despite the check error
      }
      
      // If not registered, try to register first
      if (!isRegistered) {
        try {
          console.log(`Voter not registered, attempting to register first: ${voterAddress}`);
          const regTx = await voteSureContract.registerVoter(voterAddress, numericElectionId);
          const regReceipt = await regTx.wait();
          console.log(`Voter registered first, hash: ${regReceipt.transactionHash}`);
        } catch (regError) {
          console.warn(`Could not register voter first (may already be registered): ${regError.message}`);
          // Continue anyway, as the voter might actually be registered
        }
      }
      
      // Now attempt to approve
      const tx = await voteSureContract.approveVoter(voterAddress, numericElectionId);
      console.log(`Approval transaction submitted, hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      console.log(`Voter approved on blockchain: ${voterAddress} for election ${numericElectionId}`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      return { success: true, txHash: receipt.transactionHash };
    } catch (txError) {
      console.error('Transaction error when approving voter:', txError);
      
      // Check if it's already approved
      if (txError.message && txError.message.includes('Voter already approved')) {
        return {
          success: true,
          alreadyApproved: true,
          message: 'Voter was already approved on blockchain'
        };
      }
      
      return { 
        success: false, 
        error: `Transaction failed: ${txError.message}`,
        details: txError.toString()
      };
    }
  } catch (error) {
    console.error('Error in approveVoterOnBlockchain:', error);
    return { success: false, error: error.message || 'Unknown error during voter approval' };
  }
};

// Reject voter on blockchain
const rejectVoterOnBlockchain = async (voterAddress, electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // Validate parameters
    if (!voterAddress || typeof voterAddress !== 'string' || !voterAddress.startsWith('0x')) {
      return { success: false, error: 'Invalid wallet address format' };
    }
    
    if (!electionId) {
      return { success: false, error: 'Election ID is required for voter rejection' };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { success: false, error: `Invalid election ID format: "${electionId}"` };
    }
    
    console.log(`Rejecting voter ${voterAddress} for election ${numericElectionId}`);
    
    const tx = await voteSureContract.rejectVoter(voterAddress, numericElectionId);
    const receipt = await tx.wait();
    
    console.log(`Voter rejected on blockchain: ${voterAddress} for election ${numericElectionId}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    
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

// Create a new election on blockchain
const createElectionOnBlockchain = async (
  title,
  description,
  electionType,
  region,
  pincode,
  startTime,
  endTime
) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    console.log(`Creating election on blockchain with title: ${title}`);
    
    // Convert timestamps to seconds for blockchain
    const startTimeSeconds = Math.floor(new Date(startTime).getTime() / 1000);
    const endTimeSeconds = Math.floor(new Date(endTime).getTime() / 1000);
    
    const tx = await voteSureContract.createElection(
      title,
      description,
      electionType,
      region,
      pincode,
      startTimeSeconds,
      endTimeSeconds
    );
    
    const receipt = await tx.wait();
    
    // Try to get the electionId from event logs
    let electionId = null;
    const event = receipt.events.find(e => e.event === 'ElectionCreated');
    if (event && event.args) {
      electionId = event.args.electionId.toString();
    }
    
    console.log(`Election created on blockchain with ID: ${electionId}, tx hash: ${receipt.transactionHash}`);
    
    return { 
      success: true, 
      txHash: receipt.transactionHash,
      electionId: electionId
    };
  } catch (error) {
    console.error('Error creating election on blockchain:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown blockchain error'
    };
  }
};

// Start an election on blockchain
const startElectionOnBlockchain = async (electionId, signer = null) => {
  try {
    console.log(`Starting election with ID: ${electionId} on blockchain`);
    
    if (!electionId) {
      return { 
        success: false, 
        error: 'Election ID is required for starting an election' 
      };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { 
        success: false, 
        error: `Invalid election ID format: "${electionId}"` 
      };
    }

    // If no contract available, we can't do anything
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // If signer is an object with address property (MetaMask style), we should delegate to frontend
    if (signer && typeof signer === 'object' && signer.address && signer.address.startsWith('0x')) {
      console.log(`Delegating election start to MetaMask with address: ${signer.address}`);
      
      // Return special response for MetaMask
      return { 
        success: true, 
        useMetaMask: true,
        contractAddress: deploymentInfo.address,
        methodName: 'startElection',
        params: [numericElectionId],
        message: 'Please confirm the transaction in MetaMask to start this election'
      };
    }
    
    // Get contract with proper signer or use default admin wallet
    const contract = await getVoteSureContract(signer);
    
    if (!contract) {
      return { success: false, error: 'Could not get contract instance. Check contract deployment and admin wallet.' };
    }
    
    // Check if election exists and is not already started
    try {
      const isActive = await contract.isElectionActive(numericElectionId);
      if (isActive) {
        console.log(`Election ${numericElectionId} is already active`);
        return {
          success: true,
          alreadyStarted: true,
          message: 'Election was already started on blockchain'
        };
      }
    } catch (checkError) {
      console.warn('Error checking election status:', checkError);
      // Continue anyway, let the contract function handle validation
    }
    
    const tx = await contract.startElection(numericElectionId);
    const receipt = await tx.wait();
    
    console.log(`Election ${numericElectionId} started on blockchain, tx hash: ${receipt.transactionHash}`);
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error starting election on blockchain:', error);
    
    // Check if error indicates the election is already started
    if (error.message && error.message.includes('Election already started')) {
      return {
        success: true,
        alreadyStarted: true,
        message: 'Election was already started on blockchain'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Unknown blockchain error'
    };
  }
};

// End an election on blockchain
const endElectionOnBlockchain = async (electionId, signer = null) => {
  try {
    console.log(`Ending election with ID: ${electionId} on blockchain`);
    
    if (!electionId) {
      return { 
        success: false, 
        error: 'Election ID is required for ending an election' 
      };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { 
        success: false, 
        error: `Invalid election ID format: "${electionId}"` 
      };
    }

    // If no contract available, we can't do anything
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // If signer is an object with address property (MetaMask style), we should delegate to frontend
    if (signer && typeof signer === 'object' && signer.address && signer.address.startsWith('0x')) {
      console.log(`Delegating election end to MetaMask with address: ${signer.address}`);
      
      // Return special response for MetaMask
      return { 
        success: true, 
        useMetaMask: true,
        contractAddress: deploymentInfo.address,
        methodName: 'endElection',
        params: [numericElectionId],
        message: 'Please confirm the transaction in MetaMask to end this election'
      };
    }
    
    // Get contract with proper signer or use default admin wallet
    const contract = await getVoteSureContract(signer);
    
    if (!contract) {
      return { success: false, error: 'Could not get contract instance. Check contract deployment and admin wallet.' };
    }
    
    // Check if election exists and is active
    try {
      const isActive = await contract.isElectionActive(numericElectionId);
      if (!isActive) {
        console.log(`Election ${numericElectionId} is not active`);
        return {
          success: true,
          alreadyEnded: true,
          message: 'Election was already ended on blockchain'
        };
      }
    } catch (checkError) {
      console.warn('Error checking election status:', checkError);
      // Continue anyway, let the contract function handle validation
    }
    
    const tx = await contract.endElection(numericElectionId);
    const receipt = await tx.wait();
    
    console.log(`Election ${numericElectionId} ended on blockchain, tx hash: ${receipt.transactionHash}`);
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error ending election on blockchain:', error);
    
    // Check if error indicates the election is already ended
    if (error.message && (error.message.includes('Election not started') || 
        error.message.includes('Election already ended'))) {
      return {
        success: true,
        alreadyEnded: true,
        message: 'Election was already ended on blockchain'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Unknown blockchain error'
    };
  }
};

// Archive an election on blockchain
const archiveElectionOnBlockchain = async (electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    console.log(`Archiving election with ID: ${electionId} on blockchain`);
    
    const tx = await voteSureContract.archiveElection(electionId);
    const receipt = await tx.wait();
    
    console.log(`Election ${electionId} archived on blockchain, tx hash: ${receipt.transactionHash}`);
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error archiving election on blockchain:', error);
    return {
      success: false,
      error: error.message || 'Unknown blockchain error'
    };
  }
};

// Add a candidate to an election on blockchain
const addCandidateToBlockchain = async (name, party, partySymbol, electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    console.log(`Adding candidate ${name} to election ${electionId} on blockchain`);
    
    const tx = await voteSureContract.addCandidate(name, party, partySymbol, electionId);
    const receipt = await tx.wait();
    
    // Try to get the candidateId from event logs
    let candidateId = null;
    const event = receipt.events.find(e => e.event === 'CandidateAdded');
    if (event && event.args) {
      candidateId = event.args.candidateId.toString();
    }
    
    console.log(`Candidate added on blockchain with ID: ${candidateId}, tx hash: ${receipt.transactionHash}`);
    
    return { 
      success: true, 
      txHash: receipt.transactionHash,
      candidateId: candidateId
    };
  } catch (error) {
    console.error('Error adding candidate on blockchain:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown blockchain error'
    };
  }
};

// Cast vote on blockchain - updated for multiple elections
const castVoteOnBlockchain = async (privateKey, electionId, candidateId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // Validate params
    if (!electionId || electionId <= 0) {
      return { 
        success: false, 
        error: `Invalid election ID: "${electionId}"` 
      };
    }
    
    if (!candidateId || candidateId <= 0) {
      return { 
        success: false, 
        error: `Invalid candidate ID: "${candidateId}"` 
      };
    }
    
    // Convert to numbers if needed
    const numericElectionId = parseInt(electionId);
    const numericCandidateId = parseInt(candidateId);
    
    if (isNaN(numericElectionId) || isNaN(numericCandidateId)) {
      return { 
        success: false, 
        error: `Invalid numeric format: election=${electionId}, candidate=${candidateId}` 
      };
    }
    
    console.log(`Casting vote for election ${numericElectionId}, candidate ${numericCandidateId}`);
    
    // Create voter wallet
    const voterWallet = new ethers.Wallet(privateKey, provider);
    
    // Connect voter to contract
    const voterContract = voteSureContract.connect(voterWallet);
    
    // Cast vote with the new function signature
    const tx = await voterContract.castVote(numericElectionId, numericCandidateId);
    const receipt = await tx.wait();
    
    console.log(`Vote cast on blockchain by ${voterWallet.address} for election ${numericElectionId}, candidate ${numericCandidateId}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    
    return { 
      success: true, 
      txHash: receipt.transactionHash 
    };
  } catch (error) {
    console.error('Error casting vote on blockchain:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown blockchain error',
      stack: error.stack
    };
  }
};

// Get voter status for specific election
const getVoterStatusFromBlockchain = async (voterAddress, electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // If electionId is not provided, we can't use the new contract
    if (!electionId) {
      return { 
        success: false, 
        error: 'Election ID is required for checking voter status' 
      };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { 
        success: false, 
        error: `Invalid election ID format: "${electionId}"` 
      };
    }
    
    console.log(`Checking status for voter ${voterAddress} in election ${numericElectionId}`);
    const status = await voteSureContract.getVoterStatus(voterAddress, numericElectionId);
    
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
    console.error('Error getting voter status from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Get candidate details from blockchain
const getCandidateFromBlockchain = async (candidateId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const numericCandidateId = parseInt(candidateId);
    if (isNaN(numericCandidateId)) {
      return { 
        success: false, 
        error: `Invalid candidate ID format: "${candidateId}"` 
      };
    }
    
    console.log(`Fetching candidate ${numericCandidateId} from blockchain`);
    const candidate = await voteSureContract.getCandidate(numericCandidateId);
    
    return {
      success: true,
      data: {
        id: candidate[0].toNumber(),
        name: candidate[1],
        party: candidate[2],
        partySymbol: candidate[3],
        electionId: candidate[4].toNumber(),
        voteCount: candidate[5].toNumber()
      }
    };
  } catch (error) {
    console.error('Error getting candidate from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Get election from blockchain
const getElectionFromBlockchain = async (electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { 
        success: false, 
        error: `Invalid election ID format: "${electionId}"` 
      };
    }
    
    console.log(`Fetching election ${numericElectionId} from blockchain`);
    const election = await voteSureContract.getElection(numericElectionId);
    
    return {
      success: true,
      data: {
        id: election[0].toNumber(),
        title: election[1],
        description: election[2],
        electionType: election[3],
        startTime: new Date(election[4].toNumber() * 1000),
        endTime: new Date(election[5].toNumber() * 1000),
        isActive: election[6],
        isArchived: election[7],
        totalVotes: election[8].toNumber(),
        candidateIds: election[9].map(id => id.toNumber())
      }
    };
  } catch (error) {
    console.error('Error getting election from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Get election status from blockchain
const getElectionStatusFromBlockchain = async (electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // If no electionId is provided, return error
    if (!electionId) {
      return { 
        success: false, 
        error: 'Election ID is required for checking status' 
      };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { 
        success: false, 
        error: `Invalid election ID format: "${electionId}"` 
      };
    }
    
    // Get election data from blockchain
    const isActive = await voteSureContract.isElectionActive(numericElectionId);
    
    // Get more detailed information
    let electionDetails = { started: false, ended: false };
    try {
      const election = await voteSureContract.getElection(numericElectionId);
      electionDetails = {
        started: election[6], // isActive
        ended: !election[6] || election[7], // !isActive || isArchived
      };
    } catch (detailError) {
      console.warn('Could not get detailed election info:', detailError.message);
    }
    
    return {
      success: true,
      data: {
        isActive: isActive,
        started: electionDetails.started,
        ended: electionDetails.ended
      }
    };
  } catch (error) {
    console.error('Error getting election status from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Get all elections from blockchain
const getAllElectionsFromBlockchain = async () => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    // Get all election IDs
    const electionIds = await voteSureContract.getAllElections();
    const numericIds = electionIds.map(id => id.toNumber());
    
    console.log(`Retrieved ${numericIds.length} election IDs from blockchain`);
    
    // Get details for each election
    const elections = [];
    for (const id of numericIds) {
      try {
        const electionResult = await getElectionFromBlockchain(id);
        if (electionResult.success) {
          elections.push(electionResult.data);
        }
      } catch (detailError) {
        console.warn(`Error fetching details for election ${id}:`, detailError.message);
      }
    }
    
    return {
      success: true,
      data: elections
    };
  } catch (error) {
    console.error('Error getting all elections from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Get election results from blockchain
const getElectionResultsFromBlockchain = async (electionId) => {
  try {
    if (!voteSureContract) {
      return { success: false, error: 'Contract not initialized' };
    }
    
    const numericElectionId = parseInt(electionId);
    if (isNaN(numericElectionId)) {
      return { 
        success: false, 
        error: `Invalid election ID format: "${electionId}"` 
      };
    }
    
    console.log(`Fetching results for election ${numericElectionId} from blockchain`);
    const results = await voteSureContract.getElectionResults(numericElectionId);
    
    // Format the results
    const candidateIds = results[0].map(id => id.toNumber());
    const voteCounts = results[1].map(count => count.toNumber());
    
    // Create an array of candidate results
    const formattedResults = candidateIds.map((id, index) => ({
      candidateId: id,
      voteCount: voteCounts[index]
    }));
    
    return {
      success: true,
      data: formattedResults
    };
  } catch (error) {
    console.error('Error getting election results from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Function to update contract instance with new address and ABI
const updateContractInstance = (address, abi) => {
  try {
    if (!adminWallet) {
      return { success: false, error: 'Admin wallet not initialized' };
    }
    
    voteSureContract = new ethers.Contract(address, abi, adminWallet);
    console.log(`Contract instance updated at address: ${address}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating contract instance:', error.message);
    return { success: false, error: error.message };
  }
};

// Get VoteSure contract instance with optional signer
const getVoteSureContract = async (signer = null) => {
  try {
    if (!voteSureContract) {
      return null;
    }
    
    // If no signer provided, return the admin-connected contract
    if (!signer) {
      return voteSureContract;
    }
    
    // Otherwise, connect contract to the provided signer
    return voteSureContract.connect(signer);
  } catch (error) {
    console.error('Error getting contract with signer:', error);
    return null;
  }
};

module.exports = {
  registerVoterOnBlockchain,
  approveVoterOnBlockchain,
  rejectVoterOnBlockchain,
  addCandidateOnBlockchain,
  createElectionOnBlockchain,
  startElectionOnBlockchain,
  endElectionOnBlockchain,
  archiveElectionOnBlockchain,
  addCandidateToBlockchain,
  castVoteOnBlockchain,
  getVoterStatusFromBlockchain,
  getCandidateFromBlockchain,
  getElectionFromBlockchain,
  getElectionStatusFromBlockchain,
  getAllElectionsFromBlockchain,
  getElectionResultsFromBlockchain,
  updateContractInstance,
  getVoteSureContract
}; 