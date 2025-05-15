import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaSearch, FaVideo, FaCheck, FaTimes, FaExclamationTriangle, FaEthereum, FaInfoCircle, FaUserCheck, FaIdCard } from 'react-icons/fa';
import Layout from '../../components/Layout';

const VerificationCenter = () => {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedElection, setSelectedElection] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showBlockchainModal, setShowBlockchainModal] = useState(false);
  const [verifyingOnBlockchain, setVerifyingOnBlockchain] = useState(false);
  const [transactionHash, setTransactionHash] = useState(null);
  const [error, setError] = useState(null);
  
  // Sample data
  const elections = [
    { id: 'e1', title: 'Lok Sabha Elections 2023' },
    { id: 'e2', title: 'Municipal Corporation Elections' },
    { id: 'e3', title: 'State Assembly Elections' }
  ];
  
  const verificationVideos = [
    {
      id: 'v1',
      voterId: 'VID12345678',
      voterName: 'Amit Patel',
      electionId: 'e1',
      electionTitle: 'Lok Sabha Elections 2023',
      timestamp: '2023-10-15T09:30:45',
      status: 'verified',
      region: 'South Delhi',
      pincode: '110001'
    },
    {
      id: 'v2',
      voterId: 'VID87654321',
      voterName: 'Priya Sharma',
      electionId: 'e1',
      electionTitle: 'Lok Sabha Elections 2023',
      timestamp: '2023-10-15T10:15:22',
      status: 'pending',
      region: 'North Delhi',
      pincode: '110005'
    },
    {
      id: 'v3',
      voterId: 'VID23456789',
      voterName: 'Rahul Singh',
      electionId: 'e2',
      electionTitle: 'Municipal Corporation Elections',
      timestamp: '2023-09-10T14:22:30',
      status: 'rejected',
      region: 'East Delhi',
      pincode: '110003'
    },
    {
      id: 'v4',
      voterId: 'VID34567890',
      voterName: 'Sneha Gupta',
      electionId: 'e1',
      electionTitle: 'Lok Sabha Elections 2023',
      timestamp: '2023-10-16T11:05:10',
      status: 'verified',
      region: 'West Delhi',
      pincode: '110006'
    },
    {
      id: 'v5',
      voterId: 'VID45678901',
      voterName: 'Vikram Malhotra',
      electionId: 'e3',
      electionTitle: 'State Assembly Elections',
      timestamp: '2023-08-05T09:45:18',
      status: 'pending',
      region: 'Central Delhi',
      pincode: '110002'
    }
  ];
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Apply filters
  const getFilteredVideos = () => {
    return verificationVideos.filter(video => {
      // Filter by status
      if (filter !== 'all' && video.status !== filter) {
        return false;
      }
      
      // Filter by election
      if (selectedElection && video.electionId !== selectedElection) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          video.voterName.toLowerCase().includes(query) ||
          video.voterId.toLowerCase().includes(query) ||
          video.region.toLowerCase().includes(query) ||
          video.pincode.includes(query)
        );
      }
      
      return true;
    });
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };
  
  // Handle election filter change
  const handleElectionChange = (e) => {
    setSelectedElection(e.target.value);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Open video modal
  const openVideoModal = (video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  // Close video modal
  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  // Open blockchain verification modal
  const openBlockchainModal = (video) => {
    setSelectedVideo(video);
    setShowBlockchainModal(true);
    setError(null);
    setTransactionHash(null);
  };

  // Close blockchain verification modal
  const closeBlockchainModal = () => {
    setShowBlockchainModal(false);
    setVerifyingOnBlockchain(false);
    setTransactionHash(null);
    setError(null);
  };

  // Handle voter verification on blockchain
  const handleBlockchainVerification = async () => {
    try {
      setVerifyingOnBlockchain(true);
      setError(null);
      
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to verify voters on the blockchain.');
      }
      
      // In a real application, this would interact with the blockchain
      // using ethers.js or web3.js to call the smart contract's approveVoter function
      
      // For this demo, we'll simulate the blockchain transaction with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate a transaction hash
      const mockTxHash = '0x' + Array(64).fill().map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      setTransactionHash(mockTxHash);
      
      // Update the verification status locally
      // In a real application, you would update the database after blockchain confirmation
      console.log(`Voter ${selectedVideo.voterId} verified on blockchain: ${mockTxHash}`);
      
      // Simulate successful verification
      setTimeout(() => {
        alert(`Voter verification for ${selectedVideo.voterName} (${selectedVideo.voterId}) has been successfully recorded on the blockchain!`);
        closeBlockchainModal();
        
        // Update the status in our UI (in a real app this would happen after backend confirmation)
        const updatedVideos = verificationVideos.map(v => 
          v.id === selectedVideo.id ? { ...v, status: 'verified', blockchainVerified: true } : v
        );
        // In a real app, you would update the state here
      }, 1000);
      
    } catch (err) {
      console.error('Blockchain verification error:', err);
      setError(err.message || 'Failed to verify voter on blockchain. Please try again.');
    } finally {
      setVerifyingOnBlockchain(false);
    }
  };

  // Handle video verification action
  const handleVerification = (videoId, action) => {
    // In a real application, this would make an API call to update the verification status
    console.log(`Video ${videoId} marked as ${action}`);
    
    // For this demo, we're just logging the action
    alert(`Voter verification video ${videoId} has been marked as ${action}`);
  };
  
  // Get filtered videos
  const filteredVideos = getFilteredVideos();
  
  // Function to get transaction explorer URL (would depend on the network)
  const getTransactionExplorerUrl = (txHash) => {
    // This would be network-dependent in a real application
    // For example, for Ethereum mainnet: `https://etherscan.io/tx/${txHash}`
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };
  
  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Voter Verification Center</h1>
            <p className="text-muted">
              Review and verify voter identification videos.
            </p>
          </div>
          <Button
            as={Link}
            to="/officer"
            variant="outline-secondary"
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" /> Back to Dashboard
          </Button>
        </div>
        
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Verification Videos</h5>
              <div className="mt-2 mt-md-0">
                <Badge bg="success" className="me-2">Verified: {verificationVideos.filter(v => v.status === 'verified').length}</Badge>
                <Badge bg="warning" className="me-2">Pending: {verificationVideos.filter(v => v.status === 'pending').length}</Badge>
                <Badge bg="danger">Rejected: {verificationVideos.filter(v => v.status === 'rejected').length}</Badge>
              </div>
            </div>
            
            <Row className="mb-3 g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, ID, region or pincode"
                    value={searchQuery}
                    onChange={handleSearch}
                    className="border-0 shadow-sm"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Select 
                  value={selectedElection}
                  onChange={handleElectionChange}
                  className="border-0 shadow-sm"
                >
                  <option value="">All Elections</option>
                  {elections.map(election => (
                    <option key={election.id} value={election.id}>
                      {election.title}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Select 
                  value={filter}
                  onChange={handleFilterChange}
                  className="border-0 shadow-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </Col>
            </Row>
            
            {filteredVideos.length === 0 ? (
              <Alert variant="info">
                No verification videos match your current filters.
              </Alert>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Voter ID</th>
                    <th>Name</th>
                    <th>Election</th>
                    <th>Timestamp</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVideos.map(video => (
                    <tr key={video.id}>
                      <td>{video.voterId}</td>
                      <td>{video.voterName}</td>
                      <td>{video.electionTitle}</td>
                      <td>{formatDate(video.timestamp)}</td>
                      <td>{video.region} ({video.pincode})</td>
                      <td>
                        <Badge 
                          bg={
                            video.status === 'verified' ? 'success' : 
                            video.status === 'pending' ? 'warning' : 'danger'
                          }
                        >
                          {video.status === 'verified' ? 'Verified' : 
                           video.status === 'pending' ? 'Pending' : 'Rejected'}
                        </Badge>
                        {video.blockchainVerified && (
                          <Badge bg="primary" className="ms-1">
                            <FaEthereum className="me-1" /> Blockchain
                          </Badge>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => openVideoModal(video)}
                        >
                          <FaVideo className="me-1" /> View
                        </Button>
                        
                        {video.status === 'pending' && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleVerification(video.id, 'verified')}
                            >
                              <FaCheck className="me-1" /> Approve
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="me-2"
                              onClick={() => handleVerification(video.id, 'rejected')}
                            >
                              <FaTimes className="me-1" /> Reject
                            </Button>
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => openBlockchainModal(video)}
                            >
                              <FaEthereum className="me-1" /> Verify on Blockchain
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
        
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="text-center">
              <FaExclamationTriangle size={48} className="text-warning mb-3" />
              <h4>Coming Soon: Advanced Verification Features</h4>
              <p className="text-muted mb-4">
                Enhanced verification tools including facial recognition matching, document validation, 
                and liveness detection will be implemented in upcoming releases. These features will 
                provide more robust voter verification capabilities.
              </p>
              <div className="d-flex justify-content-center flex-wrap">
                <Badge bg="primary" className="me-2 p-2 mb-2">Facial Recognition</Badge>
                <Badge bg="primary" className="me-2 p-2 mb-2">Document Validation</Badge>
                <Badge bg="primary" className="me-2 p-2 mb-2">Liveness Detection</Badge>
                <Badge bg="primary" className="me-2 p-2 mb-2">Audit Trail</Badge>
                <Badge bg="primary" className="p-2 mb-2">Blockchain Verification</Badge>
              </div>
            </div>
          </Card.Body>
        </Card>
        
        {/* Video Modal */}
        <Modal 
          show={showVideoModal} 
          onHide={closeVideoModal}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Verification Video: {selectedVideo?.voterName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedVideo && (
              <div>
                <div className="bg-dark text-center p-4 mb-4 rounded">
                  {/* In a real app, this would be a video player */}
                  <div className="text-white p-5">
                    <FaVideo size={64} />
                    <p className="mt-3 mb-0">Video verification preview would appear here</p>
                  </div>
                </div>
                
                <h5>Voter Information</h5>
                <Row className="mb-4">
                  <Col md={6}>
                    <p><strong>Voter ID:</strong> {selectedVideo.voterId}</p>
                    <p><strong>Name:</strong> {selectedVideo.voterName}</p>
                    <p><strong>Election:</strong> {selectedVideo.electionTitle}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Region:</strong> {selectedVideo.region}</p>
                    <p><strong>Pincode:</strong> {selectedVideo.pincode}</p>
                    <p><strong>Timestamp:</strong> {formatDate(selectedVideo.timestamp)}</p>
                  </Col>
                </Row>
                
                <h5>Verification Status</h5>
                <Alert variant={
                  selectedVideo.status === 'verified' ? 'success' : 
                  selectedVideo.status === 'pending' ? 'warning' : 'danger'
                }>
                  <div className="d-flex align-items-center">
                    {selectedVideo.status === 'verified' ? <FaCheck className="me-2" /> : 
                     selectedVideo.status === 'pending' ? <FaExclamationTriangle className="me-2" /> : 
                     <FaTimes className="me-2" />}
                    <span>
                      <strong>Status:</strong> {selectedVideo.status === 'verified' ? 'Verified' : 
                                              selectedVideo.status === 'pending' ? 'Pending Verification' : 
                                              'Rejected'}
                    </span>
                  </div>
                </Alert>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeVideoModal}>
              Close
            </Button>
            {selectedVideo && selectedVideo.status === 'pending' && (
              <>
                <Button 
                  variant="success" 
                  onClick={() => {
                    handleVerification(selectedVideo.id, 'verified');
                    closeVideoModal();
                  }}
                >
                  <FaCheck className="me-2" /> Approve Verification
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    closeVideoModal();
                    openBlockchainModal(selectedVideo);
                  }}
                >
                  <FaEthereum className="me-2" /> Verify on Blockchain
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>
        
        {/* Blockchain Verification Modal */}
        <Modal 
          show={showBlockchainModal} 
          onHide={closeBlockchainModal}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <FaEthereum className="me-2" /> Blockchain Verification
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedVideo && (
              <div>
                <Alert variant="info" className="d-flex align-items-start mb-4">
                  <FaInfoCircle className="me-2 mt-1" />
                  <div>
                    <p className="mb-1">
                      <strong>This action will record the voter's verification on the blockchain.</strong>
                    </p>
                    <p className="mb-0 small">
                      Blockchain verification creates a permanent, immutable record that this voter has been
                      verified by an election officer. This helps prevent fraud and provides a transparent
                      audit trail of the verification process.
                    </p>
                  </div>
                </Alert>
                
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Body className="p-3">
                    <h5 className="mb-3">Voter Details</h5>
                    <Row>
                      <Col md={6}>
                        <p className="mb-2"><strong>Voter ID:</strong> {selectedVideo.voterId}</p>
                        <p className="mb-2"><strong>Name:</strong> {selectedVideo.voterName}</p>
                        <p className="mb-2"><strong>Pincode:</strong> {selectedVideo.pincode}</p>
                      </Col>
                      <Col md={6}>
                        <p className="mb-2"><strong>Region:</strong> {selectedVideo.region}</p>
                        <p className="mb-2"><strong>Election:</strong> {selectedVideo.electionTitle}</p>
                        <p className="mb-2"><strong>Verified:</strong> {formatDate(new Date())}</p>
                      </Col>
                    </Row>
                    
                    <div className="d-flex align-items-center mt-3">
                      <FaUserCheck className="text-success me-2" size={24} />
                      <div>
                        <h6 className="mb-0">Verification Officer</h6>
                        <p className="mb-0 small text-muted">
                          Your verification will be recorded with your blockchain address
                        </p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
                
                {error && (
                  <Alert variant="danger" className="mb-4">
                    {error}
                  </Alert>
                )}
                
                {transactionHash && (
                  <Alert variant="success" className="mb-4 d-flex align-items-start">
                    <FaCheck className="me-2 mt-1" />
                    <div>
                      <p className="mb-1"><strong>Transaction submitted!</strong></p>
                      <p className="mb-1 small">The verification has been submitted to the blockchain.</p>
                      <p className="mb-0 small">
                        <strong>Transaction Hash:</strong>{' '}
                        <a 
                          href={getTransactionExplorerUrl(transactionHash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="word-break-all"
                        >
                          {transactionHash}
                        </a>
                      </p>
                    </div>
                  </Alert>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeBlockchainModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBlockchainVerification}
              disabled={verifyingOnBlockchain || transactionHash}
            >
              {verifyingOnBlockchain ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <FaEthereum className="me-2" /> Verify on Blockchain
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default VerificationCenter; 