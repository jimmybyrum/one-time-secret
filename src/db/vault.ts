import { DataStore, Secret, SecretConfig } from '../types';
// @ts-ignore
import Memory from 'vault.js';
import { createHash } from 'crypto';

export class Vault implements DataStore {
  connect(): Promise<any> {
    return Promise.resolve();
  }

  createSecret(secret: Secret): Promise<Secret> {
    const salt = new Date().valueOf();
    const id = createHash('md5').update(secret.value + salt).digest('hex');
    const s: Secret = {
      id: id,
      value: secret.value,
      password: secret.password
    };
    Memory.set(id, s, {
      expires: `+${secret.ttl} seconds`,
    });
    return Promise.resolve(s);
  }

  getSecret(id: string, config?: SecretConfig): Promise<Secret> {
    return Promise.resolve(Memory.get(id) || {});
  }

  removeSecret(id: string): Promise<void> {
    Memory.remove(id);
    return Promise.resolve();
  }

}
