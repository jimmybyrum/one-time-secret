import { createServer } from 'http';
import { readFile } from 'fs';
import { createHash } from 'crypto';
import Memory from 'vault.js';

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const MATCH = /[A-Za-z0-9]+/i;
const CONTENT_TYPE_HTML = { 'Content-Type': 'text/html' }
const CONTENT_TYPE_JSON = { 'Content-Type': 'application/json' }
const VALID_SCALE = ['days', 'hours', 'minutes'];

createServer((req, res) => {
  const urlParts = req.url.split('/');
  const urlRoot = urlParts[0];
  const path = urlParts[1];
  const secretId = urlParts[2];
  rateLimit(req).then(() => {
    if (path === 'api' && req.method === 'POST') {
      if (secretId && secretId.match(MATCH)) {
        handleShow(req, res, secretId);
        return;
      }
      handleCreate(req, res);
    } else if (urlRoot === '' && req.method === 'GET') {
      handleHtml(req, res);
    }
  }).catch(() => {
    res.writeHead(429, CONTENT_TYPE_HTML);
    res.end('Rate limit exceeded.', 'utf-8');
  });
}).listen(PORT, HOST, () => {
  console.log(`Server running at ${HOST}:${PORT}/`);
});

function handleShow(req, res, secretId) {
  const id = secretId.match(MATCH)[0];
  const secret = Memory.get(id) || {};
  const returnVal = {
    value: secret.value
  };
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const json = JSON.parse(sanitize(body));
    if (secret.password && secret.password !== json.password) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        err: 'authorization required'
      }), 'utf-8');
    }
    Memory.remove(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(returnVal), 'utf-8');
  });
}

function handleCreate(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const json = JSON.parse(sanitize(body));
    if (isNaN(json.time)) {
      return badData(res);
    }
    if (VALID_SCALE.indexOf(json.scale) < 0) {
      return badData(res);
    }
    const salt = new Date().valueOf();
    const id = createHash('md5').update(body + salt).digest('hex');
    Memory.set(id, {
      value: json.value,
      password: json.password
    }, {
      expires: `+${json.time} ${json.scale}`,
    });
    res.writeHead(200, CONTENT_TYPE_JSON);
    res.end(JSON.stringify({id: id}), 'utf-8');
  });
}

function handleHtml(req, res) {
  readFile('index.html', (error, content) => {
    res.writeHead(200, CONTENT_TYPE_HTML);
    res.end(content, 'utf-8');
  });
}

function badData(res) {
  res.writeHead(400, CONTENT_TYPE_HTML);
  res.end('Bad data.', 'utf-8');
}

function sanitize(str) {
	return str.replace(/javascript:/gi, '').replace(/\^\w-_. ]/gi, c => {
		return `&#${c.charCodeAt(0)};`;
	});
}

let requests = {};
function rateLimit(req) {
  const address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!requests[address]) {
    requests[address] = 0
  }
  if (requests[address] > 5) {
    return Promise.reject();
  }
  requests[address]++;
  setTimeout(() => {
    requests[address]--;
  }, 1000);
  return Promise.resolve();
}

