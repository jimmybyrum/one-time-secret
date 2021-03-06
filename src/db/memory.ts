import { Secret, SecretConfig } from '../types';
import { createHash } from 'crypto';
import DataStoreCoreImpl from './core';

type Cache = {
  [key: string]: any;
}

export class Memory extends DataStoreCoreImpl {
  public name: string = 'Memory';
  public connectionString: string = 'Memory';
  private cache: Cache = {};

  async connect(): Promise<any> {
    return true;
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
    return secret;
  }

  async getSecret(id: string, config?: SecretConfig): Promise<Secret> {
    const secret = this.cache[id] || {};
    const expired = secret.expires && new Date() > secret.expires;
    if (!secret.value || expired) {
      await this.removeSecret(id);
      const s: Secret = {
        value: undefined
      };
      return s;
    }
    return secret;
  }

  async removeSecret(id: string): Promise<void> {
    delete this.cache[id];
    return Promise.resolve();
  }

}
