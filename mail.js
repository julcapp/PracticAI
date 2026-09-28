'use strict';

const nodemailer = require('nodemailer');

const sender = process.env.MAIL_FROM || 'no-reply@practicai.ru';
const recipient = process.env.CONTACT_EMAIL || 'practic@practicai.ru';
const smtpUser = process.env.SMTP_USER || sender;
const smtpPassword = process.env.SMTP_PASSWORD;

let transport;
function getTransport() {
  if (!smtpPassword) return null;
  if (!transport) transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.hostland.ru',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: smtpUser, pass: smtpPassword },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  return transport;
}

async function notifyContact({ id, name, phone, email, message }) {
  const smtp = getTransport();
  if (!smtp) {
    console.warn('[mail] SMTP_PASSWORD is missing; contact remains in CRM without email notification');
    return false;
  }
  await smtp.sendMail({
    from: `PracticAI <${sender}>`,
    to: recipient,
    replyTo: email || undefined,
    subject: `Новое обращение #${id} — PracticAI`,
    text: `Новое обращение #${id}\n\nИмя: ${name}\nТелефон: ${phone}\nEmail: ${email || 'не указан'}\n\nСообщение:\n${message}\n\nОбращение также сохранено в CRM: https://practicai.ru/admin`,
  });
  return true;
}

module.exports = { notifyContact };
