import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Row, Col, Button, Alert, Spinner, ListGroup, Badge, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaTimes, FaClock, FaCalendarAlt, FaUsers, FaSearch, FaCheckCircle, FaEnvelope } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';

const AddSlot = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    capacity: '',
    startDate: '',
    startTime: '',
    endTime: '',
    status: 'active',
    description: ''
  });
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Voter selection related states
  const [voters, setVoters] = useState([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [selectedVoters, setSelectedVoters] = useState([]);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [voterSearchQuery, setVoterSearchQuery] = useState('');
  const [emailsSent, setEmailsSent] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);

  // Fetch voters from the database
  useEffect(() => {
    const fetchVoters = async () => {
      try {
        setLoadingVoters(true);
        
        // In a real app, we would fetch from the API
        // const response = await axios.get('/api/voters/pending-allocation');
        // setVoters(response.data);
        
        // For now, we'll use dummy data
        setTimeout(() => {
          setVoters([
            { id: 'v1', name: 'John Doe', email: 'john.doe@example.com', status: 'approved', walletAddress: '0x1234...5678' },
            { id: 'v2', name: 'Jane Smith', email: 'jane.smith@example.com', status: 'approved', walletAddress: '0x8765...4321' },
            { id: 'v3', name: 'Robert Johnson', email: 'robert@example.com', status: 'approved', walletAddress: '0x2468...1357' },
            { id: 'v4', name: 'Emily Davis', email: 'emily@example.com', status: 'approved', walletAddress: '0x1357...2468' },
            { id: 'v5', name: 'Michael Wilson', email: 'michael@example.com', status: 'approved', walletAddress: '0x9876...5432' },
            { id: 'v6', name: 'Sarah Brown', email: 'sarah@example.com', status: 'approved', walletAddress: '0x5432...9876' },
            { id: 'v7', name: 'David Thompson', email: 'david@example.com', status: 'approved', walletAddress: '0x3456...7890' }
          ]);
          setLoadingVoters(false);
        }, 800); // Simulate loading delay
      } catch (error) {
        console.error('Error fetching voters:', error);
        setLoadingVoters(false);
      }
    };
    
    fetchVoters();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Filter voters based on search query
  const filteredVoters = voters.filter(voter => {
    if (voterSearchQuery.trim() === '') return true;
    
    const query = voterSearchQuery.toLowerCase();
    return (
      voter.name.toLowerCase().includes(query) ||
      voter.email.toLowerCase().includes(query) ||
      voter.walletAddress.toLowerCase().includes(query)
    );
  });
  
  // Toggle voter selection
  const toggleVoterSelection = (voterId) => {
    setSelectedVoters(prev => {
      if (prev.includes(voterId)) {
        return prev.filter(id => id !== voterId);
      } else {
        return [...prev, voterId];
      }
    });
  };
  
  // Format time for email
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // Format date for email
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  // Send email notifications to selected voters
  const sendEmailNotifications = async () => {
    setSendingEmails(true);
    
    try {
      // Get selected voter data
      const selectedVoterData = voters.filter(voter => selectedVoters.includes(voter.id));
      
      // In a real app, we would call the API to send emails
      // for (const voter of selectedVoterData) {
      //   await axios.post('/api/notifications/email', {
      //     to: voter.email,
      //     subject: 'Voting Time Slot Allocated',
      //     content: `
      //       Dear ${voter.name},
      //       
      //       You have been allocated a voting time slot for the upcoming election:
      //       
      //       Polling Station: ${formData.name} at ${formData.location}
      //       Address: ${formData.address}
      //       Date: ${formatDate(formData.startDate)}
      //       Time: ${formatTime(formData.startTime)} - ${formatTime(formData.endTime)}
      //       
      //       Please arrive at the polling station during your allocated time slot with your identification.
      //       
      //       Thank you for participating in the democratic process.
      //       
      //       Best regards,
      //       Election Commission
      //     `
      //   });
      // }
      
      // Simulate email sending delay
      setTimeout(() => {
        console.log('Emails sent to:', selectedVoterData.map(v => v.email).join(', '));
        setEmailsSent(true);
        setSendingEmails(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending emails:', error);
      setSendingEmails(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Check if voters are selected
    if (selectedVoters.length === 0) {
      setError('Please select at least one voter for this time slot.');
      return;
    }
    
    setValidated(true);
    setLoading(true);
    setError(null);
    
    try {
      // In a real application, you would submit to your API
      // const slotData = {
      //   ...formData,
      //   voters: selectedVoters
      // };
      // await axios.post('/api/officer/slots', slotData);
      
      // For now, we'll simulate a successful submission
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
        
        // Send email notifications
        sendEmailNotifications();
        
        // Reset form after successful submission (except voters selection)
        setFormData({
          name: '',
          location: '',
          address: '',
          capacity: '',
          startDate: '',
          startTime: '',
          endTime: '',
          status: 'active',
          description: ''
        });
        setValidated(false);
        
        // Auto-redirect after success
        setTimeout(() => {
          navigate('/officer/slots');
        }, 3000);
      }, 1000);
    } catch (error) {
      console.error('Error adding voting time slot:', error);
      setError(error.response?.data?.message || 'Error adding voting time slot. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Add Voting Time Slot</h1>
            <p className="text-muted">
              Create a new time slot for voters to cast their ballots at polling stations.
            </p>
          </div>
          <Button
            as={Link}
            to="/officer/slots"
            variant="outline-secondary"
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" /> Back to Slots
          </Button>
        </div>

        {success && (
          <Alert variant="success" className="mb-4">
            <div className="d-flex align-items-center">
              <FaCheckCircle className="me-2" size={20} />
              <div>
                <p className="mb-0"><strong>Voting time slot created successfully!</strong></p>
                {emailsSent && (
                  <p className="mb-0 small">
                    Confirmation emails have been sent to selected voters.
                  </p>
                )}
                {sendingEmails && (
                  <p className="mb-0 small">
                    Sending confirmation emails to voters...
                  </p>
                )}
                <p className="mb-0 small text-muted">Redirecting to slots list...</p>
              </div>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="name">
                    <Form.Label>Slot Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      required
                      type="text"
                      name="name"
                      placeholder="e.g., Morning Session Ward 1"
                      value={formData.name}
                      onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide a name for the voting time slot.
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="location">
                    <Form.Label>Location Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      required
                      type="text"
                      name="location"
                      placeholder="e.g., City Hall, Community Center"
                      value={formData.location}
                      onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide a location name.
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group controlId="address" className="mb-3">
                <Form.Label>Full Address <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  required
                  type="text"
                  name="address"
                  placeholder="e.g., 123 Main St, City, State, Zip"
                  value={formData.address}
                  onChange={handleChange}
                />
                <Form.Control.Feedback type="invalid">
                  Please provide the full address.
                </Form.Control.Feedback>
              </Form.Group>

              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="capacity">
                    <Form.Label>Voter Capacity <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      required
                      type="number"
                      name="capacity"
                      placeholder="Maximum number of voters for this time slot"
                      min="1"
                      value={formData.capacity}
                      onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide a valid capacity (minimum 1).
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="status">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group controlId="startDate">
                    <Form.Label className="d-flex align-items-center">
                      <FaCalendarAlt className="me-2" />
                      Voting Date <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      required
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please select a voting date.
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="startTime">
                    <Form.Label className="d-flex align-items-center">
                      <FaClock className="me-2" />
                      Start Time <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      required
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please select a start time.
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="endTime">
                    <Form.Label className="d-flex align-items-center">
                      <FaClock className="me-2" />
                      End Time <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      required
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please select an end time.
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
              
              {/* Voter Selection Section */}
              <Card className="mb-4 border">
                <Card.Header className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 d-flex align-items-center">
                      <FaUsers className="me-2" /> Voter Assignment
                    </h5>
                    <Badge bg="primary" pill>
                      {selectedVoters.length} selected
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted mb-3">
                    Select voters to assign to this time slot. They will receive an email notification with the details.
                  </p>
                  
                  <Button 
                    variant="outline-primary" 
                    className="w-100 mb-3"
                    onClick={() => setShowVotersModal(true)}
                  >
                    <FaUsers className="me-2" /> Select Voters
                  </Button>
                  
                  {selectedVoters.length > 0 && (
                    <div className="selected-voters">
                      <h6 className="mb-2">Selected Voters:</h6>
                      <ListGroup variant="flush" className="border rounded">
                        {voters
                          .filter(voter => selectedVoters.includes(voter.id))
                          .map(voter => (
                            <ListGroup.Item key={voter.id} className="d-flex justify-content-between align-items-center py-2">
                              <div>
                                <div className="fw-semibold">{voter.name}</div>
                                <div className="text-muted small">{voter.email}</div>
                              </div>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => toggleVoterSelection(voter.id)}
                              >
                                <FaTimes />
                              </Button>
                            </ListGroup.Item>
                          ))
                        }
                      </ListGroup>
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Form.Group controlId="description" className="mb-4">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  placeholder="Additional information about this voting time slot"
                  value={formData.description}
                  onChange={handleChange}
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => navigate('/officer/slots')}
                  className="d-flex align-items-center"
                  disabled={loading}
                >
                  <FaTimes className="me-2" /> Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="d-flex align-items-center"
                  disabled={loading || selectedVoters.length === 0}
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" /> Create Time Slot
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
        
        {/* Voter Selection Modal */}
        <Modal 
          show={showVotersModal} 
          onHide={() => setShowVotersModal(false)} 
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Select Voters</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                placeholder="Search by name, email, or wallet address..."
                value={voterSearchQuery}
                onChange={(e) => setVoterSearchQuery(e.target.value)}
                className="mb-3"
              />
            </Form.Group>
            
            {loadingVoters ? (
              <div className="text-center my-4">
                <Spinner animation="border" variant="primary" />
                <p>Loading voters...</p>
              </div>
            ) : filteredVoters.length === 0 ? (
              <Alert variant="info">No voters match your search criteria.</Alert>
            ) : (
              <div className="voter-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <ListGroup>
                  {filteredVoters.map(voter => (
                    <ListGroup.Item 
                      key={voter.id}
                      className="d-flex justify-content-between align-items-center"
                      action
                      onClick={() => toggleVoterSelection(voter.id)}
                      active={selectedVoters.includes(voter.id)}
                    >
                      <div>
                        <div className="fw-semibold">{voter.name}</div>
                        <div className="text-muted small">
                          {voter.email} • {voter.walletAddress}
                        </div>
                      </div>
                      <Form.Check 
                        type="checkbox" 
                        checked={selectedVoters.includes(voter.id)}
                        onChange={() => {}} // Handled by the onClick on the ListGroup.Item
                        onClick={(e) => e.stopPropagation()}
                      />
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            <div>
              <Badge bg="primary" pill className="px-3 py-2">
                {selectedVoters.length} voters selected
              </Badge>
            </div>
            <div>
              <Button 
                variant="secondary" 
                className="me-2"
                onClick={() => setShowVotersModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setShowVotersModal(false)}
              >
                Confirm Selection
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default AddSlot; 