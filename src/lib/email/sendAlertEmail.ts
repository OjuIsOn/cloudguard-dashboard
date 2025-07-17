// // lib/email/sendAlertEmail.ts
// import nodemailer from 'nodemailer';

// interface AlertParams {
//   to: string;
//   resourceGroup: string;
// }

// /**
//  * Sends a budget-exceeded alert email.
//  */
// export async function sendAlertEmail({
//   to,
//   resourceGroup,
// }: AlertParams) {
//   // 1. Create transporter using SMTP settings from env
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,       // e.g. "smtp.sendgrid.net"
//     port: Number(process.env.SMTP_PORT), // e.g. 587
//     secure: process.env.SMTP_SECURE === 'true', // use TLS if true
//     auth: {
//       user: process.env.SMTP_USER,     // SMTP login user
//       pass: process.env.SMTP_PASS      // SMTP login password
//     }
//   });

//   // 2. Build your email message
//   const subject = `🚨 Budget Exceeded for ${resourceGroup}`;
//   const text = `
// Hello,

// Your Azure Resource Group "${resourceGroup}" has exceeded its budget.


// Please review your resources or enable auto-stop to shut down apps automatically.

// — Azora
//   `.trim();

//   // 3. Send it
//   const info = await transporter.sendMail({
//     from: `"Azora Alerts" <${process.env.SMTP_FROM}>`,
//     to,
//     subject,
//     text
//   });

//   console.log('Budget alert email sent:', info.messageId);
// }
