const nodemailer = require('nodemailer');

// Create transporter
let transporter = null;
let useEthereal = false;

const createTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  // Priority 1: Use configured SMTP settings (works in both dev and production)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Verify transporter
      await transporter.verify();
      console.log('📧 Email Service: Using Configured SMTP');
      console.log('📧 SMTP Host:', process.env.SMTP_HOST);
      console.log('📧 SMTP User:', process.env.SMTP_USER);
      console.log('✅ SMTP Connection Verified');
      return transporter;
    } catch (error) {
      console.error('❌ Failed to connect to configured SMTP:', error.message);
      console.log('⚠️  Falling back to Ethereal Email...');
      transporter = null; // Reset to try Ethereal
    }
  }

  // Priority 2: Use Ethereal Email (test service) as fallback
  try {
    // Create a test account automatically
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    useEthereal = true;
    console.log('📧 Email Service: Using Ethereal Email (Test/Preview Mode)');
    console.log('📧 Test Account:', testAccount.user);
    console.log('⚠️  WARNING: Emails will NOT be delivered to real inboxes!');
    console.log('💡 To send real emails, configure SMTP settings (see documentation below)');
    console.log('');
    console.log('📝 Add these to your environment or .env file:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_USER=your-email@gmail.com');
    console.log('   SMTP_PASSWORD=your-app-password');
    console.log('   FROM_EMAIL=noreply@sanjayhardware.com');
    console.log('');
    
    return transporter;
  } catch (error) {
    console.error('❌ Failed to create Ethereal test account:', error.message);
    // Fallback to console logging if everything fails
    return null;
  }
};

// Send email function
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const emailTransporter = await createTransporter();

    if (!emailTransporter) {
      // Fallback: Log email to console
      console.log('\n' + '='.repeat(80));
      console.log('📧 EMAIL (Console Fallback - SMTP not configured)');
      console.log('='.repeat(80));
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Text:', text);
      if (html) {
        console.log('HTML: [HTML content available]');
      }
      console.log('='.repeat(80) + '\n');
      return { success: true, message: 'Email logged to console (SMTP not configured)' };
    }

    // Send email
    const info = await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || '"Sanjay Hardware" <noreply@sanjayhardware.com>',
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ EMAIL SENT SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('Message ID:', info.messageId);
    console.log('To:', to);
    console.log('Subject:', subject);
    
    // If using Ethereal, show preview URL and warning
    if (useEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('\n⚠️  USING ETHEREAL EMAIL (PREVIEW MODE)');
        console.log('📬 Email Preview URL:');
        console.log('🔗', previewUrl);
        console.log('\n❌ Email was NOT delivered to:', to);
        console.log('💡 This is a test/preview only. Configure SMTP to send real emails.');
      }
    } else {
      console.log('✅ Email delivered to:', to);
    }
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info) || null
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      message: 'Failed to send email',
      error: error.message
    };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetUrl, userName) => {
  const subject = 'Password Reset Request - Sanjay Hardware';
  
  const text = `
Hello ${userName || 'User'},

You recently requested to reset your password for your Sanjay Hardware account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
Sanjay Hardware Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .footer {
      background: #f9fafb;
      padding: 20px 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 10px 10px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SH</div>
    <h1>Sanjay Hardware</h1>
    <p style="margin: 5px 0 0 0;">Inventory Management System</p>
  </div>
  
  <div class="content">
    <h2>Password Reset Request</h2>
    <p>Hello ${userName || 'User'},</p>
    <p>You recently requested to reset your password for your Sanjay Hardware account.</p>
    <p>Click the button below to reset your password:</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    
    <p>Or copy and paste this link in your browser:</p>
    <p style="background: white; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px;">
      ${resetUrl}
    </p>
    
    <div class="warning">
      <strong>⏰ Important:</strong> This link will expire in 1 hour.
    </div>
    
    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
      If you did not request a password reset, please ignore this email or contact support if you have concerns.
    </p>
  </div>
  
  <div class="footer">
    <p>© ${new Date().getFullYear()} Sanjay Hardware. All rights reserved.</p>
    <p>This is an automated email. Please do not reply to this message.</p>
  </div>
</body>
</html>
  `.trim();

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail
};

