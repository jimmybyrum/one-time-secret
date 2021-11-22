export type Secret = {
  id?: string;
  value: any;
  time?: number;
  scale?: string;
  ttl?: number;
  password?: string;
}

export type SecretConfig = {
  password?: string;
}

export type RequestByAddressCache = {
  [key: string]: any;
}
