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
        <Row className="hero-section align-items-center min-vh-75">
          <Col lg={6} className="d-flex flex-column justify-content-center mb-4 mb-lg-0 order-1 order-lg-1">
            <Badge bg="primary" className="hero-badge mb-3 px-3 py-2 align-self-start">Blockchain-Powered Voting</Badge>
            <h1 className="hero-title">Secure and Transparent Elections</h1>
            <p className="hero-description">
              SmartBallot leverages <span className="d-inline-flex align-items-center"><FaEthereum className="mx-1" /> Ethereum</span> blockchain technology to ensure
              security, transparency, and integrity in the electoral process. Vote with confidence knowing your ballot is immutable and verifiable.
            </p>
            <div className="d-flex flex-column flex-sm-row gap-3 hero-buttons">
              {/* Show Register Now button only for voter wallets */}
              {walletType === 'voter' && (
                <Button as={Link} to="/register" variant="primary" size="lg" className="d-flex align-items-center justify-content-center px-4 py-2">
                  <FaUserPlus className="me-2" /> Register Now
                </Button>
              )}
              {/* Show Connect Wallet button for all users, but redirect admin/officer to login */}
              <Button 
                as={Link} 
                to={walletType === 'admin' || walletType === 'officer' ? "/login" : "/login"} 
                variant="outline-light" 
                size="lg" 
                className="d-flex align-items-center justify-content-center px-4 py-2"
              >
                <FaEthereum className="me-2" /> Connect Wallet
              </Button>
            </div>
          </Col>
          <Col lg={6} className="d-flex align-items-start order-2 order-lg-2">
            <div className="hero-image w-100">
              <Card className="border-0 shadow-lg overflow-hidden bg-transparent hero-image-card">
                <Card.Img 
                  src="https://img.freepik.com/free-vector/digital-voting-abstract-concept-illustration_335657-3887.jpg" 
                  alt="Blockchain Voting Illustration"
                  className="hero-image-responsive"
                />
              </Card>
            </div>
          </Col>
        </Row>

        {/* Stats Section */}
        {/* <Row className="mb-5 py-4">
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
        </Row> */}

        {/* How It Works Section */}
        <Row className="features-section py-5">
          <Col xs={12} className="text-center mb-5">
            <Badge bg="secondary" className="section-badge mb-2 px-3 py-2">Process</Badge>
            <h2 className="section-title mb-4">How It Works</h2>
          </Col>
          <Col lg={4} md={6} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaUserPlus />
              </div>
              <h3 className="feature-title text-center">Register</h3>
              <p className="feature-description">
                Create an account and complete your voter registration with your personal details and voter ID.
                Your identity is securely verified on the blockchain.
              </p>
            </Card>
          </Col>
          <Col lg={4} md={6} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaUserShield />
              </div>
              <h3 className="feature-title text-center">Get Verified</h3>
              <p className="feature-description">
                Election officials verify your identity and approve your registration.
                Your voter status is recorded on the blockchain for transparency.
              </p>
            </Card>
          </Col>
          <Col lg={4} md={12} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaVoteYea />
              </div>
              <h3 className="feature-title text-center">Cast Your Vote</h3>
              <p className="feature-description">
                Connect your wallet and cast your vote securely. Your vote is encrypted and
                recorded on the Ethereum blockchain, ensuring it cannot be altered.
              </p>
            </Card>
          </Col>
        </Row>

        {/* Benefits Section */}
        <Row className="features-section py-5">
          <Col xs={12} className="text-center mb-5">
            <Badge bg="secondary" className="section-badge mb-2 px-3 py-2">Benefits</Badge>
            <h2 className="section-title mb-4">Why Choose SmartBallot?</h2>
          </Col>
          <Col lg={3} md={6} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaLock />
              </div>
              <h3 className="feature-title text-center">Secure</h3>
              <p className="feature-description">Blockchain technology ensures your vote is secure and tamper-proof with cryptographic protection.</p>
            </Card>
          </Col>
          <Col lg={3} md={6} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaSearch />
              </div>
              <h3 className="feature-title text-center">Transparent</h3>
              <p className="feature-description">All votes are recorded on a public blockchain for maximum transparency and auditability.</p>
            </Card>
          </Col>
          <Col lg={3} md={6} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaClipboardCheck />
              </div>
              <h3 className="feature-title text-center">Verifiable</h3>
              <p className="feature-description">Voters can verify their votes have been correctly recorded and counted on the blockchain.</p>
            </Card>
          </Col>
          <Col lg={3} md={6} className="mb-4">
            <Card className="feature-card h-100 p-4">
              <div className="feature-icon">
                <FaMobileAlt />
              </div>
              <h3 className="feature-title text-center">Accessible</h3>
              <p className="feature-description">Vote from anywhere with an internet connection and MetaMask wallet during the election period.</p>
            </Card>
          </Col>
        </Row>

        {/* CTA Section */}
        <Row className="cta-section py-5">
          <Col xs={12}>
            <Card className="cta-card border-0">
              <Card.Body className="p-4 p-md-5 text-center text-white ">
                <h2 className="cta-title text-white">Ready to participate in secure blockchain voting?</h2>
                <p className="cta-description text-white">Join SmartBallot today and experience the future of democratic elections.</p>
                {/* Show Register as a Voter button only for voter wallets */}
                {walletType === 'voter' ? (
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
      
      {/* Add responsive CSS styles */}
      <style jsx>{`
        /* Hero Section Styling */
        .hero-section {
          padding: 2rem 0;
          min-height: 75vh;
        }
        
        .min-vh-75 {
          min-height: 75vh;
        }
        
        .hero-badge {
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          border-radius: 20px;
          width: fit-content;
        }
        
        .hero-title {
          font-size: 3.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1.5rem;
          color: white;
        }
        
        .hero-description {
          font-size: 1.2rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .hero-buttons {
          margin-top: 1rem;
        }
        
        .hero-image {
          position: relative;
        }
        
        .hero-image-card {
          border-radius: 1rem;
          overflow: hidden;
          background: transparent;
        }
        
        .hero-image-responsive {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 1rem;
          max-height: 400px;
        }
        
        /* Section Styling */
        .section-badge {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          border-radius: 15px;
        }
        
        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 2rem;
        }
        
        .features-section {
          margin: 3rem 0;
        }
        
        /* Feature Cards */
        .feature-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          transition: all 0.3s ease;
          height: 100%;
        }
        
        .feature-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .feature-icon {
          font-size: 3rem;
          color: #007bff;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .feature-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
          margin-bottom: 1rem;
        }
        
        .feature-description {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 0;
        }
        
        /* CTA Section */
        .cta-section {
          margin: 4rem 0 2rem 0;
        }
        
        .cta-card {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          border-radius: 1rem;
        }
        
        .cta-title {
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }
        
        .cta-description {
          font-size: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        
        .cta-button {
          padding: 0.75rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 0.5rem;
        }
        
        /* Desktop Image Alignment and Sizing */
        @media (min-width: 992px) {
          .hero-image {
            margin-top: 0;
            display: flex;
            align-items: flex-start;
          }
          
          .hero-image-card {
            width: 100%;
            height: fit-content;
          }
          
          .hero-image-responsive {
            max-height: 450px;
            min-height: 350px;
            object-fit: cover;
          }
          
          /* Align image top with badge */
          .hero-section .col-lg-6:last-child {
            padding-top: 0;
          }
        }
        
        /* Responsive Design */
        @media (max-width: 1199.98px) {
          .hero-title {
            font-size: 3rem;
          }
          
          .section-title {
            font-size: 2.2rem;
          }
          
          .hero-image-responsive {
            max-height: 380px;
          }
        }
        
        @media (max-width: 991.98px) {
          .hero-section {
            padding: 1.5rem 0;
            min-height: auto;
          }
          
          .hero-title {
            font-size: 2.5rem;
            margin-bottom: 1rem;
          }
          
          .hero-description {
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
          }
          
          .section-title {
            font-size: 2rem;
          }
          
          .hero-image {
            margin-top: 2rem;
          }
          
          .hero-image-responsive {
            max-height: 300px;
          }
        }
        
        @media (max-width: 767.98px) {
          .hero-section {
            padding: 1rem 0;
          }
          
          .hero-title {
            font-size: 2rem;
            text-align: center;
          }
          
          .hero-description {
            font-size: 1rem;
            text-align: center;
          }
          
          .hero-badge {
            align-self: center !important;
          }
          
          .hero-buttons {
            justify-content: center;
            align-items: center;
          }
          
          .section-title {
            font-size: 1.8rem;
          }
          
          .feature-title {
            font-size: 1.3rem;
          }
          
          .cta-title {
            font-size: 1.8rem;
          }
          
          .cta-description {
            font-size: 1rem;
          }
          
          .hero-image {
            margin-top: 2rem;
          }
          
          .hero-image-responsive {
            max-height: 250px;
          }
        }
        
        @media (max-width: 575.98px) {
          .hero-title {
            font-size: 1.8rem;
          }
          
          .hero-description {
            font-size: 0.95rem;
          }
          
          .section-title {
            font-size: 1.6rem;
          }
          
          .feature-card {
            padding: 1.5rem !important;
          }
          
          .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
          }
          
          .feature-title {
            font-size: 1.2rem;
          }
          
          .feature-description {
            font-size: 0.9rem;
          }
          
          .cta-title {
            font-size: 1.5rem;
          }
          
          .cta-card .card-body {
            padding: 2rem 1rem !important;
          }
          
          .hero-image {
            margin-top: 1.5rem;
          }
          
          .hero-image-responsive {
            max-height: 220px;
          }
        }
        
        /* Button Responsive Styling */
        @media (max-width: 575.98px) {
          .hero-buttons .btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          
          .hero-buttons .btn:last-child {
            margin-bottom: 0;
          }
        }
        
        /* Enhanced hover effects */
        .btn {
          transition: all 0.3s ease;
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </Layout>
  );
};

export default Home; 