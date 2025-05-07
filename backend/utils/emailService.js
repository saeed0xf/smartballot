const sendApprovalEmail = async (email, voter) => {
  // Your email sending logic here
  const subject = 'Your Voter Registration Has Been Approved';
  const text = `
    Dear Voter,
    
    Your voter registration has been approved. You can now login to your account and participate in active elections.
    
    Your VoterId: ${voter.voterId}
    
    Thank you for participating in our democratic process!
    
    Regards,
    The VoteSure Team
  `;
  
  try {
    await sendEmail(email, subject, text);
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
}; 