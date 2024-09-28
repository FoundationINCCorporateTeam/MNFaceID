const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const messagesFilePath = path.join(__dirname, 'messages.json');
const sessionsFilePath = path.join(__dirname, 'sessions.json');

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

    // Delete messages for this user
    let messages = readJsonFileSync(messagesFilePath);
    messages = messages.filter(msg => msg.username !== username); // Remove user messages
    writeJsonFileSync(messagesFilePath, messages);

    // Delete session for this user
    let sessions = readJsonFileSync(sessionsFilePath);
    sessions = sessions.filter(session => session.username !== username);
    writeJsonFileSync(sessionsFilePath, sessions);

    res.sendStatus(200);
});
// Endpoint to receive chatbot responses
app.post('/api/sendChatbotResponses', (req, res) => {
    const { username, responses } = req.body;

    // Send each chatbot response as a message to the agent
    responses.forEach(response => {
        // Simulate sending the chatbot response as a message to the agent
        const message = {
            username: username,
            message: response,
            agent: true  // Mark as an agent-related message, even though it's from the chatbot
        };

        // Store the message (could be saved to a database in a real app)
        chatMessages.push(message);
    });

    // Respond to the chatbot (or user) to confirm successful submission
    res.status(200).send({ success: true, message: 'Chatbot responses sent to the agent.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
