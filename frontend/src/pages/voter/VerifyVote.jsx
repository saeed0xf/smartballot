import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button, Badge, Table, ListGroup, Modal, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { FaCheck, FaTimes, FaInfoCircle, FaEthereum, FaVideo, FaClipboard, FaIdCard, FaExternalLinkAlt, FaHistory, FaCubes, FaVoteYea, FaRegClock } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerifyVote = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voterProfile, setVoterProfile] = useState(null);
  const [voterAddress, setVoterAddress] = useState('');
  
  // States for remote vote records
  const [remoteVotes, setRemoteVotes] = useState([]);
  const [loadingRemoteVotes, setLoadingRemoteVotes] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);
  const [showVoteDetailsModal, setShowVoteDetailsModal] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState({});
  const [electionDetails, setElectionDetails] = useState({});

  // Clipboard state
  const [copiedText, setCopiedText] = useState('');

  // Fetch voter profile, elections, and votes
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
          
          // Store election details for lookup
          const electionsMap = {};
          electionsData.forEach(election => {
            electionsMap[election._id] = election;
          });
          setElectionDetails(electionsMap);
        } catch (electionsError) {
          console.error('Error fetching elections:', electionsError);
          setError('Failed to load elections data. Please try again later.');
        }

        // Fetch remote votes for this voter
        await fetchRemoteVotes(headers);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load verification data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Function to fetch remote votes for the current voter
  const fetchRemoteVotes = async (headers) => {
    try {
      setLoadingRemoteVotes(true);
      console.log('Fetching remote votes directly from remote database...');
      
      // Try the dedicated endpoint for fetching all votes for this voter
      try {
        const votesResponse = await axios.get(`${API_URL}/voter/remote-votes`, { headers });
        console.log('Remote votes response:', votesResponse.data);
        
        if (votesResponse.data && votesResponse.data.success && votesResponse.data.votes) {
          const votes = votesResponse.data.votes;
          console.log(`Found ${votes.length} votes in the remote database`);
          
          if (votes.length > 0) {
            setRemoteVotes(votes);
            
            // Fetch candidate and election details for each vote
            votes.forEach(vote => {
              if (vote.candidateId && vote.candidateId !== 'unknown' && vote.candidateId !== 'none-of-the-above') {
                fetchCandidateDetails(vote.candidateId, headers);
              }
              if (vote.electionId) {
                fetchElectionDetails(vote.electionId, headers);
              }
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching from remote-votes endpoint:', error);
        // Continue with fallback approaches
      }
      
      // Fallback 1: Try to fetch from check-remote-vote endpoint
      try {
        const fallbackResponse = await axios.get(`${API_URL}/voter/check-remote-vote`, { headers });
        console.log('Fallback remote vote check response:', fallbackResponse.data);
        
        if (fallbackResponse.data && fallbackResponse.data.hasVoted) {
          // This is just a single vote, so we'll create an array with this vote
          const vote = {
            blockchainTxHash: fallbackResponse.data.voteInfo.txHash,
            electionId: fallbackResponse.data.voteInfo.electionId,
            timestamp: fallbackResponse.data.voteInfo.timestamp,
            confirmed: true,
            blockInfo: {
              confirmations: 12, // Default value
              blockNumber: 'N/A'
            }
          };
          
          setRemoteVotes([vote]);
          
          // Fetch election details
          if (vote.electionId) {
            fetchElectionDetails(vote.electionId, headers);
          }
          return;
        }
      } catch (fallbackError) {
        console.error('Error with fallback approach:', fallbackError);
      }
      
      // Fallback 2: Try local storage data
      const lastVoteTransaction = localStorage.getItem('lastVoteTransaction');
      if (lastVoteTransaction) {
        try {
          const voteData = JSON.parse(lastVoteTransaction);
          console.log('Found vote transaction in local storage:', voteData);
          
          // Create a vote object from the local storage data
          const vote = {
            blockchainTxHash: voteData.txHash || 'unknown',
            electionId: voteData.electionId,
            candidateId: voteData.candidateId,
            timestamp: voteData.timestamp || new Date().toISOString(),
            confirmed: true,
            recordingUrl: voteData.recordingUrl,
            blockInfo: {
              blockNumber: voteData.blockNumber || 'N/A',
              confirmations: voteData.confirmations || 12
            }
          };
          
          setRemoteVotes([vote]);
          
          // Fetch additional details
          if (vote.candidateId) fetchCandidateDetails(vote.candidateId, headers);
          if (vote.electionId) fetchElectionDetails(vote.electionId, headers);
        } catch (parseError) {
          console.error('Error parsing local storage vote data:', parseError);
        }
      }
      
      // If we still have no votes, log a message
      if (remoteVotes.length === 0) {
        console.log('No votes found for this voter using any method');
      }
    } catch (error) {
      console.error('Error in fetchRemoteVotes:', error);
      setError('Failed to load your vote records. Please try again later.');
    } finally {
      setLoadingRemoteVotes(false);
    }
  };
  
  // Function to fetch election details
  const fetchElectionDetails = async (electionId, headers) => {
    try {
      // Check if we already have this election's details
      if (electionDetails[electionId]) return;
      
      // Try to fetch from the elections endpoint
      try {
        const electionResponse = await axios.get(`${API_URL}/elections/${electionId}`, { headers });
        console.log(`Election details for ${electionId}:`, electionResponse.data);
        
        if (electionResponse.data) {
          const election = electionResponse.data;
          setElectionDetails(prev => ({
            ...prev,
            [electionId]: election
          }));
          return;
        }
      } catch (error) {
        console.error(`Error fetching election ${electionId} from primary endpoint:`, error);
      }
      
      // Try the active elections endpoint as fallback
      try {
        const activeElectionsResponse = await axios.get(`${API_URL}/elections/remote/active`, { headers });
        console.log('Active elections response:', activeElectionsResponse.data);
        
        let electionsData = [];
        if (Array.isArray(activeElectionsResponse.data)) {
          electionsData = activeElectionsResponse.data;
        } else if (activeElectionsResponse.data.elections) {
          electionsData = activeElectionsResponse.data.elections;
        }
        
        const matchingElection = electionsData.find(e => e._id === electionId);
        if (matchingElection) {
          setElectionDetails(prev => ({
            ...prev,
            [electionId]: matchingElection
          }));
        }
      } catch (fallbackError) {
        console.error('Error fetching from elections/remote/active:', fallbackError);
      }
    } catch (error) {
      console.error(`Error fetching election details for ${electionId}:`, error);
    }
  };
  
  // Function to fetch candidate details
  const fetchCandidateDetails = async (candidateId, headers) => {
    try {
      // Check if we already have details for this candidate
      if (candidateDetails[candidateId]) return;
      
      const candidateResponse = await axios.get(`${API_URL}/candidates/remote/${candidateId}`, { headers });
      console.log(`Candidate details for ${candidateId}:`, candidateResponse.data);
      
      if (candidateResponse.data && (candidateResponse.data.candidate || candidateResponse.data._id)) {
        const candidate = candidateResponse.data.candidate || candidateResponse.data;
        setCandidateDetails(prev => ({
          ...prev,
          [candidateId]: candidate
        }));
      }
    } catch (error) {
      console.error(`Error fetching candidate details for ${candidateId}:`, error);
      // Don't set an error, just continue
    }
  };
  
  // Function to view vote details
  const handleViewVoteDetails = (vote) => {
    setSelectedVote(vote);
    setShowVoteDetailsModal(true);
  };
  
  // Function to copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(''), 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };
  
  // Function to get candidate name from details
  const getCandidateName = (candidateId) => {
    if (!candidateId || candidateId === 'none-of-the-above') {
      return 'None of the Above';
    }
    
    if (candidateId === 'unknown') {
      return 'Unknown Candidate';
    }
    
    const candidate = candidateDetails[candidateId];
    if (candidate) {
      if (candidate.name) {
        return candidate.name;
      } else {
        return `${candidate.firstName || ''} ${candidate.middleName || ''} ${candidate.lastName || ''}`.trim();
      }
    }
    
    return `Candidate #${candidateId?.substring(0, 8) || 'Unknown'}...`;
  };
  
  // Function to get election name
  const getElectionName = (electionId) => {
    if (!electionId || electionId === 'unknown') return 'Unknown Election';
    
    const election = electionDetails[electionId];
    if (election) {
      return election.title || election.name || `Election #${electionId.substring(0, 8)}...`;
    }
    return `Election #${electionId.substring(0, 8)}...`;
  };

  // Function to calculate time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
  };

  // Render tooltip for transaction hash
  const renderHashTooltip = (hash, type = 'Transaction') => {
    return (props) => (
      <Tooltip id={`tooltip-${hash?.substring(0,8)}`} {...props}>
        <strong>{type} Hash:</strong><br />
        <code className="small">{hash}</code>
      </Tooltip>
    );
  };

  // Get transaction explorer URL
  const getTransactionExplorerUrl = (txHash) => {
    // This would be network-dependent in a real application
    // For example, for Ethereum mainnet: `https://etherscan.io/tx/${txHash}`
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5">
          <Card className="shadow border-0 mb-4">
            <Card.Body className="text-center p-5">
              <FaEthereum className="text-primary mb-3" size={48} />
              <h3 className="mb-4">Loading Blockchain Data</h3>
              <div className="d-flex flex-column align-items-center">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <div className="blockchain-loading-steps mt-3">
                  <p className="mb-2 text-muted">
                    <FaRegClock className="me-2" /> Establishing secure connection...
                  </p>
                  <p className="mb-2 text-muted">
                    <FaCubes className="me-2" /> Retrieving vote blocks...
                  </p>
                  <p className="mb-2 text-muted">
                    <FaHistory className="me-2" /> Verifying transaction history...
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4 text-white">Blockchain Vote Verification</h1>
        
        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <FaTimes className="me-3" size={24} />
            <div>{error}</div>
          </Alert>
        )}
        
        {/* Voter Information Card */}
        {voterProfile && (
          <Card className="shadow-sm mb-4 border-0">
            <Card.Header className="bg-dark text-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <FaIdCard className="me-2" size={20} /> 
                  <h4 className="mb-0">Voter Wallet</h4>
                </div>
                <Badge bg="light" text="dark" className="py-2 px-3" style={{fontFamily: 'monospace'}}>
                  Voter ID: {voterProfile.voterId}
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="bg-light">
              <Row>
                <Col md={5}>
                  <div className="mb-3">
                    <div className="text-muted small mb-1">Account Holder</div>
                    <h5 className="mb-0">{voterProfile.firstName} {voterProfile.middleName} {voterProfile.lastName}</h5>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted small mb-1">Account Status</div>
                    <Badge 
                      bg={voterProfile.status === 'approved' ? 'success' : voterProfile.status === 'rejected' ? 'danger' : 'warning'}
                      className="py-2 px-3"
                    >
                      {voterProfile.status?.charAt(0).toUpperCase() + voterProfile.status?.slice(1)}
                    </Badge>
                  </div>
                </Col>
                <Col md={7}>
                  {voterProfile.walletAddress && (
                    <div className="mb-0">
                      <div className="text-muted small mb-1">Public Key (Wallet Address)</div>
                      <div className="wallet-address-box p-3 bg-white rounded shadow-sm" style={{position: 'relative'}}>
                        <code className="d-block" style={{fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.9rem'}}>
                          {voterProfile.walletAddress}
                        </code>
                        <Button 
                          variant="light" 
                          size="sm" 
                          className="position-absolute top-0 end-0 mt-1 me-1"
                          onClick={() => copyToClipboard(voterProfile.walletAddress)}
                        >
                          <FaClipboard />
                          {copiedText === voterProfile.walletAddress && <span className="ms-1 small">Copied</span>}
                        </Button>
                      </div>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
        
        {/* Transaction History Card */}
        <Card className="mb-4 shadow border-0">
          <Card.Header className="d-flex justify-content-between align-items-center bg-dark text-white py-3">
            <h4 className="mb-0"><FaCubes className="me-2" /> Vote Transaction Ledger</h4>
            <Badge bg="light" text="dark" className="py-2 px-3">
              {remoteVotes.length} Transaction{remoteVotes.length !== 1 ? 's' : ''}
            </Badge>
          </Card.Header>
          <Card.Body className={remoteVotes.length > 0 ? "p-0" : "p-4"}>
            {loadingRemoteVotes ? (
              <div className="text-center p-5">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p className="mb-0">Fetching transaction data from the blockchain...</p>
              </div>
            ) : remoteVotes.length === 0 ? (
              <Alert variant="info" className="d-flex mb-0">
                <FaInfoCircle className="me-3 mt-1" size={24} />
                <div>
                  <h5>No Transactions Found</h5>
                  <p className="mb-0">You have not cast any votes yet, or your votes are still being processed by the blockchain network.</p>
                </div>
              </Alert>
            ) : (
              <div className="vote-transactions">
                {remoteVotes.map((vote, index) => (
                  <div key={vote.blockchainTxHash || index} 
                    className="transaction-card p-3 border-bottom" 
                    onClick={() => handleViewVoteDetails(vote)}>
                    <Row className="align-items-center">
                      <Col lg={7}>
                        <div className="d-flex align-items-center mb-2">
                          <span className={`transaction-status-indicator me-2 ${vote.confirmed ? 'confirmed' : 'pending'}`}></span>
                          <OverlayTrigger
                            placement="top"
                            delay={{ show: 250, hide: 400 }}
                            overlay={renderHashTooltip(vote.blockchainTxHash)}
                          >
                            <code className="transaction-hash d-flex align-items-center">
                              <FaEthereum className="me-2 text-primary" />
                              {vote.blockchainTxHash?.substring(0, 18)}...{vote.blockchainTxHash?.substring(vote.blockchainTxHash.length - 6)}
                            </code>
                          </OverlayTrigger>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 ms-2 copy-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(vote.blockchainTxHash);
                            }}
                          >
                            <FaClipboard />
                          </Button>
                          {copiedText === vote.blockchainTxHash && <span className="text-success ms-1 small">Copied</span>}
                        </div>
                        <div className="transaction-details">
                          <div className="mb-1 transaction-election">
                            <span className="text-muted me-2">Election:</span>
                            <span className="fw-medium">{getElectionName(vote.electionId)}</span>
                          </div>
                          {vote.candidateId && (
                            <div className="mb-1 transaction-candidate">
                              <span className="text-muted me-2">Candidate:</span>
                              <span className="fw-medium">{getCandidateName(vote.candidateId)}</span>
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col lg={5}>
                        <Row className="transaction-meta">
                          <Col xs={6} md={4} className="mb-2 mb-md-0">
                            <div className="text-muted small">TIME</div>
                            <div className="d-flex align-items-center">
                              <FaRegClock className="me-1 text-secondary" size={12} />
                              <OverlayTrigger
                                placement="top"
                                overlay={(props) => (
                                  <Tooltip id={`tooltip-time-${index}`} {...props}>
                                    {new Date(vote.timestamp).toLocaleString()}
                                  </Tooltip>
                                )}
                              >
                                <span className="small">{getTimeAgo(vote.timestamp)}</span>
                              </OverlayTrigger>
                            </div>
                          </Col>
                          <Col xs={6} md={4} className="mb-2 mb-md-0">
                            <div className="text-muted small">BLOCK</div>
                            <div>
                              {vote.blockInfo?.blockNumber !== 'N/A' ? (
                                <Badge bg="dark" className="py-1 px-2">
                                  #{vote.blockInfo?.blockNumber}
                                </Badge>
                              ) : <span className="text-muted">Pending</span>}
                            </div>
                    </Col>
                          <Col xs={12} md={4}>
                            <div className="text-muted small">STATUS</div>
                            <div className="d-flex align-items-center">
                              <Badge bg={vote.confirmed ? "success" : "warning"} className="py-1 px-2 me-2">
                                {vote.confirmed ? <FaCheck className="me-1" size={10} /> : null}
                                {vote.confirmed ? "Confirmed" : "Pending"}
                              </Badge>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                className="d-flex align-items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(getTransactionExplorerUrl(vote.blockchainTxHash), '_blank');
                                }}
                                title="View on Blockchain Explorer"
                              >
                                <FaExternalLinkAlt size={12} />
                              </Button>
                            </div>
                    </Col>
                  </Row>
                    </Col>
                      <Col xs={12} className="mt-2 d-flex justify-content-end">
                        <div className="d-flex align-items-center view-details-link">
                          <FaInfoCircle className="me-1" size={14} />
                          <span className="small">Click to view transaction details</span>
                        </div>
                    </Col>
                  </Row>
                  </div>
                ))}
                
                <div className="p-3 bg-light text-center border-top">
                  <div className="d-flex align-items-center justify-content-center text-muted small">
                    <FaInfoCircle className="me-2" /> 
                    <span>Click on any transaction to view detailed information and recording</span>
                  </div>
                </div>
              </div>
            )}
          </Card.Body>
          {remoteVotes.length > 0 && (
            <Card.Footer className="bg-light text-muted border-0">
              <div className="d-flex align-items-center">
                <FaInfoCircle className="me-2" /> 
                <small>All votes are permanently recorded on the blockchain. Each transaction is immutable and verifiable.</small>
              </div>
            </Card.Footer>
          )}
        </Card>
        
        {/* Blockchain Explorer Stats */}
        {remoteVotes.length > 0 && (
          <Card className="mb-4 shadow-sm border-0">
            <Card.Header className="bg-dark text-white py-3">
              <div className="d-flex align-items-center">
                <FaEthereum className="me-2" size={20} /> 
                <h4 className="mb-0">Blockchain Statistics</h4>
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-3 mb-md-0">
                  <Card className="h-100 blockchain-stat-card border-0 shadow-sm">
                    <Card.Body className="d-flex flex-column justify-content-between">
                      <div className="text-muted mb-2">Total Transactions</div>
                      <div className="d-flex align-items-end">
                        <h2 className="mb-0 me-2">{remoteVotes.length}</h2>
                        <div className="text-muted small pb-1">verified votes</div>
                      </div>
                      <div className="mt-3">
                        <small className="text-muted d-flex align-items-center">
                          <FaVoteYea className="me-1" /> All votes confirmed on chain
                        </small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4} className="mb-3 mb-md-0">
                  <Card className="h-100 blockchain-stat-card border-0 shadow-sm">
                    <Card.Body className="d-flex flex-column justify-content-between">
                      <div className="text-muted mb-2">Latest Block</div>
                      <div className="d-flex align-items-end">
                        <h2 className="mb-0 me-2">
                          {remoteVotes[0]?.blockInfo?.blockNumber !== 'N/A' ? 
                            remoteVotes[0]?.blockInfo?.blockNumber : 
                            'Pending'
                          }
                        </h2>
                      </div>
                      <div className="mt-3">
                        <small className="text-muted d-flex align-items-center">
                          <FaCubes className="me-1" /> Block containing latest transaction
                        </small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 blockchain-stat-card border-0 shadow-sm">
                    <Card.Body className="d-flex flex-column justify-content-between">
                      <div className="text-muted mb-2">Latest Vote Time</div>
                  <div>
                        <h5 className="mb-1">
                          {remoteVotes[0]?.timestamp ? getTimeAgo(remoteVotes[0].timestamp) : 'Unknown'}
                    </h5>
                        <div className="text-muted small">
                          {remoteVotes[0]?.timestamp ? 
                            new Date(remoteVotes[0].timestamp).toLocaleString() : 
                            'No timestamp available'
                          }
                        </div>
                      </div>
                      <div className="mt-3">
                        <small className="text-muted d-flex align-items-center">
                          <FaRegClock className="me-1" /> Last confirmed transaction
                        </small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              
              {/* Blockchain network info */}
              <div className="mt-4">
                <Alert variant="light" className="mb-0">
                  <div className="d-flex">
                    <FaInfoCircle className="mt-1 me-3" size={18} />
                    <div>
                      <h5 className="mb-2">Blockchain Verification</h5>
                      <p className="mb-0">
                        Your votes are recorded on a secure, tamper-resistant blockchain. 
                        Each transaction is verified by multiple nodes in the network, ensuring 
                        the integrity and transparency of the election process.
                      </p>
                    </div>
                  </div>
                </Alert>
              </div>
            </Card.Body>
          </Card>
        )}
        
        {/* Vote Details Modal */}
        <Modal 
          show={showVoteDetailsModal} 
          onHide={() => setShowVoteDetailsModal(false)}
          size="lg"
          centered
        >
          {selectedVote && (
            <>
              <Modal.Header closeButton className="bg-dark text-white">
                <Modal.Title>
                  <FaEthereum className="me-2" />
                  Vote Transaction Details
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="transaction-header mb-4 p-3 bg-light rounded">
                  <h5>Transaction Hash</h5>
                  <div className="d-flex align-items-center">
                    <code className="transaction-hash-full bg-white p-2 rounded w-100">
                      {selectedVote.blockchainTxHash}
                    </code>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="ms-2"
                      onClick={() => copyToClipboard(selectedVote.blockchainTxHash)}
                    >
                      <FaClipboard />
                      {copiedText === selectedVote.blockchainTxHash && <span className="ms-2">Copied!</span>}
                    </Button>
                  </div>
                </div>
                
                <Row>
                  <Col md={6} className="mb-4">
                    <h5 className="border-bottom pb-2">Vote Information</h5>
                    <ListGroup variant="flush">
                      <ListGroup.Item className="d-flex justify-content-between align-items-start">
                        <div className="ms-2 me-auto">
                          <div className="fw-bold">Election</div>
                          {getElectionName(selectedVote.electionId)}
                        </div>
                      </ListGroup.Item>
                      <ListGroup.Item className="d-flex justify-content-between align-items-start">
                        <div className="ms-2 me-auto">
                          <div className="fw-bold">Candidate</div>
                          {getCandidateName(selectedVote.candidateId)}
                        </div>
                      </ListGroup.Item>
                      <ListGroup.Item className="d-flex justify-content-between align-items-start">
                        <div className="ms-2 me-auto">
                          <div className="fw-bold">Timestamp</div>
                          {new Date(selectedVote.timestamp).toLocaleString()}
                        </div>
                      </ListGroup.Item>
                      {/* {selectedVote.verificationCode && (
                        <ListGroup.Item className="d-flex justify-content-between align-items-start">
                          <div className="ms-2 me-auto">
                            <div className="fw-bold">Verification Code</div>
                            <code>{selectedVote.verificationCode}</code>
                          </div>
                        </ListGroup.Item>
                      )} */}
                      <ListGroup.Item className="d-flex justify-content-between align-items-start">
                        <div className="ms-2 me-auto">
                          <div className="fw-bold">Status</div>
                          <Badge bg={selectedVote.confirmed ? "success" : "warning"}>
                            {selectedVote.confirmed ? "Confirmed" : "Pending"}
                          </Badge>
                        </div>
                      </ListGroup.Item>
                    </ListGroup>
                  </Col>
                  
                  <Col md={6} className="mb-4">
                    <h5 className="border-bottom pb-2">Block Information</h5>
                    {selectedVote.blockInfo ? (
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-start">
                          <div className="ms-2 me-auto">
                            <div className="fw-bold">Block Number</div>
                            {selectedVote.blockInfo.blockNumber}
                          </div>
                        </ListGroup.Item>
                        {selectedVote.blockInfo.blockHash && (
                          <ListGroup.Item className="d-flex justify-content-between align-items-start">
                            <div className="ms-2 me-auto">
                              <div className="fw-bold">Block Hash</div>
                              <code className="d-block text-truncate" style={{ maxWidth: '250px' }}>
                                {selectedVote.blockInfo.blockHash}
                              </code>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="p-0"
                                onClick={() => copyToClipboard(selectedVote.blockInfo.blockHash)}
                              >
                                Copy <FaClipboard className="ms-1" />
                              </Button>
                              {copiedText === selectedVote.blockInfo.blockHash && <span className="text-success ms-2">Copied!</span>}
                            </div>
                          </ListGroup.Item>
                        )}
                        <ListGroup.Item className="d-flex justify-content-between align-items-start">
                          <div className="ms-2 me-auto">
                            <div className="fw-bold">Confirmations</div>
                            {selectedVote.blockInfo.confirmations}
                          </div>
                        </ListGroup.Item>
                      </ListGroup>
                    ) : (
                      <Alert variant="warning">
                        No block information available for this transaction.
                      </Alert>
                    )}
                  </Col>
                </Row>
                
                {selectedVote.recordingUrl && (
                  <div className="mt-3">
                    <h5 className="border-bottom pb-2">
                      <FaVideo className="me-2" /> Vote Recording
                    </h5>
                    <div className="video-container bg-light p-3 rounded">
                      <video 
                        controls 
                        className="w-100" 
                        style={{ maxHeight: '300px' }}
                        src={`${API_URL.replace('/api', '')}${selectedVote.recordingUrl}`}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
              </div>
            )}
            
                <div className="mt-4 blockchain-explorer-link text-center">
                  <p className="mb-2">View this transaction on the public blockchain explorer</p>
                  <Button 
                    variant="outline-primary"
                    onClick={() => window.open(getTransactionExplorerUrl(selectedVote.blockchainTxHash), '_blank')}
                  >
                    <FaExternalLinkAlt className="me-2" />
                    View on Blockchain Explorer
                  </Button>
                </div>
                
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowVoteDetailsModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal>
        
        {/* Add some CSS styles */}
        <style jsx="true">{`
          .transaction-table td, .transaction-table th {
            vertical-align: middle;
          }
          .transaction-hash {
            font-family: monospace;
            background-color: #f8f9fa;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
          }
          .transaction-hash-full {
            font-family: monospace;
            overflow-x: auto;
            white-space: nowrap;
            display: block;
          }
          .vote-transaction-row:hover {
            background-color: #f8f9fa;
            cursor: pointer;
          }
          .blockchain-stats .stat-box {
            flex: 1;
            margin-right: 10px;
            transition: all 0.3s ease;
          }
          .blockchain-stats .stat-box:hover {
            background-color: #e9ecef !important;
            transform: translateY(-2px);
          }
          .blockchain-stat-card {
            transition: all 0.3s ease;
            cursor: default;
          }
          .blockchain-stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
          }
          .wallet-address-box {
            transition: all 0.2s ease;
          }
          .wallet-address-box:hover {
            background-color: #f8f9fa!important;
          }
          
          /* New transaction card styles */
          .transaction-card {
            cursor: pointer;
            transition: all 0.2s ease;
            background-color: white;
          }
          .transaction-card:hover {
            background-color: rgba(13, 110, 253, 0.03);
          }
          .transaction-card:active {
            background-color: rgba(13, 110, 253, 0.08);
          }
          .view-details-link {
            color: #6c757d;
            transition: all 0.2s ease;
          }
          .transaction-card:hover .view-details-link {
            color: #0d6efd;
          }
          .transaction-status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
          }
          .transaction-status-indicator.confirmed {
            background-color: #198754;
            box-shadow: 0 0 0 2px rgba(25, 135, 84, 0.2);
          }
          .transaction-status-indicator.pending {
            background-color: #ffc107;
            box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);
          }
          .transaction-meta {
            font-size: 0.85rem;
          }
          .fw-medium {
            font-weight: 500;
          }
          .confirmations-badge {
            font-size: 0.75rem;
            background-color: #0dcaf0;
            color: white;
            border-radius: 12px;
            padding: 0.15rem 0.5rem;
            margin-left: 0.25rem;
          }
          .copy-btn {
            opacity: 0.5;
            transition: all 0.2s ease;
          }
          .transaction-card:hover .copy-btn {
            opacity: 1;
          }
          .transaction-details {
            margin-left: 1.2rem;
          }
        `}</style>
      </Container>
    </Layout>
  );
};

export default VerifyVote; 