import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email: string, otp: string, name: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"NexBill Support" <noreply@nexbill.com>',
    to: email,
    subject: '🔐 Reset Your NexBill Terminal Password - OTP Verification',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; font-family: sans-serif;">Nex<span style="color: #0ea5e9;">Bill</span></h2>
          <p style="margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700;">Terminal Verification Engine</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h3 style="color: #0f172a; font-size: 16px; font-weight: 700; margin-top: 0;">Password Reset Request</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">
            Hi ${name},<br><br>
            A password reset request was initiated for your NexBill terminal account. Please use the following 6-digit verification code (OTP) to complete the reset process:
          </p>
        </div>
        
        <div style="text-align: center; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f172a; padding-left: 8px;">${otp}</span>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b; font-weight: 550;">This code is valid for 10 minutes. Do not share it with anyone.</p>
        </div>
        
        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
            If you did not request this code, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
