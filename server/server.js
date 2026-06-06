
// server.js — FitTracker Pro 后端服务
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const https = require('https');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');
const exerciseCatalog = require('./exercises.json');

// 读取 .env
require('fs').readFileSync(path.join(__dirname, '.env'), 'utf8')
  .split('\n').filter(Boolean).forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = rest.join('=').trim();
  });

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'default_secret';
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const COS_BUCKET = process.env.TENCENT_COS_BUCKET;
const COS_REGION = process.env.TENCENT_COS_REGION;
const COS_SIGN_EXPIRES = Number(process.env.COS_SIGN_EXPIRES || 600);

const cos = process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY
  ? new COS({
      SecretId: process.env.TENCENT_SECRET_ID,
      SecretKey: process.env.TENCENT_SECRET_KEY
    })
  : null;

// ========== 数据库 ==========
const db = new Database(path.join(__dirname, 'fitness.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    openid TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT DEFAULT (datetime('now')),
    membership_level TEXT DEFAULT 'free',
    membership_expires_at TEXT
  );
  CREATE TABLE IF NOT EXISTS user_data (
    openid TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (openid, key)
  );
`);

function ensureColumn(table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn('users', 'membership_level', "TEXT DEFAULT 'free'");
ensureColumn('users', 'membership_expires_at', 'TEXT');

const stmts = {
  upsertUser: db.prepare(`
    INSERT INTO users (openid) VALUES (?)
    ON CONFLICT(openid) DO UPDATE SET last_login = datetime('now')
  `),
  getUser: db.prepare('SELECT * FROM users WHERE openid = ?'),
  setMembership: db.prepare(`
    UPDATE users
    SET membership_level = ?, membership_expires_at = ?
    WHERE openid = ?
  `),
  getData: db.prepare('SELECT key, value FROM user_data WHERE openid = ?'),
  upsertData: db.prepare(`
    INSERT INTO user_data (openid, key, value, updated_at) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(openid, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `),
  deleteUserData: db.prepare('DELETE FROM user_data WHERE openid = ?'),
};

function isMember(user) {
  if (!user || user.membership_level !== 'pro') return false;
  if (!user.membership_expires_at) return true;
  return new Date(user.membership_expires_at).getTime() > Date.now();
}

function publicExercise(exercise, member) {
  return {
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    subMuscle: exercise.subMuscle,
    equipment: exercise.equipment,
    mark: exercise.mark || exercise.muscle,
    isPro: !!exercise.isPro,
    locked: !!exercise.isPro && !member
  };
}

function signCosUrl(key) {
  if (!cos || !COS_BUCKET || !COS_REGION) {
    throw new Error('COS is not configured');
  }

  return cos.getObjectUrl({
    Bucket: COS_BUCKET,
    Region: COS_REGION,
    Key: key,
    Sign: true,
    Expires: COS_SIGN_EXPIRES
  });
}

// ========== Token ==========
function makeToken(openid) {
  const payload = Buffer.from(JSON.stringify({ openid, ts: Date.now() })).toString('base64');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return payload + '.' + sig;
}

function verifyToken(token) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch { return null; }
}

// ========== 微信 code2session ==========
function code2session(code) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.openid) resolve(json);
          else reject(new Error(json.errmsg || 'code2session failed'));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ========== Express ==========
const app = express();
app.use(express.json({ limit: '10mb' }));

// 鉴权中间件
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'unauthorized' });
  req.openid = decoded.openid;
  next();
}

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'admin unauthorized' });
  }
  next();
}

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  try {
    const session = await code2session(code);
    const openid = session.openid;

    stmts.upsertUser.run(openid);

    // 检查是否有数据（判断新老用户）
    const rows = stmts.getData.all(openid);
    const isNewUser = rows.length === 0;

    const token = makeToken(openid);
    res.json({ token, isNewUser });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/data — 拉取所有数据
app.get('/api/data', auth, (req, res) => {
  const rows = stmts.getData.all(req.openid);
  const data = {};
  rows.forEach(row => {
    try { data[row.key] = JSON.parse(row.value); }
    catch { data[row.key] = row.value; }
  });
  res.json({ data });
});

// GET /api/me/membership — 当前用户会员状态
app.get('/api/me/membership', auth, (req, res) => {
  const user = stmts.getUser.get(req.openid);
  res.json({
    membership: {
      level: user?.membership_level || 'free',
      expiresAt: user?.membership_expires_at || null,
      active: isMember(user)
    }
  });
});

// GET /api/exercises — 动作库列表。非会员能看到 Pro 锁定状态，但不返回资源 URL。
app.get('/api/exercises', auth, (req, res) => {
  const user = stmts.getUser.get(req.openid);
  const member = isMember(user);
  res.json({
    membership: {
      level: user?.membership_level || 'free',
      expiresAt: user?.membership_expires_at || null,
      active: member
    },
    exercises: exerciseCatalog.map(exercise => publicExercise(exercise, member))
  });
});

// GET /api/exercises/:id/assets — 校验会员后签发 COS 临时 URL。
app.get('/api/exercises/:id/assets', auth, (req, res) => {
  const exercise = exerciseCatalog.find(item => item.id === req.params.id);
  if (!exercise) return res.status(404).json({ error: 'exercise not found' });

  const user = stmts.getUser.get(req.openid);
  if (exercise.isPro && !isMember(user)) {
    return res.status(403).json({ error: 'membership required' });
  }

  try {
    res.json({
      id: exercise.id,
      thumbUrl: signCosUrl(exercise.thumbKey),
      videoUrl: exercise.videoKey ? signCosUrl(exercise.videoKey) : null,
      expiresIn: COS_SIGN_EXPIRES
    });
  } catch (err) {
    console.error('cos sign error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/membership — 临时人工开通会员，接支付前使用。
app.post('/api/admin/membership', adminAuth, (req, res) => {
  const { openid, level = 'pro', expiresAt = null } = req.body;
  if (!openid) return res.status(400).json({ error: 'openid required' });

  const result = stmts.setMembership.run(level, expiresAt, openid);
  if (result.changes === 0) return res.status(404).json({ error: 'user not found' });

  res.json({ ok: true, openid, level, expiresAt });
});

// PUT /api/data — 推送所有数据
app.put('/api/data', auth, (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data object required' });
  }

  const upsertMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      stmts.upsertData.run(req.openid, key, JSON.stringify(value));
    }
  });

  try {
    upsertMany(Object.entries(data));
    res.json({ ok: true });
  } catch (err) {
    console.error('put data error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/data/:key — 推送单个 key
app.put('/api/data/:key', auth, (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) {
    return res.status(400).json({ error: 'value required' });
  }

  try {
    stmts.upsertData.run(req.openid, key, JSON.stringify(value));
    res.json({ ok: true });
  } catch (err) {
    console.error('put key error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/data — 清空用户数据
app.delete('/api/data', auth, (req, res) => {
  try {
    stmts.deleteUserData.run(req.openid);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete data error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FitTracker API running on port ${PORT}`);
});
