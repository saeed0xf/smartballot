import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Spinner, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { FaDownload, FaChartBar, FaRegFilePdf, FaArrowLeft, FaFilter, FaSearch, FaMapMarkerAlt, FaUser, FaPlay, FaStop, FaVoteYea, FaUserCheck, FaUserPlus, FaExclamationCircle, FaEthereum, FaExchangeAlt, FaFileContract } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';

const ElectionResults = () => {
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterPincode, setFilterPincode] = useState('');
  const [regions, setRegions] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Blockchain data
  const [blockchainTransactions, setBlockchainTransactions] = useState([]);
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);
  const [blockchainError, setBlockchainError] = useState(null);
  
  // Fetch election data
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real app, we would fetch from the API
        // const response = await axios.get(`/api/officer/elections/${electionId}`);
        // setElection(response.data.election);
        // setCandidates(response.data.candidates);
        
        // For now, we'll use sample data
        setTimeout(() => {
          // Sample election data
          const sampleElection = {
            id: electionId || 'e1',
            title: 'Lok Sabha Elections 2023',
            description: 'General Elections for the Lower House of Parliament',
            status: 'active',
            startDate: '2023-10-15',
            endDate: '2023-10-30',
            totalVoters: 1250,
            totalVotes: 875,
            voterTurnout: '70%',
            regions: ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
            pincodes: ['110001', '110002', '110003', '110005', '110006']
          };
          
          // Sample candidate data with votes
          const sampleCandidates = [
            {
              id: 'c1',
              name: 'Rajesh Kumar',
              party: 'Democratic Party',
              symbol: '🌾',
              votes: 320,
              percentage: 36.57,
              regionResults: {
                'North Delhi': 85,
                'South Delhi': 110,
                'East Delhi': 65,
                'West Delhi': 60
              },
              pincodeResults: {
                '110001': 60,
                '110002': 75,
                '110003': 45,
                '110005': 90,
                '110006': 50
              }
            },
            {
              id: 'c2',
              name: 'Priya Singh',
              party: 'People\'s Alliance',
              symbol: '🌞',
              votes: 280,
              percentage: 32,
              regionResults: {
                'North Delhi': 65,
                'South Delhi': 80,
                'East Delhi': 95,
                'West Delhi': 40
              },
              pincodeResults: {
                '110001': 55,
                '110002': 60,
                '110003': 70,
                '110005': 50,
                '110006': 45
              }
            },
            {
              id: 'c3',
              name: 'Amir Khan',
              party: 'Progressive Front',
              symbol: '🌟',
              votes: 215,
              percentage: 24.57,
              regionResults: {
                'North Delhi': 55,
                'South Delhi': 45,
                'East Delhi': 60,
                'West Delhi': 55
              },
              pincodeResults: {
                '110001': 35,
                '110002': 45,
                '110003': 60,
                '110005': 40,
                '110006': 35
              }
            },
            {
              id: 'c4',
              name: 'Sarah Johnson',
              party: 'Independent',
              symbol: '🌈',
              votes: 60,
              percentage: 6.86,
              regionResults: {
                'North Delhi': 20,
                'South Delhi': 15,
                'East Delhi': 10,
                'West Delhi': 15
              },
              pincodeResults: {
                '110001': 10,
                '110002': 15,
                '110003': 12,
                '110005': 13,
                '110006': 10
              }
            }
          ];
          
          setElection(sampleElection);
          setCandidates(sampleCandidates);
          setRegions(sampleElection.regions);
          setPincodes(sampleElection.pincodes);
          setLoading(false);
        }, 1200);
      } catch (error) {
        console.error('Error fetching election data:', error);
        setError('Failed to load election results. Please try again.');
        setLoading(false);
      }
    };
    
    fetchElectionData();
  }, [electionId]);
  
  // Fetch blockchain transactions
  useEffect(() => {
    const fetchBlockchainData = async () => {
      if (activeTab !== 'blockchain' || !electionId) return;
      
      try {
        setLoadingBlockchain(true);
        setBlockchainError(null);
        
        // In a real app, we would fetch from the blockchain or API
        // For now, we'll use sample data
        setTimeout(() => {
          // Sample blockchain transaction data
          const sampleTransactions = [
            {
              txHash: '0x7c5ea36004851c764c44143b1dcb59a3c054e706e1ce9a226e7f7d416bd4e390',
              type: 'ElectionStart',
              timestamp: '2023-10-15T08:00:00.000Z',
              from: '0x5dfA4943B7C0f3aa7545B1B4c5D6e64A19E3CF49',
              data: {
                electionId: electionId,
                candidateCount: 4
              },
              status: 'Confirmed',
              blockNumber: 15482763
            },
            {
              txHash: '0x3a1c5b1f8d4e6a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2c4e6f8a0b2c4d6',
              type: 'Vote',
              timestamp: '2023-10-15T09:35:12.000Z',
              from: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
              data: {
                candidateId: 'c1',
                electionId: electionId
              },
              status: 'Confirmed',
              blockNumber: 15482800
            },
            {
              txHash: '0xb2c4d6e8f0a2c4e6f8a0b2c4d6e8f0a2c4e6f8a0b2c4d6e8f0a2c4e6f8a0b2c4',
              type: 'Vote',
              timestamp: '2023-10-15T10:12:45.000Z',
              from: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
              data: {
                candidateId: 'c2',
                electionId: electionId
              },
              status: 'Confirmed',
              blockNumber: 15482845
            },
            {
              txHash: '0x8f0a2c4e6f8a0b2c4d6e8f0a2c4e6f8a0b2c4d6e8f0a2c4e6f8a0b2c4d6e8f0a',
              type: 'Vote',
              timestamp: '2023-10-15T11:27:33.000Z',
              from: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
              data: {
                candidateId: 'c3',
                electionId: electionId
              },
              status: 'Confirmed',
              blockNumber: 15482897
            },
            {
              txHash: '0xd6e8f0a2c4e6f8a0b2c4d6e8f0a2c4e6f8a0b2c4d6e8f0a2c4e6f8a0b2c4d6e8',
              type: 'VoterApproval',
              timestamp: '2023-10-15T12:05:10.000Z',
              from: '0x5dfA4943B7C0f3aa7545B1B4c5D6e64A19E3CF49',
              data: {
                voterId: 'VID12345678',
                pincode: '110001'
              },
              status: 'Confirmed',
              blockNumber: 15482950
            }
          ];
          
          setBlockchainTransactions(sampleTransactions);
          setLoadingBlockchain(false);
        }, 1200);
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
        setBlockchainError('Failed to load blockchain transactions. Please try again.');
        setLoadingBlockchain(false);
      }
    };
    
    fetchBlockchainData();
  }, [electionId, activeTab]);
  
  // Handle filter changes
  const handleRegionChange = (e) => {
    setFilterRegion(e.target.value);
  };
  
  const handlePincodeChange = (e) => {
    setFilterPincode(e.target.value);
  };
  
  // Get filtered results
  const getFilteredResults = () => {
    if (!candidates) return [];
    
    return candidates.map(candidate => {
      let filteredVotes = candidate.votes;
      
      // Apply region filter
      if (filterRegion !== 'all') {
        filteredVotes = candidate.regionResults[filterRegion] || 0;
      }
      
      // Apply pincode filter
      if (filterPincode && filterPincode !== 'all') {
        filteredVotes = candidate.pincodeResults[filterPincode] || 0;
      }
      
      return {
        ...candidate,
        filteredVotes
      };
    }).sort((a, b) => b.filteredVotes - a.filteredVotes);
  };
  
  // Get winner
  const getWinner = () => {
    if (!candidates || candidates.length === 0) return null;
    
    return candidates.reduce((prev, current) => 
      (prev.votes > current.votes) ? prev : current
    );
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  // Generate report
  const handleGenerateReport = async (format) => {
    try {
      setGenerating(true);
      setExportFormat(format);
      
      // Simulate report generation with a timeout
      setTimeout(() => {
        setGenerating(false);
        
        // In a real app, we would trigger a download
        // For now, just log that we're generating a report
        console.log(`Generating ${format.toUpperCase()} report for election ${electionId}...`);
        
        // Show a message to the user
        alert(`${format.toUpperCase()} report for "${election.title}" has been generated and downloaded!`);
      }, 2000);
    } catch (error) {
      console.error('Error generating report:', error);
      setGenerating(false);
    }
  };
  
  // Get transaction explorer URL
  const getTransactionExplorerUrl = (txHash) => {
    // This would be network-dependent in a real application
    // For example, for Ethereum mainnet: `https://etherscan.io/tx/${txHash}`
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };
  
  // Format transaction type
  const formatTransactionType = (type) => {
    switch (type) {
      case 'ElectionStart':
        return 'Election Started';
      case 'ElectionEnd':
        return 'Election Ended';
      case 'Vote':
        return 'Vote Cast';
      case 'VoterApproval':
        return 'Voter Approved';
      case 'CandidateRegistration':
        return 'Candidate Registered';
      default:
        return type;
    }
  };
  
  // Get transaction icon
  const getTransactionIcon = (type) => {
    switch (type) {
      case 'ElectionStart':
        return <FaPlay className="text-success" />;
      case 'ElectionEnd':
        return <FaStop className="text-danger" />;
      case 'Vote':
        return <FaVoteYea className="text-primary" />;
      case 'VoterApproval':
        return <FaUserCheck className="text-info" />;
      case 'CandidateRegistration':
        return <FaUserPlus className="text-warning" />;
      default:
        return <FaExclamationCircle />;
    }
  };
  
  // Format wallet address
  const formatWalletAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Display the filtered results
  const filteredResults = getFilteredResults();
  const winner = getWinner();
  
  // Calculate total filtered votes
  const totalFilteredVotes = filteredResults.reduce((total, candidate) => total + candidate.filteredVotes, 0);
  
  // Render loading state
  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading election results...</p>
        </Container>
      </Layout>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="danger">{error}</Alert>
          <Button as={Link} to="/officer" variant="primary">
            Return to Dashboard
          </Button>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>{election?.title || 'Election Results'}</h1>
            <p className="text-muted">
              Detailed voting results and analytics.
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
            <div className="election-info">
              <Row>
                <Col md={6}>
                  <p><strong>Description:</strong> {election?.description}</p>
                  <p><strong>Period:</strong> {formatDate(election?.startDate)} to {formatDate(election?.endDate)}</p>
                  <p><strong>Status:</strong> <Badge bg={election?.status === 'active' ? 'success' : 'secondary'}>
                    {election?.status === 'active' ? 'Active' : 'Completed'}
                  </Badge></p>
                </Col>
                <Col md={6}>
                  <p><strong>Total Eligible Voters:</strong> {election?.totalVoters}</p>
                  <p><strong>Total Votes Cast:</strong> {election?.totalVotes}</p>
                  <p><strong>Voter Turnout:</strong> {election?.voterTurnout}</p>
                </Col>
              </Row>
            </div>
          </Card.Body>
        </Card>
        
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Results & Analytics</h5>
              <div>
                <Button 
                  variant="outline-primary" 
                  className="me-2"
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={generating}
                >
                  {generating && exportFormat === 'pdf' ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaRegFilePdf className="me-2" /> PDF Report
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline-success"
                  onClick={() => handleGenerateReport('excel')}
                  disabled={generating}
                >
                  {generating && exportFormat === 'excel' ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaDownload className="me-2" /> Excel Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
            >
              <Tab eventKey="overview" title="Overview">
                <Row className="mb-4">
                  <Col md={12}>
                    <h5 className="mb-3">Voting Results</h5>
                    
                    {winner && (
                      <Alert variant="success" className="d-flex align-items-center mb-4">
                        <div className="me-3 fs-3">{winner.symbol}</div>
                        <div>
                          <strong>Winner:</strong> {winner.name} ({winner.party}) with {winner.votes} votes 
                          ({winner.percentage}% of total votes)
                        </div>
                      </Alert>
                    )}
                    
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Candidate</th>
                          <th>Party</th>
                          <th>Votes</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.sort((a, b) => b.votes - a.votes).map((candidate, index) => (
                          <tr key={candidate.id} className={index === 0 ? 'table-success' : ''}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="me-2">{candidate.symbol}</span>
                                {candidate.name}
                              </div>
                            </td>
                            <td>{candidate.party}</td>
                            <td>{candidate.votes}</td>
                            <td>{candidate.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Col>
                </Row>
              </Tab>
              
              <Tab eventKey="regional" title="Regional Analysis">
                <Row className="mb-4">
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaMapMarkerAlt className="me-2" /> Filter by Region
                      </Form.Label>
                      <Form.Select 
                        value={filterRegion} 
                        onChange={handleRegionChange}
                      >
                        <option value="all">All Regions</option>
                        {regions.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaFilter className="me-2" /> Filter by Pincode
                      </Form.Label>
                      <Form.Select 
                        value={filterPincode} 
                        onChange={handlePincodeChange}
                      >
                        <option value="">All Pincodes</option>
                        {pincodes.map(pincode => (
                          <option key={pincode} value={pincode}>{pincode}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Party</th>
                      <th>Votes in Selected Region/Pincode</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((candidate, index) => (
                      <tr key={candidate.id} className={index === 0 ? 'table-success' : ''}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="me-2">{candidate.symbol}</span>
                            {candidate.name}
                          </div>
                        </td>
                        <td>{candidate.party}</td>
                        <td>{candidate.filteredVotes}</td>
                        <td>
                          {totalFilteredVotes > 0 
                            ? ((candidate.filteredVotes / totalFilteredVotes) * 100).toFixed(2) 
                            : '0.00'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Tab>
              
              <Tab eventKey="verification" title="Voter Verification">
                <div className="p-3 bg-light rounded mb-4">
                  <h5 className="mb-3">Voter Verification Videos</h5>
                  <p className="text-muted">
                    This feature will allow election officers to review voter verification videos
                    to ensure election integrity. The videos will show voters during the verification
                    process with their identification documents.
                  </p>
                  <div className="d-flex align-items-center">
                    <FaUser className="me-2 text-primary" />
                    <p className="mb-0">
                      <strong>Coming Soon:</strong> Verification video review functionality will be available in the next update.
                    </p>
                  </div>
                </div>
              </Tab>
              
              <Tab eventKey="blockchain" title="Blockchain Verification">
                <div className="mb-4">
                  <Card className="border-0 bg-light mb-4">
                    <Card.Body className="p-4">
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <div className="p-3 rounded-circle bg-primary bg-opacity-10">
                            <FaEthereum className="text-primary" size={24} />
                          </div>
                        </div>
                        <div>
                          <h5 className="mb-1">Blockchain Verified Election</h5>
                          <p className="mb-0 text-muted">
                            This election is secured by blockchain technology. All votes and key 
                            operations are recorded immutably on the blockchain for transparency and security.
                          </p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                  
                  <h5 className="mb-3">Blockchain Transactions</h5>
                  <p className="text-muted mb-4">
                    Below are all blockchain transactions related to this election. Each transaction 
                    represents an operation that has been permanently recorded on the blockchain.
                  </p>
                  
                  {loadingBlockchain ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="primary" />
                      <p className="mt-3">Loading blockchain transactions...</p>
                    </div>
                  ) : blockchainError ? (
                    <Alert variant="danger">{blockchainError}</Alert>
                  ) : blockchainTransactions.length === 0 ? (
                    <Alert variant="info">No blockchain transactions found for this election.</Alert>
                  ) : (
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Transaction Hash</th>
                          <th>From</th>
                          <th>Timestamp</th>
                          <th>Block</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockchainTransactions.map(tx => (
                          <tr key={tx.txHash}>
                            <td className="align-middle">
                              <div className="d-flex align-items-center">
                                {getTransactionIcon(tx.type)}
                                <span className="ms-2">{formatTransactionType(tx.type)}</span>
                              </div>
                            </td>
                            <td className="align-middle">
                              <a 
                                href={getTransactionExplorerUrl(tx.txHash)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-break"
                              >
                                {formatWalletAddress(tx.txHash)}
                              </a>
                            </td>
                            <td className="align-middle">
                              {formatWalletAddress(tx.from)}
                            </td>
                            <td className="align-middle">
                              {formatDate(tx.timestamp)}
                            </td>
                            <td className="align-middle">
                              {tx.blockNumber}
                            </td>
                            <td className="align-middle">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                              >
                                <FaFileContract className="me-1" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>
                
                <div className="d-flex justify-content-center mt-4">
                  <Button variant="outline-secondary">
                    <FaExchangeAlt className="me-2" /> Verify Blockchain State
                  </Button>
                </div>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default ElectionResults; 