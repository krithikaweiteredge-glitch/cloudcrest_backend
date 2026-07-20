import nodemailer from "nodemailer";
import dns from "dns";

export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "no-reply@cloudcrest.com";

  console.log(`\n======================================================\n[EMAIL OTP] Verification code for ${email}: ${code}\n======================================================\n`);

  // Fallback if no SMTP credentials are provided
  if (!host || !user || !pass) {
    console.log(`[EMAIL OTP MOCK] SMTP configuration environment variables missing. OTP code logged to console above.`);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      // Force IPv4 lookup to bypass unreachable IPv6 connections on Render
      lookup: (hostname: string, options: any, callback: any) => {
        dns.lookup(hostname, { family: 4 }, callback);
      },
    } as any);

    await transporter.sendMail({
      from: `"Cloudcrest Compliance" <${from}>`,
      to: email,
      subject: `Your Cloudcrest BM Verification Code: ${code}`,
      text: `Hello,\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nCloudcrest Business Management Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1F4E78; text-align: center; margin-bottom: 5px;">Cloudcrest Compliance Desk</h2>
          <div style="font-size: 11px; color: #718096; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Business Management Private Limited</div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p>Hello,</p>
          <p>Your one-time verification code is:</p>
          <div style="background-color: #f7fafc; border: 1px solid #edf2f7; border-radius: 6px; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1F4E78; margin: 25px 0; font-family: monospace;">
            ${code}
          </div>
          <p style="color: #718096; font-size: 14px; line-height: 1.5;">This verification code will expire in 5 minutes. If you did not request this code, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p style="font-size: 11px; color: #a0aec0; text-align: center; line-height: 1.4;">
            Cloudcrest Business Management Private Limited<br/>
            Compliance Operations Desk · India
          </p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    return false;
  }
}
