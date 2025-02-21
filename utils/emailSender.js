require('dotenv').config();
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: html
        };

        let info = await transporter.sendMail(mailOptions);
        console.log("📧 E-mail envoyé : ", info.response);
    } catch (error) {
        console.error("❌ Erreur d'envoi d'e-mail :", error);
    }
};

module.exports = sendEmail;
