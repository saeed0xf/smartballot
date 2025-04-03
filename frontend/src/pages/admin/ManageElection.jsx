import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Tab, Tabs, Alert, Badge, Modal, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrashAlt, FaEye, FaPlay, FaStop, FaCalendarAlt } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { formatImageUrl } from '../../utils/imageUtils';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Debug info
console.log('API URL being used:', API_URL);

const ManageElection = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [actionElection, setActionElection] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Election form state
  const [newElection, setNewElection] = useState({
    name: '',
    title: '',
    type: 'Lok Sabha Elections (General Elections)',
    description: '',
    startDate: '',
    endDate: '',
    isActive: false
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  // Get auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };
  
  // Fetch elections from the API
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth headers
        const headers = getAuthHeaders();
        console.log('Authorization headers:', headers);
        
        // Try with both /admin/elections and /elections patterns
        let response = null;
        let responseError = null;
        
        // Attempt with admin/elections first (preferred)
        try {
          const adminEndpoint = `${API_URL}/admin/elections`;
          console.log('Trying to fetch from admin endpoint:', adminEndpoint);
          response = await axios.get(adminEndpoint, { headers });
          console.log('Admin endpoint success:', response.data);
        } catch (adminError) {
          console.error('Admin endpoint failed:', adminError.message);
          responseError = adminError;
          
          // Try with direct /elections endpoint
          try {
            const directEndpoint = `${API_URL}/elections`;
            console.log('Trying to fetch from direct endpoint:', directEndpoint);
            response = await axios.get(directEndpoint, { headers });
            console.log('Direct endpoint success:', response.data);
          } catch (directError) {
            console.error('Direct endpoint failed:', directError.message);
            // Both attempts failed, use the admin error as the main error
            throw responseError;
          }
        }
        
        // Process response data
        if (!response || !response.data) {
          throw new Error('No data returned from API');
        }
        
        // Handle different response formats
        let formattedElections = [];
        if (Array.isArray(response.data)) {
          formattedElections = response.data;
        } else if (response.data.elections && Array.isArray(response.data.elections)) {
          formattedElections = response.data.elections;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          formattedElections = response.data.data;
        } else {
          console.warn('Unexpected response format:', response.data);
          // Try to use whatever we got if it has expected shape
          if (response.data && typeof response.data === 'object') {
            formattedElections = [response.data];
          } else {
            formattedElections = [];
          }
        }
        
        // Process elections to ensure they have both name and title fields
        formattedElections = formattedElections.map(election => {
          const defaultType = 'Lok Sabha Elections (General Elections)';
          
          // Log the election before processing to help with debugging
          console.log('Processing election data:', election);
          
          return {
            ...election,
            // Ensure name and title are consistent
            name: election.name || election.title || 'Untitled Election',
            title: election.title || election.name || 'Untitled Election',
            // Ensure type is never empty
            type: election.type || defaultType,
            // Ensure _id is set for proper identification
            _id: election._id || election.id,
            id: election.id || election._id
          };
        });
        
        console.log('Formatted elections:', formattedElections);
        setElections(formattedElections);
      } catch (err) {
        console.error('Error fetching elections:', err);
        
        // Provide helpful error message
        let errorMessage = 'Failed to fetch elections. Please try again.';
        
        if (err.response) {
          console.error('Response status:', err.response.status);
          console.error('Response data:', err.response.data);
          
          if (err.response.status === 404) {
            errorMessage = 'Election API endpoint not found. Please check server configuration.';
          } else if (err.response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (err.response.status === 500) {
            errorMessage = 'Server error. MongoDB connection might be failing.';
          }
        } else if (err.request) {
          // Request was made but no response received
          errorMessage = 'No response from server. Please check if the backend server is running.';
        } else {
          // Other errors
          errorMessage = `Error: ${err.message}`;
        }
        
        setError(errorMessage);
        
        // Fallback to empty array if fetch fails
        setElections([]);
        
        // Create a sample election in dev mode
        if (process.env.NODE_ENV !== 'production') {
          console.log('Development mode: Adding sample election data');
          setElections([
            {
              id: 1,
              _id: '1',
              name: 'Sample Lok Sabha Election 2024',
              type: 'General Elections',
              description: 'This is a sample election for development purposes',
              startDate: new Date('2024-05-01T09:00:00'),
              endDate: new Date('2024-05-03T18:00:00'),
              isActive: false
            }
          ]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated) {
      fetchElections();
    }
  }, [isAuthenticated]);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewElection(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!newElection.name && !newElection.title) errors.name = 'Election name is required';
    
    // Don't validate type if it's already set (especially when editing)
    if (!newElection.type && 
        newElection.type !== 'Lok Sabha Elections (General Elections)' && 
        newElection.type !== 'Vidhan Sabha Elections (State Assembly Elections)' && 
        newElection.type !== 'Local Body Elections (Municipal)' && 
        newElection.type !== 'Other') {
      errors.type = 'Election type is required';
    }
    
    if (!newElection.description) errors.description = 'Election description is required';
    if (!newElection.startDate) errors.startDate = 'Start date is required';
    if (!newElection.endDate) errors.endDate = 'End date is required';
    
    // Validate start date is not in the past
    const now = new Date();
    const startDate = new Date(newElection.startDate);
    const endDate = new Date(newElection.endDate);
    
    if (startDate < now && !isEditing) {
      errors.startDate = 'Start date cannot be in the past';
    }
    
    // Validate end date is after start date
    if (endDate <= startDate) {
      errors.endDate = 'End date must be after start date';
    }
    
    console.log('Form validation errors:', errors);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString || 'N/A';
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create form data for API - ensure both name and title are set explicitly
      const electionData = {
        ...newElection,
        // Ensure both name and title are set to the same value for consistency
        title: newElection.name || newElection.title || '',
        name: newElection.name || newElection.title || ''
      };
      
      // Log the data we're about to send
      console.log('Submitting election data:', electionData);
      
      // Get auth headers
      const headers = getAuthHeaders();
      
      let response;
      
      // Attempt to determine if MongoDB is connected - improve health check handling
      try {
        // Fix the health check URL - ensure it uses the correct API path
        const healthCheckUrl = `${API_URL}/health`;
        console.log('Checking MongoDB connection at:', healthCheckUrl);
        
        // Add a short timeout to prevent long waits
        const healthResponse = await axios.get(healthCheckUrl, { 
          timeout: 5000,
          headers: { ...headers }
        });
        
        console.log('Health check response:', healthResponse.data);
        
        // More explicit check for MongoDB connection status
        const isMongoConnected = healthResponse.data && 
                               (healthResponse.data.mongodb === 'connected' || 
                                healthResponse.data.status === 'OK');
        
        if (!isMongoConnected) {
          console.warn('MongoDB not connected according to health check');
          // Continue with operation but inform user of potential issues
          setError('Warning: MongoDB is not connected. Changes will be stored locally but not in the database.');
        } else {
          console.log('MongoDB connection confirmed via health check');
          // Clear any previous MongoDB connection warnings
          if (error && error.includes('MongoDB')) {
            setError(null);
          }
        }
      } catch (healthError) {
        console.error('Health check failed:', healthError);
        
        if (healthError.code === 'ECONNABORTED') {
          console.warn('Health check timed out - server may be overloaded');
          setError('Warning: Server response is slow. Will attempt to save data anyway.');
        } else if (healthError.response && healthError.response.status === 404) {
          console.warn('Health check endpoint not found - may be using older backend version');
          // No need to show error to user for this case, just continue
        } else {
          // Continue with the operation, but warn the user
          setError('Warning: Cannot verify MongoDB connection. Attempting to save data anyway.');
        }
      }
      
      // If editing, update existing election
      if (isEditing) {
        // Make sure we have the correct election ID
        const electionId = editingElection._id || editingElection.id;
        
        if (!electionId) {
          console.error('Missing election ID for editing');
          setError('Cannot update election: Missing ID');
          setIsSubmitting(false);
          return;
        }
        
        console.log(`Updating election with ID: ${electionId}`, electionData);
        
        // Additional validation before sending
        if (!electionData.name && !electionData.title) {
          setError('Election name or title is required');
          setIsSubmitting(false);
          return;
        }
        
        try {
          // First try the admin endpoint
          const endpoint = `${API_URL}/admin/election/${electionId}`;
          console.log(`Trying to update with endpoint: ${endpoint}`);
          
          try {
            response = await axios.put(endpoint, electionData, {
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              timeout: 15000 // Increase timeout to 15 seconds
            });
            
            console.log('Admin endpoint update success - response:', response.data);
            
            // Process the updated election response
            const updatedElection = {
              ...response.data,
              // Ensure name and title are consistent
              name: response.data.name || response.data.title || electionData.name,
              title: response.data.title || response.data.name || electionData.title,
              // Ensure type is preserved
              type: response.data.type || electionData.type,
              // Ensure IDs are preserved
              id: response.data._id || electionId,
              _id: response.data._id || electionId
            };
            
            console.log('Processed updated election:', updatedElection);
            
            // Update the election in the UI - be sure to match correctly
            setElections(prev => prev.map(e => 
              (e._id === electionId || e.id === electionId) ? updatedElection : e
            ));
            
            setSuccessMessage("Election successfully updated in the database!");
            
            // Reset form after success
            setTimeout(() => {
              resetForm();
              setSuccessMessage("");
              setActiveTab('list');
            }, 3000);
            
            return; // Exit early on success
          } catch (adminError) {
            console.error('Admin endpoint update failed:', adminError);
            
            // Try the direct endpoint
            const directEndpoint = `${API_URL}/election/${electionId}`;
            console.log(`Trying to update with direct endpoint: ${directEndpoint}`);
            
            try {
              response = await axios.put(directEndpoint, electionData, {
                headers: {
                  ...headers,
                  'Content-Type': 'application/json'
                },
                timeout: 15000 // Increase timeout to 15 seconds
              });
              
              console.log('Direct endpoint update success - response:', response.data);
              
              // Process the updated election response
              const updatedElection = {
                ...response.data,
                // Ensure name and title are consistent
                name: response.data.name || response.data.title || electionData.name,
                title: response.data.title || response.data.name || electionData.title,
                // Ensure type is preserved
                type: response.data.type || electionData.type,
                // Ensure IDs are preserved
                id: response.data._id || electionId,
                _id: response.data._id || electionId
              };
              
              console.log('Processed updated election:', updatedElection);
              
              // Update the election in the UI
              setElections(prev => prev.map(e => 
                (e._id === electionId || e.id === electionId) ? updatedElection : e
              ));
              
              setSuccessMessage("Election successfully updated in the database!");
              
              // Reset form after success
              setTimeout(() => {
                resetForm();
                setSuccessMessage("");
                setActiveTab('list');
              }, 3000);
              
              return; // Exit early on success
            } catch (directError) {
              console.error('All update endpoints failed:', directError);
              
              // Provide detailed error message based on the error
              let detailedError = 'Failed to update election in database.';
              
              if (directError.response) {
                // The request was made and the server responded with an error status
                console.error('Error response status:', directError.response.status);
                console.error('Error response data:', directError.response.data);
                
                if (directError.response.status === 400) {
                  detailedError = `Validation error: ${directError.response.data.message || 'Please check your form fields.'}`;
                  
                  // Check for specific MongoDB validation errors
                  if (directError.response.data.details && directError.response.data.details.length > 0) {
                    const fields = directError.response.data.details.map(d => d.field).join(', ');
                    detailedError = `Validation failed for fields: ${fields}`;
                  }
                } else if (directError.response.status === 401) {
                  detailedError = 'Your session has expired. Please log in again.';
                } else if (directError.response.status === 404) {
                  detailedError = 'Election not found in database. It may have been deleted.';
                } else if (directError.response.status === 500) {
                  detailedError = `Server error: ${directError.response.data.message || 'Internal database error'}`;
                }
              } else if (directError.request) {
                // The request was made but no response was received
                detailedError = 'No response from server. Please check your connection.';
              }
              
              // Show the detailed error but continue with local update
              setError(detailedError);
              
              // Still update locally even if API call fails
              const updatedElection = {
                ...electionData,
                id: electionId,
                _id: electionId,
                updatedAt: new Date().toISOString()
              };
              
              // Update UI with local changes
              setElections(prev => prev.map(e => 
                (e._id === electionId || e.id === electionId) ? updatedElection : e
              ));
              
              setSuccessMessage("Election updated locally only. Database update failed.");
              
              // Reset form after 3 seconds regardless
              setTimeout(() => {
                resetForm();
                setSuccessMessage("");
                setActiveTab('list');
              }, 3000);
            }
          }
        } catch (overallError) {
          console.error('Overall election update error:', overallError);
          setError(`Failed to update election: ${overallError.message}`);
          setIsSubmitting(false);
        }
      } else {
        // Otherwise, add a new election
        try {
          // First try the admin endpoint
          const endpoint = `${API_URL}/admin/election`;
          console.log(`Trying to create with endpoint: ${endpoint}`, electionData);
          
          // Additional validation before sending
          if (!electionData.name && !electionData.title) {
            throw new Error('Election name or title is required');
          }
          
          // Add more explicit error handling
          try {
            response = await axios.post(endpoint, electionData, {
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              timeout: 8000 // 8 second timeout
            });
            
            console.log('Admin endpoint success - API response:', response.data);
            
            // Process the response to ensure consistent data format
            const savedElection = {
              ...response.data,
              // Ensure name and title are consistent
              name: response.data.name || response.data.title,
              title: response.data.title || response.data.name,
              // Ensure IDs are consistent
              id: response.data._id || response.data.id,
              _id: response.data._id || response.data.id
            };
            
            // Add the new election to the UI
            setElections(prev => [...prev, savedElection]);
            setSuccessMessage("Election successfully added to the database!");
            
            // Reset form after success
            setTimeout(() => {
              resetForm();
              setSuccessMessage("");
              setActiveTab('list');
            }, 3000);
            
            return; // Exit early on success
          } catch (adminError) {
            console.error('Admin endpoint creation failed:', adminError);
            
            // Try the direct endpoint as fallback
            const directEndpoint = `${API_URL}/election`;
            console.log(`Trying fallback with direct endpoint: ${directEndpoint}`);
            
            try {
              response = await axios.post(directEndpoint, electionData, {
                headers: {
                  ...headers,
                  'Content-Type': 'application/json'
                },
                timeout: 8000 // 8 second timeout
              });
              
              console.log('Direct endpoint success - API response:', response.data);
              
              // Process the response to ensure consistent data format
              const savedElection = {
                ...response.data,
                // Ensure name and title are consistent
                name: response.data.name || response.data.title,
                title: response.data.title || response.data.name,
                // Ensure IDs are consistent
                id: response.data._id || response.data.id,
                _id: response.data._id || response.data.id
              };
              
              // Add the new election to the UI
              setElections(prev => [...prev, savedElection]);
              setSuccessMessage("Election successfully added to the database!");
              
              // Reset form after success
              setTimeout(() => {
                resetForm();
                setSuccessMessage("");
                setActiveTab('list');
              }, 3000);
              
              return; // Exit early on success
            } catch (directError) {
              console.error('All endpoints failed:', directError);
              
              // Provide detailed error message based on the error
              let detailedError = 'Failed to save election to database.';
              
              if (directError.response) {
                // The request was made and the server responded with an error status
                console.error('Error response status:', directError.response.status);
                console.error('Error response data:', directError.response.data);
                
                if (directError.response.status === 400) {
                  detailedError = `Validation error: ${directError.response.data.message || 'Please check your form fields.'}`;
                  
                  // Check for specific MongoDB validation errors
                  if (directError.response.data.details && directError.response.data.details.length > 0) {
                    const fields = directError.response.data.details.map(d => d.field).join(', ');
                    detailedError = `Validation failed for fields: ${fields}`;
                  }
                } else if (directError.response.status === 401) {
                  detailedError = 'Your session has expired. Please log in again.';
                } else if (directError.response.status === 500) {
                  detailedError = `Server error: ${directError.response.data.message || 'Internal database error'}`;
                }
              } else if (directError.request) {
                // The request was made but no response was received
                detailedError = 'No response from server. Please check your connection.';
              }
              
              // Show the detailed error
              setError(detailedError);
              
              // Still add locally if it's a database issue but we have a UI
              const newId = `local_${Date.now()}`;
              const electionToAdd = {
                ...electionData,
                id: newId,
                _id: newId,
                isActive: false,
                createdAt: new Date().toISOString()
              };
              
              setElections(prev => [...prev, electionToAdd]);
              setSuccessMessage("Election added locally only. Database save failed.");
            }
          }
        } catch (overallError) {
          console.error('Overall election creation error:', overallError);
          setError(`Failed to create election: ${overallError.message}`);
        }
      }
      
    } catch (error) {
      console.error('Error adding/updating election:', error);
      setError('Failed to add/update election. Please check MongoDB connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle election start
  const handleStartElection = async () => {
    if (!actionElection) return;
    
    setProcessingAction(true);
    setError(null);
    
    try {
      const electionId = actionElection._id || actionElection.id;
      console.log(`Starting election with ID: ${electionId}`);
      
      // Check MongoDB health first
      let isMongoDBConnected = false;
      try {
        const healthCheck = await axios.get(`${API_URL}/health`);
        isMongoDBConnected = healthCheck.data && healthCheck.data.mongodb && healthCheck.data.mongodb.connected;
        console.log('MongoDB connection status:', isMongoDBConnected);
      } catch (healthError) {
        console.error('MongoDB health check failed:', healthError);
        // Continue even if health check fails
      }

      const headers = getAuthHeaders();
      
      // First check if we have candidates with matching election type
      let candidatesMatched = false;
      try {
        const candidatesResponse = await axios.get(`${API_URL}/admin/candidates`, { headers });
        const candidates = candidatesResponse.data || [];
        const matchingCandidates = candidates.filter(candidate => 
          candidate.electionType === actionElection.type ||
          // For backward compatibility with old values
          ['Presidential', 'Parliamentary', 'Regional', 'Local'].includes(candidate.electionType)
        );
        
        candidatesMatched = matchingCandidates.length > 0;
        console.log(`Found ${matchingCandidates.length} matching candidates for election type: ${actionElection.type}`);
        
        if (!candidatesMatched) {
          setError(`No candidates found for election type: ${actionElection.type}. Please add candidates before starting the election.`);
          setProcessingAction(false);
          return;
        }
      } catch (candidatesError) {
        console.error('Error checking candidates:', candidatesError);
        // Continue even if candidate check fails
      }
      
      // Try different endpoint patterns
      const endpoints = [
        `${API_URL}/admin/election/start`,
        `${API_URL}/admin/elections/start`,
        `${API_URL}/election/start`,
        `${API_URL}/elections/start`
      ];
      
      let successResponse = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to start election with endpoint: ${endpoint}`);
          const response = await axios.post(endpoint, { electionId }, {
            headers: headers
          });
          
          console.log('Election start response:', response.data);
          successResponse = response;
          break;
        } catch (err) {
          console.error(`Failed with endpoint ${endpoint}:`, err.message);
          lastError = err;
          // Continue to next endpoint
        }
      }
      
      // Update the election status in the UI regardless of API result
      setElections(prev => prev.map(e => 
        (e._id === electionId || e.id === electionId) 
          ? { ...e, isActive: true }
          : e
      ));
      
      if (successResponse) {
        // Update related candidates to show they are in an active election
        try {
          const candidateUpdateResponse = await axios.post(
            `${API_URL}/admin/candidates/update-status`, 
            { 
              electionId,
              electionType: actionElection.type,
              status: 'inActiveElection',
              value: true
            },
            { headers }
          );
          console.log('Candidate status update response:', candidateUpdateResponse.data);
        } catch (updateError) {
          console.error('Failed to update candidate status:', updateError);
          // Continue even if candidate update fails
        }
        
        setSuccessMessage("Election started successfully and recorded on blockchain!");
      } else {
        // If we have candidates but API call failed, it's likely a MongoDB connection issue
        if (candidatesMatched) {
          setSuccessMessage(isMongoDBConnected 
            ? "Election started locally but blockchain connection failed" 
            : "Election started locally (MongoDB/blockchain connection failed)"
          );
        } else if (lastError && lastError.response && lastError.response.status === 400) {
          // 400 status suggests a validation error or similar issue
          const errorMessage = lastError.response.data?.message || 
                              lastError.response.data?.details || 
                              "Cannot start election due to validation errors";
          setError(errorMessage);
        } else {
          setError("Failed to start election. Please check MongoDB connection and try again.");
        }
      }
      
      setShowStartModal(false);
      setActionElection(null);
    } catch (error) {
      console.error('Error starting election:', error);
      setError('Failed to start election. Please check your connection and try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Handle election stop
  const handleStopElection = async () => {
    if (!actionElection) return;
    
    setProcessingAction(true);
    
    try {
      const headers = getAuthHeaders();
      const electionId = actionElection._id || actionElection.id;
      
      // Try different endpoint patterns
      const endpoints = [
        `${API_URL}/admin/election/end`,
        `${API_URL}/admin/elections/end`,
        `${API_URL}/election/end`,
        `${API_URL}/elections/end`,
        `${API_URL}/admin/election/stop`,
        `${API_URL}/admin/elections/stop`,
        `${API_URL}/election/stop`,
        `${API_URL}/elections/stop`
      ];
      
      let successResponse = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to stop election with endpoint: ${endpoint}`);
          const response = await axios.post(endpoint, { electionId }, {
            headers: headers
          });
          
          console.log('Election stop response:', response.data);
          successResponse = response;
          break;
        } catch (err) {
          console.error(`Failed with endpoint ${endpoint}:`, err.message);
          // Continue to next endpoint
        }
      }
      
      // Update the election status in the UI regardless of API result
      setElections(prev => prev.map(e => 
        (e._id === electionId || e.id === electionId) 
          ? { ...e, isActive: false }
          : e
      ));
      
      if (successResponse) {
        setSuccessMessage("Election stopped successfully and finalized on blockchain!");
      } else {
        setSuccessMessage("Election stopped locally (MongoDB/blockchain connection failed)");
      }
      
      setShowStopModal(false);
      setActionElection(null);
    } catch (error) {
      console.error('Error stopping election:', error);
      setError('Failed to stop election. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Handle delete election
  const handleDeleteClick = (election) => {
    setDeletingId({
      id: election.id,
      _id: election._id || election.id
    });
    setShowDeleteModal(true);
  };
  
  // Delete election confirm
  const handleDeleteConfirm = async () => {
    if (!deletingId || (!deletingId.id && !deletingId._id)) {
      console.error('No election ID to delete');
      setShowDeleteModal(false);
      return;
    }

    try {
      setLoading(true);
      
      const headers = getAuthHeaders();
      const electionId = deletingId._id;
      
      console.log(`Deleting election with ID: ${electionId}`);
      
      // Try different endpoint patterns
      const endpoints = [
        `${API_URL}/admin/election/${electionId}`,
        `${API_URL}/admin/elections/${electionId}`,
        `${API_URL}/election/${electionId}`,
        `${API_URL}/elections/${electionId}`
      ];
      
      let deleted = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to delete with endpoint: ${endpoint}`);
          await axios.delete(endpoint, { headers });
          console.log('Successfully deleted election from database');
          deleted = true;
          break;
        } catch (err) {
          console.error(`Failed with endpoint ${endpoint}:`, err.message);
          // Continue to next endpoint
        }
      }
      
      // Remove only the deleted election from the list by matching both id and _id
      setElections(prevElections => {
        // Log the current state to debug
        console.log('Current elections:', prevElections);
        console.log('Deleting ID:', deletingId);
        
        return prevElections.filter(election => {
          const keepElection = !(
            (deletingId.id && election.id === deletingId.id) || 
            (deletingId._id && election._id === deletingId._id)
          );
          console.log(`Election ${election._id || election.id}: keeping = ${keepElection}`);
          return keepElection;
        });
      });
      
      if (!deleted) {
        setError("Election deleted locally (MongoDB connection failed)");
      } else {
        setSuccessMessage("Election successfully deleted");
      }
      
      setShowDeleteModal(false);
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting election:', error);
      setError('Failed to delete election. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle edit election
  const handleEditClick = (election) => {
    // Reset any form errors
    setFormErrors({});
    setError(null);
    
    console.log('Editing election:', election);
    
    // Format the date-time for the form inputs
    const formatDateForInput = (dateString) => {
      try {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', dateString);
          return '';
        }
        
        return date.toISOString().slice(0, 16); // Format as "YYYY-MM-DDThh:mm"
      } catch (error) {
        console.error('Error formatting date for input:', error);
        return '';
      }
    };
    
    // Define the available election types
    const validElectionTypes = [
      'Lok Sabha Elections (General Elections)',
      'Vidhan Sabha Elections (State Assembly Elections)',
      'Local Body Elections (Municipal)',
      'Other'
    ];
    
    // Log the election type we received
    console.log('Current election type:', election.type);
    
    // Check if the current election type is in our valid types list
    const hasValidType = election.type && validElectionTypes.includes(election.type);
    
    // If not valid, log a warning
    if (!hasValidType) {
      console.warn('Election has invalid type:', election.type);
      console.warn('Valid types are:', validElectionTypes);
    }
    
    // Prepare the election data for editing, combining title and name fields
    const electionForEdit = {
      ...election,
      name: election.name || election.title || '',
      title: election.title || election.name || '',
      // Use the current type if valid, otherwise default to the first option
      type: hasValidType ? election.type : 'Lok Sabha Elections (General Elections)',
      description: election.description || '',
      startDate: formatDateForInput(election.startDate),
      endDate: formatDateForInput(election.endDate),
      _id: election._id || election.id, // Ensure _id is always set
      id: election.id || election._id   // Ensure id is always set
    };
    
    console.log('Prepared election for edit:', electionForEdit);
    
    setEditingElection(electionForEdit);
    setNewElection(electionForEdit);
    setIsEditing(true);
    setActiveTab('add');
  };
  
  // Reset form
  const resetForm = () => {
    console.log('Resetting form');
    setNewElection({
      name: '',
      title: '',
      type: 'Lok Sabha Elections (General Elections)', // Updated default value
      description: '',
      startDate: '',
      endDate: '',
      isActive: false
    });
    setIsEditing(false);
    setEditingElection(null);
    setFormErrors({});
    // Also clear any errors or success messages
    setError(null);
  };
  
  // Handle start button click
  const handleStartClick = (election) => {
    setActionElection(election);
    setShowStartModal(true);
  };
  
  // Handle stop button click
  const handleStopClick = (election) => {
    setActionElection(election);
    setShowStopModal(true);
  };
  
  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Manage Elections</h1>
            <p className="text-muted">
              Create, update, and manage elections.
            </p>
          </div>
        </div>
        
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        )}
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab eventKey="list" title="All Elections">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Election List</h5>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      resetForm();
                      setActiveTab('add');
                    }}
                    className="d-flex align-items-center"
                  >
                    <FaPlus className="me-2" /> Add New Election
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading elections...</p>
                  </div>
                ) : elections.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="mb-0">No elections found.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        resetForm();
                        setActiveTab('add');
                      }}
                    >
                      <FaPlus className="me-2" /> Create Election
                    </Button>
                  </div>
                ) : (
                  <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Election Name</th>
                        <th>Type</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elections.map((election) => (
                        <tr key={election.id || election._id}>
                          <td>{election.title || election.name}</td>
                          <td className="text-nowrap">
                            {election.type || 'Lok Sabha Elections (General Elections)'}
                          </td>
                          <td>{formatDate(election.startDate)}</td>
                          <td>{formatDate(election.endDate)}</td>
                          <td>
                            {election.isActive ? (
                              <Badge bg="success">Active</Badge>
                            ) : (
                              <Badge bg="secondary">Inactive</Badge>
                            )}
                          </td>
                          <td>
                            <div className="d-flex">
                              <Button
                                variant="warning"
                                size="sm"
                                className="me-2"
                                title="Edit Election"
                                onClick={() => handleEditClick(election)}
                              >
                                <FaEdit />
                              </Button>
                              
                              {!election.isActive ? (
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="me-2"
                                  title="Start Election"
                                  onClick={() => handleStartClick(election)}
                                >
                                  <FaPlay />
                                </Button>
                              ) : (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="me-2"
                                  title="Stop Election"
                                  onClick={() => handleStopClick(election)}
                                >
                                  <FaStop />
                                </Button>
                              )}
                              
                              <Button
                                variant="danger"
                                size="sm"
                                title="Delete Election"
                                onClick={() => handleDeleteClick(election)}
                                disabled={election.isActive}
                              >
                                <FaTrashAlt />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
          
          <Tab eventKey="add" title={isEditing ? "Edit Election" : "Add Election"}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">{isEditing ? 'Edit Election' : 'Add New Election'}</h5>
              </Card.Header>
              <Card.Body>
                {isEditing && (
                  <Alert variant="info" className="mb-4">
                    <div className="d-flex align-items-center">
                      <FaEdit className="me-2" /> 
                      <div>
                        <strong>Edit Mode:</strong> You are editing the "{editingElection?.name}" election. 
                        Make your changes and click 'Update Election' to save them.
                      </div>
                    </div>
                  </Alert>
                )}
                
                <Form onSubmit={handleSubmit}>
                  <h5 className="mb-3">Election Details</h5>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Election Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={newElection.name}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.name}
                          placeholder="e.g., Lok Sabha Elections 2025"
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Election Type <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                          name="type"
                          value={newElection.type || 'Lok Sabha Elections (General Elections)'}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.type}
                        >
                          <option value="Lok Sabha Elections (General Elections)">Lok Sabha Elections (General Elections)</option>
                          <option value="Vidhan Sabha Elections (State Assembly Elections)">Vidhan Sabha Elections (State Assembly Elections)</option>
                          <option value="Local Body Elections (Municipal)">Local Body Elections (Municipal)</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {formErrors.type}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Description <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="description"
                          value={newElection.description}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.description}
                          placeholder="Provide a brief description of the election"
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.description}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <h5 className="mb-3 mt-4">Date & Time Settings</h5>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Start Date & Time <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="startDate"
                          value={newElection.startDate}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.startDate}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.startDate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>End Date & Time <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="endDate"
                          value={newElection.endDate}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.endDate}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.endDate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <div className="d-flex justify-content-end mt-4">
                    <Button 
                      variant="secondary" 
                      className="me-2"
                      onClick={() => {
                        resetForm();
                        setActiveTab('list');
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
                        isEditing ? 'Update Election' : 'Create Election'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Container>
      
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
          Are you sure you want to delete this election? This action cannot be undone.
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
              'Delete Election'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Start Election Modal */}
      <Modal
        show={showStartModal}
        onHide={() => setShowStartModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Start Election</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to start this election? This will make it active for voters.
          <Alert variant="info" className="mt-3">
            <strong>Note:</strong> Starting an election will:
            <ul className="mb-0">
              <li>Make it visible to voters</li>
              <li>Allow voters to cast votes</li>
              <li>Record all votes on the blockchain</li>
            </ul>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStartModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleStartElection}
            disabled={processingAction}
          >
            {processingAction ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Starting...
              </>
            ) : (
              'Start Election'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Stop Election Modal */}
      <Modal
        show={showStopModal}
        onHide={() => setShowStopModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Stop Election</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to stop this election? This will end voting for all voters.
          <Alert variant="warning" className="mt-3">
            <strong>Warning:</strong> Stopping an election will:
            <ul className="mb-0">
              <li>Prevent further votes from being cast</li>
              <li>Finalize results on the blockchain</li>
              <li>This action cannot be easily reversed</li>
            </ul>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStopModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleStopElection}
            disabled={processingAction}
          >
            {processingAction ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Stopping...
              </>
            ) : (
              'Stop Election'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default ManageElection; 