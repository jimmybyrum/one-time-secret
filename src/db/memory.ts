import { Secret, SecretConfig } from '../types';
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

  async disconnect(): Promise<any> {
    return true;
  }

  async createSecret(secret: Secret): Promise<Secret> {
    this.cache[secret.id!] = secret;
    return secret;
  }

  async getSecret(id: string, config?: SecretConfig): Promise<Secret> {
    const secret = this.cache[id] || {};
    const expired = secret.expires && this.getUtcDate() > secret.expires;
    if (!secret.value || expired) {
      await this.removeSecret(id);
      return this.emptySecret;
    }
    return secret;
  }

  async removeSecret(id: string): Promise<void> {
    delete this.cache[id];
    return Promise.resolve();
  }
}
