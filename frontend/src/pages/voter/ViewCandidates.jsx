import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import Layout from '../../components/Layout';
import { formatImageUrl } from '../../utils/imageUtils';

const ViewCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/election/candidates');
        
        // Format candidate data to ensure image URLs are correct
        const formattedCandidates = response.data.candidates.map(candidate => ({
          ...candidate,
          image: formatImageUrl(candidate.image || candidate.photoUrl)
        }));
        
        setCandidates(formattedCandidates);
      } catch (err) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading candidates...</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">Election Candidates</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {candidates.length === 0 ? (
          <Alert variant="info">
            No candidates have been added to the election yet.
          </Alert>
        ) : (
          <Row>
            {candidates.map(candidate => (
              <Col key={candidate.id} md={4} className="mb-4">
                <Card className="h-100 shadow-sm candidate-card">
                  {candidate.image ? (
                    <Card.Img 
                      variant="top" 
                      src={candidate.image}
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
                    <Badge bg="primary" className="mb-2">{candidate.party}</Badge>
                    {candidate.slogan && (
                      <Card.Text className="fst-italic">"{candidate.slogan}"</Card.Text>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </Layout>
  );
};

export default ViewCandidates; 