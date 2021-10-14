let nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, 
  auth: {
    user: process.env.EMAIL_FORM,
    pass: process.env.EMAIL_PWD
  }
});

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FORM }) {
  return await transporter.sendMail({ from, to, subject, html });
}


module.exports = sendEmail;