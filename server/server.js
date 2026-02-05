
// server.js — FitTracker Pro 后端服务
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

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

// ========== 数据库 ==========
const db = new Database(path.join(__dirname, 'fitness.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    openid TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_data (
    openid TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (openid, key)
  );
`);

const stmts = {
  upsertUser: db.prepare(`
    INSERT INTO users (openid) VALUES (?)
    ON CONFLICT(openid) DO UPDATE SET last_login = datetime('now')
  `),
  getData: db.prepare('SELECT key, value FROM user_data WHERE openid = ?'),
  upsertData: db.prepare(`
    INSERT INTO user_data (openid, key, value, updated_at) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(openid, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `),
  deleteUserData: db.prepare('DELETE FROM user_data WHERE openid = ?'),
};

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
