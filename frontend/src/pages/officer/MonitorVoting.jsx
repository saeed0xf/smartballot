import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ProgressBar, Table, Badge, Spinner } from 'react-bootstrap';
import { FaChartPie, FaChartBar, FaUsers, FaMapMarkerAlt } from 'react-icons/fa';
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
                turnout: 74.0
              },
              {
                id: '2',
                name: 'Central Library',
                registered: 300,
                voted: 212,
                turnout: 70.7
              },
              {
                id: '3',
                name: 'Community Center',
                registered: 200,
                voted: 120,
                turnout: 60.0
              },
              {
                id: '4',
                name: 'High School Gym',
                registered: 400,
                voted: 275,
                turnout: 68.75
              },
              {
                id: '5',
                name: 'East Side Station',
                registered: 350,
                voted: 28,
                turnout: 8.0
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

  return (
    <Layout>
      <Container className="py-4">
        <div className="mb-4">
          <h1>Election Monitoring</h1>
          <p className="text-muted">
            Monitor real-time voting statistics and polling station activity.
          </p>
        </div>

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
                  <h5 className="mb-0">Polling Stations Turnout</h5>
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
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>

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