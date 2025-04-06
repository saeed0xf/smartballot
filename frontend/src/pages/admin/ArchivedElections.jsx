import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Table, Badge, Spinner, 
  Button, Tab, Tabs, Form, Modal, Alert 
} from 'react-bootstrap';
import { FaArchive, FaSearch, FaEye, FaDownload, FaList, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../../components/Layout';
import { useNavigate } from 'react-router-dom';
import dateFormat from 'dateformat';
import { formatImageUrl } from '../../utils/imageUtils';
import env from '../../utils/env';  // Import the env configuration

const ArchivedElections = () => {
  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedElection, setSelectedElection] = useState(null);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [electionCandidates, setElectionCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchArchivedElections();
  }, []);
  
  const fetchArchivedElections = async () => {
    setLoading(true);
    try {
      // Get API URL from environment or use default
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      console.log('Fetching archived elections from:', `${apiUrl}/admin/elections/archived`);
      
      const response = await axios.get(`${apiUrl}/admin/elections/archived`);
      console.log('Archived elections response:', response.data);
      setElections(response.data);
      
      // Also fetch all archived candidates
      const candidatesResponse = await axios.get(`${apiUrl}/admin/candidates?archived=true`);
      setCandidates(candidatesResponse.data);
    } catch (err) {
      console.error('Error fetching archived elections:', err);
      setError('Failed to load archived elections. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateFormat(new Date(dateString), "mmm dd, yyyy, h:MM TT");
  };
  
  // Filter elections by type - update to handle both type and electionType fields
  const filteredElections = elections.filter(election => {
    if (filterType === 'all') return true;
    // Check both type and electionType fields for compatibility
    return (election.type === filterType || election.electionType === filterType);
  });
  
  // Helper function to get the election type to display
  const getElectionType = (election) => {
    // Use type field if available, otherwise use electionType
    return election.type || election.electionType || 'Unknown';
  };
  
  // Search function
  const filteredAndSearchedElections = filteredElections.filter(election => {
    return (
      election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (election.region && election.region.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  
  // View candidates for a specific election
  const viewElectionCandidates = async (election) => {
    setSelectedElection(election);
    setLoadingCandidates(true);
    setError(null); // Clear any previous errors
    setShowCandidatesModal(true);
    
    try {
      // Get the election type and ID for this election
      const electionType = getElectionType(election);
      const electionId = election._id;
      
      console.log(`Viewing candidates for election: ${election.title}`);
      console.log(`Election ID: ${electionId}, Type: ${electionType}`);
      
      // If we don't have candidates loaded yet, fetch them
      if (candidates.length === 0) {
        console.log('No candidates loaded yet, fetching from API...');
        const apiUrl = env.API_URL || 'http://localhost:5000/api';
        const candidatesResponse = await axios.get(`${apiUrl}/admin/candidates?archived=true`);
        setCandidates(candidatesResponse.data);
        console.log(`Fetched ${candidatesResponse.data.length} archived candidates`);
      }
      
      console.log(`Currently have ${candidates.length} total candidates in state`);
      
      // Try multiple methods to find matching candidates:
      
      // 1. First try to match by direct election reference
      let matchingCandidatesByElection = candidates.filter(candidate => {
        // Check if candidate has election reference
        if (candidate.election) {
          // Handle both string IDs and object references
          const candidateElectionId = typeof candidate.election === 'object' 
            ? candidate.election._id 
            : candidate.election;
            
          return candidateElectionId === electionId;
        }
        return false;
      });
      
      console.log(`Found ${matchingCandidatesByElection.length} candidates by direct election ID match`);
      
      // 2. Then match by election type if we didn't find any by direct ID
      if (matchingCandidatesByElection.length === 0) {
        console.log(`Trying to match candidates by election type: ${electionType}`);
        
        const matchingCandidatesByType = candidates.filter(candidate => 
          candidate.electionType === electionType
        );
        
        console.log(`Found ${matchingCandidatesByType.length} candidates by election type match`);
        
        // Use type matches if we found some
        if (matchingCandidatesByType.length > 0) {
          matchingCandidatesByElection = matchingCandidatesByType;
        }
      }
      
      // If still no candidates found, try a direct API call
      if (matchingCandidatesByElection.length === 0) {
        console.log('No candidates found in our cache, trying a direct API lookup...');
        const apiUrl = env.API_URL || 'http://localhost:5000/api';
        
        try {
          // Try to get candidates using election ID first (most specific match)
          const byIdUrl = `${apiUrl}/admin/candidates?election=${electionId}&archived=true`;
          console.log(`Fetching candidates by election ID: ${byIdUrl}`);
          
          const idResponse = await axios.get(byIdUrl);
          
          if (idResponse.data && idResponse.data.length > 0) {
            console.log(`Successfully found ${idResponse.data.length} candidates by election ID`);
            matchingCandidatesByElection = idResponse.data;
          } else {
            // If that fails, try by election type
            console.log('No candidates found by ID, trying by election type...');
            const byTypeUrl = `${apiUrl}/admin/candidates?electionType=${encodeURIComponent(electionType)}&archived=true`;
            console.log(`Fetching candidates by election type: ${byTypeUrl}`);
            
            const typeResponse = await axios.get(byTypeUrl);
            
            if (typeResponse.data && typeResponse.data.length > 0) {
              console.log(`Successfully found ${typeResponse.data.length} candidates by election type`);
              matchingCandidatesByElection = typeResponse.data;
            } else {
              console.log('No candidates found by election type either.');
            }
          }
        } catch (directFetchError) {
          console.error('Error directly fetching candidates:', directFetchError);
          setError(`Failed to fetch candidates from server: ${directFetchError.message}`);
        }
      }
      
      // Format candidate data with proper URLs and handle missing images
      const formattedCandidates = matchingCandidatesByElection.map(candidate => ({
        ...candidate,
        photoUrl: formatImageUrl(candidate.photoUrl),
        partySymbol: formatImageUrl(candidate.partySymbol),
        // Calculate full name for convenience
        fullName: `${candidate.firstName} ${candidate.middleName ? candidate.middleName + ' ' : ''}${candidate.lastName}`
      }));
      
      // Sort candidates by vote count (descending)
      formattedCandidates.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
      
      console.log(`Final result: ${formattedCandidates.length} candidates formatted and sorted`);
      setElectionCandidates(formattedCandidates);
      
      if (formattedCandidates.length === 0) {
        setError(`No candidates found for this election. This election may not have had any candidates registered.`);
      }
    } catch (err) {
      console.error('Error fetching election candidates:', err);
      setError(`Failed to load candidates: ${err.message}`);
    } finally {
      setLoadingCandidates(false);
    }
  };
  
  // Download election results as CSV
  const downloadElectionResults = (election) => {
    try {
      if (!election) {
        console.error('No election provided for download');
        setError('Cannot download results: No election selected');
        return;
      }
      
      console.log(`Preparing download for election: ${election.title}`);
      
      // Find candidates for this election using our helper function
      const electionType = getElectionType(election);
      
      // Try to match candidates by both election ID and type
      const matchingCandidates = candidates.filter(candidate => {
        // Check for direct election reference
        if (candidate.election) {
          const candidateElectionId = typeof candidate.election === 'object' 
            ? candidate.election._id 
            : candidate.election;
            
          if (candidateElectionId === election._id) {
            return true;
          }
        }
        
        // Fall back to election type match
        return candidate.electionType === electionType;
      });
      
      console.log(`Found ${matchingCandidates.length} candidates for download`);
      
      if (matchingCandidates.length === 0) {
        setError(`No candidates found for ${election.title}. Cannot generate report.`);
        return;
      }
      
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // CSV Header with election details
      csvContent += `# Election Results: ${election.title}\n`;
      csvContent += `# Type: ${electionType}\n`;
      csvContent += `# Date: ${formatDate(election.endDate)}\n`;
      csvContent += `# Total Votes: ${election.totalVotes || 0}\n\n`;
      
      // Column headers
      csvContent += "Candidate Name,Party,Constituency,Votes,Percentage\n";
      
      // Calculate total votes
      const totalVotes = election.totalVotes || 
        matchingCandidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
      
      // Add candidate rows
      matchingCandidates.forEach(candidate => {
        const fullName = `${candidate.firstName} ${candidate.middleName ? candidate.middleName + ' ' : ''}${candidate.lastName}`;
        const percentage = totalVotes > 0 ? ((candidate.voteCount || 0) / totalVotes * 100).toFixed(2) : '0.00';
        const constituency = candidate.constituency || 'N/A';
        
        csvContent += `"${fullName}","${candidate.partyName}","${constituency}",${candidate.voteCount || 0},${percentage}%\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${election.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.csv`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      
      console.log('Election results downloaded successfully');
    } catch (error) {
      console.error('Error downloading election results:', error);
      setError(`Failed to download results: ${error.message}`);
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <Container className="py-5">
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3">Loading archived elections...</p>
          </div>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container className="py-4">
        <h2 className="mb-4">
          <FaArchive className="me-2" />
          Archived Elections
        </h2>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-primary text-white">
            <Row className="align-items-center">
              <Col md={8}>
                <h5 className="mb-0">Election Archives</h5>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Control
                    type="text"
                    placeholder="Search elections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-control-sm"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Filter by Election Type:</Form.Label>
              <Form.Select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="form-select-sm w-auto"
              >
                <option value="all">All Types</option>
                <option value="Lok Sabha Elections (General Elections)">Lok Sabha Elections (General Elections)</option>
                <option value="Vidhan Sabha Elections (State Assembly Elections)">Vidhan Sabha Elections (State Assembly Elections)</option>
                <option value="Local Body Elections (Municipal)">Local Body Elections (Municipal)</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            
            {filteredAndSearchedElections.length === 0 ? (
              <Alert variant="info">
                No archived elections found matching your criteria.
              </Alert>
            ) : (
              <Table responsive striped hover className="align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Election</th>
                    <th>Type</th>
                    <th>Region</th>
                    <th>Period</th>
                    <th>Total Votes</th>
                    <th>Date Archived</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSearchedElections.map((election) => (
                    <tr key={election._id}>
                      <td>
                        <div className="fw-bold">{election.title}</div>
                        <small className="text-muted">{election.description}</small>
                      </td>
                      <td>
                        <Badge bg={
                          getElectionType(election) === 'Lok Sabha Elections (General Elections)' ? 'danger' :
                          getElectionType(election) === 'Vidhan Sabha Elections (State Assembly Elections)' ? 'primary' :
                          getElectionType(election) === 'Local Body Elections (Municipal)' ? 'success' :
                          'secondary'
                        }>
                          {getElectionType(election)}
                        </Badge>
                      </td>
                      <td>{election.region || 'Nationwide'}</td>
                      <td>
                        <div><small>{formatDate(election.startDate)}</small></div>
                        <div><small>to</small></div>
                        <div><small>{formatDate(election.endDate)}</small></div>
                      </td>
                      <td>
                        <div className="fw-bold">{election.totalVotes || 0}</div>
                      </td>
                      <td>{formatDate(election.archivedAt)}</td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-1 mb-1"
                          onClick={() => viewElectionCandidates(election)}
                        >
                          <FaEye className="me-1" /> Candidates
                        </Button>
                        <Button 
                          variant="outline-success" 
                          size="sm"
                          className="mb-1"
                          onClick={() => downloadElectionResults(election)}
                        >
                          <FaDownload className="me-1" /> Results
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>
      
      {/* Candidates Modal */}
      <Modal 
        show={showCandidatesModal} 
        onHide={() => {
          setShowCandidatesModal(false);
          setElectionCandidates([]);
          setError(null);
        }}
        size="lg"
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaList className="me-2" />
            {selectedElection?.title} - Candidates
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingCandidates ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Loading candidates...</span>
              </Spinner>
              <p className="mt-3">Loading candidates for {selectedElection?.title}...</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          ) : electionCandidates.length === 0 ? (
            <Alert variant="info">
              No candidates found for this election. This may happen if:
              <ul className="mt-2 mb-0">
                <li>No candidates were associated with this election</li>
                <li>Candidates were not properly archived</li>
                <li>The election type doesn't match any candidates</li>
              </ul>
            </Alert>
          ) : (
            <>
              <Alert variant="info" className="mb-3">
                <strong>Election Type:</strong> {getElectionType(selectedElection)}
                <br />
                <strong>Found Candidates:</strong> {electionCandidates.length}
              </Alert>
              <Table responsive striped hover className="candidates-table">
                <thead className="bg-light">
                  <tr>
                    <th style={{width: '35%'}}>Candidate</th>
                    <th style={{width: '25%'}}>Party</th>
                    <th style={{width: '15%'}}>Votes</th>
                    <th style={{width: '25%'}}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {electionCandidates.map((candidate) => {
                    const totalVotes = selectedElection?.totalVotes || 
                      electionCandidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
                    const percentage = totalVotes > 0 
                      ? ((candidate.voteCount || 0) / totalVotes * 100).toFixed(2) 
                      : '0.00';
                    
                    return (
                      <tr key={candidate._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            {candidate.photoUrl && (
                              <div className="candidate-img-small me-2">
                                <img 
                                  src={candidate.photoUrl} 
                                  alt={candidate.firstName} 
                                  style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/50?text=N/A';
                                  }}
                                />
                              </div>
                            )}
                            <div>
                              <div className="fw-bold">
                                {candidate.firstName} {candidate.middleName} {candidate.lastName}
                              </div>
                              <small className="text-muted">
                                {candidate.constituency || getElectionType(selectedElection)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            {candidate.partySymbol && (
                              <div className="party-symbol-small me-2">
                                <img 
                                  src={candidate.partySymbol} 
                                  alt={candidate.partyName} 
                                  style={{ width: '30px', height: '30px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/30?text=N/A';
                                  }}
                                />
                              </div>
                            )}
                            <div>{candidate.partyName}</div>
                          </div>
                        </td>
                        <td className="fw-bold">{candidate.voteCount || 0}</td>
                        <td>
                          <div className="position-relative pt-1">
                            <div 
                              className="progress" 
                              style={{ height: '12px', backgroundColor: '#e9ecef' }}
                            >
                              <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${percentage}%` }}
                                aria-valuenow={percentage} 
                                aria-valuemin="0" 
                                aria-valuemax="100"
                              ></div>
                            </div>
                            <div className="mt-1">{percentage}%</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowCandidatesModal(false);
              setElectionCandidates([]);
              setError(null);
            }}
          >
            Close
          </Button>
          {electionCandidates.length > 0 && (
            <Button 
              variant="success"
              onClick={() => selectedElection && downloadElectionResults(selectedElection)}
            >
              <FaDownload className="me-1" /> Download Results
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default ArchivedElections; 