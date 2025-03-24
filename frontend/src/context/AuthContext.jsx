import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import env from '../utils/env';
import { ethers } from 'ethers';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Set up axios defaults and interceptors
  useEffect(() => {
    const apiUrl = env.API_URL || 'http://localhost:5000/api';
    console.log('Setting up axios with base URL:', apiUrl);
    axios.defaults.baseURL = apiUrl;
    
    // Add request interceptor to include token in all requests
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor to handle token expiration
    axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 401) {
          console.log('Unauthorized response detected, logging out');
          logout();
        }
        return Promise.reject(error);
      }
    );
    
    // Cleanup function
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);
  
  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // Verify the token is still valid
            const decoded = jwt_decode(token);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp > currentTime) {
              console.log('Valid token found on app load, setting user data...');
              
              // Set axios authorization header
              axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
              
              // Token is still valid, set the user
              const userData = {
                address: decoded.address,
                role: decoded.role || (decoded.address && decoded.address.toLowerCase() === env.ADMIN_ADDRESS.toLowerCase() ? 'admin' : 'voter')
              };
              
              console.log('Setting user data:', userData);
              setUser(userData);
              setIsAuthenticated(true);
              
              // No automatic redirect here to avoid disrupting navigation
            } else {
              console.log('Token expired, removing...');
              localStorage.removeItem('token');
              delete axios.defaults.headers.common['Authorization'];
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch (err) {
            console.error('Error decoding token on app load:', err);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('No token found, user not authenticated');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          setIsAuthenticated(false);
        }
        
        // Check if MetaMask is installed
        if (window.ethereum && window.ethereum.isMetaMask) {
          setIsMetaMaskInstalled(true);
          
          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts) => {
            console.log('MetaMask account changed:', accounts);
            if (accounts.length === 0) {
              // User has disconnected all accounts
              console.log('User disconnected accounts, logging out');
              logout();
            } else {
              // User switched accounts, we should re-authenticate
              console.log('Account changed, user needs to re-authenticate');
              logout();
            }
          });
          
          // Listen for chain changes
          window.ethereum.on('chainChanged', (chainId) => {
            console.log('MetaMask chain changed:', chainId);
            // Reload the page on chain change as recommended by MetaMask
            window.location.reload();
          });
        } else {
          setIsMetaMaskInstalled(false);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthentication();
    
    // Cleanup function to remove event listeners
    return () => {
      if (window.ethereum && window.ethereum.isMetaMask) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);
  
  // Load user data from token
  const loadUser = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, user not authenticated');
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return null;
      }
      
      // Decode token to get user info
      try {
        const decoded = jwt_decode(token);
        console.log('Decoded token:', decoded);
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.log('Token expired, logging out');
          logout();
          return null;
        }
        
        // Set user from token data
        setUser({
          address: decoded.address,
          role: decoded.role
        });
        setIsAuthenticated(true);
        
        return decoded;
      } catch (err) {
        console.error('Error decoding token:', err);
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setError(err.message || 'Failed to load user data');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Connect to MetaMask - requiring explicit user approval
  const connectWallet = async () => {
    try {
      console.log('Connecting wallet...');
      
      if (!window.ethereum) {
        console.error('MetaMask not detected');
        setError('MetaMask not detected. Please install MetaMask and refresh the page.');
        throw new Error('MetaMask not detected');
      }
      
      console.log('Requesting accounts...');
      
      // Use the eth_requestAccounts method directly - this will prompt the user for approval
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask and try again.');
      }
      
      const address = accounts[0];
      console.log('Connected to account:', address);
      
      return address;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      throw err;
    }
  };

  // Sign message with MetaMask - using eth_sendTransaction for user approval
  const signMessage = async (address, nonce) => {
    try {
      console.log('Authenticating with address:', address, 'and nonce:', nonce);
      
      // Instead of signing a message, we'll send a 0 ETH transaction to the user's own address
      // This will trigger the MetaMask popup for approval
      console.log('Using eth_sendTransaction method for user approval...');
      
      // Make sure the address is checksummed
      const checksummedAddress = ethers.utils.getAddress(address);
      console.log('Using checksummed address:', checksummedAddress);
      
      // Create a transaction object - sending 0 ETH to self
      const transactionParameters = {
        to: checksummedAddress, // sending to self
        from: checksummedAddress, // from the user's address
        value: '0x0', // 0 ETH
        // Include the nonce in the data field for verification
        data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`VoteSure Authentication: ${nonce}`))
      };
      
      console.log('Transaction parameters:', transactionParameters);
      
      // Send the transaction - this will prompt the user for approval
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });
      
      console.log('Transaction hash received:', txHash);
      
      // Use the transaction hash as the signature
      return txHash;
    } catch (err) {
      console.error('Error during transaction:', err);
      throw new Error(`Failed to authenticate: ${err.message || 'Unknown error'}`);
    }
  };

  // Register a new voter
  const registerVoter = async (voterData) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${apiUrl}/voter/register`, voterData);
      
      console.log('Voter registration response:', response.data);
      return response.data;
    } catch (err) {
      console.error('Error registering voter:', err);
      setError(err.message || 'Failed to register voter');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async () => {
    console.log('Starting login process...');
    setLoading(true);
    setError(null);
    
    try {
      // Connect wallet
      const address = await connectWallet();
      console.log('Wallet connected, address:', address);
      
      // Check if this is the admin address
      const adminAddress = env.ADMIN_ADDRESS;
      console.log('Admin address from env:', adminAddress);
      
      const isAdminWallet = address.toLowerCase() === adminAddress.toLowerCase();
      if (isAdminWallet) {
        console.log('Admin wallet detected!');
      }
      
      // Get nonce from server
      console.log('Getting nonce from server...');
      const apiUrl = env.API_URL || 'http://localhost:5000/api';
      console.log('Using API URL:', apiUrl);
      
      const nonceResponse = await axios.get(`${apiUrl}/auth/nonce?address=${address}`);
      console.log('Nonce response:', nonceResponse.data);
      
      // Authenticate with transaction
      console.log('Authenticating with transaction...');
      
      // Check if MetaMask is available
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        throw new Error('MetaMask is not installed or not accessible');
      }
      
      // Get transaction hash
      const txHash = await signMessage(address, nonceResponse.data.nonce);
      console.log('Transaction hash received successfully:', txHash);
      
      // Verify transaction on server
      console.log('Verifying transaction on server...');
      const loginResponse = await axios.post(`${apiUrl}/auth/login`, {
        address,
        signature: txHash // Using txHash as the signature
      });
      
      console.log('Login response:', loginResponse.data);
      
      // Save token to localStorage
      localStorage.setItem('token', loginResponse.data.token);
      
      // Decode token to get user info
      const decoded = jwt_decode(loginResponse.data.token);
      console.log('Decoded token:', decoded);
      
      // Determine role
      let role = decoded.role;
      
      // If role is not in the token, determine it from the address
      if (!role) {
        if (isAdminWallet) {
          role = 'admin';
        } else if (isOfficer(address)) {
          role = 'officer';
        } else {
          role = 'voter';
        }
      }
      
      console.log('User role determined as:', role);
      
      // Set user state with role
      setUser({
        address: address,
        role: role
      });
      
      setIsAuthenticated(true);
      setLoading(false);
      
      // Redirect based on role using window.location for a hard redirect
      if (role === 'admin') {
        console.log('Redirecting to admin dashboard...');
        window.location.href = '/admin';
      } else if (role === 'officer') {
        console.log('Redirecting to officer dashboard...');
        window.location.href = '/officer';
      } else {
        console.log('Redirecting to voter dashboard...');
        window.location.href = '/voter';
      }
      
      return {
        user: {
          address: address,
          role: role
        },
        token: loginResponse.data.token
      };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
      setLoading(false);
      throw err;
    }
  };

  // Logout user
  const logout = () => {
    console.log('Logging out user...');
    
    // Clear token from localStorage
    localStorage.removeItem('token');
    
    // Clear user state
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear axios headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Redirect to login page
    console.log('Redirecting to login page...');
    window.location.href = '/login';
  };

  // Check if address is admin
  const isAdmin = (address) => {
    if (!address) return false;
    return address.toLowerCase() === env.ADMIN_ADDRESS.toLowerCase();
  };

  // Check if address is officer
  const isOfficer = (address) => {
    if (!address) return false;
    
    // Get officer addresses
    const officerAddresses = env.OFFICER_ADDRESSES ? 
      env.OFFICER_ADDRESSES.split(',') : 
      [];
    
    return officerAddresses.some(
      officer => officer.toLowerCase() === address.toLowerCase()
    );
  };

  // Check wallet type (admin, officer, or voter)
  const checkWalletType = (address) => {
    if (!address) return 'unknown';
    
    if (isAdmin(address)) {
      return 'admin';
    } else if (isOfficer(address)) {
      return 'officer';
    } else {
      return 'voter';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isMetaMaskInstalled,
        isAuthenticated,
        isAdmin: (address) => {
          // If an address is provided, check that address
          if (address) {
            return isAdmin(address);
          }
          
          // Otherwise check the current user
          if (user && user.role === 'admin') {
            return true;
          }
          
          // Check if the current user's address is the admin address
          if (user && user.address) {
            return isAdmin(user.address);
          }
          
          return false;
        },
        isOfficer: (address) => {
          // If an address is provided, check that address
          if (address) {
            return isOfficer(address);
          }
          
          // Otherwise check the current user
          if (user && user.role === 'officer') {
            return true;
          }
          
          // Check if the current user's address is an officer address
          if (user && user.address) {
            return isOfficer(user.address);
          }
          
          return false;
        },
        isVoter: () => {
          // Check if the current user has the voter role
          if (user && user.role === 'voter') {
            return true;
          }
          
          // If user has a role that is not admin or officer, they're a voter
          if (user && user.role && user.role !== 'admin' && user.role !== 'officer') {
            return true;
          }
          
          return false;
        },
        connectWallet,
        signMessage,
        registerVoter,
        login,
        logout,
        loadUser,
        checkWalletType
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 