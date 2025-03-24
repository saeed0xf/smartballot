import React, { useContext, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { FaVoteYea, FaUserShield, FaLock, FaEthereum, FaCheckCircle, FaUserPlus, FaSearch, FaShieldAlt, FaGlobe, FaClipboardCheck, FaMobileAlt, FaChartLine } from 'react-icons/fa';
import env from '../utils/env';

const Home = () => {
  const { isAuthenticated, isAdmin, isVoter, isOfficer } = useContext(AuthContext);
  const [walletType, setWalletType] = useState(null);

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
      }
    };
    
    checkWalletType();
  }, []);

  const renderDashboardButton = () => {
    if (isAuthenticated) {
      if (isAdmin) {
        return (
          <Button variant="success" as={Link} to="/admin" className="me-3">
            Admin Dashboard
          </Button>
        );
      } else if (isVoter()) {
        return (
          <Button variant="success" as={Link} to="/voter" className="me-3">
            Voter Dashboard
          </Button>
        );
      } else if (isOfficer()) {
        return (
          <Button variant="success" as={Link} to="/officer" className="me-3">
            Officer Dashboard
          </Button>
        );
      }
    }
  };

  // Redirect authenticated users to their respective dashboards
  if (isAuthenticated) {
    if (isAdmin) {
      return <Link to="/admin" />;
    } else if (isVoter) {
      return <Link to="/voter" />;
    } else if (isOfficer) {
      return <Link to="/officer" />;
    }
  }

  return (
    <Layout>
      <Container>
        {/* Hero Section */}
        <Row className="hero-section">
          <Col lg={6} className="d-flex flex-column justify-content-center mb-5 mb-lg-0">
            <Badge bg="primary" className="hero-badge mb-3 px-3 py-2 align-self-start">Blockchain-Powered Voting</Badge>
            <h1 className="hero-title">Secure and Transparent Elections</h1>
            <p className="hero-description">
              VoteSure leverages <span className="d-inline-flex align-items-center"><FaEthereum className="mx-1" /> Ethereum</span> blockchain technology to ensure
              security, transparency, and integrity in the electoral process. Vote with confidence knowing your ballot is immutable and verifiable.
            </p>
            <div className="d-flex gap-3 hero-buttons">
              {/* Hide Register Now button for admin and officer wallets */}
              {walletType !== 'admin' && walletType !== 'officer' && (
                <Button as={Link} to="/register" variant="primary" size="lg" className="d-flex align-items-center px-4 py-2">
                  <FaUserPlus className="me-2" /> Register Now
                </Button>
              )}
              <Button as={Link} to="/login" variant="outline-light" size="lg" className="d-flex align-items-center px-4 py-2">
                <FaEthereum className="me-2" /> Connect Wallet
              </Button>
            </div>
          </Col>
          <Col lg={6}>
            <div className="hero-image">
              <Card className="border-0 shadow-lg overflow-hidden bg-transparent">
                <Card.Img 
                  src="https://img.freepik.com/free-vector/digital-voting-abstract-concept-illustration_335657-3887.jpg" 
                  alt="Blockchain Voting Illustration" 
                />
              </Card>
            </div>
          </Col>
        </Row>

        {/* Stats Section */}
        <Row className="mb-5 py-4">
          <Col xs={12} className="text-center mb-4">
            <Badge bg="secondary" className="section-badge mb-2 px-3 py-2">Statistics</Badge>
            <h2 className="section-title mb-4">Blockchain Voting Metrics</h2>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card text-center p-4">
              <div className="feature-icon">
                <FaUserPlus />
              </div>
              <h3 className="feature-title">1,250+</h3>
              <p className="feature-description">Registered Voters</p>
            </Card>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card text-center p-4">
              <div className="feature-icon">
                <FaVoteYea />
              </div>
              <h3 className="feature-title">850+</h3>
              <p className="feature-description">Votes Cast</p>
            </Card>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card text-center p-4">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3 className="feature-title">99.9%</h3>
              <p className="feature-description">System Uptime</p>
            </Card>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card text-center p-4">
              <div className="feature-icon">
                <FaShieldAlt />
              </div>
              <h3 className="feature-title">100%</h3>
              <p className="feature-description">Tamper-Proof</p>
            </Card>
          </Col>
        </Row>

        {/* How It Works Section */}
        <Row className="features-section">
          <Col xs={12} className="text-center mb-4">
            <Badge bg="secondary" className="section-badge mb-2 px-3 py-2">Process</Badge>
            <h2 className="section-title mb-4">How It Works</h2>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaUserPlus />
              </div>
              <h3 className="feature-title">Register</h3>
              <p className="feature-description">
                Create an account and complete your voter registration with your personal details and voter ID.
                Your identity is securely verified on the blockchain.
              </p>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaUserShield />
              </div>
              <h3 className="feature-title">Get Verified</h3>
              <p className="feature-description">
                Election officials verify your identity and approve your registration.
                Your voter status is recorded on the blockchain for transparency.
              </p>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaVoteYea />
              </div>
              <h3 className="feature-title">Cast Your Vote</h3>
              <p className="feature-description">
                Connect your wallet and cast your vote securely. Your vote is encrypted and
                recorded on the Ethereum blockchain, ensuring it cannot be altered.
              </p>
            </Card>
          </Col>
        </Row>

        {/* Benefits Section */}
        <Row className="features-section">
          <Col xs={12} className="text-center mb-4">
            <Badge bg="secondary" className="section-badge mb-2 px-3 py-2">Benefits</Badge>
            <h2 className="section-title mb-4">Why Choose VoteSure?</h2>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaLock />
              </div>
              <h3 className="feature-title">Secure</h3>
              <p className="feature-description">Blockchain technology ensures your vote is secure and tamper-proof with cryptographic protection.</p>
            </Card>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaSearch />
              </div>
              <h3 className="feature-title">Transparent</h3>
              <p className="feature-description">All votes are recorded on a public blockchain for maximum transparency and auditability.</p>
            </Card>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaClipboardCheck />
              </div>
              <h3 className="feature-title">Verifiable</h3>
              <p className="feature-description">Voters can verify their votes have been correctly recorded and counted on the blockchain.</p>
            </Card>
          </Col>
          <Col md={3} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaMobileAlt />
              </div>
              <h3 className="feature-title">Accessible</h3>
              <p className="feature-description">Vote from anywhere with an internet connection and MetaMask wallet during the election period.</p>
            </Card>
          </Col>
        </Row>

        {/* CTA Section */}
        <Row className="cta-section">
          <Col xs={12}>
            <Card className="cta-card border-0">
              <Card.Body className="p-5 text-center text-white">
                <h2 className="cta-title">Ready to participate in secure blockchain voting?</h2>
                <p className="cta-description">Join VoteSure today and experience the future of democratic elections.</p>
                {/* Hide Register as a Voter button for admin and officer wallets */}
                {walletType !== 'admin' && walletType !== 'officer' ? (
                  <Button as={Link} to="/register" variant="light" size="lg" className="cta-button">
                    Register as a Voter
                  </Button>
                ) : (
                  <Button as={Link} to="/login" variant="light" size="lg" className="cta-button">
                    Connect Wallet
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default Home; 