const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { open } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;
const isNetlify = !!process.env.NETLIFY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      })
    : null;
const useSupabaseStorage = !!supabase;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: 'HelpDesk API is running' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'HelpDesk API is running' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health/db', (req, res) => {
  db.get('SELECT 1 as ok', [], (err) => {
    if (err) {
      console.error('DB health check failed:', err?.stack || err);
      return res.status(500).json({ ok: false });
    }
    return res.json({ ok: true });
  });
});

const uploadsDir = isNetlify ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!useSupabaseStorage) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
}

const upload = multer({
  storage: useSupabaseStorage
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname || '');
          const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          cb(null, name);
        }
      }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const maybeUploadSingle = (field) => (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return upload.single(field)(req, res, next);
  }
  return next();
};

const db = open();
const dbReady = db?.ready || Promise.resolve();

function readUserField(user, key) {
  if (!user) return undefined;
  const lower = key.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(user, key)) return user[key];
  if (Object.prototype.hasOwnProperty.call(user, lower)) return user[lower];
  return undefined;
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    id: user.id ?? readUserField(user, 'id'),
    username: user.username ?? readUserField(user, 'username'),
    role: user.role ?? readUserField(user, 'role'),
    password: user.password ?? readUserField(user, 'password'),
    firstName: readUserField(user, 'firstName') || '',
    lastName: readUserField(user, 'lastName') || '',
    email: readUserField(user, 'email') || '',
    phone: readUserField(user, 'phone') || '',
    isSuper: !!Number(readUserField(user, 'isSuper')),
    mustChangePassword: !!Number(readUserField(user, 'mustChangePassword'))
  };
}

function findUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      resolve(normalizeUser(row));
    });
  });
}

function getDisplayNameFor(username) {
  return findUserByUsername(username)
    .then((userRow) => {
      const displayName = [userRow?.firstName, userRow?.lastName].filter(Boolean).join(' ');
      return displayName || username;
    })
    .catch(() => username);
}

function getUserTasks(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT t.id, t.name
       FROM user_tasks ut
       JOIN tasks t ON t.id = ut.task_id
       WHERE ut.user_id = ?`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

function seedAdminUser() {
  return new Promise((resolve) => {
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (row) return resolve();
      
      try {
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));
        const admin = usersData[0];
        const hashed = bcrypt.hashSync(admin.password, 10);

        db.run(
          'INSERT INTO users (id, username, password, role, isSuper, firstName, lastName, email, phone, mustChangePassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            admin.id,
            admin.username,
            hashed,
            admin.role || 'Admin',
            admin.isSuper ? 1 : 0,
            admin.firstName || 'System',
            admin.lastName || 'Admin',
            admin.email || 'admin@example.com',
            admin.phone || '000-000-0000',
            0
          ],
          () => {
            console.log('Admin seeded: admin / admin');
            resolve();
          }
        );
      } catch (e) { resolve(); }
    });
  });
}

function seedSampleTickets() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM tickets', [], (err, row) => {
      if (row && row.count > 0) return resolve();
      const now = new Date();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sql = `INSERT INTO tickets (department, summary, description, creator, status, priority, category, assignee, createdAt) VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      db.run(sql, [
        'Support', 'Server room AC is leaking', 'Water dripping near rack 3. Please inspect HVAC drain.', 'John Doe', 'Open', 'High', 'Water Problem', 'Wilson', now.toISOString(),
        'Development', 'Need new mouse for workstation 4', 'Standard USB mouse stopped working. Replace unit.', 'Jane Smith', 'Open', 'Low', 'General Problem', null, yesterday.toISOString()
      ], () => {
        console.log('Tickets seeded');
        resolve();
      });
    });
  });
}

function seedCategories() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
      if (row && row.count > 0) return resolve();
      const sql = `INSERT INTO categories (name) VALUES (?), (?), (?)`;
      db.run(sql, ['Electricity Problem', 'Water Problem', 'General Problem'], () => {
        console.log('Categories seeded');
        resolve();
      });
    });
  });
}

function seedDepartments() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM departments', [], (err, row) => {
      if (row && row.count > 0) return resolve();
      const sql = `INSERT INTO departments (name) VALUES (?), (?), (?), (?)`;
      db.run(sql, ['Development', 'Education', 'Health Centre', 'Support'], () => {
        console.log('Departments seeded');
        resolve();
      });
    });
  });
}

function seedTasks() {
  return new Promise((resolve) => {
    const taskNames = [
      'View Dashboard',
      'View Tickets Page',
      'View Users Page',
      'View Reports Page',
      'View Config Page',
      'Create Users',
      'Edit Users',
      'Delete Users',
      'Manage Categories',
      'Manage Departments',
      'Manage Email Notifications',
      'Create Tickets',
      'View All Tickets',
      'Assign Tickets',
      'Modify Tickets',
      'Close Tickets',
      'Delete Tickets',
      'Edit Tickets',
      'Comment on Tickets',
      'View own Tickets',
      'View New Tickets Stat',
      'View Your Tickets Stat',
      'View Open Tickets Stat',
      'View Unassigned Tickets Stat',
      'View Ticket History Chart',
      'View Ticket Churn Chart',
      'View First Response Time',
      'View Tickets Close Time',
      'View Category Breakdown',
      'View Top Ticket Creators',
      'View Ticket History',
      'View own Ticket History'
    ];
    let remaining = taskNames.length;
    if (!remaining) return resolve();
    taskNames.forEach((name) => {
      db.run(`INSERT INTO tasks (name) VALUES (?) ON CONFLICT (name) DO NOTHING`, [name], () => {
        remaining -= 1;
        if (remaining === 0) {
          console.log('Tasks seeded');
          resolve();
        }
      });
    });
  });
}

function seedRoleTasks() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM role_tasks', [], (err, row) => {
      if (row && row.count > 0) {
        db.get('SELECT id FROM tasks WHERE name = ?', ['View Reports Page'], (taskErr, taskRow) => {
          if (taskErr || !taskRow) return resolve();
          db.run(
            'INSERT INTO role_tasks (role, task_id) VALUES (?, ?), (?, ?) ON CONFLICT (role, task_id) DO NOTHING',
            ['Admin', taskRow.id, 'Manager', taskRow.id],
            () => resolve()
          );
        });
        return;
      }
      const rolePresets = {
        Admin: [
          'View Dashboard',
          'View Tickets Page',
          'View Users Page',
          'View Reports Page',
          'View Config Page',
          'Create Users',
          'Edit Users',
          'Delete Users',
          'Manage Categories',
          'Manage Departments',
          'Manage Email Notifications',
          'Create Tickets',
          'View All Tickets',
          'Assign Tickets',
          'Modify Tickets',
          'Close Tickets',
          'Delete Tickets',
          'Edit Tickets',
          'Comment on Tickets',
          'View own Tickets',
          'View New Tickets Stat',
          'View Your Tickets Stat',
          'View Open Tickets Stat',
          'View Unassigned Tickets Stat',
          'View Ticket History Chart',
          'View Ticket Churn Chart',
          'View First Response Time',
          'View Tickets Close Time',
          'View Category Breakdown',
          'View Top Ticket Creators',
          'View Ticket History',
          'View own Ticket History'
        ],
        Manager: [
          'View Dashboard',
          'View Tickets Page',
          'View Users Page',
          'View Reports Page',
          'Create Tickets',
          'View All Tickets',
          'Assign Tickets',
          'Modify Tickets',
          'Close Tickets',
          'Edit Tickets',
          'Comment on Tickets',
          'View own Tickets',
          'View New Tickets Stat',
          'View Your Tickets Stat',
          'View Open Tickets Stat',
          'View Unassigned Tickets Stat',
          'View Ticket History Chart',
          'View Ticket Churn Chart',
          'View First Response Time',
          'View Tickets Close Time',
          'View Category Breakdown',
          'View Top Ticket Creators',
          'View Ticket History',
          'View own Ticket History'
        ],
        Technician: [
          'View Dashboard',
          'View Tickets Page',
          'Create Tickets',
          'View All Tickets',
          'Assign Tickets',
          'Modify Tickets',
          'Edit Tickets',
          'Comment on Tickets',
          'View own Tickets',
          'View New Tickets Stat',
          'View Your Tickets Stat',
          'View Open Tickets Stat',
          'View Unassigned Tickets Stat',
          'View Ticket History Chart',
          'View Ticket Churn Chart',
          'View First Response Time',
          'View Tickets Close Time',
          'View Category Breakdown',
          'View Top Ticket Creators',
          'View Ticket History',
          'View own Ticket History'
        ],
        User: [
          'View Dashboard',
          'View Tickets Page',
          'Create Tickets',
          'Comment on Tickets',
          'View own Tickets',
          'View New Tickets Stat',
          'View Your Tickets Stat',
          'View Open Tickets Stat',
          'View Unassigned Tickets Stat',
          'View Ticket History Chart',
          'View Ticket Churn Chart',
          'View First Response Time',
          'View Tickets Close Time',
          'View Category Breakdown',
          'View Top Ticket Creators',
          'View own Ticket History'
        ]
      };

      db.all('SELECT id, name FROM tasks', [], (taskErr, taskRows) => {
        if (taskErr) return resolve();
        const map = new Map((taskRows || []).map((t) => [t.name, t.id]));
        const values = [];
        Object.entries(rolePresets).forEach(([role, names]) => {
          names.forEach((name) => {
            const id = map.get(name);
            if (id) values.push([role, id]);
          });
        });
        if (!values.length) return resolve();
        const placeholders = values.map(() => '(?, ?)').join(', ');
        const params = values.flat();
        db.run(`INSERT INTO role_tasks (role, task_id) VALUES ${placeholders}`, params, () => resolve());
      });
    });
  });
}
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) { res.status(401).json({ message: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  const role = req.user?.role;
  const isSuper = !!req.user?.isSuper;
  if (isSuper || role === 'Admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
}

function managerOrAdmin(req, res, next) {
  const role = req.user?.role;
  const isSuper = !!req.user?.isSuper;
  if (isSuper || role === 'Admin' || role === 'Manager') return next();
  return res.status(403).json({ message: 'Manager or Admin access required' });
}

function getMailer() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

const defaultNotificationMatrix = {
  opened: { creator: true, assignee: false, technician: true, manager: true, admin: true },
  assigned: { creator: false, assignee: true, technician: false, manager: true, admin: true },
  commented: { creator: true, assignee: true, technician: false, manager: false, admin: false },
  closed: { creator: true, assignee: true, technician: true, manager: true, admin: true },
  closedDuplicate: { creator: true, assignee: true, technician: true, manager: true, admin: true },
  reopened: { creator: true, assignee: true, technician: true, manager: true, admin: true }
};

function ensureNotificationSettings() {
  return new Promise((resolve) => {
    db.get('SELECT * FROM notification_settings WHERE id = 1', [], (err, row) => {
      if (row) return resolve(row);
      const defaults = {
        notifyOnCreate: 1,
        notifyOnUpdate: 1,
        notifyOnComment: 1,
        roleRecipients: JSON.stringify(['Admin']),
        userRecipients: JSON.stringify([]),
        notification_matrix: JSON.stringify(defaultNotificationMatrix)
      };
      db.run(
        `INSERT INTO notification_settings (id, notifyOnCreate, notifyOnUpdate, notifyOnComment, roleRecipients, userRecipients, notification_matrix)
         VALUES (1, ?, ?, ?, ?, ?, ?)`,
        [
          defaults.notifyOnCreate,
          defaults.notifyOnUpdate,
          defaults.notifyOnComment,
          defaults.roleRecipients,
          defaults.userRecipients,
          defaults.notification_matrix
        ],
        () => resolve({ id: 1, ...defaults })
      );
    });
  });
}

async function getNotificationSettings() {
  const row = await ensureNotificationSettings();
  const rawMatrix = row.notification_matrix ? JSON.parse(row.notification_matrix) : defaultNotificationMatrix;
  const matrix = Object.keys(defaultNotificationMatrix).reduce((acc, key) => {
    acc[key] = { ...defaultNotificationMatrix[key], ...(rawMatrix?.[key] || {}) };
    return acc;
  }, {});
  return { matrix };
}

function findUserByUsernameOrDisplay(name) {
  return new Promise((resolve, reject) => {
    if (!name) return resolve(null);
    db.get('SELECT * FROM users WHERE username = ?', [name], (err, row) => {
      if (err) return reject(err);
      if (row) return resolve(normalizeUser(row));
      db.get(
        `SELECT * FROM users
         WHERE TRIM(COALESCE(firstName,'')) || ' ' || TRIM(COALESCE(lastName,'')) = ?`,
        [name],
        (err2, row2) => {
          if (err2) return reject(err2);
          resolve(normalizeUser(row2) || null);
        }
      );
    });
  });
}

function listRoleEmails(roles) {
  return new Promise((resolve, reject) => {
    if (!roles.length) return resolve([]);
    const params = roles;
    const placeholders = roles.map(() => '?').join(', ');
    db.all(`SELECT email FROM users WHERE role IN (${placeholders}) OR isSuper = 1`, params, (err, rows) => {
      if (err) return reject(err);
      const emails = (rows || []).map((r) => (r.email || '').trim()).filter(Boolean);
      resolve([...new Set(emails)]);
    });
  });
}

async function resolveRecipients(type, ticket) {
  const settings = await getNotificationSettings();
  const matrix = settings.matrix || defaultNotificationMatrix;
  const config = matrix[type];
  if (!config) return [];
  const emails = [];

  if (config.creator) {
    const user = await findUserByUsernameOrDisplay(ticket.creator);
    if (user?.email) emails.push(user.email.trim());
  }

  if (config.assignee && ticket.assignee) {
    const user = await findUserByUsernameOrDisplay(ticket.assignee);
    if (user?.email) emails.push(user.email.trim());
  }

  const roleTargets = [];
  if (config.technician) roleTargets.push('Technician');
  if (config.manager) roleTargets.push('Manager');
  if (config.admin) roleTargets.push('Admin');
  if (roleTargets.length) {
    const roleEmails = await listRoleEmails(roleTargets);
    emails.push(...roleEmails);
  }

  return [...new Set(emails)].filter(Boolean);
}

async function sendTicketNotification(type, ticket, actor, extra = {}) {
  const recipients = await resolveRecipients(type, ticket);
  if (!recipients.length) return;
  const transporter = getMailer();
  const from = SMTP_FROM || SMTP_USER;
  if (!transporter || !from) return;

  const subjectMap = {
    opened: `New Ticket #${ticket.id}: ${ticket.summary}`,
    assigned: `Ticket Assigned #${ticket.id}: ${ticket.summary}`,
    commented: `New Comment on Ticket #${ticket.id}`,
    closed: `Ticket Closed #${ticket.id}: ${ticket.summary}`,
    closedDuplicate: `Ticket Closed as Duplicate #${ticket.id}: ${ticket.summary}`,
    reopened: `Ticket Reopened #${ticket.id}: ${ticket.summary}`
  };
  const lines = [
    `Event: ${type}`,
    `Ticket ID: ${ticket.id}`,
    `Summary: ${ticket.summary}`,
    `Department: ${ticket.department || 'Support'}`,
    `Status: ${ticket.status || 'Open'}`,
    `Priority: ${ticket.priority || 'Medium'}`,
    `Category: ${ticket.category || '-'}`,
    `Assignee: ${ticket.assignee || '-'}`,
    `Actor: ${actor || 'System'}`,
    extra.comment ? `Comment: ${extra.comment}` : null
  ].filter(Boolean);

  await transporter.sendMail({
    from,
    to: recipients.join(','),
    subject: subjectMap[type] || 'Ticket Notification',
    text: lines.join('\n')
  });
}

function getAttachmentUrl({ storedName, path: storedPath }) {
  if (useSupabaseStorage && storedPath) {
    const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(storedPath);
    return data?.publicUrl || null;
  }
  if (storedName) return `/uploads/${storedName}`;
  return null;
}

async function saveAttachment({ ticketId, commentId = null, file, uploader }) {
  if (!file) return;
  const createdAt = new Date().toISOString();
  if (useSupabaseStorage) {
    const ext = path.extname(file.originalname || '');
    const storedName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const storedPath = `${ticketId}/${storedName}`;
    const { error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(storedPath, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) {
      console.error('Supabase upload failed:', error.message || error);
      return;
    }
    await db.run(
      `INSERT INTO attachments (ticket_id, comment_id, original_name, stored_name, mime, size, path, createdAt, uploader)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId,
        commentId,
        file.originalname,
        storedName,
        file.mimetype,
        file.size,
        storedPath,
        createdAt,
        uploader || null
      ]
    );
    return;
  }

  await db.run(
    `INSERT INTO attachments (ticket_id, comment_id, original_name, stored_name, mime, size, path, createdAt, uploader)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticketId,
      commentId,
      file.originalname,
      file.filename,
      file.mimetype,
      file.size,
      file.path,
      createdAt,
      uploader || null
    ]
  );
}

function logAudit({ action, entityType, entityId = null, actor = {}, detail = null, ip = null }) {
  return new Promise((resolve) => {
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO audit_logs (actor_id, actor_username, actor_role, action, entity_type, entity_id, detail, ip, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actor.id || null,
        actor.username || null,
        actor.role || null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        detail ? JSON.stringify(detail) : null,
        ip || null,
        createdAt
      ],
      () => resolve()
    );
  });
}

function buildDateFilters(field, from, to) {
  const filters = [];
  const params = [];
  if (from) {
    filters.push(`${field} >= ?`);
    params.push(from);
  }
  if (to) {
    filters.push(`${field} <= ?`);
    params.push(to);
  }
  return { filters, params };
}

function findUserById(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) return reject(err);
      resolve(normalizeUser(row));
    });
  });
}

async function sendWelcomeEmail({ to, username, password }) {
  const transporter = getMailer();
  const from = SMTP_FROM || SMTP_USER;
  if (!transporter || !from) return;
  const text = [
    'Hello,',
    '',
    'Your Help Desk account has been created.',
    `Username: ${username}`,
    `Temporary Password: ${password}`,
    '',
    'Please log in and change your password immediately.',
    '',
    'Namikango Mission Help Desk'
  ].join('\n');
  await transporter.sendMail({
    from,
    to,
    subject: 'Your Help Desk account login details',
    text
  });
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const user = await findUserByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userTasks = await getUserTasks(user.id);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, isSuper: !!user.isSuper }, JWT_SECRET, { expiresIn: '15m' });
    try {
      await logAudit({
        action: 'login',
        entityType: 'auth',
        actor: { id: user.id, username: user.username, role: user.role },
        ip: req.ip
      });
    } catch (err) {
      // best-effort audit logging
    }
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        mustChangePassword: !!user.mustChangePassword,
        tasks: userTasks
      }
    });
  } catch (err) {
    console.error('Login failed:', err?.stack || err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/notifications/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    const settings = await getNotificationSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load notification settings' });
  }
});

app.put('/api/notifications/settings', authMiddleware, adminOnly, async (req, res) => {
  const { matrix } = req.body || {};
  const safeMatrix = matrix && typeof matrix === 'object' ? matrix : defaultNotificationMatrix;
  db.run(
    `UPDATE notification_settings
     SET notification_matrix = ?
     WHERE id = 1`,
    [
      JSON.stringify(safeMatrix)
    ],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to update settings' });
      logAudit({
        action: 'notification_settings_updated',
        entityType: 'notification_settings',
        entityId: 1,
        actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
        ip: req.ip
      }).then(() => {
        res.json({ message: 'Updated' });
      });
    }
  );
});

app.post('/api/notifications/test', authMiddleware, adminOnly, async (req, res) => {
  try {
    const transporter = getMailer();
    const from = SMTP_FROM || SMTP_USER;
    if (!transporter || !from) {
      return res.status(400).json({ message: 'SMTP is not configured' });
    }
    const user = await findUserById(req.user?.id);
    const to = user?.email?.trim();
    if (!to) {
      return res.status(400).json({ message: 'Your user does not have an email configured' });
    }
    await transporter.sendMail({
      from,
      to,
      subject: 'Help Desk SMTP Test',
      text: 'This is a test email from the Help Desk notification settings.'
    });
    res.json({ message: 'Test email sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send test email' });
  }
});

app.post('/api/reports/run', authMiddleware, managerOrAdmin, (req, res) => {
  const { type, from, to } = req.body || {};
  if (!type) return res.status(400).json({ message: 'Report type is required' });

  const normalizedType = String(type || '').toLowerCase();
  const actor = { id: req.user?.id, username: req.user?.username, role: req.user?.role };
  const auditDetail = { type: normalizedType, from: from || null, to: to || null };
  if (normalizedType === 'ticket_volume') {
    const { filters, params } = buildDateFilters('createdAt', from, to);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    db.all(
      `SELECT status, COUNT(*) as count
       FROM tickets
      ${where}
       GROUP BY status
       ORDER BY count DESC`,
      params,
      (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        logAudit({
          action: 'report_generated',
          entityType: 'report',
          entityId: 'ticket_volume',
          actor,
          detail: auditDetail,
          ip: req.ip
        }).then(() => {
          res.json({ message: 'Ticket volume report generated.', data: rows || [] });
        });
      }
    );
    return;
  }

  if (normalizedType === 'technician_workload') {
    const { filters, params } = buildDateFilters('createdAt', from, to);
    const baseFilters = [`assignee IS NOT NULL`, `TRIM(assignee) != ''`, ...filters];
    const where = baseFilters.length ? `WHERE ${baseFilters.join(' AND ')}` : '';
    db.all(
      `SELECT assignee, COUNT(*) as count
       FROM tickets
      ${where}
       GROUP BY assignee
       ORDER BY count DESC`,
      params,
      (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        logAudit({
          action: 'report_generated',
          entityType: 'report',
          entityId: 'technician_workload',
          actor,
          detail: auditDetail,
          ip: req.ip
        }).then(() => {
          res.json({ message: 'Technician workload report generated.', data: rows || [] });
        });
      }
    );
    return;
  }

  if (normalizedType === 'sla_performance') {
    const { filters, params } = buildDateFilters('createdAt', from, to);
    const baseFilters = [`status IS NULL OR LOWER(status) != 'closed'`, ...filters];
    const where = baseFilters.length ? `WHERE ${baseFilters.join(' AND ')}` : '';
    db.get(
      `SELECT
         COUNT(*) as openCount,
         AVG((julianday('now') - julianday(createdAt)) * 24) as avgOpenHours
      FROM tickets
      ${where}`,
      params,
      (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        logAudit({
          action: 'report_generated',
          entityType: 'report',
          entityId: 'sla_performance',
          actor,
          detail: auditDetail,
          ip: req.ip
        }).then(() => {
          res.json({
            message: 'SLA performance snapshot generated.',
            data: {
              openCount: row?.openCount || 0,
              avgOpenHours: row?.avgOpenHours || 0
            }
          });
        });
      }
    );
    return;
  }

  if (normalizedType === 'user_activity') {
    const { filters, params } = buildDateFilters('createdAt', from, to);
    const baseFilters = [`actor_username IS NOT NULL`, `TRIM(actor_username) != ''`, ...filters];
    const where = baseFilters.length ? `WHERE ${baseFilters.join(' AND ')}` : '';
    db.all(
      `SELECT actor_username as user, action, COUNT(*) as count
       FROM audit_logs
      ${where}
       GROUP BY actor_username, action
       ORDER BY count DESC`,
      params,
      (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        logAudit({
          action: 'report_generated',
          entityType: 'report',
          entityId: 'user_activity',
          actor,
          detail: auditDetail,
          ip: req.ip
        }).then(() => {
          res.json({ message: 'User activity report generated.', data: rows || [] });
        });
      }
    );
    return;
  }

  return res.status(400).json({ message: 'Unsupported report type' });
});

app.post('/api/audit/run', authMiddleware, managerOrAdmin, (req, res) => {
  const { from, to } = req.body || {};
  const { filters, params } = buildDateFilters('createdAt', from, to);
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  db.all(
    `SELECT id, actor_username as actor, actor_role as role, action, entity_type as entityType, entity_id as entityId, detail, ip, createdAt
     FROM audit_logs
     ${where}
     ORDER BY createdAt DESC
     LIMIT 500`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      logAudit({
        action: 'audit_trail_pulled',
        entityType: 'audit',
        entityId: null,
        actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
        detail: { from: from || null, to: to || null },
        ip: req.ip
      }).then(() => {
        res.json({ message: 'Audit trail fetched.', data: rows || [] });
      });
    }
  );
});

app.get('/api/users', authMiddleware, (req, res) => {
  db.all('SELECT id, username, role, isSuper, firstName, lastName, email, phone FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    const users = (rows || []).map(normalizeUser);
    if (!users.length) return res.json([]);
    const ids = users.map(u => u.id);
    const placeholders = ids.map(() => '?').join(', ');
    db.all(
      `SELECT ut.user_id, t.id as taskId, t.name as taskName
       FROM user_tasks ut
       JOIN tasks t ON t.id = ut.task_id
       WHERE ut.user_id IN (${placeholders})`,
      ids,
      (taskErr, taskRows) => {
        if (taskErr) return res.status(500).json({ message: taskErr.message });
        const taskMap = {};
        (taskRows || []).forEach((row) => {
          if (!taskMap[row.user_id]) taskMap[row.user_id] = [];
          taskMap[row.user_id].push({ id: row.taskId, name: row.taskName });
        });
        const enriched = users.map(u => ({ ...u, tasks: taskMap[u.id] || [] }));
        res.json(enriched);
      }
    );
  });
});

app.post('/api/users', authMiddleware, (req, res) => {
  const { username, password, role, firstName, lastName, email, phone } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  const userId = Date.now().toString();
  const superFlag = role === 'Admin' ? 1 : 0;
  db.run(
    `INSERT INTO users (id, username, password, role, isSuper, firstName, lastName, email, phone, mustChangePassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, username, hashed, role, superFlag, firstName, lastName, email, phone, 1],
    async (err) => {
      if (err) return res.status(500).json({ message: err.message });
      const taskIds = await new Promise((resolve) => {
        db.all('SELECT task_id FROM role_tasks WHERE role = ?', [role], (tErr, rows) => {
          if (tErr) return resolve([]);
          resolve((rows || []).map((r) => r.task_id));
        });
      });
      const actor = { id: req.user?.id, username: req.user?.username, role: req.user?.role };
      const emitCreated = () => {
        logAudit({
          action: 'user_created',
          entityType: 'user',
          entityId: userId,
          actor,
          detail: { username, role },
          ip: req.ip
        }).then(() => {
          res.json({ message: 'User created' });
        });
      };
      if (email) {
        sendWelcomeEmail({ to: email, username, password }).catch((mailErr) => {
          console.error('Email send failed:', mailErr.message || mailErr);
        });
      }
      if (!taskIds.length) return emitCreated();
      const values = taskIds.map(() => '(?, ?)').join(', ');
      const params = taskIds.flatMap((taskId) => [userId, taskId]);
      db.run(`INSERT INTO user_tasks (user_id, task_id) VALUES ${values}`, params, (taskErr) => {
        if (taskErr) return res.status(500).json({ message: taskErr.message });
        emitCreated();
      });
    }
  );
});

app.put('/api/users/:id/password', authMiddleware, (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ message: 'Password is required' });
  const userId = req.params.id;
  const requesterId = req.user?.id;
  const isAdmin = req.user?.role === 'Admin' || req.user?.isSuper;
  if (!isAdmin && requesterId !== userId) {
    return res.status(403).json({ message: 'Not authorized to change this password' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  db.run(
    'UPDATE users SET password = ?, mustChangePassword = 0 WHERE id = ?',
    [hashed, userId],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      logAudit({
        action: 'user_password_updated',
        entityType: 'user',
        entityId: userId,
        actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
        ip: req.ip
      }).then(() => {
        res.json({ message: 'Password updated' });
      });
    }
  );
});

app.put('/api/users/:id', authMiddleware, (req, res) => {
  const { username, firstName, lastName, email, phone, role } = req.body;
  const userId = req.params.id;
  const superFlag = role === 'Admin' ? 1 : 0;
  const actor = { id: req.user?.id, username: req.user?.username, role: req.user?.role };
  const emitUpdated = () => {
    logAudit({
      action: 'user_updated',
      entityType: 'user',
      entityId: userId,
      actor,
      detail: { username, role },
      ip: req.ip
    }).then(() => {
      res.json({ message: 'Updated' });
    });
  };
  db.run(
    `UPDATE users SET username = ?, firstName = ?, lastName = ?, email = ?, phone = ?, role = ?, isSuper = ? WHERE id = ?`,
    [username, firstName, lastName, email, phone, role, superFlag, userId],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      db.run('DELETE FROM user_tasks WHERE user_id = ?', [userId], (delErr) => {
        if (delErr) return res.status(500).json({ message: delErr.message });
        db.all('SELECT task_id FROM role_tasks WHERE role = ?', [role], (taskErr, rows) => {
          if (taskErr) return res.status(500).json({ message: taskErr.message });
          const taskIds = (rows || []).map((r) => r.task_id);
          if (!taskIds.length) return emitUpdated();
          const values = taskIds.map(() => '(?, ?)').join(', ');
          const params = taskIds.flatMap((taskId) => [userId, taskId]);
          db.run(`INSERT INTO user_tasks (user_id, task_id) VALUES ${values}`, params, (insErr) => {
            if (insErr) return res.status(500).json({ message: insErr.message });
            emitUpdated();
          });
        });
      });
    }
  );
});

app.delete('/api/users/:id', authMiddleware, (req, res) => {
  const userId = req.params.id;
  db.run('DELETE FROM users WHERE id = ?', [userId], () => {
    logAudit({
      action: 'user_deleted',
      entityType: 'user',
      entityId: userId,
      actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
      ip: req.ip
    }).then(() => {
      res.json({ message: 'Deleted' });
    });
  });
});

app.get('/api/tickets', authMiddleware, (req, res) => {
  const role = req.user?.role;
  const username = req.user?.username || '';
  if (role === 'User') {
    return getDisplayNameFor(username)
      .then((displayName) => {
        db.all(
          'SELECT * FROM tickets WHERE creator = ? OR creator = ?',
          [username, displayName],
          (err, rows) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json(rows || []);
          }
        );
      })
      .catch((err) => res.status(500).json({ message: err.message }));
  }
  db.all('SELECT * FROM tickets', [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

app.get('/api/tickets/:id', authMiddleware, (req, res) => {
  const role = req.user?.role;
  const username = req.user?.username || '';
  const fetchAndRespond = (displayName) => {
    db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!row) return res.status(404).json({ message: 'Ticket not found' });
      if (role === 'User' && row.creator !== username && row.creator !== displayName) {
        return res.status(403).json({ message: 'Not authorized to view this ticket' });
      }
      db.all('SELECT * FROM attachments WHERE ticket_id = ? AND comment_id IS NULL', [row.id], (aErr, attachments) => {
        if (aErr) return res.json(row);
        const mapped = (attachments || []).map((a) => ({
          id: a.id,
          originalName: a.original_name,
          size: a.size,
          mime: a.mime,
          url: getAttachmentUrl({ storedName: a.stored_name, path: a.path }),
          createdAt: a.createdAt,
          uploader: a.uploader
        }));
        res.json({ ...row, attachments: mapped });
      });
    });
  };

  if (role === 'User') {
    return getDisplayNameFor(username)
      .then((displayName) => fetchAndRespond(displayName))
      .catch((err) => res.status(500).json({ message: err.message }));
  }

  return fetchAndRespond(username);
});

app.post('/api/tickets', authMiddleware, maybeUploadSingle('attachment'), (req, res) => {
  const { department, summary, description, creator, status, priority, category, assignee } = req.body || {};
  if (!summary) return res.status(400).json({ message: 'Summary is required' });
  const createdAt = new Date().toISOString();
  const safeDepartment = department || 'Support';
  const safeCreator = creator || req.user.username || 'Unknown';
  const safeDescription = description || '';
  const safeStatus = status || 'Open';
  const safePriority = priority || 'Medium';
  const safeCategory = category || 'General Problem';
  const safeAssignee = assignee || null;

  db.run(
    `INSERT INTO tickets (department, summary, description, creator, status, priority, category, assignee, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [safeDepartment, summary, safeDescription, safeCreator, safeStatus, safePriority, safeCategory, safeAssignee, createdAt],
    function (err) {
      if (err) return res.status(500).json({ message: err.message });
      if (req.file) {
        saveAttachment({ ticketId: this.lastID, file: req.file, uploader: req.user?.username })
          .catch((uploadErr) => console.error('Attachment save error:', uploadErr?.message || uploadErr));
      }
      sendTicketNotification('opened', { id: this.lastID, department: safeDepartment, summary, status: safeStatus, priority: safePriority, category: safeCategory, assignee: safeAssignee, creator: safeCreator }, req.user?.username)
        .catch((mailErr) => console.error('Notification error:', mailErr.message || mailErr));
      logAudit({
        action: 'ticket_created',
        entityType: 'ticket',
        entityId: this.lastID,
        actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
        detail: { summary, status: safeStatus, priority: safePriority },
        ip: req.ip
      }).then(() => {
        res.json({ id: this.lastID, message: 'Ticket created' });
      });
    }
  );
});

app.put('/api/tickets/:id', authMiddleware, (req, res) => {
  const role = req.user?.role;
  const username = req.user?.username || '';
  const { department, summary, description, status, priority, category, assignee } = req.body || {};

  db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: 'Ticket not found' });

    if (role === 'User') {
      return res.status(403).json({ message: 'Not authorized to modify tickets' });
    }
    if (role === 'Technician' && row.assignee !== username) {
      return res.status(403).json({ message: 'Not authorized to modify this ticket' });
    }

    db.run(
      `UPDATE tickets SET department = ?, summary = ?, description = ?, status = ?, priority = ?, category = ?, assignee = ? WHERE id = ?`,
      [
        department ?? row.department,
        summary ?? row.summary,
        description ?? row.description,
        status ?? row.status,
        priority ?? row.priority,
        category ?? row.category,
        assignee ?? row.assignee,
        req.params.id
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ message: updateErr.message });
        const updatedTicket = {
          id: row.id,
          department: department ?? row.department,
          summary: summary ?? row.summary,
          status: status ?? row.status,
          priority: priority ?? row.priority,
          category: category ?? row.category,
          assignee: assignee ?? row.assignee,
          creator: row.creator
        };
        const events = [];
        const prevStatus = row.status || 'Open';
        const nextStatus = updatedTicket.status || 'Open';
        const prevAssignee = row.assignee || '';
        const nextAssignee = updatedTicket.assignee || '';
        if (prevStatus !== 'Closed' && nextStatus === 'Closed') events.push('closed');
        if (prevStatus !== 'Closed (Duplicate)' && nextStatus === 'Closed (Duplicate)') events.push('closedDuplicate');
        if (prevStatus !== 'Open' && nextStatus === 'Open') events.push('reopened');
        if (nextAssignee && nextAssignee !== prevAssignee) events.push('assigned');
        events.forEach((evt) => {
          sendTicketNotification(evt, updatedTicket, req.user?.username)
            .catch((mailErr) => console.error('Notification error:', mailErr.message || mailErr));
        });
        logAudit({
          action: 'ticket_updated',
          entityType: 'ticket',
          entityId: row.id,
          actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
          detail: { status: updatedTicket.status, assignee: updatedTicket.assignee },
          ip: req.ip
        }).then(() => {
          res.json({ message: 'Updated' });
        });
      }
    );
  });
});

app.delete('/api/tickets/:id', authMiddleware, adminOnly, async (req, res) => {
  const ticketId = req.params.id;
  const queryAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

  try {
    const attachmentRows = await queryAll('SELECT id, path FROM attachments WHERE ticket_id = ?', [ticketId]);
    const filePaths = attachmentRows.map((row) => row.path).filter(Boolean);
    await run('DELETE FROM attachments WHERE ticket_id = ?', [ticketId]);
    await run('DELETE FROM ticket_comments WHERE ticket_id = ?', [ticketId]);
    await run('DELETE FROM tickets WHERE id = ?', [ticketId]);

    if (useSupabaseStorage && filePaths.length) {
      try {
        await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove(filePaths);
      } catch (storageErr) {
        console.error('Failed to remove ticket attachments from storage:', storageErr?.message || storageErr);
      }
    } else {
      filePaths.forEach((filePath) => {
        fs.unlink(filePath, () => {});
      });
    }

    await logAudit({
      action: 'ticket_deleted',
      entityType: 'ticket',
      entityId: ticketId,
      actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
      ip: req.ip
    });

    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/tickets/:id/comments', authMiddleware, (req, res) => {
  const role = req.user?.role;
  const username = req.user?.username || '';
  const fetchAndRespond = (displayName) => {
    db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, ticket) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
      if (role === 'User' && ticket.creator !== username && ticket.creator !== displayName) {
        return res.status(403).json({ message: 'Not authorized to view this ticket' });
      }
      db.all(
        'SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY createdAt DESC',
        [req.params.id],
        (cErr, rows) => {
          if (cErr) return res.status(500).json({ message: cErr.message });
          const comments = rows || [];
          if (!comments.length) return res.json([]);
          const ids = comments.map((c) => c.id);
          const placeholders = ids.map(() => '?').join(', ');
          db.all(
            `SELECT * FROM attachments WHERE comment_id IN (${placeholders})`,
            ids,
            (aErr, attachments) => {
              if (aErr) return res.json(comments);
              const map = new Map();
              (attachments || []).forEach((a) => {
                const list = map.get(a.comment_id) || [];
                list.push({
                  id: a.id,
                  originalName: a.original_name,
                  size: a.size,
                  mime: a.mime,
                  url: getAttachmentUrl({ storedName: a.stored_name, path: a.path }),
                  createdAt: a.createdAt,
                  uploader: a.uploader
                });
                map.set(a.comment_id, list);
              });
              res.json(comments.map((c) => ({ ...c, attachments: map.get(c.id) || [] })));
            }
          );
        }
      );
    });
  };

  if (role === 'User') {
    return getDisplayNameFor(username)
      .then((displayName) => fetchAndRespond(displayName))
      .catch((err) => res.status(500).json({ message: err.message }));
  }

  return fetchAndRespond(username);
});

app.post('/api/tickets/:id/comments', authMiddleware, maybeUploadSingle('attachment'), (req, res) => {
  const role = req.user?.role;
  const username = req.user?.username || '';
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ message: 'Comment is required' });
  db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, ticket) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (role === 'User' && ticket.creator !== username) {
      return res.status(403).json({ message: 'Not authorized to comment on this ticket' });
    }
    if (role === 'Technician' && ticket.assignee !== username) {
      return res.status(403).json({ message: 'Not authorized to comment on this ticket' });
    }
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO ticket_comments (ticket_id, author, body, createdAt)
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      [req.params.id, username, body.trim(), createdAt],
      function (cErr) {
        if (cErr) return res.status(500).json({ message: cErr.message });
        if (req.file) {
          saveAttachment({ ticketId: req.params.id, commentId: this.lastID, file: req.file, uploader: username })
            .catch((uploadErr) => console.error('Attachment save error:', uploadErr?.message || uploadErr));
        }
        sendTicketNotification('commented', ticket, username, { comment: body.trim() })
          .catch((mailErr) => console.error('Notification error:', mailErr.message || mailErr));
        logAudit({
          action: 'ticket_commented',
          entityType: 'ticket',
          entityId: req.params.id,
          actor: { id: req.user?.id, username: req.user?.username, role: req.user?.role },
          detail: { commentId: this.lastID },
          ip: req.ip
        }).then(() => {
          res.json({ id: this.lastID, message: 'Comment added' });
        });
      }
    );
  });
});

app.delete('/api/attachments/:id', authMiddleware, adminOnly, (req, res) => {
  const attachmentId = req.params.id;
  db.get('SELECT * FROM attachments WHERE id = ?', [attachmentId], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: 'Attachment not found' });
    const filePath = row.path;
    db.run('DELETE FROM attachments WHERE id = ?', [attachmentId], (delErr) => {
      if (delErr) return res.status(500).json({ message: delErr.message });
      if (useSupabaseStorage && filePath) {
        supabase
          .storage
          .from(SUPABASE_STORAGE_BUCKET)
          .remove([filePath])
          .then(() => res.json({ message: 'Attachment deleted' }))
          .catch(() => res.json({ message: 'Attachment deleted' }));
        return;
      }
      if (filePath) {
        fs.unlink(filePath, () => {
          res.json({ message: 'Attachment deleted' });
        });
      } else {
        res.json({ message: 'Attachment deleted' });
      }
    });
  });
});

app.get('/api/tickets/stats', authMiddleware, (req, res) => {
  const username = req.user?.username || '';
  const role = req.user?.role;
  const baseSql = `
    SELECT
      COUNT(*) as totalCount,
      SUM(CASE WHEN status IS NULL OR status = '' OR LOWER(status) != 'closed' THEN 1 ELSE 0 END) as openCount,
      SUM(CASE WHEN assignee IS NULL OR assignee = '' THEN 1 ELSE 0 END) as unassignedCount,
      SUM(CASE WHEN creator = ? OR creator = ? THEN 1 ELSE 0 END) as yourCount,
      SUM(CASE WHEN createdAt >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as newCount
    FROM tickets
  `;
  findUserByUsername(username)
    .then((userRow) => {
      const displayName = [userRow?.firstName, userRow?.lastName].filter(Boolean).join(' ') || username;
      const sql = role === 'User' ? `${baseSql} WHERE creator = ? OR creator = ?` : baseSql;
      const params = role === 'User'
        ? [username, displayName, username, displayName]
        : [username, displayName];
      db.get(sql, params, (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({
          newCount: row?.newCount || 0,
          yourCount: row?.yourCount || 0,
          openCount: row?.openCount || 0,
          unassignedCount: row?.unassignedCount || 0
        });
      });
    })
    .catch((err) => res.status(500).json({ message: err.message }));
});

app.get('/api/categories', authMiddleware, (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => res.json(rows || []));
});

app.get('/api/departments', authMiddleware, (req, res) => {
  db.all('SELECT * FROM departments ORDER BY name', [], (err, rows) => res.json(rows || []));
});

app.get('/api/tasks', authMiddleware, (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

app.get('/api/role-tasks', authMiddleware, adminOnly, (req, res) => {
  db.all('SELECT * FROM role_tasks', [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
});

app.put('/api/role-tasks', authMiddleware, adminOnly, (req, res) => {
  const { roleTasks } = req.body || {};
  const mapping = roleTasks && typeof roleTasks === 'object' ? roleTasks : {};
  const roles = Object.keys(mapping);
  db.serialize(() => {
    db.run('DELETE FROM role_tasks', [], () => {
      const values = [];
      roles.forEach((role) => {
        const ids = Array.isArray(mapping[role]) ? mapping[role] : [];
        ids.forEach((taskId) => values.push([role, taskId]));
      });
      if (!values.length) return res.json({ message: 'Updated' });
      const placeholders = values.map(() => '(?, ?)').join(', ');
      const params = values.flat();
      db.run(`INSERT INTO role_tasks (role, task_id) VALUES ${placeholders}`, params, (err) => {
        if (err) return res.status(500).json({ message: err.message });
        // sync users to their role tasks
        db.all('SELECT id, role FROM users', [], (uErr, users) => {
          if (uErr) return res.json({ message: 'Updated' });
          let remaining = users.length;
          if (!remaining) return res.json({ message: 'Updated' });
          users.forEach((u) => {
            const ids = Array.isArray(mapping[u.role]) ? mapping[u.role] : [];
            db.run('DELETE FROM user_tasks WHERE user_id = ?', [u.id], () => {
              if (!ids.length) {
                remaining -= 1;
                if (remaining === 0) res.json({ message: 'Updated' });
                return;
              }
              const vals = ids.map(() => '(?, ?)').join(', ');
              const p = ids.flatMap((taskId) => [u.id, taskId]);
              db.run(`INSERT INTO user_tasks (user_id, task_id) VALUES ${vals}`, p, () => {
                remaining -= 1;
                if (remaining === 0) res.json({ message: 'Updated' });
              });
            });
          });
        });
      });
    });
  });
});

app.post('/api/categories', authMiddleware, adminOnly, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required' });
  db.run('INSERT INTO categories (name) VALUES (?) RETURNING id', [name], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.post('/api/departments', authMiddleware, adminOnly, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required' });
  db.run('INSERT INTO departments (name) VALUES (?) RETURNING id', [name], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.put('/api/categories/:id', authMiddleware, adminOnly, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required' });
  db.run('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Updated' });
  });
});

app.put('/api/departments/:id', authMiddleware, adminOnly, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required' });
  db.run('UPDATE departments SET name = ? WHERE id = ?', [name, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Updated' });
  });
});

app.delete('/api/categories/:id', authMiddleware, adminOnly, (req, res) => {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Deleted' });
  });
});

app.delete('/api/departments/:id', authMiddleware, adminOnly, (req, res) => {
  db.run('DELETE FROM departments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Deleted' });
  });
});

const ready = dbReady
  .then(seedAdminUser)
  .then(seedCategories)
  .then(seedDepartments)
  .then(seedTasks)
  .then(seedRoleTasks)
  .then(seedSampleTickets)
  .catch((err) => {
    console.error('Server startup initialization failed:', err?.stack || err);
    if (!isNetlify) throw err;
  });

if (!isNetlify) {
  ready.then(() => {
    app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
  });
}

module.exports = { app, ready };
