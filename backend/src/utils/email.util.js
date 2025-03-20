const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
let transporter;

try {
  console.log('Setting up email transporter with service:', process.env.EMAIL_SERVICE);
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD // Use app password if available
    }
  });
  console.log('Email transporter setup successful');
} catch (error) {
  console.error('Failed to setup email transporter:', error);
}

// Send voter approval email
const sendVoterApprovalEmail = async (email, firstName) => {
  try {
    if (!email) {
      console.warn('No email provided for voter approval notification');
      return false;
    }
    
    if (!transporter) {
      console.error('Email transporter not initialized');
      return false;
    }
    
    console.log(`Preparing to send approval email to ${email}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'VoteSure - Voter Registration Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4CAF50;">Registration Approved</h2>
          <p>Dear ${firstName},</p>
          <p>We are pleased to inform you that your voter registration has been approved. You can now log in to the VoteSure platform and participate in the upcoming election.</p>
          <p>Thank you for being a part of our democratic process.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    console.error('Email configuration:', {
      service: process.env.EMAIL_SERVICE,
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM,
      passwordProvided: !!process.env.EMAIL_PASSWORD || !!process.env.EMAIL_APP_PASSWORD
    });
    return false;
  }
};

// Send voter rejection email
const sendVoterRejectionEmail = async (email, firstName, reason) => {
  try {
    if (!email) {
      console.warn('No email provided for voter rejection notification');
      return false;
    }
    
    if (!transporter) {
      console.error('Email transporter not initialized');
      return false;
    }
    
    console.log(`Preparing to send rejection email to ${email}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'VoteSure - Voter Registration Rejected',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #F44336;">Registration Rejected</h2>
          <p>Dear ${firstName},</p>
          <p>We regret to inform you that your voter registration has been rejected for the following reason:</p>
          <p style="padding: 10px; background-color: #f9f9f9; border-left: 3px solid #F44336;">${reason}</p>
          <p>You can reapply by updating your information and submitting a new registration.</p>
          <p>If you have any questions, please contact our support team.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending rejection email:', error);
    console.error('Email configuration:', {
      service: process.env.EMAIL_SERVICE,
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM,
      passwordProvided: !!process.env.EMAIL_PASSWORD || !!process.env.EMAIL_APP_PASSWORD
    });
    return false;
  }
};

module.exports = {
  sendVoterApprovalEmail,
  sendVoterRejectionEmail
}; 