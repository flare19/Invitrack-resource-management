import nodemailer from 'nodemailer';

// PLACEHOLDER: fill SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL in .env
const transporter = nodemailer.createTransport({
  host: process.env['SMTP_HOST'],
  port: Number(process.env['SMTP_PORT']),
  secure: false, // true for port 465, false for 587 (Gmail SMTP)
  auth: {
    user: process.env['SMTP_USER'],
    pass: process.env['SMTP_PASS'],
  },
});

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env['SMTP_FROM'],
    to,
    subject: 'Reset your Invitrack password',
    text: `You requested a password reset. Use the link below (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}">Reset your password</a> (expires in 1 hour)</p>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env['SMTP_FROM'],
    to,
    subject: 'Verify your Invitrack email',
    text: `Please verify your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <p>Please verify your email address.</p>
      <p><a href="${verifyUrl}">Verify email</a> (expires in 24 hours)</p>
    `,
  });
}