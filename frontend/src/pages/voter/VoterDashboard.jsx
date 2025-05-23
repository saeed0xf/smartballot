import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaVoteYea, FaUserCheck, FaClipboardList, FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

// Display candidates for an active election
const ElectionCandidatesList = ({ candidates }) => {
  if (!candidates || candidates.length === 0) {
    return (
      <p className="text-muted">No candidates found for this election.</p>
    );
  }

  return (
    <div className="mt-3">
      <h6 className="mb-3 border-bottom pb-2">Candidates</h6>
      <Row xs={1} md={2} lg={3} className="g-3">
        {candidates.map((candidate) => (
          <Col key={candidate.id || candidate._id}>
            <Card className="h-100 candidate-card">
              <div className="text-center pt-3">
                {candidate.photoUrl ? (
                  <div className="candidate-img-container mx-auto">
                    <img 
                      src={getImageUrl(candidate.photoUrl)} 
                      alt={candidate.name || `${candidate.firstName} ${candidate.lastName}`} 
                      className="rounded-circle candidate-img"
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  </div>
                ) : (
                  <div 
                    className="bg-light rounded-circle mx-auto d-flex align-items-center justify-content-center"
                    style={{ width: '80px', height: '80px' }}
                  >
                    <FaUserCheck size={30} />
                  </div>
                )}
              </div>
              <Card.Body className="text-center">
                <Card.Title>{candidate.name || `${candidate.firstName} ${candidate.lastName}`}</Card.Title>
                <div className="d-flex align-items-center justify-content-center mb-2">
                  {candidate.partySymbol && (
                    <img 
                      src={getImageUrl(candidate.partySymbol)} 
                      alt={candidate.partyName} 
                      className="me-2" 
                      style={{ width: '24px', height: '24px' }}
                    />
                  )}
                  <span className="text-muted">{candidate.partyName}</span>
                </div>
                {candidate.constituency && (
                  <p className="small text-muted mb-0">
                    Constituency: {candidate.constituency}
                  </p>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

const VoterDashboard = () => {
  const { user } = useContext(AuthContext);
  const [voterProfile, setVoterProfile] = useState(null);
  const [electionStatus, setElectionStatus] = useState(null);
  const [activeElections, setActiveElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voteStatus, setVoteStatus] = useState(null);
  const [filteredElections, setFilteredElections] = useState([]);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString || 'N/A';
    }
  };

  // Calculate time remaining
  const getTimeRemaining = (endDate) => {
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        return "Ended";
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days}d ${hours}h remaining`;
      }
      if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
      }
      return `${minutes}m remaining`;
    } catch (error) {
      return "Time unknown";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth headers
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch voter profile
        let voterData = null;
        try {
          const profileResponse = await axios.get(`${API_URL}/voter/profile`, { headers });
          console.log('Voter profile:', profileResponse.data);
          voterData = profileResponse.data.voter;
          setVoterProfile(voterData);
        } catch (profileError) {
          console.error('Error fetching voter profile:', profileError);
          // Continue with other fetches even if profile fails
        }

        // Fetch all active elections (this should now include candidates)
        try {
          const activeElectionsResponse = await axios.get(`${API_URL}/elections/remote/active`, { headers });
          console.log('Active elections:', activeElectionsResponse.data);
          
          // Handle different response formats
          let electionsData = [];
          if (Array.isArray(activeElectionsResponse.data)) {
            electionsData = activeElectionsResponse.data;
          } else if (activeElectionsResponse.data.elections && Array.isArray(activeElectionsResponse.data.elections)) {
            electionsData = activeElectionsResponse.data.elections;
          } else {
            electionsData = [activeElectionsResponse.data]; // Assume it's a single election object
          }
          
          setActiveElections(electionsData);
          
          // Filter elections based on voter's pincode if voter data is available
          if (voterData && voterData.pincode) {
            console.log(`Filtering elections for voter pincode: ${voterData.pincode}`);
            
            // Filter elections that match the voter's pincode
            const matchingElections = electionsData.filter(election => {
              // Check if the election pincode matches voter's pincode
              return election.pincode === voterData.pincode;
            });
            
            console.log(`Found ${matchingElections.length} elections matching voter's pincode`);
            setFilteredElections(matchingElections);
            
            // If we have filtered elections, set the first one as the current election status
            if (matchingElections.length > 0) {
              setElectionStatus({
                active: true,
                election: matchingElections[0],
                currentTime: new Date()
              });
            } else {
              // No matching elections for this voter's pincode
              setElectionStatus({
                active: false,
                election: null,
                currentTime: new Date(),
                message: "No active elections in your area."
              });
            }
          } else {
            // If no voter pincode is available, just set all active elections
            setFilteredElections(electionsData);
            
            // If we have active elections, set the first one as the current election status
            if (electionsData.length > 0) {
              setElectionStatus({
                active: true,
                election: electionsData[0],
                currentTime: new Date()
              });
            }
          }
        } catch (electionsError) {
          console.error('Error fetching active elections:', electionsError);
          // Try fetching a single election status as fallback
          try {
            const electionResponse = await axios.get(`${API_URL}/election/status`, { headers });
            console.log('Election status:', electionResponse.data);
            
            // If we have election data and voter data, check for pincode match
            if (electionResponse.data.active && voterData && voterData.pincode && 
                electionResponse.data.election && electionResponse.data.election.pincode) {
              
              // Only set as active if pincode matches
              if (electionResponse.data.election.pincode === voterData.pincode) {
                setElectionStatus(electionResponse.data);
                setFilteredElections([electionResponse.data.election]);
              } else {
                // No matching election for this voter's pincode
                setElectionStatus({
                  active: false,
                  election: null,
                  currentTime: new Date(),
                  message: "No active elections in your area."
                });
                setFilteredElections([]);
              }
            } else {
              // If no pincode information, just use the response as is
              setElectionStatus(electionResponse.data);
              if (electionResponse.data.active && electionResponse.data.election) {
                setFilteredElections([electionResponse.data.election]);
              } else {
                setFilteredElections([]);
              }
            }
          } catch (statusError) {
            console.error('Error fetching election status:', statusError);
            setElectionStatus({
              active: false,
              election: null,
              currentTime: new Date()
            });
            setFilteredElections([]);
          }
        }

        // Check if voter has already voted
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
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check if voter has already voted
  const hasVoted = () => {
    if (voteStatus && voteStatus.hasVoted) {
      return true;
    }
    
    // Also check blockchain status if available
    if (voterProfile && voterProfile.blockchainStatus && voterProfile.blockchainStatus.hasVoted) {
      return true;
    }
    
    return false;
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading voter dashboard...</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4 text-white">Voter Dashboard</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {voterProfile && (
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light">
              <h4 className="mb-0">Voter Information</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                {/* <Col md={3} className="text-center mb-3 mb-md-0">
                  {voterProfile.faceImage ? (
                    <img 
                      src={getImageUrl(voterProfile.faceImage)}
                      alt="Voter Photo" 
                      className="img-fluid rounded-circle" 
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div 
                      className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '150px', height: '150px', margin: '0 auto' }}
                    >
                      <span className="h1">{voterProfile.firstName?.charAt(0)}{voterProfile.lastName?.charAt(0)}</span>
                    </div>
                  )}
                </Col> */}
                <Col md={9}>
                  <h3>{voterProfile.firstName} {voterProfile.middleName ? voterProfile.middleName + ' ' : ''}{voterProfile.lastName}</h3>
                  <p className="text-muted mb-2">Voter ID: {voterProfile.voterId}</p>
                  <p className="text-muted mb-2">Age: {voterProfile.age}</p>
                  <p className="text-muted mb-3">Date of Birth: {new Date(voterProfile.dateOfBirth).toLocaleDateString()}</p>
                  <p className="text-muted mb-3">
                    <FaMapMarkerAlt className="me-1" /> Pincode: {voterProfile.pincode || 'Not specified'}
                  </p>
                  
                  <div>
                    <span className={`badge ${voterProfile.status === 'approved' ? 'bg-success' : voterProfile.status === 'rejected' ? 'bg-danger' : 'bg-warning'} me-2`}>
                      {voterProfile.status?.charAt(0).toUpperCase() + voterProfile.status?.slice(1)}
                    </span>
                    
                    {voterProfile.status === 'rejected' && voterProfile.rejectionReason && (
                      <span className="text-danger small">
                        Reason: {voterProfile.rejectionReason}
                      </span>
                    )}
                    
                    {hasVoted() && (
                      <Badge bg="info" className="ms-2">Vote Cast</Badge>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
        
        {/* Active Elections Section */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light d-flex justify-content-between align-items-center">
            <h4 className="mb-0">Election Status</h4>
            {filteredElections.length > 0 && (
              <Badge bg="success">{filteredElections.length} Active Election{filteredElections.length !== 1 ? 's' : ''} in Your Area</Badge>
            )}
          </Card.Header>
          <Card.Body>
            {filteredElections.length > 0 ? (
              <>
                {filteredElections.map((election, index) => (
                  <Card key={election._id || index} className={index > 0 ? "mt-4 border" : "border"}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5>{election.title || election.name}</h5>
                          <p className="text-muted">
                            <FaCalendarAlt className="me-2" />
                            {election.type || "General Election"}
                          </p>
                          <p className="text-muted">
                            <FaMapMarkerAlt className="me-2" />
                            Pincode: {election.pincode || 'Not specified'}
                          </p>
                          {election.description && (
                            <p>{election.description}</p>
                          )}
                        </div>
                        <div className="text-end">
                          <Badge bg="success" className="mb-2">Active</Badge>
                          <p className="small text-muted mb-1">
                            <FaClock className="me-1" />
                            {getTimeRemaining(election.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between mt-3">
                        <div>
                          <p className="small text-muted mb-0">
                            Started: {formatDate(election.startDate)}
                          </p>
                          <p className="small text-muted">
                            Ends: {formatDate(election.endDate)}
                          </p>
                        </div>
                        <Button 
                          as={Link} 
                          to="/voter/vote" 
                          variant="primary"
                          className="mb-4"
                          disabled={hasVoted() || voterProfile?.status !== 'approved'}
                        >
                          {hasVoted() ? 'Vote Already Cast' : 'Cast Vote'}
                        </Button>
                      </div>

                      {/* Display candidates for this election */}
                      {election.candidates && election.candidates.length > 0 && (
                        <ElectionCandidatesList candidates={election.candidates} />
                      )}
                      
                      {/* Show a link to view all candidates if there are any */}
                      {election.candidates && election.candidates.length > 0 && (
                        <div className="text-center mt-3">
                          <Button 
                            as={Link} 
                            to="/voter/candidates" 
                            variant="outline-primary"
                            size="sm"
                          >
                            View All Candidates
                          </Button>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </>
            ) : electionStatus && electionStatus.active ? (
              <Alert variant="success">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5>{electionStatus.election.title || electionStatus.election.name}</h5>
                    <p>
                      <strong>Description:</strong> {electionStatus.election.description || "No description available"}
                    </p>
                    <p>
                      <FaMapMarkerAlt className="me-2" />
                      <strong>Pincode:</strong> {electionStatus.election.pincode || 'Not specified'}
                    </p>
                    <p>
                      <strong>Started:</strong> {formatDate(electionStatus.election.startDate)}
                    </p>
                    <p>
                      <strong>Ends:</strong> {formatDate(electionStatus.election.endDate)}
                    </p>
                  </div>
                  <Button 
                    as={Link} 
                    to="/voter/vote" 
                    variant="primary"
                    className="mb-4"
                    disabled={hasVoted() || voterProfile?.status !== 'approved'}
                  >
                    {hasVoted() ? 'Vote Already Cast' : 'Cast Vote'}
                  </Button>
                </div>
                
                <div className="text-center mt-3">
                  <Button 
                    as={Link} 
                    to="/voter/candidates" 
                    variant="outline-primary"
                    size="sm"
                  >
                    View All Candidates
                  </Button>
                </div>
              </Alert>
            ) : (
              <Alert variant="info">
                {electionStatus && electionStatus.message ? electionStatus.message : 
                 voterProfile && voterProfile.pincode ? 
                 "No active elections for your pincode area. Please check back later." : 
                 "No active election at the moment. Please check back later."}
              </Alert>
            )}
          </Card.Body>
        </Card>
        
        <h4 className="mb-3">Quick Actions</h4>
        <Row>
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm dashboard-card">
              <Card.Body className="d-flex flex-column align-items-center text-center">
                <div className="dashboard-icon">
                  <FaUserCheck />
                </div>
                <Card.Title>View Candidates</Card.Title>
                <Card.Text>
                  Browse the list of candidates participating in the election.
                </Card.Text>
                <Button 
                  as={Link} 
                  to="/voter/candidates" 
                  variant="outline-primary" 
                  className="mt-auto"
                >
                  View Candidates
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm dashboard-card">
              <Card.Body className="d-flex flex-column align-items-center text-center">
                <div className="dashboard-icon">
                  <FaVoteYea />
                </div>
                <Card.Title>Cast Vote</Card.Title>
                <Card.Text>
                  Cast your vote in the active election.
                </Card.Text>
                <Button 
                  as={Link} 
                  to="/voter/vote" 
                  variant="outline-primary" 
                  className="mt-auto mb-4"
                  disabled={filteredElections.length === 0 || hasVoted() || voterProfile?.status !== 'approved'}
                >
                  {hasVoted() ? 'Already Voted' : 'Cast Vote'}
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm dashboard-card">
              <Card.Body className="d-flex flex-column align-items-center text-center">
                <div className="dashboard-icon">
                  <FaClipboardList />
                </div>
                <Card.Title>Verify Vote</Card.Title>
                <Card.Text>
                  Verify your vote has been recorded correctly.
                </Card.Text>
                <Button 
                  as={Link} 
                  to="/voter/verify" 
                  variant="outline-primary" 
                  className="mt-auto"
                >
                  Verify Vote
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default VoterDashboard; 