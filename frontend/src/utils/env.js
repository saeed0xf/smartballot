// Environment variables utility
const env = {
  API_URL: process.env.VITE_API_URL || 'http://localhost:5000/api',
  BLOCKCHAIN_RPC_URL: process.env.VITE_BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545',
  ADMIN_ADDRESS: process.env.VITE_ADMIN_ADDRESS || '0x5dfA4943B7C0f3aa7545B1B4c5D6e64A19E3CF49',
  OFFICER_ADDRESSES: process.env.VITE_OFFICER_ADDRESSES || ''
};

export default env; 