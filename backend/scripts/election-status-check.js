/**
 * Auto End and Archive Elections Script
 * 
 * This script:
 * 1. Checks for elections that have passed their end date and automatically ends them
 * 2. Checks for inactive elections that aren't archived yet and archives them
 * 
 * It should be run as a scheduled job.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { 
  checkAndAutoEndElections,
  checkAndArchiveInactiveElections
} = require('../src/controllers/election.controller');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/votesure';
console.log('Connecting to MongoDB at:', MONGODB_URI);

async function run() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      family: 4 // Use IPv4
    });
    
    console.log('Connected to MongoDB. Running election status checks...');
    
    // First, archive any inactive elections that aren't archived yet
    const archivedCount = await checkAndArchiveInactiveElections();
    console.log(`Archive check completed. ${archivedCount} inactive elections were archived.`);
    
    // Next, auto-end any active elections that have passed their end date
    const endedCount = await checkAndAutoEndElections();
    console.log(`Auto-end check completed. ${endedCount} elections were automatically ended.`);
    
    console.log(`Election status checks completed. ${endedCount} elections ended and ${archivedCount} elections archived.`);
  } catch (error) {
    console.error('Error in election status checks script:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

// Run the script
run().then(() => {
  console.log('Election status checks completed successfully.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed with error:', error);
  process.exit(1);
}); 