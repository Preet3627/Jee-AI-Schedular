
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// FIX: Correct import path for generateAvatar.
import { generateAvatar } from './utils/generateAvatar.js';
import crypto from 'crypto';
// FIX: Correct import for GoogleGenAI
import { GoogleGenAI } from '@google/genai';

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load .env from the project root (where this file now lives)
dotenv.config();


// --- ENV & SETUP CHECK ---
const isConfigured = process.env.DB_HOST && process.env.JWT_SECRET && process.env.DB_USER && process.env.DB_NAME && process.env.ENCRYPTION_KEY;

let pool = null;
let appSettings = {};
let mailer = null;
const JWT_SECRET = process.env.JWT_SECRET;
let googleClient = null;

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

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        mailer = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await mailer.verify();
        console.log('SMTP mailer configured and verified.');
    } else {
        console.warn("SMTP mailer not configured. Email verification will be skipped.");
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

// --- HELPERS ---
const getUserData = async (userId) => {
    const [[user]] = await pool.query('SELECT id, sid, email, full_name, role, profile_photo, is_verified FROM users WHERE id = ?', [userId]);
    if (!user) return null;
    
    // User data that is safe to send to the client
    const clientSafeUser = {
        id: user.id,
        sid: user.sid,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        profilePhoto: user.profile_photo,
        isVerified: !!user.is_verified,
    };

    const [scheduleRows] = await pool.query('SELECT item_data FROM schedule_items WHERE user_id = ?', [userId]);
    
    const [[userConfigRow]] = await pool.query('SELECT config FROM user_configs WHERE user_id = ?', [userId]);
    const decryptedConfig = userConfigRow?.config ? decrypt(userConfigRow.config) : '{}';
    const configObject = JSON.parse(decryptedConfig);
    
    // This is now a complete StudentData object
    return { 
      ...clientSafeUser, 
      CONFIG: configObject,
      // The other arrays are stored inside the CONFIG blob for now.
      // This matches the type structure where CONFIG holds WAKE, SCORE, RESULTS, EXAMS etc.
      SCHEDULE_ITEMS: scheduleRows.map(r => typeof r.item_data === 'string' ? JSON.parse(r.item_data) : r.item_data),
      RESULTS: configObject.RESULTS || [],
      EXAMS: configObject.EXAMS || [],
      STUDY_SESSIONS: configObject.STUDY_SESSIONS || [],
      DOUBTS: configObject.DOUBTS || [],
    };
};

// PUBLIC STATUS ROUTE (no middleware)
apiRouter.get('/status', (req, res) => {
    if (!isConfigured || !pool) {
        return res.status(200).json({ status: 'misconfigured' });
    }
    res.status(200).json({ status: 'online' });
});

// Apply configuration check for all subsequent routes
apiRouter.use(configurationCheckMiddleware);

// --- AUTH ENDPOINTS ---
apiRouter.post('/register', async (req, res) => {
    const { sid, fullName, email, password } = req.body;
    if (!sid || !password || !fullName || !email) return res.status(400).json({ error: 'All fields are required' });
    try {
        const [[existingUser]] = await pool.query('SELECT id FROM users WHERE sid = ? OR email = ?', [sid, email]);
        if (existingUser) return res.status(409).json({ error: 'Student ID or Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const profilePhoto = generateAvatar(fullName);
        
        if (mailer) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
            
            await pool.query(
                'INSERT INTO users (sid, email, password, full_name, profile_photo, verification_code, verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [sid, email, hashedPassword, fullName, profilePhoto, code, new Date(expires)]
            );
            
            await mailer.sendMail({
                from: `"JEE Scheduler Pro" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Verify your email for JEE Scheduler Pro',
                text: `Hi ${fullName},\n\nYour verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nBest,\nThe JEE Scheduler Pro Team`,
                html: `<p>Hi ${fullName},</p><p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 15 minutes.</p><p>Best,<br>The JEE Scheduler Pro Team</p>`,
            });
            res.status(200).json({ message: 'Verification code sent to your email.', email });
        } else {
            // Auto-verify if mailer is not set up
            const [result] = await pool.query(
                'INSERT INTO users (sid, email, password, full_name, profile_photo, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [sid, email, hashedPassword, fullName, profilePhoto, true]
            );
            const userId = result.insertId;
            const token = jwt.sign({ id: userId, sid: sid }, JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({ token, message: "Registered and auto-verified (mailer not configured)." });
        }
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: 'Server error during registration process.' });
    }
});

apiRouter.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    try {
        const [[user]] = await pool.query('SELECT id, sid, verification_code, verification_expires FROM users WHERE email = ? AND is_verified = false', [email]);
        
        if (!user) return res.status(404).json({ error: 'User not found or already verified.' });
        if (user.verification_code !== code) return res.status(400).json({ error: 'Invalid verification code.' });
        if (new Date() > new Date(user.verification_expires)) return res.status(400).json({ error: 'Verification code has expired.' });

        await pool.query('UPDATE users SET is_verified = true, verification_code = NULL, verification_expires = NULL WHERE id = ?', [user.id]);
        
        const token = jwt.sign({ id: user.id, sid: user.sid }, JWT_SECRET, { expiresIn: '7d' });
        const fullUserData = await getUserData(user.id);

        res.status(200).json({ token, user: fullUserData });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: 'Server error during verification.' });
    }
});


apiRouter.post('/login', async (req, res) => {
    const { sid, password } = req.body;
    if (!sid || !password) return res.status(400).json({ error: 'SID and password are required' });
    try {
        const [[user]] = await pool.query('SELECT id, password, is_verified, email FROM users WHERE sid = ?', [sid]);
        if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials or sign in with Google' });

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Account not verified. Please check your email.', needsVerification: true, email: user.email });
        }

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
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: appSettings.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

        const { email, name, sub: googleId, picture } = payload;
        
        let [[user]] = await pool.query('SELECT id, sid FROM users WHERE google_id = ? OR email = ?', [googleId, email]);

        if (!user) {
            const [result] = await pool.query(
                'INSERT INTO users (sid, email, full_name, google_id, profile_photo, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [email, email, name, googleId, picture, true]
            );
            user = { id: result.insertId, sid: email };
        } else {
            // Update user details if they already exist from an email signup
            await pool.query('UPDATE users SET google_id = ?, profile_photo = IF(profile_photo LIKE "data:image/svg+xml%", ?, profile_photo) WHERE id = ?', [googleId, picture, user.id]);
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

apiRouter.put('/profile', authMiddleware, async (req, res) => {
    const { fullName, profilePhoto } = req.body; // profilePhoto is base64 data URI
    try {
        let query = 'UPDATE users SET';
        const params = [];
        if (fullName) {
            query += ' full_name = ?';
            params.push(fullName);
        }
        if (profilePhoto) {
            if(params.length > 0) query += ',';
            query += ' profile_photo = ?';
            params.push(profilePhoto);
        }
        query += ' WHERE id = ?';
        params.push(req.userId);

        if (params.length > 1) {
             await pool.query(query, params);
        }
       
        const updatedUser = await getUserData(req.userId);
        res.json(updatedUser);
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: "Failed to update profile." });
    }
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
        const updates = req.body;
        const [[userConfig]] = await pool.query("SELECT config FROM user_configs WHERE user_id = ?", [req.userId]);
        const currentConfig = userConfig?.config ? JSON.parse(decrypt(userConfig.config)) : {};
        
        const newSettings = updates.settings 
            ? { ...currentConfig.settings, ...updates.settings }
            : currentConfig.settings;
            
        const newConfig = { 
            ...currentConfig, 
            ...updates,
            settings: newSettings
        };

        const encryptedConfig = encrypt(JSON.stringify(newConfig));

        await pool.query(
            `INSERT INTO user_configs (user_id, config) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE config = ?`,
            [req.userId, encryptedConfig, encryptedConfig]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// A new endpoint to sync the whole user object.
// USE WITH CAUTION. It replaces the entire config blob.
apiRouter.post('/user-data/full-sync', authMiddleware, async (req, res) => {
    try {
        const { userData } = req.body;
        
        const { SCHEDULE_ITEMS, id, sid, email, fullName, profilePhoto, isVerified, role, RESULTS, EXAMS, STUDY_SESSIONS, DOUBTS, CONFIG } = userData;

        // 1. Update the main config blob
        const configToSave = {
            ...CONFIG,
            RESULTS,
            EXAMS,
            STUDY_SESSIONS,
            DOUBTS
        };
        const encryptedConfig = encrypt(JSON.stringify(configToSave));
        await pool.query(
            `INSERT INTO user_configs (user_id, config) VALUES (?, ?) ON DUPLICATE KEY UPDATE config = ?`,
            [req.userId, encryptedConfig, encryptedConfig]
        );

        // 2. Clear and re-insert all schedule items for simplicity
        // In a high-performance scenario, you'd diff these.
        await pool.query('DELETE FROM schedule_items WHERE user_id = ?', [req.userId]);
        if (SCHEDULE_ITEMS && SCHEDULE_ITEMS.length > 0) {
            const scheduleValues = SCHEDULE_ITEMS.map(item => [req.userId, item.ID, JSON.stringify(item)]);
            await pool.query(
                `INSERT INTO schedule_items (user_id, item_id_str, item_data) VALUES ?`,
                [scheduleValues]
            );
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Full sync error:", error);
        res.status(500).json({ error: 'Full data sync failed.' });
    }
});


// --- DOUBTS FORUM ENDPOINTS ---
apiRouter.get('/doubts/all', authMiddleware, async (req, res) => {
    try {
        const [doubts] = await pool.query(`
            SELECT d.id, d.user_id, d.question, d.question_image, d.created_at, u.sid as user_sid, u.full_name as author_name, u.profile_photo as author_photo
            FROM doubts d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC
        `);
        const [solutions] = await pool.query(`
            SELECT s.id, s.doubt_id, s.user_id, s.solution, s.solution_image, s.created_at, u.sid as user_sid, u.full_name as solver_name, u.profile_photo as solver_photo
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
apiRouter.get('/messages/:studentSid', authMiddleware, adminMiddleware, async (req, res) => {
    const { studentSid } = req.params;
    const adminSid = req.userSid; 
    try {
        const [messages] = await pool.query(
            'SELECT * FROM messages WHERE (sender_sid = ? AND recipient_sid = ?) OR (sender_sid = ? AND recipient_sid = ?) ORDER BY created_at ASC',
            [adminSid, studentSid, studentSid, adminSid]
        );
        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages." });
    }
});

apiRouter.post('/messages', authMiddleware, adminMiddleware, async (req, res) => {
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
    const { prompt, imageBase64 } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: "A prompt is required." });
    }
    if (!process.env.API_KEY) {
        console.error("Gemini API key not configured on server.");
        return res.status(500).json({ error: "AI service is not configured." });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const contents = { parts: [{ text: prompt }] };
        if (imageBase64) {
            contents.parts.push({
                inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
            });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: `Failed to get response from AI: ${error.message}` });
    }
});

apiRouter.post('/ai/parse-text-to-csv', authMiddleware, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required." });
    if (!process.env.API_KEY) return res.status(500).json({ error: "AI service is not configured." });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const systemInstruction = `You are a data conversion expert. Your task is to convert unstructured text describing a student's schedule, exams, or results into a valid CSV format according to the provided schema. You must ONLY output the raw CSV data, with no explanations, backticks, or "csv" language specifier. Use the current date to infer any missing date information if required. Generate unique IDs for each item. Today's date is ${new Date().toLocaleDateString()}`;
        const prompt = `Please convert the following text into a valid CSV. Available CSV Schemas: 1. SCHEDULE: ID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG,Q_RANGES,SUB_TYPE; 2. EXAM: ID,TYPE,SUBJECT,TITLE,DATE,TIME,SYLLABUS. Determine the correct schema from the text and generate the CSV. Text to convert:\n---\n${text}\n---`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction },
        });

        res.json({ csv: response.text.trim() });
    } catch (error) {
        console.error("Gemini API error (text parse):", error);
        res.status(500).json({ error: `Failed to parse text: ${error.message}` });
    }
});

apiRouter.post('/ai/parse-image-to-csv', authMiddleware, async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Image data is required." });
    if (!process.env.API_KEY) return res.status(500).json({ error: "AI service is not configured." });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const systemInstruction = `You are a data conversion expert specializing in academic timetables. Your task is to analyze an image of a weekly schedule and convert it into a valid CSV format according to the provided schema. You must ONLY output the raw CSV data, with no explanations, backticks, or "csv" language specifier. Infer details logically. For example, if a class is "Physics", the SUBJECT_TAG is "PHYSICS" and the CARD_TITLE could be "Physics Class". Create a unique ID for each entry. The required CSV format is: ID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG. All tasks are of TYPE 'ACTION'.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Analyze this timetable image and convert it to the specified CSV format." },
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
                ]
            },
            config: { systemInstruction },
        });

        res.json({ csv: response.text.trim() });
    } catch (error) {
        console.error("Gemini API error (image parse):", error);
        res.status(500).json({ error: `Failed to parse image: ${error.message}` });
    }
});


// --- ADMIN ENDPOINTS ---
apiRouter.get('/admin/students', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [students] = await pool.query("SELECT id, sid, email, full_name, role, profile_photo FROM users WHERE role = 'student'");
        const studentsWithData = await Promise.all(students.map(s => getUserData(s.id)));
        res.json(studentsWithData);
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
// Mount the entire API router at the root. 
// The '/api' prefix is handled by the proxy.
app.use('/api', apiRouter);

// Serve frontend files from the root `dist` and `public` directories.
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
