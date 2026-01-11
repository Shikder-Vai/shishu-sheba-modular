const nodemailer = require("nodemailer");

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like 'yahoo', 'hotmail', etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address from .env file
    pass: process.env.EMAIL_PASS, // Your email password from .env file
  },
});

/**
 * Sends an email using the pre-configured transporter.
 *
 * @param {string} to The recipient's email address.
 * @param {string} subject The subject of the email.
 * @param {string} html The HTML body of the email.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 */
const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Shishu Sheba" <${process.env.EMAIL_USER}>`, // Sender address
      to, // List of receivers
      subject, // Subject line
      html, // HTML body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    // In a real app, you might want to throw the error to be handled by the caller
    // For now, we'll just log it to avoid crashing the server.
  }
};

module.exports = {
  sendEmail,
};
