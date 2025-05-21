import { ethers } from 'ethers';

// Contract configuration - same as in ManageElection.jsx
const CONTRACT_ADDRESS = import.meta.env.CONTRACT_ADDRESS || '0x161e2757Cfa3e8956141030365797eeC8270a873';
const BLOCKCHAIN_RPC_URL = import.meta.env.VITE_BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545';

// VoteSure contract ABI for voter-relevant methods
const CONTRACT_ABI = [
  // Utility view functions
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_electionId",
        "type": "uint256"
      }
    ],
    "name": "getCandidateCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_electionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_candidateId",
        "type": "uint256"
      }
    ],
    "name": "getCandidate",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "candidateId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "party",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "slogan",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "pincode",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "constituency",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "voteCount",
            "type": "uint256"
          }
        ],
        "internalType": "struct VoteSure.Candidate",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_voter",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_electionId",
        "type": "uint256"
      }
    ],
    "name": "isVoterEligibleForElection",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_voter",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_electionId",
        "type": "uint256"
      }
    ],
    "name": "hasVoterVoted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_electionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_candidateId",
        "type": "uint256"
      }
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_voter",
        "type": "address"
      }
    ],
    "name": "getVoterDetails",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "voterId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "pincode",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isApproved",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "registrationTime",
            "type": "uint256"
          }
        ],
        "internalType": "struct VoteSure.Voter",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Initialize provider and contract
let provider = null;
let contract = null;
let signer = null;

// Initialize blockchain connection
export const initializeBlockchain = async () => {
  try {
    // Check if we're already initialized
    if (contract) {
      return { success: true, contract, provider, signer };
    }

    // Check if MetaMask is installed
    if (window.ethereum) {
      // Create a Web3Provider using the MetaMask provider
      provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get the signer
      signer = provider.getSigner();
      
      // Create the contract instance
      contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      
      console.log('Smart contract connection initialized');
      
      return { success: true, contract, provider, signer };
    } else {
      console.error('MetaMask not installed');
      return { 
        success: false, 
        error: 'MetaMask is not installed. Please install MetaMask to use blockchain functions.' 
      };
    }
  } catch (err) {
    console.error('Error initializing blockchain provider:', err);
    return { 
      success: false, 
      error: 'Failed to initialize blockchain connection. Please check MetaMask and try again.' 
    };
  }
};

// Get candidate details directly from blockchain
export const getCandidateFromBlockchain = async (electionId, candidateId) => {
  try {
    // Initialize blockchain if needed
    if (!contract) {
      const init = await initializeBlockchain();
      if (!init.success) {
        return { success: false, error: init.error };
      }
    }
    
    // Convert parameters to appropriate format
    const electionIdNum = parseInt(electionId);
    const candidateIdNum = parseInt(candidateId);
    
    console.log(`Fetching candidate from blockchain - Election ID: ${electionIdNum}, Candidate ID: ${candidateIdNum}`);
    
    // Call the blockchain
    const candidate = await contract.getCandidate(electionIdNum, candidateIdNum);
    
    // Format the result into a more user-friendly object
    return {
      success: true,
      data: {
        id: candidate.candidateId.toNumber(),
        name: candidate.name,
        party: candidate.party,
        slogan: candidate.slogan,
        pincode: candidate.pincode,
        constituency: candidate.constituency,
        voteCount: candidate.voteCount.toNumber()
      }
    };
  } catch (error) {
    console.error('Error getting candidate from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Check if a voter has voted in a specific election
export const hasVoterVotedInElection = async (voterAddress, electionId) => {
  try {
    // Initialize blockchain if needed
    if (!contract) {
      const init = await initializeBlockchain();
      if (!init.success) {
        return { success: false, error: init.error };
      }
    }
    
    // Convert electionId to number
    const electionIdNum = parseInt(electionId);
    
    // Call the blockchain
    const hasVoted = await contract.hasVoterVoted(voterAddress, electionIdNum);
    
    return { success: true, hasVoted };
  } catch (error) {
    console.error('Error checking if voter has voted:', error);
    return { success: false, error: error.message };
  }
};

// Check if a voter is eligible for a specific election (pincode matching)
export const isVoterEligibleForElection = async (voterAddress, electionId) => {
  try {
    // Initialize blockchain if needed
    if (!contract) {
      const init = await initializeBlockchain();
      if (!init.success) {
        return { success: false, error: init.error };
      }
    }
    
    // Convert electionId to number
    const electionIdNum = parseInt(electionId);
    
    // Call the blockchain
    const isEligible = await contract.isVoterEligibleForElection(voterAddress, electionIdNum);
    
    return { success: true, isEligible };
  } catch (error) {
    console.error('Error checking voter eligibility:', error);
    return { success: false, error: error.message };
  }
};

// Get all candidates for an election from blockchain
export const getAllCandidatesForElection = async (electionId) => {
  try {
    // Initialize blockchain if needed
    if (!contract) {
      const init = await initializeBlockchain();
      if (!init.success) {
        return { success: false, error: init.error };
      }
    }
    
    // Convert electionId to number
    const electionIdNum = parseInt(electionId);
    
    // Get candidate count
    const count = await contract.getCandidateCount(electionIdNum);
    const candidateCount = count.toNumber();
    
    console.log(`Found ${candidateCount} candidates for election ${electionIdNum}`);
    
    // Fetch all candidates
    const candidates = [];
    for (let i = 1; i <= candidateCount; i++) {
      const result = await getCandidateFromBlockchain(electionIdNum, i);
      if (result.success) {
        candidates.push(result.data);
      }
    }
    
    return { success: true, candidates };
  } catch (error) {
    console.error('Error getting all candidates from blockchain:', error);
    return { success: false, error: error.message };
  }
};

// Cast a vote on the blockchain
export const castVoteOnBlockchain = async (electionId, candidateId) => {
  try {
    // Initialize blockchain if needed
    if (!contract) {
      const init = await initializeBlockchain();
      if (!init.success) {
        return { success: false, error: init.error };
      }
    }
    
    // Convert parameters to appropriate format
    const electionIdNum = parseInt(electionId);
    const candidateIdNum = parseInt(candidateId);
    
    // Call the blockchain to cast the vote
    const tx = await contract.castVote(electionIdNum, candidateIdNum);
    
    console.log('Vote transaction sent:', tx.hash);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log('Vote transaction confirmed:', receipt);
    
    return { 
      success: true, 
      txHash: receipt.transactionHash 
    };
  } catch (error) {
    console.error('Error casting vote on blockchain:', error);
    
    // Check for specific error messages
    if (error.message.includes('Already voted')) {
      return { 
        success: false, 
        error: 'You have already voted in this election.', 
        code: 'ALREADY_VOTED' 
      };
    } else if (error.message.includes('Voter not approved')) {
      return { 
        success: false, 
        error: 'Your voter registration is not approved yet.', 
        code: 'NOT_APPROVED' 
      };
    } else if (error.message.includes('not eligible')) {
      return { 
        success: false, 
        error: 'You are not eligible to vote in this election based on your pincode.', 
        code: 'NOT_ELIGIBLE' 
      };
    }
    
    return { success: false, error: error.message };
  }
};

// Get voter details from blockchain
export const getVoterDetailsFromBlockchain = async (voterAddress) => {
  try {
    // Initialize blockchain if needed
    if (!contract) {
      const init = await initializeBlockchain();
      if (!init.success) {
        return { success: false, error: init.error };
      }
    }
    
    // Call the blockchain
    const voter = await contract.getVoterDetails(voterAddress);
    
    // Format the result
    return {
      success: true,
      data: {
        voterId: voter.voterId,
        pincode: voter.pincode,
        isApproved: voter.isApproved,
        registrationTime: new Date(voter.registrationTime.toNumber() * 1000)
      }
    };
  } catch (error) {
    console.error('Error getting voter details from blockchain:', error);
    return { success: false, error: error.message };
  }
}; 