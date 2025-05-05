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
  
  // Face capture states
  const [showWebcam, setShowWebcam] = useState(false);
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
  const [faceCamStream, setFaceCamStream] = useState(null);
  
  // Initialize react-media-recorder
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
    previewStream,
    error: recorderError
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
    onStop: (blobUrl, blob) => handleRecordingStop(blobUrl, blob),
    onError: (err) => {
      console.error('React Media Recorder error:', err);
      toast.error('Recording error: ' + (err?.message || 'Unknown error'));
      // Show candidate section anyway to allow voting
      setShowCandidateSection(true);
      setIsRecordingActive(false);
    }
  });
  
  // Start webcam for face recording alongside screen recording
  const startFaceCam = async () => {
    try {
      if (faceCamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          },
          audio: false // We already have audio from the main recording
        });
        
        faceCamRef.current.srcObject = stream;
        setFaceCamStream(stream);
        
        faceCamRef.current.play().catch(e => {
          console.error('Failed to play face cam:', e);
        });
      }
    } catch (err) {
      console.error('Error starting face cam:', err);
      toast.warning('Could not start face camera, but voting can continue');
    }
  };

  // Handle recording stop and upload video
  const handleRecordingStop = async (blobUrl, blob) => {
    try {
      // Stop face cam
      if (faceCamStream) {
        faceCamStream.getTracks().forEach(track => track.stop());
        setFaceCamStream(null);
        if (faceCamRef.current) {
          faceCamRef.current.srcObject = null;
        }
      }
      
      if (!blob || !selectedCandidate || !voterProfile) {
        console.error('Missing required data for recording upload');
        return;
      }
      
      console.log('Recording stopped, blob URL:', blobUrl);
      
      // Create a file from the blob
      const file = new File([blob], `vote-recording-${Date.now()}-${voterProfile._id}-${selectedCandidate.electionId}.webm`, { 
        type: 'video/webm',
      });
      
      const formData = new FormData();
      formData.append('recording', file);
      formData.append('voterId', voterProfile._id);
      formData.append('electionId', selectedCandidate.electionId);
      formData.append('candidateId', selectedCandidate._id || selectedCandidate.id);
      formData.append('voteTimestamp', new Date().toISOString());
      
      const token = localStorage.getItem('token');
      const headers = token ? { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      } : {};
      
      console.log('Uploading recording...');
      toast.info('Uploading your voting record...');
      
      // Upload to server
      const uploadResponse = await axios.post(`${API_URL}/voter/upload-recording`, formData, { headers });
      
      // Update the vote record with the recording URL
      const recordingUrl = uploadResponse.data?.recordingUrl || uploadResponse.data?.path;
      if (recordingUrl) {
        try {
          await axios.post(`${API_URL}/voter/update-vote-recording`, {
            voterId: voterProfile._id,
            electionId: selectedCandidate.electionId,
            recordingUrl
          }, { headers: { 'Authorization': `Bearer ${token}` } });
          console.log('Vote record updated with recording URL');
        } catch (updateErr) {
          console.error('Error updating vote with recording URL:', updateErr);
        }
      }
      
      toast.success('Voting record uploaded successfully');
      console.log('Recording uploaded successfully');
      
      // Clean up blob URL
      clearBlobUrl();
      
    } catch (err) {
      console.error('Error uploading recording:', err);
      toast.error('Failed to upload recording. Please contact support.');
    }
  };

  // Monitor recording status changes
  useEffect(() => {
    if (status === 'acquiring_media') {
      toast.info('Please allow access to your screen and microphone');
    } else if (status === 'recording') {
      console.log('Recording successfully started');
    } else if (status === 'stopped') {
      console.log('Recording stopped successfully');
    } else if (status === 'failed') {
      console.error('Recording failed');
      toast.error('Recording failed, but you can still proceed with voting');
      // Allow voting even if recording fails
      setShowCandidateSection(true);
    }
  }, [status]);

  // Cleanup resources when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('Cleaning up camera stream on component unmount');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clean up face cam stream
      if (faceCamStream) {
        console.log('Cleaning up face cam stream');
        faceCamStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear the blob URL if component unmounts
      if (mediaBlobUrl) {
        clearBlobUrl();
      }
    };
  }, [mediaBlobUrl, clearBlobUrl, faceCamStream]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth headers
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Reset selected candidate explicitly to ensure none is selected by default
        setSelectedCandidate(null);
        
        // Fetch voter profile
        const profileResponse = await axios.get(`${API_URL}/voter/profile`, { headers });
        const voterData = profileResponse.data.voter;
        setVoterProfile(voterData);
        
        // Check if the voter has already voted
        if (voterData?.hasVoted || voterData?.blockchainStatus?.hasVoted) {
          console.log('Voter has already voted, redirecting to verify page');
          toast.info('You have already cast your vote in this election.');
          navigate('/voter/verify');
          return;
        }
        
        // Fetch active elections with candidates using the correct API per documentation
        try {
          console.log('Fetching active elections...');
          const activeElectionsResponse = await axios.get(`${API_URL}/elections/active`, { headers });
          console.log('Active elections response:', activeElectionsResponse.data);
          
          // Extract elections data following documented API format
          let electionsData = [];
          if (activeElectionsResponse.data && activeElectionsResponse.data.elections) {
            // API returns { elections: [...] }
            electionsData = activeElectionsResponse.data.elections;
          } else if (Array.isArray(activeElectionsResponse.data)) {
            // API returns direct array
            electionsData = activeElectionsResponse.data;
          } else if (activeElectionsResponse.data) {
            // API returns single election object
            electionsData = [activeElectionsResponse.data];
          }
          
          if (electionsData.length === 0) {
            setError('No active elections found.');
            setLoading(false);
            return;
          }
          
          // Extract all candidates from the active elections
          let allCandidates = [];
          
          electionsData.forEach(election => {
            // Check if election has candidates property and it's an array
            if (election.candidates && Array.isArray(election.candidates)) {
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
                  electionEndDate: election.endDate
                };
                
                // Add to all candidates array
                allCandidates.push(enhancedCandidate);
              });
            }
          });
          
          // Add "None of the above" option if we have active elections
          if (allCandidates.length > 0 && electionsData.length > 0) {
            const firstElection = electionsData[0];
            allCandidates.push({
              _id: 'none-of-the-above',
              id: 'none-of-the-above',
              firstName: 'None',
              lastName: 'of the Above',
              name: 'None of the Above',
              partyName: 'N/A',
              isNoneOption: true,
              electionId: firstElection._id,
              electionName: firstElection.title || firstElection.name
            });
          }
          
          // Set candidates state
          setCandidates(allCandidates);
          
          // Double check that no candidate is selected by default
          setSelectedCandidate(null);
          
          if (allCandidates.length === 0) {
            setError('No candidates found for any active election.');
          }
        } catch (err) {
          console.error('Error fetching active elections:', err);
          setError(`Could not fetch active elections: ${err.response?.data?.message || err.message}`);
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
        setError('Camera access denied. Please allow camera access in your browser permissions to continue.');
        toast.error('Camera permission denied. Please check your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
        toast.error('No camera detected');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Could not access your camera. It may be in use by another application.');
        toast.error('Camera is in use by another application');
      } else {
        setError('Failed to access webcam. Please make sure your camera is connected and you have given permission to use it.');
        toast.error(err.message || 'Camera access failed');
      }
      
      // Rethrow to propagate to the caller
      throw err;
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    console.log('Stopping webcam...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setShowWebcam(false);
      console.log('Webcam stopped successfully');
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
      
      // Stop webcam after capturing
      stopWebcam();
      
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
    setFaceCaptured(false);
    setFaceVerified(false);
    setFaceImageData(null);
  };

  // Continue to voting after verification
  const continueToVoting = () => {
    if (!faceVerified) {
      toast.error('Please verify your identity first');
      return;
    }
    
    console.log('Continuing to voting screen after verification');
    
    // Hide the verification section and show candidate section immediately
    setShowVerificationSection(false);
    setShowCandidateSection(true);
    
    // Start recording with react-media-recorder
    try {
      console.log('Starting recording with react-media-recorder');
      startRecording();
      // Note: We don't need to set isRecordingActive here as it's handled by onStart callback
      
      // If recording doesn't start within 5 seconds, show an error and let user proceed
      setTimeout(() => {
        if (status !== 'recording') {
          console.warn('Recording did not start within timeout period');
          toast.warning('Recording setup is taking longer than expected. You can proceed with voting.');
        }
      }, 5000);
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording: ' + err.message);
      
      // Still allow voting even if recording fails
      setIsRecordingActive(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    console.log('Candidate selected:', candidate.name || `${candidate.firstName} ${candidate.lastName}`);
    // Explicitly set the selected candidate to the one clicked
    setSelectedCandidate(candidate);
  };

  const handleVoteClick = () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate first');
      return;
    }
    
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
        setShowConfirmModal(true);
      } else {
        toast.error('Recording must be active to cast your vote');
      }
      return;
    }
    
    setShowConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    try {
      setSubmitting(true);
      
      // Construct the voting payload
      const payload = {
        candidateId: selectedCandidate._id || selectedCandidate.id,
        electionId: selectedCandidate.electionId,
        isNoneOption: selectedCandidate.isNoneOption || false
      };
      
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Call the API to cast the vote
      const response = await axios.post(`${API_URL}/vote`, payload, { headers });
      
      console.log('Vote cast response:', response.data);
      
      // Stop recording after successful vote
      if (isRecordingActive) {
        stopRecording();
        setIsRecordingActive(false);
      }
      
      toast.success('Your vote has been cast successfully!');
      setShowConfirmModal(false);
      
      // Redirect after a short delay to allow the recording to be processed
      setTimeout(() => {
        navigate('/voter/verify');
      }, 2000);
      
    } catch (err) {
      console.error('Error casting vote:', err);
      toast.error(err.response?.data?.message || 'Failed to cast vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ensure no candidate is selected by default
  useEffect(() => {
    // Explicitly ensure no candidate is selected by default
    console.log('Initializing with no selected candidate');
    setSelectedCandidate(null);
  }, []);
  
  // Add logging to monitor selectedCandidate changes
  useEffect(() => {
    console.log('Selected candidate updated:', selectedCandidate ? 
      (selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`) : 
      'None');
  }, [selectedCandidate]);

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
  if (voterProfile?.blockchainStatus?.hasVoted) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="info">
            <Alert.Heading>You Have Already Voted</Alert.Heading>
            <p>You have already cast your vote in this election.</p>
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
  // Add this right before the return statement in the main component
  if (process.env.NODE_ENV !== 'production') {
    console.log('CastVote component rendering with:', {
      candidatesCount: candidates.length,
      selectedCandidate: selectedCandidate ? 
        (selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`) : 
        'None',
      showVerificationSection,
      showCandidateSection,
      isRecordingActive,
      recordingStatus: status
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
                       status === 'stopped' ? 'Recording finished' : 
                       status === 'failed' ? 'Recording failed, but you can still vote' :
                       'Recording status: ' + status}
                    </small>
                  </p>
                </div>
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
                        className={`h-100 shadow-sm candidate-card ${selectedCandidate && (selectedCandidate._id === candidate._id || selectedCandidate.id === candidate.id) ? 'border-primary' : ''}`}
                        onClick={() => handleSelectCandidate(candidate)}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: candidate.isNoneOption ? '#f8f9fa' : 'white'
                        }}
                      >
                        {!candidate.isNoneOption ? (
                          <div className="text-center pt-3">
                            {candidate.photoUrl ? (
                              <div className="candidate-img-container mx-auto">
                                <img 
                                  src={candidate.photoUrl}
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
                            {candidate.name || `${candidate.firstName} ${candidate.middleName ? candidate.middleName + ' ' : ''}${candidate.lastName}`}
                          </Card.Title>
                          
                          {!candidate.isNoneOption ? (
                            <>
                              <div className="d-flex align-items-center justify-content-center mb-2">
                                {candidate.partySymbol && (
                                  <img 
                                    src={candidate.partySymbol} 
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
                          
                          {selectedCandidate && (selectedCandidate._id === candidate._id || selectedCandidate.id === candidate.id) ? (
                            <div className="mt-2">
                              <Badge bg="success" className="w-100 py-2">
                                <FaCheckCircle className="me-1" /> Selected
                              </Badge>
                            </div>
                          ) : (
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="w-100 mt-2"
                              onClick={() => handleSelectCandidate(candidate)}
                            >
                              Select
                            </Button>
                          )}
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
      </Container>
    </Layout>
  );
};

export default CastVote; 