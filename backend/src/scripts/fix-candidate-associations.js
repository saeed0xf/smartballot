/**
 * Fix-Candidate-Associations Script
 * 
 * This script fixes the associations between candidates and elections in the database.
 * It ensures that each candidate has the proper 'election' field set.
 * 
 * Usage:
 * - Run with node: node src/scripts/fix-candidate-associations.js
 */

const mongoose = require('mongoose');
const Election = require('../models/election.model');
const Candidate = require('../models/candidate.model');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/votesure';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    runMigration();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

async function runMigration() {
  try {
    console.log('Starting migration to fix candidate-election associations...');
    
    // Get all elections
    const elections = await Election.find({});
    console.log(`Found ${elections.length} elections`);
    
    let totalCandidates = 0;
    let totalFixed = 0;
    
    // Process each election
    for (const election of elections) {
      console.log(`\nProcessing election: ${election.title || election.name} (${election._id})`);
      
      // Find candidates by election type and region
      const typeQuery = { electionType: election.type };
      if (election.region) {
        typeQuery.region = election.region;
      }
      
      console.log('Finding candidates by type/region query:', typeQuery);
      
      const candidatesByType = await Candidate.find(typeQuery);
      console.log(`Found ${candidatesByType.length} candidates matching type/region`);
      
      // Find candidates that already have the election reference
      const candidatesWithRef = await Candidate.find({ election: election._id });
      console.log(`Found ${candidatesWithRef.length} candidates already with correct election reference`);
      
      // Create a set of IDs for candidates that already have the reference
      const existingIds = new Set();
      candidatesWithRef.forEach(c => existingIds.add(c._id.toString()));
      
      // Filter to just candidates needing updates
      const candidatesToFix = candidatesByType.filter(c => !existingIds.has(c._id.toString()));
      console.log(`Found ${candidatesToFix.length} candidates that need fixing`);
      
      totalCandidates += candidatesByType.length;
      totalFixed += candidatesToFix.length;
      
      // Update those candidates
      if (candidatesToFix.length > 0) {
        for (const candidate of candidatesToFix) {
          console.log(`Fixing candidate ${candidate._id}: ${candidate.firstName} ${candidate.lastName}`);
          
          candidate.election = election._id;
          candidate.updatedAt = Date.now();
          
          await candidate.save();
        }
        
        console.log(`Fixed ${candidatesToFix.length} candidates for election ${election.title || election.name}`);
      }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Total elections processed: ${elections.length}`);
    console.log(`Total candidates found: ${totalCandidates}`);
    console.log(`Total candidates fixed: ${totalFixed}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Handle shutting down
process.on('SIGINT', () => {
  mongoose.disconnect().then(() => {
    console.log('Mongoose disconnected through app termination');
    process.exit(0);
  });
}); 