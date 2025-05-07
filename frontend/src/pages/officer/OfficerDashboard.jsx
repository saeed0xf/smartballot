import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaChartBar, FaFilePdf, FaVideo, FaEye, FaVoteYea, FaUsers, FaCheck, FaList, FaDownload } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

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

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Normally we would fetch real stats from the API
        // For now, we'll use placeholder data
        
        // Uncomment this when the API endpoint is ready
        // const response = await axios.get('/api/officer/stats');
        // setStats(response.data);
        
        // Placeholder stats
        setStats({
          totalElections: 5,
          activeElections: 2,
          completedElections: 3,
          totalVoters: 1250,
          totalVotes: 875,
          verifiedVideos: 28,
          pendingVideos: 15
        });
        
        // Placeholder recent elections
        setRecentElections([
          {
            id: 'e1',
            title: 'Lok Sabha Elections 2023',
            status: 'active',
            startDate: '2023-10-15',
            endDate: '2023-10-30',
            totalVotes: 450,
            voterTurnout: '36%'
          },
          {
            id: 'e2',
            title: 'Municipal Corporation Elections',
            status: 'completed',
            startDate: '2023-09-01',
            endDate: '2023-09-15',
            totalVotes: 325,
            voterTurnout: '58%'
          },
          {
            id: 'e3',
            title: 'State Assembly Elections',
            status: 'completed',
            startDate: '2023-08-01',
            endDate: '2023-08-10',
            totalVotes: 620,
            voterTurnout: '72%'
          }
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching officer stats:', error);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Election Officer Dashboard</h1>
            <p className="text-muted">
              Monitor election results and generate reports.
            </p>
          </div>
          <div>
            <Badge bg="primary" className="p-2">
              Officer Wallet: {user?.walletAddress || user?.wallet || 'Unknown'}
            </Badge>
          </div>
        </div>

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
                <div className="rounded-circle p-3 bg-warning bg-opacity-10 me-3">
                  <FaUsers size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Total Voters</h6>
                  <h3 className="mb-0">{stats.totalVoters}</h3>
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
                <h5>View Election Results</h5>
                <p className="text-muted">
                  Access detailed vote counts and analytics for all elections.
                </p>
                <Button
                  as={Link}
                  to="/officer/results"
                  variant="outline-primary"
                  className="mt-2"
                >
                  View Results
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
            <Card className="h-100 border-0 shadow-sm">
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
            </Card>
          </Col>
        </Row>

        {/* Recent Elections Section */}
        <h4 className="mb-3">Recent Elections</h4>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-0">
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
                  <tr key={election.id}>
                    <td className="fw-semibold">{election.title}</td>
                    <td>
                      <Badge bg={election.status === 'active' ? 'success' : 'secondary'}>
                        {election.status === 'active' ? 'Active' : 'Completed'}
                      </Badge>
                    </td>
                    <td>
                      {formatDate(election.startDate)} - {formatDate(election.endDate)}
                    </td>
                    <td>{election.totalVotes}</td>
                    <td>{election.voterTurnout}</td>
                    <td>
                      <Button
                        as={Link}
                        to={`/officer/results/${election.id}`}
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                      >
                        <FaEye className="me-1" /> Results
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
          </Card.Body>
        </Card>
        
        {/* Monitor Elections CTA */}
        <Row className="mb-4">
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
        </Row>
      </Container>
    </Layout>
  );
};

export default OfficerDashboard; 