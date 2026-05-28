import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ===============================
// 🔧 Create and configure transporter
// ===============================
const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL, // your Gmail
    pass: process.env.PASS,  // your App Password (not normal Gmail password)
  },
});

// Optional: verify connection at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail transporter setup failed:", error.message);
  } else {
    console.log("✅ Mail transporter ready to send messages");
  }
});

// ===============================
// 📩 Send OTP for password reset
// ===============================
export const sendOtpMail = async (to, otp) => {
  try {
    if (!to) throw new Error("Recipient email is required.");

    await transporter.sendMail({
      from: `"Vingo " <${process.env.EMAIL}>`,
      to,
      subject: "Reset Your Password",
      html: `
        <p>Your OTP for password reset is <b>${otp}</b>.</p>
        <p>This OTP will expire in <b>5 minutes</b>.</p>
      `,
    });

    console.log(`📧 Password reset OTP sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending password reset OTP:", error.message);
    throw new Error("Failed to send OTP email. " + error.message);
  }
};

// ===============================
// 📦 Send Delivery OTP
// ===============================
export const sendDeliveryOtpMail = async (user, otp) => {
  try {
    if (!user?.email) throw new Error("User email is missing.");

    await transporter.sendMail({
      from: `"Your Delivery Service" <${process.env.EMAIL}>`,
      to: user.email,
      subject: "Your Delivery Confirmation OTP",
      html: `
        <h3>Hello ${user.fullName || "Customer"},</h3>
        <p>Your OTP for confirming delivery is:</p>
        <h2 style="color:#2b6cb0;">${otp}</h2>
        <p>This OTP will expire in <b>5 minutes</b>.</p>
        <br/>
        <p>Thank you,<br/>Delivery Team</p>
      `,
    });

    console.log(`📦 Delivery OTP sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Error sending delivery OTP:", error.message);
    throw new Error("Failed to send delivery OTP. " + error.message);
  }
};
