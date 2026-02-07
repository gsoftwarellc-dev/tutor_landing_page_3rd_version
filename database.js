const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const isVercel = process.env.VERCEL === '1';
let dbPath;

if (isVercel) {
    dbPath = path.join('/tmp', 'acelab.db');
} else {
    // Local development
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    dbPath = path.join(dataDir, 'acelab.db');
}
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeTables();
    }
});

function initializeTables() {
    // Submissions Table
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        parentName TEXT,
        parentEmail TEXT,
        parentPhone TEXT,
        studentName TEXT,
        studentDob TEXT,
        relationship TEXT,
        specificNeeds TEXT,
        subjects TEXT,
        discoverySource TEXT,
        isCharity INTEGER,
        submittedAt TEXT,
        isTrashed INTEGER DEFAULT 0,
        trashedAt TEXT
    )`);

    // Courses Table
    db.run(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        duration TEXT,
        syllabus TEXT,
        isFreeTrial INTEGER,
        isCharity INTEGER
    )`, (err) => {
        if (!err) {
            // Check if courses exist, if not seed from JSON or defaults
            seedCourses();
        }
    });
}

function seedCourses() {
    db.get("SELECT count(*) as count FROM courses", (err, row) => {
        if (err) return console.error(err);
        if (row.count === 0) {
            console.log("Seeding initial courses...");
            const defaultCourses = [
                { name: 'Year 8 - Maths', price: 15.00, duration: '1 Hour', isFreeTrial: 1, isCharity: 0 },
                { name: 'Year 9 - Maths', price: 15.00, duration: '1 Hour', isFreeTrial: 1, isCharity: 0 },
                { name: 'Year 10 - Maths', price: 15.00, duration: '1 Hour', isFreeTrial: 1, isCharity: 0 },
                { name: 'Winner Kingdom (Year 8-11)', price: 0, duration: 'Sat Only', isCharity: 1, isFreeTrial: 0 }
            ];

            const stmt = db.prepare("INSERT INTO courses (name, price, duration, syllabus, isFreeTrial, isCharity) VALUES (?, ?, ?, ?, ?, ?)");
            defaultCourses.forEach(c => {
                stmt.run(c.name, c.price, c.duration, '', c.isFreeTrial, c.isCharity);
            });
            stmt.finalize();
        }
    });
}

// Wrapper for Async/Await
const dbAsync = {
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    },
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

module.exports = dbAsync;
