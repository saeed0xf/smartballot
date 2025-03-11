import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Spinner from 'react-bootstrap/Spinner';
import jwt_decode from 'jwt-decode';
import env from '../utils/env';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        console.log('Checking admin status for route:', location.pathname);
        console.log('Current user:', user);
        console.log('Is authenticated:', isAuthenticated);
        
        // First check from user context
        if (user && user.role === 'admin') {
          console.log('Admin status confirmed from user context');
          setIsAdminUser(true);
          setCheckingAdmin(false);
          return;
        }
        
        // Then check from token
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const decoded = jwt_decode(token);
            console.log('Decoded token in AdminRoute:', decoded);
            
            if (decoded.role === 'admin') {
              console.log('Admin status confirmed from token');
              setIsAdminUser(true);
              setCheckingAdmin(false);
              return;
            }
            
            // If token exists but role is not admin, check the address
            if (decoded.address) {
              const adminAddress = env.ADMIN_ADDRESS;
              console.log('Admin address from env:', adminAddress);
              console.log('Token address:', decoded.address);
              
              if (decoded.address.toLowerCase() === adminAddress.toLowerCase()) {
                console.log('Admin status confirmed from token address');
                setIsAdminUser(true);
                setCheckingAdmin(false);
                return;
              }
            }
          } catch (err) {
            console.error('Error decoding token in AdminRoute:', err);
          }
        } else {
          console.log('No token found in AdminRoute');
        }
        
        // Finally check from wallet address
        if (user && user.address) {
          const adminAddress = env.ADMIN_ADDRESS;
          console.log('Admin address from env:', adminAddress);
          console.log('User address:', user.address);
          
          if (user.address.toLowerCase() === adminAddress.toLowerCase()) {
            console.log('Admin status confirmed from wallet address');
            setIsAdminUser(true);
            setCheckingAdmin(false);
            return;
          }
        }
        
        console.log('Not an admin user');
        setIsAdminUser(false);
        setCheckingAdmin(false);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdminUser(false);
        setCheckingAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [user, isAuthenticated, location.pathname]);

  if (loading || checkingAdmin) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Check if we have a token even if isAuthenticated is false
  const token = localStorage.getItem('token');
  if (!isAuthenticated && !token) {
    console.log('Not authenticated and no token, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  // If we have a token but isAuthenticated is false, try to use the token
  if (!isAuthenticated && token) {
    try {
      const decoded = jwt_decode(token);
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (decoded.exp > currentTime) {
        console.log('Valid token found in AdminRoute, checking if admin');
        
        // Check if admin from token
        if (decoded.role === 'admin' || 
            (decoded.address && decoded.address.toLowerCase() === env.ADMIN_ADDRESS.toLowerCase())) {
          console.log('Admin confirmed from token, allowing access');
          return children;
        }
      }
    } catch (err) {
      console.error('Error checking token in AdminRoute:', err);
    }
  }

  if (!isAdminUser) {
    console.log('Not an admin user, redirecting to home');
    return <Navigate to="/" />;
  }

  console.log('Admin access granted to:', location.pathname);
  return children;
};

export default AdminRoute; 