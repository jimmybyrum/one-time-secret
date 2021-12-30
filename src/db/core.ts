import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';
import { env } from 'process';
import { DataStoreCore, Secret } from '../types';

export default class DataStoreCoreImpl implements DataStoreCore {
  private ALGO = 'aes-192-cbc';
  private DATASTORE_PW = env.DATASTORE_PW;

  emptySecret: Secret = {
    value: undefined
  };
  
  getUtcDate(date: Date = new Date()) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    );
  }

  getSecretId(value: string): string {
    const salt = this.getUtcDate().valueOf();
    return createHash('md5').update(value + salt).digest('hex');
  }

  getExpires(ttl: number = 60): Date {
    const expires = this.getUtcDate();
    expires.setSeconds(expires.getSeconds() + ttl);
    return expires;
  }

  encryptValue(value: string, password: string = this.DATASTORE_PW!): string {
    const iv = randomBytes(16);
    const key = scryptSync(password, 'salt', 24);
    const cipher = createCipheriv(this.ALGO, key, iv);
    return [
      cipher.update(value, 'utf8', 'hex') + cipher.final('hex'),
      Buffer.from(iv).toString('hex')
    ].join('|');
  }

  decryptValue(value: string, password: string): string {
    const [encrypted, iv] = value.split('|');
    const key = scryptSync(password, 'salt', 24);
    const decipher = createDecipheriv(this.ALGO, key, Buffer.from(iv, 'hex'));
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  }
}
