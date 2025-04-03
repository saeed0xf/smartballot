import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Tab, Tabs, Badge, Alert, Modal, Spinner } from 'react-bootstrap';
import { FaUserPlus, FaEdit, FaTrashAlt, FaEye, FaSearch, FaSave, FaTimes, FaCamera, FaUpload, FaDownload } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { formatImageUrl, isPreviewUrl } from '../../utils/imageUtils';
import { Link } from 'react-router-dom';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ManageCandidates = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  
  // State for form
  const [newCandidate, setNewCandidate] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    age: '',
    gender: 'Male',
    dateOfBirth: '',
    photoUrl: '',
    partyName: '',
    partySymbol: '',
    electionType: 'Lok Sabha Elections',
    electionId: '', // Add election ID field
    constituency: '',
    manifesto: '',
    education: '',
    experience: '',
    criminalRecord: 'None',
    email: ''
  });
  
  const [candidateImage, setCandidateImage] = useState(null);
  const [partySymbolImage, setPartySymbolImage] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  // Get auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch elections for the dropdown
  const fetchElections = async () => {
    try {
      const headers = getAuthHeaders();
      console.log('Fetching elections...');
      
      const response = await axios.get(`${API_URL}/admin/elections`, {
        headers: headers
      });
      
      console.log('Elections data:', response.data);
      setElections(response.data || []);
      return response.data;
    } catch (err) {
      console.error('Error fetching elections:', err);
      return [];
    }
  };

  // Fetch real data from the API
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth headers
        const headers = getAuthHeaders();
        console.log('Authorization headers:', headers);
        
        // First, fetch elections
        const electionsList = await fetchElections();
        
        // Then fetch candidates
        const response = await axios.get(`${API_URL}/admin/candidates`, {
          headers: headers
        });
        
        console.log('Candidates data:', response.data);
        
        // Format image URLs in the candidates data
        const formattedCandidates = response.data.map(candidate => {
          // Ensure the age is calculated from date of birth
          const calculatedAge = candidate.dateOfBirth ? calculateAge(candidate.dateOfBirth) : candidate.age;
          
          // Find election name from elections list
          const electionName = candidate.election ? 
            electionsList.find(e => e._id === candidate.election)?.title || "Unknown Election" : 
            "No Election";
          
          return {
            ...candidate,
            photoUrl: formatImageUrl(candidate.photoUrl),
            partySymbol: formatImageUrl(candidate.partySymbol),
            age: calculatedAge,
            electionName: electionName
          };
        });
        
        setCandidates(formattedCandidates || []);
      } catch (err) {
        console.error('Error fetching candidates:', err);
        if (err.response) {
          console.error('Response status:', err.response.status);
          console.error('Response data:', err.response.data);
        }
        setError('Failed to fetch candidates. Please try again.');
        
        // Fallback to empty array if fetch fails
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);
  
  // Add a function to calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred yet this year, subtract 1 from age
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age.toString() : '';
  };

  // Handle election change to update the election type
  const handleElectionChange = (e) => {
    const electionId = e.target.value;
    const selectedElection = elections.find(election => election._id === electionId);
    
    if (selectedElection) {
      setNewCandidate(prev => ({ 
        ...prev, 
        electionId: electionId,
        electionType: selectedElection.type || 'Lok Sabha Elections'
      }));
      
      // Clear error if there was one
      if (formErrors.electionId) {
        setFormErrors(prev => ({ ...prev, electionId: null }));
      }
    } else {
      setNewCandidate(prev => ({ 
        ...prev, 
        electionId: '',
        electionType: 'Lok Sabha Elections'
      }));
    }
  };

  // Modify the handleInputChange function to calculate age when DOB changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'dateOfBirth') {
      // When date of birth changes, calculate and set age
      const calculatedAge = calculateAge(value);
      setNewCandidate(prev => ({ 
        ...prev, 
        [name]: value,
        age: calculatedAge
      }));
    } else {
      setNewCandidate(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is updated
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Handle candidate image upload
  const handleCandidateImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCandidateImage(file);
      // Create URL for preview
      setNewCandidate(prev => ({ 
        ...prev, 
        photoUrl: URL.createObjectURL(file) 
      }));
    }
  };
  
  // Handle party symbol upload
  const handlePartySymbolChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPartySymbolImage(file);
      // Create URL for preview
      setNewCandidate(prev => ({ 
        ...prev, 
        partySymbol: URL.createObjectURL(file) 
      }));
    }
  };
  
  // Update the validateForm function to require an election
  const validateForm = () => {
    const errors = {};
    
    if (!newCandidate.firstName) errors.firstName = 'First name is required';
    if (!newCandidate.lastName) errors.lastName = 'Last name is required';
    if (!newCandidate.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    // Calculate age if birth date is provided
    if (newCandidate.dateOfBirth) {
      const calculatedAge = calculateAge(newCandidate.dateOfBirth);
      if (calculatedAge < 18) {
        errors.dateOfBirth = 'Candidate must be at least 18 years old';
      }
    }
    if (!newCandidate.partyName) errors.partyName = 'Party name is required';
    if (!newCandidate.electionId) errors.electionId = 'Please select an election';
    if (!newCandidate.constituency) errors.constituency = 'Constituency is required';
    if (!newCandidate.photoUrl) errors.photoUrl = 'Candidate photo is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add candidate data to formData, ensuring age is up-to-date
      const calculatedAge = calculateAge(newCandidate.dateOfBirth);
      const candidateData = {
        ...newCandidate,
        age: calculatedAge
      };

      Object.keys(candidateData).forEach(key => {
        if (key !== 'photoUrl' && key !== 'partySymbol' && key !== 'id' && key !== '_id') {
          formData.append(key, candidateData[key]);
        }
      });
      
      // Add image files if present
      if (candidateImage) {
        formData.append('candidatePhoto', candidateImage);
      }
      
      if (partySymbolImage) {
        formData.append('partySymbol', partySymbolImage);
      }
      
      // Get auth headers
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      };
      
      let response;
      
      // If editing, call PUT endpoint, otherwise call POST endpoint
      if (isEditing) {
        // Use candidate ID for update
        const candidateId = editingCandidate._id || editingCandidate.id;
        console.log(`Updating candidate with ID: ${candidateId}`);
        
        try {
          response = await axios.put(`${API_URL}/admin/candidates/${candidateId}`, formData, {
            headers: headers
          });
          
          console.log('Update response:', response.data);
          
          // Find the election name
          const electionName = elections.find(e => e._id === newCandidate.electionId)?.title || "Unknown Election";
          
          // Update the candidate in the UI
          setCandidates(prev => prev.map(c => 
            (c._id === candidateId || c.id === candidateId) 
              ? {
                  ...newCandidate,
                  id: candidateId,
                  _id: response.data._id || candidateId,
                  photoUrl: response.data.photoUrl || newCandidate.photoUrl,
                  partySymbol: response.data.partySymbol || newCandidate.partySymbol,
                  age: calculateAge(newCandidate.dateOfBirth),
                  electionName: electionName
                }
              : c
          ));
          
          setSuccessMessage("Candidate successfully updated!");
        } catch (updateError) {
          console.error('Error updating candidate:', updateError);
          if (updateError.response) {
            console.error('Response status:', updateError.response.status);
            console.error('Response data:', updateError.response.data);
          }
          
          // Even if API call fails, update UI for demo purposes
          const electionName = elections.find(e => e._id === newCandidate.electionId)?.title || "Unknown Election";
          
          setCandidates(prev => prev.map(c => 
            (c._id === editingCandidate._id || c.id === editingCandidate.id) 
              ? {
                  ...newCandidate,
                  id: editingCandidate.id,
                  _id: editingCandidate._id,
                  age: calculateAge(newCandidate.dateOfBirth),
                  electionName: electionName
                }
              : c
          ));
          
          setSuccessMessage("Candidate updated locally (MongoDB connection failed)");
        }
      } else {
        // Otherwise, add a new candidate
        try {
          console.log('Sending candidate data to:', `${API_URL}/admin/candidates`);
          console.log('With headers:', headers);
          
          response = await axios.post(`${API_URL}/admin/candidates`, formData, {
            headers: headers
          });
          
          console.log('API response:', response.data);
          
          // Find the election name
          const electionName = elections.find(e => e._id === newCandidate.electionId)?.title || "Unknown Election";
          
          // Add the new candidate to the UI
          const newId = candidates.length > 0 ? Math.max(...candidates.map(c => c.id || 0)) + 1 : 1;
          const candidateToAdd = {
            ...newCandidate,
            id: response.data._id || newId, // Use ID from MongoDB if available
            _id: response.data._id,
            age: calculateAge(newCandidate.dateOfBirth),
            electionName: electionName
          };
          
          setCandidates(prev => [...prev, candidateToAdd]);
          setSuccessMessage("Candidate successfully added to the database!");
        } catch (apiError) {
          console.error('Error saving to MongoDB:', apiError);
          if (apiError.response) {
            console.error('Response status:', apiError.response.status);
            console.error('Response data:', apiError.response.data);
          }
          
          // If API call fails, still update UI for demo purposes
          const newId = candidates.length > 0 ? Math.max(...candidates.map(c => c.id || 0)) + 1 : 1;
          const electionName = elections.find(e => e._id === newCandidate.electionId)?.title || "Unknown Election";
          
          const candidateToAdd = {
            ...newCandidate,
            id: newId,
            age: calculateAge(newCandidate.dateOfBirth),
            electionName: electionName
          };
          
          setCandidates(prev => [...prev, candidateToAdd]);
          setSuccessMessage("Candidate added locally (MongoDB connection failed)");
        }
      }
      
      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
        setSuccessMessage("");
        setActiveTab('list');
      }, 3000);
      
    } catch (error) {
      console.error('Error adding/updating candidate:', error);
      setError('Failed to add/update candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // View candidate details
  const handleViewCandidate = (candidate) => {
    // Make sure image URLs are properly formatted
    setSelectedCandidate({
      ...candidate,
      photoUrl: formatImageUrl(candidate.photoUrl),
      partySymbol: formatImageUrl(candidate.partySymbol)
    });
    setShowViewModal(true);
  };

  // Handle delete candidate
  const handleDeleteClick = (candidate) => {
    // Store both id and _id to handle both local and MongoDB candidates
    setDeletingId({
      id: candidate.id,
      _id: candidate._id || candidate.id
    });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      
      // Get auth headers
      const headers = getAuthHeaders();
      
      // Get the appropriate ID for the API call
      const candidateId = deletingId._id;
      
      console.log(`Deleting candidate with ID: ${candidateId}`);
      
      try {
        // Call API to delete candidate with proper URL
        await axios.delete(`${API_URL}/admin/candidates/${candidateId}`, {
          headers: headers
        });
        
        console.log('Successfully deleted candidate from database');
        
        // Remove candidate from list - check both id and _id
        setCandidates(prev => prev.filter(c => 
          c.id !== deletingId.id && (c._id ? c._id !== deletingId._id : true)
        ));
        
      } catch (apiError) {
        console.error('Error deleting from database:', apiError);
        if (apiError.response) {
          console.error('Response status:', apiError.response.status);
          console.error('Response data:', apiError.response.data);
        }
        
        // Even if API call fails, update UI for demo purposes
        setCandidates(prev => prev.filter(c => 
          c.id !== deletingId.id && (c._id ? c._id !== deletingId._id : true)
        ));
        
        setError("Candidate deleted locally (MongoDB connection failed)");
      }

      setShowDeleteModal(false);
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting candidate:', error);
      setError('Failed to delete candidate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update the edit candidate function to calculate age when populating the form
  const handleEditClick = (candidate) => {
    // Check if candidate is in an active election
    if (candidate.inActiveElection) {
      setError("Cannot edit a candidate who is part of an active election. End the election first.");
      return;
    }
    
    // Set the form fields to the candidate's current values
    const candidateForEdit = {
      ...candidate,
      // Convert any date strings to the format expected by the date input
      dateOfBirth: candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toISOString().split('T')[0] : '',
      // Make sure to include the election ID
      electionId: candidate.election || ''
    };
    
    // Ensure age is calculated from date of birth
    if (candidateForEdit.dateOfBirth) {
      candidateForEdit.age = calculateAge(candidateForEdit.dateOfBirth);
    }
    
    setEditingCandidate(candidate);
    setNewCandidate(candidateForEdit);
    setIsEditing(true);
    setActiveTab('add'); // Switch to the form tab
  };

  // Add a function to reset the form properly
  const resetForm = () => {
    setNewCandidate({
      firstName: '',
      middleName: '',
      lastName: '',
      age: '',
      gender: 'Male',
      dateOfBirth: '',
      photoUrl: '',
      partyName: '',
      partySymbol: '',
      electionType: 'Lok Sabha Elections',
      electionId: '', // Reset election ID
      constituency: '',
      manifesto: '',
      education: '',
      experience: '',
      criminalRecord: 'None',
      email: ''
    });
    setCandidateImage(null);
    setPartySymbolImage(null);
    setIsEditing(false);
    setEditingCandidate(null);
    setSuccessMessage("");
  };

  // Remove the handleAgeChange function as it's no longer needed
  // and replace with a function to update the form when DOB changes
  const handleDateOfBirthChange = (e) => {
    const dateOfBirth = e.target.value;
    const calculatedAge = calculateAge(dateOfBirth);
    
    setNewCandidate(prev => ({
      ...prev,
      dateOfBirth: dateOfBirth,
      age: calculatedAge
    }));
    
    // Clear any date-related errors
    if (formErrors.dateOfBirth) {
      setFormErrors(prev => ({ ...prev, dateOfBirth: null }));
    }
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Manage Candidates</h1>
            <p className="text-muted">
              Add, update, and remove election candidates.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab eventKey="list" title="All Candidates">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Candidate List</h5>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('add')}
                    className="d-flex align-items-center"
                  >
                    <FaUserPlus className="me-1" /> Add New Candidate
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading candidates...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="mb-0">No candidates found.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-3"
                      onClick={() => setActiveTab('add')}
                    >
                      <FaUserPlus className="me-1" /> Add Candidate
                    </Button>
                  </div>
                ) : (
                  <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th width="8%">Photo</th>
                        <th width="20%">Name</th>
                        <th width="8%">Age</th>
                        <th width="15%">Party</th>
                        <th width="18%">Election</th>
                        <th width="15%">Constituency</th>
                        <th width="16%">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate) => (
                        <tr key={candidate.id}>
                          <td>
                            <img
                              src={candidate.photoUrl}
                              alt={candidate.firstName}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                              }}
                            />
                          </td>
                          <td>
                            {candidate.firstName} {candidate.middleName} {candidate.lastName}
                          </td>
                          <td>
                            {candidate.age} {candidate.age ? 'years' : ''}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <img
                                src={candidate.partySymbol}
                                alt={candidate.partyName}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  marginRight: '8px'
                                }}
                              />
                              {candidate.partyName}
                            </div>
                          </td>
                          <td>
                            {candidate.electionName || "No Election"}
                            {candidate.inActiveElection && (
                              <Badge bg="success" className="ms-2">Active</Badge>
                            )}
                          </td>
                          <td>{candidate.constituency}</td>
                          <td>
                            <Button
                              variant="info"
                              size="sm"
                              className="me-2"
                              title="View Details"
                              onClick={() => handleViewCandidate(candidate)}
                            >
                              <FaEye />
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="me-2"
                              title="Edit Candidate"
                              onClick={() => handleEditClick(candidate)}
                              disabled={candidate.inActiveElection}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              title="Delete Candidate"
                              onClick={() => handleDeleteClick(candidate)}
                              disabled={candidate.inActiveElection}
                            >
                              <FaTrashAlt />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
          <Tab eventKey="add" title="Add Candidate">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">{isEditing ? 'Edit Candidate' : 'Add New Candidate'}</h5>
              </Card.Header>
              <Card.Body>
                {successMessage && (
                  <Alert variant="success" className="mb-4">
                    {successMessage}
                  </Alert>
                )}
                {isEditing && !successMessage && (
                  <Alert variant="info" className="mb-4">
                    <div className="d-flex align-items-center">
                      <FaEdit className="me-2" /> 
                      <div>
                        <strong>Edit Mode:</strong> You are editing candidate "{editingCandidate?.firstName} {editingCandidate?.lastName}". 
                        Make your changes and click 'Update Candidate' to save them.
                      </div>
                    </div>
                  </Alert>
                )}
                
                <Form onSubmit={handleSubmit}>
                  <h5 className="mb-3">Basic Candidate Details</h5>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={newCandidate.firstName}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.firstName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.firstName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Middle Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="middleName"
                          value={newCandidate.middleName}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={newCandidate.lastName}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.lastName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.lastName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date of Birth <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          name="dateOfBirth"
                          value={newCandidate.dateOfBirth}
                          onChange={handleDateOfBirthChange}
                          isInvalid={!!formErrors.dateOfBirth}
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.dateOfBirth}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          Candidate must be at least 18 years old
                        </Form.Text>
                        {newCandidate.dateOfBirth && !formErrors.dateOfBirth && (
                          <div className="mt-1 text-success">
                            Age: {newCandidate.age} years
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gender</Form.Label>
                        <Form.Select
                          name="gender"
                          value={newCandidate.gender}
                          onChange={handleInputChange}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Candidate Photo <span className="text-danger">*</span></Form.Label>
                        <div className="mb-2">
                          <Button
                            as="label"
                            htmlFor="candidatePhoto"
                            variant="outline-primary"
                            className="me-2"
                          >
                            <FaUpload className="me-2" /> Upload Photo
                          </Button>
                          <Form.Control
                            type="file"
                            id="candidatePhoto"
                            onChange={handleCandidateImageChange}
                            className="d-none"
                            accept="image/*"
                          />
                          {formErrors.photoUrl && (
                            <div className="text-danger mt-1">
                              {formErrors.photoUrl}
                            </div>
                          )}
                        </div>
                        {newCandidate.photoUrl && (
                          <div className="mt-2 position-relative" style={{ maxWidth: '150px' }}>
                            <img
                              src={isPreviewUrl(newCandidate.photoUrl) ? newCandidate.photoUrl : formatImageUrl(newCandidate.photoUrl)}
                              alt="Candidate Preview"
                              className="img-thumbnail"
                              style={{ width: '100%', height: 'auto' }}
                              onError={(e) => {
                                console.error('Error loading image:', e);
                                e.target.src = 'https://via.placeholder.com/150?text=Image+Error';
                              }}
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0"
                              onClick={() => {
                                setNewCandidate(prev => ({ ...prev, photoUrl: '' }));
                                setCandidateImage(null);
                              }}
                            >
                              <FaTimes />
                            </Button>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={newCandidate.email}
                          onChange={handleInputChange}
                        />
                        <Form.Text className="text-muted">
                          For contact purposes
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <hr className="my-4" />
                  
                  <h5 className="mb-3">Election-Specific Details</h5>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Political Party Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="partyName"
                          value={newCandidate.partyName}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.partyName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.partyName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Party Symbol</Form.Label>
                        <div className="mb-2">
                          <Button
                            as="label"
                            htmlFor="partySymbol"
                            variant="outline-primary"
                            className="me-2"
                          >
                            <FaUpload className="me-2" /> Upload Symbol
                          </Button>
                          <Form.Control
                            type="file"
                            id="partySymbol"
                            onChange={handlePartySymbolChange}
                            className="d-none"
                            accept="image/*"
                          />
                        </div>
                        {newCandidate.partySymbol && (
                          <div className="mt-2 position-relative" style={{ maxWidth: '100px' }}>
                            <img
                              src={isPreviewUrl(newCandidate.partySymbol) ? newCandidate.partySymbol : formatImageUrl(newCandidate.partySymbol)}
                              alt="Party Symbol Preview"
                              className="img-thumbnail"
                              style={{ width: '100%', height: 'auto' }}
                              onError={(e) => {
                                console.error('Error loading image:', e);
                                e.target.src = 'https://via.placeholder.com/100?text=Symbol+Error';
                              }}
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0"
                              onClick={() => {
                                setNewCandidate(prev => ({ ...prev, partySymbol: '' }));
                                setPartySymbolImage(null);
                              }}
                            >
                              <FaTimes />
                            </Button>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Select Election <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                          name="electionId"
                          value={newCandidate.electionId}
                          onChange={handleElectionChange}
                          isInvalid={!!formErrors.electionId}
                          disabled={isEditing} // Can't change election when editing
                        >
                          <option value="">-- Select an Election --</option>
                          {elections.map(election => (
                            <option key={election._id} value={election._id}>
                              {election.title || election.name} ({election.type})
                            </option>
                          ))}
                        </Form.Select>
                        {elections.length === 0 && (
                          <Alert variant="warning" className="mt-2">
                            <small>
                              No elections found. <Link to="/admin/elections">Create an election</Link> first before adding candidates.
                            </small>
                          </Alert>
                        )}
                        <Form.Control.Feedback type="invalid">
                          {formErrors.electionId}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          Candidates must be associated with an election
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Constituency/Region <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="constituency"
                          value={newCandidate.constituency}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.constituency}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.constituency}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <hr className="my-4" />
                  
                  <h5 className="mb-3">Additional Information</h5>
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Candidate Manifesto</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="manifesto"
                          value={newCandidate.manifesto}
                          onChange={handleInputChange}
                          placeholder="Brief about the candidate's promises, agenda, or policies"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Educational Qualifications</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="education"
                          value={newCandidate.education}
                          onChange={handleInputChange}
                          placeholder="Highest degree, institution, etc."
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Previous Experience</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="experience"
                          value={newCandidate.experience}
                          onChange={handleInputChange}
                          placeholder="Past positions held, work in politics or governance"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Criminal Record Status</Form.Label>
                        <Form.Select
                          name="criminalRecord"
                          value={newCandidate.criminalRecord}
                          onChange={handleInputChange}
                        >
                          <option value="None">None</option>
                          <option value="Pending Cases">Pending Cases</option>
                          <option value="Convicted">Convicted</option>
                          <option value="Acquitted">Acquitted</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <div className="d-flex justify-content-end mt-4">
                    <Button 
                      variant="secondary" 
                      className="me-2"
                      onClick={() => {
                        setActiveTab('list');
                        if (isEditing) {
                          setIsEditing(false);
                          setEditingCandidate(null);
                          resetForm();
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-1" /> {isEditing ? 'Update Candidate' : 'Save Candidate'}
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Container>
      
      {/* View Candidate Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)}
        size="lg"
        centered
      >
        {selectedCandidate && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Candidate Details</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              <Row>
                <Col md={4} className="text-center mb-4">
                  <img
                    src={selectedCandidate.photoUrl}
                    alt={`${selectedCandidate.firstName} ${selectedCandidate.lastName}`}
                    className="img-thumbnail"
                    style={{ width: '200px', height: '200px', objectFit: 'cover' }}
                  />
                  <div className="mt-3">
                    <h5>{selectedCandidate.firstName} {selectedCandidate.middleName} {selectedCandidate.lastName}</h5>
                    <Badge bg="primary">{selectedCandidate.electionType}</Badge>
                  </div>
                </Col>
                <Col md={8}>
                  <h5 className="border-bottom pb-2">Basic Information</h5>
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Full Name:</Col>
                    <Col sm={8}>{selectedCandidate.firstName} {selectedCandidate.middleName} {selectedCandidate.lastName}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Date of Birth:</Col>
                    <Col sm={8}>
                      {selectedCandidate.dateOfBirth ? new Date(selectedCandidate.dateOfBirth).toLocaleDateString() : 'Not provided'}
                      {selectedCandidate.dateOfBirth && (
                        <span className="ms-2 text-muted">
                          (Age: {calculateAge(selectedCandidate.dateOfBirth)} years)
                        </span>
                      )}
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Gender:</Col>
                    <Col sm={8}>{selectedCandidate.gender}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Email:</Col>
                    <Col sm={8}>{selectedCandidate.email || 'Not provided'}</Col>
                  </Row>
                  
                  <h5 className="border-bottom pb-2 mt-4">Election Details</h5>
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Political Party:</Col>
                    <Col sm={8} className="d-flex align-items-center">
                      {selectedCandidate.partySymbol && (
                        <img
                          src={selectedCandidate.partySymbol}
                          alt={selectedCandidate.partyName}
                          style={{ width: '30px', height: '30px', marginRight: '10px' }}
                        />
                      )}
                      {selectedCandidate.partyName}
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Election Type:</Col>
                    <Col sm={8}>{selectedCandidate.electionType}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Constituency:</Col>
                    <Col sm={8}>{selectedCandidate.constituency}</Col>
                  </Row>
                  
                  <h5 className="border-bottom pb-2 mt-4">Additional Information</h5>
                  {selectedCandidate.manifesto && (
                    <Row className="mb-3">
                      <Col sm={4} className="text-muted">Manifesto:</Col>
                      <Col sm={8}>{selectedCandidate.manifesto}</Col>
                    </Row>
                  )}
                  {selectedCandidate.education && (
                    <Row className="mb-3">
                      <Col sm={4} className="text-muted">Education:</Col>
                      <Col sm={8}>{selectedCandidate.education}</Col>
                    </Row>
                  )}
                  {selectedCandidate.experience && (
                    <Row className="mb-3">
                      <Col sm={4} className="text-muted">Experience:</Col>
                      <Col sm={8}>{selectedCandidate.experience}</Col>
                    </Row>
                  )}
                  <Row className="mb-3">
                    <Col sm={4} className="text-muted">Criminal Record:</Col>
                    <Col sm={8}>
                      {selectedCandidate.criminalRecord === 'None' ? (
                        <Badge bg="success">None</Badge>
                      ) : (
                        <Badge bg="warning">{selectedCandidate.criminalRecord}</Badge>
                      )}
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this candidate? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteConfirm}
            disabled={loading}
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
                Deleting...
              </>
            ) : (
              <>Delete Candidate</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default ManageCandidates; 