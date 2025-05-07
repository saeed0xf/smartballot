import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ProgressBar, Table, Badge, Spinner, Button, Modal, Form, Alert } from 'react-bootstrap';
import { FaChartPie, FaChartBar, FaUsers, FaMapMarkerAlt, FaVideo, FaBan, FaCheck, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import axios from 'axios';

const MonitorVoting = () => {
  const [stats, setStats] = useState({
    totalVoters: 0,
    votesCast: 0,
    voterTurnout: 0,
    stations: []
  });
  const [loading, setLoading] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelVoterId, setCancelVoterId] = useState('');
  const [alertInfo, setAlertInfo] = useState({ show: false, variant: '', message: '' });
  const [activeStreams, setActiveStreams] = useState([]);
  
  // Simulated video streams data
  const videoStreams = [
    { id: 'stream1', stationId: '1', name: 'Front Camera' },
    { id: 'stream2', stationId: '1', name: 'Back Camera' },
    { id: 'stream3', stationId: '2', name: 'Main Camera' },
    { id: 'stream4', stationId: '3', name: 'Entrance Camera' },
    { id: 'stream5', stationId: '4', name: 'Booth Camera' },
    { id: 'stream6', stationId: '5', name: 'Overview Camera' },
  ];

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        
        // In a real app, we would fetch from the API
        // const response = await axios.get('/api/officer/monitor');
        // setStats(response.data);
        
        // For now, we'll use dummy data
        setTimeout(() => {
          setStats({
            totalVoters: 1500,
            votesCount: 820,
            voterTurnout: 54.67,
            stations: [
              {
                id: '1',
                name: 'Ward 1 Station',
                registered: 250,
                voted: 185,
                turnout: 74.0,
                hasLiveStream: true,
                recentVoters: [
                  { id: 'v1', name: 'John Doe', time: '10:15 AM' },
                  { id: 'v2', name: 'Jane Smith', time: '10:22 AM' },
                ],
                location: 'North Delhi',
                pincode: '110001'
              },
              {
                id: '2',
                name: 'Central Library',
                registered: 300,
                voted: 212,
                turnout: 70.7,
                hasLiveStream: true,
                recentVoters: [
                  { id: 'v3', name: 'Robert Johnson', time: '10:30 AM' },
                ],
                location: 'South Delhi',
                pincode: '110002'
              },
              {
                id: '3',
                name: 'Community Center',
                registered: 200,
                voted: 120,
                turnout: 60.0,
                hasLiveStream: true,
                recentVoters: [],
                location: 'East Delhi',
                pincode: '110003'
              },
              {
                id: '4',
                name: 'High School Gym',
                registered: 400,
                voted: 275,
                turnout: 68.75,
                hasLiveStream: true,
                recentVoters: [
                  { id: 'v4', name: 'Michael Williams', time: '10:05 AM' },
                  { id: 'v5', name: 'Sarah Davis', time: '10:12 AM' },
                ],
                location: 'West Delhi',
                pincode: '110005'
              },
              {
                id: '5',
                name: 'East Side Station',
                registered: 350,
                voted: 28,
                turnout: 8.0,
                hasLiveStream: true,
                recentVoters: [],
                location: 'Central Delhi',
                pincode: '110006'
              }
            ]
          });
          setLoading(false);
        }, 800); // Simulate loading delay
      } catch (error) {
        console.error('Error fetching monitoring data:', error);
        setLoading(false);
      }
    };
    
    fetchMonitoringData();
  }, []);

  // Get turnout status indicator
  const getTurnoutStatus = (turnout) => {
    if (turnout < 30) return 'danger';
    if (turnout < 60) return 'warning';
    return 'success';
  };
  
  // Open video monitoring modal for a station
  const handleOpenVideoMonitoring = (station) => {
    setCurrentStation(station);
    // Find streams for this station
    const stationStreams = videoStreams.filter(stream => stream.stationId === station.id);
    setActiveStreams(stationStreams);
    setShowVideoModal(true);
  };
  
  // Open cancel vote modal
  const handleOpenCancelVoteModal = (voter) => {
    setCancelVoterId(voter.id);
    setShowCancelModal(true);
  };
  
  // Handle vote cancellation
  const handleCancelVote = async () => {
    if (!cancelReason.trim()) {
      setAlertInfo({
        show: true,
        variant: 'danger',
        message: 'Please provide a reason for cancelling the vote.'
      });
      return;
    }
    
    // In a real app, this would call an API
    // try {
    //   await axios.post('/api/officer/cancel-vote', {
    //     voterId: cancelVoterId,
    //     reason: cancelReason
    //   });
    // } catch (error) {
    //   console.error('Error cancelling vote:', error);
    // }
    
    // Simulate successful cancellation
    setAlertInfo({
      show: true,
      variant: 'success',
      message: `Vote cancelled successfully. Reason: ${cancelReason}`
    });
    
    // Reset and close modal
    setCancelReason('');
    setCancelVoterId('');
    setShowCancelModal(false);
    
    // In a real app, you would refresh the data here
    // fetchMonitoringData();
    
    // Auto-hide alert after 5 seconds
    setTimeout(() => {
      setAlertInfo({ show: false, variant: '', message: '' });
    }, 5000);
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Election Monitoring</h1>
            <p className="text-muted">
              Monitor real-time voting statistics and polling station activity.
            </p>
          </div>
          <Button
            as={Link}
            to="/officer"
            variant="outline-secondary"
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" /> Back to Dashboard
          </Button>
        </div>
        
        {alertInfo.show && (
          <Alert 
            variant={alertInfo.variant} 
            onClose={() => setAlertInfo({ show: false, variant: '', message: '' })} 
            dismissible
          >
            {alertInfo.message}
          </Alert>
        )}

        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading monitoring data...</p>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <Row className="mb-4">
              <Col lg={4} md={6} className="mb-3">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      <div className="rounded-circle p-3 bg-primary bg-opacity-10 me-3">
                        <FaUsers size={24} className="text-primary" />
                      </div>
                      <h5 className="mb-0">Registered Voters</h5>
                    </div>
                    <h2 className="mb-0">{stats.totalVoters.toLocaleString()}</h2>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col lg={4} md={6} className="mb-3">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      <div className="rounded-circle p-3 bg-success bg-opacity-10 me-3">
                        <FaChartBar size={24} className="text-success" />
                      </div>
                      <h5 className="mb-0">Votes Cast</h5>
                    </div>
                    <h2 className="mb-0">{stats.votesCount.toLocaleString()}</h2>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col lg={4} md={12} className="mb-3">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      <div className="rounded-circle p-3 bg-info bg-opacity-10 me-3">
                        <FaChartPie size={24} className="text-info" />
                      </div>
                      <h5 className="mb-0">Voter Turnout</h5>
                    </div>
                    <h2 className="mb-0">{stats.voterTurnout.toFixed(1)}%</h2>
                    <ProgressBar 
                      variant={getTurnoutStatus(stats.voterTurnout)} 
                      now={stats.voterTurnout} 
                      className="mt-2"
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Polling Stations */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">Polling Stations</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Station</th>
                      <th>Location</th>
                      <th>Registered</th>
                      <th>Voted</th>
                      <th>Turnout</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.stations.map(station => (
                      <tr key={station.id}>
                        <td className="fw-semibold">{station.name}</td>
                        <td>{station.location} ({station.pincode})</td>
                        <td>{station.registered}</td>
                        <td>{station.voted}</td>
                        <td>
                          <Badge bg={getTurnoutStatus(station.turnout)}>
                            {station.turnout.toFixed(1)}%
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="me-2"
                            onClick={() => handleOpenVideoMonitoring(station)}
                            disabled={!station.hasLiveStream}
                          >
                            <FaVideo className="me-1" /> Live Feed
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* Recent Voters */}
            <Row className="mb-4">
              <Col xs={12}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-white py-3">
                    <h5 className="mb-0">Recent Voters</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Voter ID</th>
                          <th>Name</th>
                          <th>Polling Station</th>
                          <th>Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.stations.flatMap(station => 
                          station.recentVoters.map(voter => (
                            <tr key={voter.id}>
                              <td>{voter.id}</td>
                              <td>{voter.name}</td>
                              <td>{station.name}</td>
                              <td>{voter.time}</td>
                              <td>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleOpenCancelVoteModal(voter)}
                                >
                                  <FaBan className="me-1" /> Flag Issue
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                        {stats.stations.flatMap(station => station.recentVoters).length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-3 text-muted">
                              No recent voter activity to display
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Video Monitoring Modal */}
        <Modal
          show={showVideoModal}
          onHide={() => setShowVideoModal(false)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Live Feed - {currentStation?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              {activeStreams.map(stream => (
                <Col md={6} key={stream.id} className="mb-3">
                  <Card>
                    <Card.Header className="py-2 bg-dark text-white d-flex justify-content-between align-items-center">
                      <small>{stream.name}</small>
                      <Badge bg="danger">LIVE</Badge>
                    </Card.Header>
                    <Card.Body className="p-0 bg-dark">
                      {/* This would be a real video stream in a production app */}
                      <div className="video-placeholder d-flex align-items-center justify-content-center text-white bg-secondary" style={{ height: '180px' }}>
                        <div className="text-center">
                          <FaVideo size={32} className="mb-2" />
                          <p className="mb-0 small">Live video feed would appear here</p>
                          <small>Stream ID: {stream.id}</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            <div className="mt-2">
              <p className="mb-1 text-muted small">
                <FaMapMarkerAlt className="me-1" /> 
                Location: {currentStation?.location} (Pincode: {currentStation?.pincode})
              </p>
              <p className="mb-0 text-muted small">
                <FaUsers className="me-1" />
                Station Status: {currentStation?.voted} of {currentStation?.registered} voters ({currentStation?.turnout.toFixed(1)}% turnout)
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVideoModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Cancel Vote Modal */}
        <Modal
          show={showCancelModal}
          onHide={() => setShowCancelModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <FaExclamationTriangle className="text-warning me-2" />
              Flag Voting Issue
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Flag a potential issue with voter ID: <strong>{cancelVoterId}</strong>
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Reason for flagging</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide detailed information about the issue..."
              />
            </Form.Group>
            <Alert variant="info">
              <FaInfo className="me-2" />
              Flagging an issue will alert the election officials and initiate an investigation process.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              Cancel
            </Button>
            <Button variant="warning" onClick={handleCancelVote}>
              Flag Issue
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default MonitorVoting; 