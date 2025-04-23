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
      setVoters(response.data.voters);
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
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${apiUrl}/admin/voters/${voterId}`);
      
      console.log('Fetched voter details:', response.data.voter);
      setSelectedVoter(response.data.voter);
      setShowDetailsModal(true);
      
      // Verify the voter details against the external API
      await verifyVoterDetails(response.data.voter);
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
      console.log(`Sending approval request to: ${apiUrl}/admin/voters/${voterId}/approve`);
      
      const response = await axios.put(`${apiUrl}/admin/voters/${voterId}/approve`, {
        useMetaMask: true // Indicate that frontend has MetaMask connected
      });
      
      console.log('Voter approval response:', response.data);
      
      // Check if response includes MetaMask transaction data
      if (response.data.useMetaMask && response.data.contractDetails) {
        console.log('Processing MetaMask transaction...');
        const { address, method, params } = response.data.contractDetails;
        
        // Get contract ABI
        const contractAbi = await fetchContractAbi();
        
        // Create contract transaction
        const tx = {
          from: adminAccount,
          to: address,
          data: window.ethereum.toHex(
            window.ethereum._web3Provider.utils.abi.encodeFunctionCall(
              contractAbi.find(item => item.name === method), 
              params
            )
          )
        };
        
        console.log('Sending transaction to MetaMask:', tx);
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [tx],
        });
        
        console.log('Transaction successful:', txHash);
        
        // Now update the voter status in our database
        const updateResponse = await axios.put(`${apiUrl}/admin/voters/${voterId}/approve-complete`, {
          txHash,
          voterAddress: params[0]
        });
        
        console.log('Voter status update response:', updateResponse.data);
      }
      
      // Update local state
      setVoters(prevVoters => 
        prevVoters.map(voter => 
          voter.id === voterId ? { ...voter, status: 'approved' } : voter
        )
      );
      
      toast.success('Voter approved successfully and recorded on blockchain.');
    } catch (err) {
      console.error('Error approving voter:', err);
      let errorMessage = 'Failed to approve voter.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = `Error: ${err.response.data.error}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle MetaMask specific errors
      if (err.code === 4001) {
        errorMessage = 'MetaMask transaction was rejected by the user.';
      }
      
      toast.error(errorMessage);
    } finally {
      setApprovingVoter(false);
    }
  };

  // Fetch contract ABI
  const fetchContractAbi = async () => {
    try {
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${apiUrl}/blockchain/contract-abi`);
      return response.data.abi;
    } catch (error) {
      console.error('Error fetching contract ABI:', error);
      toast.error('Failed to fetch contract information');
      throw error;
    }
  };

  // Reject voter
  const handleRejectClick = (voterId) => {
    setSelectedVoterId(voterId);
    setRejectReason('');
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
        // Compare full names - our format is first + middle + last
        const localFullName = `${localValue.firstName || ''} ${localValue.middleName || ''} ${localValue.lastName || ''}`.trim().replace(/\s+/g, ' ').toLowerCase();
        // External API has firstName that might contain the full name
        const externalFullName = verificationValue.firstName.toLowerCase();
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
      case 'email':
        // Direct comparison for simple fields
        return localValue === verificationValue;
        
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
    
    switch (field) {
      case 'fullName':
        localValue = { 
          firstName: voter.firstName, 
          middleName: voter.middleName, 
          lastName: voter.lastName 
        };
        verificationValue = verificationData;
        break;
      case 'fatherName':
        localValue = voter.fatherName;
        verificationValue = verificationData.fatherName;
        break;
      case 'gender':
        localValue = voter.gender;
        verificationValue = verificationData.gender;
        break;
      case 'dateOfBirth':
        localValue = voter.dateOfBirth;
        verificationValue = verificationData.dateOfBirth;
        break;
      case 'voterId':
        localValue = voter.voterId;
        verificationValue = verificationData.voterId;
        break;
      case 'age':
        localValue = voter.age;
        verificationValue = verificationData.age;
        break;
      case 'email':
        localValue = voter.email;
        verificationValue = verificationData.email;
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
                        <td>
                          {voter.firstName} {voter.middleName ? voter.middleName + ' ' : ''}{voter.lastName}
                        </td>
                        <td>{voter.voterId}</td>
                        <td>
                          {voter.email ? (
                            <a href={`mailto:${voter.email}`} className="d-flex align-items-center text-decoration-none">
                              <FaEnvelope className="me-1" /> {voter.email}
                            </a>
                          ) : (
                            <span className="text-muted">No email</span>
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
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this voter registration..."
              />
              <Form.Text className="text-muted">
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
                bg={
                  checkFieldMatch('fullName', 
                    { firstName: selectedVoter.firstName, middleName: selectedVoter.middleName, lastName: selectedVoter.lastName }, 
                    verificationData) && 
                  checkFieldMatch('voterId', selectedVoter.voterId, verificationData.voterId) &&
                  checkFieldMatch('dateOfBirth', selectedVoter.dateOfBirth, verificationData.dateOfBirth) ? 
                    'success' : 'danger'
                }
                className="ms-2"
              >
                {checkFieldMatch('fullName', 
                  { firstName: selectedVoter.firstName, middleName: selectedVoter.middleName, lastName: selectedVoter.lastName }, 
                  verificationData) && 
                checkFieldMatch('voterId', selectedVoter.voterId, verificationData.voterId) &&
                checkFieldMatch('dateOfBirth', selectedVoter.dateOfBirth, verificationData.dateOfBirth) ? 
                  'Verified' : 'Not Verified'}
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
                    {selectedVoter.email || 'No email provided'}
                    <VerificationStatus field="email" voter={selectedVoter} />
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
                        checkFieldMatch('fullName', 
                          { firstName: selectedVoter.firstName, middleName: selectedVoter.middleName, lastName: selectedVoter.lastName }, 
                          verificationData) && 
                        checkFieldMatch('voterId', selectedVoter.voterId, verificationData.voterId) &&
                        checkFieldMatch('dateOfBirth', selectedVoter.dateOfBirth, verificationData.dateOfBirth) ? 
                          'success' : 'danger'
                      }
                      className="py-2 mb-0"
                    >
                      <small>
                        {checkFieldMatch('fullName', 
                          { firstName: selectedVoter.firstName, middleName: selectedVoter.middleName, lastName: selectedVoter.lastName }, 
                          verificationData) && 
                        checkFieldMatch('voterId', selectedVoter.voterId, verificationData.voterId) &&
                        checkFieldMatch('dateOfBirth', selectedVoter.dateOfBirth, verificationData.dateOfBirth) ? 
                          'Voter verified successfully against external database.' : 
                          'Voter details do not match with external database. Please verify carefully.'}
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
                  
                  <h6 className="mt-4 border-bottom pb-2">Face Verification Image</h6>
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
                            console.log('Opening face image preview:', imageUrl);
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