import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ENV & SETUP CHECK ---
const isConfigured = process.env.DB_HOST && process.env.JWT_SECRET && process.env.DB_USER && process.env.DB_NAME;

let pool = null;
let appSettings = {};
let mailer = null;
const JWT_SECRET = process.env.JWT_SECRET;

if (isConfigured) {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    } catch (error) {
        console.error("FATAL ERROR: Could not create database pool. Check credentials.", error);
        process.exit(1);
    }
} else {
    console.error("FATAL ERROR: Server environment variables are not configured. The server will run in a misconfigured state.");
}

async function loadAppSettings() {
  if (!isConfigured) return;
  try {
    const [rows] = await pool.query('SELECT * FROM settings');
    rows.forEach(row => { appSettings[row.setting_key] = row.setting_value; });
    console.log('Application settings loaded.');
    
    if (appSettings.SMTP_HOST) {
        mailer = nodemailer.createTransport({
          host: appSettings.SMTP_HOST,
          port: parseInt(appSettings.SMTP_PORT, 10),
          secure: appSettings.SMTP_SECURE === 'true',
          auth: { user: appSettings.SMTP_USER, pass: appSettings.SMTP_PASS },
        });
        await mailer.verify();
        console.log('SMTP mailer configured and verified.');
    }
  } catch (error) {
    console.error('FATAL ERROR during initialization:', error.message);
    process.exit(1);
  }
}

// --- MIDDLEWARE ---
const configurationCheckMiddleware = (req, res, next) => {
    if (!isConfigured) {
        return res.status(503).json({ error: 'Server is not configured. Administrator needs to set environment variables.' });
    }
    next();
};

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    const [[user]] = await pool.query('SELECT role, sid FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.userRole = user.role;
    req.userSid = user.sid;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
};

// --- API ROUTES ---
const apiRouter = express.Router();
apiRouter.use(configurationCheckMiddleware); // Protect all subsequent API routes

const getUserData = async (userId) => {
    const [userRows] = await pool.query('SELECT id, sid, role, config FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) return null;
    const user = userRows[0];
    const [scheduleRows] = await pool.query('SELECT item_data FROM schedule_items WHERE user_id = ?', [userId]);
    const userData = { ...user.config, SCHEDULE_ITEMS: scheduleRows.map(r => r.item_data) };
    ['RESULTS', 'EXAMS', 'STUDY_SESSIONS'].forEach(key => { if (!userData[key]) userData[key] = []; });
    return { role: user.role, userData };
};

// ... AUTH ENDPOINTS ...
apiRouter.post('/register', async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/login', async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/auth/google', async (req, res) => { /* ... implementation ... */ });

apiRouter.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await getUserData(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// ... USER DATA ENDPOINTS (SCHEDULE, CONFIG, ETC.) ...
apiRouter.post('/schedule-items', authMiddleware, async (req, res) => { /* ... implementation ... */ });
apiRouter.delete('/schedule-items/:id', authMiddleware, async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/user-data/:field', authMiddleware, async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/config', authMiddleware, async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/user-data/full-sync', authMiddleware, async (req, res) => { /* ... implementation ... */ });

// --- DOUBTS FORUM ENDPOINTS ---
apiRouter.get('/doubts/all', authMiddleware, async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/doubts', authMiddleware, async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/doubts/:id/solutions', authMiddleware, async (req, res) => { /* ... implementation ... */ });

// --- ADMIN ENDPOINTS ---
apiRouter.get('/admin/students', authMiddleware, adminMiddleware, async (req, res) => { /* ... implementation ... */ });
apiRouter.post('/api/admin/broadcast-task', authMiddleware, adminMiddleware, async (req, res) => { /* ... implementation ... */ });


// --- PUBLIC & API ROUTE SETUP ---
app.get('/api/status', (req, res) => {
    if (!isConfigured) {
        return res.status(503).json({ status: 'misconfigured', error: 'Server environment variables are not set.' });
    }
    res.json({ status: 'online' });
});

app.use('/api', apiRouter);

// Serve static files from 'dist' and 'public'
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for React Router - must be the last route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- SERVER START ---
const PORT = process.env.PORT || 3001;
(async () => {
    if (isConfigured) {
        await loadAppSettings();
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}. Configured: ${isConfigured}`));
})();
