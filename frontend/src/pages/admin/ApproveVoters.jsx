import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { FaCheck, FaTimes, FaEye, FaEnvelope, FaEthereum, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import Layout from '../../components/Layout';
import env from '../../utils/env';

const ApproveVoters = () => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  
  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedVoterId, setSelectedVoterId] = useState(null);
  
  // Voter details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [voterDetailsLoading, setVoterDetailsLoading] = useState(false);
  
  // Voter verification states
  const [verificationData, setVerificationData] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  
  // Face verification states
  const [faceVerificationData, setFaceVerificationData] = useState(null);
  const [faceVerificationLoading, setFaceVerificationLoading] = useState(false);
  const [faceVerificationError, setFaceVerificationError] = useState(null);
  
  // Image preview modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewImageType, setPreviewImageType] = useState('');
  
  // Action loading states
  const [approvingVoter, setApprovingVoter] = useState(false);
  const [rejectingVoter, setRejectingVoter] = useState(false);

  // Fetch voters on component mount and when filter changes
  useEffect(() => {
    fetchVoters();
  }, [filterStatus]);

  // Fetch voters from API
  const fetchVoters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${apiUrl}/admin/voters?status=${filterStatus}`);
      
      console.log('Fetched voters:', response.data.voters);
      
      // Add detailed logging for each voter to check email field
      if (response.data.voters && response.data.voters.length > 0) {
        console.log('Examining first voter data:', response.data.voters[0]);
        response.data.voters.forEach((voter, index) => {
          console.log(`Voter ${index + 1} - Email:`, voter.email || 'No email found');
          
          // Log all possible email sources for debugging
          console.log(`Voter ${index + 1} - Email sources:`, {
            directEmail: voter.email,
            userEmail: voter.user?.email,
            nestedUserEmail: voter.user ? voter.user.email : null
          });
        });
      }
      
      // Ensure each voter has the email property
      const processedVoters = response.data.voters.map(voter => {
        // Check for email in different possible locations
        const email = voter.email || (voter.user && voter.user.email) || null;
        
        console.log(`Processing voter ${voter.id}: Found email:`, email);
        
        // Create a new voter object with explicitly set email field
        return {
          ...voter,
          email: email, // Explicitly set the email
          user: voter.user // Preserve the original user object if needed
        };
      });
      
      console.log('Processed voters with normalized email fields:', processedVoters.map(v => ({id: v.id, email: v.email})));
      setVoters(processedVoters);
    } catch (err) {
      console.error('Error fetching voters:', err);
      setError('Failed to fetch voters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch voter details
  const fetchVoterDetails = async (voterId) => {
    try {
      setVoterDetailsLoading(true);
      setVerificationData(null);
      setVerificationError(null);
      setFaceVerificationData(null);
      setFaceVerificationError(null);
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${apiUrl}/admin/voters/${voterId}`);
      
      // More detailed logging to debug the entire voter object structure
      console.log('Fetched voter details (full response):', response.data);
      console.log('Voter object keys:', Object.keys(response.data.voter));
      console.log('Email value:', response.data.voter.email);
      console.log('Pincode value:', response.data.voter.pincode);
      
      // Ensure we set the full voter object including all properties
      const voterData = response.data.voter;
      
      // Ensure email and pincode are available for display
      if (!voterData.pincode && response.data.voter.pincode) {
        voterData.pincode = response.data.voter.pincode;
      }
      if (!voterData.email && response.data.voter.email) {
        voterData.email = response.data.voter.email;
      }
      
      console.log('Voter data being set to state:', voterData);
      setSelectedVoter(voterData);
      setShowDetailsModal(true);
      
      // Verify the voter details against the external API
      await verifyVoterDetails(voterData);
    } catch (err) {
      console.error('Error fetching voter details:', err);
      toast.error('Failed to fetch voter details.');
    } finally {
      setVoterDetailsLoading(false);
    }
  };
  
  // Verify voter details against the external database
  const verifyVoterDetails = async (voter) => {
    if (!voter || !voter.voterId) {
      console.error('No voter ID available for verification');
      setVerificationError('No voter ID available for verification');
      return;
    }
    
    try {
      setVerificationLoading(true);
      setVerificationError(null);
      setVerificationData(null);
      
      console.log(`Verifying voter with ID: ${voter.voterId}`);
      
      // Add a timeout to the axios request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
      
      try {
        const response = await axios.get(`http://localhost:9001/api/voters/id/${voter.voterId}`, {
          signal: controller.signal,
          timeout: 10000 // Also set axios timeout
        });
        
        clearTimeout(timeoutId);
        
        console.log('Voter verification data:', response.data);
        
        if (response.data && (response.data._id || response.data.voterId)) {
          // Log comparison of key fields for debugging
          console.log('Verification comparison:', {
            voterId: {
              local: voter.voterId,
              verification: response.data.voterId,
              match: voter.voterId === response.data.voterId
            },
            pincode: {
              local: voter.pincode,
              verification: response.data.pincode,
              match: (voter.pincode || '').trim().toLowerCase() === (response.data.pincode || '').trim().toLowerCase()
            }
          });
          
          setVerificationData(response.data);
        } else if (response.data && response.data.message === 'Voter not found') {
          setVerificationError('Voter not found in the verification database');
        } else {
          setVerificationError('Invalid response from verification service');
        }
      } catch (requestErr) {
        clearTimeout(timeoutId);
        
        if (requestErr.name === 'AbortError' || requestErr.code === 'ECONNABORTED') {
          setVerificationError('Verification request timed out. The service might be unavailable.');
        } else if (requestErr.response) {
          // The request was made and the server responded with a status code
          if (requestErr.response.status === 404) {
            setVerificationError('Voter not found in the verification database');
          } else {
            setVerificationError(`Verification service error: ${requestErr.response.data?.message || requestErr.response.statusText}`);
          }
        } else if (requestErr.request) {
          // The request was made but no response was received
          setVerificationError('No response from verification service. The service might be down.');
        } else {
          // Something happened in setting up the request
          setVerificationError(`Error setting up verification request: ${requestErr.message}`);
        }
        
        throw requestErr; // Re-throw for outer catch
      }
    } catch (err) {
      console.error('Error verifying voter details:', err);
      // Error is now handled in the inner catch block
    } finally {
      setVerificationLoading(false);
    }
  };
  
  // Verify voter face against the AI verification service
  const verifyVoterFace = async (voter) => {
    if (!voter || !voter.voterId || !voter.faceImage) {
      console.error('No voter ID or face image available for verification');
      setFaceVerificationError('Voter ID or face image missing');
      return;
    }
    
    try {
      setFaceVerificationLoading(true);
      setFaceVerificationError(null);
      setFaceVerificationData(null);
      
      console.log(`Verifying face for voter with ID: ${voter.voterId}`);
      
      // Get the face image URL
      const faceImageUrl = getImageUrl(voter.faceImage);
      if (!faceImageUrl) {
        throw new Error('Could not generate face image URL');
      }
      
      // Fetch the image as a blob
      try {
        const imageResponse = await fetch(faceImageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        
        const imageBlob = await imageResponse.blob();
        
        // Create a FormData object to send to the API
        const formData = new FormData();
        formData.append('uploaded_image', imageBlob, 'voter_face.jpg');
        formData.append('voter_id', voter.voterId);
        
        try {
          // Create an AbortController to manage timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
          
          // Send the verification request to the AI service
          const verificationResponse = await axios.post('http://localhost:8000/api/verify', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            signal: controller.signal,
            timeout: 15000 // 15-second timeout
          });
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          console.log('Face verification response:', verificationResponse.data);
          
          if (verificationResponse.data && verificationResponse.data.success) {
            setFaceVerificationData(verificationResponse.data);
          } else {
            setFaceVerificationError(verificationResponse.data?.message || 'Face verification failed');
          }
        } catch (apiError) {
          // Handle API specific errors
          console.error('Face verification API error:', apiError);
          
          if (apiError.name === 'AbortError' || apiError.code === 'ECONNABORTED') {
            setFaceVerificationError('Face verification request timed out. The AI service might be unavailable.');
          } else if (apiError.response) {
            // The request was made and the server responded with a status code
            const errorMessage = apiError.response.data?.message || apiError.response.data?.error || apiError.response.statusText;
            setFaceVerificationError(`Face verification error: ${errorMessage}`);
          } else if (apiError.request) {
            // The request was made but no response was received
            setFaceVerificationError('No response from face verification service. The AI service might be down.');
          } else {
            // Something happened in setting up the request
            setFaceVerificationError(`Error in face verification: ${apiError.message}`);
          }
        }
      } catch (imageError) {
        console.error('Image fetching error:', imageError);
        setFaceVerificationError(`Failed to process face image: ${imageError.message}`);
      }
    } catch (error) {
      console.error('Error verifying voter face:', error);
      const errorMessage = error.message || 'Error verifying face';
      setFaceVerificationError(errorMessage);
    } finally {
      setFaceVerificationLoading(false);
    }
  };

  // Fetch contract ABI
  const fetchContractAbi = async () => {
    try {
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${apiUrl}/blockchain/contract-abi`);
      console.log('Fetched contract ABI:', response.data);
      return {
        abi: response.data.abi,
        address: response.data.address
      };
    } catch (error) {
      console.error('Error fetching contract ABI:', error);
      toast.error('Failed to fetch contract information');
      throw error;
    }
  };

  // Add this function to check a voter's blockchain status
  const checkVoterBlockchainStatus = async (voterAddress) => {
    try {
      console.log(`Checking blockchain status for voter: ${voterAddress}`);
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      
      const response = await axios.get(`${apiUrl}/blockchain/voter-status?address=${voterAddress}`);
      console.log('Voter blockchain status response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error checking voter blockchain status:', error);
      throw new Error('Failed to check voter status on the blockchain');
    }
  };

  // Approve voter
  const approveVoter = async (voterId) => {
    try {
      setApprovingVoter(true);
      
      // Make sure we have MetaMask connected
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to approve voters on the blockchain.');
      }
      
      // Request account access from MetaMask
      console.log('Requesting MetaMask accounts...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('MetaMask accounts access granted:', accounts);
      const adminAccount = accounts[0];
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      
      // First, get the voter details to get their wallet address
      console.log(`Getting voter details for ID: ${voterId}`);
      const voterResponse = await axios.get(`${apiUrl}/admin/voters/${voterId}`);
      const voterWalletAddress = voterResponse.data.voter.walletAddress;
      
      if (!voterWalletAddress) {
        toast.error('Voter has no associated wallet address');
        return;
      }
      
      // Check if voter is already approved on the blockchain
      try {
        const blockchainStatus = await checkVoterBlockchainStatus(voterWalletAddress);
        
        if (blockchainStatus.success && blockchainStatus.data.isApproved) {
          console.log('Voter is already approved on the blockchain');
          
          // Update the database to reflect blockchain status
          const updateResponse = await axios.put(`${apiUrl}/admin/voters/${voterId}/approve-complete`, {
            txHash: 'already-approved', // Special marker for already approved
            voterAddress: voterWalletAddress
          });
          
          console.log('Voter status update response:', updateResponse.data);
          
          // Update local state
          setVoters(prevVoters => 
            prevVoters.map(voter => 
              voter.id === voterId ? { ...voter, status: 'approved' } : voter
            )
          );
          // Voter was already approved on the blockchain.
          toast.success('Voter approved on the blockchain.');
          return;
        }
        
        console.log('Voter is not approved on blockchain, proceeding with approval...');
      } catch (statusError) {
        console.error('Error checking blockchain status, will attempt approval anyway:', statusError);
        // Continue with approval process even if status check fails
      }
      
      // Fetch contract information
      const contractInfo = await fetchContractAbi();
      console.log('Contract info:', contractInfo);
      
      // Let's try a direct approach by submitting the transaction to our backend first
      console.log(`Sending approval request to backend: ${apiUrl}/admin/voters/${voterId}/approve`);
      
      try {
        const backendResponse = await axios.put(`${apiUrl}/admin/voters/${voterId}/approve`, {
          walletAddress: adminAccount,
          useBackendTransaction: true // Try to use the backend to execute the transaction
        });
        
        console.log('Backend approval response:', backendResponse.data);
        
        if (backendResponse.data.success && backendResponse.data.txHash) {
          // Transaction was successful via backend
          console.log('Transaction successful via backend:', backendResponse.data.txHash);
          
          // Update local state
          setVoters(prevVoters => 
            prevVoters.map(voter => 
              voter.id === voterId ? { ...voter, status: 'approved' } : voter
            )
          );
          
          toast.success('Voter approved successfully via backend transaction.');
          return;
        }

        // Check for "already approved" message in successful response
        if (backendResponse.data.message && 
            backendResponse.data.message.includes('already approved on blockchain')) {
          console.log('Voter was already approved on blockchain, database updated');
          
          // Update local state
          setVoters(prevVoters => 
            prevVoters.map(voter => 
              voter.id === voterId ? { ...voter, status: 'approved' } : voter
            )
          );
          
          toast.success('Voter was already approved on the blockchain. Database updated.');
          return;
        }
        
        // If backend transaction approach failed but wasn't a fatal error, continue with MetaMask
        console.log('Backend transaction not successful, trying with MetaMask...');
      } catch (backendError) {
        console.error('Error with backend transaction attempt:', backendError);
        
        // Check if the error response indicates voter was already approved
        if (backendError.response?.data?.message && 
            (backendError.response.data.message.includes('already approved on blockchain') ||
             backendError.response.data.message === 'Voter was already approved on blockchain, database updated')) {
          console.log('Detected "already approved" message, handling as success');
          
          // Update local state
          setVoters(prevVoters => 
            prevVoters.map(voter => 
              voter.id === voterId ? { ...voter, status: 'approved' } : voter
            )
          );
          
          toast.success('Voter was already approved on the blockchain. Database updated.');
          return;
        }
        
        console.log('Continuing with MetaMask approach...');
        // Continue with MetaMask approach
      }
      
      // MetaMask transaction approach
      try {
        console.log('Requesting MetaMask transaction data from backend...');
        const metaMaskDataResponse = await axios.put(`${apiUrl}/admin/voters/${voterId}/approve`, {
          useMetaMask: true,
          walletAddress: adminAccount
        });
        
        console.log('MetaMask data response:', metaMaskDataResponse.data);
        
        if (!metaMaskDataResponse.data.useMetaMask || !metaMaskDataResponse.data.contractDetails) {
          throw new Error('Backend did not provide necessary MetaMask transaction details');
        }
        
        const { address: contractAddress, method, params } = metaMaskDataResponse.data.contractDetails;
        const voterAddress = params[0];
        
        console.log(`Contract address: ${contractAddress}`);
        console.log(`Method: ${method}`);
        console.log(`Voter address to approve: ${voterAddress}`);
        
        // Create multiple transaction options to try
        const transactionOptions = [
          // Option 1: Direct with explicit gas and custom function selector
          {
            name: "Direct with explicit gas",
            txParams: {
              from: adminAccount,
              to: contractAddress,
              value: '0x0',
              gas: '0x186A0', // 100,000 gas
              data: `0x3ce76e5f000000000000000000000000${voterAddress.slice(2)}`
            }
          },
          
          // Option 2: Using standard ERC20 approve function signature (in case there's name confusion)
          {
            name: "Using standard ERC20 approve",
            txParams: {
              from: adminAccount,
              to: contractAddress,
              value: '0x0',
              gas: '0x186A0', // 100,000 gas
              data: `0x095ea7b3000000000000000000000000${voterAddress.slice(2)}0000000000000000000000000000000000000000000000000000000000000001`
            }
          },
          
          // Option 3: Using function name "registerVoter" instead (in case of function name mismatch)
          {
            name: "Using registerVoter",
            txParams: {
              from: adminAccount,
              to: contractAddress,
              value: '0x0',
              gas: '0x186A0', // 100,000 gas
              data: `0x4d238c8e000000000000000000000000${voterAddress.slice(2)}`
            }
          }
        ];
        
        // Try the first option
        try {
          console.log(`Trying transaction option 1: ${transactionOptions[0].name}`);
          console.log('Transaction params:', transactionOptions[0].txParams);
          
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionOptions[0].txParams],
          });
          
          console.log('Transaction successful:', txHash);
          
          // Update voter in database
          await updateVoterAfterApproval(apiUrl, voterId, txHash, voterAddress);
          return;
        } catch (option1Error) {
          console.error('Option 1 failed:', option1Error);
          
          // Try the second option
          try {
            console.log(`Trying transaction option 2: ${transactionOptions[1].name}`);
            console.log('Transaction params:', transactionOptions[1].txParams);
            
            const txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [transactionOptions[1].txParams],
            });
            
            console.log('Transaction successful with option 2:', txHash);
            
            // Update voter in database
            await updateVoterAfterApproval(apiUrl, voterId, txHash, voterAddress);
            return;
          } catch (option2Error) {
            console.error('Option 2 failed:', option2Error);
            
            // Try the third option
            try {
              console.log(`Trying transaction option 3: ${transactionOptions[2].name}`);
              console.log('Transaction params:', transactionOptions[2].txParams);
              
              const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionOptions[2].txParams],
              });
              
              console.log('Transaction successful with option 3:', txHash);
              
              // Update voter in database
              await updateVoterAfterApproval(apiUrl, voterId, txHash, voterAddress);
              return;
            } catch (option3Error) {
              console.error('Option 3 failed:', option3Error);
              throw new Error('All transaction attempts failed - see console for details');
            }
          }
        }
      } catch (metaMaskError) {
        console.error('Error with MetaMask transaction:', metaMaskError);
        throw metaMaskError;
      }
    } catch (err) {
      console.error('Error approving voter:', err);
      let errorMessage = 'Failed to approve voter.';
      
      // Handle various error response formats
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        
        // Check if the error message indicates the voter was already approved on blockchain
        if (errorMessage.includes('already approved on blockchain') || 
            errorMessage.includes('Voter already approved')) {
          console.log('Detected "already approved" message in error response, handling as success');
          
          // Update local state for the voter
          setVoters(prevVoters => 
            prevVoters.map(voter => 
              voter.id === voterId ? { ...voter, status: 'approved' } : voter
            )
          );
          
          toast.success('Voter was previously approved on the blockchain. Database updated.');
          return;
        }
      } else if (err.response?.data?.error) {
        errorMessage = `Error: ${err.response.data.error}`;
        
        // Check if the error indicates the voter was already approved
        if (err.response.data.error.includes('Voter already approved')) {
          console.log('Detected "already approved" message in error, handling as success');
          
          // Update local state for the voter
          setVoters(prevVoters => 
            prevVoters.map(voter => 
              voter.id === voterId ? { ...voter, status: 'approved' } : voter
            )
          );
          
          toast.success('Voter was previously approved on the blockchain. Database updated.');
          return;
        }
      } else if (err.message) {
        errorMessage = err.message;
        
        // Check if the error message indicates the voter was already approved
        if (err.message.includes('Voter already approved')) {
          console.log('Detected "already approved" message in error message, handling as success');
          
          // Update local state for the voter
          setVoters(prevVoters => 
            prevVoters.map(voter => 
              voter.id === voterId ? { ...voter, status: 'approved' } : voter
            )
          );
          
          toast.success('Voter was previously approved on the blockchain. Database updated.');
          return;
        }
      }
      
      // Handle MetaMask specific errors
      if (err.code === 4001) {
        errorMessage = 'MetaMask transaction was rejected by the user.';
      } else if (err.code === -32603) {
        errorMessage = 'MetaMask RPC Error: Transaction may have failed due to contract error or gas issues.';
        
        // Add more details for RPC errors if available
        if (err.data && err.data.message) {
          errorMessage += ` Details: ${err.data.message}`;
          
          // Check for "already approved" in RPC error message
          if (err.data.message.includes('Voter already approved')) {
            console.log('Detected "already approved" message in RPC error, handling as success');
            
            // Update local state for the voter
            setVoters(prevVoters => 
              prevVoters.map(voter => 
                voter.id === voterId ? { ...voter, status: 'approved' } : voter
              )
            );
            
            toast.success('Voter was previously approved on the blockchain. Database updated.');
            return;
          }
        }
      } else if (err.code) {
        errorMessage = `MetaMask Error Code ${err.code}: ${errorMessage}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setApprovingVoter(false);
    }
  };

  // Helper function to update voter after successful approval
  const updateVoterAfterApproval = async (apiUrl, voterId, txHash, voterAddress) => {
    console.log(`Updating voter status in database...`);
    const updateResponse = await axios.put(`${apiUrl}/admin/voters/${voterId}/approve-complete`, {
      txHash,
      voterAddress
    });
    
    console.log('Voter status update response:', updateResponse.data);
    
    // Update local state
    setVoters(prevVoters => 
      prevVoters.map(voter => 
        voter.id === voterId ? { ...voter, status: 'approved' } : voter
      )
    );
    
    toast.success('Voter approved successfully and recorded on blockchain.');
  };

  // Get mismatched fields for better error messages
  const getMismatchedFields = (voter, verificationData) => {
    if (!voter || !verificationData) return [];
    
    const fieldsToCheck = [
      { key: 'fullName', label: 'Full Name' },
      { key: 'fatherName', label: 'Father\'s Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'voterId', label: 'Voter ID' },
      { key: 'age', label: 'Age' },
      { key: 'pincode', label: 'Pincode' }
      // Email is intentionally excluded as it's not required for verification
    ];
    
    const mismatches = [];
    
    fieldsToCheck.forEach(field => {
      try {
        let localValue;
        let verificationValue;
        
        // Prepare values for comparison
        if (field.key === 'fullName') {
          localValue = { 
            firstName: voter.firstName || '', 
            middleName: voter.middleName || '', 
            lastName: voter.lastName || '' 
          };
          verificationValue = {
            firstName: verificationData.firstName || '',
            middleName: verificationData.middleName || '',
            lastName: verificationData.lastName || ''
          };
        } else {
          localValue = voter[field.key] || null;
          verificationValue = verificationData[field.key] || null;
        }
        
        // Check if fields match
        if (!checkFieldMatch(field.key, localValue, verificationValue)) {
          mismatches.push(field.label);
        }
      } catch (err) {
        console.error(`Error checking field ${field.key}:`, err);
        // If we can't compare the field due to an error, consider it mismatched
        mismatches.push(field.label);
      }
    });
    
    return mismatches;
  };

  // Generate rejection reason text based on verification results
  const generateRejectionReason = (voter) => {
    let reason = "";
    const issues = [];
    
    // Check for data verification issues
    if (verificationData) {
      const mismatches = getMismatchedFields(voter, verificationData);
      if (mismatches.length > 0) {
        const fieldsText = mismatches.join(", ");
        issues.push(`The Information doesn't match our voter records: ${fieldsText}`);
      }
    } else if (verificationError) {
      issues.push(`Unable to verify your voter information: ${verificationError}`);
    }
    
    // Check for face verification issues
    if (faceVerificationData && !faceVerificationData.verified) {
      issues.push("Face verification failed - the provided photo doesn't match our records");
    } else if (faceVerificationError) {
      issues.push(`Face verification error: ${faceVerificationError}`);
    }
    
    // If face verification wasn't performed at all, add it as an issue
    if (!faceVerificationData && !faceVerificationError && voter.faceImage) {
      issues.push("Face verification was not performed - your identity couldn't be confirmed");
    }
    
    // If no specific issues found but still rejecting
    if (issues.length === 0) {
      issues.push("The provided information could not be verified against our records");
    }
    
    // Add all issues as bullet points
    issues.forEach((issue, index) => {
      reason += `${index + 1}. ${issue}\n`;
    });
    
    // reason += "\nPlease ensure all information is correct and try registering again. For assistance, contact our support team.";
    
    return reason;
  };

  // Reject voter
  const handleRejectClick = (voterId) => {
    setSelectedVoterId(voterId);
    
    // Generate rejection reason based on verification results if this is from details modal
    if (showDetailsModal && selectedVoter && selectedVoter.id === voterId) {
      const generatedReason = generateRejectionReason(selectedVoter);
      setRejectReason(generatedReason);
    } else {
    setRejectReason('');
      
      // If we have the voter in our list, set a basic reason
      const voter = voters.find(v => v.id === voterId);
      if (voter) {
        setRejectReason("");
      }
    }
    
    setShowRejectModal(true);
  };

  // Submit voter rejection
  const submitRejection = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    
    try {
      setRejectingVoter(true);
      
      // Request account access from MetaMask (for consistency with approval flow)
      try {
        console.log('Requesting MetaMask accounts...');
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('MetaMask accounts access granted');
      } catch (metaMaskError) {
        console.warn('MetaMask access not granted, continuing anyway:', metaMaskError);
        // Continue anyway since we don't need blockchain for rejection
      }
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      console.log(`Sending rejection request to: ${apiUrl}/admin/voters/${selectedVoterId}/reject`);
      
      const response = await axios.put(`${apiUrl}/admin/voters/${selectedVoterId}/reject`, {
        reason: rejectReason
      });
      
      console.log('Voter rejection response:', response.data);
      
      // Update local state
      setVoters(prevVoters => 
        prevVoters.map(voter => 
          voter.id === selectedVoterId ? 
            { ...voter, status: 'rejected', rejectionReason: rejectReason } : 
            voter
        )
      );
      
      toast.success('Voter rejected successfully.');
      setShowRejectModal(false);
    } catch (err) {
      console.error('Error rejecting voter:', err);
      let errorMessage = 'Failed to reject voter.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = `Error: ${err.response.data.error}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setRejectingVoter(false);
    }
  };

  // Format date 
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'approved':
        return <Badge bg="success">Approved</Badge>;
      case 'rejected':
        return <Badge bg="danger">Rejected</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  // Get image URL with proper path
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      console.log('No image path provided');
      return null;
    }
    
    console.log('Original image path:', imagePath);
    
    // If the path already includes http(s), it's a complete URL
    if (imagePath.startsWith('http')) {
      console.log('Using complete URL:', imagePath);
      return imagePath;
    }
    
    // Extract the base URL without the /api path
    const apiUrl = env.API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    
    // Remove any leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    // Make sure the path is correctly formatted
    const finalUrl = `${baseUrl}/${cleanPath}`;
    console.log('Constructed image URL:', finalUrl);
    return finalUrl;
  };
  
  // Check if field values match between local data and verification data
  const checkFieldMatch = (field, localValue, verificationValue) => {
    if (!verificationValue) return false;
    
    switch (field) {
      case 'fullName':
        // Local data: Our format is first + middle + last combined
        const localFullName = `${localValue.firstName || ''} ${localValue.middleName || ''} ${localValue.lastName || ''}`.trim().replace(/\s+/g, ' ').toLowerCase();
        
        // External data: External API has separate firstName, middleName, lastName fields
        // Combine them for comparison
        const externalFirstName = verificationValue.firstName || '';
        const externalMiddleName = verificationValue.middleName || '';
        const externalLastName = verificationValue.lastName || '';
        const externalFullName = `${externalFirstName} ${externalMiddleName} ${externalLastName}`.trim().replace(/\s+/g, ' ').toLowerCase();
        
        // Debug logging
        console.log('Name comparison:', {
          local: {
            firstName: localValue.firstName,
            middleName: localValue.middleName,
            lastName: localValue.lastName,
            combined: localFullName
          },
          external: {
            firstName: externalFirstName,
            middleName: externalMiddleName,
            lastName: externalLastName,
            combined: externalFullName
          },
          match: localFullName === externalFullName
        });
        
        return localFullName === externalFullName;
        
      case 'fatherName':
        return (localValue || '').toLowerCase() === (verificationValue || '').toLowerCase();
        
      case 'gender':
        // Handle potential different formats (e.g., 'male' vs 'Male')
        return (localValue || '').toLowerCase() === (verificationValue || '').toLowerCase();
        
      case 'dateOfBirth':
        // Compare dates regardless of time
        if (!localValue || !verificationValue) return false;
        const localDate = new Date(localValue);
        const verificationDate = new Date(verificationValue);
        return (
          localDate.getFullYear() === verificationDate.getFullYear() &&
          localDate.getMonth() === verificationDate.getMonth() &&
          localDate.getDate() === verificationDate.getDate()
        );
        
      case 'voterId':
      case 'age':
        // Direct comparison for simple fields
        return localValue === verificationValue;
        
      case 'pincode':
        // Case-insensitive comparison and trimming for pincode
        return (localValue || '').trim().toLowerCase() === (verificationValue || '').trim().toLowerCase();
        
      default:
        return false;
    }
  };
  
  // Render verification status icon
  const VerificationStatus = ({ field, voter }) => {
    if (!verificationData || verificationLoading) {
      return verificationLoading ? (
        <FaSync className="text-primary ms-2 fa-spin" title="Verifying..." />
      ) : null;
    }
    
    // If verification errored out, show nothing
    if (verificationError) {
      return null;
    }
    
    let localValue, verificationValue;
    
    try {
      switch (field) {
        case 'fullName':
          localValue = { 
            firstName: voter.firstName || '', 
            middleName: voter.middleName || '', 
            lastName: voter.lastName || '' 
          };
          verificationValue = {
            firstName: verificationData.firstName || '',
            middleName: verificationData.middleName || '',
            lastName: verificationData.lastName || ''
          };
          break;
        case 'fatherName':
          localValue = voter.fatherName || '';
          verificationValue = verificationData.fatherName || '';
          break;
        case 'gender':
          localValue = voter.gender || '';
          verificationValue = verificationData.gender || '';
          break;
        case 'dateOfBirth':
          localValue = voter.dateOfBirth || null;
          verificationValue = verificationData.dateOfBirth || null;
          break;
        case 'voterId':
          localValue = voter.voterId || '';
          verificationValue = verificationData.voterId || '';
          break;
        case 'age':
          localValue = voter.age || null;
          verificationValue = verificationData.age || null;
          break;
        case 'pincode':
          localValue = voter.pincode || '';
          verificationValue = verificationData.pincode || '';
          break;
        default:
          return null;
      }
      
      const matches = checkFieldMatch(field, localValue, verificationValue);
      
      return matches ? (
        <FaCheck className="text-success ms-2" title="Verified" />
      ) : (
        <FaTimes className="text-danger ms-2" title="Not verified" />
      );
    } catch (err) {
      console.error(`Error comparing field ${field}:`, err);
      return <FaTimes className="text-danger ms-2" title="Error in verification" />;
    }
  };

  return (
    <Layout>
      <Container className="py-4">
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Manage Voter Registrations</h5>
            <div>
              <Button 
                variant={filterStatus === 'pending' ? 'light' : 'outline-light'} 
                size="sm"
                className="me-2"
                onClick={() => setFilterStatus('pending')}
              >
                Pending
              </Button>
              <Button 
                variant={filterStatus === 'approved' ? 'light' : 'outline-light'} 
                size="sm"
                className="me-2"
                onClick={() => setFilterStatus('approved')}
              >
                Approved
              </Button>
              <Button 
                variant={filterStatus === 'rejected' ? 'light' : 'outline-light'} 
                size="sm"
                onClick={() => setFilterStatus('rejected')}
              >
                Rejected
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading voters...</p>
              </div>
            ) : voters.length === 0 ? (
              <Alert variant="info">
                No {filterStatus} voter registrations found.
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Voter ID</th>
                      <th>Email</th>
                      <th>Wallet</th>
                      <th>Registration Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voters.map((voter) => (
                      <tr key={voter.id}>
                        {/* Log full voter object for debugging */}
                        {console.log(`Full voter object for ${voter.id}:`, voter)}
                        <td>
                          {voter.firstName} {voter.middleName ? voter.middleName + ' ' : ''}{voter.lastName}
                        </td>
                        <td>{voter.voterId}</td>
                        <td>
                          {/* Log email value for debugging */}
                          {console.log(`Rendering email for voter ${voter.id}:`, voter.email)}
                          {console.log('Checking for nested email:', voter.user?.email)}
                          
                          {/* Display email with improved fallback handling */}
                          {voter.email ? (
                            <a href={`mailto:${voter.email}`} className="d-flex align-items-center text-decoration-none">
                              <FaEnvelope className="me-1" /> {voter.email}
                            </a>
                          ) : voter.user?.email ? (
                            <a href={`mailto:${voter.user.email}`} className="d-flex align-items-center text-decoration-none">
                              <FaEnvelope className="me-1" /> {voter.user.email}
                            </a>
                          ) : (
                            <span className="text-muted">Not provided</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <FaEthereum className="me-1" />
                            <span title={voter.walletAddress} className="text-truncate" style={{ maxWidth: '120px' }}>
                              {voter.walletAddress}
                            </span>
                          </div>
                        </td>
                        <td>{formatDate(voter.createdAt)}</td>
                        <td>{getStatusBadge(voter.status)}</td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-1"
                            title="View Details"
                            onClick={() => fetchVoterDetails(voter.id)}
                          >
                            <FaEye />
                          </Button>
                          
                          {voter.status === 'pending' && (
                            <>
                              <Button 
                                variant="outline-success" 
                                size="sm" 
                                className="me-1"
                                title="Approve Voter"
                                onClick={() => approveVoter(voter.id)}
                                disabled={approvingVoter}
                              >
                                <FaCheck />
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                title="Reject Voter"
                                onClick={() => handleRejectClick(voter.id)}
                                disabled={rejectingVoter}
                              >
                                <FaTimes />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Rejection Reason Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Voter Registration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Reason for Rejection</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this voter registration..."
                style={{ whiteSpace: 'pre-line' }} /* This helps preserve line breaks */
              />
              <Form.Text className="text-muted">
                A pre-populated reason has been generated based on verification results. You can edit it if needed.
                This reason will be sent to the voter via email.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={submitRejection}
            disabled={rejectingVoter || !rejectReason.trim()}
          >
            {rejectingVoter ? 'Rejecting...' : 'Reject Voter'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Voter Details Modal */}
      <Modal 
        show={showDetailsModal} 
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Voter Details
            {verificationData && (
              <Badge 
                bg={getMismatchedFields(selectedVoter, verificationData).length === 0 ? 'success' : 'danger'}
                className="ms-2"
              >
                {getMismatchedFields(selectedVoter, verificationData).length === 0 ? 
                  'Verified' : 'Not Verified'}
              </Badge>
            )}
            {faceVerificationData && (
              <Badge 
                bg={faceVerificationData.verified ? 'success' : 'danger'}
                className="ms-2"
              >
                Face {faceVerificationData.verified ? 'Match' : 'No Match'}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {voterDetailsLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading voter details...</p>
            </div>
          ) : selectedVoter ? (
            <Row>
              {console.log('Rendering voter in modal with data:', selectedVoter)}
              {console.log('Email in modal:', selectedVoter.email)}
              {console.log('Pincode in modal:', selectedVoter.pincode)}
              <Col md={6}>
                <dl className="row">
                  <dt className="col-sm-4">Full Name</dt>
                  <dd className="col-sm-8">
                    {selectedVoter.firstName} {selectedVoter.middleName || ''} {selectedVoter.lastName}
                    <VerificationStatus field="fullName" voter={selectedVoter} />
                  </dd>
                  
                  <dt className="col-sm-4">Father's Name</dt>
                  <dd className="col-sm-8">
                    {selectedVoter.fatherName || 'Not provided'}
                    <VerificationStatus field="fatherName" voter={selectedVoter} />
                  </dd>
                  
                  <dt className="col-sm-4">Gender</dt>
                  <dd className="col-sm-8">
                    {selectedVoter.gender || 'Not provided'}
                    <VerificationStatus field="gender" voter={selectedVoter} />
                  </dd>
                  
                  <dt className="col-sm-4">Age</dt>
                  <dd className="col-sm-8">
                    {selectedVoter.age || 'Not provided'}
                    <VerificationStatus field="age" voter={selectedVoter} />
                  </dd>
                  
                  <dt className="col-sm-4">Date of Birth</dt>
                  <dd className="col-sm-8">
                    {selectedVoter.dateOfBirth ? formatDate(selectedVoter.dateOfBirth) : 'Not provided'}
                    <VerificationStatus field="dateOfBirth" voter={selectedVoter} />
                  </dd>
                  
                  <dt className="col-sm-4">Email</dt>
                  <dd className="col-sm-8">
                    {console.log('Rendering email value:', selectedVoter.email)}
                    {selectedVoter.email || 'No email provided'}
                  </dd>
                  
                  <dt className="col-sm-4">Pincode</dt>
                  <dd className="col-sm-8">
                    {console.log('Rendering pincode value:', selectedVoter.pincode)}
                    {selectedVoter.pincode || 'Not provided'}
                    <VerificationStatus field="pincode" voter={selectedVoter} />
                  </dd>
                  
                  <dt className="col-sm-4">Voter ID</dt>
                  <dd className="col-sm-8">
                    {selectedVoter.voterId || 'Not provided'}
                    <VerificationStatus field="voterId" voter={selectedVoter} />
                  </dd>
                  
                  <dt className="col-sm-4">Wallet Address</dt>
                  <dd className="col-sm-8" style={{ wordBreak: 'break-all' }}>
                    {selectedVoter.walletAddress || 'Not provided'}
                  </dd>
                </dl>
                
                {/* Add Verification Status Section */}
                <div className="mt-3 mb-4">
                  <h6 className="border-bottom pb-2 d-flex justify-content-between align-items-center">
                    Verification Status
                    <Button 
                      variant="outline-primary"
                      size="sm"
                      disabled={verificationLoading || !selectedVoter?.voterId}
                      onClick={() => verifyVoterDetails(selectedVoter)}
                      className="ms-2"
                    >
                      <FaSync className={verificationLoading ? 'fa-spin me-1' : 'me-1'} /> 
                      {verificationLoading ? 'Verifying...' : 'Verify'}
                    </Button>
                  </h6>
                  
                  {verificationLoading ? (
                    <div className="d-flex align-items-center">
                      <Spinner animation="border" size="sm" className="me-2" />
                      <span>Verifying voter details...</span>
                    </div>
                  ) : verificationError ? (
                    <Alert variant="warning" className="py-2">
                      <small>{verificationError}</small>
                    </Alert>
                  ) : verificationData ? (
                    <Alert 
                      variant={
                        getMismatchedFields(selectedVoter, verificationData).length === 0 ? 
                          'success' : 'danger'
                      }
                      className="py-2 mb-0"
                    >
                      <small>
                        {getMismatchedFields(selectedVoter, verificationData).length === 0 ? 
                          'Voter verified successfully against external database.' : 
                          (() => {
                            const mismatches = getMismatchedFields(selectedVoter, verificationData);
                            return (
                              <>
                                <strong>Verification failed!</strong> The following fields don't match with the external database:
                                <ul className="mb-0 mt-1 ps-3">
                                  {mismatches.map((field, index) => (
                                    <li key={index}>{field}</li>
                                  ))}
                                </ul>
                              </>
                            );
                          })()
                        }
                      </small>
                    </Alert>
                  ) : (
                    <div className="text-muted">
                      <small>Verification data not available</small>
                    </div>
                  )}
                </div>
              </Col>
              <Col md={6}>
                <h6>Voter ID Image</h6>
                <div className="mt-2">
                  {selectedVoter.voterIdImage ? (
                    <>
                      <div className="p-2 bg-light border rounded mb-2" style={{ textAlign: 'center' }}>
                        <img 
                          src={getImageUrl(selectedVoter.voterIdImage)} 
                          alt="Voter ID" 
                          className="img-fluid border rounded shadow-sm cursor-pointer" 
                          style={{ maxHeight: '150px', cursor: 'pointer' }}
                          onClick={() => {
                            const imageUrl = getImageUrl(selectedVoter.voterIdImage);
                            setPreviewImageUrl(imageUrl);
                            setPreviewImageType('voterId');
                            setShowImageModal(true);
                            console.log('Opening image preview:', imageUrl);
                          }}
                          onError={(e) => {
                            console.error('Error loading voter ID image');
                            console.log('Full URL attempted:', getImageUrl(selectedVoter.voterIdImage));
                            e.target.src = '/placeholder-id.png'; // Fallback image
                          }}
                        />
                        {/* <div className="mt-1 small text-muted">Click to enlarge</div> */}
                      </div>
                      <div className="d-flex justify-content-center mb-3">
                          <Button 
                          variant="primary"
                            size="sm"
                          className="px-3 py-2"
                          onClick={() => {
                            const imageUrl = getImageUrl(selectedVoter.voterIdImage);
                            setPreviewImageUrl(imageUrl);
                            setPreviewImageType('voterId');
                            setShowImageModal(true);
                          }}
                        >
                          <i className="fas fa-search-plus me-2"></i> View Full Image
                          </Button>
                        </div>
                    </>
                  ) : (
                    <div className="text-muted">No voter ID image available</div>
                  )}
                  
                  <h6 className="mt-4 border-bottom pb-2 d-flex justify-content-between align-items-center">
                    Face Verification Image
                    <Button 
                      variant="outline-primary"
                      size="sm"
                      disabled={faceVerificationLoading || !selectedVoter?.faceImage}
                      onClick={() => verifyVoterFace(selectedVoter)}
                      className="ms-2"
                    >
                      <FaSync className={faceVerificationLoading ? 'fa-spin me-1' : 'me-1'} /> 
                      {faceVerificationLoading ? 'Verifying...' : 'Verify Face'}
                    </Button>
                  </h6>
                  {selectedVoter.faceImage ? (
                    <>
                      <div className="p-2 bg-light border rounded mb-2" style={{ textAlign: 'center' }}>
                        <img
                          src={getImageUrl(selectedVoter.faceImage)}
                          alt="Voter Face"
                          className="img-fluid border rounded shadow-sm cursor-pointer"
                          style={{ maxHeight: '150px', cursor: 'pointer' }}
                          onClick={() => {
                            const imageUrl = getImageUrl(selectedVoter.faceImage);
                            setPreviewImageUrl(imageUrl);
                            setPreviewImageType('face');
                            setShowImageModal(true);
                          }}
                          onError={(e) => {
                            console.error('Error loading face image');
                            console.log('Full URL attempted:', getImageUrl(selectedVoter.faceImage));
                            e.target.src = '/placeholder-face.png'; // Fallback image
                          }}
                        />
                        {/* <div className="mt-1 small text-muted">Click to enlarge</div> */}
                      </div>
                      <div className="d-flex justify-content-center mb-3">
                        <Button
                          variant="primary"
                          size="sm"
                          className="px-3 py-2"
                          onClick={() => {
                            const imageUrl = getImageUrl(selectedVoter.faceImage);
                            setPreviewImageUrl(imageUrl);
                            setPreviewImageType('face');
                            setShowImageModal(true);
                          }}
                        >
                          <i className="fas fa-search-plus me-2"></i> View Full Image
                        </Button>
                      </div>
                      
                      {/* Face Verification Status Section */}
                      <div className="mt-3 mb-3">
                        {faceVerificationLoading ? (
                          <div className="d-flex align-items-center">
                            <Spinner animation="border" size="sm" className="me-2" />
                            <span>Verifying face biometrics...</span>
                          </div>
                        ) : faceVerificationError ? (
                          <Alert variant="warning" className="py-2">
                            <small>{faceVerificationError}</small>
                          </Alert>
                        ) : faceVerificationData ? (
                          <Alert 
                            variant={faceVerificationData.verified ? 'success' : 'danger'}
                            className="py-2 mb-0"
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <small>{faceVerificationData.message}</small>
                              <Badge bg={faceVerificationData.verified ? 'success' : 'danger'}>
                                {faceVerificationData.verified ? 'Match' : 'No Match'}
                              </Badge>
                            </div>
                            {faceVerificationData.similarity_score && (
                              <div className="mt-1">
                                <small>
                                  Similarity Score: <strong>{Math.round(faceVerificationData.similarity_score)}%</strong>
                                </small>
                              </div>
                            )}
                          </Alert>
                        ) : (
                          <div className="text-muted">
                            <small>Face verification not performed. Click "Verify Face" to check identity.</small>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted">No face verification image available</div>
                  )}
                </div>
                
                <div className="mt-3">
                  <h6>Registration Status</h6>
                  <div className="d-flex align-items-center">
                    {getStatusBadge(selectedVoter.status)}
                    {selectedVoter.status === 'rejected' && (
                      <span className="ms-2">Reason: {selectedVoter.rejectionReason || 'No reason provided'}</span>
                    )}
                  </div>
                </div>
                
                <div className="mt-3">
                  <h6>Blockchain Status</h6>
                  <div>
                    {selectedVoter.blockchainRegistered ? (
                      <Badge bg="success">Registered on Blockchain</Badge>
                    ) : (
                      <Badge bg="warning">Not Registered on Blockchain</Badge>
                    )}
                  </div>
                  {selectedVoter.blockchainTxHash && (
                    <div className="mt-2 small">
                      <strong>Transaction Hash:</strong> 
                      <span className="d-block text-truncate">{selectedVoter.blockchainTxHash}</span>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          ) : (
            <Alert variant="danger">Failed to load voter details.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {selectedVoter && selectedVoter.status === 'pending' && (
            <>
              <Button 
                variant="success" 
                onClick={() => {
                  approveVoter(selectedVoter.id);
                  setShowDetailsModal(false);
                }}
                disabled={approvingVoter}
              >
                {approvingVoter ? 'Approving...' : 'Approve Voter'}
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  handleRejectClick(selectedVoter.id);
                  setShowDetailsModal(false);
                }}
                disabled={rejectingVoter}
              >
                Reject Voter
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Image Preview Modal */}
      <Modal 
        show={showImageModal} 
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
        className="image-preview-modal"
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title>{previewImageType === 'voterId' ? 'Voter ID Image' : 'Face Verification Image'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-3 px-0 bg-dark">
          {previewImageUrl ? (
            <div className="image-preview-container position-relative">
            <img 
              src={previewImageUrl}
                alt={previewImageType === 'voterId' ? 'Voter ID Full Size' : 'Face Verification Full Size'} 
              className="img-fluid"
                style={{
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  transition: 'transform 0.3s ease',
                }}
                onLoad={() => console.log('Image loaded successfully in modal')}
                onError={(e) => {
                  console.error('Failed to load image in modal:', previewImageUrl);
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = 'https://via.placeholder.com/800x600?text=Image+Failed+to+Load';
                }}
              />
              <div className="text-center text-light mt-2">
                <small>Press ESC key or click the X button to close</small>
              </div>
            </div>
          ) : (
            <div className="p-5 text-center text-light">
              <p>No image available to preview</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </Button>
          {previewImageUrl && (
          <Button 
            variant="primary" 
            as="a"
            href={previewImageUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default ApproveVoters; 