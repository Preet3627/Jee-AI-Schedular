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

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));


// --- ENV & SETUP CHECK ---
if (!process.env.DB_HOST || !process.env.JWT_SECRET) {
    console.error("FATAL ERROR: .env file is not configured.");
    app.get('*', (req, res) => {
        const exampleEnvPath = path.join(__dirname, 'public', '.env.example.txt');
        const exampleContent = fs.existsSync(exampleEnvPath) 
            ? fs.readFileSync(exampleEnvPath, 'utf-8')
            : 'DB_HOST=...\nDB_USER=...\nDB_PASSWORD=...\nDB_NAME=...\nJWT_SECRET=...\nPORT=3001';
        
        res.status(500).setHeader('Content-Type', 'text/html').send(`
            <body style="font-family: sans-serif; background-color: #02040a; color: #d1d5db; padding: 2rem;">
                <h1 style="color: #ef4444;">FATAL ERROR: Server Not Configured</h1>
                <p>The <strong>.env</strong> file is missing or incomplete. Please create a file named <code>.env</code> in the project root with the following content:</p>
                <pre style="background-color: #1f2937; padding: 1rem; border-radius: 0.5rem; border: 1px solid #4b5563; white-space: pre-wrap;">${exampleContent}</pre>
                <p>After creating and configuring the file, please restart the server.</p>
            </body>
        `);
    });
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Server running in setup mode on port ${PORT}`));
    // Prevent the rest of the file from running if not configured
    throw new Error("Server cannot start without .env configuration.");
}

// --- DATABASE & SETTINGS ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

let appSettings = {};
let mailer;

async function loadAppSettings() {
  try {
    const [rows] = await pool.query('SELECT * FROM settings');
    rows.forEach(row => { appSettings[row.setting_key] = row.setting_value; });
    console.log('Application settings loaded.');
    
    mailer = nodemailer.createTransport({
      host: appSettings.SMTP_HOST,
      port: parseInt(appSettings.SMTP_PORT, 10),
      secure: appSettings.SMTP_SECURE === 'true',
      auth: { user: appSettings.SMTP_USER, pass: appSettings.SMTP_PASS },
    });
    await mailer.verify();
    console.log('SMTP mailer configured and verified.');
  } catch (error) {
    console.error('FATAL ERROR during initialization:', error.message);
    process.exit(1);
  }
}

// --- UTILITIES & MIDDLEWARE ---
const generateAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name.split(' ').map(n => n[0]).slice(0, 2).join(''))}&background=random`;
const JWT_SECRET = process.env.JWT_SECRET;

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

// --- API ENDPOINTS ---

app.get('/api/status', (req, res) => res.json({ status: 'online' }));

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
app.post('/api/register', async (req, res) => {
    // ... implementation remains the same
});
app.post('/api/login', async (req, res) => {
    // ... implementation remains the same
});
app.post('/api/auth/google', async (req, res) => {
    // ... implementation remains the same
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const user = await getUserData(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// ... USER DATA ENDPOINTS (SCHEDULE, CONFIG, ETC.) ...
app.post('/api/schedule-items', authMiddleware, async (req, res) => {
    // ... implementation remains the same
});
app.delete('/api/schedule-items/:id', authMiddleware, async (req, res) => {
    // ... implementation remains the same
});
app.post('/api/user-data/:field', authMiddleware, async (req, res) => {
    // ... implementation remains the same
});
app.post('/api/config', authMiddleware, async (req, res) => {
    // ... implementation remains the same
});
app.post('/api/user-data/full-sync', authMiddleware, async (req, res) => {
    // ... implementation remains the same
});


// --- DOUBTS FORUM ENDPOINTS ---
app.get('/api/doubts/all', authMiddleware, async (req, res) => {
    try {
        const [doubts] = await pool.query(`
            SELECT d.id, d.question, d.question_image, d.created_at, u.sid as user_sid, u.config->>'$.fullName' as author_name, u.config->>'$.profilePhoto' as author_photo
            FROM doubts d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC
        `);
        const doubtIds = doubts.map(d => d.id);
        if (doubtIds.length === 0) return res.json([]);
        const [solutions] = await pool.query(`
            SELECT s.id, s.doubt_id, s.solution, s.solution_image, s.created_at, u.sid as user_sid, u.config->>'$.fullName' as solver_name, u.config->>'$.profilePhoto' as solver_photo
            FROM solutions s JOIN users u ON s.user_id = u.id WHERE s.doubt_id IN (?) ORDER BY s.created_at ASC
        `, [doubtIds]);
        
        const solutionsMap = solutions.reduce((acc, sol) => {
            if (!acc[sol.doubt_id]) acc[sol.doubt_id] = [];
            acc[sol.doubt_id].push(sol);
            return acc;
        }, {});
        
        const result = doubts.map(d => ({ ...d, solutions: solutionsMap[d.id] || [] }));
        res.json(result);
    } catch (error) { res.status(500).json({ error: 'Server error fetching doubts' }); }
});

app.post('/api/doubts', authMiddleware, async (req, res) => {
    const { question, question_image } = req.body;
    if (!question) return res.status(400).json({ error: 'Question text is required.' });
    try {
        const [result] = await pool.query('INSERT INTO doubts (user_id, question, question_image) VALUES (?, ?, ?)', [req.userId, question, question_image || null]);
        const [[newDoubt]] = await pool.query(`SELECT d.id, d.question, d.question_image, d.created_at, u.sid as user_sid, u.config->>'$.fullName' as author_name, u.config->>'$.profilePhoto' as author_photo FROM doubts d JOIN users u ON d.user_id = u.id WHERE d.id = ?`, [result.insertId]);
        res.status(201).json({ ...newDoubt, solutions: [] });
    } catch (error) { res.status(500).json({ error: 'Failed to post doubt' }); }
});

app.post('/api/doubts/:id/solutions', authMiddleware, async (req, res) => {
    const { id: doubt_id } = req.params;
    const { solution, solution_image } = req.body;
    if (!solution) return res.status(400).json({ error: 'Solution text is required.' });
    try {
        const [result] = await pool.query('INSERT INTO solutions (doubt_id, user_id, solution, solution_image) VALUES (?, ?, ?, ?)', [doubt_id, req.userId, solution, solution_image || null]);
        const [[newSolution]] = await pool.query(`SELECT s.id, s.doubt_id, s.solution, s.solution_image, s.created_at, u.sid as user_sid, u.config->>'$.fullName' as solver_name, u.config->>'$.profilePhoto' as solver_photo FROM solutions s JOIN users u ON s.user_id = u.id WHERE s.id = ?`, [result.insertId]);
        res.status(201).json(newSolution);
    } catch (error) { res.status(500).json({ error: 'Failed to post solution' }); }
});

// --- ADMIN ENDPOINTS ---
app.get('/api/admin/students', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query("SELECT id, config FROM users WHERE role = 'student'");
        const students = await Promise.all(users.map(async user => {
            const [scheduleRows] = await pool.query('SELECT item_data FROM schedule_items WHERE user_id = ?', [user.id]);
            return { ...user.config, SCHEDULE_ITEMS: scheduleRows.map(r => r.item_data) };
        }));
        res.json(students);
    } catch(error) { res.status(500).json({ error: 'Failed to fetch students' }); }
});

app.post('/api/admin/broadcast-task', authMiddleware, adminMiddleware, async (req, res) => {
    const { task } = req.body;
    if (!task) return res.status(400).json({ error: 'Task data is required' });
    try {
        const [students] = await pool.query("SELECT id FROM users WHERE role = 'student'");
        if (students.length === 0) return res.status(200).json({ message: 'No students to broadcast to.' });
        const values = students.map(student => [student.id, task.ID, JSON.stringify(task)]);
        await pool.query('INSERT INTO schedule_items (user_id, item_id_str, item_data) VALUES ? ON DUPLICATE KEY UPDATE item_data = VALUES(item_data)', [values]);
        res.status(200).json({ message: `Task broadcasted to ${students.length} students.` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to broadcast task' });
    }
});


// Fallback for React Router - must be last route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- SERVER START ---
const PORT = process.env.PORT || 3001;
(async () => {
    await loadAppSettings();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();