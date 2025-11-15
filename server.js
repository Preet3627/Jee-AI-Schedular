import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAvatar } from './src/utils/generateAvatar.js';

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
let googleClient = null;

if (isConfigured) {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            charset: 'utf8mb4'
        });
    } catch (error) {
        console.error("FATAL ERROR: Could not create database pool. Check credentials.", error);
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
    
    if (appSettings.GOOGLE_CLIENT_ID) {
        googleClient = new OAuth2Client(appSettings.GOOGLE_CLIENT_ID);
    }

    if (appSettings.SMTP_HOST && appSettings.SMTP_USER && appSettings.SMTP_PASS) {
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
    // In a real production scenario, you might not want to exit, but for setup this is useful.
  }
}

// --- MIDDLEWARE ---
const configurationCheckMiddleware = (req, res, next) => {
    if (!isConfigured || !pool) {
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
apiRouter.use(configurationCheckMiddleware);

// --- HELPERS ---
const getUserData = async (userId) => {
    const [[user]] = await pool.query('SELECT id, sid, role, config FROM users WHERE id = ?', [userId]);
    if (!user) return null;
    const [scheduleRows] = await pool.query('SELECT item_data FROM schedule_items WHERE user_id = ?', [userId]);
    const userData = { ...user.config, SCHEDULE_ITEMS: scheduleRows.map(r => r.item_data) };
    return { id: user.id, role: user.role, userData };
};

const createNewUser = async (sid, fullName, password = null, googleId = null) => {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const defaultConfig = {
        SID: sid,
        fullName: fullName,
        profilePhoto: generateAvatar(fullName),
        WEAK: [], EXAMS: [], RESULTS: [], STUDY_SESSIONS: [],
        settings: { accentColor: '#0891b2', blurEnabled: true, mobileLayout: 'standard', forceOfflineMode: false, geminiApiKey: '', perQuestionTime: 180 }
    };
    const [result] = await pool.query(
        'INSERT INTO users (sid, password, googleId, config) VALUES (?, ?, ?, ?)',
        [sid, hashedPassword, googleId, JSON.stringify(defaultConfig)]
    );
    return result.insertId;
};

// --- AUTH ENDPOINTS ---
apiRouter.post('/register', async (req, res) => {
    const { sid, fullName, password } = req.body;
    if (!sid || !password || !fullName) return res.status(400).json({ error: 'All fields are required' });
    try {
        const [[existingUser]] = await pool.query('SELECT id FROM users WHERE sid = ?', [sid]);
        if (existingUser) return res.status(409).json({ error: 'Student ID already exists' });

        const userId = await createNewUser(sid, fullName, password);
        const user = await getUserData(userId);

        if (mailer) {
            await mailer.sendMail({
                from: `"JEE Scheduler Pro" <${appSettings.SMTP_USER}>`,
                to: sid,
                subject: 'Welcome to JEE Scheduler Pro!',
                text: `Hi ${fullName},\n\nYour account has been successfully created. Welcome aboard!\n\nBest,\nThe JEE Scheduler Pro Team`,
            });
        }
        
        const token = jwt.sign({ id: userId, sid: sid }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

apiRouter.post('/login', async (req, res) => {
    const { sid, password } = req.body;
    if (!sid || !password) return res.status(400).json({ error: 'SID and password are required' });
    try {
        const [[user]] = await pool.query('SELECT id, password FROM users WHERE sid = ?', [sid]);
        if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials or sign in with Google' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        
        const userData = await getUserData(user.id);
        const token = jwt.sign({ id: user.id, sid }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: userData });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

apiRouter.post('/auth/google', async (req, res) => {
    const { credential } = req.body;
    if (!googleClient) return res.status(500).json({ error: 'Google Auth is not configured on the server.' });
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: appSettings.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

        const { email, name, sub: googleId } = payload;
        
        let [[user]] = await pool.query('SELECT id, sid FROM users WHERE sid = ? OR googleId = ?', [email, googleId]);

        if (!user) { // New user registration via Google
            const userId = await createNewUser(email, name, null, googleId);
            user = { id: userId, sid: email };
        } else if (!user.googleId) { // Existing user linking Google account
            await pool.query('UPDATE users SET googleId = ? WHERE id = ?', [googleId, user.id]);
        }
        
        const userData = await getUserData(user.id);
        const token = jwt.sign({ id: user.id, sid: user.sid }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: userData });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

// --- USER DATA ENDPOINTS ---
apiRouter.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await getUserData(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

apiRouter.post('/schedule-items', authMiddleware, async (req, res) => {
    const { task } = req.body;
    try {
        await pool.query(
            `INSERT INTO schedule_items (user_id, item_id_str, item_data) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE item_data = ?`,
            [req.userId, task.ID, JSON.stringify(task), JSON.stringify(task)]
        );
        res.status(201).json(task);
    } catch (error) {
        console.error("Error saving task:", error);
        res.status(500).json({ error: 'Failed to save task' });
    }
});

apiRouter.delete('/schedule-items/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM schedule_items WHERE user_id = ? AND item_id_str = ?', [req.userId, req.params.id]);
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

apiRouter.post('/config', authMiddleware, async (req, res) => {
    try {
        const { settings } = req.body;
        await pool.query('UPDATE users SET config = JSON_MERGE_PATCH(config, ?) WHERE id = ?', [JSON.stringify({ settings }), req.userId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

apiRouter.post('/user-data/full-sync', authMiddleware, async (req, res) => {
    const { userData } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Update user config
        await connection.query('UPDATE users SET config = ? WHERE id = ?', [JSON.stringify(userData.CONFIG), req.userId]);
        // Clear existing schedule items
        await connection.query('DELETE FROM schedule_items WHERE user_id = ?', [req.userId]);
        // Insert new schedule items
        if (userData.SCHEDULE_ITEMS && userData.SCHEDULE_ITEMS.length > 0) {
            const scheduleValues = userData.SCHEDULE_ITEMS.map(item => [req.userId, item.ID, JSON.stringify(item)]);
            await connection.query('INSERT INTO schedule_items (user_id, item_id_str, item_data) VALUES ?', [scheduleValues]);
        }
        await connection.commit();
        const fullUserData = await getUserData(req.userId);
        res.json(fullUserData);
    } catch (error) {
        await connection.rollback();
        console.error("Full sync error:", error);
        res.status(500).json({ error: 'Full sync failed' });
    } finally {
        connection.release();
    }
});

// --- DOUBTS FORUM ENDPOINTS ---
apiRouter.get('/doubts/all', authMiddleware, async (req, res) => {
    try {
        const [doubts] = await pool.query(`
            SELECT d.id, d.user_id, d.question, d.question_image, d.created_at, u.sid as user_sid, u.config->>'$.fullName' as author_name, u.config->>'$.profilePhoto' as author_photo
            FROM doubts d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC
        `);
        const [solutions] = await pool.query(`
            SELECT s.id, s.doubt_id, s.user_id, s.solution, s.solution_image, s.created_at, u.sid as user_sid, u.config->>'$.fullName' as solver_name, u.config->>'$.profilePhoto' as solver_photo
            FROM solutions s JOIN users u ON s.user_id = u.id ORDER BY s.created_at ASC
        `);
        const doubtsWithSolutions = doubts.map(doubt => ({
            ...doubt,
            solutions: solutions.filter(s => s.doubt_id === doubt.id)
        }));
        res.json(doubtsWithSolutions);
    } catch (error) {
        console.error("Error fetching doubts:", error);
        res.status(500).json({ error: "Failed to fetch doubts." });
    }
});

apiRouter.post('/doubts', authMiddleware, async (req, res) => {
    const { question, question_image } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO doubts (user_id, question, question_image) VALUES (?, ?, ?)',
            [req.userId, question, question_image]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error("Error posting doubt:", error);
        res.status(500).json({ error: "Failed to post doubt." });
    }
});

apiRouter.post('/doubts/:id/solutions', authMiddleware, async (req, res) => {
    const { solution, solution_image } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO solutions (doubt_id, user_id, solution, solution_image) VALUES (?, ?, ?, ?)',
            [req.params.id, req.userId, solution, solution_image]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error("Error posting solution:", error);
        res.status(500).json({ error: "Failed to post solution." });
    }
});

// --- ADMIN ENDPOINTS ---
apiRouter.get('/admin/students', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [students] = await pool.query("SELECT id, sid, role, config FROM users WHERE role = 'student'");
        res.json(students.map(s => ({...s.config, SCHEDULE_ITEMS: []}))); // Send config only
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

apiRouter.post('/admin/broadcast-task', authMiddleware, adminMiddleware, async (req, res) => {
    const { task } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [students] = await connection.query("SELECT id FROM users WHERE role = 'student'");
        const broadcastValues = students.map(student => [student.id, task.ID, JSON.stringify(task)]);
        if (broadcastValues.length > 0) {
            await connection.query(
                `INSERT INTO schedule_items (user_id, item_id_str, item_data) VALUES ?
                 ON DUPLICATE KEY UPDATE item_data = VALUES(item_data)`,
                [broadcastValues]
            );
        }
        await connection.commit();
        res.status(200).json({ success: true, message: `Task broadcasted to ${students.length} students.` });
    } catch (error) {
        await connection.rollback();
        console.error("Broadcast error:", error);
        res.status(500).json({ error: 'Broadcast failed' });
    } finally {
        connection.release();
    }
});


// --- PUBLIC & API ROUTE SETUP ---
app.get('/api/status', (req, res) => {
    if (!isConfigured || !pool) {
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
    if (isConfigured && pool) {
        await loadAppSettings();
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}. Configured: ${isConfigured}`));
})();
