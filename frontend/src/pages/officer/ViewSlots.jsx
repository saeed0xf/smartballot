import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Button, Form, Row, Col, Badge, Spinner, Modal, Alert, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaFilter, FaSearch, FaClock, FaCalendarAlt, FaUsers, FaEnvelope } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';

const ViewSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [searchQuery, setSearchQuery] = useState('');
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoading(true);
        
        // In a real app, we would fetch from the API
        // const response = await axios.get('/api/officer/slots');
        // setSlots(response.data);
        
        // For now, we'll use dummy data
        setTimeout(() => {
          setSlots([
            {
              id: '1',
              name: 'Morning Session Ward 1',
              location: '123 Main St, City',
              status: 'active',
              capacity: 250,
              currentVoters: 148,
              date: '2023-10-15',
              startTime: '08:00',
              endTime: '12:00',
              lastUpdated: '2023-10-15T10:30:00Z',
              voters: [
                { id: 'v1', name: 'John Doe', email: 'john@example.com' },
                { id: 'v2', name: 'Jane Smith', email: 'jane@example.com' },
                { id: 'v3', name: 'Robert Johnson', email: 'robert@example.com' }
              ]
            },
            {
              id: '2',
              name: 'Afternoon Session Central Library',
              location: '456 Park Ave, City',
              status: 'active',
              capacity: 300,
              currentVoters: 212,
              date: '2023-10-15',
              startTime: '13:00',
              endTime: '17:00',
              lastUpdated: '2023-10-15T11:15:00Z',
              voters: [
                { id: 'v4', name: 'Emily Davis', email: 'emily@example.com' },
                { id: 'v5', name: 'Michael Wilson', email: 'michael@example.com' }
              ]
            },
            {
              id: '3',
              name: 'Evening Session Community Center',
              location: '789 Oak Rd, City',
              status: 'inactive',
              capacity: 200,
              currentVoters: 0,
              date: '2023-10-16',
              startTime: '17:00',
              endTime: '21:00',
              lastUpdated: '2023-10-10T09:45:00Z'
            },
            {
              id: '4',
              name: 'Morning Session High School Gym',
              location: '101 School Blvd, City',
              status: 'active',
              capacity: 400,
              currentVoters: 275,
              date: '2023-10-16',
              startTime: '08:00',
              endTime: '12:00',
              lastUpdated: '2023-10-15T10:00:00Z'
            },
            {
              id: '5',
              name: 'Afternoon Session East Side',
              location: '202 River St, City',
              status: 'inactive',
              capacity: 150,
              currentVoters: 0,
              date: '2023-10-17',
              startTime: '13:00',
              endTime: '17:00',
              lastUpdated: '2023-10-12T14:20:00Z'
            }
          ]);
          setLoading(false);
        }, 800); // Simulate loading delay
      } catch (error) {
        console.error('Error fetching slots:', error);
        setLoading(false);
      }
    };
    
    fetchSlots();
  }, []);

  // Filter slots based on status and search query
  const filteredSlots = slots.filter(slot => {
    // Apply status filter
    if (filter !== 'all' && slot.status !== filter) {
      return false;
    }
    
    // Apply search filter (case insensitive)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        slot.name.toLowerCase().includes(query) ||
        slot.location.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Format date string to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Format date only (YYYY-MM-DD to readable format)
  const formatDateOnly = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Format time (24hr to 12hr format)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Function to open the voters modal
  const handleShowVoters = (slot) => {
    setSelectedSlot(slot);
    setShowVotersModal(true);
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Voting Time Slots</h1>
            <p className="text-muted">
              View and manage voting time slots for polling stations.
            </p>
          </div>
          <Button 
            as={Link} 
            to="/officer/slots/add" 
            variant="primary"
            className="d-flex align-items-center"
          >
            <FaPlus className="me-2" /> Add New Slot
          </Button>
        </div>

        <Card className="border-0 shadow-sm mb-4">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={4} className="mb-3 mb-md-0">
                <Form.Group>
                  <Form.Label className="d-flex align-items-center">
                    <FaFilter className="me-2" /> Filter by Status
                  </Form.Label>
                  <Form.Select 
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All Slots</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label className="d-flex align-items-center">
                    <FaSearch className="me-2" /> Search Slots
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search by name or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading voting time slots...</p>
          </div>
        ) : filteredSlots.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center p-5">
              <p className="mb-3">No voting time slots found matching your criteria.</p>
              <Button 
                as={Link} 
                to="/officer/slots/add" 
                variant="outline-primary"
              >
                Add New Slot
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Assigned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="fw-semibold">{slot.name}</td>
                      <td>{slot.location}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="me-1 text-muted" />
                          {formatDateOnly(slot.date)}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaClock className="me-1 text-muted" />
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                      </td>
                      <td>
                        <Badge bg={slot.status === 'active' ? 'success' : 'secondary'}>
                          {slot.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{slot.capacity}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUsers className="me-1 text-muted" />
                          {slot.voters?.length || 0} / {slot.capacity}
                        </div>
                      </td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-2"
                          title="Edit"
                        >
                          <FaEdit />
                        </Button>
                        <Button 
                          variant="outline-success" 
                          size="sm"
                          className="me-2"
                          title="View Assigned Voters"
                          onClick={() => handleShowVoters(slot)}
                          disabled={!slot.voters || slot.voters.length === 0}
                        >
                          <FaUsers />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          title="Delete"
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}
      </Container>

      {/* Assigned Voters Modal */}
      <Modal 
        show={showVotersModal} 
        onHide={() => setShowVotersModal(false)} 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <FaUsers className="me-2" />
            Assigned Voters - {selectedSlot?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selectedSlot?.voters || selectedSlot.voters.length === 0 ? (
            <Alert variant="info">No voters assigned to this time slot.</Alert>
          ) : (
            <ListGroup>
              {selectedSlot.voters.map(voter => (
                <ListGroup.Item key={voter.id} className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{voter.name}</div>
                    <div className="text-muted small">{voter.email}</div>
                  </div>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    title="Send Reminder Email"
                    onClick={() => {
                      alert(`Reminder email sent to ${voter.email}`);
                    }}
                  >
                    <FaEnvelope className="me-1" /> Reminder
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              <Badge bg="primary" pill className="px-3 py-2">
                {selectedSlot?.voters?.length || 0} voters assigned
              </Badge>
            </div>
            <Button variant="secondary" onClick={() => setShowVotersModal(false)}>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default ViewSlots; 