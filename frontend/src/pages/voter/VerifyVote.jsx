import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button, Form, Badge } from 'react-bootstrap';
import { FaCheck, FaTimes, FaSearch, FaInfoCircle, FaEthereum } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';
import { initializeBlockchain, hasVoterVotedInElection, getVoterDetailsFromBlockchain } from '../../utils/blockchainUtils';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerifyVote = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voteStatus, setVoteStatus] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [voterProfile, setVoterProfile] = useState(null);
  const [verificationMethod, setVerificationMethod] = useState('wallet');
  const [electionId, setElectionId] = useState('');
  const [voterAddress, setVoterAddress] = useState('');
  
  // Blockchain related states
  const [blockchainInitialized, setBlockchainInitialized] = useState(false);
  const [blockchainError, setBlockchainError] = useState(null);
  const [blockchainVoteStatus, setBlockchainVoteStatus] = useState({});
  const [blockchainVoterInfo, setBlockchainVoterInfo] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  
  // Initialize blockchain connection
  useEffect(() => {
    const setupBlockchain = async () => {
      try {
        const result = await initializeBlockchain();
        if (result.success) {
          console.log('Blockchain initialized successfully');
          setBlockchainInitialized(true);
          
          // Pre-populate the wallet address if user is logged in
          if (user && user.walletAddress) {
            setVoterAddress(user.walletAddress);
          }
        } else {
          console.error('Failed to initialize blockchain:', result.error);
          setBlockchainError(result.error);
        }
      } catch (error) {
        console.error('Error initializing blockchain:', error);
        setBlockchainError('Failed to connect to blockchain. Please make sure MetaMask is installed and connected.');
      }
    };

    setupBlockchain();
  }, [user]);

  // Fetch voter profile and elections
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth headers
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch voter profile
        try {
          const profileResponse = await axios.get(`${API_URL}/voter/profile`, { headers });
          console.log('Voter profile:', profileResponse.data);
          setVoterProfile(profileResponse.data.voter);
          
          // If user's wallet address is available, set it
          if (profileResponse.data.voter && profileResponse.data.voter.walletAddress) {
            setVoterAddress(profileResponse.data.voter.walletAddress);
          }
        } catch (profileError) {
          console.error('Error fetching voter profile:', profileError);
          // Continue with other fetches even if profile fails
        }

        // Fetch elections (include past elections as well)
        try {
          const electionsResponse = await axios.get(`${API_URL}/elections`, { headers });
          console.log('Elections:', electionsResponse.data);
          
          // Handle different response formats
          let electionsData = [];
          if (Array.isArray(electionsResponse.data)) {
            electionsData = electionsResponse.data;
          } else if (electionsResponse.data.elections && Array.isArray(electionsResponse.data.elections)) {
            electionsData = electionsResponse.data.elections;
          } else {
            electionsData = [electionsResponse.data]; // Assume it's a single election object
          }
          
          setElections(electionsData);
          
          // If there are elections, set the first one as selected
          if (electionsData.length > 0) {
            setSelectedElection(electionsData[0]._id);
            setElectionId(electionsData[0].blockchainElectionId || electionsData[0]._id);
          }
        } catch (electionsError) {
          console.error('Error fetching elections:', electionsError);
          setError('Failed to load elections data. Please try again later.');
        }

        // Check if voter has already voted (via API)
        try {
          const voteCheckResponse = await axios.get(`${API_URL}/voter/vote/status`, { headers });
          console.log('Vote status:', voteCheckResponse.data);
          setVoteStatus(voteCheckResponse.data);
        } catch (voteError) {
          console.error('Error checking vote status:', voteError);
          // Just set vote status to null if there's an error - assume not voted
          setVoteStatus(null);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load verification data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Verify vote on blockchain when election changes
  useEffect(() => {
    const verifyVoteOnBlockchain = async () => {
      if (!blockchainInitialized || !selectedElection || !voterAddress) return;
      
      try {
        setBlockchainLoading(true);
        
        // Find the selected election
        const election = elections.find(e => e._id === selectedElection);
        if (!election) {
          console.error('Selected election not found');
          return;
        }
        
        // Get blockchain election ID
        const blockchainElectionId = election.blockchainElectionId || election._id;
        
        // Verify vote
        const voteResult = await hasVoterVotedInElection(voterAddress, blockchainElectionId);
        if (voteResult.success) {
          console.log(`Blockchain vote status for election ${blockchainElectionId}:`, voteResult.hasVoted);
          setBlockchainVoteStatus(prev => ({
            ...prev,
            [blockchainElectionId]: voteResult.hasVoted
          }));
          
          // If voter has voted, try to get their details
          if (voteResult.hasVoted) {
            const voterDetailsResult = await getVoterDetailsFromBlockchain(voterAddress);
            if (voterDetailsResult.success) {
              console.log('Blockchain voter details:', voterDetailsResult.voter);
              setBlockchainVoterInfo(voterDetailsResult.voter);
            }
          }
        } else {
          console.error('Failed to verify vote on blockchain:', voteResult.error);
        }
      } catch (error) {
        console.error('Error verifying vote on blockchain:', error);
      } finally {
        setBlockchainLoading(false);
      }
    };
    
    verifyVoteOnBlockchain();
  }, [blockchainInitialized, selectedElection, voterAddress, elections]);

  // Handle election change
  const handleElectionChange = (e) => {
    const electionId = e.target.value;
    setSelectedElection(electionId);
    
    // Find the selected election and get its blockchain ID
    const election = elections.find(e => e._id === electionId);
    if (election) {
      setElectionId(election.blockchainElectionId || election._id);
    }
  };

  // Handle verification method change
  const handleMethodChange = (e) => {
    setVerificationMethod(e.target.value);
  };

  // Handle manual verification
  const handleManualVerify = async () => {
    if (!blockchainInitialized) {
      setError('Blockchain connection is not available. Please try again later.');
      return;
    }
    
    if (!electionId) {
      setError('Please enter an election ID.');
      return;
    }
    
    if (!voterAddress) {
      setError('Please enter a wallet address.');
      return;
    }
    
    try {
      setBlockchainLoading(true);
      setError(null);
      
      // Verify vote
      const voteResult = await hasVoterVotedInElection(voterAddress, electionId);
      if (voteResult.success) {
        console.log(`Manual blockchain vote status for election ${electionId}:`, voteResult.hasVoted);
        setBlockchainVoteStatus(prev => ({
          ...prev,
          [electionId]: voteResult.hasVoted
        }));
        
        // If voter has voted, try to get their details
        if (voteResult.hasVoted) {
          const voterDetailsResult = await getVoterDetailsFromBlockchain(voterAddress);
          if (voterDetailsResult.success) {
            console.log('Blockchain voter details:', voterDetailsResult.voter);
            setBlockchainVoterInfo(voterDetailsResult.voter);
          }
        }
      } else {
        setError(`Failed to verify vote: ${voteResult.error}`);
      }
    } catch (error) {
      console.error('Error in manual verification:', error);
      setError('Error verifying vote. Please check the election ID and wallet address.');
    } finally {
      setBlockchainLoading(false);
    }
  };

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Verify Your Vote</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        {blockchainError && (
          <Alert variant="warning">
            <FaEthereum className="me-2" />
            {blockchainError}
            <span className="ms-2 small">(Blockchain verification may not be available)</span>
          </Alert>
        )}
        
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h4 className="mb-0">Vote Verification</h4>
            </Card.Header>
            <Card.Body>
            <p>
              <FaInfoCircle className="me-2" />
              Use this page to verify that your vote has been recorded correctly in the election system.
            </p>
            
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Verification Method</Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    id="wallet-method"
                    label="Using Wallet Address"
                    value="wallet"
                    checked={verificationMethod === 'wallet'}
                    onChange={handleMethodChange}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    id="manual-method"
                    label="Manual Entry"
                    value="manual"
                    checked={verificationMethod === 'manual'}
                    onChange={handleMethodChange}
                  />
                </div>
              </Form.Group>
              
              {verificationMethod === 'wallet' ? (
                <>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Select Election</Form.Label>
                        <Form.Select 
                          value={selectedElection} 
                          onChange={handleElectionChange}
                          disabled={loading || blockchainLoading}
                        >
                          <option value="">-- Select an Election --</option>
                          {elections.map(election => (
                            <option 
                              key={election._id} 
                              value={election._id}
                            >
                              {election.title || election.name || `Election ${election._id}`}
                              {election.blockchainElectionId ? ` (#${election.blockchainElectionId})` : ''}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Your Wallet Address</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={voterAddress}
                          onChange={(e) => setVoterAddress(e.target.value)}
                          placeholder="0x..." 
                          disabled={loading || blockchainLoading}
                        />
                        <Form.Text className="text-muted">
                          Enter the Ethereum wallet address you used for voting.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              ) : (
                <>
              <Row>
                <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Election ID</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={electionId}
                          onChange={(e) => setElectionId(e.target.value)}
                          placeholder="Enter election ID" 
                          disabled={loading || blockchainLoading}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Wallet Address</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={voterAddress}
                          onChange={(e) => setVoterAddress(e.target.value)}
                          placeholder="0x..." 
                          disabled={loading || blockchainLoading}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-grid gap-2 d-md-flex justify-content-md-end mb-3">
                    <Button 
                      variant="primary" 
                      onClick={handleManualVerify}
                      disabled={!blockchainInitialized || loading || blockchainLoading || !electionId || !voterAddress}
                    >
                      {blockchainLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <FaSearch className="me-2" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </Form>
            
            {blockchainLoading && (
              <div className="text-center my-4">
                <Spinner animation="border" role="status" variant="primary">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="mt-2">Verifying your vote on the blockchain...</p>
              </div>
            )}
            
            {/* Blockchain verification results */}
            {selectedElection && blockchainVoteStatus[electionId] !== undefined && (
              <Alert variant={blockchainVoteStatus[electionId] ? "success" : "warning"} className="mt-4">
                <div className="d-flex align-items-start">
                  {blockchainVoteStatus[electionId] ? (
                    <FaCheck className="mt-1 me-2 text-success" size={20} />
                  ) : (
                    <FaTimes className="mt-1 me-2 text-danger" size={20} />
                  )}
                  <div>
                    <h5 className="mb-2">
                      {blockchainVoteStatus[electionId] 
                        ? "Vote Verified on Blockchain" 
                        : "No Vote Record Found on Blockchain"}
                    </h5>
                    {blockchainVoteStatus[electionId] ? (
                      <p className="mb-0">
                        Your vote for election 
                        <strong className="mx-1">
                          {elections.find(e => e._id === selectedElection)?.title || `#${electionId}`}
                        </strong> 
                        has been verified on the blockchain.
                      </p>
                    ) : (
                      <p className="mb-0">
                        No record found of your vote for election 
                        <strong className="mx-1">
                          {elections.find(e => e._id === selectedElection)?.title || `#${electionId}`}
                        </strong> 
                        on the blockchain.
                      </p>
                    )}
                    <div className="mt-2">
                      <Badge bg="info" className="d-flex align-items-center" style={{ width: 'fit-content' }}>
                        <FaEthereum className="me-1" /> Blockchain Verification
                      </Badge>
                    </div>
                  </div>
                </div>
              </Alert>
            )}
            
            {/* Database verification results */}
            {voteStatus && (
              <Alert variant={voteStatus.hasVoted ? "success" : "warning"} className="mt-4">
                <div className="d-flex align-items-start">
                  {voteStatus.hasVoted ? (
                    <FaCheck className="mt-1 me-2 text-success" size={20} />
                  ) : (
                    <FaTimes className="mt-1 me-2 text-danger" size={20} />
                  )}
                  <div>
                    <h5 className="mb-2">
                      {voteStatus.hasVoted ? "Vote Verified in Database" : "No Vote Record Found in Database"}
                    </h5>
                    {voteStatus.hasVoted ? (
                      <>
                        <p className="mb-1">
                          Your vote has been recorded in our database for the following election:
                        </p>
                        <p className="mb-1">
                          <strong>Election:</strong> {voteStatus.electionTitle || voteStatus.election?.title || "Unknown Election"}
                        </p>
                        {voteStatus.candidateName && (
                          <p className="mb-1">
                            <strong>Candidate:</strong> {voteStatus.candidateName}
                          </p>
                        )}
                        {voteStatus.timestamp && (
                          <p className="mb-0">
                            <strong>Timestamp:</strong> {new Date(voteStatus.timestamp).toLocaleString()}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mb-0">
                        We could not find a record of your vote in our database. 
                        {voteStatus.message ? ` ${voteStatus.message}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </Alert>
            )}
            
            {/* Show detailed blockchain voter info if available */}
            {blockchainVoterInfo && (
              <div className="mt-4">
                <h5 className="border-bottom pb-2">Blockchain Voter Details</h5>
                <Row className="mt-3">
                  <Col md={6}>
                    <p><strong>Address:</strong> {blockchainVoterInfo.voterAddress}</p>
                    <p><strong>Approved:</strong> {blockchainVoterInfo.isApproved ? 'Yes' : 'No'}</p>
                </Col>
                <Col md={6}>
                    <p><strong>Registration Date:</strong> {new Date(blockchainVoterInfo.registrationDate * 1000).toLocaleString()}</p>
                    <p><strong>Voted in Elections:</strong> {blockchainVoterInfo.votedElections?.join(', ') || 'None'}</p>
                  </Col>
                </Row>
              </div>
            )}
            
            {!loading && !blockchainLoading && !voteStatus && Object.keys(blockchainVoteStatus).length === 0 && (
              <Alert variant="info" className="mt-4">
                <FaInfoCircle className="me-2" />
                No vote records were found. This could mean you have not voted in any elections yet, 
                or your vote is still being processed.
              </Alert>
                      )}
                    </Card.Body>
                  </Card>
        
        {voterProfile && (
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h4 className="mb-0">Voter Information</h4>
            </Card.Header>
            <Card.Body>
              <h5>{voterProfile.firstName} {voterProfile.middleName} {voterProfile.lastName}</h5>
              <p className="text-muted">Voter ID: {voterProfile.voterId}</p>
              
              {voterProfile.walletAddress && (
                <p>
                  <strong>Wallet Address:</strong>
                  <code className="ms-2">{voterProfile.walletAddress}</code>
                </p>
              )}
              
              <p>
                <strong>Status:</strong> 
                <Badge 
                  bg={voterProfile.status === 'approved' ? 'success' : voterProfile.status === 'rejected' ? 'danger' : 'warning'}
                  className="ms-2"
                >
                  {voterProfile.status?.charAt(0).toUpperCase() + voterProfile.status?.slice(1)}
                </Badge>
              </p>
            </Card.Body>
          </Card>
        )}
      </Container>
    </Layout>
  );
};

export default VerifyVote; 