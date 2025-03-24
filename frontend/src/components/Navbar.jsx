import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { FaVoteYea, FaUserShield, FaUsers, FaClipboardList, FaBoxes, FaSignOutAlt, FaHome, FaUserCheck, FaCheckSquare, FaChartLine, FaClock } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import env from '../utils/env';

const AppNavbar = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get user role or wallet type
  const getUserRole = () => {
    if (user && user.role) {
      return user.role;
    }
    return walletType || '';
  };

  const userRole = getUserRole();

  // Public navbar - hide register for admin and officer
  const publicLinks = (
    <>
      <Nav.Link as={Link} to="/" className="d-flex align-items-center">
        <FaHome className="me-1" /> Home
      </Nav.Link>
      {walletType !== 'admin' && walletType !== 'officer' && (
        <Nav.Link as={Link} to="/register" className="d-flex align-items-center">
          <FaUserCheck className="me-1" /> Register
        </Nav.Link>
      )}
      <Nav.Link as={Link} to="/login" className="d-flex align-items-center">
        <FaSignOutAlt className="me-1" /> Login
      </Nav.Link>
    </>
  );

  // Admin navbar
  const adminLinks = (
    <>
      <Nav.Link as={Link} to="/admin" className="d-flex align-items-center">
        <FaHome className="me-1" /> Dashboard
      </Nav.Link>
      <Nav.Link as={Link} to="/admin/voters" className="d-flex align-items-center">
        <FaUserCheck className="me-1" /> Approve Voters
      </Nav.Link>
      <Nav.Link as={Link} to="/admin/candidates" className="d-flex align-items-center">
        <FaUsers className="me-1" /> Candidates
      </Nav.Link>
      <Nav.Link as={Link} to="/admin/election" className="d-flex align-items-center">
        <FaVoteYea className="me-1" /> Election
      </Nav.Link>
      <Button variant="outline-danger" onClick={handleLogout} className="ms-2 d-flex align-items-center">
        <FaSignOutAlt className="me-1" /> Logout
      </Button>
    </>
  );

  // Voter navbar
  const voterLinks = (
    <>
      <Nav.Link as={Link} to="/voter" className="d-flex align-items-center">
        <FaHome className="me-1" /> Dashboard
      </Nav.Link>
      <Nav.Link as={Link} to="/voter/candidates" className="d-flex align-items-center">
        <FaUsers className="me-1" /> View Candidates
      </Nav.Link>
      <Nav.Link as={Link} to="/voter/vote" className="d-flex align-items-center">
        <FaVoteYea className="me-1" /> Cast Vote
      </Nav.Link>
      <Nav.Link as={Link} to="/voter/verify" className="d-flex align-items-center">
        <FaCheckSquare className="me-1" /> Verify Vote
      </Nav.Link>
      <Button variant="outline-danger" onClick={handleLogout} className="ms-2 d-flex align-items-center">
        <FaSignOutAlt className="me-1" /> Logout
      </Button>
    </>
  );

  // Officer navbar
  const officerLinks = (
    <>
      <Nav.Link as={Link} to="/officer" className="d-flex align-items-center">
        <FaHome className="me-1" /> Dashboard
      </Nav.Link>
      <Nav.Link as={Link} to="/officer/slots" className="d-flex align-items-center">
        <FaClock className="me-1" /> Time Slots
      </Nav.Link>
      <Nav.Link as={Link} to="/officer/slots/add" className="d-flex align-items-center">
        <FaBoxes className="me-1" /> Add Slot
      </Nav.Link>
      <Nav.Link as={Link} to="/officer/monitor" className="d-flex align-items-center">
        <FaChartLine className="me-1" /> Live Monitoring
      </Nav.Link>
      <Button variant="outline-danger" onClick={handleLogout} className="ms-2 d-flex align-items-center">
        <FaSignOutAlt className="me-1" /> Logout
      </Button>
    </>
  );

  // Render the appropriate links based on user role
  const navLinks = () => {
    if (!isAuthenticated) {
      return publicLinks;
    }
    
    switch(userRole) {
      case 'admin':
        return adminLinks;
      case 'officer':
        return officerLinks;
      case 'voter':
        return voterLinks;
      default:
        return publicLinks;
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <FaVoteYea className="me-2" size={24} />
          <span>VoteSure</span>
          {isAuthenticated && (
            <Badge bg="primary" className="ms-2">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          )}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {navLinks()}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar; 