import React, { useState } from 'react';
import { Container, Card, Form, Row, Col, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';

const AddSlot = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    capacity: '',
    status: 'active',
    description: ''
  });
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    setValidated(true);
    setLoading(true);
    setError(null);
    
    try {
      // In a real application, you would submit to your API
      // await axios.post('/api/officer/slots', formData);
      
      // For now, we'll simulate a successful submission
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
        
        // Reset form after successful submission
        setFormData({
          name: '',
          location: '',
          address: '',
          capacity: '',
          status: 'active',
          description: ''
        });
        setValidated(false);
        
        // Auto-redirect after success
        setTimeout(() => {
          navigate('/officer/slots');
        }, 2000);
      }, 1000);
    } catch (error) {
      console.error('Error adding monitoring slot:', error);
      setError(error.response?.data?.message || 'Error adding monitoring slot. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Add Monitoring Slot</h1>
            <p className="text-muted">
              Create a new polling station monitoring slot for the election.
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
            Monitoring slot created successfully! Redirecting to slots list...
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <Card className="border-0 shadow-sm">
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
                      placeholder="e.g., Ward 1 Polling Station"
                      value={formData.name}
                      onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                      Please provide a name for the monitoring slot.
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
                    <Form.Label>Capacity <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      required
                      type="number"
                      name="capacity"
                      placeholder="Maximum number of voters"
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

              <Form.Group controlId="description" className="mb-4">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  placeholder="Additional information about this monitoring slot"
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
                  disabled={loading}
                >
                  <FaSave className="me-2" /> {loading ? 'Saving...' : 'Save Slot'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default AddSlot; 