import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ProgressBar, Table, Badge, Spinner, Button, Modal, Form, Alert } from 'react-bootstrap';
import { FaChartPie, FaChartBar, FaUsers, FaMapMarkerAlt, FaVideo, FaBan, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
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
                ]
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
                ]
              },
              {
                id: '3',
                name: 'Community Center',
                registered: 200,
                voted: 120,
                turnout: 60.0,
                hasLiveStream: true,
                recentVoters: []
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
                ]
              },
              {
                id: '5',
                name: 'East Side Station',
                registered: 350,
                voted: 28,
                turnout: 8.0,
                hasLiveStream: true,
                recentVoters: []
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
        <div className="mb-4">
          <h1>Election Monitoring</h1>
          <p className="text-muted">
            Monitor real-time voting statistics and polling station activity.
          </p>
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

            {/* Polling Station Stats */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3">
                <div className="d-flex align-items-center">
                  <FaMapMarkerAlt className="text-primary me-2" size={18} />
                  <h5 className="mb-0">Polling Stations Monitoring</h5>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Station Name</th>
                      <th>Registered Voters</th>
                      <th>Votes Cast</th>
                      <th>Turnout</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.stations.map((station) => (
                      <tr key={station.id}>
                        <td className="fw-semibold">{station.name}</td>
                        <td>{station.registered.toLocaleString()}</td>
                        <td>{station.voted.toLocaleString()}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="me-2">{station.turnout.toFixed(1)}%</span>
                            <div style={{ flex: 1, maxWidth: '100px' }}>
                              <ProgressBar 
                                variant={getTurnoutStatus(station.turnout)} 
                                now={station.turnout} 
                                style={{ height: '8px' }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge bg={getTurnoutStatus(station.turnout)}>
                            {station.turnout < 30 ? 'Low' : 
                             station.turnout < 60 ? 'Moderate' : 'High'}
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="d-flex align-items-center"
                            onClick={() => handleOpenVideoMonitoring(station)}
                            disabled={!station.hasLiveStream}
                          >
                            <FaVideo className="me-1" /> Monitor
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

            {/* Video Monitoring Modal */}
            <Modal 
              show={showVideoModal} 
              onHide={() => setShowVideoModal(false)} 
              size="lg"
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  <FaVideo className="me-2" /> 
                  Live Monitoring: {currentStation?.name}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Row>
                  <Col lg={8} className="mb-3">
                    <div className="live-video-container bg-dark rounded" style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {activeStreams.length > 0 ? (
                        <div className="text-white text-center">
                          <FaVideo size={40} className="mb-3" />
                          <h5>Live Video Feed</h5>
                          <p className="text-muted">
                            Monitoring {activeStreams[0].name} at {currentStation?.name}
                          </p>
                        </div>
                      ) : (
                        <div className="text-white text-center">
                          <FaExclamationTriangle size={40} className="mb-3" />
                          <h5>No Video Feeds Available</h5>
                        </div>
                      )}
                    </div>
                    
                    {activeStreams.length > 1 && (
                      <div className="mt-3 d-flex overflow-auto">
                        {activeStreams.map(stream => (
                          <Button 
                            key={stream.id}
                            variant="outline-secondary" 
                            className="me-2"
                            size="sm"
                          >
                            {stream.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Col>
                  <Col lg={4}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Recent Voters</h6>
                      </Card.Header>
                      <Card.Body className="p-0">
                        {currentStation?.recentVoters?.length > 0 ? (
                          <ul className="list-group list-group-flush">
                            {currentStation.recentVoters.map(voter => (
                              <li key={voter.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                  <p className="mb-0 fw-semibold">{voter.name}</p>
                                  <small className="text-muted">Voted at {voter.time}</small>
                                </div>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={() => handleOpenCancelVoteModal(voter)}
                                >
                                  <FaBan className="me-1" /> Cancel
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-3 text-center text-muted">
                            No recent voters to display
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowVideoModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
            
            {/* Vote Cancellation Modal */}
            <Modal
              show={showCancelModal}
              onHide={() => setShowCancelModal(false)}
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  <FaBan className="me-2 text-danger" />
                  Cancel Vote
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Alert variant="warning">
                  <FaExclamationTriangle className="me-2" />
                  Cancelling a vote is a serious action that should only be taken in cases of clear misconduct.
                </Alert>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Reason for Cancellation:</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3}
                      placeholder="Describe the misconduct or reason for cancellation in detail..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      required
                    />
                    <Form.Text className="text-muted">
                      This information will be recorded in the blockchain and cannot be changed.
                    </Form.Text>
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleCancelVote}>
                  <FaBan className="me-1" /> Confirm Cancellation
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Refresh Info */}
            <div className="text-center text-muted small">
              <p>Data last updated: {new Date().toLocaleString()}</p>
              <p>Statistics are updated every 15 minutes during active voting periods.</p>
            </div>
          </>
        )}
      </Container>
    </Layout>
  );
};

export default MonitorVoting; 