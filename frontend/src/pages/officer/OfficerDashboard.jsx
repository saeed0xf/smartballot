import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaChartBar, FaFilePdf, FaVideo, FaEye, FaVoteYea, FaUsers, FaCheck, FaList, FaDownload } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const OfficerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    completedElections: 0,
    totalVoters: 0,
    totalVotes: 0,
    verifiedVideos: 0,
    pendingVideos: 0
  });
  
  const [recentElections, setRecentElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        console.log('Fetching election stats from remote database...');
        
        // Fetch total elections and active elections from remote database
        const electionsResponse = await axios.get(`${API_URL}/officer/elections/remote/stats`, { headers });
        console.log('Election stats response:', electionsResponse.data);
        
        // Fetch total votes from remote database (votes collection)
        const votesResponse = await axios.get(`${API_URL}/officer/elections/remote/votes/count`, { headers });
        console.log('Votes count response:', votesResponse.data);
        
        // Use a fallback value for total voters since we don't have access to the admin endpoint
        let totalVoters = 0;
        try {
          // Try fetching from the officer API instead if implemented
          const votersResponse = await axios.get(`${API_URL}/officer/voters/stats`, { headers });
          console.log('Voters stats response:', votersResponse.data);
          totalVoters = votersResponse.data?.totalVoters || 0;
        } catch (voterError) {
          console.warn('Could not fetch voter stats:', voterError);
          // Fallback to a reasonable value or leave as 0
          totalVoters = 0;
        }
        
        // Set the stats with real data
        setStats({
          totalElections: electionsResponse.data?.totalElections || 0,
          activeElections: electionsResponse.data?.activeElections || 0,
          completedElections: electionsResponse.data?.completedElections || 0, // Use the value directly from API
          totalVoters: totalVoters,
          totalVotes: votesResponse.data?.totalVotes || 0,
          verifiedVideos: votesResponse.data?.verifiedVideos || 0,
          pendingVideos: votesResponse.data?.pendingVideos || 0
        });
        
        // Fetch recent elections
        console.log('Fetching recent elections from remote database...');
        const recentElectionsResponse = await axios.get(`${API_URL}/officer/elections/remote/recent`, { headers });
        console.log('Recent elections response:', recentElectionsResponse.data);
        
        if (recentElectionsResponse.data && Array.isArray(recentElectionsResponse.data.elections)) {
          setRecentElections(recentElectionsResponse.data.elections);
        } else if (Array.isArray(recentElectionsResponse.data)) {
          setRecentElections(recentElectionsResponse.data);
        } else {
          console.warn('Unexpected format from recent elections endpoint, using fallback data');
          setRecentElections([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching officer stats:', error);
        setError('Failed to load data. Please check if the backend server is running.');
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading dashboard data...</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="text-white">Election Officer Dashboard</h1>
            <p className="text-white">
              Monitor election status and generate reports.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Stats Section */}
        <Row className="mb-4">
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle p-3 bg-primary bg-opacity-10 me-3">
                  <FaList size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Total Elections</h6>
                  <h3 className="mb-0">{stats.totalElections}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle p-3 bg-warning bg-opacity-10 me-3">
                  <FaList size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Completed Elections</h6>
                  <h3 className="mb-0">{stats.completedElections}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle p-3 bg-success bg-opacity-10 me-3">
                  <FaVoteYea size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Active Elections</h6>
                  <h3 className="mb-0">{stats.activeElections}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          
          
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle p-3 bg-info bg-opacity-10 me-3">
                  <FaCheck size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Total Votes Cast</h6>
                  <h3 className="mb-0">{stats.totalVotes}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <h4 className="mb-3">Officer Actions</h4>
        <Row className="mb-4">
          <Col md={6} lg={4} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="icon-box mb-3">
                  <FaChartBar size={32} className="text-primary" />
                </div>
                <h5>View Election Statistics</h5>
                <p className="text-muted">
                  Access detailed vote counts and analytics for all elections.
                </p>
                <Button
                  as={Link}
                  to="/officer/statistics"
                  variant="outline-primary"
                  className="mt-2"
                >
                  View Statistics
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6} lg={4} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="icon-box mb-3">
                  <FaFilePdf size={32} className="text-warning" />
                </div>
                <h5>Generate Reports</h5>
                <p className="text-muted">
                  Create and download official election reports and statistics.
                </p>
                <Button
                  as={Link}
                  to="/officer/reports"
                  variant="outline-warning"
                  className="mt-2"
                >
                  Generate Reports
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6} lg={4} className="mb-3">
            {/* <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="icon-box mb-3">
                  <FaVideo size={32} className="text-info" />
                </div>
                <h5>Voter Verification</h5>
                <p className="text-muted">
                  View voter verification videos and authentication data.
                </p>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <Badge bg="success" className="p-2">Verified: {stats.verifiedVideos}</Badge>
                  <Badge bg="warning" className="p-2">Pending: {stats.pendingVideos}</Badge>
                </div>
                <Button
                  as={Link}
                  to="/officer/verification"
                  variant="outline-info"
                  className="mt-3 w-100"
                >
                  Verification Center
                </Button>
              </Card.Body>
            </Card> */}
          </Col>
        </Row>

        {/* Recent Elections Section */}
        <h4 className="mb-3">Recent Elections</h4>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-0">
            {recentElections.length > 0 ? (
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Election</th>
                    <th>Status</th>
                    <th>Period</th>
                    <th>Total Votes</th>
                    <th>Turnout</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentElections.map(election => (
                    <tr key={election._id || election.id}>
                      <td className="fw-semibold">{election.title || election.name}</td>
                      <td>
                        <Badge bg={election.status === 'active' || election.isActive ? 'success' : 'secondary'}>
                          {election.status === 'active' || election.isActive ? 'Active' : 'Completed'}
                        </Badge>
                      </td>
                      <td>
                        {formatDate(election.startDate)} - {formatDate(election.endDate)}
                      </td>
                      <td>{election.totalVotes || 'N/A'}</td>
                      <td>{election.voterTurnout || 'N/A'}</td>
                      <td>
                        <Button
                          as={Link}
                          to={`/officer/statistics/${election._id || election.id}`}
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                        >
                          <FaEye className="me-1" /> Statistics
                        </Button>
                        <Button
                          as={Link}
                          to="/officer/reports"
                          variant="outline-success"
                          size="sm"
                        >
                          <FaDownload className="me-1" /> Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Alert variant="info" className="m-3">No recent elections found.</Alert>
            )}
          </Card.Body>
        </Card>
        
        {/* Monitor Elections CTA */}
        {/* <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm text-white bg-gradient" style={{ background: 'linear-gradient(45deg, #4a6bdf, #8a64e8)' }}>
              <Card.Body className="p-4">
                <Row className="align-items-center">
                  <Col md={8}>
                    <h4>Live Election Monitoring</h4>
                    <p className="mb-md-0">
                      Monitor active elections in real-time, track voter turnout, and ensure election integrity.
                    </p>
                  </Col>
                  <Col md={4} className="text-md-end">
                    <Button 
                      as={Link}
                      to="/officer/monitor"
                      variant="light" 
                      className="d-flex align-items-center ms-auto"
                    >
                      <FaChartBar className="me-2" /> Monitor Elections
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row> */}
      </Container>
    </Layout>
  );
};

export default OfficerDashboard; 