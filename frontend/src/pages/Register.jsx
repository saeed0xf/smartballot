import React, { useContext, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { FaUserPlus } from 'react-icons/fa';

const Register = () => {
  const { isAuthenticated, isAdmin, isVoter, isOfficer } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin');
      } else if (isVoter) {
        navigate('/voter');
      } else if (isOfficer) {
        navigate('/officer');
      }
    }
  }, [isAuthenticated, isAdmin, isVoter, isOfficer, navigate]);

  const handleRegisterClick = () => {
    // Navigate directly to the voter registration page
    navigate('/voter/register');
  };

  return (
    <Layout>
      <Container>
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header className="bg-primary text-white text-center py-3">
                <h3>Voter Registration</h3>
              </Card.Header>
              <Card.Body className="p-4 text-center">
                <div className="mb-4">
                  <FaUserPlus size={80} color="#3f51b5" />
                </div>
                <h4 className="mb-3">Welcome to VoteSure</h4>
                <p className="mb-4">
                  To participate in the election, you need to register as a voter. 
                  Click the button below to start the registration process.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRegisterClick}
                  className="px-4 py-2"
                >
                  Register as Voter
                </Button>
                <p className="mt-4 text-muted">
                  Note: Only voters need to register. Admin and Election Commission Officers 
                  can directly login with their MetaMask wallets.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default Register; 