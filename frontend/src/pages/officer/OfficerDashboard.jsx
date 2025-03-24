import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaClipboardList, FaPlus, FaChartLine, FaUsers, FaVoteYea, FaMapMarkerAlt } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const OfficerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalSlots: 0,
    activeSlots: 0,
    pendingVoters: 0,
    totalVotes: 0
  });
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
        
        // Placeholder data
        setStats({
          totalSlots: 12,
          activeSlots: 8,
          pendingVoters: 45,
          totalVotes: 320
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching officer stats:', error);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Officer Dashboard</h1>
            <p className="text-muted">
              Welcome, Election Commission Officer. Monitor and manage polling stations.
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
                  <FaMapMarkerAlt size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Total Time Slots</h6>
                  <h3 className="mb-0">{stats.totalSlots}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle p-3 bg-success bg-opacity-10 me-3">
                  <FaClipboardList size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Active Time Slots</h6>
                  <h3 className="mb-0">{stats.activeSlots}</h3>
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
                  <h6 className="mb-0 text-muted">Pending Voters</h6>
                  <h3 className="mb-0">{stats.pendingVoters}</h3>
                  <small className="text-muted">Awaiting time slot allocation</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle p-3 bg-info bg-opacity-10 me-3">
                  <FaVoteYea size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="mb-0 text-muted">Total Votes</h6>
                  <h3 className="mb-0">{stats.totalVotes}</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <h4 className="mb-3">Quick Actions</h4>
        <Row className="mb-4">
          <Col md={6} lg={4} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="icon-box mb-3">
                  <FaClipboardList size={32} className="text-primary" />
                </div>
                <h5>View Voting Time Slots</h5>
                <p className="text-muted">
                  View and manage all voting time slots for polling stations.
                </p>
                <Button
                  as={Link}
                  to="/officer/slots"
                  variant="outline-primary"
                  className="mt-2"
                >
                  View Slots
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6} lg={4} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="icon-box mb-3">
                  <FaPlus size={32} className="text-success" />
                </div>
                <h5>Add New Voting Time Slot</h5>
                <p className="text-muted">
                  Create a new voting time slot for voters and send email notifications.
                </p>
                <Button
                  as={Link}
                  to="/officer/slots/add"
                  variant="outline-success"
                  className="mt-2"
                >
                  Add Slot
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6} lg={4} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center p-4">
                <div className="icon-box mb-3">
                  <FaChartLine size={32} className="text-info" />
                </div>
                <h5>Election Monitoring</h5>
                <p className="text-muted">
                  Monitor real-time voting statistics and activity.
                </p>
                <Button
                  as={Link}
                  to="/officer/monitor"
                  variant="outline-info"
                  className="mt-2"
                >
                  View Statistics
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recent Activity - Placeholder */}
        <h4 className="mb-3">Recent Activity</h4>
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <p className="text-muted text-center">
              No recent activities to display. Activity logs will appear here when available.
            </p>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default OfficerDashboard; 