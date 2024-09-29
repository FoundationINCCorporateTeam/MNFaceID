const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { markdownToHtml } = require('./markdownparser'); // Import the parser

const app = express();
const PORT = 3000;
let userResponses = {}; // Store user responses

app.use(bodyParser.json());
app.use(express.static('public'));

const messagesFilePath = path.join(__dirname, 'messages.json');
const sessionsFilePath = path.join(__dirname, 'sessions.json');
// Endpoint to get a list of available Markdown articles
app.get('/articles', (req, res) => {
    const articlesDir = path.join(__dirname, 'articles');

    fs.readdir(articlesDir, (err, files) => {
        if (err) {
            console.error('Error reading articles directory:', err);
            return res.status(500).json({ error: 'Unable to fetch articles' });
        }

        const articles = files
            .filter(file => file.endsWith('.md'))
            .map(file => {
                const filePath = path.join(articlesDir, file);
                const data = fs.readFileSync(filePath, 'utf-8');
                const title = data.split('\n')[0].replace(/^#\s*/, ''); // Extract the title from the first line
                return { title, id: file };
            });

        res.json(articles);
    });
});

// Endpoint to get a specific Markdown article by ID
app.get('/articles/:id', (req, res) => {
    const articleId = req.params.id;
    const articlePath = path.join(__dirname, 'articles', articleId);

    fs.readFile(articlePath, 'utf-8', (err, data) => {
        if (err) {
            console.error('Error reading article:', err);
            return res.status(404).json({ error: 'Article not found' });
        }

        const htmlContent = markdownToHtml(data);
        res.send(htmlContent);
    });
});

// Helper function to read JSON file with error handling
function readJsonFileSync(filepath) {
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error(`Error reading or parsing file ${filepath}:`, err);
        return [];
    }
}

// Helper function to write JSON file
function writeJsonFileSync(filepath, data) {
    try {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing to file ${filepath}:`, err);
    }
}

// Endpoint to send a user message
app.post('/api/sendMessage', (req, res) => {
    const { username, message } = req.body;
    if (!username || !message) {
        return res.status(400).send('Username and message are required');
    }

    const messages = readJsonFileSync(messagesFilePath);
    messages.push({ username, message, agent: false });
    writeJsonFileSync(messagesFilePath, messages);

    // Add user to active sessions if not already there
    let sessions = readJsonFileSync(sessionsFilePath);
    if (!sessions.some(session => session.username === username)) {
        sessions.push({ username });
        writeJsonFileSync(sessionsFilePath, sessions);
    }

    res.sendStatus(200);
});

// Endpoint to check if a username exists
app.post('/api/checkUsername', (req, res) => {
    const { username } = req.body;
    const sessions = readJsonFileSync(sessionsFilePath); // Load current sessions
    const exists = sessions.some(session => session.username === username);
    res.json({ exists });
});

// Endpoint to add a new user session
app.post('/api/addSession', (req, res) => {
    const { username } = req.body;
    const sessions = readJsonFileSync(sessionsFilePath); // Load current sessions

    // Check if the username already exists
    if (sessions.some(session => session.username === username)) {
        return res.status(400).json({ message: 'Username already exists. Please choose a different username.' });
    }

    // Add new session
    sessions.push({ username });
    writeJsonFileSync(sessionsFilePath, sessions);
    res.sendStatus(200);
});

// Endpoint to send a message from the agent to a user
app.post('/api/sendAgentMessage', (req, res) => {
    const { username, message } = req.body;
    if (!username || !message) {
        return res.status(400).send('Username and message are required');
    }

    const messages = readJsonFileSync(messagesFilePath);
    messages.push({ username, message, agent: true });
    writeJsonFileSync(messagesFilePath, messages);

    res.sendStatus(200);
});

// Endpoint to get all messages
app.get('/api/getMessages', (req, res) => {
    const messages = readJsonFileSync(messagesFilePath);
    res.json(messages);
});

// Endpoint to get messages for a specific user (for agents)
app.get('/api/agent/messages/:username', (req, res) => {
    const username = req.params.username;
    const messages = readJsonFileSync(messagesFilePath).filter(msg => msg.username === username);
    res.json(messages);
});

// Endpoint to get active users
app.get('/api/getActiveUsers', (req, res) => {
    const sessions = readJsonFileSync(sessionsFilePath);
    const activeUsers = sessions.map(session => session.username);
    res.json(activeUsers);
});

// Endpoint to delete a user's session and messages
app.post('/api/deleteSession', (req, res) => {
    const { username } = req.body;

    // 1. Delete messages for this user
    let messages = readJsonFileSync(messagesFilePath);
    messages = messages.filter(msg => msg.username !== username); // Remove user messages
    writeJsonFileSync(messagesFilePath, messages);

    // 2. Delete session for this user
    let sessions = readJsonFileSync(sessionsFilePath);
    sessions = sessions.filter(session => session.username !== username);
    writeJsonFileSync(sessionsFilePath, sessions);

    // 3. Delete chatbot responses for this user
    delete userResponses[username]; // Clear the responses for the user

    res.sendStatus(200); // Respond with a success status
});

app.post('/api/sendChatbotResponses', (req, res) => {
    const { username, responses } = req.body;

    // Check if responses is an object and handle accordingly
    if (responses && typeof responses === 'object') {
        // Store responses by username
        userResponses[username] = responses;
        Object.entries(responses).forEach(([key, value]) => {
            console.log(`Response for ${key}: ${value}`);
        });
        // You can send a success response here
        return res.status(200).send({ message: 'Chatbot responses received successfully' });
    } else {
        console.error('Invalid format for responses');
        return res.status(400).send({ message: 'Invalid responses format' });
    }
});

// Endpoint to get responses for a specific user
app.get('/api/agent/responses/:username', (req, res) => {
    const { username } = req.params;
    const responses = userResponses[username] || {};
    res.status(200).send(responses);
});
const dotenv = require('dotenv');
const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');

// Load environment variables
dotenv.config();

// Initialize MailerSend
const mailerSend = new MailerSend({
    apiKey: process.env.API_KEY,
});

// Email sender details
const sentFrom = new Sender("mngamescontact@trial-3yxj6ljp55xldo2r.mlsender.net", "MN Games Contact");

// Email sending endpoint
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;

    // Create email parameters
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo([new Recipient("mngamesnoreply@gmail.com", "MN Games")])
        .setReplyTo([new Recipient(email, name)]) // Pass the email as a Recipient object in an array
                .setSubject("Contact Form Submission")
        .setHtml(`
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f7f7f7;
                            margin: 0;
                            padding: 20px;
                        }
                        .container {
                            background-color: #ffffff;
                            border-radius: 8px;
                            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                            padding: 20px;
                            max-width: 600px;
                            margin: auto;
                        }
                        h2 {
                            color: #333333;
                        }
                        p {
                            font-size: 16px;
                            color: #666666;
                        }
                        .footer {
                            margin-top: 20px;
                            font-size: 14px;
                            color: #888888;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>New Contact Form Submission</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Message:</strong></p>
                        <p>${message}</p>
                        <div class="footer">
                            <p>Please respond!</p>
                        </div>
                    </div>
                </body>
            </html>
        `)
        .setText(`
            New Contact Form Submission:

            Name: ${name}
            Email (Reply To): ${email}
            Message:

            ${message}
-----------------------------------
            Please respond!
        `);

    try {
        // Send email
        await mailerSend.email.send(emailParams);
        res.status(200).send('Message sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Failed to send message.');
    }
});
app.use(cors());
// Endpoint to save the article
app.post('/save', (req, res) => {
    const { html } = req.body;
    const data = JSON.stringify({ html }, null, 2); // Pretty print JSON

    // Write to helparticles.json
    fs.writeFile('helparticles.json', data, (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error saving article' });
        }
        res.status(200).json({ message: 'Article saved' });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
