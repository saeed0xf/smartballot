import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUsers, FaUserCheck, FaUserEdit, FaListAlt, FaPlay, FaStop, FaChartPie, FaArchive } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../../components/Layout';
import env from '../../utils/env';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    pendingVoters: 0,
    approvedVoters: 0,
    rejectedVoters: 0,
    totalCandidates: 0,
    electionActive: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard stats on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Fetch dashboard stats from API
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      
      let currentStats = {
        pendingVoters: 0,
        approvedVoters: 0,
        rejectedVoters: 0,
        totalCandidates: 0,
        electionActive: false
      };
      
      let hasErrors = false;
      let errorMessage = '';
      
      // Use try/catch blocks for each API call so one failure doesn't stop everything
      try {
        // Get pending voters count
        const pendingVotersResponse = await axios.get(`${apiUrl}/admin/voters?status=pending`);
        if (pendingVotersResponse.data && pendingVotersResponse.data.voters) {
          currentStats.pendingVoters = pendingVotersResponse.data.voters.length;
        }
      } catch (err) {
        console.error('Error fetching pending voters:', err);
        hasErrors = true;
        errorMessage = 'Could not fetch all voter statistics. Some data may be incomplete.';
      }
      
      try {
        // Get approved voters count
        const approvedVotersResponse = await axios.get(`${apiUrl}/admin/voters?status=approved`);
        if (approvedVotersResponse.data && approvedVotersResponse.data.voters) {
          currentStats.approvedVoters = approvedVotersResponse.data.voters.length;
        }
      } catch (err) {
        console.error('Error fetching approved voters:', err);
        hasErrors = true;
        errorMessage = 'Could not fetch all voter statistics. Some data may be incomplete.';
      }
      
      try {
        // Get rejected voters count
        const rejectedVotersResponse = await axios.get(`${apiUrl}/admin/voters?status=rejected`);
        if (rejectedVotersResponse.data && rejectedVotersResponse.data.voters) {
          currentStats.rejectedVoters = rejectedVotersResponse.data.voters.length;
        }
      } catch (err) {
        console.error('Error fetching rejected voters:', err);
        hasErrors = true;
        errorMessage = 'Could not fetch all voter statistics. Some data may be incomplete.';
      }
      
      try {
        // Get candidates count
        const candidatesResponse = await axios.get(`${apiUrl}/admin/candidates`);
        
        // Handle the candidate response based on its actual structure
        // The admin/candidates endpoint returns an array directly, not wrapped in a 'candidates' property
        if (candidatesResponse.data) {
          currentStats.totalCandidates = Array.isArray(candidatesResponse.data) 
            ? candidatesResponse.data.length 
            : (candidatesResponse.data.candidates ? candidatesResponse.data.candidates.length : 0);
        }
      } catch (err) {
        console.error('Error fetching candidates:', err);
        hasErrors = true;
        errorMessage = 'Could not fetch candidate information. Some data may be incomplete.';
      }
      
      try {
        // Get election status - if this fails, we assume election is inactive
        const electionStatusResponse = await axios.get(`${apiUrl}/admin/election/status`);
        if (electionStatusResponse.data && electionStatusResponse.data.hasOwnProperty('active')) {
          currentStats.electionActive = electionStatusResponse.data.active;
        }
      } catch (err) {
        console.error('Error fetching election status:', err);
        // Don't set hasErrors to true here, as we can safely assume no active election
        console.log('Assuming election is inactive due to API error');
        currentStats.electionActive = false;
      }
      
      // Update stats with whatever data we were able to fetch
      setStats(currentStats);
      
      // If we had some errors but still got data, show a warning message
      if (hasErrors) {
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error in dashboard stats fetch:', err);
      setError('Failed to fetch dashboard statistics. Please refresh the page to try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="text-white">Admin Dashboard</h1>
          {/* {stats.electionActive ? (
            <Badge bg="success" className="p-2">Election Active</Badge>
          ) : (
            <Badge bg="danger" className="p-2">Election Inactive</Badge>
          )} */}
        </div>
        
        {error && <Alert variant="warning">{error}</Alert>}
        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading dashboard statistics...</p>
          </div>
        ) : (
        <Row>
          {/* Voter Management */}
          <Col lg={4} md={6} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaUsers className="me-2" /> Voter Management
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-3">
                  <div>
                    <Badge bg="warning" className="me-2">
                      Pending: {stats.pendingVoters}
                    </Badge>
                    <Badge bg="success" className="me-2">
                      Approved: {stats.approvedVoters}
                    </Badge>
                    <Badge bg="danger">
                      Rejected: {stats.rejectedVoters}
                    </Badge>
                  </div>
                </div>
                <p>
                  Review and approve voter registrations. Verify voter identities and manage the voter database.
                </p>
                <div className="d-grid gap-2">
                  <Button 
                    as={Link} 
                    to="/admin/voters" 
                    variant="primary"
                    className="d-flex align-items-center justify-content-center"
                  >
                    <FaUserCheck className="me-2" /> Approve Voters
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Candidate Management */}
          <Col lg={4} md={6} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaUserEdit className="me-2" /> Candidate Management
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-3">
                  <Badge bg="info">
                    Total Candidates: {stats.totalCandidates}
                  </Badge>
                </div>
                <p>
                  Add and manage election candidates. Upload candidate information and profile pictures.
                </p>
                <div className="d-grid gap-2">
                  <Button 
                    as={Link} 
                    to="/admin/candidates" 
                    variant="primary"
                    className="d-flex align-items-center justify-content-center"
                  >
                    <FaListAlt className="me-2" /> Manage Candidates
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Election Management */}
          <Col lg={4} md={6} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaPlay className="me-2" /> Election Management
                </h5>
              </Card.Header>
              <Card.Body>
                <p>
                  Start or end an election on blockchain. Create, Update & Delete an election. Monitor the election process and manage election settings.
                </p>
                <div className="d-grid gap-2">
                  <Button 
                    as={Link} 
                    to="/admin/election" 
                    variant="primary"
                    className="d-flex align-items-center justify-content-center"
                  >
                    {stats.electionActive ? (
                      <>
                        <FaStop className="me-2" /> Manage Election
                      </>
                    ) : (
                      <>
                        <FaPlay className="me-2" /> Manage Election
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Election Results */}
          {/* <Col lg={4} md={6} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaChartPie className="me-2" /> Election Results
                </h5>
              </Card.Header>
              <Card.Body>
                <p>
                  View election results and statistics. Generate reports and analyze voter participation.
                </p>
                <div className="d-grid gap-2">
                  <Button 
                    as={Link} 
                    to="/admin/results" 
                    variant="primary"
                    className="d-flex align-items-center justify-content-center"
                  >
                    <FaChartPie className="me-2" /> View Results
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col> */}
          
          {/* Archived Elections */}
          {/* <Col lg={4} md={6} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaArchive className="me-2" /> Archive Management
                </h5>
              </Card.Header>
              <Card.Body>
                <p>
                  Access archived elections history. View past election data, candidates, and results for reference and analysis.
                </p>
                <div className="d-grid gap-2">
                  <Button
                    as={Link}
                    to="/admin/archived-elections"
                    variant="primary"
                    className="d-flex align-items-center justify-content-center"
                  >
                    <FaArchive className="me-2" /> View Archives
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col> */}
        </Row>
        )}
      </Container>
    </Layout>
  );
};

export default AdminDashboard; 