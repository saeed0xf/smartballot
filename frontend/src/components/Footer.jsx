import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaVoteYea, FaEthereum, FaGithub, FaTwitter, FaLinkedin, FaDiscord, FaShieldAlt, FaUserShield } from 'react-icons/fa';
import env from '../utils/env';

const Footer = () => {
  // Truncate addresses for display
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const adminAddress = env.ADMIN_ADDRESS || '';
  // Get the first officer address if there are multiple
  const officerAddress = env.OFFICER_ADDRESSES ? env.OFFICER_ADDRESSES.split(',')[0] : '';

  return (
    <footer className="footer mt-auto py-4 bg-dark text-white">
      <Container>
        <Row className="mb-4">
          <Col lg={4} md={6} className="mb-4 mb-md-0">
            <h5 className="d-flex align-items-center">
              <FaVoteYea className="me-2" /> VoteSure
            </h5>
            <p className="text-muted">
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
            <h5>Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/" className="text-muted text-decoration-none">
                  <FaVoteYea className="me-2" /> Home
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/register" className="text-muted text-decoration-none">
                  <FaUserShield className="me-2" /> Register as Voter
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/login" className="text-muted text-decoration-none">
                  <FaEthereum className="me-2" /> Connect Wallet
                </Link>
              </li>
              <li className="mb-2">
                <a href="#" className="text-muted text-decoration-none">
                  <FaShieldAlt className="me-2" /> Privacy Policy
                </a>
              </li>
            </ul>
          </Col>
          <Col lg={5} md={12}>
            <h5>Blockchain Info</h5>
            <div className="blockchain-info">
              <ul className="list-unstyled">
                <li className="mb-2 d-flex align-items-center">
                  <FaEthereum className="me-2 text-info" /> 
                  <span className="info-label">Network:</span>
                  <span className="info-value ms-2">Ethereum (Ganache)</span>
                </li>
                <li className="mb-2">
                  <span className="info-label">Contract:</span>
                  <span className="info-value ms-2">0x123...789</span>
                </li>
                <li className="mb-2">
                  <span className="info-label">Admin:</span>
                  <span className="info-value ms-2">{truncateAddress(adminAddress)}</span>
                </li>
                <li className="mb-2">
                  <span className="info-label">Officer:</span>
                  <span className="info-value ms-2">{truncateAddress(officerAddress)}</span>
                </li>
              </ul>
            </div>
          </Col>
        </Row>
        <hr className="my-4 bg-secondary" />
        <Row>
          <Col className="text-center">
            <p className="copyright mb-0">
              &copy; {new Date().getFullYear()} VoteSure. All rights reserved. Powered by <FaEthereum className="mx-1" /> Ethereum
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer; 