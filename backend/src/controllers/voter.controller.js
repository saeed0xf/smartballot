const User = require('../models/user.model');
const Voter = require('../models/voter.model');
const { registerVoterOnBlockchain } = require('../utils/blockchain.util');
const path = require('path');
const fs = require('fs');

// Register voter profile
exports.registerVoter = async (req, res) => {
  try {
    console.log('Starting voter registration process');
    console.log('Request body keys:', Object.keys(req.body));
    
    // Log file information - express-fileupload puts files in req.files
    if (req.files) {
      console.log('Files detected in request.files:', Object.keys(req.files));
      if (req.files.voterIdImage) {
        const file = req.files.voterIdImage;
        console.log('Voter ID image details:', {
          name: file.name,
          size: file.size,
          mimetype: file.mimetype,
          md5: file.md5
        });
      }
      if (req.files.faceImage) {
        const file = req.files.faceImage;
        console.log('Face image details:', {
          name: file.name,
          size: file.size,
          mimetype: file.mimetype,
          md5: file.md5
        });
      }
    } else {
      console.log('No req.files object found');
    }
    
    // Also check if using multer (req.file)
    if (req.file) {
      console.log('File found in req.file (multer):', req.file);
    } else {
      console.log('No req.file found (multer not being used)');
    }
    
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }
    
    // Check if wallet address is already registered
    const existingUser = await User.findOne({ walletAddress });
    let userId;
    
    if (existingUser) {
      // Use existing user
      userId = existingUser._id;
      
      // Check if voter profile already exists
      const existingVoter = await Voter.findOne({ user: userId });
      if (existingVoter) {
        return res.status(400).json({ message: 'Voter profile already exists for this wallet address' });
      }
    } else {
      try {
        // Create new user with only the required fields
        const newUser = new User({
          walletAddress,
          role: 'voter'
        });
        
        await newUser.save();
        userId = newUser._id;
        console.log('New user created with ID:', userId);
      } catch (userError) {
        console.error('Error creating user:', userError);
        return res.status(400).json({ 
          message: 'Error creating user account',
          details: userError.message
        });
      }
    }
    
    // Get form data
    const {
      firstName,
      middleName,
      lastName,
      fatherName,
      gender,
      age,
      dateOfBirth,
      email,
      voterId,
      pincode
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !fatherName || !gender || !dateOfBirth || !email || !voterId || !pincode) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Validate age (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    
    if (calculatedAge < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old to register as a voter' });
    }
    
    // Check if voter ID is already registered
    const voterIdExists = await Voter.findOne({ voterId });
    if (voterIdExists) {
      return res.status(400).json({ message: 'Voter ID is already registered' });
    }
    
    // Process voter ID image - check in both places where it might be
    let voterIdImagePath = null;
    
    // Check if file is coming via express-fileupload
    if (req.files && req.files.voterIdImage) {
      const voterIdImage = req.files.voterIdImage;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `voterIdImage-${uniqueSuffix}${path.extname(voterIdImage.name)}`;
      const uploadPath = path.join(__dirname, '../../uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      try {
        // Move the file to the uploads directory
        await voterIdImage.mv(uploadPath);
        voterIdImagePath = `/uploads/${filename}`;
        console.log('File uploaded successfully to:', uploadPath);
      } catch (fileError) {
        console.error('Error moving uploaded file:', fileError);
        return res.status(500).json({ 
          message: 'Error uploading voter ID image', 
          details: fileError.message 
        });
      }
    } 
    // Check if file is coming via multer
    else if (req.file) {
      voterIdImagePath = `/uploads/${req.file.filename}`;
      console.log('Using file uploaded via multer:', voterIdImagePath);
    } 
    // No file found
    else {
      console.error('No voter ID image found in request');
      return res.status(400).json({ message: 'Voter ID image is required' });
    }
    
    // Process face image
    let faceImagePath = null;
    
    // Check if face image is coming via express-fileupload
    if (req.files && req.files.faceImage) {
      const faceImage = req.files.faceImage;
      console.log('Face image details:', {
        name: faceImage.name,
        size: faceImage.size,
        mimetype: faceImage.mimetype,
        md5: faceImage.md5
      });
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `faceImage-${uniqueSuffix}${path.extname(faceImage.name)}`;
      const uploadPath = path.join(__dirname, '../../uploads', filename);
      
      try {
        // Move the file to the uploads directory
        await faceImage.mv(uploadPath);
        faceImagePath = `/uploads/${filename}`;
        console.log('Face image uploaded successfully to:', uploadPath);
      } catch (fileError) {
        console.error('Error moving uploaded face image:', fileError);
        return res.status(500).json({ 
          message: 'Error uploading face image', 
          details: fileError.message 
        });
      }
    } else {
      console.error('No face image found in request');
      return res.status(400).json({ message: 'Face image is required' });
    }
    
    // Create new voter profile
    const voter = new Voter({
      user: userId,
      firstName,
      middleName,
      lastName,
      fatherName,
      gender,
      age: calculatedAge, // Use calculated age
      dateOfBirth,
      email,
      voterId,
      pincode,
      voterIdImage: voterIdImagePath,
      faceImage: faceImagePath,
      status: 'pending'
    });
    
    console.log('Saving voter profile with voter ID image path:', voterIdImagePath);
    console.log('Saving voter profile with face image path:', faceImagePath);
    await voter.save();
    console.log('Voter profile saved successfully');
    
    // Register voter on blockchain
    console.log('Registering voter on blockchain with address:', walletAddress);
    const blockchainResult = await registerVoterOnBlockchain(walletAddress);
    
    if (blockchainResult.success) {
      // Update voter with blockchain transaction hash
      voter.blockchainRegistered = true;
      voter.blockchainTxHash = blockchainResult.txHash;
      await voter.save();
      console.log('Blockchain registration successful with hash:', blockchainResult.txHash);
    } else {
      console.log('Blockchain registration not successful but continuing with registration');
    }
    
    res.status(201).json({
      message: 'Voter registration submitted successfully',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        lastName: voter.lastName,
        status: voter.status,
        walletAddress
      }
    });
  } catch (error) {
    console.error('Voter registration error:', error);
    res.status(500).json({ 
      message: 'Server error during voter registration', 
      details: error.message 
    });
  }
};

// Get voter profile
exports.getVoterProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find voter profile
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Get user for wallet address
    const user = await User.findById(userId);
    
    res.json({
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        fatherName: voter.fatherName,
        gender: voter.gender,
        age: voter.age,
        dateOfBirth: voter.dateOfBirth,
        email: voter.email,
        pincode: voter.pincode,
        voterId: voter.voterId,
        voterIdImage: voter.voterIdImage,
        status: voter.status,
        rejectionReason: voter.rejectionReason,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Get voter profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update voter profile
exports.updateVoterProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find voter profile
    const voter = await Voter.findOne({ user: userId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter profile not found' });
    }
    
    // Check if voter is already approved
    if (voter.status === 'approved') {
      return res.status(400).json({ message: 'Cannot update approved voter profile' });
    }
    
    // Get form data
    const {
      firstName,
      middleName,
      lastName,
      fatherName,
      gender,
      dateOfBirth,
      email,
      voterId,
      pincode
    } = req.body;
    
    // Update voter profile
    if (firstName) voter.firstName = firstName;
    if (middleName !== undefined) voter.middleName = middleName;
    if (lastName) voter.lastName = lastName;
    if (fatherName) voter.fatherName = fatherName;
    if (gender) voter.gender = gender;
    if (pincode) voter.pincode = pincode;
    
    // Update age if date of birth changes
    if (dateOfBirth) {
      voter.dateOfBirth = dateOfBirth;
      
      // Recalculate age
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      // Validate age (must be 18+)
      if (calculatedAge < 18) {
        return res.status(400).json({ message: 'You must be at least 18 years old to register as a voter' });
      }
      
      voter.age = calculatedAge;
    }
    
    if (email) voter.email = email;
    
    // Check if voter ID is being changed and if it's already registered
    if (voterId && voterId !== voter.voterId) {
      const voterIdExists = await Voter.findOne({ voterId, _id: { $ne: voter._id } });
      if (voterIdExists) {
        return res.status(400).json({ message: 'Voter ID is already registered' });
      }
      voter.voterId = voterId;
    }
    
    // Update image if provided
    if (req.file) {
      voter.voterIdImage = `/uploads/${req.file.filename}`;
    }
    
    // If voter was rejected, set status back to pending
    if (voter.status === 'rejected') {
      voter.status = 'pending';
      voter.rejectionReason = null;
    }
    
    await voter.save();
    
    res.json({
      message: 'Voter profile updated successfully',
      voter: {
        id: voter._id,
        firstName: voter.firstName,
        middleName: voter.middleName,
        lastName: voter.lastName,
        fatherName: voter.fatherName,
        gender: voter.gender,
        age: voter.age,
        dateOfBirth: voter.dateOfBirth,
        email: voter.email,
        pincode: voter.pincode,
        voterId: voter.voterId,
        voterIdImage: voter.voterIdImage,
        status: voter.status
      }
    });
  } catch (error) {
    console.error('Update voter profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 