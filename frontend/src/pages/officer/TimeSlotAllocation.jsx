import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Row, Col, Button, Alert, Spinner, Table, Badge, Modal, ListGroup, Tabs, Tab } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaClock, FaUsers, FaRandom, FaCheck, FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';

const TimeSlotAllocation = () => {
  // State for election period
  const [electionPeriod, setElectionPeriod] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    votingDurationMinutes: 30 // Default voting duration per voter
  });

  // State for voters and time slots
  const [voters, setVoters] = useState([]);
  const [assignedVoters, setAssignedVoters] = useState([]);
  const [unassignedVoters, setUnassignedVoters] = useState([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for modal and selections
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState('');
  const [selectedSlotTime, setSelectedSlotTime] = useState('');
  
  // Feedback states
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Load election period settings
  useEffect(() => {
    const fetchElectionSettings = async () => {
      try {
        // In a real app, we would fetch from the API
        // const response = await axios.get('/api/election/settings');
        // setElectionPeriod(response.data);
        
        // For now, just set some default values
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        setElectionPeriod({
          startDate: tomorrow.toISOString().split('T')[0],
          startTime: '08:00',
          endDate: nextWeek.toISOString().split('T')[0],
          endTime: '18:00',
          votingDurationMinutes: 30
        });
      } catch (error) {
        console.error('Error fetching election settings:', error);
        setError('Failed to load election settings. Please try again.');
      }
    };
    
    fetchElectionSettings();
  }, []);
  
  // Fetch voters
  useEffect(() => {
    const fetchVoters = async () => {
      try {
        setLoadingVoters(true);
        
        // In a real app, we would fetch from the API
        // const response = await axios.get('/api/voters/approved');
        // setVoters(response.data);
        
        // For now, we'll use dummy data
        setTimeout(() => {
          const dummyVoters = [
            { id: 'v1', name: 'John Doe', email: 'john.doe@example.com', status: 'approved', walletAddress: '0x1234...5678', timeSlot: null },
            { id: 'v2', name: 'Jane Smith', email: 'jane.smith@example.com', status: 'approved', walletAddress: '0x8765...4321', timeSlot: null },
            { id: 'v3', name: 'Robert Johnson', email: 'robert@example.com', status: 'approved', walletAddress: '0x2468...1357', 
              timeSlot: { 
                date: '2023-10-16', 
                startTime: '09:00', 
                endTime: '09:30' 
              } 
            },
            { id: 'v4', name: 'Emily Davis', email: 'emily@example.com', status: 'approved', walletAddress: '0x1357...2468', timeSlot: null },
            { id: 'v5', name: 'Michael Wilson', email: 'michael@example.com', status: 'approved', walletAddress: '0x9876...5432', timeSlot: null },
            { id: 'v6', name: 'Sarah Brown', email: 'sarah@example.com', status: 'approved', walletAddress: '0x5432...9876', timeSlot: null },
            { id: 'v7', name: 'David Thompson', email: 'david@example.com', status: 'approved', walletAddress: '0x3456...7890', timeSlot: null }
          ];
          
          setVoters(dummyVoters);
          updateVoterLists(dummyVoters);
          setLoadingVoters(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching voters:', error);
        setError('Failed to load voters. Please try again.');
        setLoadingVoters(false);
      }
    };
    
    fetchVoters();
  }, []);
  
  // Update assigned and unassigned voter lists
  const updateVoterLists = (voterList) => {
    const assigned = voterList.filter(voter => voter.timeSlot !== null);
    const unassigned = voterList.filter(voter => voter.timeSlot === null);
    
    setAssignedVoters(assigned);
    setUnassignedVoters(unassigned);
  };
  
  // Filter voters based on search query
  const filteredUnassignedVoters = unassignedVoters.filter(voter => {
    if (searchQuery.trim() === '') return true;
    
    const query = searchQuery.toLowerCase();
    return (
      voter.name.toLowerCase().includes(query) ||
      voter.email.toLowerCase().includes(query) ||
      voter.walletAddress.toLowerCase().includes(query)
    );
  });
  
  // Handle form changes
  const handleElectionPeriodChange = (e) => {
    const { name, value } = e.target;
    setElectionPeriod(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle manual time slot assignment
  const handleManualAssign = (voter) => {
    setSelectedVoter(voter);
    setSelectedSlotDate(electionPeriod.startDate);
    setSelectedSlotTime(electionPeriod.startTime);
    setShowAssignModal(true);
  };
  
  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + durationMinutes;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };
  
  // Assign time slot to voter
  const assignTimeSlot = async () => {
    try {
      setLoading(true);
      
      // Calculate end time
      const endTime = calculateEndTime(selectedSlotTime, electionPeriod.votingDurationMinutes);
      
      // Check if the time slot is valid
      if (!isTimeSlotValid(selectedSlotDate, selectedSlotTime, endTime)) {
        setError('The selected time slot is outside the election period or overlaps with other voters.');
        setLoading(false);
        return;
      }
      
      // Create time slot object
      const timeSlot = {
        date: selectedSlotDate,
        startTime: selectedSlotTime,
        endTime
      };
      
      // In a real app, we would send this to the API
      // await axios.post(`/api/voters/${selectedVoter.id}/timeslot`, timeSlot);
      
      // For now, we'll update our local state
      const updatedVoters = voters.map(voter => {
        if (voter.id === selectedVoter.id) {
          return { ...voter, timeSlot };
        }
        return voter;
      });
      
      setVoters(updatedVoters);
      updateVoterLists(updatedVoters);
      
      // Simulate sending email
      console.log(`Sending email to ${selectedVoter.email} with time slot details: ${selectedSlotDate} from ${selectedSlotTime} to ${endTime}`);
      
      setSuccess(`Time slot assigned to ${selectedVoter.name} successfully!`);
      setShowAssignModal(false);
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error assigning time slot:', error);
      setError('Failed to assign time slot. Please try again.');
      setLoading(false);
    }
  };
  
  // Check if a time slot is valid
  const isTimeSlotValid = (date, startTime, endTime) => {
    // Check if the time slot is within the election period
    const slotStart = new Date(`${date}T${startTime}`);
    const slotEnd = new Date(`${date}T${endTime}`);
    const electionStart = new Date(`${electionPeriod.startDate}T${electionPeriod.startTime}`);
    const electionEnd = new Date(`${electionPeriod.endDate}T${electionPeriod.endTime}`);
    
    if (slotStart < electionStart || slotEnd > electionEnd) {
      return false;
    }
    
    // Check if the time slot overlaps with any assigned slots
    return !assignedVoters.some(voter => {
      if (!voter.timeSlot) return false;
      
      const voterSlotStart = new Date(`${voter.timeSlot.date}T${voter.timeSlot.startTime}`);
      const voterSlotEnd = new Date(`${voter.timeSlot.date}T${voter.timeSlot.endTime}`);
      
      // Check for overlap
      return (
        (slotStart >= voterSlotStart && slotStart < voterSlotEnd) || 
        (slotEnd > voterSlotStart && slotEnd <= voterSlotEnd) ||
        (slotStart <= voterSlotStart && slotEnd >= voterSlotEnd)
      );
    });
  };
  
  // Generate random time slots for all unassigned voters
  const generateRandomTimeSlots = async () => {
    try {
      setLoading(true);
      
      // Clone the current voters
      let updatedVoters = [...voters];
      let currentAssignedVoters = [...assignedVoters];
      
      // Process each unassigned voter
      for (const voter of unassignedVoters) {
        // Find a valid time slot
        const timeSlot = findAvailableTimeSlot(currentAssignedVoters);
        
        if (!timeSlot) {
          setError('Could not find available time slots for all voters.');
          break;
        }
        
        // Update voter with new time slot
        updatedVoters = updatedVoters.map(v => {
          if (v.id === voter.id) {
            return { ...v, timeSlot };
          }
          return v;
        });
        
        // Add to currently assigned for next iteration
        currentAssignedVoters.push({ ...voter, timeSlot });
        
        // Simulate sending email
        console.log(`Sending email to ${voter.email} with time slot details: ${timeSlot.date} from ${timeSlot.startTime} to ${timeSlot.endTime}`);
      }
      
      setVoters(updatedVoters);
      updateVoterLists(updatedVoters);
      
      setSuccess('Time slots assigned to all voters successfully!');
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error generating random time slots:', error);
      setError('Failed to generate random time slots. Please try again.');
      setLoading(false);
    }
  };
  
  // Find an available time slot
  const findAvailableTimeSlot = (currentAssigned) => {
    // Start from the election start time
    const electionStart = new Date(`${electionPeriod.startDate}T${electionPeriod.startTime}`);
    const electionEnd = new Date(`${electionPeriod.endDate}T${electionPeriod.endTime}`);
    const slotDuration = electionPeriod.votingDurationMinutes * 60 * 1000; // Convert to milliseconds
    
    let currentTime = new Date(electionStart);
    
    while (currentTime.getTime() + slotDuration <= electionEnd.getTime()) {
      // Format the current time as date and time strings
      const date = currentTime.toISOString().split('T')[0];
      const startTime = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
      
      // Calculate end time
      const slotEndTime = new Date(currentTime.getTime() + slotDuration);
      const endTime = `${slotEndTime.getHours().toString().padStart(2, '0')}:${slotEndTime.getMinutes().toString().padStart(2, '0')}`;
      
      // Check if this slot overlaps with any assigned slots
      const isOverlapping = currentAssigned.some(voter => {
        if (!voter.timeSlot) return false;
        
        const voterSlotStart = new Date(`${voter.timeSlot.date}T${voter.timeSlot.startTime}`);
        const voterSlotEnd = new Date(`${voter.timeSlot.date}T${voter.timeSlot.endTime}`);
        
        // Check for overlap
        return (
          (currentTime >= voterSlotStart && currentTime < voterSlotEnd) || 
          (slotEndTime > voterSlotStart && slotEndTime <= voterSlotEnd) ||
          (currentTime <= voterSlotStart && slotEndTime >= voterSlotEnd)
        );
      });
      
      if (!isOverlapping) {
        return { date, startTime, endTime };
      }
      
      // Move to the next potential slot (increment by 5 minutes)
      currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
    }
    
    return null; // No available slot found
  };
  
  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Time Slot Allocation</h1>
            <p className="text-muted">
              Assign voting time slots to approved voters.
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
        
        {success && (
          <Alert variant="success" className="mb-4">
            <FaCheck className="me-2" /> {success}
          </Alert>
        )}
        
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">Election Period Settings</h5>
          </Card.Header>
          <Card.Body>
            <Form>
              <Row>
                <Col md={3}>
                  <Form.Group controlId="startDate" className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaCalendarAlt className="me-2" /> Start Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={electionPeriod.startDate}
                      onChange={handleElectionPeriodChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="startTime" className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaClock className="me-2" /> Start Time
                    </Form.Label>
                    <Form.Control
                      type="time"
                      name="startTime"
                      value={electionPeriod.startTime}
                      onChange={handleElectionPeriodChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="endDate" className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaCalendarAlt className="me-2" /> End Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={electionPeriod.endDate}
                      onChange={handleElectionPeriodChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="endTime" className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaClock className="me-2" /> End Time
                    </Form.Label>
                    <Form.Control
                      type="time"
                      name="endTime"
                      value={electionPeriod.endTime}
                      onChange={handleElectionPeriodChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="votingDurationMinutes" className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaClock className="me-2" /> Voting Duration (minutes per voter)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="votingDurationMinutes"
                      value={electionPeriod.votingDurationMinutes}
                      onChange={handleElectionPeriodChange}
                      min="5"
                      max="120"
                    />
                    <Form.Text className="text-muted">
                      Each voter will be allocated this amount of time to cast their vote.
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-end mb-3">
                  <Button 
                    variant="success" 
                    className="me-2"
                    onClick={generateRandomTimeSlots}
                    disabled={loading || unassignedVoters.length === 0}
                  >
                    <FaRandom className="me-2" /> Generate Random Time Slots
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
        
        <Tabs defaultActiveKey="unassigned" className="mb-4">
          <Tab eventKey="unassigned" title={`Unassigned Voters (${unassignedVoters.length})`}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Unassigned Voters</h5>
                  <Form.Control
                    type="search"
                    placeholder="Search voters..."
                    className="w-auto"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {loadingVoters ? (
                  <div className="text-center my-4">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading voters...</p>
                  </div>
                ) : filteredUnassignedVoters.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="mb-0">No unassigned voters found.</p>
                  </div>
                ) : (
                  <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Wallet Address</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnassignedVoters.map(voter => (
                        <tr key={voter.id}>
                          <td>{voter.name}</td>
                          <td>{voter.email}</td>
                          <td>{voter.walletAddress}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleManualAssign(voter)}
                              disabled={loading}
                            >
                              <FaClock className="me-1" /> Assign Time Slot
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
          <Tab eventKey="assigned" title={`Assigned Voters (${assignedVoters.length})`}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">Assigned Voters</h5>
              </Card.Header>
              <Card.Body className="p-0">
                {loadingVoters ? (
                  <div className="text-center my-4">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading voters...</p>
                  </div>
                ) : assignedVoters.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="mb-0">No assigned voters found.</p>
                  </div>
                ) : (
                  <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Date</th>
                        <th>Time Slot</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedVoters.map(voter => (
                        <tr key={voter.id}>
                          <td>{voter.name}</td>
                          <td>{voter.email}</td>
                          <td>
                            {voter.timeSlot && formatDate(voter.timeSlot.date)}
                          </td>
                          <td>
                            {voter.timeSlot && (
                              <span>
                                {formatTime(voter.timeSlot.startTime)} - {formatTime(voter.timeSlot.endTime)}
                              </span>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="me-2"
                              onClick={() => {
                                alert(`Email notification sent to ${voter.email}`);
                              }}
                            >
                              <FaEnvelope className="me-1" /> Resend Email
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleManualAssign(voter)}
                            >
                              <FaClock className="me-1" /> Reassign
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
        </Tabs>
        
        {/* Time Slot Assignment Modal */}
        <Modal
          show={showAssignModal}
          onHide={() => setShowAssignModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Assign Time Slot</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedVoter && (
              <>
                <div className="mb-3">
                  <strong>Voter:</strong> {selectedVoter.name}
                </div>
                <div className="mb-3">
                  <strong>Email:</strong> {selectedVoter.email}
                </div>
                <Form>
                  <Form.Group controlId="modalDate" className="mb-3">
                    <Form.Label>Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={selectedSlotDate}
                      onChange={(e) => setSelectedSlotDate(e.target.value)}
                      min={electionPeriod.startDate}
                      max={electionPeriod.endDate}
                    />
                  </Form.Group>
                  <Form.Group controlId="modalStartTime" className="mb-3">
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control
                      type="time"
                      value={selectedSlotTime}
                      onChange={(e) => setSelectedSlotTime(e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Duration</Form.Label>
                    <Form.Control
                      plaintext
                      readOnly
                      value={`${electionPeriod.votingDurationMinutes} minutes`}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time (Calculated)</Form.Label>
                    <Form.Control
                      plaintext
                      readOnly
                      value={formatTime(calculateEndTime(selectedSlotTime, electionPeriod.votingDurationMinutes))}
                    />
                  </Form.Group>
                </Form>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={assignTimeSlot}
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
                  Assigning...
                </>
              ) : (
                <>Assign Time Slot</>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default TimeSlotAllocation; 