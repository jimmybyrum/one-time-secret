import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url'
import { readFile } from 'fs/promises';
import { App } from './app';
import { Errors, RequestByAddressCache, Secret } from './types';
import { env } from 'process';
import initDataStore from './db/index'

const HOST = env.HOST || 'localhost';
const PORT = parseInt(env?.PORT || '3000', 10);
const BASE_PATH = env.BASE_PATH;
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

const dataStore = initDataStore(env.DATASTORE);
const app = new App(dataStore);

dataStore.connect()
  .then(() => {
    console.log(`DataStore connected: ${dataStore.connectionString}`);
    startServer();
  })
  .catch(e => console.log('dbConnect error:', e));

function startServer() {
  createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '');
    const pathname = parsedUrl.pathname;
    let urlParts = pathname!.substring(1).split('/');
    if (urlParts[0] === BASE_PATH) {
      urlParts.shift();
    }
    const path = urlParts[0] || '';

    rateLimit(req).then(() => {
      if (path === 'health' || path === 'ready') {
        res.writeHead(HTTP.OK, CONTENT_TYPE_JSON);
        res.end(JSON.stringify({ [path]: true }), 'utf-8');
        return;
      }
      if (path === 'api' && req.method === 'POST') {
        const secretId = urlParts[1];
        if (secretId && secretId.match(MATCH)) {
          handleShow(req, res, secretId);
          return;
        }
        handleCreate(req, res);
      } else if (path === '' && req.method === 'GET') {
        handleHtml(req, res);
      }
    }).catch(e => {
      if (e.toString() === RATE_LIMIT.KEY) {
        res.writeHead(HTTP.TOO_MANY_REQUESTS, CONTENT_TYPE_HTML);
        res.end(RATE_LIMIT.MESSAGE, 'utf-8');
      } else {
        internalError(res);
      }
    });
  }).listen(PORT, HOST, () => {
    console.log(`Server running at ${HOST}:${PORT}/`);
  });
}

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
    app.getSecret(id, json).then(secret => {
      res.writeHead(HTTP.OK, CONTENT_TYPE_JSON);
      res.end(JSON.stringify({
        value: secret.value
      }), 'utf-8');
    }).catch(e => {
      switch (e) {
        case Errors.PASSWORD_REQUIRED:
          res.writeHead(HTTP.UNAUTHORIZED, CONTENT_TYPE_JSON);
          return res.end(JSON.stringify({
            err: Errors.PASSWORD_REQUIRED
          }), 'utf-8');
        case Errors.NOT_FOUND:
          res.writeHead(HTTP.OK, CONTENT_TYPE_JSON);
          return res.end('{}', 'utf-8');
        default:
          return badData(res);
      }
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
    app.createSecret(json).then(id => {
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
