const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const seedAdmin = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    
    console.log('Previous users deleted');

    // Create new admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@idlocker.com',
      password: 'admin123' // Will be hashed by the pre-save hook
    });

    await admin.save();
    
    console.log('Admin user created successfully');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    console.log('MongoDB disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin(); 