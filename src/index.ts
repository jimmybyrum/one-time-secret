import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { getSecret, createSecret, setContainer } from './app';
import { RequestByAddressCache, Secret } from './types';
import { dbConnect } from './db';
import { env } from 'process';

const HOST = env.HOST || 'localhost';
const PORT = parseInt(env?.PORT || '3000', 10);
const MATCH = /[A-Za-z0-9]+/i;
const MAX_VALUE_LENGTH = 1000;
const MAX_PASSWORD_LENGTH = 50;
const CONTENT_TYPE_HTML = { 'Content-Type': 'text/html' }
const CONTENT_TYPE_JSON = { 'Content-Type': 'application/json' }

enum RATE_LIMIT {
  KEY = 'rate-limit-exceeded',
  MESSAGE = 'Rate limit exceeded.',
  REQUESTS = 5,
  INTERVAL = 1000
}

enum HTTP {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500
}

let requestsByAddress: RequestByAddressCache = {};

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
  }).catch((e) => {
    if (e.toString() === RATE_LIMIT.KEY) {
      res.writeHead(HTTP.TOO_MANY_REQUESTS, CONTENT_TYPE_HTML);
      res.end(RATE_LIMIT.MESSAGE, 'utf-8');
    } else {
      internalError(res);
    }
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
      res.writeHead(HTTP.OK, CONTENT_TYPE_JSON);
      res.end(JSON.stringify({
        value: secret.value
      }), 'utf-8');
    }).catch(e => {
      res.writeHead(HTTP.UNAUTHORIZED, CONTENT_TYPE_JSON);
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
    const json: Secret = JSON.parse(sanitize(body));
    if (json.value.length > MAX_VALUE_LENGTH || (json.password && json.password.length > MAX_PASSWORD_LENGTH)) {
      return badData(res)
    }
    createSecret(json).then(id => {
      res.writeHead(HTTP.OK, CONTENT_TYPE_JSON);
      res.end(JSON.stringify({ id: id }), 'utf-8');
    }).catch(e => {
      return badData(res);
    });
  });
}

function handleHtml(req: IncomingMessage, res: ServerResponse) {
  readFile('index.html').then(content => {
    res.writeHead(HTTP.OK, CONTENT_TYPE_HTML);
    res.end(content, 'utf-8');
  }).catch(() => internalError(res));
}

function badData(res: ServerResponse) {
  res.writeHead(HTTP.BAD_REQUEST, CONTENT_TYPE_HTML);
  res.end('Bad data.', 'utf-8');
}

function internalError(res: ServerResponse) {
  res.writeHead(HTTP.INTERNAL_ERROR, CONTENT_TYPE_HTML);
  res.end('Internal server error', 'utf-8');
}

function sanitize(str: string) {
  return str.replace(/javascript:/gi, '').replace(/\^\w-_. ]/gi, c => {
    return `&#${c.charCodeAt(0)};`;
  });
}

function rateLimit(req: IncomingMessage) {
  const address: string | string[] = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').toString();
  if (!requestsByAddress[address]) {
    requestsByAddress[address] = 0
  }
  if (requestsByAddress[address] > RATE_LIMIT.REQUESTS) {
    return Promise.reject(RATE_LIMIT.KEY);
  }
  requestsByAddress[address]++;
  setTimeout(() => {
    requestsByAddress[address]--;
  }, RATE_LIMIT.INTERVAL);
  return Promise.resolve();
}
