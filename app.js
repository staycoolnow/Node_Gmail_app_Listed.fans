const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// Client ID and client secret are obtained from the Google Cloud Console
const CLIENT_ID = 'Client_id';
const CLIENT_SECRET = 'client_secert';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = 'refresh_token';

// Set up OAuth2 client with the above credentials
const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Set up the Gmail API client
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Main function to check for new emails and send replies
async function checkEmailsAndSendReplies() {
  try {
    const messages = await gmail.users.messages.list({ userId: 'me' });

    messages.data.messages.forEach(async (message) => {
      // Check if the email has no prior replies
      const threadId = message.threadId;
      const thread = await gmail.users.threads.get({ userId: 'me', id: threadId });
      const isReplied = thread.data.messages.some(msg => msg.labelIds.includes('SENT'));
      if (!isReplied) {
        // Send a reply to the email
        const messageParts = [
          'From: "Your Name" <your@gmail.com>',
          `To: ${thread.data.messages[0].payload.headers.find(h => h.name === 'From').value}`,
          'Content-Type: text/html; charset=utf-8',
          '',
          '<p>Thanks for reaching out. I am currently out of office and will respond to your email as soon as possible.</p>',
        ];
        const messageBody = messageParts.join('\n');
        await gmail.users.messages.send({ userId: 'me', requestBody: { threadId: threadId, raw: Buffer.from(messageBody).toString('base64') } });

        // Add a label to the email thread
        const labelName = 'your@gmail.com';
        let labelId = null;
        const labels = await gmail.users.labels.list({ userId: 'me' });
        labels.data.labels.forEach(async (label) => {
          if (label.name === labelName) {
            labelId = label.id;
          }
        });
        if (labelId === null) {
          const newLabel = await gmail.users.labels.create({ userId: 'me', requestBody: { name: labelName } });
          labelId = newLabel.data.id;
        }
        await gmail.users.threads.modify({ userId: 'me', id: threadId, requestBody: { addLabelIds: [labelId] } });
      }
    });
  } catch (error) {
    console.log(`Error: ${error}`);
  }
}

// Call the function at random intervals between 45 to 120 seconds
setInterval(checkEmailsAndSendReplies, Math.floor(Math.random() * (120 - 45 + 1) + 45) * 1000);
