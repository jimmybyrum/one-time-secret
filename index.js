import { createServer } from 'http';
import { readFile } from 'fs';
import { createHash } from 'crypto';
import Memory from 'vault.js';

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const MATCH = /[A-Za-z0-9]+/i;

createServer((req, res) => {
  const urlParts = req.url.split('/');
  const urlRoot = urlParts[0];
  const path = urlParts[1];
  const secretId = urlParts[2];
  if (path === 'api' && req.method === 'POST') {
    if (secretId && secretId.match(MATCH)) {
      handleShow(req, res, secretId);
      return;
    }
    handleCreate(req, res);
  } else if (urlRoot === '' && req.method === 'GET') {
    handleHtml(res);
  }
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
    const id = createHash('md5').update(body).digest('hex');
    Memory.set(id, {
      value: json.value,
      password: json.password
    }, {
      expires: `+${json.seconds} seconds`,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({id: id}), 'utf-8');
  });
}

function handleHtml(res) {
  readFile('index.html', (error, content) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content, 'utf-8');
  });
}

function sanitize(str) {
	return str.replace(/javascript:/gi, '').replace(/\^\w-_. ]/gi, c => {
		return `&#${c.charCodeAt(0)};`;
	});
}

