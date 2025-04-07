import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { FaCheck, FaTimes, FaEye, FaEnvelope, FaEthereum } from 'react-icons/fa';
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
  
  // Image preview modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  
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
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${apiUrl}/admin/voters/${voterId}`);
      
      console.log('Fetched voter details:', response.data.voter);
      setSelectedVoter(response.data.voter);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching voter details:', err);
      toast.error('Failed to fetch voter details.');
    } finally {
      setVoterDetailsLoading(false);
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
          <Modal.Title>Voter Details</Modal.Title>
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
                  </dd>
                  
                  <dt className="col-sm-4">Father's Name</dt>
                  <dd className="col-sm-8">{selectedVoter.fatherName || 'Not provided'}</dd>
                  
                  <dt className="col-sm-4">Gender</dt>
                  <dd className="col-sm-8">{selectedVoter.gender || 'Not provided'}</dd>
                  
                  <dt className="col-sm-4">Age</dt>
                  <dd className="col-sm-8">{selectedVoter.age || 'Not provided'}</dd>
                  
                  <dt className="col-sm-4">Date of Birth</dt>
                  <dd className="col-sm-8">{selectedVoter.dateOfBirth ? formatDate(selectedVoter.dateOfBirth) : 'Not provided'}</dd>
                  
                  <dt className="col-sm-4">Email</dt>
                  <dd className="col-sm-8">{selectedVoter.email || 'No email provided'}</dd>
                  
                  <dt className="col-sm-4">Voter ID</dt>
                  <dd className="col-sm-8">{selectedVoter.voterId || 'Not provided'}</dd>
                  
                  <dt className="col-sm-4">Wallet Address</dt>
                  <dd className="col-sm-8" style={{ wordBreak: 'break-all' }}>
                    {selectedVoter.walletAddress || 'Not provided'}
                  </dd>
                </dl>
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
                          style={{ 
                            maxHeight: '220px', 
                            maxWidth: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const imageUrl = getImageUrl(selectedVoter.voterIdImage);
                            console.log('Opening image in modal:', imageUrl);
                            setPreviewImageUrl(imageUrl);
                            setShowImageModal(true);
                          }}
                          onError={(e) => {
                            console.error('Image failed to load:', selectedVoter.voterIdImage);
                            console.log('Full URL attempted:', getImageUrl(selectedVoter.voterIdImage));
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                            e.target.alt = 'Image not found';
                          }}
                        />
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => {
                              const imageUrl = getImageUrl(selectedVoter.voterIdImage);
                              console.log('Opening image in modal via button:', imageUrl);
                              setPreviewImageUrl(imageUrl);
                              setShowImageModal(true);
                            }}
                          >
                            Click to enlarge
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            as="a"
                            href={getImageUrl(selectedVoter.voterIdImage)}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Alert variant="warning">No ID image uploaded</Alert>
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
      >
        <Modal.Header closeButton>
          <Modal.Title>Voter ID Image</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0">
          {previewImageUrl ? (
            <img 
              src={previewImageUrl}
              alt="Voter ID Full Size" 
              className="img-fluid"
              style={{ maxHeight: '80vh' }}
              onLoad={() => console.log('Image loaded successfully in modal')}
              onError={(e) => {
                console.error('Failed to load image in modal:', previewImageUrl);
                e.target.onerror = null; // Prevent infinite loop
                e.target.src = 'https://via.placeholder.com/800x600?text=Image+Failed+to+Load';
              }}
            />
          ) : (
            <div className="p-5 text-center">
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