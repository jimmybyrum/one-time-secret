import { App } from './app';
import initDataStore from './db/index'
import { env } from 'process';

const SECRET_VALUE = 'secret-value';
const SECRET_PASSWORD = 'secret-password';

const dataStore = initDataStore(env.DATASTORE);
const app = new App(dataStore);

describe('tests', () => {
  beforeAll(async () => {
    await dataStore.connect().then(() => {
      console.log(`DataStore connected: ${dataStore.name}`);
    }).catch(e => console.log('dbConnect error:', e));
  });

  test('can create secret without password', async () => {
    const id = await _createSecret();
    expect(id).toBeDefined();
    if (id) {
      await app.removeSecret(id);
    }
  });

  test('can get secret without password', async () => {
    const id = await _createSecret();
    expect(typeof id).toBe('string');
    if (id) {
      const secret = await app.getSecret(id, {});
      expect(secret.value).toEqual(SECRET_VALUE);
    }
  });

  test('can create secret with password', async () => {
    const id = await _createSecret(SECRET_PASSWORD);
    expect(id).toBeDefined();
    if (id) {
      await app.removeSecret(id);
    }
  });

  test('should prompt for password', async () => {
    const id = await _createSecret(SECRET_PASSWORD);
    expect(typeof id).toBe('string');
    if (id) {
      const s = app.getSecret(id, {});
      await expect(s).rejects.toEqual('password-required');
    }
  });

  test('can get secret with password', async () => {
    const id = await _createSecret(SECRET_PASSWORD);
    expect(typeof id).toBe('string');
    if (id) {
      const secret = await app.getSecret(id, {
        password: SECRET_PASSWORD
      });
      expect(secret.value).toEqual(SECRET_VALUE);
    }
  });

  test('should not find expired secret', async () => {
    const id = await _createSecret(SECRET_PASSWORD, 1, 'second');
    expect(typeof id).toBe('string');
    await new Promise(r => setTimeout(r, 1100));
    if (id) {
      try {
        const secret = await app.getSecret(id, {});
        expect(secret.value).toBeUndefined();
      } catch (e) {
        expect(undefined).toEqual(undefined);
      }
    }
  });

  test('should not find a secret', async () => {
    const secret = await app.getSecret('NOTHING_TO_SEE_HERE', {});
    expect(secret).toEqual({});
  });
});


async function _createSecret(password?: string, time: number = 1, scale: string = 'minute') {
  return await app.createSecret({
    value: SECRET_VALUE,
    time: time,
    scale: scale,
    password: password
  });
}
