import React, { useState, useEffect } from 'react';
import { Container, Card, Alert, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout';

const VerifyVote = () => {
  const [vote, setVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVote = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/election/verify');
        setVote(response.data.vote);
      } catch (err) {
        console.error('Error verifying vote:', err);
        setError(err.response?.data?.message || 'Failed to verify vote. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchVote();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Verifying your vote...</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Verify Your Vote</h1>
        
        {error && (
          <Alert variant="danger">
            {error}
            {error === 'No vote found for this election' && (
              <div className="mt-3">
                <Button as={Link} to="/voter/vote" variant="primary">
                  Cast Your Vote
                </Button>
              </div>
            )}
          </Alert>
        )}
        
        {vote && (
          <Card className="shadow-sm">
            <Card.Header className="bg-success text-white">
              <h4 className="mb-0">Vote Successfully Verified</h4>
            </Card.Header>
            <Card.Body>
              <Alert variant="success">
                <p className="mb-0">Your vote has been successfully recorded on the blockchain and is verified.</p>
              </Alert>
              
              <h5 className="mt-4 mb-3">Vote Details</h5>
              <Row>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header className="bg-light">
                      <h5 className="mb-0">Candidate Information</h5>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Name:</strong> {vote.candidate.name}</p>
                      <p><strong>Party:</strong> {vote.candidate.party}</p>
                      {vote.candidate.slogan && (
                        <p><strong>Slogan:</strong> "{vote.candidate.slogan}"</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Header className="bg-light">
                      <h5 className="mb-0">Blockchain Information</h5>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Transaction Hash:</strong></p>
                      <p className="text-break small">{vote.blockchainTxHash}</p>
                      <p><strong>Timestamp:</strong> {new Date(vote.timestamp).toLocaleString()}</p>
                      {vote.blockchainStatus && (
                        <p><strong>Blockchain Status:</strong> {vote.blockchainStatus.hasVoted ? 'Verified' : 'Pending'}</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
        
        {!vote && !error && (
          <Alert variant="warning">
            <Alert.Heading>No Vote Found</Alert.Heading>
            <p>You have not cast a vote in the current election yet.</p>
            <div className="d-flex justify-content-end">
              <Button as={Link} to="/voter/vote" variant="primary">
                Cast Your Vote
              </Button>
            </div>
          </Alert>
        )}
      </Container>
    </Layout>
  );
};

export default VerifyVote; 