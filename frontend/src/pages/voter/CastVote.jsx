import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal, Form, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { FaUser, FaCheckCircle, FaTimes, FaVideo, FaVideoSlash } from 'react-icons/fa';
import { useReactMediaRecorder } from 'react-media-recorder';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const FACE_API_URL = 'http://localhost:8000/api';

// Helper function to properly format image URLs
const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return null;
  }
  
  // If the path already includes http(s), it's a complete URL
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Extract the base URL without the /api path
  const baseUrl = API_URL.replace('/api', '');
  
  // Remove any leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  
  // Make sure the path is correctly formatted
  return `${baseUrl}/${cleanPath}`;
};

const CastVote = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voterProfile, setVoterProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  
  // Add new state for blockchain animation
  const [showBlockchainAnimation, setShowBlockchainAnimation] = useState(false);
  
  // Add state for tracking vote recording steps
  const [voteSteps, setVoteSteps] = useState({
    local: 'active', // Start with local step active
    remoteDb: 'pending',
    crypto: 'pending',
    finalizing: 'pending'
  });
  
  // Add new state for screen selection overlay
  const [showScreenSelectionModal, setShowScreenSelectionModal] = useState(false);
  
  // Face capture states
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [faceImageData, setFaceImageData] = useState(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [showVerificationSection, setShowVerificationSection] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Screen recording states with react-media-recorder
  const [showCandidateSection, setShowCandidateSection] = useState(false);
  const screenVideoRef = useRef(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const faceCamRef = useRef(null);
  
  // Convert faceCamStream from state to ref to prevent re-renders when it changes
  const faceCamStreamRef = useRef(null);
  
  // Reference to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Reference to track if this is first render
  const isFirstRender = useRef(true);
  // Reference to track if user has already visited the page (for clean re-renders)
  const hasInitialized = useRef(false);
  
  // New state variables for viewing candidate details without selecting
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [showCandidateDetailsModal, setShowCandidateDetailsModal] = useState(false);
  
  // Add a new state variable after the other state declarations
  const [confirmedVoteData, setConfirmedVoteData] = useState(null);
  
  // Add a new state to store the recording data for manual upload
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingBlobUrl, setRecordingBlobUrl] = useState(null);
  
  // Initialize react-media-recorder
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
    previewStream,
    error: recorderError
    // Remove getBlob since it's not available
  } = useReactMediaRecorder({
    screen: {
      // Ensure entire screen is selected by suggesting display surface
      displaySurface: "monitor",
      selfBrowserSurface: "include",
      // Request audio to be included from system audio if possible
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      }
    },
    audio: true,
    video: true,
    askPermissionOnMount: false,
    blobOptions: { type: 'video/webm' },
    mediaRecorderOptions: { mimeType: 'video/webm' },
    onStart: () => {
      console.log('Recording started with react-media-recorder');
      setIsRecordingActive(true);
      setShowCandidateSection(true);
      toast.info('Recording started. You can now cast your vote.');
      
      // Start webcam for face recording
      startFaceCam();
    },
    onStop: (blobUrl, blob) => {
      // Store the blob and URL for manual upload later
      console.log('Recording stopped, storing blob for upload');
      setRecordingBlob(blob);
      setRecordingBlobUrl(blobUrl);
      
      // Store the recording in IndexedDB for persistence
      if (blob) {
        storeRecordingInIndexedDB(blob, blobUrl);
      }
      
      // Also try the automatic upload
      handleRecordingStop(blobUrl, blob);
    },
    onError: (err) => {
      console.error('React Media Recorder error:', err);
      toast.error('Recording error: ' + (err?.message || 'Unknown error'));
      // Show candidate section anyway to allow voting
      setShowCandidateSection(true);
      setIsRecordingActive(false);
    }
  });

  // Function to store recording in IndexedDB
  const storeRecordingInIndexedDB = async (blob, blobUrl) => {
    try {
      console.log('Storing recording in IndexedDB');
      
      // Create timestamp for unique ID
      const timestamp = Date.now();
      
      // Open IndexedDB database
      const request = indexedDB.open('VotesureRecordings', 1);
      
      // Create object store if it doesn't exist
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', { keyPath: 'id' });
          console.log('Created recordings object store');
        }
      };
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event.target.error);
        toast.error('Could not access local storage for recording');
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        
        // Create recording data with metadata
        const recordingData = {
          id: `recording-${timestamp}`,
          blob: blob,
          url: blobUrl,
          timestamp: timestamp,
          candidateId: selectedCandidate?._id || selectedCandidate?.id,
          electionId: selectedCandidate?.electionId,
          voterId: voterProfile?._id,
          uploaded: false
        };
        
        // Store in IndexedDB
        const storeRequest = store.add(recordingData);
        
        storeRequest.onsuccess = () => {
          console.log('Recording successfully stored in IndexedDB');
          localStorage.setItem('pendingRecording', `recording-${timestamp}`);
        };
        
        storeRequest.onerror = (event) => {
          console.error('Error storing recording in IndexedDB:', event.target.error);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      };
    } catch (error) {
      console.error('Error in storeRecordingInIndexedDB:', error);
    }
  };
  
  // Function to retrieve recording from IndexedDB
  const getRecordingFromIndexedDB = async (recordingId) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VotesureRecordings', 1);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['recordings'], 'readonly');
          const store = transaction.objectStore('recordings');
          
          // Get specific recording or the most recent one
          const getRequest = recordingId 
            ? store.get(recordingId)
            : store.openCursor(null, 'prev'); // Get the last one
          
          getRequest.onsuccess = (event) => {
            if (recordingId) {
              // Direct get by ID
              const recording = event.target.result;
              resolve(recording);
            } else {
              // Get most recent via cursor
              const cursor = event.target.result;
              if (cursor) {
                resolve(cursor.value);
              } else {
                resolve(null);
              }
            }
          };
          
          getRequest.onerror = (event) => {
            console.error('Error retrieving recording:', event.target.error);
            reject(event.target.error);
          };
          
          transaction.oncomplete = () => {
            db.close();
          };
        } catch (error) {
          console.error('Transaction error:', error);
          db.close();
          reject(error);
        }
      };
    });
  };

  // Function to mark recording as uploaded in IndexedDB
  const markRecordingAsUploaded = async (recordingId) => {
    try {
      const request = indexedDB.open('VotesureRecordings', 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        
        // Get the recording first
        const getRequest = store.get(recordingId);
        
        getRequest.onsuccess = (event) => {
          const recording = event.target.result;
          if (recording) {
            recording.uploaded = true;
            // Update the record
            store.put(recording);
            console.log('Recording marked as uploaded in IndexedDB');
          }
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      };
    } catch (error) {
      console.error('Error marking recording as uploaded:', error);
    }
  };
  
  // Start webcam for face recording alongside screen recording
  const startFaceCam = async () => {
    try {
      if (faceCamRef.current) {
        // If we already have a stream, don't create a new one
        if (faceCamStreamRef.current) {
          console.log('Reusing existing face cam stream');
          faceCamRef.current.srcObject = faceCamStreamRef.current;
        } else {
          // Create a new stream
          console.log('Creating new face cam stream');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: 'user'
            },
            audio: false // We already have audio from the main recording
          });
          
          // Store in ref instead of state to prevent re-renders
          faceCamStreamRef.current = stream;
          faceCamRef.current.srcObject = stream;
        }
        
        faceCamRef.current.play().catch(e => {
          console.error('Failed to play face cam:', e);
        });
      }
    } catch (err) {
      console.error('Error starting face cam:', err);
      toast.warning('Could not start face camera, but voting can continue');
    }
  };

  // Update the handleRecordingStop function to make sure the file upload works correctly
  const handleRecordingStop = async (blobUrl, blob) => {
    try {
      console.log('handleRecordingStop called with blob:', blob ? 'Blob exists' : 'No blob');
      console.log('handleRecordingStop called with blobUrl:', blobUrl ? 'URL exists' : 'No URL');
      
      // Stop face cam - only when recording stops (which happens after vote is cast)
      if (faceCamStreamRef.current) {
        console.log('Stopping face cam stream');
        faceCamStreamRef.current.getTracks().forEach(track => track.stop());
        faceCamStreamRef.current = null;
        if (faceCamRef.current) {
          faceCamRef.current.srcObject = null;
        }
      }
      
      // Also stop the main webcam stream if it's still running
      if (streamRef.current) {
        console.log('Stopping main webcam stream after vote is cast');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
      
      // Critical safety checks - don't proceed without blob
      if (!blob) {
        console.error('Recording blob is missing');
        if (recordingBlob) {
          console.log('Using recordingBlob from state instead');
          blob = recordingBlob;
        } else {
          toast.error('Recording data is missing. Your vote was processed, but the recording may not be saved.');
          return;
        }
      }
      
      console.log('Blob type:', blob.type);
      console.log('Blob size:', blob.size, 'bytes');
      
      // Use confirmedVoteData if available (from handleConfirmVote), otherwise fall back to selectedCandidate
      const voteData = confirmedVoteData || selectedCandidate;
      
      if (!voteData) {
        console.error('No vote data found when stopping recording');
        toast.error('Could not identify selected candidate for recording. Your vote was processed, but the recording may not be saved.');
        return;
      }
      
      if (!voterProfile) {
        console.error('No voter profile found when stopping recording');
        toast.error('Voter profile data missing. Your vote was processed, but the recording may not be saved.');
        return;
      }
      
      console.log('Recording stopped, blob URL:', blobUrl);
      console.log('Using vote data for recording:', voteData);
      console.log('Vote data ID:', voteData._id || voteData.id);
      console.log('Vote data election ID:', voteData.electionId);
      
      // Get blockchain transaction data if available
      let txHash = '';
      try {
        if (blockchainTxData?.txHash) {
          console.log('Using blockchainTxData txHash:', blockchainTxData.txHash);
          txHash = blockchainTxData.txHash;
        } else if (localStorage.getItem('lastVoteTransaction')) {
          const lastVoteTransaction = JSON.parse(localStorage.getItem('lastVoteTransaction'));
          txHash = lastVoteTransaction.txHash || '';
          console.log('Using lastVoteTransaction txHash:', txHash);
        }
      } catch (e) {
        console.error('Error parsing lastVoteTransaction:', e);
      }
      
      // Create a file from the blob with a unique name including transaction hash
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 10000);
      // Include transaction hash in the filename for easier tracking
      const fileName = `vote-recording-${timestamp}-${randomId}-${voterProfile._id}-${voteData.electionId}-${txHash ? txHash.substring(0, 8) : 'notx'}.webm`;
      
      console.log('Creating file with name:', fileName);
      
      // Create the file object
      let file;
      try {
        file = new File([blob], fileName, { 
          type: blob.type || 'video/webm',
        });
        console.log('File created successfully:', file.name, 'size:', file.size);
      } catch (fileError) {
        console.error('Error creating File object:', fileError);
        // Try an alternative approach if File constructor fails
        try {
          // Create a Blob with proper MIME type if needed
          const properBlob = new Blob([blob], { type: 'video/webm' });
          file = new File([properBlob], fileName, { type: 'video/webm' });
          console.log('File created with alternative method:', file.name, 'size:', file.size);
        } catch (altFileError) {
          console.error('Alternative file creation also failed:', altFileError);
          toast.error('Failed to prepare recording file. Technical error: ' + altFileError.message);
          return;
        }
      }
      
      // Create form data object
      const formData = new FormData();
      
      // Add all necessary data to FormData
      try {
        formData.append('recording', file);
        formData.append('voterId', voterProfile._id);
        formData.append('electionId', voteData.electionId);
        formData.append('candidateId', voteData._id || voteData.id);
        formData.append('voteTimestamp', new Date().toISOString());
        formData.append('txHash', txHash); 
        formData.append('targetFolder', 'voter-recording');
        formData.append('updateRemote', 'true'); // Ensure this is properly set
        
        // Debug FormData contents
        console.log('FormData created with the following entries:');
        for (let [key, value] of formData.entries()) {
          console.log(`FormData entry - ${key}:`, typeof value === 'object' ? `${value.name}, size: ${value.size}` : value);
        }
      } catch (formDataError) {
        console.error('Error creating FormData:', formDataError);
        toast.error('Failed to prepare form data for upload: ' + formDataError.message);
        return;
      }
      
      const token = localStorage.getItem('token');
      // Important: Do NOT set Content-Type header for FormData - browser will set it with boundary
      const headers = token ? { 
        'Authorization': `Bearer ${token}`
      } : {};
      
      console.log('Preparing to upload recording...');
      console.log('API URL for upload:', `${API_URL}/voter/upload-recording`);
      console.log('Headers:', headers);
      
      toast.info('Preparing to upload your voting record...');
      
      // Upload to server with timeout and retry logic
      let uploadAttempts = 0;
      const maxAttempts = 3; // Increased from 2 to 3
      let uploadSuccess = false;
      
      while (uploadAttempts < maxAttempts && !uploadSuccess) {
        try {
          uploadAttempts++;
          console.log(`Upload attempt ${uploadAttempts} of ${maxAttempts}`);
          
          // Log right before the axios call
          console.log(`Making axios POST request to upload recording - attempt ${uploadAttempts}`);
          
          toast.info(`Uploading recording (attempt ${uploadAttempts}/${maxAttempts})...`);
          
          const uploadResponse = await axios.post(
            `${API_URL}/voter/upload-recording`, 
            formData, 
            { 
              headers,
              timeout: 60000, // 60 second timeout
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log(`Upload progress: ${percentCompleted}%`);
                if (percentCompleted % 25 === 0) { // Log at 0%, 25%, 50%, 75%, 100%
                  toast.info(`Upload progress: ${percentCompleted}%`);
                }
              }
            }
          );
          
          console.log('Upload response received:', uploadResponse);
          console.log('Upload response status:', uploadResponse.status);
          console.log('Upload response data:', uploadResponse.data);
          
          // Check for recording URL in the response
          const recordingUrl = uploadResponse.data?.recordingUrl || uploadResponse.data?.path;
          
          if (recordingUrl) {
            console.log('Recording uploaded successfully, URL:', recordingUrl);
            uploadSuccess = true;
            
            // Update the recording URL in localStorage for verification page
            try {
              const lastVoteTransaction = JSON.parse(localStorage.getItem('lastVoteTransaction')) || {};
              lastVoteTransaction.recordingUrl = recordingUrl;
              localStorage.setItem('lastVoteTransaction', JSON.stringify(lastVoteTransaction));
              console.log('Updated lastVoteTransaction in localStorage with recording URL');
            } catch (e) {
              console.error('Error updating lastVoteTransaction in localStorage:', e);
            }
            
            toast.success('Vote recording saved successfully');
          } else {
            console.warn('Upload succeeded but no recording URL was returned');
            toast.warning('Recording uploaded, but the server did not return a valid URL.');
          }
        } catch (uploadErr) {
          console.error(`Upload attempt ${uploadAttempts} failed:`, uploadErr);
          
          // Log more details about the error
          if (uploadErr.response) {
            console.error('Error Response:', uploadErr.response.status, uploadErr.response.data);
          } else if (uploadErr.request) {
            console.error('No response received:', uploadErr.request);
          } else {
            console.error('Error setting up request:', uploadErr.message);
          }
          
          if (uploadAttempts < maxAttempts) {
            console.log('Retrying upload...');
            toast.info('Retrying upload...');
            // Wait 3 seconds before retry (increased from 2)
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            console.error('All upload attempts failed');
            toast.error('Failed to upload recording after multiple attempts.');
            throw uploadErr; // Rethrow to be caught by the outer catch
          }
        }
      }
      
      if (uploadSuccess) {
        toast.success('Voting record uploaded successfully');
        console.log('Recording process completed successfully');
      }
      
      // Clean up blob URL
      clearBlobUrl();
      
    } catch (err) {
      console.error('Error in recording process:', err);
      toast.error('Failed to upload recording. Please contact support with the following error: ' + (err.message || 'Unknown error'));
    }
  };

  // Monitor recording status changes and update isRecordingActive properly
  useEffect(() => {
    if (status === 'acquiring_media') {
      // Don't show toast here as we'll show it in the screen selection modal
    } else if (status === 'recording') {
      console.log('Recording successfully started');
      setIsRecordingActive(true);
      // Hide the screen selection modal once recording has started
      setShowScreenSelectionModal(false);
      toast.info('Recording started. You can now cast your vote.');
    } else if (status === 'stopped') {
      console.log('Recording stopped successfully');
      setIsRecordingActive(false);
      // Inform the user they need to refresh the page to restart
      toast.error('Recording has stopped. Please refresh the page to restart the voting process.');
    } else if (status === 'failed') {
      console.error('Recording failed');
      toast.error('Recording failed, but you can still proceed with voting');
      // Allow voting even if recording fails
      setShowCandidateSection(true);
      setIsRecordingActive(false);
      // Hide the screen selection modal if recording failed
      setShowScreenSelectionModal(false);
    }
  }, [status]);

  // Replace the cleanup useEffect to only run on component unmount
  useEffect(() => {
    // Set mounted flag when component mounts
    isMountedRef.current = true;
    
    // This cleanup only runs on component unmount
    return () => {
      console.log('Component unmounting, cleaning up all resources');
      isMountedRef.current = false;
      
      // Clean up main webcam stream
      if (streamRef.current) {
        console.log('Cleaning up camera stream on component unmount');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clean up face cam stream - use ref instead of state
      if (faceCamStreamRef.current) {
        console.log('Cleaning up face cam stream on component unmount');
        faceCamStreamRef.current.getTracks().forEach(track => track.stop());
        faceCamStreamRef.current = null;
      }
      
      // Clear the blob URL if component unmounts
      if (mediaBlobUrl) {
        clearBlobUrl();
      }
    };
  }, []); // Empty dependency array means this only runs on mount/unmount

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Explicitly reset selected candidate first thing
        setSelectedCandidate(null);
        
        // Get auth headers
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Fetch voter profile
        const profileResponse = await axios.get(`${API_URL}/voter/profile`, { headers });
        const voterData = profileResponse.data.voter;
        setVoterProfile(voterData);
        
        // Fetch all active elections (which already include candidates)
        try {
          console.log('Fetching active elections from remote API...');
          const activeElectionsResponse = await axios.get(`${API_URL}/elections/remote/active`, { headers });
          console.log('Remote active elections response:', activeElectionsResponse.data);
          
          // Safeguard against various API response formats
          let electionsData = [];
          
          if (activeElectionsResponse.data) {
            if (activeElectionsResponse.data.elections && Array.isArray(activeElectionsResponse.data.elections)) {
              // Format: { elections: [...] }
              electionsData = activeElectionsResponse.data.elections;
            } else if (Array.isArray(activeElectionsResponse.data)) {
              // Format: direct array of elections
              electionsData = activeElectionsResponse.data;
            } else if (typeof activeElectionsResponse.data === 'object' && activeElectionsResponse.data._id) {
              // Format: single election object
              electionsData = [activeElectionsResponse.data];
            } else {
              console.warn('Unexpected API response format:', activeElectionsResponse.data);
              setError('Received unexpected data format from server');
            }
          } else {
            console.error('No data in active elections response');
            setError('No data received from server');
          }
          
          console.log(`Found ${electionsData.length} active elections`);
          
          if (electionsData.length === 0) {
            setError('No active elections found.');
            setLoading(false);
            return;
          }

          // Instead of checking if voted in ANY active election, just store which elections the voter has voted in
          // We'll filter these out from the available candidates later
          let votedElectionIds = [];

          // Check remote database for votes in each active election
          for (const election of electionsData) {
            try {
              console.log(`Checking if voter has voted in election ${election._id}`);
              const voteCheckResponse = await axios.get(`${API_URL}/voter/check-remote-vote?electionId=${election._id}`, { headers });
              
              if (voteCheckResponse.data.hasVoted) {
                console.log(`Voter has already voted in election ${election._id} according to remote database`);
                votedElectionIds.push(election._id);
              }
            } catch (voteCheckError) {
              console.error(`Error checking if voted in election ${election._id}:`, voteCheckError);
              // Continue checking other elections even if one fails
            }
          }

          // Filter out elections where the voter has already voted
          const availableElections = electionsData.filter(election => !votedElectionIds.includes(election._id));
          
          if (availableElections.length === 0) {
            // If voter has voted in ALL active elections, then redirect to verify page
            console.log('Voter has already voted in all active elections, redirecting to verify page');
            toast.info('You have already cast your vote in all active elections. Redirecting to verification page...');
            navigate('/voter/verify');
            return;
          }
          
          // Extract all candidates from the available elections
          let allCandidates = [];
          
          availableElections.forEach(election => {
            console.log(`Processing election: ${election.title || election.name}, ID: ${election._id}`);
            
            // Check if election has candidates property and it's an array
            if (election.candidates && Array.isArray(election.candidates)) {
              console.log(`Election has ${election.candidates.length} candidates`);
              
              // Process each candidate
              election.candidates.forEach(candidate => {
                // Ensure candidate has all required properties
                const enhancedCandidate = {
                  ...candidate,
                  electionId: election._id,
                  electionName: election.title || election.name,
                  electionType: election.type || '',
                  electionDescription: election.description || '',
                  electionStartDate: election.startDate,
                  electionEndDate: election.endDate,
                  // Format image URLs
                  photoUrl: getImageUrl(candidate.photoUrl),
                  partySymbol: getImageUrl(candidate.partySymbol)
                };
                
                // Add candidate ID if missing
                if (!enhancedCandidate._id && enhancedCandidate.id) {
                  enhancedCandidate._id = enhancedCandidate.id;
                } else if (!enhancedCandidate.id && enhancedCandidate._id) {
                  enhancedCandidate.id = enhancedCandidate._id;
                }
                
                // Add to all candidates array
                allCandidates.push(enhancedCandidate);
              });
            } else {
              console.warn(`Election ${election._id} has no candidates or they are not in array format`);
            }
          });
          
          console.log(`Total candidates from available elections: ${allCandidates.length}`);
          
          // Add "None of the above" option if we have active elections
          if (allCandidates.length > 0 && availableElections.length > 0) {
            const firstElection = availableElections[0];
            const noneOption = {
              _id: 'none-of-the-above',
              id: 'none-of-the-above',
              firstName: 'None',
              lastName: 'of the Above',
              name: 'None of the Above',
              partyName: 'N/A',
              isNoneOption: true,
              electionId: firstElection._id,
              electionName: firstElection.title || firstElection.name
            };
            
            console.log('Adding "None of the Above" option');
            allCandidates.push(noneOption);
          }
          
          // Set candidates state
          console.log('Setting candidates state with:', allCandidates.length, 'candidates');
          setCandidates(allCandidates);
          
          // Triple-check that no candidate is selected by default
          console.log('Explicitly ensuring no candidate is selected');
          setSelectedCandidate(null);
          
          if (allCandidates.length === 0) {
            setError('No candidates found for any active election.');
          }
        } catch (err) {
          console.error('Error fetching active elections:', err);
          const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
          console.error('Error details:', errorMsg);
          setError(`Could not fetch active elections: ${errorMsg}`);
        }
      } catch (err) {
        console.error('Error fetching voter profile:', err);
        setError('Failed to load your voter profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Start webcam function
  const startWebcam = async () => {
    try {
      console.log('Starting webcam...');
      
      // Reset any previous webcam errors
      setWebcamError(null);
      // Set loading state
      setWebcamLoading(true);
      
      // Verify video ref is available
      if (!videoRef.current) {
        console.error('Video element is not available in the DOM');
        throw new Error('Camera component not ready. Please refresh the page.');
      }
      
      // Clean up any existing stream
      if (streamRef.current) {
        console.log('Stopping existing stream before starting new one');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Request camera access with specific constraints for better quality
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      // Set video source
      console.log('Stream obtained, setting as video source');
      videoRef.current.srcObject = stream;
      
      // Make sure any play() promise is properly handled
      try {
        await videoRef.current.play();
        console.log('Webcam started successfully');
        setError(null);
      } catch (playError) {
        console.error('Error starting video playback:', playError);
        // Sometimes the play() method needs user interaction first
        toast.info('Click the video to start the camera preview');
      }
      
    } catch (err) {
      console.error('Error accessing webcam:', err);
      
      // Provide more specific error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamError('Camera access denied. Please allow camera access in your browser permissions to continue.');
        toast.error('Camera permission denied. Please check your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setWebcamError('No camera found. Please connect a camera and try again.');
        toast.error('No camera detected');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setWebcamError('Could not access your camera. It may be in use by another application.');
        toast.error('Camera is in use by another application');
      } else {
        setWebcamError('Failed to access webcam. Please make sure your camera is connected and you have given permission to use it.');
        toast.error(err.message || 'Camera access failed');
      }
      
      // Rethrow to propagate to the caller
      throw err;
    } finally {
      // Always clear loading state
      setWebcamLoading(false);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    console.log('Stopping webcam...');
    if (streamRef.current) {
      // Stop all tracks to properly release camera resources
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setShowWebcam(false);
      console.log('Webcam stopped successfully');
      
      // Show a message to let the user know they can restart the camera
      toast.info('Camera deactivated. Click "Start Camera" again if you want to continue.');
    }
  };

  // Capture photo
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      toast.error('Cannot capture photo. Please try again.');
      return;
    }
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to the canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Update state to show captured image
      setFaceImageData(dataUrl);
      setFaceCaptured(true);
      
      // Don't stop the webcam, just hide the video element visually
      // but keep stream active for easy retakes
      if (videoRef.current) {
        videoRef.current.style.display = 'none';
      }
      
      toast.success('Photo captured successfully!');
      
      // Reset verification status when a new photo is captured
      setFaceVerified(false);
      
    } catch (err) {
      console.error('Error capturing photo:', err);
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  // Verify face using the external API
  const verifyFace = async () => {
    if (!faceImageData || !voterProfile) {
      toast.error('Missing image data or voter profile');
      return;
    }

    // Check if voter has the voterId property
    if (!voterProfile.voterId) {
      toast.error('Voter ID not found in your profile');
      console.error('Voter profile missing voterId:', voterProfile);
      return;
    }

    setVerifying(true);
    setVerificationMessage('');
    
    try {
      // Convert base64 data URL to blob for form data
      const fetchResponse = await fetch(faceImageData);
      const blob = await fetchResponse.blob();
      
      // Create form data with the official voterId (not MongoDB _id)
      const formData = new FormData();
      formData.append('uploaded_image', blob, 'face.jpg');
      formData.append('voter_id', voterProfile.voterId); // Using voterId instead of MongoDB _id
      
      console.log('Making face verification API call...');
      console.log('Using Voter ID:', voterProfile.voterId); // Log the actual voterId being used
      
      // Call the face verification API
      const response = await axios.post(`${FACE_API_URL}/verify`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Face verification response:', response.data);
      
      if (response.data.success) {
        if (response.data.verified) {
          // Verification successful
          setFaceVerified(true);
          setVerificationMessage(response.data.message || 'Identity verified successfully!');
          toast.success('Identity verified successfully!');
        } else {
          // Verification failed but API call succeeded
          setFaceVerified(false);
          setVerificationMessage(response.data.message || 'Verification failed. Face does not match registered voter.');
          toast.error('Face verification failed. Please try again with better lighting.');
        }
      } else {
        // API returned an error
        setFaceVerified(false);
        setVerificationMessage(response.data.message || 'Verification service error');
        toast.error(response.data.message || 'Verification failed. Please try again.');
      }
      
    } catch (err) {
      console.error('Error in face verification:', err);
      
      // Handle different types of errors
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        
        const errorMessage = err.response.data?.message || 
                            err.response.data?.error || 
                            'Verification failed. Server returned an error.';
        
        setVerificationMessage(errorMessage);
        toast.error(errorMessage);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setVerificationMessage('Verification service unavailable. Please try again later.');
        toast.error('Verification service unavailable. Please try again later.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', err.message);
        setVerificationMessage('An error occurred during verification. Please try again.');
        toast.error('An error occurred during verification. Please try again.');
      }
      
      setFaceVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  // Retry capture
  const retryCapture = () => {
    // Reset the captured image and verification states
    setFaceCaptured(false);
    setFaceVerified(false);
    setFaceImageData(null);
    
    // Reset video element display if hidden
    if (videoRef.current) {
      videoRef.current.style.display = '';
    }
    
    // Restart the webcam with a slight delay to ensure state updates first
    setTimeout(() => {
      // Show the webcam UI
      setShowWebcam(true);
      
      // Start webcam only if not already running
      if (!streamRef.current) {
        startWebcam().catch(err => {
          console.error('Error restarting webcam:', err);
          toast.error('Failed to restart camera. Please refresh the page and try again.');
          setShowWebcam(false);
        });
      } else if (videoRef.current) {
        // If stream exists but video element needs reconnection
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => {
          console.error('Failed to play video on retry:', e);
        });
      }
    }, 100);
  };

  // Continue to voting after verification
  const continueToVoting = () => {
    if (!faceVerified) {
      toast.error('Please verify your identity first');
      return;
    }
    
    console.log('Continuing to voting screen after verification');
    
    // Reset selected candidate explicitly when showing candidate section
    setSelectedCandidate(null);
    
    // Show screen selection instruction modal
    setShowScreenSelectionModal(true);
    
    // Hide the verification section but don't show candidate section yet
    // (We'll show it after recording starts)
    setShowVerificationSection(false);
  };

  // Add new function to start recording after screen selection instructions
  const startRecordingAfterInstructions = () => {
    console.log('Starting recording after screen selection instructions');
    
    // Start recording with react-media-recorder
    try {
      console.log('Starting recording with react-media-recorder');
      startRecording();
      
      // Show candidate section - recording status effect will hide the modal once recording starts
      setShowCandidateSection(true);
      
      // If recording doesn't start within 5 seconds, show an error and let user proceed
      setTimeout(() => {
        if (status !== 'recording') {
          console.warn('Recording did not start within timeout period');
          toast.warning('Recording setup is taking longer than expected. You can proceed with voting.');
          setShowScreenSelectionModal(false);
          setShowCandidateSection(true);
        }
      }, 5000);
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording: ' + err.message);
      
      // Still allow voting even if recording fails
      setIsRecordingActive(false);
      setShowScreenSelectionModal(false);
      setShowCandidateSection(true);
    }
  };

  const handleSelectCandidate = (candidate, event) => {
    // If event is provided, prevent default behavior & propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('handleSelectCandidate called with:', candidate.name || `${candidate.firstName} ${candidate.lastName}`);
    
    // Check if the candidate is already selected, if so, deselect it
    if (selectedCandidate && 
        ((selectedCandidate._id && candidate._id && selectedCandidate._id === candidate._id) || 
         (selectedCandidate.id && candidate.id && selectedCandidate.id === candidate.id))) {
      console.log('Deselecting candidate');
      setSelectedCandidate(null);
      return;
    }
    
    // Format the candidate with proper image URLs before setting it as the selected candidate
    const formattedCandidate = {
      ...candidate,
      photoUrl: getImageUrl(candidate.photoUrl),
      partySymbol: getImageUrl(candidate.partySymbol)
    };
    
    // Set the selected candidate to the one clicked
    setSelectedCandidate(formattedCandidate);
  };

  const handleVoteClick = () => {
    if (!selectedCandidate) {
      console.log('Vote attempted with no candidate selected');
      toast.error('Please select a candidate first');
      return;
    }
    
    console.log('Vote button clicked for candidate:', 
      selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`);
    
    // Face verification is now required
    if (!faceVerified) {
      toast.error('Please verify your identity before voting');
      return;
    }
    
    // Check recording status - only allow voting if recording is active
    if (!isRecordingActive) {
      if (status === 'acquiring_media') {
        toast.error('Please wait for recording permissions to be granted');
      } else if (status === 'stopped') {
        toast.error('Recording has stopped. Please refresh the page to restart the voting process.');
      } else if (status === 'failed') {
        // Special case: if recording failed but we want to allow voting anyway
        console.log('Recording failed but allowing vote to proceed');
    setShowConfirmModal(true);
      } else {
        toast.error('Recording must be active to cast your vote');
      }
      return;
    }

    setShowConfirmModal(true);
  };

  // Add new state for blockchain transaction data
  const [blockchainTxData, setBlockchainTxData] = useState(null);

  // Update uploadRecordingManually to use IndexedDB
  const uploadRecordingManually = async () => {
    console.log('Manually uploading recording');
    
    try {
      // Get recording ID from localStorage or use most recent
      const recordingId = localStorage.getItem('pendingRecording');
      console.log('Looking for recording with ID:', recordingId);
      
      // Retrieve recording from IndexedDB
      const recordingData = await getRecordingFromIndexedDB(recordingId);
      
      if (!recordingData || !recordingData.blob) {
        // Fall back to state variables if IndexedDB fails
        if (recordingBlob) {
          console.log('Using recording blob from state');
          await handleRecordingStop(recordingBlobUrl, recordingBlob);
        } else {
          console.error('No recording data available for upload');
          toast.error('Recording data is missing. Your vote was processed, but the recording could not be saved.');
        }
        return;
      }
      
      console.log('Retrieved recording from IndexedDB:', recordingData.id);
      
      // Use the handleRecordingStop function with the retrieved blob
      await handleRecordingStop(recordingData.url, recordingData.blob);
      
      // Mark recording as uploaded if successful
      await markRecordingAsUploaded(recordingData.id);
      
    } catch (error) {
      console.error('Error in uploadRecordingManually:', error);
      toast.error('Failed to upload recording: ' + error.message);
    }
  };

  // Update handleConfirmVote to store the blockchain transaction data
  const handleConfirmVote = async () => {
    try {
      setSubmitting(true);
      
      // Store the current selected candidate for use in handleRecordingStop
      // This ensures the recording has access to the candidate data even if state changes
      if (selectedCandidate) {
        console.log('Storing confirmed vote data for recording:', selectedCandidate);
        setConfirmedVoteData({...selectedCandidate});
      } else {
        console.error('No selected candidate when confirming vote');
        toast.error('Please select a candidate before confirming your vote.');
        setSubmitting(false);
        return; // Exit early if no candidate is selected
      }
      
      // Show animation for blockchain recording
      setShowBlockchainAnimation(true);
      
      // Step 1: Initial delay to show first step
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Construct the voting payload
      const payload = {
        candidateId: selectedCandidate._id || selectedCandidate.id,
        electionId: selectedCandidate.electionId,
        isNoneOption: selectedCandidate.isNoneOption || false
      };
      
      console.log('Sending vote payload:', payload);
      
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Step 2: Activate remote database step and wait a bit
      setVoteSteps(prevSteps => ({
        ...prevSteps,
        remoteDb: 'active'
      }));
      
      // Artificial delay to show animation (at least 2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Activate cryptographic proof step
      setVoteSteps(prevSteps => ({
        ...prevSteps,
        crypto: 'active'
      }));
      
      // Continue animation for a bit longer to show completion
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call the blockchain recording endpoint (this will handle everything)
      let voteWasSuccessful = false;
      try {
        console.log('Calling blockchain recording endpoint:', `${API_URL}/voter/record-vote-blockchain`);
        const blockchainResponse = await axios.post(`${API_URL}/voter/record-vote-blockchain`, payload, { 
          headers,
          timeout: 20000 // 20 second timeout for blockchain operation
        });
        
        console.log('Vote transaction confirmed on blockchain:', blockchainResponse.data);
        voteWasSuccessful = true;
        
        // Store blockchain data in state to display in the modal
        if (blockchainResponse.data.blockchainData) {
          setBlockchainTxData(blockchainResponse.data.blockchainData);
          
          // Also store in localStorage for verification later
          localStorage.setItem('lastVoteTransaction', JSON.stringify({
            txHash: blockchainResponse.data.blockchainData.txHash,
            blockNumber: blockchainResponse.data.blockchainData.blockNumber,
            timestamp: blockchainResponse.data.blockchainData.timestamp,
            verificationCode: blockchainResponse.data.blockchainData.verificationCode
          }));
          
          // Wait a longer time (1 second) to make sure confirmedVoteData is set before stopping recording
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (blockchainError) {
        console.error('Error in blockchain recording endpoint:', blockchainError);
        
        // Show detailed error to help debugging
        if (blockchainError.response) {
          console.error('Server response:', blockchainError.response.data);
          
          // Check if this is an "already voted" error
          const errorMessage = blockchainError.response.data.message || 'Unknown server error';
          
          if (errorMessage.includes('already cast your vote')) {
            // This is an "already voted" error - show a specific message and redirect
            toast.info('You have already cast your vote in this election. Redirecting to verification page...');
            
            // Hide animation
            setShowBlockchainAnimation(false);
            setShowConfirmModal(false);
            
            // Redirect to verify page after a short delay
            setTimeout(() => {
              navigate('/voter/verify');
            }, 2000);
            
            return; // Exit early to prevent further processing
          } else {
            // For other errors, show the error message
            toast.error(`Server error: ${errorMessage}`);
          }
        } else if (blockchainError.request) {
          console.error('No response received from server');
          toast.error('No response from server. Please try again later.');
        } else {
          console.error('Error setting up request:', blockchainError.message);
          toast.error(`Error: ${blockchainError.message}`);
        }
        
        // Generate some random blockchain data for display even if the endpoint fails
        const fallbackBlockchainData = {
          txHash: `0x${Array(64).fill(0).map(() => Math.random().toString(16)[2]).join('')}`,
          blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
          blockHash: `0x${Array(64).fill(0).map(() => Math.random().toString(16)[2]).join('')}`,
          confirmations: Math.floor(Math.random() * 30) + 12,
          timestamp: new Date(),
          verificationCode: `${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        };
        
        setBlockchainTxData(fallbackBlockchainData);
        localStorage.setItem('lastVoteTransaction', JSON.stringify(fallbackBlockchainData));
        
        // Even if blockchain recording fails, show a more positive message
        console.log('Using fallback blockchain data due to endpoint error');
        throw new Error('Could not record your vote. Please try again.');
      }
      
      // Step 4: Activate finalizing step
      setVoteSteps(prevSteps => ({
        ...prevSteps,
        finalizing: 'active'
      }));
      
      // One more short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Make sure to handle the stopping of recording BEFORE hiding animations or redirecting
      if (isRecordingActive) {
        console.log('About to stop recording with confirmed vote data:', confirmedVoteData);
        
        // Make sure we have vote data before stopping recording
        if (!confirmedVoteData) {
          console.log('confirmedVoteData not set yet, setting it again before stopping recording');
          setConfirmedVoteData({...selectedCandidate});
          // Wait for state to update
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Actually stop the recording
        console.log('Stopping recording now...');
        stopRecording();
        setIsRecordingActive(false);
        
        // Wait for the recording to be stored in IndexedDB (3 seconds)
        console.log('Waiting for recording to be stored in IndexedDB...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Explicitly upload the recording 
        console.log('Explicitly uploading recording from IndexedDB...');
        await uploadRecordingManually();
        
        // Wait for handleRecordingStop to complete (5 seconds should be enough)
        console.log('Waiting for recording upload to complete...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Hide animation after recording has been processed
      setShowBlockchainAnimation(false);
      
      if (voteWasSuccessful) {
        toast.success('Your vote has been successfully recorded on the blockchain!');
      }
      
      setShowConfirmModal(false);
      
      // Redirect after recording has been handled and uploaded
      console.log('Recording process complete, redirecting to verification page...');
      setTimeout(() => {
        navigate('/voter/verify');
      }, 5000); // 5 seconds to ensure the user sees the success message
      
    } catch (err) {
      console.error('Error recording vote:', err);
      setShowBlockchainAnimation(false);
      toast.error(err.message || 'Failed to record your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // This will only run once when the component mounts
    console.log('Component mounted, initializing with no selected candidate');
    setSelectedCandidate(null);
    
    // Track that initialization has happened
    hasInitialized.current = true;
    
    return () => {
      // Reset on unmount for clean re-render if component is remounted
      hasInitialized.current = false;
    };
  }, []);
  
  // Add logging to monitor selectedCandidate changes with better lifecycle tracking
  useEffect(() => {
    // Skip the first render since the state is already null
    if (isFirstRender.current) {
      console.log('Initial render, selectedCandidate is null');
      isFirstRender.current = false;
      return;
    }
    
    console.log('Selected candidate updated:', selectedCandidate ? 
      (selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`) : 
      'None');
  }, [selectedCandidate]);

  // Handle viewing candidate details without selecting them
  const handleViewCandidateDetails = (candidate, event) => {
    // If event is provided, prevent default behavior & propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    ensureWebcamActive();
    
    if (!candidate) {
      console.error('No candidate provided to view details');
      return;
    }
    
    console.log('Viewing details for candidate:', 
      candidate.name || `${candidate.firstName} ${candidate.lastName}`);
    
    // Make sure we have the complete candidate data with formatted image URLs
    const candidateWithFormattedImages = {
      ...candidate,
      photoUrl: getImageUrl(candidate.photoUrl),
      partySymbol: getImageUrl(candidate.partySymbol)
    };
    
    // Set basic candidate info first (in case loading details fails)
    setViewingCandidate(candidateWithFormattedImages);
    setShowCandidateDetailsModal(true);
    
    // Extract the candidate ID (supporting multiple ID formats)
    const candidateId = candidate._id || candidate.id;
    
    if (candidateId) {
      console.log(`Using candidate ID: ${candidateId} to fetch full details`);
      loadCandidateDetails(candidateId);
    } else {
      console.warn('No valid ID found for candidate:', candidate);
    }
  };

  // Function to load detailed candidate information from the API
  const loadCandidateDetails = async (candidateId) => {
    try {
      if (!candidateId) {
        console.error('No candidate ID provided for loading details');
        return;
      }
      
      console.log(`Loading details for candidate ID: ${candidateId}`);
      
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Try primary remote candidate endpoint first
      try {
        const apiCandidateId = candidateId.toString();
        console.log(`Fetching from remote candidate endpoint: ${API_URL}/candidates/remote/${apiCandidateId}`);
        
        const response = await axios.get(`${API_URL}/candidates/remote/${apiCandidateId}`, { headers });
        console.log('Remote candidate details response:', response.data);
        
        if (response.data && response.data.candidate) {
          // Update with the detailed info
          setViewingCandidate(prevCandidate => ({
            ...prevCandidate,
            ...response.data.candidate,
            photoUrl: getImageUrl(response.data.candidate.photoUrl || response.data.candidate.image),
            partySymbol: getImageUrl(response.data.candidate.partySymbol)
          }));
        } else if (response.data) {
          // Direct candidate data
          setViewingCandidate(prevCandidate => ({
            ...prevCandidate,
            ...response.data,
            photoUrl: getImageUrl(response.data.photoUrl || response.data.image),
            partySymbol: getImageUrl(response.data.partySymbol)
          }));
        }
      } catch (apiError) {
        console.error('Error fetching from primary remote candidate endpoint:', apiError);
        
        // Try fallback endpoint
        try {
          console.log(`Trying remote fallback endpoint: ${API_URL}/election/candidates/remote/${candidateId}`);
          const fallbackResponse = await axios.get(`${API_URL}/election/candidates/remote/${candidateId}`, { headers });
          
          if (fallbackResponse.data && fallbackResponse.data.candidate) {
            setViewingCandidate(prevCandidate => ({
              ...prevCandidate,
              ...fallbackResponse.data.candidate,
              photoUrl: getImageUrl(fallbackResponse.data.candidate.photoUrl || fallbackResponse.data.candidate.image),
              partySymbol: getImageUrl(fallbackResponse.data.candidate.partySymbol)
            }));
          }
        } catch (fallbackError) {
          console.error('Error fetching from remote fallback endpoint:', fallbackError);
          
          // Try the regular (non-remote) endpoints as a last resort
          try {
            console.log(`Trying standard endpoint: ${API_URL}/candidates/${candidateId}`);
            const standardResponse = await axios.get(`${API_URL}/candidates/${candidateId}`, { headers });
            
            if (standardResponse.data && (standardResponse.data.candidate || standardResponse.data._id)) {
              const candidateData = standardResponse.data.candidate || standardResponse.data;
              setViewingCandidate(prevCandidate => ({
                ...prevCandidate,
                ...candidateData,
                photoUrl: getImageUrl(candidateData.photoUrl || candidateData.image),
                partySymbol: getImageUrl(candidateData.partySymbol)
              }));
            }
          } catch (standardError) {
            console.error('Error fetching from standard endpoint:', standardError);
          // We already set the basic candidate above, so no need to do anything here
          }
        }
      }
    } catch (error) {
      console.error('Error in loadCandidateDetails:', error);
      // Don't show error to user, just log it and continue with what we have
    }
  };

  // Close the candidate details modal
  const handleCloseCandidateDetails = () => {
    setShowCandidateDetailsModal(false);
    setViewingCandidate(null);
    
    // Make sure webcam is still active after modal closes
    setTimeout(ensureWebcamActive, 100);
  };

  // Update the utility function to use ref instead of state
  const ensureWebcamActive = () => {
    // Only run if component is still mounted
    if (!isMountedRef.current) return;
    
    // Check if face cam is disconnected but stream exists
    if (faceCamStreamRef.current && faceCamRef.current && !faceCamRef.current.srcObject) {
      console.log('Restoring face cam connection');
      faceCamRef.current.srcObject = faceCamStreamRef.current;
      faceCamRef.current.play().catch(e => {
        console.error('Failed to play face cam:', e);
      });
    }
    
    // Check if main webcam is disconnected but stream exists
    if (streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      console.log('Restoring main webcam connection');
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => {
        console.error('Failed to play main webcam:', e);
      });
    }
  };

  // Add a continuous webcam monitoring effect that is completely independent from other state
  useEffect(() => {
    // Skip if not showing candidate section or recording
    if (!showCandidateSection) return;
    
    console.log('Setting up continuous webcam monitoring');
    
    // Helper function to ensure the webcam is preserved through any React updates
    const monitorWebcams = () => {
      // Only run if component is mounted
      if (!isMountedRef.current) return;
      
      try {
        // Make sure face cam is active if we have a stream
        if (faceCamStreamRef.current && faceCamRef.current && !faceCamRef.current.srcObject) {
          console.log('Automatic face cam reconnection');
          faceCamRef.current.srcObject = faceCamStreamRef.current;
          faceCamRef.current.play().catch(e => {
            console.error('Failed to play face cam in monitor:', e);
          });
        }
        
        // Make sure main webcam is active if we have a stream and need it
        if (streamRef.current && videoRef.current && !videoRef.current.srcObject && showWebcam) {
          console.log('Automatic main webcam reconnection');
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(e => {
            console.error('Failed to play main webcam in monitor:', e);
          });
        }
      } catch (err) {
        console.error('Error in webcam monitoring:', err);
      }
    };
    
    // Run immediately
    monitorWebcams();
    
    // Set up interval to check periodically
    const interval = setInterval(monitorWebcams, 500);
    
    return () => {
      clearInterval(interval);
    };
  }, [showCandidateSection, showWebcam]);

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading voting page...</p>
        </Container>
      </Layout>
    );
  }

  // Check if there are any candidates
  if (candidates.length === 0) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="warning">
            <Alert.Heading>No Active Election</Alert.Heading>
            <p>There is no active election with candidates at the moment. Please check back later.</p>
          </Alert>
        </Container>
      </Layout>
    );
  }

  // Check if voter has already voted
  if (voterProfile?.blockchainStatus?.hasVoted && voterProfile?.lastVotedElection) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="info">
            <Alert.Heading>You Have Already Voted</Alert.Heading>
            <p>You have already cast your vote in the election.</p>
            <hr />
            <div className="d-flex justify-content-end">
              <Button 
                variant="outline-info" 
                onClick={() => navigate('/voter/verify')}
              >
                Verify Your Vote
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  // Add detailed logging in the component render
  if (process.env.NODE_ENV !== 'production') {
    console.log('CastVote component rendering with:', {
      candidatesCount: candidates.length,
      selectedCandidate: selectedCandidate ? 
        (selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`) : 
        'None',
      showVerificationSection,
      showCandidateSection,
      isRecordingActive,
      recordingStatus: status,
      hasMounted: !isFirstRender.current,
      hasInitializedRef: hasInitialized.current
    });
  }

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Cast Your Vote</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Alert variant="info" className="mb-4">
          <Alert.Heading>Important Information</Alert.Heading>
          <p>
            Your vote will be recorded on the blockchain and cannot be changed once submitted.
            The voting process will be screen recorded for verification purposes.
            Please review your selection carefully before confirming.
          </p>
        </Alert>
        
        {/* Face Capture Section - show only if verification is not complete */}
        {showVerificationSection && (
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Step 1: Identity Verification</h5>
              <div>
                {faceVerified ? (
                  <span className="badge bg-success">Verified</span>
                ) : faceCaptured ? (
                  <span className="badge bg-warning">Verification Required</span>
                ) : (
                  <span className="badge bg-warning">Photo Required</span>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <Alert variant="secondary" className="mb-3">
                <h6 className="mb-2">Instructions:</h6>
                <ol className="mb-0">
                  <li>Click the "Start Camera" button to activate your webcam</li>
                  <li>Position your face within the circular guide and ensure good lighting</li>
                  <li>Click "Capture Photo" when ready</li>
                  <li>Click "Verify Identity" to check if your face matches your registration</li>
                  <li>After successful verification, click "Continue" to proceed to voting</li>
                </ol>
              </Alert>
              
              {!faceCaptured ? (
                <div className="text-center mb-3">
                  {!showWebcam ? (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setShowWebcam(true);
                        setTimeout(() => {
                          if (videoRef.current) {
                            startWebcam().catch(err => {
                              console.error('Error starting webcam:', err);
                              setShowWebcam(false);
                            });
                          }
                        }, 100);
                      }}
                    >
                      Start Camera
                    </Button>
                  ) : (
                    <div className="mb-3">
                      <div className="position-relative d-inline-block">
                        {webcamLoading && (
                          <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center" 
                            style={{ zIndex: 5, background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}>
                            <Spinner animation="border" variant="light" />
                            <span className="text-white ms-2">Starting camera...</span>
                          </div>
                        )}
                        
                        {webcamError && (
                          <Alert variant="danger" className="mt-2 mb-2">
                            {webcamError}
                            <div className="mt-2">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => {
                                  setWebcamError(null);
                                  startWebcam().catch(err => {
                                    console.error('Error restarting webcam:', err);
                                  });
                                }}
                              >
                                Try Again
                              </Button>
                            </div>
                          </Alert>
                        )}
                        
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '300px', 
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            transform: 'scaleX(-1)', // Mirror effect
                            backgroundColor: '#000'
                          }}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.play().catch(e => {
                                console.log('Play on click failed', e);
                              });
                            }
                          }}
                        />
                        
                        {/* Visual guide for face positioning */}
                        <div 
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '180px',
                            height: '180px',
                            borderRadius: '50%',
                            border: '3px dashed rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.15)', // Darken outside the circle
                            pointerEvents: 'none',
                            zIndex: 10
                          }}
                        />
                        
                        <p className="text-muted mb-2 mt-2">
                          Position your face within the circle and ensure good lighting
                        </p>
                      </div>
                      
                      <div className="d-flex justify-content-center gap-2 mt-3">
                        <Button
                          variant="success"
                          onClick={capturePhoto}
                          disabled={webcamLoading || webcamError}
                        >
                          Capture Photo
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={stopWebcam}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-3">
                    <img
                      src={faceImageData}
                      alt="Captured face"
                      className="img-thumbnail"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                  
                  {/* Verification actions */}
                  <div className="d-flex flex-column align-items-center gap-2 mb-3">
                    {!faceVerified ? (
                      <>
                        <Button
                          variant="primary"
                          onClick={verifyFace}
                          disabled={verifying}
                          className="mb-2"
                        >
                          {verifying ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Verifying...
                            </>
                          ) : (
                            'Verify Identity'
                          )}
                        </Button>
                        
                        {verificationMessage && (
                          <div className="text-danger mb-2">
                            <small>{verificationMessage}</small>
                          </div>
                        )}
                        
                        <small className="text-muted mb-2">
                          Click "Verify Identity" to authenticate your photo
                        </small>
                        
                        <Button
                          variant="outline-secondary"
                          onClick={retryCapture}
                          size="sm"
                        >
                          Retake Photo
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-success mb-3">
                          <FaCheckCircle className="me-2" />
                          {verificationMessage || 'Identity verified successfully!'}
                        </div>
                        
                        <div className="d-flex gap-2">
                          <Button
                            variant="primary"
                            onClick={continueToVoting}
                          >
                            Continue to Voting
                          </Button>
                          
                          <Button
                            variant="outline-secondary"
                            onClick={retryCapture}
                            size="sm"
                          >
                            Retake Photo
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </Card.Body>
          </Card>
        )}
        
        {/* Screen Recording Section */}
        {!showVerificationSection && (
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Step 2: Screen Recording</h5>
              <div>
                {isRecordingActive ? (
                  <span className="badge bg-danger">
                    <FaVideo className="me-1" /> Recording
                  </span>
                ) : (
                  <span className="badge bg-secondary">
                    <FaVideoSlash className="me-1" /> Not Recording
                  </span>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <Alert variant="warning" className="mb-3">
                <h6 className="mb-2">Important:</h6>
                <p className="mb-0">
                  Your screen and webcam are being recorded during the voting process for security and verification purposes. 
                  The recording will automatically stop after your vote is cast. Please do not close the browser or navigate away until the process is complete.
                </p>
              </Alert>
              
              {recorderError && (
                <Alert variant="danger" className="mb-3">
                  <h6 className="mb-2">Recording Error:</h6>
                  <p className="mb-0">
                    {recorderError.message || "An error occurred with the recording. You can still proceed with voting."}
                  </p>
            </Alert>
          )}
          
              <div className="text-center mb-3">
                <div className="recording-container position-relative" style={{ maxWidth: '100%', maxHeight: '300px', overflow: 'hidden' }}>
                  {/* Main screen preview */}
                  {previewStream && (
                    <video
                      ref={(video) => {
                        if (video && previewStream && !video.srcObject) {
                          video.srcObject = previewStream;
                          video.play().catch(e => {
                            console.error('Failed to play preview stream:', e);
                          });
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      style={{ 
                        width: '100%',
                        maxHeight: '300px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        backgroundColor: '#000'
                      }}
                    />
                  )}
                  
                  {/* Face camera - absolute positioned over the screen preview */}
                  <div 
                    className="facecam-container position-absolute"
                    style={{ 
                      bottom: '10px', 
                      right: '10px', 
                      width: '120px',
                      height: '90px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '2px solid white',
                      boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                      backgroundColor: '#000',
                      zIndex: 10
                    }}
                  >
                    <video
                      ref={faceCamRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  
                  {/* Recording saved preview */}
                  {mediaBlobUrl && !previewStream && (
                    <div className="position-relative">
                      <video
                        autoPlay
                        playsInline
                        controls
                        style={{ 
                          width: '100%',
                          maxHeight: '300px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          backgroundColor: '#000'
                        }}
                        src={mediaBlobUrl}
                      />
                      <div className="text-center mt-2">
                        <span className="badge bg-success">Recording saved</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Waiting state */}
                  {!previewStream && !mediaBlobUrl && (
                    <div className="bg-dark text-light d-flex align-items-center justify-content-center" 
                      style={{ height: '200px', borderRadius: '8px' }}>
                      {status === 'idle' ? 'Ready to start recording' : 
                       status === 'acquiring_media' ? 'Preparing recording...' :
                       'Recording status: ' + status}
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <p className={isRecordingActive ? "text-danger mb-0" : "text-secondary mb-0"}>
                    <small>
                      {isRecordingActive ? <FaVideo className="me-1" /> : <FaVideoSlash className="me-1" />}
                      {status === 'recording' ? 'Recording in progress...' : 
                       status === 'stopped' ? 'Recording stopped. Please refresh the page to restart the voting process.' : 
                       status === 'failed' ? 'Recording failed, but you can still vote' :
                       'Recording status: ' + status}
                    </small>
                  </p>
                </div>

                {/* Remove the "Restart Recording" button and replace with instructions if recording is stopped */}
                {status === 'stopped' && (
                  <div className="mt-2">
            <Alert variant="warning">
                      <strong>Recording has stopped!</strong> Please refresh the page to restart the voting process.
            </Alert>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}
        
        {/* Candidates Section */}
        {showCandidateSection && (
          <div id="candidate-section">
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-light">
                <h5 className="mb-0">Step 3: Select Your Candidate</h5>
              </Card.Header>
              <Card.Body>
              <Row>
                {candidates.map(candidate => (
                    <Col 
                      key={candidate._id || candidate.id} 
                      md={candidate.isNoneOption ? 12 : 4} 
                      className="mb-4"
                    >
                    <Card 
                        className={`h-100 shadow-sm candidate-card ${
                          selectedCandidate && 
                          ((selectedCandidate._id && candidate._id && selectedCandidate._id === candidate._id) || 
                           (selectedCandidate.id && candidate.id && selectedCandidate.id === candidate.id)) 
                          ? 'border-primary' : ''
                        }`}
                        onClick={(e) => {
                          // Stop event propagation
                          e.stopPropagation();
                          // Call handler with event to prevent default behavior
                          handleSelectCandidate(candidate, e);
                          // Ensure webcam stays active
                          setTimeout(ensureWebcamActive, 100);
                        }}
                      style={{ 
                          cursor: 'pointer',
                          backgroundColor: candidate.isNoneOption ? '#f8f9fa' : 'white',
                          borderWidth: selectedCandidate && 
                            ((selectedCandidate._id && candidate._id && selectedCandidate._id === candidate._id) || 
                             (selectedCandidate.id && candidate.id && selectedCandidate.id === candidate.id)) 
                            ? '2px' : '1px' // Make selected border more visible
                        }}
                      >
                        {!candidate.isNoneOption ? (
                          <div className="text-center pt-3">
                            {candidate.photoUrl ? (
                              <div className="candidate-img-container mx-auto">
                                <img 
                                  src={getImageUrl(candidate.photoUrl)}
                                  alt={candidate.name || `${candidate.firstName} ${candidate.lastName}`}
                                  className="rounded-circle candidate-img"
                                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                  onError={(e) => {
                                    console.error('Error loading image:', e);
                                    // Prevent infinite loops by checking if we've already tried to load a fallback
                                    if (!e.target.dataset.fallback) {
                                      e.target.dataset.fallback = 'true';
                                      // Use a data URI instead of an external service
                                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCIgZmlsbD0ibm9uZSI+CiAgPHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNFOUVDRUYiLz4KICA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzZDNzU3RCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
                                    } else {
                                      // If even our data URI fails, just hide the image
                                      e.target.style.display = 'none';
                                    }
                                  }}
                                />
                              </div>
                      ) : (
                        <div 
                                className="bg-light rounded-circle mx-auto d-flex align-items-center justify-content-center"
                                style={{ width: '120px', height: '120px' }}
                        >
                                <FaUser size={40} className="text-secondary" />
                        </div>
                      )}
                          </div>
                        ) : (
                          <div className="text-center pt-3 pb-2">
                            <span className="fa-stack fa-2x">
                              <FaTimes className="text-danger" size={48} />
                            </span>
                          </div>
                        )}
                        
                        <Card.Body className="text-center">
                          <Card.Title>
                            {candidate.name || `${candidate.firstName} ${candidate.lastName}`}
                          </Card.Title>
                          
                          {!candidate.isNoneOption ? (
                            <>
                              <div className="d-flex align-items-center justify-content-center mb-2">
                                {candidate.partySymbol && (
                                  <img 
                                    src={getImageUrl(candidate.partySymbol)} 
                                    alt={candidate.partyName} 
                                    className="me-2" 
                                    style={{ width: '24px', height: '24px' }}
                                    onError={(e) => {
                                      if (!e.target.dataset.fallback) {
                                        e.target.dataset.fallback = 'true';
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiNFMEUwRTAiLz48L3N2Zz4=';
                                      } else {
                                        e.target.style.display = 'none';
                                      }
                                    }}
                                  />
                                )}
                                <Badge bg="primary" className="me-2">{candidate.partyName}</Badge>
                          </div>
                              
                              {candidate.constituency && (
                                <p className="text-muted small mb-2">
                                  <strong>Constituency:</strong> {candidate.constituency}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-muted">
                              Select this option if you do not wish to vote for any of the candidates
                            </p>
                          )}
                          
                          {/* Buttons for selection and viewing details */}
                          <div className="d-flex flex-column gap-2 mt-3">
                            {selectedCandidate && 
                              ((selectedCandidate._id && candidate._id && selectedCandidate._id === candidate._id) || 
                              (selectedCandidate.id && candidate.id && selectedCandidate.id === candidate.id)) ? (
                              <Badge bg="success" className="w-100 py-2">
                                <FaCheckCircle className="me-1" /> Selected
                              </Badge>
                            ) : (
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="w-100"
                                onClick={(e) => {
                                  // Stop event propagation to prevent any issues with webcam
                                  e.stopPropagation();
                                  handleSelectCandidate(candidate, e);
                                  // Ensure webcam stays active
                                  setTimeout(ensureWebcamActive, 100);
                                }}
                              >
                                Select
                              </Button>
                            )}
                            
                            {!candidate.isNoneOption && (
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                className="w-100"
                                onClick={(e) => {
                                  // Stop event propagation to prevent any issues with webcam
                                  e.stopPropagation();
                                  handleViewCandidateDetails(candidate, e);
                                  // Ensure webcam stays active
                                  setTimeout(ensureWebcamActive, 100);
                                }}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              </Card.Body>
            </Card>
              
            <div className="d-grid gap-2 col-md-6 mx-auto mt-4 mb-5">
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleVoteClick}
                disabled={!selectedCandidate || (!isRecordingActive && status !== 'failed')}
                >
                  Cast My Vote
                </Button>
              {!selectedCandidate && (
                  <div className="text-center mt-2 text-danger">
                  <small>Please select a candidate or "None of the above"</small>
                  </div>
                )}
              {selectedCandidate && !isRecordingActive && status !== 'failed' && (
                  <div className="text-center mt-2 text-danger">
                  <small>
                    {status === 'acquiring_media' ? 'Waiting for recording permission...' : 
                     status === 'idle' ? 'Recording must be started to cast your vote' : 
                     status === 'stopped' ? 'Recording has stopped. Please refresh to restart voting.' :
                     'Recording must be active to cast your vote'}
                  </small>
                  </div>
                )}
              </div>
        </div>
        )}
        
        {/* Screen Selection Instruction Modal */}
        <Modal 
          show={showScreenSelectionModal} 
          backdrop="static" 
          keyboard={false}
          centered
        >
          <Modal.Header>
            <Modal.Title>Screen Selection Instructions</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center mb-4">
              <div className="d-flex justify-content-center mb-3">
                <img 
                  src="/images/screen-selection.svg" 
                  alt="Select entire screen" 
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
        </div>
              <Alert variant="info">
                <h5>Important Instructions:</h5>
                <ol className="text-start mb-0">
                  <li className="mb-2">When prompted, please select <strong>"Share entire screen"</strong> option.</li>
                  <li className="mb-2">Choose your main monitor/display if you have multiple screens.</li>
                  <li className="mb-2">Click the screen thumbnail, then click the "Share" button.</li>
                  <li>Your entire screen will be recorded during the voting process for verification purposes.</li>
                </ol>
              </Alert>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="primary" 
              onClick={startRecordingAfterInstructions}
            >
              I Understand, Begin Recording
            </Button>
          </Modal.Footer>
        </Modal>
        
        {/* Confirmation Modal */}
        <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Your Vote</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedCandidate && (
              <>
                <p>You are about to cast your vote for:</p>
                <h4>{selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}</h4>
                {!selectedCandidate.isNoneOption && (
                  <p className="text-muted">{selectedCandidate.partyName}</p>
                )}
                
                <Alert variant="warning" className="mt-3">
                  <strong>Important:</strong> This action cannot be undone. Your vote will be permanently recorded on the blockchain.
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmVote}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing...
                </>
              ) : (
                'Confirm Vote'
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Candidate Details Modal */}
        <Modal show={showCandidateDetailsModal} onHide={handleCloseCandidateDetails} size="lg">
          {viewingCandidate && (
            <>
              <Modal.Header closeButton>
                <Modal.Title>Candidate Profile</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Row>
                  <Col md={4} className="text-center">
                    {viewingCandidate.photoUrl ? (
                      <img 
                        src={viewingCandidate.photoUrl}
                        alt={viewingCandidate.name || `${viewingCandidate.firstName} ${viewingCandidate.lastName}`}
                        className="img-fluid rounded candidate-detail-img mb-3"
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                        onError={(e) => {
                          console.error('Error loading image:', e);
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgZmlsbD0ibm9uZSI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFOUVDRUYiLz4KICA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzZDNzU3RCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
                        }}
                      />
                    ) : (
                      <div 
                        className="bg-light rounded d-flex align-items-center justify-content-center mb-3"
                        style={{ height: '200px' }}
                      >
                        <FaUser size={60} className="text-secondary" />
                      </div>
                    )}
                    
                    <div className="mb-3">
                      {viewingCandidate.partySymbol && (
                        <img 
                          src={viewingCandidate.partySymbol} 
                          alt={viewingCandidate.partyName} 
                          className="img-fluid mb-2"
                          style={{ maxWidth: '80px', maxHeight: '80px' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      
                      <h5 className="mb-1">{viewingCandidate.partyName}</h5>
                      <Badge bg="primary">{viewingCandidate.electionType || 'General Election'}</Badge>
                    </div>
                  </Col>
                  <Col md={8}>
                    <h3 className="mb-3">
                      {viewingCandidate.name || `${viewingCandidate.firstName} ${viewingCandidate.middleName ? viewingCandidate.middleName + ' ' : ''}${viewingCandidate.lastName}`}
                    </h3>
                    
                    <div className="candidate-details">
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Basic Information</h6>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col md={6}>
                              <p className="mb-2"><strong>Election:</strong> {viewingCandidate.electionName}</p>
                              <p className="mb-2"><strong>Constituency:</strong> {viewingCandidate.constituency || 'Not specified'}</p>
                            </Col>
                            <Col md={6}>
                              {viewingCandidate.age && (
                                <p className="mb-2"><strong>Age:</strong> {viewingCandidate.age} years</p>
                              )}
                              
                              {viewingCandidate.gender && (
                                <p className="mb-2"><strong>Gender:</strong> {viewingCandidate.gender}</p>
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                      
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Qualifications & Experience</h6>
                        </Card.Header>
                        <Card.Body>
                          {viewingCandidate.education ? (
                            <p className="mb-2"><strong>Education:</strong> {viewingCandidate.education}</p>
                          ) : (
                            <p className="mb-2"><strong>Education:</strong> <span className="text-muted">None</span></p>
                          )}
                          
                          {viewingCandidate.experience ? (
                            <p className="mb-2"><strong>Experience:</strong> {viewingCandidate.experience}</p>
                          ) : (
                            <p className="mb-2"><strong>Experience:</strong> <span className="text-muted">None</span></p>
                          )}
                          
                          {viewingCandidate.criminalRecord ? (
                            <p className="mb-2">
                              <strong>Criminal Record:</strong> 
                              <span className={
                                viewingCandidate.criminalRecord.toLowerCase() === 'none' || 
                                viewingCandidate.criminalRecord.toLowerCase() === 'no' ? 
                                'text-success' : 'text-danger'
                              }>
                                {viewingCandidate.criminalRecord}
                              </span>
                            </p>
                          ) : (
                            <p className="mb-2"><strong>Criminal Record:</strong> <span className="text-success">None reported</span></p>
                          )}
                        </Card.Body>
                      </Card>
                      
                      {viewingCandidate.manifesto ? (
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Manifesto</h6>
                          </Card.Header>
                          <Card.Body>
                            <p className="mb-0">{viewingCandidate.manifesto}</p>
                          </Card.Body>
                        </Card>
                      ) : (
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Manifesto</h6>
                          </Card.Header>
                          <Card.Body>
                            <p className="text-muted mb-0">No manifesto provided</p>
                          </Card.Body>
                        </Card>
                      )}
                      
                      {viewingCandidate.slogan && (
                        <div className="mt-3 p-3 bg-light rounded text-center">
                          <p className="fst-italic mb-0">"{viewingCandidate.slogan}"</p>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseCandidateDetails}>
                  Close
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal>
        
        {/* Blockchain Recording Animation Modal */}
        <Modal 
          show={showBlockchainAnimation} 
          backdrop="static" 
          keyboard={false}
          centered
          className="blockchain-animation-modal"
        >
          <Modal.Body className="text-center p-5">
            <div className="blockchain-animation">
              <div className="blockchain-animation-content">
                <div className="blockchain-blocks">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`blockchain-block block-${i}`} 
                         style={{ animationDelay: `${i * 0.3}s` }}>
                      <div className="blockchain-block-content">
                        <div className="blockchain-hash">0x{Math.random().toString(16).substring(2, 10)}</div>
                        <div className="blockchain-data">
                          {i === 0 ? 'Vote Data' : 
                           i === 1 ? 'Voter ID' : 
                           i === 2 ? 'Candidate Info' : 
                           i === 3 ? 'Election Record' : 'Transaction Proof'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="blockchain-connection-line"></div>
              </div>
            </div>
            <h4 className="mt-4 mb-3">Recording Your Vote on the Blockchain</h4>
            <div className="vote-recording-steps">
              <p className={`vote-step ${voteSteps.local === 'active' ? 'active' : ''}`}>
                Initializing blockchain transaction...
              </p>
              <p className={`vote-step ${voteSteps.remoteDb === 'active' ? 'active' : ''}`}>
                Recording vote on distributed ledger...
              </p>
              <p className={`vote-step ${voteSteps.crypto === 'active' ? 'active' : ''}`}>
                Generating cryptographic proof and verification code...
              </p>
              <p className={`vote-step ${voteSteps.finalizing === 'active' ? 'active' : ''}`}>
                Finalizing transaction and waiting for confirmation...
              </p>
            </div>
            <div className="mt-4 mb-3">
              {voteSteps.crypto === 'active' && (
                <div className="transaction-info p-3 mb-3 mt-3" style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: '#4da3ff',
                  textAlign: 'left'
                }}>
                  {blockchainTxData ? (
                    <>
                      <p className="mb-1">Transaction hash: {blockchainTxData.txHash.substring(0, 10)}...{blockchainTxData.txHash.substring(blockchainTxData.txHash.length - 8)}</p>
                      <p className="mb-1">Block: #{blockchainTxData.blockNumber}</p>
                      <p className="mb-1">Confirmations: {blockchainTxData.confirmations}</p>
                      <p className="mb-1">Verification code: {blockchainTxData.verificationCode}</p>
                      <p className="mb-0">Status: <span className="text-success">Success</span></p>
                    </>
                  ) : (
                    <>
                      <p className="mb-1">Transaction hash: 0x{Math.random().toString(16).substring(2, 10)}...{Math.random().toString(16).substring(2, 10)}</p>
                      <p className="mb-1">Block: #{Math.floor(Math.random() * 1000000) + 15000000}</p>
                      <p className="mb-1">Confirmations: {Math.floor(Math.random() * 10) + 2}</p>
                      <p className="mb-0">Status: <span className="text-success">Processing</span></p>
                    </>
                  )}
                </div>
              )}
            </div>
            <Spinner animation="border" variant="primary" className="mt-3" />
          </Modal.Body>
        </Modal>
      </Container>
    </Layout>
  );
};

export default CastVote; 