import React, { useContext } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaVoteYea, FaEthereum, FaGithub, FaTwitter, FaLinkedin, FaDiscord, FaShieldAlt, FaUserShield } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import env from '../utils/env';

const Footer = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  
  // Truncate addresses for display
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const adminAddress = env.ADMIN_ADDRESS || '';
  // Get the first officer address if there are multiple
  const officerAddress = env.OFFICER_ADDRESSES ? env.OFFICER_ADDRESSES.split(',')[0] : '';
  
  // Check if current user is admin or officer
  const isAdminOrOfficer = () => {
    if (!user || !user.walletAddress) return false;
    
    const userWallet = (user.walletAddress || user.wallet || '').toLowerCase();
    const adminWallet = (adminAddress || '').toLowerCase();
    const officerWallets = env.OFFICER_ADDRESSES ? 
      env.OFFICER_ADDRESSES.split(',').map(addr => addr.toLowerCase()) : 
      [];
    
    return userWallet === adminWallet || officerWallets.includes(userWallet);
  };
  
  // Better check for hiding "Register as Voter" link
  const shouldShowRegisterLink = () => {
    if (!isAuthenticated) return true; // Show to unauthenticated users
    return !isAdminOrOfficer(); // Hide from admin/officer
  };

  return (
    <footer className="footer mt-auto py-4 bg-dark text-white">
      <Container>
        <Row className="mb-4">
          <Col lg={4} md={6} className="mb-4 mb-md-0">
            <h5 className="d-flex align-items-center text-light">
              <FaVoteYea className="me-2" /> SmartBallot
            </h5>
            <p className="text-light opacity-75">
              A secure and transparent decentralized voting system built on Ethereum blockchain.
              Ensuring integrity and immutability of every vote through blockchain technology.
            </p>
            <div className="social-links d-flex mt-3">
              <a href="#" className="text-light me-3"><FaGithub /></a>
              <a href="#" className="text-light me-3"><FaTwitter /></a>
              <a href="#" className="text-light me-3"><FaLinkedin /></a>
              <a href="#" className="text-light"><FaDiscord /></a>
            </div>
          </Col>
          <Col lg={3} md={6} className="mb-4 mb-md-0">
            <h5 className="text-light">Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/" className="text-light text-decoration-none">
                  <FaVoteYea className="me-2" /> Home
                </Link>
              </li>
              {/* Only show Register as Voter link if not admin/officer and not authenticated */}
              {shouldShowRegisterLink() && (
                <li className="mb-2">
                  <Link to="/register" className="text-light text-decoration-none">
                    <FaUserShield className="me-2" /> Register as Voter
                  </Link>
                </li>
              )}
              {/* Only show Connect Wallet if not authenticated */}
              {!isAuthenticated && (
                <li className="mb-2">
                  <Link to="/login" className="text-light text-decoration-none">
                    <FaEthereum className="me-2" /> Connect Wallet
                  </Link>
                </li>
              )}
              <li className="mb-2">
                <a href="#" className="text-light text-decoration-none">
                  <FaShieldAlt className="me-2" /> Privacy Policy
                </a>
              </li>
            </ul>
          </Col>
          <Col lg={5} md={12}>
            <h5 className="text-light">Blockchain Info</h5>
            <div className="blockchain-info">
              <ul className="list-unstyled">
                <li className="mb-2 d-flex align-items-center">
                  <FaEthereum className="me-2 text-info" />
                  <span className="info-label text-light">Network:</span>
                  <span className="info-value ms-2 text-light">Ethereum (Ganache)</span>
                </li>
                <li className="mb-2">
                  <span className="info-label text-light">Contract:</span>
                  <span className="info-value ms-2 text-light opacity-75">0x123...789</span>
                </li>
                <li className="mb-2">
                  <span className="info-label text-light">Admin:</span>
                  <span className="info-value ms-2 text-light opacity-75">{truncateAddress(adminAddress)}</span>
                </li>
                <li className="mb-2">
                  <span className="info-label text-light">Officer:</span>
                  <span className="info-value ms-2 text-light opacity-75">{truncateAddress(officerAddress)}</span>
                </li>
              </ul>
            </div>
          </Col>
        </Row>
        <hr className="border-secondary" />
        <div className="text-center text-light opacity-75">
          <small>&copy; {new Date().getFullYear()} SmartBallot. All rights reserved.</small>
        </div>
      </Container>
    </footer>
  );
};

export default Footer; 