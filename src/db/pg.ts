import DataStoreCoreImpl from './core';
import { Secret, SecretConfig } from '../types';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { env } from 'process';

export class Postgres extends DataStoreCoreImpl {
  public readonly name: string = 'Postgres';
  public connectionString: string = 'Postgres';
  private db!: any;

  private table: string = 'public.ots';

  async connect(): Promise<any> {
    this.connectionString = 'key-beacon-334717:europe-west1:ots';
    const config = {
      user: env.GCP_PG_USER,
      host: env.GCP_PG_HOST,
      database: env.GCP_PG_DB,
      password: env.GCP_PG_PASS,
      port: parseInt(env.GCP_PG_PORT || '5432', 10),
      ssl: {
        rejectUnauthorized: false,
        ca: readFileSync('certs/server-ca.pem').toString(),
        key: readFileSync('certs/client-key.pem').toString(),
        cert: readFileSync('certs/client-cert.pem').toString(),
      }
    };
    this.db = new Client(config);
    this.db.connect();
    return this.db;
  }

  async getSecret(id: string, config?: SecretConfig): Promise<Secret> {
    const query = `SELECT * FROM ${this.table} WHERE id='${id}'`;
    let data;
    try {
      const result = await this.db.query(query);
      data = result.rows[0];
      if (!data) {
        return this.emptySecret;
      }
    } catch (e) {
      throw e;
    }
    const expires = new Date(data.expires);
    const expired = expires && this.getUtcDate() > expires;
    if (!data.value || expired) {
      await this.removeSecret(id);
      return this.emptySecret;
    }
    return data as Secret;
  }

  async createSecret(secret: Secret): Promise<Secret> {
    const value = this.encryptValue(secret.value);
    const expires = Math.round(secret.expires!.valueOf() / 1000);
    const password = secret.password ? `'${secret.password}'` : null;
    const query = `INSERT INTO ${this.table} (id, value, password, expires, ttl) VALUES ('${secret.id}', '${secret.value}', ${password}, to_timestamp(${expires}), ${secret.ttl})`;
    // console.log(query);
    try {
      await this.db.query(query);
      return secret;
    } catch (e) {
      throw e;
    }
  }

  async removeSecret(id: string): Promise<any> {
    const query = `DELETE FROM ${this.table} WHERE id='${id}'`;
    try {
      return await this.db.query(query);
    } catch (e) {
      throw e;
    }
  }

  async disconnect(): Promise<any> {
    return this.db.end();
  }
}