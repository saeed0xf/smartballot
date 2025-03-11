import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';

const CastVote = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [electionStatus, setElectionStatus] = useState(null);
  const [voterProfile, setVoterProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch election status
        const electionResponse = await axios.get('/api/election/status');
        setElectionStatus(electionResponse.data);
        
        // Fetch voter profile
        const profileResponse = await axios.get('/api/voter/profile');
        setVoterProfile(profileResponse.data.voter);
        
        // Fetch candidates
        const candidatesResponse = await axios.get('/api/election/candidates');
        setCandidates(candidatesResponse.data.candidates);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load voting data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleVoteClick = () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate first');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    if (!privateKey) {
      toast.error('Please enter your private key');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await axios.post('/api/election/vote', {
        candidateId: selectedCandidate.id,
        privateKey
      });
      
      toast.success('Your vote has been cast successfully!');
      setShowConfirmModal(false);
      navigate('/voter/verify');
    } catch (err) {
      console.error('Error casting vote:', err);
      toast.error(err.response?.data?.message || 'Failed to cast vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading voting page...</p>
        </Container>
      </Layout>
    );
  }

  // Check if election is active
  if (!electionStatus?.active) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="warning">
            <Alert.Heading>No Active Election</Alert.Heading>
            <p>There is no active election at the moment. Please check back later.</p>
          </Alert>
        </Container>
      </Layout>
    );
  }

  // Check if voter has already voted
  if (voterProfile?.blockchainStatus?.hasVoted) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="info">
            <Alert.Heading>You Have Already Voted</Alert.Heading>
            <p>You have already cast your vote in this election.</p>
            <hr />
            <div className="d-flex justify-content-end">
              <Button 
                variant="outline-info" 
                onClick={() => navigate('/voter/verify')}
              >
                Verify Your Vote
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Cast Your Vote</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Alert variant="info" className="mb-4">
          <Alert.Heading>Important Information</Alert.Heading>
          <p>
            Your vote will be recorded on the blockchain and cannot be changed once submitted.
            Please review your selection carefully before confirming.
          </p>
        </Alert>
        
        {candidates.length === 0 ? (
          <Alert variant="warning">
            No candidates have been added to the election yet.
          </Alert>
        ) : (
          <>
            <h4 className="mb-3">Select a Candidate</h4>
            <Row>
              {candidates.map(candidate => (
                <Col key={candidate.id} md={4} className="mb-4">
                  <Card 
                    className={`h-100 shadow-sm candidate-card ${selectedCandidate?.id === candidate.id ? 'border-primary' : ''}`}
                    onClick={() => handleSelectCandidate(candidate)}
                    style={{ cursor: 'pointer' }}
                  >
                    {candidate.image ? (
                      <Card.Img 
                        variant="top" 
                        src={candidate.image.startsWith('http') 
                          ? candidate.image 
                          : `http://localhost:5000${candidate.image}`
                        } 
                        alt={candidate.name}
                        className="candidate-image"
                      />
                    ) : (
                      <div 
                        className="bg-light d-flex align-items-center justify-content-center candidate-image"
                      >
                        <span className="text-muted">No image available</span>
                      </div>
                    )}
                    <Card.Body>
                      <Card.Title>{candidate.name}</Card.Title>
                      <Card.Subtitle className="mb-2 text-muted">{candidate.party}</Card.Subtitle>
                      {candidate.slogan && (
                        <Card.Text className="fst-italic">"{candidate.slogan}"</Card.Text>
                      )}
                      {selectedCandidate?.id === candidate.id && (
                        <div className="text-center mt-2">
                          <span className="badge bg-primary">Selected</span>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            
            <div className="d-grid gap-2 col-md-6 mx-auto mt-4">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleVoteClick}
                disabled={!selectedCandidate}
              >
                Cast My Vote
              </Button>
            </div>
          </>
        )}
        
        {/* Confirmation Modal */}
        <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Your Vote</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedCandidate && (
              <>
                <p>You are about to cast your vote for:</p>
                <h4>{selectedCandidate.name}</h4>
                <p className="text-muted">{selectedCandidate.party}</p>
                
                <Alert variant="warning" className="mt-3">
                  <strong>Important:</strong> This action cannot be undone. Your vote will be permanently recorded on the blockchain.
                </Alert>
                
                <Form.Group className="mb-3 mt-4">
                  <Form.Label>Enter your private key to confirm</Form.Label>
                  <Form.Control
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Your wallet private key"
                    required
                  />
                  <Form.Text className="text-muted">
                    Your private key is required to sign the transaction on the blockchain.
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmVote}
              disabled={submitting || !privateKey}
            >
              {submitting ? 'Processing...' : 'Confirm Vote'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default CastVote; 