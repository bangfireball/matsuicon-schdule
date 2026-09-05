const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = Number(process.env.PORT || 3000);
const DATA_PATH = process.env.SCHEDULE_PATH || path.join(__dirname, '..', 'data', 'schedule.json');
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'access.jsonl');

let schedule = loadSchedule();
fs.mkdirSync(LOG_DIR, { recursive: true });

function loadSchedule() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
  });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function log(req, extra = {}) {
  const row = {
    at: new Date().toISOString(),
    method: req.method,
    path: req.url,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
    referer: req.headers.referer || '',
    ...extra,
  };
  fs.appendFile(LOG_FILE, JSON.stringify(row) + '\n', () => {});
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 100_000) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', () => resolve(''));
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  log(req);

  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (parsed.pathname === '/api/health') return send(res, 200, { ok: true, count: schedule.count, timezone: schedule.timezone });
  if (parsed.pathname === '/api/schedule' || parsed.pathname === '/api/sessions') return send(res, 200, schedule);
  if (parsed.pathname === '/api/stats') {
    const sessions = schedule.sessions || [];
    const unique = key => [...new Set(sessions.map(s => s[key]).filter(Boolean))].sort();
    return send(res, 200, {
      count: sessions.length,
      days: unique('day'),
      locations: unique('location'),
      tracks: unique('track'),
      types: [...new Set(sessions.flatMap(s => String(s.types || '').split(/[;,]/).map(x => x.trim()).filter(Boolean)))].sort(),
    });
  }
  if (parsed.pathname === '/api/visit' && req.method === 'POST') {
    const body = await readBody(req);
    log(req, { event: 'visit', body: body.slice(0, 2000) });
    return send(res, 204, {});
  }
  if (parsed.pathname === '/api/admin/reload' && req.method === 'POST') {
    schedule = loadSchedule();
    return send(res, 200, { ok: true, count: schedule.count });
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`Matsuricon backend listening on ${PORT}`));
