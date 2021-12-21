export type Secret = {
  id?: string;
  value: any;
  time?: number;
  scale?: string;
  ttl?: number;
  expires?: Date;
  password?: string;
}

export type SecretConfig = {
  password?: string;
}

export type RequestByAddressCache = {
  [key: string]: any;
}

export interface otsApp {
  getSecret(id: string, json: SecretConfig): Promise<Secret>;
  createSecret(json: Secret): Promise<any>;
  removeSecret(id: string): Promise<any>;
}

export interface DataStore {
  readonly name: string;
  connectionString: string;
  connect(): Promise<any>;
  getSecret(id: string, config?: SecretConfig): Promise<Secret>;
  createSecret(secret: Secret): Promise<Secret>;
  removeSecret(id: string): Promise<any>;
}

const enum Errors {
  NOT_FOUND = 'not-found',
  PASSWORD_REQUIRED = 'password-required',
  BAD_DATA = 'bad-data',
}
