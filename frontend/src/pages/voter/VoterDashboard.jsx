import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaVoteYea, FaUserCheck, FaClipboardList } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';

const VoterDashboard = () => {
  const { user } = useContext(AuthContext);
  const [voterProfile, setVoterProfile] = useState(null);
  const [electionStatus, setElectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch voter profile
        const profileResponse = await axios.get('/api/voter/profile');
        setVoterProfile(profileResponse.data.voter);

        // Fetch election status
        const electionResponse = await axios.get('/api/election/status');
        setElectionStatus(electionResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading dashboard...</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Voter Dashboard</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {voterProfile && (
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light">
              <h4 className="mb-0">Voter Information</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="text-center mb-3 mb-md-0">
                  {voterProfile.profileImage ? (
                    <img 
                      src={voterProfile.profileImage.startsWith('http') 
                        ? voterProfile.profileImage 
                        : `http://localhost:5000${voterProfile.profileImage}`
                      } 
                      alt="Profile" 
                      className="img-fluid rounded-circle" 
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div 
                      className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '150px', height: '150px', margin: '0 auto' }}
                    >
                      <span className="h1">{voterProfile.firstName.charAt(0)}{voterProfile.lastName.charAt(0)}</span>
                    </div>
                  )}
                </Col>
                <Col md={9}>
                  <h3>{voterProfile.firstName} {voterProfile.middleName ? voterProfile.middleName + ' ' : ''}{voterProfile.lastName}</h3>
                  <p className="text-muted mb-2">Voter ID: {voterProfile.voterId}</p>
                  <p className="text-muted mb-2">Age: {voterProfile.age}</p>
                  <p className="text-muted mb-3">Date of Birth: {new Date(voterProfile.dateOfBirth).toLocaleDateString()}</p>
                  
                  <div>
                    <span className={`badge ${voterProfile.status === 'approved' ? 'bg-success' : voterProfile.status === 'rejected' ? 'bg-danger' : 'bg-warning'} me-2`}>
                      {voterProfile.status.charAt(0).toUpperCase() + voterProfile.status.slice(1)}
                    </span>
                    
                    {voterProfile.status === 'rejected' && voterProfile.rejectionReason && (
                      <span className="text-danger small">
                        Reason: {voterProfile.rejectionReason}
                      </span>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
        
        {electionStatus && (
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light">
              <h4 className="mb-0">Election Status</h4>
            </Card.Header>
            <Card.Body>
              {electionStatus.active ? (
                <>
                  <Alert variant="success">
                    <strong>Election is currently active!</strong>
                  </Alert>
                  <p>
                    <strong>Title:</strong> {electionStatus.election.title}
                  </p>
                  {electionStatus.election.description && (
                    <p>
                      <strong>Description:</strong> {electionStatus.election.description}
                    </p>
                  )}
                  <p>
                    <strong>Started:</strong> {new Date(electionStatus.election.startDate).toLocaleString()}
                  </p>
                </>
              ) : (
                <Alert variant="info">
                  No active election at the moment. Please check back later.
                </Alert>
              )}
            </Card.Body>
          </Card>
        )}
        
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
                  className="mt-auto"
                  disabled={!electionStatus?.active || (voterProfile?.blockchainStatus?.hasVoted)}
                >
                  Cast Vote
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