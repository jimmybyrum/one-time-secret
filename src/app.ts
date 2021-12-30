import { DataStore, Errors, otsApp, Secret, SecretConfig } from './types'

export class App implements otsApp {
  private VALID_SCALE = ['day', 'hour', 'minute', 'second', 'days', 'hours', 'minutes', 'seconds'];
  private MAX_TTL = 60 * 60 * 24 * 7 // 7 days
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
      secret.value = this._dataStore.decryptValue(secret.value, secret.password);
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
    const ttl = this.timeScaleToSeconds(json.time, json.scale);
    if (ttl > this.MAX_TTL) {
      return Promise.reject(Errors.BAD_DATA);
    }
    let secret: Secret = {
      id: this._dataStore.getSecretId(json.value),
      value: json.value,
      ttl: ttl,
      expires: this._dataStore.getExpires(ttl)
    };
    if (json.password) {
      secret.password = json.password;
      secret.value = this._dataStore.encryptValue(json.value, json.password);
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

