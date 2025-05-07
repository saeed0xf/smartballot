import React, { useState, useContext, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { FaEthereum } from 'react-icons/fa';
import jwt_decode from 'jwt-decode';
import axios from 'axios';

const Login = () => {
  const { login, isMetaMaskInstalled, isAuthenticated, isAdmin, isVoter, isOfficer, checkWalletType } = useContext(AuthContext);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [canLogin, setCanLogin] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [voterStatus, setVoterStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check window.ethereum on component mount
    const checkMetaMask = () => {
      const info = {
        isMetaMaskInstalled: !!window.ethereum,
        hasEthereum: typeof window.ethereum !== 'undefined',
        provider: window.ethereum ? 'Available' : 'Not Available',
        isMetaMaskObject: window.ethereum?.isMetaMask || false
      };
      
      setDebugInfo(JSON.stringify(info, null, 2));
      console.log('MetaMask Debug Info:', info);
    };
    
    checkMetaMask();
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
    }
  }, [isAuthenticated, isAdmin, isVoter, isOfficer, navigate]);

  useEffect(() => {
    // Check for existing token on component mount
    const checkExistingToken = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify the token is still valid
          const decoded = jwt_decode(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp > currentTime) {
            console.log('Valid token found on login page, redirecting...');
            
            // Redirect based on role
            if (decoded.role === 'admin') {
              console.log('Redirecting to admin dashboard...');
              window.location.href = '/admin';
            } else if (decoded.role === 'officer') {
              console.log('Redirecting to officer dashboard...');
              window.location.href = '/officer';
            } else {
              console.log('Redirecting to voter dashboard...');
              window.location.href = '/voter';
            }
          }
        } catch (err) {
          console.error('Error checking token on login page:', err);
          localStorage.removeItem('token');
        }
      }
    };
    
    checkExistingToken();
  }, []);

  // Check if wallet address is registered and approved
  const checkWalletStatus = async (address) => {
    if (!address) return;
    
    try {
      setError(null);
      setCheckingStatus(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      console.log('Checking wallet status for:', address);
      const response = await axios.get(`${apiUrl}/auth/wallet-status?address=${address}`);
      console.log('Wallet status response:', response.data);
      
      // Admin and officer can always login
      if (response.data.role === 'admin' || response.data.role === 'officer') {
        setCanLogin(true);
        setVoterStatus(null);
      } 
      // Voters need to have a profile and be approved
      else if (response.data.role === 'voter') {
        setCanLogin(response.data.canLogin);
        setVoterStatus(response.data.voterStatus);
      } else {
        // New wallet, no user record exists
        setCanLogin(false);
        setVoterStatus(null);
      }
    } catch (err) {
      console.error('Error checking wallet status:', err);
      // If there's a 404 error, it means the wallet is not registered
      if (err.response && err.response.status === 404) {
        setCanLogin(false);
        setVoterStatus(null);
      } else {
        setError('Failed to check wallet status. Please try again.');
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  // Connect wallet and check status
  const connectAndCheckWallet = async () => {
    try {
      setLoading(true);
      
      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed or not accessible');
      }
      
      console.log('MetaMask detected, requesting accounts...');
      
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Accounts received:', accounts);
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        await checkWalletStatus(address);
      } else {
        throw new Error('No accounts found. Please unlock MetaMask and try again.');
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Login attempt started');
      
      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed or not accessible');
      }
      
      console.log('MetaMask detected, requesting accounts...');
      
      // Try to request accounts directly first to check if MetaMask is responding
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('Accounts received:', accounts);
      } catch (err) {
        console.error('Error requesting accounts directly:', err);
        throw new Error(`MetaMask account request failed: ${err.message}`);
      }
      
      // Login with MetaMask
      console.log('Proceeding with login...');
      try {
        await login();
        console.log('Login successful');
        
        // The login function should handle redirection, but let's add a fallback
        setTimeout(() => {
          // Check if we're still on the login page after 2 seconds
          if (window.location.pathname === '/login') {
            console.log('Still on login page after successful login, attempting manual redirect');
            
            // Try to determine the user type and redirect
            const token = localStorage.getItem('token');
            if (token) {
              try {
                const decoded = jwt_decode(token);
                if (decoded.role === 'admin') {
                  window.location.href = '/admin';
                } else if (decoded.role === 'officer') {
                  window.location.href = '/officer';
                } else {
                  window.location.href = '/voter';
                }
              } catch (err) {
                console.error('Error decoding token for redirect:', err);
              }
            }
          }
        }, 2000);
      } catch (err) {
        console.error('Login function error:', err);
        throw err;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render different UI based on wallet connection and registration status
  const renderWalletContent = () => {
    if (!walletAddress) {
      return (
        <div>
          <div className="mb-4">
            <FaEthereum size={80} color="#3f51b5" />
          </div>
          <p className="mb-4">
            Connect your MetaMask wallet to continue.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={connectAndCheckWallet}
            disabled={loading || checkingStatus}
            className="px-4 py-2"
          >
            {loading || checkingStatus ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </div>
      );
    }
    
    if (checkingStatus) {
      return (
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Checking wallet status...</p>
        </div>
      );
    }

    if (!canLogin) {
      // Voter not registered or not approved
      return (
        <div>
          <Alert variant="info" className="mb-4">
            <strong>Wallet Connected:</strong> {walletAddress}
          </Alert>
          
          {voterStatus === 'pending' ? (
            <Alert variant="warning">
              <h5>Registration Pending Approval</h5>
              <p>Your voter registration is pending approval from an administrator.</p>
              <p>Please check back later.</p>
            </Alert>
          ) : voterStatus === 'rejected' ? (
            <Alert variant="danger">
              <h5>Registration Rejected</h5>
              <p>Your voter registration has been rejected.</p>
              <p>Please contact an administrator for more information.</p>
            </Alert>
          ) : (
            <Alert variant="warning">
              <h5>Not Registered</h5>
              <p>This wallet is not registered in our system.</p>
              <p>If you are a voter, please register first.</p>
              <Button 
                as={Link} 
                to="/voter/register" 
                variant="primary" 
                className="mt-2"
              >
                Register as Voter
              </Button>
            </Alert>
          )}
          
          <Button
            variant="outline-secondary"
            onClick={() => {
              setWalletAddress('');
              setCanLogin(false);
              setVoterStatus(null);
            }}
            className="mt-3"
          >
            Connect Different Wallet
          </Button>
        </div>
      );
    }

    // Can login
    return (
      <div>
        <Alert variant="success" className="mb-4">
          <strong>Wallet Connected:</strong> {walletAddress}
        </Alert>
        <p className="mb-4">
          Click the button below to sign in with your MetaMask wallet.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={handleLogin}
          disabled={loading}
          className="px-4 py-2"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
        
        <p className="mt-3 text-muted small">
          You will be asked to sign a message to verify your identity.
        </p>
      </div>
    );
  };

  return (
    <Layout>
      <Container>
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header className="bg-primary text-white text-center py-3">
                <h3>Login with MetaMask</h3>
              </Card.Header>
              <Card.Body className="p-4 text-center">
                {error && <Alert variant="danger">{error}</Alert>}
                
                {!isMetaMaskInstalled ? (
                  <div>
                    <Alert variant="warning">
                      <h5>MetaMask is not installed</h5>
                      <p>You need to install MetaMask to use this application.</p>
                      <pre className="mt-3 text-start bg-light p-2" style={{ fontSize: '0.8rem' }}>
                        {debugInfo}
                      </pre>
                    </Alert>
                    <Button 
                      variant="outline-primary" 
                      href="https://metamask.io/download/" 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install MetaMask
                    </Button>
                  </div>
                ) : (
                  renderWalletContent()
                )}
                
                {/* Debug information */}
                <div className="mt-4 text-start">
                  <details>
                    <summary className="text-muted">Debug Information</summary>
                    <pre className="mt-2 bg-light p-2" style={{ fontSize: '0.8rem' }}>
                      {debugInfo}
                    </pre>
                  </details>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default Login; 