

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
const isConfigured = process.env.DB_HOST && process.env.JWT_SECRET && process.env.DB_USER && process.env.DB_NAME && process.env.ENCRYPTION_KEY && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

let pool = null;
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
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add password reset columns if they don't exist
        const [cols] = await connection.query("SHOW COLUMNS FROM users LIKE 'password_reset_token'");
        if (cols.length === 0) {
            await connection.query("ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255), ADD COLUMN password_reset_expires DATETIME");
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
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
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
    
    let [[userConfigRow]] = await pool.query('SELECT config FROM user_configs WHERE user_id = ?', [userId]);
    
    // FIX: If a user has no config, create a default one on-the-fly.
    if (!userConfigRow) {
        const defaultConfig = {
            WAKE: '06:00', SCORE: '0/300', WEAK: [], UNACADEMY_SUB: false,
            settings: { accentColor: '#0891b2', blurEnabled: true, mobileLayout: 'standard', forceOfflineMode: false, perQuestionTime: 180 },
            RESULTS: [], EXAMS: [], STUDY_SESSIONS: [], DOUBTS: [], flashcardDecks: [],
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
        const [[user]] = await pool.query('SELECT id, password, is_verified, email FROM users WHERE sid = ? OR email = ?', [sid, sid]);
        if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials or sign in with Google' });

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Account not verified. Please check your email.', needsVerification: true, email: user.email });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        
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

        if (!user) {
            const [result] = await pool.query(
                'INSERT INTO users (sid, email, full_name, google_id, profile_photo, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [email, email, name, googleId, picture, true]
            );
            user = { id: result.insertId, sid: email };
        } else {
            // Update user details if they already exist from an email signup
            await pool.query('UPDATE users SET google_id = ?, profile_photo = IF(profile_photo LIKE "https://api.dicebear.com%", ?, profile_photo) WHERE id = ?', [googleId, picture, user.id]);
        }
        
        const userData = await getUserData(user.id);
        const token = jwt.sign({ id: user.id, sid: user.sid }, JWT_SECRET, { expiresIn: '7d' });
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
            const resetLink = `http://localhost:5173/?reset-token=${token}`;
            
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

apiRouter.post('/schedule-items/batch', authMiddleware, async (req, res) => {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: 'Tasks array is required.' });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const query = `INSERT INTO schedule_items (user_id, item_id_str, item_data) VALUES ?
                       ON DUPLICATE KEY UPDATE item_data = VALUES(item_data)`;
        const values = tasks.map(task => [req.userId, task.ID, JSON.stringify(task)]);
        
        await connection.query(query, [values]);
        
        await connection.commit();
        res.status(201).json({ success: true, count: tasks.length });
    } catch (error) {
        await connection.rollback();
        console.error("Error batch saving tasks:", error);
        res.status(500).json({ error: 'Failed to save tasks' });
    } finally {
        connection.release();
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
        
        // Securely handle Gemini API key update
        let newConfig = { ...currentConfig };
        if (updates.geminiApiKey) {
            newConfig.geminiApiKey = updates.geminiApiKey;
            // Do not let the rest of the updates overwrite this
            delete updates.geminiApiKey;
        }

        const newSettings = updates.settings 
            ? { ...currentConfig.settings, ...updates.settings }
            : currentConfig.settings;
            
        newConfig = { 
            ...newConfig, 
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
        
        // Preserve sensitive data like API keys that aren't sent to the frontend
        const [[userConfig]] = await pool.query("SELECT config FROM user_configs WHERE user_id = ?", [req.userId]);
        const currentConfig = userConfig?.config ? JSON.parse(decrypt(userConfig.config)) : {};

        // 1. Update the main config blob
        const configToSave = {
            ...CONFIG,
            geminiApiKey: currentConfig.geminiApiKey, // Preserve existing key
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
const getApiKeyForUser = async (userId) => {
    const [[userConfigRow]] = await pool.query("SELECT config FROM user_configs WHERE user_id = ?", [userId]);
    if (userConfigRow) {
        const config = JSON.parse(decrypt(userConfigRow.config));
        if (config.geminiApiKey) {
            return config.geminiApiKey;
        }
    }
    return process.env.API_KEY; // Fallback to global key
};

apiRouter.post('/ai/daily-insight', authMiddleware, async (req, res) => {
    const { weaknesses } = req.body;
    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) return res.status(500).json({ error: "AI service is not configured." });

    try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are a helpful AI assistant for JEE aspirants. Your task is to provide a daily motivational quote and a relevant, useful piece of academic information (like a formula, a key concept, or a common mistake to avoid) based on the student's list of weaknesses.
        Your response MUST be a single, valid JSON object with two keys: "quote" and "insight".
        - "quote": A short, motivational quote for a student.
        - "insight": A string containing a relevant formula or important point related to one of the student's weaknesses. Make it concise and easy to understand.`;
        
        const prompt = `Student's current weaknesses: ${weaknesses.join(', ')}. Generate a quote and an insight.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json'
            },
        });
        
        res.json(JSON.parse(response.text));
    } catch (error) {
        console.error("Gemini API error (daily insight):", error);
        res.status(500).json({ error: `Failed to get daily insight from AI: ${error.message}` });
    }
});


apiRouter.post('/ai/analyze-mistake', authMiddleware, async (req, res) => {
    const { prompt, imageBase64 } = req.body;
    if (!prompt) return res.status(400).json({ error: "A prompt describing the mistake is required." });

    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) return res.status(500).json({ error: "AI service is not configured." });

    try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are a JEE test preparation expert. A student has provided an image of a question and a description of their mistake. Analyze their conceptual error. Respond ONLY with a valid JSON object with two keys: "mistake_topic" (a short, specific topic name like "Conservation of Momentum") and "explanation" (a detailed but concise explanation of the fundamental concept they misunderstood and how to correct it). Do not include any other text or markdown formatting.`;

        const contentParts = [{ text: `Student's mistake description: "${prompt}"` }];
        if (imageBase64) {
            contentParts.unshift({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: contentParts },
            config: {
                systemInstruction,
                responseMimeType: 'application/json'
            },
        });
        
        // Gemini with JSON output mode returns the JSON string directly in response.text
        res.json({ response: response.text });
    } catch (error) {
        console.error("Gemini API error (analyze mistake):", error);
        res.status(500).json({ error: `Failed to get analysis from AI: ${error.message}` });
    }
});


apiRouter.post('/ai/solve-doubt', authMiddleware, async (req, res) => {
    const { prompt, imageBase64 } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: "A prompt is required." });
    }
    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) {
        return res.status(500).json({ error: "AI service is not configured. Please add a Gemini API key in settings." });
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
            model: 'gemini-2.5-flash',
            contents: contents,
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: `Failed to get response from AI: ${error.message}` });
    }
});

apiRouter.post('/ai/parse-text', authMiddleware, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required." });
    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) return res.status(500).json({ error: "AI service is not configured. Please add a Gemini API key in settings." });

    try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an expert data transformation AI. Your sole purpose is to convert unstructured text into a single, clean, structured JSON object.
RULES:
1.  **JSON ONLY:** Your entire output MUST be a single raw JSON object. Do not include explanations, apologies, conversational text, or markdown formatting like \`\`\`json.
2.  **CLEANUP:** The input may contain surrounding text. Ignore it and extract only the data.
3.  **DATA CORRECTION:** Automatically fix common formatting issues. Convert dates to \`YYYY-MM-DD\` format. Convert times to \`HH:MM\` format.
4.  **MULTI-SCHEMA:** The input may contain multiple data types. Populate all relevant arrays in the output JSON.
5.  **ID GENERATION:** Generate a unique alphanumeric ID for every single schedule or exam item.
6.  **STRICT SCHEMA OUTPUT:** Your output JSON MUST strictly adhere to the following structure:
    {
      "schedules": [ { "id": string, "type": "ACTION" | "HOMEWORK", "day": string, "time": string?, "title": string, "detail": string, "subject": string, "q_ranges": string?, "sub_type": string? } ],
      "exams": [ { "id": string, "type": "EXAM", "subject": string, "title": string, "date": string, "time": string, "syllabus": string } ],
      "metrics": [ { "type": "RESULT" | "WEAKNESS", "score": string?, "mistakes": string?, "weaknesses": string? } ]
    }
    For metrics, 'mistakes' and 'weaknesses' should be semicolon-separated strings.`;

        const prompt = `Convert the following text into a structured JSON object based on the system instruction schema.\n\nUSER TEXT TO CONVERT:\n${text}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more powerful model for complex parsing
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: 'application/json'
            },
        });

        res.json(JSON.parse(response.text.trim()));
    } catch (error) {
        console.error("Gemini API error (text parse):", error);
        res.status(500).json({ error: `Failed to parse text: ${error.message}` });
    }
});

apiRouter.post('/ai/parse-image-to-csv', authMiddleware, async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Image data is required." });
    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) return res.status(500).json({ error: "AI service is not configured. Please add a Gemini API key in settings." });

    try {
        const ai = new GoogleGenAI({ apiKey });
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

apiRouter.post('/ai/analyze-test-results', authMiddleware, async (req, res) => {
    const { imageBase64, userAnswers, timings, syllabus } = req.body;
    if (!imageBase64 || !userAnswers || !timings || !syllabus) return res.status(400).json({ error: "Answer key image, user answers, timings, and syllabus are required." });

    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) return res.status(500).json({ error: "AI service is not configured." });

    try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an expert AI assistant for analyzing JEE Mains exam results. You will be given an image of an answer key, a JSON object of the student's answers, a JSON object of the time spent per question, and the exam syllabus.
        Your task is multi-faceted:
        1.  **Grade the Exam:** Extract correct answers from the image. Compare with student answers. Calculate the score using the JEE Mains scheme (+4/-1 for MCQs, +4/0 for Numericals, 0 for unattempted).
        2.  **Analyze Timing:** Calculate the total time spent on Physics, Chemistry, and Maths. Identify the subject that took the most time.
        3.  **Analyze Mistakes by Syllabus:** Using the provided syllabus, map each incorrect question number to its corresponding chapter/topic. Aggregate the number of correct and incorrect answers for each chapter mentioned in the syllabus. Calculate accuracy for each chapter.
        4.  **Provide Suggestions:** Generate a concise, actionable paragraph of suggestions for improvement based on the performance, timing, and weak chapters.

        **Output Format:** Your ENTIRE response MUST be a single, valid JSON object. Do not include any other text, explanations, or markdown formatting. The JSON object must have the following structure:
        {
          "score": number,
          "totalMarks": number,
          "correctQuestionNumbers": number[],
          "incorrectQuestionNumbers": number[],
          "unattemptedQuestionNumbers": number[],
          "subjectTimings": { "PHYSICS": number (seconds), "CHEMISTRY": number (seconds), "MATHS": number (seconds) },
          "chapterScores": { "Chapter Name from Syllabus": { "correct": number, "incorrect": number, "accuracy": number (0-100) } },
          "aiSuggestions": "string"
        }`;
            
        const prompt = `
        Student's Answers: ${JSON.stringify(userAnswers)}
        Time per Question (seconds): ${JSON.stringify(timings)}
        Exam Syllabus: ${syllabus}
        
        Analyze the provided answer key image and the student's data. Return the full analysis in the specified JSON format.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Use a more powerful model for this complex task
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
                ]
            },
            config: { 
                systemInstruction,
                responseMimeType: 'application/json'
            },
        });

        res.json(JSON.parse(response.text));
    } catch (error) {
        console.error("Gemini API error (analyze results):", error);
        res.status(500).json({ error: `Failed to analyze test results with AI: ${error.message}` });
    }
});

apiRouter.post('/ai/analyze-specific-mistake', authMiddleware, async (req, res) => {
    const { imageBase64, prompt } = req.body;
    if (!imageBase64 || !prompt) return res.status(400).json({ error: "Image of the question and a description are required." });

    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) return res.status(500).json({ error: "AI service is not configured." });

    try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are a master JEE tutor. A student has uploaded an image of a specific question they got wrong and a brief description of their error. Your task is to provide a clear, concise analysis.
        **Output Format:** Your ENTIRE response MUST be a single, valid JSON object with two keys:
        1. "topic": A very specific, short topic name for this question (e.g., "Moment of Inertia of a Cone", "SN2 Reaction Mechanism").
        2. "explanation": A step-by-step explanation. Start by stating the core concept, then identify the student's likely error based on their description, and finally, provide the correct method to solve the problem. Use markdown for formatting within the explanation string.`;
            
        const fullPrompt = `Student's description of mistake: "${prompt}". Please analyze the attached question image and provide the analysis in the specified JSON format.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: fullPrompt },
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
                ]
            },
            config: { 
                systemInstruction,
                responseMimeType: 'application/json'
            },
        });

        res.json(JSON.parse(response.text));
    } catch (error) {
        console.error("Gemini API error (specific mistake):", error);
        res.status(500).json({ error: `Failed to analyze mistake with AI: ${error.message}` });
    }
});


apiRouter.post('/ai/chat', authMiddleware, async (req, res) => {
    const { history, prompt, imageBase64 } = req.body;
    if (!prompt) return res.status(400).json({ error: "A prompt is required." });

    const apiKey = await getApiKeyForUser(req.userId);
    if (!apiKey) return res.status(500).json({ error: "AI service is not configured. Please add a Gemini API key in settings." });

    try {
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are a helpful and friendly AI assistant for JEE (Joint Entrance Examination) aspirants. Your goal is to help students with their academic questions related to Physics, Chemistry, and Maths, and provide guidance on health and wellness for students. Politely decline to answer questions outside of these topics. Be encouraging and supportive.`;
        
        const contents = [];
        if (history) {
            contents.push(...history);
        }
        
        const userParts = [{ text: prompt }];
        if (imageBase64) {
            // The Gemini API expects image data first for multimodal prompts.
            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } };
            userParts.unshift(imagePart);
        }
        contents.push({ role: 'user', parts: userParts });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: { systemInstruction },
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("Gemini API error (chat):", error);
        res.status(500).json({ error: `Failed to get response from AI: ${error.message}` });
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
const startServer = async () => {
    if (isConfigured) {
        await initializeDatabaseSchema();
        await ensureAdminUserExists();
    }
    if (isConfigured && mailer) {
        try {
            await mailer.verify();
            console.log('SMTP mailer configured and verified.');
        } catch (error) {
            console.error("SMTP mailer verification failed:", error);
        }
    } else if (isConfigured) {
        console.warn("SMTP mailer not configured. Email verification and password resets will be skipped/disabled.");
    }

    if (!process.env.VERCEL) {
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}. Configured: ${isConfigured}`));
    }
};

startServer();

// Export the app for Vercel's serverless environment
export default app;
