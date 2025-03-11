import React from 'react';
import { Container } from 'react-bootstrap';
import Navbar from './Navbar';
import Footer from './Footer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import CSS files
import '../styles/variables.css';
import '../styles/blockchain-theme.css';
import '../styles/navbar.css';
import '../styles/footer.css';
import '../styles/home.css';

const Layout = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100 blockchain-theme">
      <div className="blockchain-background"></div>
      <Navbar />
      <Container className="flex-grow-1 py-4 content-container">
        {children}
      </Container>
      <Footer />
      <ToastContainer position="bottom-right" autoClose={5000} />
    </div>
  );
};

export default Layout; 