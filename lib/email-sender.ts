import nodemailer from 'nodemailer';

// Create reusable transporter
function createTransporter() {
  // Use Titan Email SMTP settings
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.titan.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // Use TLS
    auth: {
      user: process.env.SMTP_USER || process.env.NEXT_PUBLIC_CONTACT_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export interface ContactEmailData {
  name: string;
  email: string;
  message: string;
}

export async function sendContactEmail(data: ContactEmailData) {
  const transporter = createTransporter();

  const { name, email, message } = data;

  // Email to admin
  const mailOptions = {
    from: `"Learningly Contact Form" <${process.env.SMTP_USER || 'contact@learningly.ai'}>`,
    to: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@learningly.ai',
    replyTo: email,
    subject: `New Contact Form Submission from ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              margin: -30px -30px 20px -30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .field {
              margin-bottom: 20px;
            }
            .field-label {
              font-weight: 600;
              color: #667eea;
              margin-bottom: 5px;
            }
            .field-value {
              background: white;
              padding: 12px;
              border-radius: 4px;
              border-left: 3px solid #667eea;
            }
            .message-box {
              background: white;
              padding: 15px;
              border-radius: 4px;
              border-left: 3px solid #667eea;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Contact Form Submission</h1>
            </div>

            <div class="field">
              <div class="field-label">Name:</div>
              <div class="field-value">${name}</div>
            </div>

            <div class="field">
              <div class="field-label">Email:</div>
              <div class="field-value"><a href="mailto:${email}">${email}</a></div>
            </div>

            <div class="field">
              <div class="field-label">Message:</div>
              <div class="message-box">${message}</div>
            </div>

            <div class="footer">
              <p>Received at: ${new Date().toLocaleString()}</p>
              <p>LearninglyAI Contact Form</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
New Contact Form Submission

Name: ${name}
Email: ${email}

Message:
${message}

---
Received at: ${new Date().toLocaleString()}
LearninglyAI Contact Form
    `.trim()
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Contact email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending contact email:', error);
    throw error;
  }
}

// Auto-reply to user (optional)
export async function sendContactConfirmation(email: string, name: string) {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Learningly AI" <${process.env.SMTP_USER || 'contact@learningly.ai'}>`,
    to: email,
    subject: 'Thank you for contacting Learningly AI',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              margin: -30px -30px 30px -30px;
              text-align: center;
            }
            .content {
              background: white;
              padding: 20px;
              border-radius: 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thanks for reaching out!</h1>
            </div>

            <div class="content">
              <p>Hi ${name},</p>

              <p>Thank you for contacting Learningly AI! We've received your message and our team will review it shortly.</p>

              <p>We typically respond within 24-48 hours during business days. If your inquiry is urgent, please don't hesitate to follow up.</p>

              <p>In the meantime, feel free to explore our platform:</p>

              <a href="https://learningly.ai" class="button">Visit Learningly AI</a>

              <p style="margin-top: 30px;">Best regards,<br>The Learningly AI Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw - confirmation email is optional
    return { success: false, error };
  }
}
