import { Container } from '@azure/cosmos';
import { createHash } from 'crypto';
import { Secret, SecretConfig } from './types'

const VALID_SCALE = ['day', 'hour', 'minute', 'days', 'hours', 'minutes'];

let container: Container;

export function setContainer(_container: Container) {
  container = _container;
}

export async function getSecret(id: string, json: SecretConfig) {
  const query = `SELECT * from c WHERE c.id="${id}"`;
  const { resources: items } = await container.items.query({ query: query }).fetchAll();
  const secret = items[0] || {};
  if (secret.password && secret.password !== json.password) {
    return Promise.reject('password-required');
  }
  if (items.length === 1) {
    await container.item(id, id).delete();
  }
  return Promise.resolve(secret);
}

export async function createSecret(json: Secret) {
  if (!json.time || isNaN(json.time)) {
    return Promise.reject('bad-data');
  }
  if (typeof json.scale !== 'string' || VALID_SCALE.indexOf(json.scale) < 0) {
    return Promise.reject('bad-data');
  }
  const salt = new Date().valueOf();
  const id = createHash('md5').update(json.value + salt).digest('hex');
  let secret: Secret = {
    id: id,
    value: json.value,
    ttl: timeScaleToSeconds(json.time, json.scale)
  };
  if (json.password) {
    secret.password = json.password;
  }
  const { resource: createdItem } = await container.items.create(secret);
  return Promise.resolve(createdItem?.id);
}

function timeScaleToSeconds(time: number, scale: string) {
  switch (scale) {
    case 'minute':
    case 'minutes':
      return time * 60;
    case 'hour':
    case 'hours':
      return time * 60 * 60;
    case 'day':
    case 'days':
      return time * 60 * 60 * 24;
    default:
      return time;
  }
}
