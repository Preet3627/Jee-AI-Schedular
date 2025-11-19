
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
const requiredEnvVars = ['DB_HOST', 'JWT_SECRET', 'DB_USER', 'DB_NAME', 'ENCRYPTION_KEY', 'GOOGLE_CLIENT_ID'];
const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
const isConfigured = missingEnvVars.length === 0;

const isNextcloudMusicConfigured = !!(process.env.NEXTCLOUD_URL && process.env.NEXTCLOUD_MUSIC_SHARE_TOKEN);
const isNextcloudStudyConfigured = !!(process.env.NEXTCLOUD_URL && process.env.NEXTCLOUD_SHARE_TOKEN);

let pool = null;
let mailer = null;
let googleClient = null;

// Ensure JWT_SECRET is available immediately for middleware
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && isConfigured) { // This should ideally be caught by isConfigured check
    console.error("CRITICAL ERROR: JWT_SECRET is not set in .env. Server will be unstable.");
}


// --- ENCRYPTION SETUP ---
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_BUFFER = isConfigured && process.env.ENCRYPTION_KEY ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32) : null;
const IV_LENGTH = 16;

const encrypt = (text) => {
    if (!ENCRYPTION_KEY_BUFFER) throw new Error('Encryption key not configured for encryption.');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (text) => {
    if (!ENCRYPTION_KEY_BUFFER) {
        console.warn('Encryption key not configured for decryption. Returning original text.');
        return text;
    }
    try {
        const parts = text.split(':');
        if (parts.length !== 2) throw new Error('Invalid encrypted format.');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
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
    console.error("FATAL ERROR: Server environment variables are not configured: ", missingEnvVars.join(', '));
    console.error("The server will run in a misconfigured state.");
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
      STUDY_S