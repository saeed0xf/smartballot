const Slot = require('../models/slot.model');
const Election = require('../models/election.model');
const Voter = require('../models/voter.model');
const Candidate = require('../models/candidate.model');
const Vote = require('../models/vote.model');
const { getElectionStatusFromBlockchain } = require('../utils/blockchain.util');

// Get all slots
exports.getAllSlots = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find slots for this officer
    const slots = await Slot.find({ officer: userId }).sort({ date: 1, startTime: 1 });
    
    res.json({ slots });
  } catch (error) {
    console.error('Get all slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get slot details
exports.getSlotDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { slotId } = req.params;
    
    // Find slot
    const slot = await Slot.findOne({ _id: slotId, officer: userId });
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    res.json({ slot });
  } catch (error) {
    console.error('Get slot details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add slot
exports.addSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, date, startTime, endTime, location } = req.body;
    
    // Validate required fields
    if (!title || !date || !startTime || !endTime || !location) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Create new slot
    const slot = new Slot({
      title,
      description: description || '',
      date: new Date(date),
      startTime,
      endTime,
      location,
      officer: userId,
      status: 'scheduled'
    });
    
    await slot.save();
    
    res.status(201).json({
      message: 'Slot added successfully',
      slot: {
        id: slot._id,
        title: slot.title,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        status: slot.status
      }
    });
  } catch (error) {
    console.error('Add slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update slot
exports.updateSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { slotId } = req.params;
    const { title, description, date, startTime, endTime, location, status, notes } = req.body;
    
    // Find slot
    const slot = await Slot.findOne({ _id: slotId, officer: userId });
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    // Update slot
    if (title) slot.title = title;
    if (description !== undefined) slot.description = description;
    if (date) slot.date = new Date(date);
    if (startTime) slot.startTime = startTime;
    if (endTime) slot.endTime = endTime;
    if (location) slot.location = location;
    if (status && ['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      slot.status = status;
    }
    if (notes !== undefined) slot.notes = notes;
    
    await slot.save();
    
    res.json({
      message: 'Slot updated successfully',
      slot: {
        id: slot._id,
        title: slot.title,
        description: slot.description,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        status: slot.status,
        notes: slot.notes
      }
    });
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete slot
exports.deleteSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { slotId } = req.params;
    
    // Find and delete slot
    const slot = await Slot.findOneAndDelete({ _id: slotId, officer: userId });
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get election monitoring data
exports.getMonitoringData = async (req, res) => {
  try {
    // Find active election
    const election = await Election.findOne({ isActive: true });
    
    // Get blockchain status
    const blockchainStatus = await getElectionStatusFromBlockchain();
    
    // Get voter statistics
    const totalVoters = await Voter.countDocuments({ status: 'approved' });
    const votedCount = await Vote.countDocuments();
    
    // Get candidate statistics
    const candidates = await Candidate.find().sort({ voteCount: -1 });
    
    // Calculate voting percentage
    const votingPercentage = totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;
    
    res.json({
      election: election ? {
        id: election._id,
        title: election.title,
        startDate: election.startDate,
        isActive: election.isActive
      } : null,
      statistics: {
        totalVoters,
        votedCount,
        votingPercentage: Math.round(votingPercentage * 100) / 100,
        remainingVoters: totalVoters - votedCount
      },
      candidates: candidates.map(c => ({
        id: c._id,
        name: c.name,
        party: c.party,
        voteCount: c.voteCount
      })),
      blockchainStatus: blockchainStatus.success ? blockchainStatus.data : null
    });
  } catch (error) {
    console.error('Get monitoring data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 