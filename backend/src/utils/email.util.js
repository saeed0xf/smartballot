const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Create transporter
let transporter;
let brevoClient;

try {
  // Check if we're using Brevo/Sendinblue
  console.log('Checking email config - USE_BREVO:', process.env.USE_BREVO);
  
  if (process.env.USE_BREVO === 'true') {
    console.log('Setting up Brevo/Sendinblue services');
    
    // Setup SMTP transporter for Brevo
    transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.BREVO_EMAIL_USER || '88896d001@smtp-brevo.com', // Use from .env or fallback to provided value
        pass: process.env.BREVO_PASSWORD || 'r4XA5T8xvCPmpEnF'  // Use from .env or fallback to provided value
      }
    });
    
    console.log('Brevo SMTP transporter setup successful with user:', process.env.BREVO_EMAIL_USER || '88896d001@smtp-brevo.com');
    
    // Also setup API client as backup
    try {
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY;
      
      brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
      console.log('Brevo API client also setup as backup');
    } catch (apiError) {
      console.warn('Could not initialize Brevo API client:', apiError.message);
      console.log('Will rely solely on SMTP transporter');
    }
  } else {
    console.log('Setting up email transporter with service:', process.env.EMAIL_SERVICE);
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD // Use app password if available
      }
    });
    console.log('Regular email transporter setup successful');
  }
} catch (error) {
  console.error('Failed to setup email service:', error);
}

// Send voter approval email
const sendVoterApprovalEmail = async (email, firstName) => {
  try {
    if (!email) {
      console.warn('No email provided for voter approval notification');
      return false;
    }
    
    console.log(`Preparing to send approval email to ${email}`);
    
    // Get appropriate sender email
    const fromEmail = process.env.EMAIL_FROM || 'VoteSure <mbas8848@gmail.com>';
    const fromName = 'VoteSure';
    
    // HTML content for the email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4CAF50;">Registration Approved</h2>
        <p>Dear ${firstName},</p>
        <p>We are pleased to inform you that your voter registration has been approved. You can now log in to the VoteSure platform and participate in the upcoming election.</p>
        <p>Thank you for being a part of our democratic process.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;
    
    // Using SMTP transporter (primary method)
    if (transporter) {
      try {
        console.log('Sending approval email via SMTP transporter');
        
        const mailOptions = {
          from: fromEmail,
          to: email,
          subject: 'VoteSure - Voter Registration Approved',
          html: htmlContent
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`Approval email sent via SMTP: ${info.messageId}`);
        return true;
      } catch (smtpError) {
        console.error('Error sending via SMTP, falling back to API if available:', smtpError);
        
        // If SMTP fails and we have Brevo API client, try that next
        if (brevoClient && process.env.USE_BREVO === 'true') {
          console.log('Falling back to Brevo API for sending email');
          const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
          
          sendSmtpEmail.subject = 'VoteSure - Voter Registration Approved';
          sendSmtpEmail.htmlContent = htmlContent;
          sendSmtpEmail.sender = { 
            name: fromName, 
            email: process.env.BREVO_EMAIL_USER 
          };
          sendSmtpEmail.to = [{ email: email, name: firstName }];
          
          const result = await brevoClient.sendTransacEmail(sendSmtpEmail);
          console.log(`Brevo API response:`, result);
          return true;
        } else {
          throw smtpError; // Re-throw if we can't use the API fallback
        }
      }
    } else if (brevoClient && process.env.USE_BREVO === 'true') {
      // If transporter not available but API is, use API
      console.log('No SMTP transporter available, using Brevo API');
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.subject = 'VoteSure - Voter Registration Approved';
      sendSmtpEmail.htmlContent = htmlContent;
      sendSmtpEmail.sender = { 
        name: fromName, 
        email: process.env.BREVO_EMAIL_USER 
      };
      sendSmtpEmail.to = [{ email: email, name: firstName }];
      
      const result = await brevoClient.sendTransacEmail(sendSmtpEmail);
      console.log(`Brevo API response:`, result);
      return true;
    } else {
      throw new Error('No email service is available');
    }
  } catch (error) {
    console.error('Error sending approval email:', error);
    console.error('Email configuration:', {
      service: process.env.USE_BREVO === 'true' ? 'Brevo SMTP/API' : process.env.EMAIL_SERVICE,
      user: process.env.USE_BREVO === 'true' ? process.env.BREVO_EMAIL_USER : process.env.EMAIL_USER
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
    
    console.log(`Preparing to send rejection email to ${email}`);
    
    // Get appropriate sender email
    const fromEmail = process.env.EMAIL_FROM || 'VoteSure <mbas8848@gmail.com>';
    const fromName = 'VoteSure';
    
    // HTML content for the email
    const htmlContent = `
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
    `;
    
    // Using SMTP transporter (primary method)
    if (transporter) {
      try {
        console.log('Sending rejection email via SMTP transporter');
        
        const mailOptions = {
          from: fromEmail,
          to: email,
          subject: 'VoteSure - Voter Registration Rejected',
          html: htmlContent
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`Rejection email sent via SMTP: ${info.messageId}`);
        return true;
      } catch (smtpError) {
        console.error('Error sending via SMTP, falling back to API if available:', smtpError);
        
        // If SMTP fails and we have Brevo API client, try that next
        if (brevoClient && process.env.USE_BREVO === 'true') {
          console.log('Falling back to Brevo API for sending email');
          const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
          
          sendSmtpEmail.subject = 'VoteSure - Voter Registration Rejected';
          sendSmtpEmail.htmlContent = htmlContent;
          sendSmtpEmail.sender = { 
            name: fromName, 
            email: process.env.BREVO_EMAIL_USER 
          };
          sendSmtpEmail.to = [{ email: email, name: firstName }];
          
          const result = await brevoClient.sendTransacEmail(sendSmtpEmail);
          console.log(`Brevo API response:`, result);
          return true;
        } else {
          throw smtpError; // Re-throw if we can't use the API fallback
        }
      }
    } else if (brevoClient && process.env.USE_BREVO === 'true') {
      // If transporter not available but API is, use API
      console.log('No SMTP transporter available, using Brevo API');
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.subject = 'VoteSure - Voter Registration Rejected';
      sendSmtpEmail.htmlContent = htmlContent;
      sendSmtpEmail.sender = { 
        name: fromName, 
        email: process.env.BREVO_EMAIL_USER 
      };
      sendSmtpEmail.to = [{ email: email, name: firstName }];
      
      const result = await brevoClient.sendTransacEmail(sendSmtpEmail);
      console.log(`Brevo API response:`, result);
      return true;
    } else {
      throw new Error('No email service is available');
    }
  } catch (error) {
    console.error('Error sending rejection email:', error);
    console.error('Email configuration:', {
      service: process.env.USE_BREVO === 'true' ? 'Brevo SMTP/API' : process.env.EMAIL_SERVICE,
      user: process.env.USE_BREVO === 'true' ? process.env.BREVO_EMAIL_USER : process.env.EMAIL_USER
    });
    return false;
  }
};

module.exports = {
  sendVoterApprovalEmail,
  sendVoterRejectionEmail
}; 