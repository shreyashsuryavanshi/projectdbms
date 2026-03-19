const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = 'your_super_secret_jwt_key_here'; // Must match auth.js

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = decoded; // { id, fullname, email }
        next();
    });
};

// --- USER PROFILE ---
router.put('/user', authenticateToken, (req, res) => {
    const { fullname, email } = req.body;
    if (!fullname || !email) return res.status(400).json({ error: 'Fullname and email required' });

    db.run(
        'UPDATE users SET fullname = ?, email = ? WHERE id = ?',
        [fullname, email, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error updating profile' });
            res.json({ message: 'Profile updated successfully', user: { fullname, email } });
        }
    );
});

// --- TODO LIST ---
router.get('/todos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching todos' });
        res.json({ todos: rows || [] });
    });
});

router.post('/todos', authenticateToken, (req, res) => {
    const { task } = req.body;
    if (!task) return res.status(400).json({ error: 'Task is required' });

    db.run(
        'INSERT INTO todos (user_id, task) VALUES (?, ?)',
        [req.user.id, task],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error creating todo' });
            res.status(201).json({ id: this.lastID, task, completed: 0 });
        }
    );
});

router.put('/todos/:id', authenticateToken, (req, res) => {
    const { completed } = req.body;
    db.run(
        'UPDATE todos SET completed = ? WHERE id = ? AND user_id = ?',
        [completed ? 1 : 0, req.params.id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error updating todo' });
            if (this.changes === 0) return res.status(404).json({ error: 'Todo not found' });
            res.json({ message: 'Todo updated successfully' });
        }
    );
});

router.delete('/todos/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM todos WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error deleting todo' });
            if (this.changes === 0) return res.status(404).json({ error: 'Todo not found' });
            res.json({ message: 'Todo deleted successfully' });
        }
    );
});

// --- FILE UPLOAD ---
// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize original filename (replace spaces with dashes)
        const safeName = file.originalname.replace(/\s+/g, '-');
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage });

router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Please upload a file' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ message: 'File uploaded successfully', fileUrl, originalName: req.file.originalname });
});

// --- AI CHATBOT (Mock) ---
router.post('/chat', authenticateToken, (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Mock an AI response with a slight delay
    setTimeout(() => {
        const responses = [
            "That's a very perceptive point!",
            "I'm a simulated AI helper. My knowledge is limited, but I listen well.",
            `You asked about: "${message}". What more would you like to know?`,
            "Analyzing... Results: You are doing great!",
            "In the future, I'll be connected to a powerful LLM backend!",
            "I don't have the answer to that right now, but I'll remember it!"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        res.json({ reply: randomResponse });
    }, 1200);
});

module.exports = router;
