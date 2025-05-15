// Modified endpoint to complete approval process and send email
router.put('/voters/:voterId/approve-complete', auth, adminAuth, async (req, res) => {
  try {
    const { txHash, voterAddress, blockchainSuccess, skipBlockchainUpdate } = req.body;
    
    // Find the voter
    const voter = await Voter.findById(req.params.voterId);
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    // Set voter as approved in the database
    voter.status = 'approved';
    voter.walletAddress = voterAddress;
    
    // Record blockchain transaction details if provided
    if (txHash && !skipBlockchainUpdate) {
      voter.blockchainTxHash = txHash;
      voter.blockchainRegistered = true;
    }
    
    await voter.save();
    
    // Send approval email regardless of blockchain status
    try {
      // Find user to get email
      const user = await User.findOne({ voterId: voter._id });
      if (user && user.email) {
        await sendApprovalEmail(user.email, voter);
        console.log(`Approval email sent to ${user.email}`);
      } else {
        console.log('User email not found, approval email not sent');
      }
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the request if email sending fails
    }
    
    return res.status(200).json({
      message: 'Voter approval completed successfully',
      voter: {
        id: voter._id,
        status: voter.status,
        blockchainRegistered: voter.blockchainRegistered
      }
    });
  } catch (error) {
    console.error('Error completing voter approval:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}); 