import React, { useContext, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { FaUserPlus } from 'react-icons/fa';
import env from '../utils/env';

const Register = () => {
  const { isAuthenticated, isAdmin, isVoter, isOfficer } = useContext(AuthContext);
  const navigate = useNavigate();
  const [walletType, setWalletType] = useState(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);

  // Check if the current wallet is admin or officer
  useEffect(() => {
    const checkWalletType = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const currentAddress = accounts[0].toLowerCase();
            const adminAddress = (env.ADMIN_ADDRESS || '').toLowerCase();
            
            // Get officer addresses
            const officerAddresses = env.OFFICER_ADDRESSES ? 
              env.OFFICER_ADDRESSES.split(',').map(addr => addr.toLowerCase()) : 
              [];
            
            if (currentAddress === adminAddress) {
              setWalletType('admin');
            } else if (officerAddresses.includes(currentAddress)) {
              setWalletType('officer');
            } else {
              setWalletType('voter');
            }
          }
        }
      } catch (err) {
        console.error('Error checking wallet type:', err);
      } finally {
        setIsCheckingWallet(false);
      }
    };
    
    checkWalletType();
  }, []);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin');
      } else if (isVoter()) {
        navigate('/voter');
      } else if (isOfficer()) {
        navigate('/officer');
      }
      return;
    }

    // Redirect admin and officer wallets to login page
    if (!isCheckingWallet && (walletType === 'admin' || walletType === 'officer')) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, isAdmin, isVoter, isOfficer, navigate, walletType, isCheckingWallet]);

  const handleRegisterClick = () => {
    // Navigate directly to the voter registration page
    navigate('/voter/register');
  };

  // Show loading while checking wallet type
  if (isCheckingWallet) {
    return (
      <Layout>
        <Container>
          <Row className="justify-content-center">
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body className="p-4 text-center">
                  <div className="mb-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <p>Checking wallet permissions...</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </Layout>
    );
  }

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
                <h4 className="mb-3">Welcome to SmartBallot</h4>
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