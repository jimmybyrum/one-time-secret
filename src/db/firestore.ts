import { DocumentData, Firestore as GCPFireStore } from '@google-cloud/firestore';
import { DataStore, Secret, SecretConfig } from '../types';
import { createHash } from 'crypto';
import { env } from 'process';

const PROJECT_ID = env.GCP_FIRESTORE_PROJECT_ID;
const CREDENTIALS = `config/${PROJECT_ID}.json`;
const COLLECTION = env.GCP_FIRESTORE_COLLECTION!;

export class Firestore implements DataStore {
  public readonly name: string = 'Firestore';
  public connectionString: string = 'Firestore';
  private db!: GCPFireStore;

  private emptySecret: Secret = {
    value: undefined
  };

  async connect(): Promise<any> {
    const firestoreConfig = {
      projectId: PROJECT_ID,
      keyFilename: CREDENTIALS,
    };
    // console.log(firestoreConfig);
    this.connectionString = firestoreConfig.projectId!;
    const db = new GCPFireStore(firestoreConfig);
    this.db = db;
    return db;
  }
  
  async createSecret(secret: Secret): Promise<Secret> {
    const now = this.getUtcDate();
    const salt = now.valueOf();
    const id = createHash('md5').update(secret.value + salt).digest('hex');
    const doc = this.db.collection(COLLECTION).doc(id);
    if (secret.ttl) {
      now.setSeconds(now.getSeconds() + secret.ttl);
      secret.expires = now;
    }
    try {
      const created = await doc.set(secret)
      return secret;
    } catch (e) {
      throw e;
    }
  }

  private getUtcDate() {
    const now = new Date();
    return new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    );
  }

  async getSecret(id: string, config?: SecretConfig): Promise<Secret> {
    const doc = await this.getDocument(id);
    if (!doc) {
      return this.emptySecret;
    }
    const data = doc.data();
    const expires = data.expires.toDate();
    const expired = expires && this.getUtcDate() > expires;
    if (!data.value || expired) {
      await this.removeSecret(id);
      return this.emptySecret;
    }
    return data as Secret;
  }

  async removeSecret(id: string): Promise<any> {
    const doc = await this.getDocument(id);
    return await doc.ref.delete();
  }

  private async getDocument(id: string): Promise<DocumentData> {
    const matches = await this.db.collection(COLLECTION).where('id', '==', id).get();
    try {
      return matches.docs[0];
    } catch (e) {
      throw e;
    }
  }
}
