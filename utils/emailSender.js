require('dotenv').config(); 
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, htmlContent) => {
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

        // 🔹 Signature UnmindCare (ajoutée automatiquement à tous les emails)
        const signature = `
            <hr>
            <p style="font-size:14px;color:#555;">Cordialement,<br>
            <strong>EspritCare</strong><br>
            <a href="http://EspritCare.com" style="color:#007bff;">www.EspritCare.com</a></p>
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/ff/Logo_ESPRIT_Ariana.jpg" alt="EspritCare Logo" width="150">
        `;

        let mailOptions = {
            from: `"EspritCare" <${process.env.EMAIL_USER}>`, // ✅ Nom de l'expéditeur
            to: to,
            subject: subject,
            html: htmlContent + signature // ✅ Ajoute la signature à l’email
        };

        let info = await transporter.sendMail(mailOptions);
        console.log("📧 E-mail envoyé avec succès :", info.response);
    } catch (error) {
        console.error("❌ Erreur d'envoi d'e-mail :", error);
    }
};

module.exports = sendEmail;
