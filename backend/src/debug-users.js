const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('./models/user.model');

const targetWalletAddress = '0xA2f9925a765823522a4aD2977829e1FE3b6dEBbB'.toLowerCase();

async function main() {
  try {
    // Check environment variables
    console.log('Environment variables:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('OFFICER_WALLET_ADDRESSES:', process.env.OFFICER_WALLET_ADDRESSES);
    
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not defined in .env file');
      process.exit(1);
    }
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Look for user with officer wallet address
    console.log(`Looking for user with wallet address: ${targetWalletAddress}`);
    const user = await User.findOne({ 
      walletAddress: { $regex: new RegExp(targetWalletAddress, 'i') } 
    });
    
    if (user) {
      console.log('User found:');
      console.log('ID:', user._id);
      console.log('Wallet Address:', user.walletAddress);
      console.log('Role:', user.role);
      console.log('Created At:', user.createdAt);
      
      // Update the role directly
      if (user.role !== 'officer') {
        console.log(`Updating user role from ${user.role} to officer...`);
        user.role = 'officer';
        await user.save();
        console.log('User role updated to officer');
      } else {
        console.log('User already has officer role');
      }
    } else {
      console.log('User not found with that wallet address');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

main(); 