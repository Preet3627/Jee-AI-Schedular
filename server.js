
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
import { generateAvatar } from './utils/generateAvatar.js';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { parseStringPromise } from 'xml2js';
import { knowledgeBase } from './data/knowledgeBase.js';
import fetch from 'node-fetch'; // Required for fetch in Node.js

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load .env from the project root
dotenv.config({ path: path.resolve(__dirname, '.env') });


// --- ENV & SETUP CHECK ---
const isConfigured = process.env.DB_HOST && process.env.JWT_SECRET && process.env.DB_USER && process.env.DB_NAME && process.env.ENCRYPTION_KEY && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
const isNextcloudMusicConfigured = !!(process.env.NEXTCLOUD_URL && process.env.NEXTCLOUD_MUSIC_SHARE_TOKEN);
const isNextcloudStudyConfigured = !!(process.env.NEXTCLOUD_URL && process.env.NEXTCLOUD_SHARE_TOKEN);

let pool = null;
let mailer = null;
const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is always defined from process.env
let googleClient = null;

// --- ENCRYPTION SETUP ---
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = isConfigured && process.env.ENCRYPTION_KEY ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32) : null;
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
        
        googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            mailer = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT || '587', 10),
              secure: process.env.SMTP_SECURE === 'true',
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
        }

    } catch (error) {
        console.error("FATAL ERROR: Could not create database pool or initialize services. Check credentials.", error);
    }
} else {
    console.error("FATAL ERROR: Server environment variables are not configured. The server will run in a misconfigured state.");
}

// --- DATABASE SCHEMA INITIALIZATION ---
const initializeDatabaseSchema = async () => {
    if (!pool) return;
    const connection = await pool.getConnection();
    try {
        console.log("Verifying database schema...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
              id INT AUTO_INCREMENT PRIMARY KEY,
              sid VARCHAR(255) UNIQUE NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              password VARCHAR(255),
              full_name VARCHAR(255) NOT NULL,
              profile_photo TEXT,
              is_verified BOOLEAN DEFAULT false,
              role ENUM('student', 'admin') DEFAULT 'student',
              google_id VARCHAR(255) UNIQUE,
              verification_code VARCHAR(10),
              verification_expires DATETIME,
              password_reset_token VARCHAR(255),
              password_reset_expires DATETIME,
              api_token VARCHAR(255) UNIQUE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              last_seen TIMESTAMP
            )
        `);
        // Add last_seen column if it doesn't exist
        const [lastSeenCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'last_seen'");
        if (lastSeenCols.length === 0) {
            await connection.query("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP NULL");
        }
        
        // Add password reset and api_token columns if they don't exist
        const [cols] = await connection.query("SHOW COLUMNS FROM users LIKE 'password_reset_token'");
        if (cols.length === 0) {
            await connection.query("ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255), ADD COLUMN password_reset_expires DATETIME");
        }
        const [apiTokenCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'api_token'");
        if (apiTokenCols.length === 0) {
            await connection.query("ALTER TABLE users ADD COLUMN api_token VARCHAR(255) UNIQUE");
        }


        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_configs (
              user_id INT PRIMARY KEY,
              config TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS schedule_items (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              item_id_str VARCHAR(255) NOT NULL,
              item_data JSON NOT NULL,
              UNIQUE KEY (user_id, item_id_str),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS doubts (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              question TEXT NOT NULL,
              question_image MEDIUMTEXT,
              status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        const [doubtStatusCols] = await connection.query("SHOW COLUMNS FROM doubts LIKE 'status'");
        if (doubtStatusCols.length === 0) {
            await connection.query("ALTER TABLE doubts ADD COLUMN status ENUM('active', 'archived', 'deleted') DEFAULT 'active'");
        }
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS solutions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              doubt_id INT NOT NULL,
              user_id INT NOT NULL,
              solution TEXT NOT NULL,
              solution_image MEDIUMTEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
              id INT AUTO_INCREMENT PRIMARY KEY,
              sender_sid VARCHAR(255) NOT NULL,
              recipient_sid VARCHAR(255) NOT NULL,
              content TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX (sender_sid, recipient_sid)
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS broadcast_tasks (
              id INT AUTO_INCREMENT PRIMARY KEY,
              item_data JSON NOT NULL,
              exam_type ENUM('JEE', 'NEET', 'ALL') DEFAULT 'ALL',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const [broadcastCols] = await connection.query("SHOW COLUMNS FROM broadcast_tasks LIKE 'exam_type'");
        if (broadcastCols.length === 0) {
            await connection.query("ALTER TABLE broadcast_tasks ADD COLUMN exam_type ENUM('JEE', 'NEET', 'ALL') DEFAULT 'ALL'");
        }
        console.log("Database schema verified successfully.");
    } catch (error) {
        console.error("FATAL: Could not initialize database schema.", error);
    } finally {
        connection.release();
    }
};

const ensureAdminUserExists = async () => {
    if (!pool) return;
    const connection = await pool.getConnection();
    try {
        const adminEmail = 'patelbhavna107@gmail.com';
        const adminName = 'Bhavna Patel';
        const adminSid = 'ADMIN_BHAVNA';

        const [[existingAdmin]] = await connection.query('SELECT id, role FROM users WHERE email = ?', [adminEmail]);

        if (existingAdmin) {
            if (existingAdmin.role !== 'admin') {
                console.log(`Updating user ${adminEmail} to admin role.`);
                await connection.query('UPDATE users SET role = "admin" WHERE id = ?', [existingAdmin.id]);
            } else {
                console.log(`Admin user ${adminEmail} already exists and has correct role.`);
            }
        } else {
            console.log(`Creating new admin user for ${adminEmail}. This user must log in with Google.`);
            const profilePhoto = generateAvatar(adminName);
            // No password is set. Admin must use Google OAuth.
            await connection.query(
                'INSERT INTO users (sid, email, full_name, profile_photo, is_verified, role) VALUES (?, ?, ?, ?, ?, ?)',
                [adminSid, adminEmail, adminName, profilePhoto, true, 'admin']
            );
        }
    } catch (error) {
        console.error("Error during admin user setup:", error);
    } finally {
        connection.release();
    }
};

// --- MIDDLEWARE ---
const configurationCheckMiddleware = (req, res, next) => {
    if (!isConfigured || !pool) {
        return res.status(503).json({ status: 'misconfigured', error: 'Server is not configured. Administrator needs to set environment variables.' });
    }
    next();
};

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    const [[user]] = await pool.query('SELECT role, sid FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(401).json({ error: 'Unauthorized: User not found' });
    req.userRole = user.role;
    req.userSid = user.sid;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const apiTokenAuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: API token is missing.' });
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const [[user]] = await pool.query('SELECT id, role, sid FROM users WHERE api_token = ?', [hashedToken]);
        if (!user) return res.status(401).json({ error: 'Invalid API token.' });
        req.userId = user.id;
        req.userRole = user.role;
        req.userSid = user.sid;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error during token authentication.' });
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
const syncBroadcastsForUser = async (userId, connection) => {
    const conn = connection || await pool.getConnection();
    try {
        // Get user's exam type
        const [[userConfigRow]] = await conn.query('SELECT config FROM user_configs WHERE user_id = ?', [userId]);
        let userExamType = 'JEE'; // Default to JEE
        if (userConfigRow) {
            try {
                const config = JSON.parse(decrypt(userConfigRow.config));
                userExamType = config.settings?.examType || 'JEE';
            } catch (e) {
                console.error("Could not parse user config during broadcast sync, defaulting to JEE.");
            }
        }
        
        // Fetch relevant broadcasts
        const [broadcasts] = await conn.query(
            'SELECT item_data FROM broadcast_tasks WHERE exam_type = "ALL" OR exam_type = ?', 
            [userExamType]
        );

        if (broadcasts.length > 0) {
            const values = broadcasts.map(b => {
                const itemData = typeof b.item_data === 'string' ? JSON.parse(b.item_data) : b.item_data;
                return [userId, itemData.ID, JSON.stringify(itemData)];
            });
            if (values.length > 0) {
                await conn.query(
                    `INSERT IGNORE INTO schedule_items (user_id, item_id_str, item_data) VALUES ?`,
                    [values]
                );
            }
        }
    } catch (error) {
        console.error(`Failed to sync broadcasts for user ${userId}:`, error);
    } finally {
        if (!connection) {
            conn.release();
        }
    }
};

const getUserData = async (userId) => {
    const [[user]] = await pool.query('SELECT id, sid, email, full_name, role, profile_photo, is_verified, last_seen FROM users WHERE id = ?', [userId]);
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
        last_seen: user.last_seen,
    };

    const [scheduleRows] = await pool.query('SELECT item_data FROM schedule_items WHERE user_id = ?', [userId]);
    
    let [[userConfigRow]] = await pool.query('SELECT config FROM user_configs WHERE user_id = ?', [userId]);
    
    if (!userConfigRow) {
        const defaultConfig = {
            WAKE: '06:00', SCORE: '0/300', WEAK: [], UNACADEMY_SUB: false,
            settings: { accentColor: '#0891b2', blurEnabled: true, mobileLayout: 'standard', forceOfflineMode: false, perQuestionTime: 180, showAiChatAssistant: true, creditSaver: false, examType: 'JEE', theme: 'default', dashboardLayout: [], dashboardFlashcardDeckIds: [], musicPlayerWidgetLayout: 'minimal' },
            RESULTS: [], EXAMS: [], STUDY_SESSIONS: [], DOUBTS: [], flashcardDecks: [], customWidgets: [], localPlaylists: []
        };
        const encryptedDefaultConfig = encrypt(JSON.stringify(defaultConfig));
        await pool.query(
            `INSERT INTO user_configs (user_id, config) VALUES (?, ?)`,
            [userId, encryptedDefaultConfig]
        );
        userConfigRow = { config: encryptedDefaultConfig }; // Use the new default for the current request
    }

    const decryptedConfig = decrypt(userConfigRow.config);
    const configObject = JSON.parse(decryptedConfig);

    // Add a safe flag for the frontend to know if a key is set, without exposing the key.
    if (!configObject.settings) configObject.settings = {};
    configObject.settings.hasGeminiKey = !!configObject.geminiApiKey;

    // IMPORTANT: Remove any sensitive keys before sending the config to the client.
    delete configObject.geminiApiKey;
    
    // This is now a complete StudentData object
    return { 
      ...clientSafeUser, 
      CONFIG: configObject,
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

// PUBLIC CONFIG ROUTE
apiRouter.get('/config/public', (req, res) => {
    if (!isConfigured || !process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: 'Google integration is not configured on the server.' });
    }
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID });
});


// Apply configuration check for all subsequent routes
apiRouter.use(configurationCheckMiddleware);

// --- AUTH ENDPOINTS ---
apiRouter.post('/register', async (req, res) => {
    const { sid, fullName, email, password } = req.body;
    if (!sid || !password || !fullName || !email) return res.status(400).json({ error: 'All fields are required' });
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[existingUser]] = await connection.query('SELECT id FROM users WHERE sid = ? OR email = ?', [sid, email]);
        if (existingUser) {
            await connection.rollback();
            return res.status(409).json({ error: 'Student ID or Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const profilePhoto = generateAvatar(fullName);
        let userId;

        if (mailer) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
            
            const [result] = await connection.query(
                'INSERT INTO users (sid, email, password, full_name, profile_photo, verification_code, verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [sid, email, hashedPassword, fullName, profilePhoto, code, new Date(expires)]
            );
            userId = result.insertId;

            await syncBroadcastsForUser(userId, connection);
            await connection.commit();
            
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
            const [result] = await connection.query(
                'INSERT INTO users (sid, email, password, full_name, profile_photo, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [sid, email, hashedPassword, fullName, profilePhoto, true]
            );
            userId = result.insertId;

            await syncBroadcastsForUser(userId, connection);
            await connection.commit();

            const token = jwt.sign({ id: userId, sid: sid }, JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({ token, message: "Registered and auto-verified (mailer not configured)." });
        }
    } catch (error) {
        await connection.rollback();
        console.error("Registration error:", error);
        res.status(500).json({ error: 'Server error during registration process.' });
    } finally {
        connection.release();
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
        const [[user]] = await pool.query('SELECT id, password, is_verified, email FROM users WHERE sid = ? OR email = ?', [sid, sid]);
        if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials or sign in with Google' });

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Account not verified. Please check your email.', needsVerification: true, email: user.email });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        
        await syncBroadcastsForUser(user.id);
        const userData = await getUserData(user.id);
        const token = jwt.sign({ id: user.id, sid: userData.sid }, JWT_SECRET, { expiresIn: '7d' });
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
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

        const { email, name, sub: googleId, picture } = payload;
        
        let [[user]] = await pool.query('SELECT id, sid FROM users WHERE google_id = ? OR email = ?', [googleId, email]);
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            const [result] = await pool.query(
                'INSERT INTO users (sid, email, full_name, google_id, profile_photo, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [email, email, name, googleId, picture, true]
            );
            user = { id: result.insertId, sid: email };
        } else {
            // Update user details if they already exist from an email signup
            await pool.query('UPDATE users SET google_id = ?, profile_photo = IF(profile_photo LIKE "https://api.dicebear.com%", ?, profile_photo) WHERE id = ?', [googleId, picture, user.id]);
        }
        
        await syncBroadcastsForUser(user.id);

        const userData = await getUserData(user.id);
        const token = jwt.sign({ id: user.id, sid: userData.sid }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: userData });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

apiRouter.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!mailer) return res.status(500).json({ error: 'Password reset is not configured on this server.' });
    try {
        const [[user]] = await pool.query('SELECT id, full_name, password FROM users WHERE email = ?', [email]);
        if (user && user.password) { // Only allow reset for non-Google-only accounts
            const token = crypto.randomBytes(32).toString('hex');
            const expires = Date.now() + 3600000; // 1 hour
            await pool.query('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?', [token, new Date(expires), user.id]);
            
            // In a real app, use the actual domain from an env var
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetLink = `${frontendUrl}/?reset-token=${token}`;
            
            await mailer.sendMail({
                from: `"JEE Scheduler Pro" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Password Reset Request',
                text: `Hi ${user.full_name},\n\nYou requested a password reset. Click this link to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
                html: `<p>Hi ${user.full_name},</p><p>You requested a password reset. Click this link to reset your password: <a href="${resetLink}">Reset Password</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p>`,
            });
        }
        // Always send a success message to prevent user enumeration
        res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

apiRouter.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
    try {
        const [[user]] = await pool.query('SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()', [token]);
        if (!user) return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?', [hashedPassword, user.id]);
        
        res.status(200).json({ message: 'Password has been successfully reset.' });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- GOOGLE ASSISTANT FULFILLMENT ---
apiRouter.post('/assistant-action', async (req, res) => {
    const text = req.body.queryResult?.queryText || req.body.query;
    if (!text) {
        return res.status(400).json({ error: "Query text is required." });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("Google Assistant Error: Global API_KEY is not set.");
        return res.status(500).json({ error: "AI service is not configured on the server." });
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const assistantDataSchema = {
            type: Type.OBJECT,
            description: "The structured details for the action.",
            properties: {
                subject: { type: Type.STRING, description: "The academic subject (e.g., Physics, Chemistry, Math)." },
                topic: { type: Type.STRING, description: "The specific chapter or concept (e.g., Rotational Dynamics)." },
                date: { type: Type.STRING, description: "The target date (YYYY-MM-DD)." },
                time: { type: Type.STRING, description: "The start time (HH:MM, 24-hour). Optional for new_schedule." },
                task_type: { type: Type.STRING, description: "The task type (e.g., deep_dive, test_review). Optional for new_schedule." },
                score: { type: Type.INTEGER, description: "The numeric score achieved. Optional for log_score." },
                max_score: { type: Type.INTEGER, description: "The total possible score. Optional for log_score." },
                details: { type: Type.STRING, description: "Specific notes (e.g., 'NCERT 1-15'). Optional." }
            },
            required: ["subject", "topic", "date"]
        };

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                action: {
                    type: Type.STRING,
                    description: "The primary action: 'new_schedule', 'log_score', or 'create_homework'.",
                    enum: ["new_schedule", "log_score", "create_homework"]
                },
                data: assistantDataSchema
            },
            required: ["action", "data"]
        };
        
        const systemInstruction = `You are the JEE Scheduler Pro Fulfillment Bot. Your ONLY response must be a single, non-conversational JSON object that strictly adheres to the provided schema. DO NOT include any introductory text, Markdown formatting (e.g., \`\`\`json), explanations, or closing remarks.

### MANDATORY CONSTRAINTS:
1.  **Output:** Output MUST be a single, clean JSON object.
2.  **Schema Adherence:** Output MUST strictly follow the JSON Schema provided in the configuration.
3.  **Action Mapping:** The 'action' key must map the user's intent to one of the following: "new_schedule", "log_score", or "create_homework".
4.  **Date/Time Calculation:**
    * **Current Date Context:** Today is Monday, 2025-11-17.
    * **Relative Dates:** Accurately calculate and convert relative times ("tomorrow," "Friday," "next week") to the required **YYYY-MM-DD** format.
    * **Time:** Convert any time reference (e.g., "7 PM") to the **HH:MM** (24-hour) format (e.g., "19:00").

### MAPPING RULES:
* **Scheduling:** Use \`action: "new_schedule"\` for requests to set a time/date. Infer \`task_type\` (e.g., "deep_dive", "practice").
* **Logging:** Use \`action: "log_score"\` for requests mentioning "score," "marks," or "test result."
* **Homework/Tasks:** Use \`action: "create_homework"\` for requests mentioning "assignment" or "questions."

### MISSING DATA POLICY:
If the user's request is valid but lacks an optional field (like \`time\` or \`details\`), omit that key from the final JSON object. If a required field (\`subject\`, \`topic\`, \`date\`) is missing, include it with an empty string (\`""\`).`;


        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: text,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });
        
        const parsedJson = JSON.parse(response.text);

        if (parsedJson && parsedJson.action && parsedJson.data) {
            const { action, data } = parsedJson;
            // The frontend expects the `data` object to be stringified and encoded
            const encodedData = encodeURIComponent(JSON.stringify(data));
            const frontendUrl = process.env.FRONTEND_URL || 'https://jee.ponsrischool.in/';
            // The frontend reads 'action' and 'data' query params
            const deepLink = `${frontendUrl}?action=${action}&data=${encodedData}`;

            // Respond to Google Assistant with a modern fulfillment response that opens a deep link.
            return res.json({
                fulfillmentResponse: {
                    messages: [{
                        payload: {
                            richResponse: {
                                items: [{
                                    simpleResponse: {
                                        textToSpeech: "Opening JEE Scheduler Pro to complete your request."
                                    }
                                }, {
                                    openUrlAction: {
                                        url: deepLink
                                    }
                                }]
                            }
                        }
                    }]
                }
            });

        } else {
            console.error("AI returned malformed JSON for Assistant:", response.text);
            throw new Error("AI returned malformed JSON.");
        }
    } catch (error) {
        console.error("Google Assistant fulfillment error:", error);
        return res.status(500).json({ error: `Server error during AI processing: ${error.message}` });
    }
});

// --- ASSET PROXY ---
// This endpoint securely fetches the DJ drop without exposing the direct Nextcloud URL
// or requiring client-side CORS configuration on Nextcloud.
apiRouter.get('/assets/dj-drop', async (req, res) => {
    try {
        const { customDjDropUrl } = req.query; // Expect custom URL as query param
        let finalDjDropUrl = 'https://nc.ponsrischool.in/index.php/s/em85Zdf2EYEkz3j/download'; // Default if not custom

        if (customDjDropUrl && typeof customDjDropUrl === 'string' && customDjDropUrl.startsWith('data:audio')) {
            // If it's a data URL, decode it and send directly
            const base64Data = customDjDropUrl.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const mimeType = customDjDropUrl.split(';')[0].split(':')[1];
            
            res.setHeader('Content-Type', mimeType || 'audio/wav');
            res.setHeader('Content-Length', buffer.length);
            return res.send(buffer);
        } else if (customDjDropUrl && typeof customDjDropUrl === 'string' && customDjDropUrl.startsWith('http')) {
            // If it's another remote URL, attempt to proxy it
            finalDjDropUrl = customDjDropUrl;
        }

        const response = await fetch(finalDjDropUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch asset, status: ${response.status}`);
        }
        res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
        res.setHeader('Content-Length', response.headers.get('content-length') || '0');
        response.body.pipe(res);
    } catch (error) {
        console.error("Asset proxy error:", error);
        res.status(502).json({ error: "Could not retrieve asset from source." });
    }
});


// --- USER DATA ENDPOINTS ---
apiRouter.post('/heartbeat', authMiddleware, async(req, res) => {
    try {
        await pool.query('UPDATE users SET last_seen = NOW() WHERE id = ?', [req.userId]);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Heartbeat update error:", error);
        res.status(500).json({ error: "Failed to update user status." });
    }
});

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

apiRouter.post('/me/api-token', authMiddleware, async (req, res) => {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        await pool.query('UPDATE users SET api_token = ? WHERE id = ?', [hashedToken, req.userId]);
        res.json({ token }); // Return the plain text token ONLY once.
    } catch (error) {
        console.error("API Token generation error:", error);
        res.status(500).json({ error: "Failed to generate API token." });
    }
});

apiRouter.delete('/me/api-token', authMiddleware, async (req, res) => {
    try {
        await pool.query('UPDATE users SET api_token = NULL WHERE id = ?', [req.userId]);
        res.status(200).json({ message: 'API token revoked.' });
    } catch (error) {
        console.error("API Token revocation error:", error);
        res.status(500).json({ error: "Failed to revoke API token." });
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

apiRouter.post('/schedule-items/batch', authMiddleware, async (req, res) => {
