import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Button, Form, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaFilter, FaSearch } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';

const ViewSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [searchQuery, setSearchQuery] = useState('');

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
              name: 'Ward 1 Station',
              location: '123 Main St, City',
              status: 'active',
              capacity: 250,
              currentVoters: 148,
              lastUpdated: '2023-10-15T10:30:00Z'
            },
            {
              id: '2',
              name: 'Central Library',
              location: '456 Park Ave, City',
              status: 'active',
              capacity: 300,
              currentVoters: 212,
              lastUpdated: '2023-10-15T11:15:00Z'
            },
            {
              id: '3',
              name: 'Community Center',
              location: '789 Oak Rd, City',
              status: 'inactive',
              capacity: 200,
              currentVoters: 0,
              lastUpdated: '2023-10-10T09:45:00Z'
            },
            {
              id: '4',
              name: 'High School Gym',
              location: '101 School Blvd, City',
              status: 'active',
              capacity: 400,
              currentVoters: 275,
              lastUpdated: '2023-10-15T10:00:00Z'
            },
            {
              id: '5',
              name: 'East Side Station',
              location: '202 River St, City',
              status: 'inactive',
              capacity: 150,
              currentVoters: 0,
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

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Monitoring Slots</h1>
            <p className="text-muted">
              View and manage polling station monitoring slots.
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
            <p className="mt-3">Loading monitoring slots...</p>
          </div>
        ) : filteredSlots.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center p-5">
              <p className="mb-3">No monitoring slots found matching your criteria.</p>
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
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Current Voters</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="fw-semibold">{slot.name}</td>
                      <td>{slot.location}</td>
                      <td>
                        <Badge bg={slot.status === 'active' ? 'success' : 'secondary'}>
                          {slot.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{slot.capacity}</td>
                      <td>{slot.currentVoters}</td>
                      <td>{formatDate(slot.lastUpdated)}</td>
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
    </Layout>
  );
};

export default ViewSlots; 