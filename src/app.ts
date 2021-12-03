import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';
import { DataStore, Errors, otsApp, Secret, SecretConfig } from './types'

export class App implements otsApp {
  private VALID_SCALE = ['day', 'hour', 'minute', 'second', 'days', 'hours', 'minutes', 'seconds'];
  private MAX_TTL = 60 * 60 * 24 * 7 // 7 days
  private ALGO = 'aes-192-cbc';
  private _dataStore: DataStore;

  constructor(datastore: DataStore) {
    this._dataStore = datastore;
  }

  async getSecret(id: string, json: SecretConfig) {
    const secret = await this._dataStore.getSecret(id);
    if (!secret) {
      return Promise.reject(Errors.NOT_FOUND);
    }
    if (secret.password) {
      if (secret.password !== json.password) {
        return Promise.reject(Errors.PASSWORD_REQUIRED);
      }
      const [encrypted, iv] = secret.value.split('|');
      const key = scryptSync(secret.password, 'salt', 24);
      const decipher = createDecipheriv(this.ALGO, key, Buffer.from(iv, 'hex'));
      secret.value = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    }
    if (secret?.id) {
      await this._dataStore.removeSecret(id);
    }
    return Promise.resolve(secret);
  }

  async createSecret(json: Secret) {
    if (!json.time || isNaN(json.time)) {
      return Promise.reject(Errors.BAD_DATA);
    }
    if (typeof json.scale !== 'string' || this.VALID_SCALE.indexOf(json.scale) < 0) {
      return Promise.reject(Errors.BAD_DATA);
    }
    const salt = new Date().valueOf();
    const id = createHash('md5').update(json.value + salt).digest('hex');
    const ttl = this.timeScaleToSeconds(json.time, json.scale);
    if (ttl > this.MAX_TTL) {
      return Promise.reject(Errors.BAD_DATA);
    }
    let secret: Secret = {
      id: id,
      value: json.value,
      ttl: ttl
    };
    if (json.password) {
      secret.password = json.password;
      const iv = randomBytes(16);
      const key = scryptSync(secret.password, 'salt', 24);
      const cipher = createCipheriv(this.ALGO, key, iv);
      secret.value = [
        cipher.update(secret.value, 'utf8', 'hex') + cipher.final('hex'),
        Buffer.from(iv).toString('hex')
      ].join('|');
    }
    try {
      const createdSecret = await this._dataStore.createSecret(secret);
      return Promise.resolve(createdSecret?.id);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async removeSecret(id: string) {
    return this._dataStore.removeSecret(id);
  }

  timeScaleToSeconds(time: number, scale: string) {
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
}

