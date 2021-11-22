import { createHash } from 'crypto';
import { DataStore, Errors, otsApp, Secret, SecretConfig } from './types'

export class App implements otsApp {
  private VALID_SCALE = ['day', 'hour', 'minute', 'days', 'hours', 'minutes'];
  private _dataStore: DataStore;

  constructor(datastore: DataStore) {
    this._dataStore = datastore;
  }

  async getSecret(id: string, json: SecretConfig) {
    const secret = await this._dataStore.getSecret(id);
    if (!secret) {
      return Promise.reject(Errors.NOT_FOUND);
    }
    if (secret.password && secret.password !== json.password) {
      return Promise.reject(Errors.PASSWORD_REQUIRED);
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
    let secret: Secret = {
      id: id,
      value: json.value,
      ttl: this.timeScaleToSeconds(json.time, json.scale)
    };
    if (json.password) {
      secret.password = json.password;
    }
    try {
      const createdSecret = await this._dataStore.createSecret(secret);
      return Promise.resolve(createdSecret?.id);
    } catch (e) {
      return Promise.reject(e);
    }
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

