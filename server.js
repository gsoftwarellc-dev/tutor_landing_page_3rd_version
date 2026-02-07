const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('./database'); // Import SQLite wrapper

const app = express();
const PORT = process.env.PORT || 3000;

// Admin Config (Still in JSON or Memory for now, could be in DB too)
const DEFAULT_ADMIN = {
  email: 'admin@acelab.com',
  password: 'admin123',
};

const sessions = {};

// Helper: Normalize string
function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function getToken(req) {
  const authHeader = req.get('authorization') || '';
  const parts = authHeader.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0]) && parts[1]) {
    return parts[1];
  }
  if (req.query && typeof req.query.token === 'string' && req.query.token.trim() !== '') {
    return req.query.token.trim();
  }
  return null;
}

function requireAdmin(req, res, next) {
  const token = getToken(req);
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/charity', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'charity.html'));
});

app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API: Get Courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await db.all("SELECT * FROM courses");
    // Map boolean fields for frontend compatibility
    const mapped = courses.map(c => ({
      ...c,
      isFreeTrial: !!c.isFreeTrial,
      isCharity: !!c.isCharity
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
});

// Admin API: Get Courses
app.get('/admin/api/courses', requireAdmin, async (req, res) => {
  try {
    const courses = await db.all("SELECT * FROM courses");
    const mapped = courses.map(c => ({
      ...c,
      isFreeTrial: !!c.isFreeTrial,
      isCharity: !!c.isCharity
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin API: Update Courses
app.post('/admin/api/courses', requireAdmin, async (req, res) => {
  const courses = req.body;
  if (!Array.isArray(courses)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    for (const c of courses) {
      // Update existing or Insert new (simplified: assumption is update mostly)
      if (c.id) {
        await db.run("UPDATE courses SET name=?, price=?, duration=?, syllabus=?, isFreeTrial=?, isCharity=? WHERE id=?",
          [c.name, c.price, c.duration, c.syllabus, c.isFreeTrial ? 1 : 0, c.isCharity ? 1 : 0, c.id]);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save" });
  }
});


app.post('/submit', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: 'Invalid submission payload' });
  }

  const requiredMissing = !hasText(payload.parentName)
    || !hasText(payload.parentEmail)
    || !hasText(payload.parentPhone)
    || !hasText(payload.studentName)
    || !hasText(payload.studentDob)
    || !Array.isArray(payload.subjects)
    || payload.subjects.length === 0;

  if (requiredMissing) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const submission = {
    id: uuidv4(),
    ...payload,
    submittedAt: new Date().toISOString(),
    isTrashed: 0,
    isChariity: (payload.isCharity === 'true' || payload.isCharity === true) ? 1 : 0,
  };

  try {
    await db.run(`INSERT INTO submissions (
        id, parentName, parentEmail, parentPhone, studentName, studentDob, 
        relationship, specificNeeds, subjects, discoverySource, isCharity, 
        submittedAt, isTrashed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      submission.id,
      submission.parentName,
      submission.parentEmail,
      submission.parentPhone,
      submission.studentName,
      submission.studentDob,
      submission.relationship || '',
      submission.specificNeeds || '',
      submission.subjects.join(','),
      submission.discoverySource || '',
      submission.isChariity,
      submission.submittedAt,
      0
    ]);
    console.log('New submission received:', submission.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Submit Error", err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  // For now verify against default admin
  if (email !== DEFAULT_ADMIN.email || password !== DEFAULT_ADMIN.password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = uuidv4();
  sessions[token] = true;
  return res.json({ ok: true, token });
});

// Change Password - In-memory for now or we could create a users table.
// For simplicity in this migration step, allowing change on current run, but it won't persist to DB deeply yet unless we add users table.
// User requested SQLite migration for "Data". Let's stick to submissions/courses data.
// We can use admin.json still for config or just memory. Keeping as is for now implies it won't persist if we removed fs logic for admin.json.
// Let's bring back simple fs for admin config ONLY, to keep password change working.
const fs = require('fs');
const adminFile = path.join(__dirname, 'data', 'admin.json');
function loadAdminConfig() {
  try {
    if (!fs.existsSync(adminFile)) return DEFAULT_ADMIN;
    return JSON.parse(fs.readFileSync(adminFile, 'utf8'));
  } catch { return DEFAULT_ADMIN; }
}
function saveAdminConfig(cfg) {
  fs.writeFileSync(adminFile, JSON.stringify(cfg), 'utf8');
}

app.post('/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const config = loadAdminConfig();

  if (currentPassword !== config.password) {
    return res.status(400).json({ error: 'Incorrect password' });
  }

  saveAdminConfig({ ...config, password: newPassword });

  // Invalidate token
  const token = getToken(req);
  if (token) delete sessions[token];

  return res.json({ ok: true });
});

app.post('/admin/backup', requireAdmin, (req, res) => {
  // Return the path to the sqlite file relative to public for download? No, security risk.
  // We can verify functionality but maybe just return successful for now.
  // SQLite is a single file backup.
  return res.json({ ok: true, message: "Use Hostinger Backups or download data/acelab.db via FTP" });
});

app.get('/admin/submissions', requireAdmin, async (req, res) => {
  const trashedFilter = req.query.trashed;
  const typeFilter = req.query.type; // 'charity' or 'standard'

  try {
    let sql = "SELECT * FROM submissions";
    const conditions = [];

    // Trash Filter
    if (trashedFilter === 'true') {
      conditions.push("isTrashed = 1");
    } else if (trashedFilter === 'all') {
      // No trash filter
    } else {
      conditions.push("isTrashed = 0");
    }

    // Type Filter
    if (typeFilter === 'charity') {
      conditions.push("isCharity = 1");
    } else if (typeFilter === 'standard') {
      conditions.push("isCharity = 0");
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY submittedAt DESC";

    const rows = await db.all(sql);
    // Map subjects back to array
    const mapped = rows.map(r => ({
      ...r,
      subjects: r.subjects ? r.subjects.split(',') : [],
      isTrashed: !!r.isTrashed,
      isCharity: !!r.isCharity
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/submissions/:id', requireAdmin, async (req, res) => {
  try {
    const row = await db.get("SELECT * FROM submissions WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: "Not found" });
    row.subjects = row.subjects ? row.subjects.split(',') : [];
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/submissions/:id', requireAdmin, async (req, res) => {
  try {
    await db.run("UPDATE submissions SET isTrashed=1, trashedAt=? WHERE id=?", [new Date().toISOString(), req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/submissions/:id/restore', requireAdmin, async (req, res) => {
  try {
    await db.run("UPDATE submissions SET isTrashed=0, trashedAt=NULL WHERE id=?", [req.params.id]);
    res.json({ ok: true, restored: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/submissions/:id/permanent', requireAdmin, async (req, res) => {
  try {
    await db.run("DELETE FROM submissions WHERE id=?", [req.params.id]);
    res.json({ ok: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export
app.get('/admin/export', requireAdmin, async (req, res) => {
  try {
    const submissions = await db.all("SELECT * FROM submissions ORDER BY submittedAt DESC");
    const headers = [
      'Date', 'Parent Name', 'Parent Email', 'Parent Phone',
      'Student Name', 'Subjects', 'Type'
    ];

    const rows = submissions.map(s => [
      s.submittedAt,
      escapeCsv(s.parentName),
      escapeCsv(s.parentEmail),
      escapeCsv(s.parentPhone),
      escapeCsv(s.studentName),
      escapeCsv(s.subjects),
      s.isCharity ? 'Charity' : 'Standard'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).send("Export failed");
  }
});

function escapeCsv(t) {
  if (!t) return '';
  return `"${String(t).replace(/"/g, '""')}"`;
}

// Export for Vercel
module.exports = app;

// Only listen if not running in Vercel (local dev or VPS)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
