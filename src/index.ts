import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs';
import { getSecret, createSecret, setContainer } from './app';
import { RequestByAddress } from './types';
import { dbConnect } from './db';
import { env } from 'process';

const HOST = env.HOST || 'localhost';
const PORT = parseInt(env?.PORT || '3000', 10) || 3000;
const MATCH = /[A-Za-z0-9]+/i;
const CONTENT_TYPE_HTML = { 'Content-Type': 'text/html' }
const CONTENT_TYPE_JSON = { 'Content-Type': 'application/json' }

let requestsByAddress: RequestByAddress = {};

createServer((req, res) => {
  const urlParts = req?.url?.split('/') ?? '';
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
  dbConnect()
    .then(container => setContainer(container))
    .catch(e => console.log('dbConnect error:', e));
  console.log(`Server running at ${HOST}:${PORT}/`);
});

function handleShow(req: IncomingMessage, res: ServerResponse, secretId: string) {
  const matches = secretId?.match(MATCH);
  const id = matches?.length && matches[0];
  if (!id) {
    return badData(res);
  }
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

function handleCreate(req: IncomingMessage, res: ServerResponse) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const json = JSON.parse(sanitize(body));
    createSecret(json).then(id => {
      res.writeHead(200, CONTENT_TYPE_JSON);
      res.end(JSON.stringify({ id: id }), 'utf-8');
    }).catch(e => {
      return badData(res);
    });
  });
}

function handleHtml(req: IncomingMessage, res: ServerResponse) {
  readFile('index.html', (error, content) => {
    res.writeHead(200, CONTENT_TYPE_HTML);
    res.end(content, 'utf-8');
  });
}

function badData(res: ServerResponse) {
  res.writeHead(400, CONTENT_TYPE_HTML);
  res.end('Bad data.', 'utf-8');
}

function sanitize(str: string) {
  return str.replace(/javascript:/gi, '').replace(/\^\w-_. ]/gi, c => {
    return `&#${c.charCodeAt(0)};`;
  });
}

function rateLimit(req: IncomingMessage) {
  const address: string | string[] = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').toString();
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
