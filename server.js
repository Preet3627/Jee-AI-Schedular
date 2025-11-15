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
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ENV & SETUP CHECK ---
const isConfigured = process.env.DB_HOST && process.env.JWT_SECRET && process.env.DB_USER && process.env.DB_NAME && process.env.ENCRYPTION_KEY;

let pool = null;
let appSettings = {};
let mailer = null;
const JWT_SECRET = process.env.JWT_SECRET;
let googleClient = null;
const verificationCodes = new Map();

// --- ENCRYPTION SETUP ---
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = isConfigured ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32) : null;
const IV_LENGTH = 16;

const encrypt = (text) => {
    if (!ENCRYPTION_KEY) throw new Error('Encryption key not configured.');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (text) => {
    if (!ENCRYPTION_KEY) throw new Error('Encryption key not configured.');
    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error);
        return text; // Fallback to returning original text if decryption fails
    }
};


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
    
    const decryptedConfig = user.config ? decrypt(user.config) : '{}';
    const configObject = JSON.parse(decryptedConfig);
    const scheduleItems = scheduleRows.map(r => typeof r.item_data === 'string' ? JSON.parse(r.item_data) : r.item_data);

    const userData = { ...configObject, SCHEDULE_ITEMS: scheduleItems };
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
    const encryptedConfig = encrypt(JSON.stringify(defaultConfig));
    const [result] = await pool.query(
        'INSERT INTO users (sid, password, googleId, config) VALUES (?, ?, ?, ?)',
        [sid, hashedPassword, googleId, encryptedConfig]
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

        if (mailer) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            verificationCodes.set(sid, {
                code,
                fullName,
                password,
                expires: Date.now() + 15 * 60 * 1000 // 15 minutes
            });
            
            await mailer.sendMail({
                from: `"JEE Scheduler Pro" <${appSettings.SMTP_USER}>`,
                to: sid,
                subject: 'Verify your email for JEE Scheduler Pro',
                text: `Hi ${fullName},\n\nYour verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nBest,\nThe JEE Scheduler Pro Team`,
                html: `<p>Hi ${fullName},</p><p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 15 minutes.</p><p>Best,<br>The JEE Scheduler Pro Team</p>`,
            });
            res.status(200).json({ message: 'Verification code sent to your email.' });
        } else {
            const userId = await createNewUser(sid, fullName, password);
            const user = await getUserData(userId);
            const token = jwt.sign({ id: userId, sid: sid }, JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({ token, user, message: "Registered without email verification (mailer not configured)." });
        }
    } catch (error) {
        console.error("Registration initiation error:", error);
        res.status(500).json({ error: 'Server error during registration process.' });
    }
});

apiRouter.post('/verify-and-register', async (req, res) => {
    const { sid, code } = req.body;
    if (!sid || !code) return res.status(400).json({ error: 'Email/SID and code are required' });

    const stored = verificationCodes.get(sid);
    if (!stored || stored.code !== code) {
        return res.status(400).json({ error: 'Invalid verification code.' });
    }
    if (Date.now() > stored.expires) {
        verificationCodes.delete(sid);
        return res.status(400).json({ error: 'Verification code has expired.' });
    }

    try {
        const { fullName, password } = stored;
        const userId = await createNewUser(sid, fullName, password);
        const user = await getUserData(userId);
        verificationCodes.delete(sid);
        const token = jwt.sign({ id: userId, sid: sid }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user });
    } catch (error) {
        console.error("Verification/Registration error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Student ID already exists' });
        }
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
        
        let [[user]] = await pool.query('SELECT id, sid, googleId FROM users WHERE sid = ? OR googleId = ?', [email, googleId]);

        if (!user) {
            const userId = await createNewUser(email, name, null, googleId);
            user = { id: userId, sid: email };
        } else if (!user.googleId) {
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
        const [[user]] = await pool.query("SELECT config FROM users WHERE id = ?", [req.userId]);
        const currentConfig = user.config ? JSON.parse(decrypt(user.config)) : {};
        const newConfig = { ...currentConfig, settings: { ...currentConfig.settings, ...settings } };
        const encryptedConfig = encrypt(JSON.stringify(newConfig));

        await pool.query("UPDATE users SET config = ? WHERE id = ?", [encryptedConfig, req.userId]);
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
        const encryptedConfig = encrypt(JSON.stringify(userData.CONFIG));
        await connection.query('UPDATE users SET config = ? WHERE id = ?', [encryptedConfig, req.userId]);
        await connection.query('DELETE FROM schedule_items WHERE user_id = ?', [req.userId]);
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

// --- MESSAGING ENDPOINTS ---
apiRouter.get('/messages/:studentSid', authMiddleware, async (req, res) => {
    const studentSid = req.params.studentSid;
    const userSid = req.userSid;
    const adminSid = 'ADMIN'; 

    let targetSid = '';
    if (req.userRole === 'admin') {
        targetSid = studentSid;
    } else {
        targetSid = adminSid; // Students can only message admin for now
    }

    try {
        const [messages] = await pool.query(
            'SELECT * FROM messages WHERE (sender_sid = ? AND recipient_sid = ?) OR (sender_sid = ? AND recipient_sid = ?) ORDER BY created_at ASC',
            [userSid, targetSid, targetSid, userSid]
        );
        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages." });
    }
});

apiRouter.post('/messages', authMiddleware, async (req, res) => {
    const { recipient_sid, content } = req.body;
    const sender_sid = req.userSid;
    try {
        const [result] = await pool.query(
            'INSERT INTO messages (sender_sid, recipient_sid, content) VALUES (?, ?, ?)',
            [sender_sid, recipient_sid, content]
        );
        const [[newMessage]] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message." });
    }
});


// --- AI ENDPOINTS ---
apiRouter.post('/ai/solve-doubt', authMiddleware, async (req, res) => {
    const { prompt, imageBase64, apiKey } = req.body;
    if (!prompt || !apiKey) {
        return res.status(400).json({ error: "Prompt and API key are required." });
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const contents = { parts: [{ text: prompt }] };
        if (imageBase64) {
            contents.parts.push({
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
            });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: contents,
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: `Failed to get response from AI: ${error.message}` });
    }
});


// --- ADMIN ENDPOINTS ---
apiRouter.get('/admin/students', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [students] = await pool.query("SELECT id, sid, role, config FROM users WHERE role = 'student'");
        const decryptedStudents = students.map(s => {
            const config = s.config ? JSON.parse(decrypt(s.config)) : {};
            return { ...config, SCHEDULE_ITEMS: [] };
        });
        res.json(decryptedStudents);
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

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- SERVER START ---
// This async IIFE will run when the module is loaded.
(async () => {
    if (isConfigured && pool) {
        await loadAppSettings(); // This needs to run in both environments
    }

    // Vercel provides the `VERCEL` env var. If it's not present, we're likely local.
    if (!process.env.VERCEL) {
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}. Configured: ${isConfigured}`));
    }
})();

// Export the app for Vercel's serverless environment
export default app;
