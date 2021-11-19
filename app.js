import { createHash } from 'crypto';
import Memory from 'vault.js';

const VALID_SCALE = ['day', 'hour', 'minute', 'days', 'hours', 'minutes'];

export function getSecret(id, json) {
  const secret = Memory.get(id) || {};
  if (secret.password && secret.password !== json.password) {
    return Promise.reject('password-required');
  }
  Memory.remove(id);
  return Promise.resolve(secret);
}

export function createSecret(json) {
  if (isNaN(json.time)) {
    return Promise.reject('bad-data');
  }
  if (VALID_SCALE.indexOf(json.scale) < 0) {
    return Promise.reject('bad-data');
  }
  const salt = new Date().valueOf();
  const id = createHash('md5').update(json.value + salt).digest('hex');
  Memory.set(id, {
    value: json.value,
    password: json.password
  }, {
    expires: `+${json.time} ${json.scale}`,
  });
  return Promise.resolve(id);
}
