require('dotenv').config();
const sgMail = require('@sendgrid/mail');

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║   SENDGRID CONFIGURATION TEST           ║');
console.log('╚═══════════════════════════════════════════╝\n');

const apiKey = process.env.SENDGRID_API_KEY;
const senderEmail = process.env.SENDER_EMAIL;

console.log('API Key:', apiKey ? '✅ Set' : '❌ Missing');
console.log('Length:', apiKey?.length);
console.log('First 20 chars:', apiKey?.substring(0, 20));
console.log('Sender Email:', senderEmail, '\n');

sgMail.setApiKey(apiKey);

const msg = {
  to: senderEmail,
  from: { email: senderEmail, name: 'Career Portal Test' },
  subject: '✅ SendGrid Test',
  html: '<h2>✅ It works!</h2><p>SendGrid is configured correctly.</p>'
};

sgMail.send(msg)
  .then((response) => {
    console.log('✅ SUCCESS! Email sent!');
    console.log('Status:', response[0].statusCode);
    console.log('Check your inbox:', senderEmail, '\n');
  })
  .catch((error) => {
    console.error('❌ FAILED!');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.statusCode);
      console.error('Body:', JSON.stringify(error.response.body, null, 2));
    }
    console.log('');
  });