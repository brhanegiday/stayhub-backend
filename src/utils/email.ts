import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        const mailOptions = {
            from: `${process.env.FROM_NAME || 'StayHub'} <${process.env.FROM_EMAIL || process.env.EMAIL_USERNAME}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Email sent to ${options.to}`);
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    async sendEmailVerification(email: string, name: string, token: string): Promise<void> {
        const verificationUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: #007bff;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Welcome to StayHub, ${name}!</h2>
                    <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
                    <p><a href="${verificationUrl}" class="button">Verify Email</a></p>
                    <p>Or copy and paste this link in your browser:</p>
                    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                    <p>This verification link will expire in 10 minutes.</p>
                    <div class="footer">
                        <p>If you didn't create an account, please ignore this email.</p>
                        <p>&copy; ${new Date().getFullYear()} StayHub. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Verify Your Email - StayHub',
            text: `Hi ${name},\n\nThank you for signing up for StayHub. Please verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in 10 minutes.\n\nIf you didn't create an account, please ignore this email.`,
            html,
        });
    }

    async sendPasswordReset(email: string, name: string, token: string): Promise<void> {
        const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: #dc3545;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
                    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Password Reset Request</h2>
                    <p>Hi ${name},</p>
                    <p>You recently requested to reset your password for your StayHub account. Click the button below to reset it:</p>
                    <p><a href="${resetUrl}" class="button">Reset Password</a></p>
                    <p>Or copy and paste this link in your browser:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <div class="warning">
                        <strong>Security Notice:</strong> This password reset link will expire in 10 minutes. If you didn't request this reset, please ignore this email and your password will remain unchanged.
                    </div>
                    <div class="footer">
                        <p>For security reasons, we recommend using a strong, unique password.</p>
                        <p>&copy; ${new Date().getFullYear()} StayHub. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Reset Your Password - StayHub',
            text: `Hi ${name},\n\nYou recently requested to reset your password. Please reset your password by visiting: ${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you didn't request this reset, please ignore this email.`,
            html,
        });
    }

    async sendPasswordChangeNotification(email: string, name: string): Promise<void> {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Password Changed Successfully</h2>
                    <p>Hi ${name},</p>
                    <div class="success">
                        Your StayHub account password has been successfully changed.
                    </div>
                    <p>If you didn't make this change, please contact our support team immediately.</p>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} StayHub. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Password Changed - StayHub',
            text: `Hi ${name},\n\nYour StayHub account password has been successfully changed.\n\nIf you didn't make this change, please contact our support team immediately.`,
            html,
        });
    }
}

export const emailService = new EmailService();