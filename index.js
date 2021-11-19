import { createServer } from 'http';
import { readFile } from 'fs';
import { getSecret, createSecret } from './app.js';

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const MATCH = /[A-Za-z0-9]+/i;
const CONTENT_TYPE_HTML = { 'Content-Type': 'text/html' }
const CONTENT_TYPE_JSON = { 'Content-Type': 'application/json' }
let requestsByAddress = {};

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
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const json = JSON.parse(sanitize(body));
    getSecret(id, json).then(secret => {
      res.writeHead(200, CONTENT_TYPE_JSON);
      res.end(JSON.stringify({
        value: secret.value
      }), 'utf-8');
    }).catch(e => {
      res.writeHead(401, CONTENT_TYPE_JSON);
      return res.end(JSON.stringify({
        err: 'authorization required'
      }), 'utf-8');
    });
  });
}

function handleCreate(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const json = JSON.parse(sanitize(body));
    createSecret(json).then(id => {
      res.writeHead(200, CONTENT_TYPE_JSON);
      res.end(JSON.stringify({id: id}), 'utf-8');
    }).catch(e => {
      return badData(res);
    });
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

function rateLimit(req) {
  const address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!requestsByAddress[address]) {
    requestsByAddress[address] = 0
  }
  if (requestsByAddress[address] > 5) {
    return Promise.reject();
  }
  requestsByAddress[address]++;
  setTimeout(() => {
    requestsByAddress[address]--;
  }, 1000);
  return Promise.resolve();
}
