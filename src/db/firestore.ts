import { DocumentData, Firestore as GCPFireStore } from '@google-cloud/firestore';
import { Secret, SecretConfig } from '../types';
import { env } from 'process';
import DataStoreCoreImpl from './core';

const PROJECT_ID = env.GCP_FIRESTORE_PROJECT_ID;
const COLLECTION = env.GCP_FIRESTORE_COLLECTION!;
const GCP_CLIENT_EMAIL = env.GCP_CLIENT_EMAIL;
const GCP_PRIVATE_KEY = env.GCP_PRIVATE_KEY;

export class Firestore extends DataStoreCoreImpl {
  public readonly name: string = 'Firestore';
  public connectionString: string = 'Firestore';
  private db!: GCPFireStore;

  async connect(): Promise<any> {
    this.connectionString = PROJECT_ID!;
    const firestoreConfig = {
      projectId: PROJECT_ID,
      credentials: {
        client_email: GCP_CLIENT_EMAIL,
        private_key: GCP_PRIVATE_KEY
      }
    };
    const db = new GCPFireStore(firestoreConfig);
    this.db = db;
    return db;
  }

  async disconnect(): Promise<any> {
    return true;
  }
  
  async createSecret(secret: Secret): Promise<Secret> {
    const doc = this.db.collection(COLLECTION).doc(secret.id!);
    try {
      await doc.set(secret)
      return secret;
    } catch (e) {
      throw e;
    }
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
