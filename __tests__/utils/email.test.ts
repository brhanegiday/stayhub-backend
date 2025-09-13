import nodemailer from "nodemailer";

// Create a proper mock for the transporter
const mockSendMail = jest.fn();
const mockTransporter = {
    sendMail: mockSendMail,
};

// Mock nodemailer at the top level
jest.mock("nodemailer", () => ({
    createTransport: jest.fn(() => mockTransporter),
}));

// Now import the email service after the mock is set up
import { emailService } from "../../src/utils/email";

describe("EmailService", () => {
    const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

    beforeEach(() => {
        // Set up environment variables
        process.env.EMAIL_SERVICE = "gmail";
        process.env.EMAIL_USERNAME = "test@stayhub.com";
        process.env.EMAIL_PASSWORD = "test-password";
        process.env.FROM_NAME = "StayHub";
        process.env.FROM_EMAIL = "noreply@stayhub.com";
        process.env.CLIENT_URL = "http://localhost:3000";

        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.EMAIL_SERVICE;
        delete process.env.EMAIL_USERNAME;
        delete process.env.EMAIL_PASSWORD;
        delete process.env.FROM_NAME;
        delete process.env.FROM_EMAIL;
        delete process.env.CLIENT_URL;
    });

    // Note: Constructor testing is omitted because the EmailService instance
    // is created during module import, before Jest mocks can be set up properly.

    describe("sendEmail", () => {
        const mockEmailOptions = {
            to: "recipient@example.com",
            subject: "Test Subject",
            text: "Test message",
            html: "<p>Test message</p>",
        };

        it("should send email successfully", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            await emailService.sendEmail(mockEmailOptions);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: "StayHub <noreply@stayhub.com>",
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Test message",
                html: "<p>Test message</p>",
            });

            expect(consoleSpy).toHaveBeenCalledWith("Email sent to recipient@example.com");
            consoleSpy.mockRestore();
        });

        it("should handle email options without html", async () => {
            const optionsWithoutHtml = {
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Test message",
            };
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendEmail(optionsWithoutHtml);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: "StayHub <noreply@stayhub.com>",
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Test message",
                html: undefined,
            });
        });

        it("should throw error when email sending fails", async () => {
            const mockError = new Error("SMTP connection failed");
            mockSendMail.mockRejectedValue(mockError);
            const consoleSpy = jest.spyOn(console, "error").mockImplementation();

            await expect(emailService.sendEmail(mockEmailOptions)).rejects.toThrow("SMTP connection failed");

            expect(consoleSpy).toHaveBeenCalledWith("Error sending email:", mockError);
            consoleSpy.mockRestore();
        });
    });

    describe("sendEmailVerification", () => {
        const email = "user@example.com";
        const name = "John Doe";
        const token = "verification-token-123";

        it("should send email verification with correct content", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendEmailVerification(email, name, token);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "StayHub <noreply@stayhub.com>",
                    to: email,
                    subject: "Verify Your Email - StayHub",
                    text: expect.stringContaining("Hi John Doe"),
                    html: expect.stringContaining("Welcome to StayHub, John Doe!"),
                })
            );
        });

        it("should include correct verification URL in email", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendEmailVerification(email, name, token);

            const expectedUrl = "http://localhost:3000/auth/verify-email?token=verification-token-123";

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining(expectedUrl),
                    html: expect.stringContaining(expectedUrl),
                })
            );
        });

        it("should include expiration warning in email", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendEmailVerification(email, name, token);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("This link will expire in 10 minutes"),
                    html: expect.stringContaining("This verification link will expire in 10 minutes"),
                })
            );
        });

        it("should include current year in footer", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendEmailVerification(email, name, token);

            const currentYear = new Date().getFullYear().toString();

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining(`&copy; ${currentYear} StayHub`),
                })
            );
        });
    });

    describe("sendPasswordReset", () => {
        const email = "user@example.com";
        const name = "Jane Smith";
        const token = "reset-token-456";

        it("should send password reset email with correct content", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordReset(email, name, token);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "StayHub <noreply@stayhub.com>",
                    to: email,
                    subject: "Reset Your Password - StayHub",
                    text: expect.stringContaining("Hi Jane Smith"),
                    html: expect.stringContaining("Hi Jane Smith"),
                })
            );
        });

        it("should include correct reset URL in email", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordReset(email, name, token);

            const expectedUrl = "http://localhost:3000/auth/reset-password?token=reset-token-456";

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining(expectedUrl),
                    html: expect.stringContaining(expectedUrl),
                })
            );
        });

        it("should include security notice in email", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordReset(email, name, token);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("This link will expire in 10 minutes"),
                    html: expect.stringContaining("Security Notice"),
                })
            );
        });

        it("should have red button styling for reset action", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordReset(email, name, token);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining("background-color: #dc3545"),
                })
            );
        });
    });

    describe("sendPasswordChangeNotification", () => {
        const email = "user@example.com";
        const name = "Bob Johnson";

        it("should send password change notification with correct content", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordChangeNotification(email, name);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "StayHub <noreply@stayhub.com>",
                    to: email,
                    subject: "Password Changed - StayHub",
                    text: expect.stringContaining("Hi Bob Johnson"),
                    html: expect.stringContaining("Hi Bob Johnson"),
                })
            );
        });

        it("should include success message", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordChangeNotification(email, name);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("password has been successfully changed"),
                    html: expect.stringContaining("password has been successfully changed"),
                })
            );
        });

        it("should include security warning", async () => {
            mockSendMail.mockResolvedValue(undefined);

            await emailService.sendPasswordChangeNotification(email, name);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("contact our support team immediately"),
                    html: expect.stringContaining("contact our support team immediately"),
                })
            );
        });

        it("should include automated message notice", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordChangeNotification(email, name);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining("This is an automated message"),
                })
            );
        });

        it("should have success styling", async () => {
            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendPasswordChangeNotification(email, name);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining("background-color: #d4edda"),
                })
            );
        });
    });

    describe("environment variable handling", () => {
        it("should handle missing FROM_NAME and FROM_EMAIL", async () => {
            // Save original values
            const originalFromName = process.env.FROM_NAME;
            const originalFromEmail = process.env.FROM_EMAIL;

            delete process.env.FROM_NAME;
            delete process.env.FROM_EMAIL;

            mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

            await emailService.sendEmail({
                to: "test@example.com",
                subject: "Test",
                text: "Test message",
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "StayHub <test@stayhub.com>",
                })
            );

            // Restore original values
            if (originalFromName) process.env.FROM_NAME = originalFromName;
            if (originalFromEmail) process.env.FROM_EMAIL = originalFromEmail;
        });
    });

    describe("error handling", () => {
        it("should propagate email sending errors", async () => {
            const mockError = new Error("Network timeout");
            mockSendMail.mockRejectedValue(mockError);

            await expect(emailService.sendEmailVerification("test@example.com", "Test User", "token")).rejects.toThrow(
                "Network timeout"
            );
        });
    });
});
