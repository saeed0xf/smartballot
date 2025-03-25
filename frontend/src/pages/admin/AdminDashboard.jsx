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
      
      try {
        // Get pending voters count
        const pendingVotersResponse = await axios.get(`${apiUrl}/admin/voters?status=pending`);
        const pendingVoters = pendingVotersResponse.data.voters.length;
        
        // Get approved voters count
        const approvedVotersResponse = await axios.get(`${apiUrl}/admin/voters?status=approved`);
        const approvedVoters = approvedVotersResponse.data.voters.length;
        
        // Get rejected voters count
        const rejectedVotersResponse = await axios.get(`${apiUrl}/admin/voters?status=rejected`);
        const rejectedVoters = rejectedVotersResponse.data.voters.length;
        
        // Get candidates count - the response structure is different here
        const candidatesResponse = await axios.get(`${apiUrl}/admin/candidates`);
        
        // Handle the candidate response based on its actual structure
        // The admin/candidates endpoint returns an array directly, not wrapped in a 'candidates' property
        const totalCandidates = Array.isArray(candidatesResponse.data) 
          ? candidatesResponse.data.length 
          : (candidatesResponse.data.candidates ? candidatesResponse.data.candidates.length : 0);
        
        // Get election status
        const electionStatusResponse = await axios.get(`${apiUrl}/admin/election/status`);
        const electionActive = electionStatusResponse.data.active;
        
        setStats({
          pendingVoters,
          approvedVoters,
          rejectedVoters,
          totalCandidates,
          electionActive
        });
      } catch (apiError) {
        console.error('API error:', apiError);
        if (apiError.response) {
          console.error('Response status:', apiError.response.status);
          console.error('Response data:', apiError.response.data);
        }
        throw apiError; // Re-throw to be caught by the outer try-catch
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to fetch dashboard statistics.');
      
      // Log detailed error information for debugging
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      } else if (err.request) {
        console.error('No response received:', err.request);
      } else {
        console.error('Error setting up request:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Admin Dashboard</h1>
          {stats.electionActive ? (
            <Badge bg="success" className="p-2">Election Active</Badge>
          ) : (
            <Badge bg="danger" className="p-2">Election Inactive</Badge>
          )}
        </div>
        
        {error && <Alert variant="danger">{error}</Alert>}
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
                  Start or end an election. Monitor the election process and manage election settings.
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
          <Col lg={4} md={6} className="mb-4">
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
          </Col>
          
          {/* Archived Elections */}
          <Col lg={4} md={6} className="mb-4">
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
          </Col>
        </Row>
        )}
      </Container>
    </Layout>
  );
};

export default AdminDashboard; 