// Script to remove the unique index on the email field in the users collection
require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/votesure';

async function removeUniqueEmailIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check if the index exists
    const indexes = await usersCollection.indexes();
    const emailIndex = indexes.find(index => index.key && index.key.email === 1);
    
    if (emailIndex) {
      console.log('Found email index:', emailIndex);
      
      // Drop the index
      await usersCollection.dropIndex('email_1');
      console.log('Successfully dropped the email index');
    } else {
      console.log('No email index found');
    }
    
    // Create a new non-unique index on email if needed
    await usersCollection.createIndex({ email: 1 }, { unique: false });
    console.log('Created non-unique index on email field');
    
    console.log('Index operation completed successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
removeUniqueEmailIndex(); 