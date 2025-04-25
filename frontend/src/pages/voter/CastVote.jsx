import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CastVote = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [electionStatus, setElectionStatus] = useState(null);
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('Cleaning up camera stream on component unmount');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth headers
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Fetch voter profile
        const profileResponse = await axios.get(`${API_URL}/voter/profile`, { headers });
        setVoterProfile(profileResponse.data.voter);
        
        // First try to fetch active elections
        try {
          const activeElectionsResponse = await axios.get(`${API_URL}/elections/active`, { headers });
          console.log('Active elections response:', activeElectionsResponse.data);
          
          // Handle different response formats
          let electionsData = [];
          if (Array.isArray(activeElectionsResponse.data)) {
            electionsData = activeElectionsResponse.data;
          } else if (activeElectionsResponse.data.elections && Array.isArray(activeElectionsResponse.data.elections)) {
            electionsData = activeElectionsResponse.data.elections;
          } else if (activeElectionsResponse.data) {
            electionsData = [activeElectionsResponse.data]; // Assume it's a single election object
          }
          
          // If we have active elections, set the election status and fetch candidates
          if (electionsData.length > 0) {
            setElectionStatus({
              active: true,
              election: electionsData[0],
              currentTime: new Date()
            });
            
            // Fetch candidates
            const candidatesResponse = await axios.get(`${API_URL}/election/candidates`, { headers });
            setCandidates(candidatesResponse.data.candidates);
          } else {
            // Fallback to election status endpoint
            const electionResponse = await axios.get(`${API_URL}/election/status`, { headers });
            setElectionStatus(electionResponse.data);
            
            if (electionResponse.data.active) {
              // If active, fetch candidates
              const candidatesResponse = await axios.get(`${API_URL}/election/candidates`, { headers });
              setCandidates(candidatesResponse.data.candidates);
            }
          }
        } catch (electionsError) {
          console.error('Error fetching active elections:', electionsError);
          
          // Fallback to election status endpoint
          const electionResponse = await axios.get(`${API_URL}/election/status`, { headers });
          setElectionStatus(electionResponse.data);
          
          if (electionResponse.data.active) {
            // If active, fetch candidates
            const candidatesResponse = await axios.get(`${API_URL}/election/candidates`, { headers });
            setCandidates(candidatesResponse.data.candidates);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load voting data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Verify face (this would be replaced with an actual API call)
  const verifyFace = async () => {
    if (!faceImageData) {
      toast.error('No photo to verify');
      return;
    }

    setVerifying(true);
    
    try {
      // Simulate API call for face verification
      console.log('Face verification would be called with the image data');
      
      // Simulate a delay for the verification process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, we'll just simulate success (in reality this would call the external API)
      console.log('Simulating successful verification');
      setFaceVerified(true);
      toast.success('Identity verified successfully!');
      
    } catch (err) {
      console.error('Error in face verification:', err);
      toast.error('Verification failed. Please try again.');
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
    
    toast.success('Verification complete. You can now select a candidate.');
    
    // Scroll to candidate section
    document.getElementById('candidate-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectCandidate = (candidate) => {
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
    
    setShowConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    if (!privateKey) {
      toast.error('Please enter your private key');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await axios.post('/api/election/vote', {
        candidateId: selectedCandidate.id,
        privateKey
      });
      
      toast.success('Your vote has been cast successfully!');
      setShowConfirmModal(false);
      navigate('/voter/verify');
    } catch (err) {
      console.error('Error casting vote:', err);
      toast.error(err.response?.data?.message || 'Failed to cast vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  // Check if election is active
  if (!electionStatus?.active) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="warning">
            <Alert.Heading>No Active Election</Alert.Heading>
            <p>There is no active election at the moment. Please check back later.</p>
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

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Cast Your Vote</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Alert variant="info" className="mb-4">
          <Alert.Heading>Important Information</Alert.Heading>
          <p>
            Your vote will be recorded on the blockchain and cannot be changed once submitted.
            Please review your selection carefully before confirming.
          </p>
        </Alert>
        
        {/* Face Capture Section */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Identity Verification</h5>
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
                <li>Review your photo and click "Verify Identity" to proceed</li>
                <li>After successful verification, click "Continue" to select your candidate</li>
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
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Identity verified successfully!
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
        
        {/* Candidates Section */}
        <div id="candidate-section">
          {candidates.length === 0 ? (
            <Alert variant="warning">
              No candidates have been added to the election yet.
            </Alert>
          ) : (
            <>
              <h4 className="mb-3">Select a Candidate</h4>
              <Row>
                {candidates.map(candidate => (
                  <Col key={candidate.id} md={4} className="mb-4">
                    <Card 
                      className={`h-100 shadow-sm candidate-card ${selectedCandidate?.id === candidate.id ? 'border-primary' : ''}`}
                      onClick={() => faceVerified && handleSelectCandidate(candidate)}
                      style={{ 
                        cursor: faceVerified ? 'pointer' : 'not-allowed',
                        opacity: faceVerified ? 1 : 0.7
                      }}
                    >
                      {candidate.image ? (
                        <Card.Img 
                          variant="top" 
                          src={candidate.image.startsWith('http') 
                            ? candidate.image 
                            : `http://localhost:5000${candidate.image}`
                          } 
                          alt={candidate.name}
                          className="candidate-image"
                        />
                      ) : (
                        <div 
                          className="bg-light d-flex align-items-center justify-content-center candidate-image"
                        >
                          <span className="text-muted">No image available</span>
                        </div>
                      )}
                      <Card.Body>
                        <Card.Title>{candidate.name}</Card.Title>
                        <Card.Subtitle className="mb-2 text-muted">{candidate.party}</Card.Subtitle>
                        {candidate.slogan && (
                          <Card.Text className="fst-italic">"{candidate.slogan}"</Card.Text>
                        )}
                        {selectedCandidate?.id === candidate.id && (
                          <div className="text-center mt-2">
                            <span className="badge bg-primary">Selected</span>
                          </div>
                        )}
                      </Card.Body>
                      {!faceVerified && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 5, borderRadius: 'inherit' }}>
                          <div className="bg-white py-2 px-3 rounded shadow-sm">
                            <small>Please verify your identity first</small>
                          </div>
                        </div>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
              
              <div className="d-grid gap-2 col-md-6 mx-auto mt-4">
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleVoteClick}
                  disabled={!selectedCandidate || !faceVerified}
                >
                  Cast My Vote
                </Button>
                {!faceVerified && (
                  <div className="text-center mt-2 text-danger">
                    <small>Please verify your identity before casting your vote</small>
                  </div>
                )}
                {faceVerified && !selectedCandidate && (
                  <div className="text-center mt-2 text-danger">
                    <small>Please select a candidate</small>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Confirmation Modal */}
        <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Your Vote</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedCandidate && (
              <>
                <p>You are about to cast your vote for:</p>
                <h4>{selectedCandidate.name}</h4>
                <p className="text-muted">{selectedCandidate.party}</p>
                
                <Alert variant="warning" className="mt-3">
                  <strong>Important:</strong> This action cannot be undone. Your vote will be permanently recorded on the blockchain.
                </Alert>
                
                <Form.Group className="mb-3 mt-4">
                  <Form.Label>Enter your private key to confirm</Form.Label>
                  <Form.Control
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Your wallet private key"
                    required
                  />
                  <Form.Text className="text-muted">
                    Your private key is required to sign the transaction on the blockchain.
                  </Form.Text>
                </Form.Group>
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
              disabled={submitting || !privateKey}
            >
              {submitting ? 'Processing...' : 'Confirm Vote'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default CastVote; 