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
      const response = await axios.get('/api/admin/elections/archived');
      setElections(response.data);
      
      // Also fetch all archived candidates
      const candidatesResponse = await axios.get('/api/admin/candidates?archived=true');
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
  
  // Filter elections by type
  const filteredElections = elections.filter(election => {
    if (filterType === 'all') return true;
    return election.electionType === filterType;
  });
  
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
    setShowCandidatesModal(true);
    
    try {
      // Find candidates for this election type from our already loaded candidates
      const matchingCandidates = candidates.filter(
        candidate => candidate.electionType === election.electionType
      );
      setElectionCandidates(matchingCandidates);
    } catch (err) {
      console.error('Error fetching election candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };
  
  // Download election results as CSV
  const downloadElectionResults = (election) => {
    // Find candidates for this election
    const matchingCandidates = candidates.filter(
      candidate => candidate.electionType === election.electionType
    );
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // CSV Header
    csvContent += "Candidate Name,Party,Votes,Percentage\n";
    
    // Calculate total votes
    const totalVotes = election.totalVotes || 
      matchingCandidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
    
    // Add candidate rows
    matchingCandidates.forEach(candidate => {
      const fullName = `${candidate.firstName} ${candidate.middleName ? candidate.middleName + ' ' : ''}${candidate.lastName}`;
      const percentage = totalVotes > 0 ? ((candidate.voteCount || 0) / totalVotes * 100).toFixed(2) : '0.00';
      
      csvContent += `"${fullName}","${candidate.partyName}",${candidate.voteCount || 0},${percentage}%\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${election.title}_results.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
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
                <option value="Presidential">Presidential</option>
                <option value="Parliamentary">Parliamentary</option>
                <option value="Regional">Regional</option>
                <option value="Local">Local</option>
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
                          election.electionType === 'Presidential' ? 'danger' :
                          election.electionType === 'Parliamentary' ? 'primary' :
                          election.electionType === 'Regional' ? 'success' :
                          'secondary'
                        }>
                          {election.electionType}
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
        onHide={() => setShowCandidatesModal(false)}
        size="lg"
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
            </div>
          ) : electionCandidates.length === 0 ? (
            <Alert variant="info">
              No candidates found for this election.
            </Alert>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Party</th>
                  <th>Votes</th>
                  <th>Percentage</th>
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
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%' }}
                              />
                            </div>
                          )}
                          <div>
                            <div className="fw-bold">
                              {candidate.firstName} {candidate.middleName} {candidate.lastName}
                            </div>
                            <small className="text-muted">
                              {candidate.constituency || 'N/A'}
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
                            style={{ height: '8px' }}
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
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowCandidatesModal(false)}
          >
            Close
          </Button>
          <Button 
            variant="success"
            onClick={() => selectedElection && downloadElectionResults(selectedElection)}
          >
            <FaDownload className="me-1" /> Download Results
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default ArchivedElections; 