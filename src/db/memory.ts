import { DataStore, Secret, SecretConfig } from '../types';
import { createHash } from 'crypto';

type Cache = {
  [key: string]: any;
}

export class Memory implements DataStore {
  public name: string = 'Memory';
  public connectionString: string = 'Memory';
  private cache: Cache = {};

  async waitSomeTime(): Promise<any> {
    return Promise.resolve();
  }
  async connect(): Promise<any> {
    return Promise.resolve();
  }

  async createSecret(secret: Secret): Promise<Secret> {
    const now = new Date();
    const salt = now.valueOf();
    const id = createHash('md5').update(secret.value + salt).digest('hex');
    secret.id = id;
    if (secret.ttl) {
      now.setSeconds(now.getSeconds() + secret.ttl);
      secret.expires = now;
    }
    this.cache[id] = secret;
    return Promise.resolve(secret);
  }

  async getSecret(id: string, config?: SecretConfig): Promise<Secret> {
    const secret = this.cache[id] || {};
    const expired = secret.expires && new Date() > secret.expires;
    if (!secret.value || expired) {
      await this.removeSecret(id);
      const s: Secret = {
        value: undefined
      };
      return Promise.resolve(s);
    }
    return Promise.resolve(secret);
  }

  async removeSecret(id: string): Promise<void> {
    delete this.cache[id];
    return Promise.resolve();
  }

}
