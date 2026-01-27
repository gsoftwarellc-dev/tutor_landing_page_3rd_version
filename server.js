const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'submissions.json');
const adminFile = path.join(dataDir, 'admin.json');
const backupDir = path.join(dataDir, 'backups');

const DEFAULT_ADMIN = {
  email: 'admin@acelab.com',
  password: 'admin123',
};

const sessions = {};

function ensureDataFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
}

function loadSubmissions() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveSubmissions(submissions) {
  createBackup();
  fs.writeFileSync(dataFile, JSON.stringify(submissions, null, 2), 'utf8');
}

function ensureBackupDir() {
  fs.mkdirSync(backupDir, { recursive: true });
}

function getBackupTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

function pruneBackups() {
  ensureBackupDir();
  const files = fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith('submissions-') && name.endsWith('.json'))
    .sort();

  const excess = files.length - 30;
  if (excess <= 0) {
    return;
  }

  for (let i = 0; i < excess; i += 1) {
    fs.unlinkSync(path.join(backupDir, files[i]));
  }
}

function createBackup() {
  ensureDataFile();
  ensureBackupDir();
  const timestamp = getBackupTimestamp();
  const filename = `submissions-${timestamp}.json`;
  const target = path.join(backupDir, filename);
  fs.copyFileSync(dataFile, target);
  pruneBackups();
  return filename;
}

function ensureAdminFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(adminFile)) {
    fs.writeFileSync(adminFile, JSON.stringify(DEFAULT_ADMIN, null, 2), 'utf8');
  }
}

function loadAdminConfig() {
  try {
    ensureAdminFile();
    const raw = fs.readFileSync(adminFile, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      email: parsed.email || DEFAULT_ADMIN.email,
      password: parsed.password || DEFAULT_ADMIN.password,
    };
  } catch (err) {
    return null;
  }
}

function saveAdminConfig(config) {
  ensureAdminFile();
  const updated = {
    email: config.email || DEFAULT_ADMIN.email,
    password: config.password || DEFAULT_ADMIN.password,
  };
  fs.writeFileSync(adminFile, JSON.stringify(updated, null, 2), 'utf8');
}

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

function getSubmissionTimestamp(submission) {
  const raw = submission.submittedAt || submission.createdAt;
  if (!raw) {
    return 0;
  }
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isTrashed(submission) {
  return submission && (submission.isTrashed === true || submission.isArchived === true);
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildCsv(submissions) {
  const headers = [
    'Date',
    'Parent Name',
    'Parent Email',
    'Parent Phone',
    'Student Name',
    'Student Email',
    'Student DOB',
    'Subjects',
    'Discovery Source',
    'Specific Needs',
  ];

  const rows = submissions.map((submission) => [
    submission.submittedAt || submission.createdAt || '',
    submission.parentName || '',
    submission.parentEmail || '',
    submission.parentPhone || '',
    submission.studentName || '',
    submission.studentEmail || '',
    submission.studentDob || '',
    Array.isArray(submission.subjects) ? submission.subjects.join(', ') : '',
    submission.discoverySource || '',
    submission.specificNeeds || '',
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/submit', (req, res) => {
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
    isTrashed: false,
    trashedAt: null,
  };

  const submissions = loadSubmissions();
  submissions.push(submission);
  saveSubmissions(submissions);

  console.log('New submission received:', submission.id);

  return res.json({ ok: true });
});

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  const adminConfig = loadAdminConfig();
  if (!adminConfig) {
    return res.status(500).json({ error: 'Admin config unavailable' });
  }

  if (email !== adminConfig.email || password !== adminConfig.password) {
    console.log('Admin login failed:', email || 'unknown');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = uuidv4();
  sessions[token] = true;

  console.log('Admin login success:', email);

  return res.json({ ok: true, token });
});

app.post('/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const adminConfig = loadAdminConfig();
  if (!adminConfig) {
    return res.status(500).json({ error: 'Admin config unavailable' });
  }

  if (!hasText(currentPassword) || currentPassword !== adminConfig.password) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  if (!hasText(newPassword) || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  createBackup();
  saveAdminConfig({ email: adminConfig.email, password: newPassword });

  const token = getToken(req);
  if (token) {
    delete sessions[token];
  }

  console.log('Admin password changed successfully');

  return res.json({ ok: true });
});

app.post('/admin/backup', requireAdmin, (req, res) => {
  const filename = createBackup();
  return res.json({ ok: true, filename });
});

app.get('/admin/submissions', requireAdmin, (req, res) => {
  const trashedFilter = req.query.trashed ?? req.query.archived;
  const submissions = loadSubmissions()
    .filter((submission) => {
      if (trashedFilter === 'true') {
        return isTrashed(submission);
      }
      if (trashedFilter === 'all') {
        return true;
      }
      return !isTrashed(submission);
    })
    .sort((a, b) => getSubmissionTimestamp(b) - getSubmissionTimestamp(a));
  return res.json(submissions);
});

app.get('/admin/submissions/:id', requireAdmin, (req, res) => {
  const submissions = loadSubmissions();
  const submission = submissions.find((item) => item.id === req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json(submission);
});

app.delete('/admin/submissions/:id', requireAdmin, (req, res) => {
  const submissions = loadSubmissions();
  const submission = submissions.find((item) => item.id === req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Not found' });
  }

  submission.isTrashed = true;
  submission.trashedAt = new Date().toISOString();
  submission.isArchived = true;
  submission.archivedAt = submission.trashedAt;
  saveSubmissions(submissions);

  console.log(`Submission trashed: ${submission.id}`);

  return res.json({ ok: true, trashed: true });
});

app.post('/admin/submissions/:id/restore', requireAdmin, (req, res) => {
  const submissions = loadSubmissions();
  const submission = submissions.find((item) => item.id === req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Not found' });
  }

  submission.isTrashed = false;
  submission.trashedAt = null;
  submission.isArchived = false;
  submission.archivedAt = null;
  saveSubmissions(submissions);

  console.log(`Submission restored: ${submission.id}`);

  return res.json({ ok: true, restored: true });
});

app.delete('/admin/submissions/:id/permanent', requireAdmin, (req, res) => {
  const submissions = loadSubmissions();
  const index = submissions.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Not found' });
  }

  const [removed] = submissions.splice(index, 1);
  saveSubmissions(submissions);

  console.log(`Submission permanently deleted: ${removed.id}`);

  return res.json({ ok: true, deleted: true });
});

app.get('/admin/export', requireAdmin, (req, res) => {
  const submissions = loadSubmissions();
  const csv = buildCsv(submissions);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
  return res.status(200).send(csv);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
