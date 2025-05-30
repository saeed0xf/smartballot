import React, { useState, useContext, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';
import env from '../../utils/env';

const VoterRegistration = () => {
  const { connectWallet, isMetaMaskInstalled, registerVoter } = useContext(AuthContext);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletType, setWalletType] = useState(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const navigate = useNavigate();
  
  // Webcam states
  const [showWebcam, setShowWebcam] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [faceImageData, setFaceImageData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Check if the current wallet is admin or officer
  useEffect(() => {
    const checkWalletType = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const currentAddress = accounts[0].toLowerCase();
            const adminAddress = (env.ADMIN_ADDRESS || '').toLowerCase();
            
            // Get officer addresses
            const officerAddresses = env.OFFICER_ADDRESSES ? 
              env.OFFICER_ADDRESSES.split(',').map(addr => addr.toLowerCase()) : 
              [];
            
            if (currentAddress === adminAddress) {
              setWalletType('admin');
            } else if (officerAddresses.includes(currentAddress)) {
              setWalletType('officer');
            } else {
              setWalletType('voter');
            }
          }
        }
      } catch (err) {
        console.error('Error checking wallet type:', err);
      } finally {
        setIsCheckingWallet(false);
      }
    };
    
    checkWalletType();
  }, []);

  // Redirect admin and officer wallets to login page
  useEffect(() => {
    if (!isCheckingWallet && (walletType === 'admin' || walletType === 'officer')) {
      navigate('/login');
      return;
    }
  }, [walletType, isCheckingWallet, navigate]);

  // Add this effect to configure non-passive event listeners for touch events
  useEffect(() => {
    // Fix for passive event listeners to allow preventDefault() to work
    // This addresses the "Unable to preventDefault inside passive event listener" warning
    const options = { passive: false };
    
    // For React's synthetic events, we need to apply this to the document
    const preventDefaultForTouchStart = (e) => {
      if (e.target.closest('button')) {
        // If the touch event is on a button, make it non-passive
        // This allows preventDefault to work
        e.stopPropagation();
      }
    };
    
    document.addEventListener('touchstart', preventDefaultForTouchStart, options);
    
    return () => {
      document.removeEventListener('touchstart', preventDefaultForTouchStart);
    };
  }, []);

  // Add this useEffect hook to ensure the video element is available
  useEffect(() => {
    console.log('Video ref status on render:', videoRef.current ? 'available' : 'not available');
    
    return () => {
      // Cleanup function
      if (streamRef.current) {
        console.log('Cleaning up camera stream on component unmount');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Connect wallet on component mount
  useEffect(() => {
    const connectWalletOnLoad = async () => {
      try {
        if (isMetaMaskInstalled) {
          const address = await connectWallet();
          setWalletAddress(address);
        }
      } catch (err) {
        console.error('Error connecting wallet:', err);
        setError('Failed to connect to MetaMask. Please try again.');
      }
    };

    connectWalletOnLoad();
  }, [connectWallet, isMetaMaskInstalled]);

  // Validation schema
  const validationSchema = Yup.object({
    firstName: Yup.string().required('First name is required'),
    middleName: Yup.string(),
    lastName: Yup.string().required('Last name is required'),
    fatherName: Yup.string().required('Father\'s name is required'),
    gender: Yup.string().required('Gender is required').oneOf(['male', 'female', 'other'], 'Invalid gender selection'),
    dateOfBirth: Yup.date()
      .required('Date of birth is required')
      .test('is-18-plus', 'You must be at least 18 years old', function(value) {
        if (!value) return false;
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 18;
      }),
    pincode: Yup.string()
      .required('Pincode is required')
      .matches(/^[0-9]+$/, 'Pincode must contain only numbers')
      .min(5, 'Pincode must be at least 5 digits')
      .max(10, 'Pincode must not exceed 10 digits'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    voterId: Yup.string().required('Voter ID is required'),
    voterIdImage: Yup.mixed().required('Voter ID image is required'),
    faceImage: Yup.mixed().required('Face image is required')
  });

  // Initial form values
  const initialValues = {
    firstName: '',
    middleName: '',
    lastName: '',
    fatherName: '',
    gender: '',
    dateOfBirth: '',
    pincode: '',
    email: '',
    voterId: '',
    voterIdImage: null,
    faceImage: null
  };

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
      
      // Since we've already checked videoRef is available
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
  const capturePhoto = (setFieldValue, voterId) => {
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
      
      // Convert data URL to Blob for form submission
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          // Create a File object from the Blob
          const file = new File([blob], `face_${voterId}_${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          // Set form field value
          setFieldValue('faceImage', file);
          
          // Update state to show captured image
          setFaceImageData(dataUrl);
          setFaceCaptured(true);
          
          // Stop webcam after capturing
          stopWebcam();
          
          toast.success('Photo captured successfully!');
        })
        .catch(err => {
          console.error('Error converting canvas to file:', err);
          toast.error('Failed to process captured photo. Please try again.');
        });
    } catch (err) {
      console.error('Error capturing photo:', err);
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  // Retry capture
  const retryCapture = (setFieldValue) => {
    setFaceCaptured(false);
    setFaceImageData(null);
    setFieldValue('faceImage', null);
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setError(null);
      setLoading(true);

      if (!walletAddress) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
      }

      // Check if the voter ID image is set
      if (!values.voterIdImage) {
        throw new Error('Voter ID image is required.');
      }

      // Check if the face image is set
      if (!values.faceImage) {
        throw new Error('Face image is required. Please capture your photo using the webcam.');
      }

      // Create a simplified form data object
      const formData = new FormData();
      
      // Add all text fields
      Object.keys(values).forEach(key => {
        // Skip the file fields, we'll handle them separately
        if (key !== 'voterIdImage' && key !== 'faceImage') {
          formData.append(key, values[key] === undefined ? '' : values[key]);
        }
      });
      
      // Add wallet address
      formData.append('walletAddress', walletAddress);

      // Calculate and add age
      const birthDate = new Date(values.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      formData.append('age', age);

      // Add the voter ID image
      if (values.voterIdImage instanceof File) {
        console.log('Adding voter ID image:', values.voterIdImage.name, 'Size:', values.voterIdImage.size, 'Type:', values.voterIdImage.type);
        formData.append('voterIdImage', values.voterIdImage, values.voterIdImage.name);
      } else {
        throw new Error('Invalid voter ID image. Please select a valid image file.');
      }

      // Add the face image
      if (values.faceImage instanceof File) {
        console.log('Adding face image:', values.faceImage.name, 'Size:', values.faceImage.size, 'Type:', values.faceImage.type);
        formData.append('faceImage', values.faceImage, values.faceImage.name);
      } else {
        throw new Error('Invalid face image. Please capture your photo using the webcam.');
      }

      // Debug: Log all form data entries
      console.log('Form data contents:');
      for (let [key, value] of formData.entries()) {
        const displayValue = value instanceof File 
          ? `[File] name: ${value.name}, type: ${value.type}, size: ${value.size} bytes` 
          : value;
        console.log(`${key}: ${displayValue}`);
      }

      // Make the API request
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      console.log(`Sending registration request to: ${apiUrl}/voter/register`);
      
      try {
        // Use the fetch API instead of axios for more reliable file uploads
        const response = await fetch(`${apiUrl}/voter/register`, {
          method: 'POST',
          body: formData, // FormData handles the Content-Type automatically
        });
        
        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Registration response:', data);
      toast.success('Registration submitted successfully! Please wait for admin approval.');
      resetForm();
      navigate('/');
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        
        throw new Error(fetchError.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // Show loading while checking wallet type
  if (isCheckingWallet) {
    return (
      <Layout>
        <Container className="py-5">
          <Card className="shadow-sm">
            <Card.Body className="p-4 text-center">
              <div className="mb-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
              <p>Checking wallet permissions...</p>
            </Card.Body>
          </Card>
        </Container>
      </Layout>
    );
  }

  if (!isMetaMaskInstalled) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="warning">
            <Alert.Heading>MetaMask is not installed</Alert.Heading>
            <p>You need to install MetaMask to register as a voter.</p>
            <hr />
            <div className="d-flex justify-content-end">
              <Button 
                variant="outline-primary" 
                href="https://metamask.io/download/" 
                target="_blank"
                rel="noopener noreferrer"
              >
                Install MetaMask
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="voter-registration-container">
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white text-center py-3">
            <h3>Voter Registration</h3>
          </Card.Header>
          <Card.Body className="p-4">
            {error && <Alert variant="danger">{error}</Alert>}
            
            {walletAddress ? (
              <Alert variant="success" className="mb-4">
                <strong>Wallet Connected:</strong> {walletAddress}
              </Alert>
            ) : (
              <Alert variant="warning" className="mb-4">
                <strong>Wallet Not Connected.</strong> Please connect your MetaMask wallet to continue.
                <div className="mt-2">
                  <Button 
                    variant="outline-primary" 
                    onClick={async () => {
                      try {
                        const address = await connectWallet();
                        setWalletAddress(address);
                      } catch (err) {
                        setError('Failed to connect wallet. Please try again.');
                      }
                    }}
                  >
                    Connect Wallet
                  </Button>
                </div>
              </Alert>
            )}
            
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                handleSubmit,
                isSubmitting,
                setFieldValue
              }) => (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={values.firstName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.firstName && errors.firstName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.firstName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Middle Name (Optional)</Form.Label>
                        <Form.Control
                          type="text"
                          name="middleName"
                          value={values.middleName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={values.lastName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.lastName && errors.lastName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.lastName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Father's Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="fatherName"
                          value={values.fatherName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.fatherName && errors.fatherName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.fatherName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gender</Form.Label>
                        <Form.Select
                          name="gender"
                          value={values.gender}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.gender && errors.gender}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.gender}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control
                      type="date"
                      name="dateOfBirth"
                      value={values.dateOfBirth}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.dateOfBirth && errors.dateOfBirth}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.dateOfBirth}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      You must be at least 18 years old to register.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.email && errors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Pincode</Form.Label>
                    <Form.Control
                      type="text"
                      name="pincode"
                      value={values.pincode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.pincode && errors.pincode}
                      placeholder="Enter your postal code"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.pincode}
                    </Form.Control.Feedback>
                  </Form.Group>

                  

                  <Form.Group className="mb-3">
                    <Form.Label>Voter ID Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="voterId"
                      value={values.voterId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.voterId && errors.voterId}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.voterId}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Voter ID Image</Form.Label>
                    <Form.Control
                      type="file"
                      name="voterIdImage"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.currentTarget.files && e.currentTarget.files[0]) {
                          // Process the file to ensure it's properly handled
                          const file = e.currentTarget.files[0];
                          
                          // Log detailed file information for debugging
                          console.log('Selected file details:', {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            lastModified: file.lastModified
                          });
                          
                          // Validate file size
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('File is too large. Maximum file size is 5MB.');
                            setFieldValue('voterIdImage', null);
                            return;
                          }
                          
                          // Validate file type
                          const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                          if (!validTypes.includes(file.type)) {
                            toast.error('Invalid file type. Please upload JPG, PNG, or GIF image.');
                            setFieldValue('voterIdImage', null);
                            return;
                          }
                          
                          // Use FileReader to verify the file can be processed
                          const reader = new FileReader();
                          reader.onload = () => {
                            // File was successfully read
                            console.log('File successfully loaded');
                            setFieldValue('voterIdImage', file);
                          };
                          reader.onerror = () => {
                            console.error('Error reading file');
                            toast.error('Error processing file. Please try another file.');
                            setFieldValue('voterIdImage', null);
                          };
                          
                          // Read the file as data URL
                          reader.readAsDataURL(file);
                        } else {
                          console.log('No file selected');
                          setFieldValue('voterIdImage', null);
                        }
                      }}
                      isInvalid={touched.voterIdImage && errors.voterIdImage}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.voterIdImage}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Please upload a clear image of your voter ID card (JPG, PNG, or GIF, max 5MB).
                    </Form.Text>
                  </Form.Group>

                  {/* Face Image Capture with Webcam */}
                  <Form.Group className="mb-4">
                    <Form.Label>Face Image</Form.Label>
                    
                    {/* Webcam/Face Capture Section */}
                    <div className="border rounded p-3 bg-light">
                      {!faceCaptured && (
                        <div className="text-center mb-3">
                          {!showWebcam ? (
                            <>
                              <p>We need to take a photo of your face for identity verification.</p>
                              <Button
                                variant="primary"
                                onClick={() => {
                                  console.log('Start Camera button clicked');
                                  // Set showWebcam first, then start the webcam
                                  setShowWebcam(true);
                                  // Short delay to ensure DOM updates before accessing video element
                                  setTimeout(() => {
                                    if (videoRef.current) {
                                      console.log('Video ref is available, starting webcam');
                                      startWebcam().catch(err => {
                                        console.error('Error in startWebcam from button click:', err);
                                        toast.error('Failed to start camera. Please try again or use a different browser.');
                                        setShowWebcam(false);
                                      });
                                    } else {
                                      console.error('Video ref still not available after delay');
                                      toast.error('Camera initialization failed. Please refresh the page and try again.');
                                      setShowWebcam(false);
                                    }
                                  }, 100);
                                }}
                              >
                                Start Camera
                              </Button>
                            </>
                          ) : (
                            <div className="mb-3 d-flex justify-content-center position-relative">
                              {/* Video element - always in DOM but hidden when not in use */}
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
                                  transform: 'scaleX(-1)', // Mirror the video horizontally
                                  backgroundColor: '#000', // Add black background
                                  cursor: 'pointer', // Indicate it's clickable for mobile
                                  display: showWebcam ? 'block' : 'none' // Hide when not showing webcam
                                }}
                                onClick={() => {
                                  // Add click-to-play functionality for mobile browsers
                                  if (videoRef.current) {
                                    videoRef.current.play().catch(e => {
                                      console.log('Play on click failed, may require additional user interaction', e);
                                    });
                                  }
                                }}
                                onCanPlay={() => {
                                  console.log('Video can play event triggered');
                                  if (videoRef.current) {
                                    videoRef.current.play().catch(e => {
                                      console.error('Error playing video on canplay event:', e);
                                    });
                                  }
                                }}
                              />
                              
                              {/* Visual guide for face positioning - improved styling */}
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
                                  zIndex: 10,
                                  display: showWebcam ? 'block' : 'none' // Only show when webcam is active
                                }}
                              />
                              
                              <p className="text-muted mb-2 position-absolute" style={{ bottom: '-25px', width: '100%', textAlign: 'center' }}>
                                <small>Position your face within the circle and ensure good lighting</small>
                              </p>
                            </div>
                          )}
                          
                          {showWebcam && (
                            <div className="d-flex justify-content-center gap-2 mt-4">
                              <Button
                                variant="primary"
                                onClick={() => capturePhoto(setFieldValue, values.voterId)}
                              >
                                Capture Photo
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => stopWebcam()}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Captured image display */}
                      {faceCaptured && faceImageData && (
                        <div className="text-center">
                          <div className="mb-3 d-flex justify-content-center">
                            <Image
                              src={faceImageData}
                              alt="Captured face"
                              thumbnail
                              style={{ maxHeight: '200px' }}
                            />
                          </div>
                          <div className="d-flex justify-content-center gap-2">
                            <Button
                              variant="outline-primary"
                              onClick={() => retryCapture(setFieldValue)}
                            >
                              Retake Photo
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Hidden canvas for capture */}
                      <canvas ref={canvasRef} style={{ display: 'none' }} />

                      {/* Error display */}
                      {touched.faceImage && errors.faceImage && (
                        <div className="text-danger mt-2">
                          {errors.faceImage}
                        </div>
                      )}
                    </div>
                  </Form.Group>

                  <div className="d-grid mt-4">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={isSubmitting || loading || !walletAddress || !faceCaptured}
                    >
                      {isSubmitting || loading ? 'Submitting...' : 'Submit Registration'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default VoterRegistration; 