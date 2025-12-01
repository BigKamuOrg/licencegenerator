const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  MAIL_GROUP
} = process.env;

const transporter =
  SMTP_HOST && SMTP_PORT
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth:
          SMTP_USER && SMTP_PASS
            ? {
                user: SMTP_USER,
                pass: SMTP_PASS
              }
            : undefined
      })
    : null;

async function sendLicenseEmail(to, subject, text) {
  if (!transporter) {
    const error = new Error("SMTP not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  try {
    const mailOptions = {
      from: MAIL_FROM || SMTP_USER,
      to,
      subject,
      text
    };

    // Eğer grup mail adresi tanımlıysa BCC olarak ekle
    if (MAIL_GROUP && MAIL_GROUP.trim()) {
      mailOptions.bcc = MAIL_GROUP.trim();
    }

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Email send error:", err);
    throw err;
  }
}

module.exports = { sendLicenseEmail };


