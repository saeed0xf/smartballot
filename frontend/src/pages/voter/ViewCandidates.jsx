import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge, Button, Modal, Form, InputGroup, Spinner, Tab, Nav } from 'react-bootstrap';
import { FaSearch, FaFilter, FaUser, FaMapMarkerAlt, FaIdCard, FaCalendarAlt, FaBirthdayCake, FaBookReader, FaHistory, FaCertificate } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../../components/Layout';
import { formatImageUrl } from '../../utils/imageUtils';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ViewCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [electionGroups, setElectionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedElection, setSelectedElection] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [activeView, setActiveView] = useState('grid');
  const [compareList, setCompareList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth headers
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Fetch all active elections (which already include candidates)
        const electionsResponse = await axios.get(`${API_URL}/elections/remote/active`, { headers });
        console.log('Active elections:', electionsResponse.data);
        
        // Handle different response formats
        let electionsData = [];
        if (Array.isArray(electionsResponse.data)) {
          electionsData = electionsResponse.data;
        } else if (electionsResponse.data.elections && Array.isArray(electionsResponse.data.elections)) {
          electionsData = electionsResponse.data.elections;
        } else if (electionsResponse.data) {
          electionsData = [electionsResponse.data]; // Assume it's a single election object
        }
        
        setElections(electionsData);
        
        // Extract candidates from elections
        let allCandidates = [];
        const electionGroups = [];
        
        // Process each election and extract its candidates
        electionsData.forEach(election => {
          if (election.candidates && Array.isArray(election.candidates)) {
            // Add election to election groups
            const electionGroup = {
              electionId: election._id,
              electionName: election.title || election.name,
              electionType: election.type,
              electionDescription: election.description,
              electionStartDate: election.startDate,
              electionEndDate: election.endDate,
              electionPincode: election.pincode,
              candidates: []
            };
            
            // Process each candidate
            election.candidates.forEach(candidate => {
              // Enhance candidate with election info
              const enhancedCandidate = {
                ...candidate,
                electionId: election._id,
                electionName: election.title || election.name,
                electionType: election.type,
                electionDescription: election.description,
                electionStartDate: election.startDate,
                electionEndDate: election.endDate,
                electionPincode: election.pincode,
                photoUrl: formatImageUrl(candidate.photoUrl || candidate.image),
                partySymbol: formatImageUrl(candidate.partySymbol)
              };
              
              // Add to all candidates array
              allCandidates.push(enhancedCandidate);
              
              // Add to this election's candidates
              electionGroup.candidates.push(enhancedCandidate);
            });
            
            // Add this election group if it has candidates
            if (electionGroup.candidates.length > 0) {
              electionGroups.push(electionGroup);
            }
          }
        });
        
        console.log(`Extracted ${allCandidates.length} candidates from ${electionGroups.length} elections`);
        
        // Set the election groups and candidates
        setElectionGroups(electionGroups);
        setCandidates(allCandidates);
        setFilteredCandidates(allCandidates);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load candidates. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter candidates based on selected election and search term
  useEffect(() => {
    let filtered = [...candidates];
    
    // Filter by election
    if (selectedElection !== 'all') {
      filtered = filtered.filter(candidate => 
        candidate.election === selectedElection || 
        candidate.electionId === selectedElection
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(candidate => 
        (candidate.firstName && candidate.firstName.toLowerCase().includes(term)) ||
        (candidate.lastName && candidate.lastName.toLowerCase().includes(term)) ||
        (candidate.name && candidate.name.toLowerCase().includes(term)) ||
        (candidate.partyName && candidate.partyName.toLowerCase().includes(term)) ||
        (candidate.constituency && candidate.constituency.toLowerCase().includes(term))
      );
    }
    
    setFilteredCandidates(filtered);
  }, [selectedElection, searchTerm, candidates]);

  const handleElectionChange = (e) => {
    setSelectedElection(e.target.value);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedCandidate(null);
  };

  // Function to load detailed candidate information when viewing details
  const loadCandidateDetails = async (candidateId) => {
    try {
      if (!candidateId) {
        console.error('No candidate ID provided for loading details');
        return;
      }
      
      console.log(`Loading details for candidate ID: ${candidateId}`);
      
      // Since we may not be able to fetch from the endpoint, first try to find the candidate in our existing data
      const existingCandidate = candidates.find(c => 
        (c._id === candidateId || c.id === candidateId)
      );
      
      if (existingCandidate) {
        console.log('Found candidate in existing data:', existingCandidate);
        setSelectedCandidate(existingCandidate);
      }
      
      // Always try to fetch more detailed information from the API
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Make sure we're using the correct ID format - some candidates might have 'id' instead of '_id'
        const apiCandidateId = candidateId.toString();
        console.log(`Fetching details for candidate ID: ${apiCandidateId} from API`);
        
        // First try the direct candidate endpoint which gives the most complete details
        const response = await axios.get(`${API_URL}/candidates/remote/${apiCandidateId}`, { headers });
        console.log('Candidate details response:', response.data);
        
        // Handle different response formats
        if (response.data && response.data.candidate) {
          // Update the selected candidate with the detailed info, but merge with existing data
          setSelectedCandidate(prevCandidate => ({
            ...prevCandidate,
            ...response.data.candidate,
            photoUrl: formatImageUrl(response.data.candidate.photoUrl || response.data.candidate.image),
            partySymbol: formatImageUrl(response.data.candidate.partySymbol)
          }));
        } else if (response.data) {
          // If the response directly contains the candidate data
          setSelectedCandidate(prevCandidate => ({
            ...prevCandidate,
            ...response.data,
            photoUrl: formatImageUrl(response.data.photoUrl || response.data.image),
            partySymbol: formatImageUrl(response.data.partySymbol)
          }));
        }
      } catch (apiError) {
        console.error('Error fetching from primary candidate endpoint:', apiError);
        
        // Fallback to election/candidates endpoint
        try {
          const token = localStorage.getItem('token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const fallbackResponse = await axios.get(`${API_URL}/election/candidates/${candidateId}`, { headers });
          
          if (fallbackResponse.data && fallbackResponse.data.candidate) {
            setSelectedCandidate(prevCandidate => ({
              ...prevCandidate,
              ...fallbackResponse.data.candidate,
              photoUrl: formatImageUrl(fallbackResponse.data.candidate.photoUrl || fallbackResponse.data.candidate.image),
              partySymbol: formatImageUrl(fallbackResponse.data.candidate.partySymbol)
            }));
          }
        } catch (fallbackError) {
          console.error('Error fetching from fallback endpoint:', fallbackError);
          // We already set the basic candidate above, so no need to do anything here
        }
      }
    } catch (error) {
      console.error('Error in loadCandidateDetails:', error);
      // Don't show error to user, just log it and continue with what we have
    }
  };

  const handleViewCandidateDetails = (candidate) => {
    if (!candidate) {
      console.error('No candidate provided to view details');
      return;
    }
    
    console.log('Viewing details for candidate:', candidate);
    
    // Set the basic candidate info first (in case loading details fails)
    setSelectedCandidate(candidate);
    setShowDetails(true);
    
    // Extract the candidate ID (supporting multiple ID formats)
    // Note: In the active elections endpoint, candidates have 'id' property
    const candidateId = candidate._id || candidate.id;
    
    if (candidateId) {
      console.log(`Using candidate ID: ${candidateId} to fetch details`);
      loadCandidateDetails(candidateId);
    } else {
      console.warn('No valid ID found for candidate:', candidate);
    }
  };

  // Add handler for adding/removing candidates from comparison
  const toggleCompare = (candidate) => {
    if (compareList.some(c => (c._id === candidate._id || c.id === candidate.id))) {
      // Remove from compare list
      setCompareList(compareList.filter(c => 
        (c._id !== candidate._id && c.id !== candidate.id)
      ));
    } else if (compareList.length < 3) {
      // Add to compare list
      setCompareList([...compareList, candidate]);
    } else {
      // Alert user they can only compare up to 3 candidates
      alert('You can compare up to 3 candidates at a time.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading candidates...</p>
        </Container>
      </Layout>
    );
  }

  const renderGridView = () => (
    <Row>
      {filteredCandidates.map(candidate => (
        <Col key={candidate._id || candidate.id} md={4} className="mb-4">
          <Card className="h-100 shadow-sm candidate-card">
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
                      e.target.src = 'https://via.placeholder.com/120?text=No+Image';
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
            <Card.Body className="text-center">
              <div className="d-flex justify-content-end mb-2">
                <Form.Check 
                  type="checkbox"
                  id={`compare-${candidate._id || candidate.id}`}
                  label="Compare"
                  checked={compareList.some(c => (c._id === candidate._id || c.id === candidate.id))}
                  onChange={() => toggleCompare(candidate)}
                />
              </div>
              <Card.Title>
                {candidate.name || `${candidate.firstName} ${candidate.lastName}`}
              </Card.Title>
              <div className="d-flex align-items-center justify-content-center mb-2">
                {candidate.partySymbol && (
                  <img 
                    src={candidate.partySymbol} 
                    alt={candidate.partyName} 
                    className="me-2" 
                    style={{ width: '24px', height: '24px' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <Badge bg="primary" className="me-2">{candidate.partyName}</Badge>
              </div>
              <p className="text-muted small mb-2">
                <FaMapMarkerAlt className="me-1" />
                {candidate.constituency || 'Unknown Constituency'}
              </p>
              <p className="text-muted small mb-3">
                <FaCalendarAlt className="me-1" />
                {candidate.electionType || 'General Election'}
              </p>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={() => handleViewCandidateDetails(candidate)}
                className="w-100"
              >
                View Details
              </Button>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderElectionTabs = () => (
    <Tab.Container defaultActiveKey="all">
      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link eventKey="all">All Candidates</Nav.Link>
        </Nav.Item>
        {electionGroups.map(election => (
          <Nav.Item key={election.electionId}>
            <Nav.Link eventKey={election.electionId}>
              {election.electionName} ({election.candidates.length})
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      <Tab.Content>
        <Tab.Pane eventKey="all">
          {renderGridView()}
        </Tab.Pane>
        {electionGroups.map(election => (
          <Tab.Pane key={election.electionId} eventKey={election.electionId}>
            <Alert variant="info" className="mb-3">
              <h5>{election.electionName}</h5>
              <p className="mb-1">{election.electionDescription}</p>
              <p className="small mb-0">
                <strong>Type:</strong> {election.electionType} | 
                <strong> Starts:</strong> {new Date(election.electionStartDate).toLocaleDateString()} | 
                <strong> Ends:</strong> {new Date(election.electionEndDate).toLocaleDateString()}
              </p>
            </Alert>
            <Row>
              {election.candidates.map(candidate => (
                <Col key={candidate._id || candidate.id} md={4} className="mb-4">
                  <Card className="h-100 shadow-sm candidate-card">
                    <div className="text-center pt-3">
                      {candidate.photoUrl ? (
                        <div className="candidate-img-container mx-auto">
                          <img 
                            src={candidate.photoUrl}
                            alt={candidate.name || `${candidate.firstName} ${candidate.lastName}`}
                            className="rounded-circle candidate-img"
                            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/120?text=No+Image';
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
                    <Card.Body className="text-center">
                      <Card.Title>
                        {candidate.name || `${candidate.firstName} ${candidate.lastName}`}
                      </Card.Title>
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        {candidate.partySymbol && (
                          <img 
                            src={candidate.partySymbol} 
                            alt={candidate.partyName} 
                            className="me-2" 
                            style={{ width: '24px', height: '24px' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <Badge bg="primary" className="me-2">{candidate.partyName}</Badge>
                      </div>
                      <p className="text-muted small mb-2">
                        <FaMapMarkerAlt className="me-1" />
                        {candidate.constituency || 'Unknown Constituency'}
                      </p>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => handleViewCandidateDetails(candidate)}
                        className="w-100"
                      >
                        View Details
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Tab.Pane>
        ))}
      </Tab.Content>
    </Tab.Container>
  );

  // Add a component to handle the comparison modal
  const CandidateComparisonModal = () => (
    <Modal show={showComparison} onHide={() => setShowComparison(false)} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Compare Candidates</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {compareList.length === 0 ? (
          <Alert variant="info">
            Select candidates to compare by checking the "Compare" checkbox on candidate cards.
          </Alert>
        ) : (
          <div className="comparison-table">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Attribute</th>
                  {compareList.map(candidate => (
                    <th key={candidate._id || candidate.id} className="text-center">
                      {candidate.name || `${candidate.firstName} ${candidate.lastName}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Photo</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id} className="text-center">
                      {candidate.photoUrl ? (
                        <img 
                          src={candidate.photoUrl} 
                          alt={candidate.name} 
                          className="rounded-circle" 
                          style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=No+Image'; }}
                        />
                      ) : (
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto" style={{ width: '80px', height: '80px' }}>
                          <FaUser size={30} className="text-secondary" />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Party</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id} className="text-center">
                      <div className="d-flex flex-column align-items-center">
                        {candidate.partySymbol && (
                          <img 
                            src={candidate.partySymbol} 
                            alt={candidate.partyName} 
                            style={{ width: '40px', height: '40px', marginBottom: '5px' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <span className="badge bg-primary">{candidate.partyName}</span>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Constituency</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id} className="text-center">
                      {candidate.constituency || 'Unknown'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Age</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id} className="text-center">
                      {candidate.age ? `${candidate.age} years` : 'Not specified'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Education</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id}>
                      {candidate.education || 'Not specified'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Experience</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id}>
                      {candidate.experience || 'Not specified'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Criminal Record</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id}>
                      {candidate.criminalRecord || 'None'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Manifesto</strong></td>
                  {compareList.map(candidate => (
                    <td key={candidate._id || candidate.id}>
                      {candidate.manifesto || 'Not provided'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowComparison(false)}>
          Close
        </Button>
        <Button 
          variant="danger" 
          onClick={() => setCompareList([])} 
          disabled={compareList.length === 0}
        >
          Clear Comparison
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Election Candidates</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {/* Filters and Search */}
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={6} className="mb-3 mb-md-0">
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, party or constituency..."
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </InputGroup>
              </Col>
              <Col md={3}>
                <InputGroup>
                  <InputGroup.Text>
                    <FaFilter />
                  </InputGroup.Text>
                  <Form.Select
                    value={selectedElection}
                    onChange={handleElectionChange}
                  >
                    <option value="all">All Active Elections</option>
                    {elections.map(election => (
                      <option key={election._id} value={election._id}>
                        {election.title || election.name || 'Unnamed Election'}
                      </option>
                    ))}
                  </Form.Select>
                </InputGroup>
              </Col>
              <Col md={3} className="d-flex justify-content-md-end mt-3 mt-md-0">
                <div className="btn-group">
                  <Button 
                    variant={activeView === 'grid' ? 'primary' : 'outline-primary'} 
                    onClick={() => setActiveView('grid')}
                  >
                    Grid View
                  </Button>
                  <Button 
                    variant={activeView === 'election' ? 'primary' : 'outline-primary'} 
                    onClick={() => setActiveView('election')}
                    disabled={electionGroups.length === 0}
                  >
                    By Election
                  </Button>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Compare button and badge */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <p className="text-muted mb-0">
            Showing {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
          </p>
          <div>
            {compareList.length > 0 && (
              <Badge bg="secondary" className="me-2">
                {compareList.length} candidate{compareList.length !== 1 ? 's' : ''} selected
              </Badge>
            )}
            <Button
              variant="info"
              size="sm"
              onClick={() => setShowComparison(true)}
              disabled={compareList.length === 0}
            >
              Compare Selected
            </Button>
          </div>
        </div>
        
        {filteredCandidates.length === 0 ? (
          <Alert variant="info">
            {searchTerm || selectedElection !== 'all'
              ? 'No candidates match your search criteria.'
              : 'No candidates have been added to the active elections yet.'}
          </Alert>
        ) : (
          <>
            {activeView === 'grid' ? renderGridView() : renderElectionTabs()}
          </>
        )}
        
        {/* Candidate Details Modal */}
        <Modal show={showDetails} onHide={handleCloseDetails} size="lg">
          {selectedCandidate && (
            <>
              <Modal.Header closeButton>
                <Modal.Title>Candidate Profile</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Row>
                  <Col md={4} className="text-center">
                    {selectedCandidate.photoUrl ? (
                      <img 
                        src={selectedCandidate.photoUrl}
                        alt={selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}
                        className="img-fluid rounded candidate-detail-img mb-3"
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                        onError={(e) => {
                          console.error('Error loading image:', e);
                          e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                        }}
                      />
                    ) : (
                      <div 
                        className="bg-light rounded d-flex align-items-center justify-content-center mb-3"
                        style={{ height: '200px' }}
                      >
                        <FaUser size={60} className="text-secondary" />
                      </div>
                    )}
                    
                    <div className="mb-3">
                      {selectedCandidate.partySymbol && (
                        <img 
                          src={selectedCandidate.partySymbol} 
                          alt={selectedCandidate.partyName} 
                          className="img-fluid mb-2"
                          style={{ maxWidth: '80px', maxHeight: '80px' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      
                      <h5 className="mb-1">{selectedCandidate.partyName}</h5>
                      <Badge bg="primary">{selectedCandidate.electionType || 'General Election'}</Badge>
                    </div>

                    {/* Add a button to add/remove from comparison */}
                    <Button 
                      variant={compareList.some(c => (c._id === selectedCandidate._id || c.id === selectedCandidate.id)) ? "secondary" : "outline-primary"}
                      size="sm"
                      className="w-100 mb-3"
                      onClick={() => toggleCompare(selectedCandidate)}
                    >
                      {compareList.some(c => (c._id === selectedCandidate._id || c.id === selectedCandidate.id))
                        ? "Remove from Comparison"
                        : "Add to Comparison"
                      }
                    </Button>
                  </Col>
                  <Col md={8}>
                    <h3 className="mb-3">
                      {selectedCandidate.name || `${selectedCandidate.firstName} ${selectedCandidate.middleName ? selectedCandidate.middleName + ' ' : ''}${selectedCandidate.lastName}`}
                    </h3>
                    
                    <div className="candidate-details">
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Basic Information</h6>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col md={6}>
                              <p className="mb-2"><strong>Election:</strong> {selectedCandidate.electionName}</p>
                              <p className="mb-2"><strong>Constituency:</strong> {selectedCandidate.constituency}</p>
                            </Col>
                            <Col md={6}>
                              {selectedCandidate.age && (
                                <p className="mb-2"><FaBirthdayCake className="me-2" /><strong>Age:</strong> {selectedCandidate.age} years</p>
                              )}
                              
                              {selectedCandidate.gender && (
                                <p className="mb-2"><strong>Gender:</strong> {selectedCandidate.gender}</p>
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                      
                      <Card className="mb-3">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Qualifications & Experience</h6>
                        </Card.Header>
                        <Card.Body>
                          {selectedCandidate.education && (
                            <p className="mb-2"><FaBookReader className="me-2" /><strong>Education:</strong> {selectedCandidate.education}</p>
                          )}
                          
                          {selectedCandidate.experience && (
                            <p className="mb-2"><FaHistory className="me-2" /><strong>Experience:</strong> {selectedCandidate.experience}</p>
                          )}
                          
                          {selectedCandidate.criminalRecord && (
                            <p className="mb-2"><FaIdCard className="me-2" /><strong>Criminal Record:</strong> {selectedCandidate.criminalRecord}</p>
                          )}
                          
                          {!selectedCandidate.education && !selectedCandidate.experience && !selectedCandidate.criminalRecord && (
                            <p className="text-muted">No detailed qualification information available.</p>
                          )}
                        </Card.Body>
                      </Card>
                      
                      {selectedCandidate.manifesto && (
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0"><FaCertificate className="me-2" />Manifesto</h6>
                          </Card.Header>
                          <Card.Body>
                            <p className="mb-0">{selectedCandidate.manifesto}</p>
                          </Card.Body>
                        </Card>
                      )}
                      
                      {selectedCandidate.biography && (
                        <Card className="mb-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Biography</h6>
                          </Card.Header>
                          <Card.Body>
                            <p className="mb-0">{selectedCandidate.biography}</p>
                          </Card.Body>
                        </Card>
                      )}
                      
                      {selectedCandidate.slogan && (
                        <div className="mt-3 p-3 bg-light rounded text-center">
                          <p className="fst-italic mb-0">"{selectedCandidate.slogan}"</p>
                        </div>
                      )}

                      {/* Add achievements if available */}
                      {selectedCandidate.achievements && (
                        <Card className="mb-3 mt-3">
                          <Card.Header className="bg-light">
                            <h6 className="mb-0">Achievements</h6>
                          </Card.Header>
                          <Card.Body>
                            <p className="mb-0">{selectedCandidate.achievements}</p>
                          </Card.Body>
                        </Card>
                      )}
                    </div>
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseDetails}>
                  Close
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal>
        
        {/* Add the comparison modal */}
        <CandidateComparisonModal />
      </Container>
    </Layout>
  );
};

export default ViewCandidates; 