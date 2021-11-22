import { App } from './app';
import { CosmosDataStore } from './db/cosmos';
import dbConfig from './dbConfig';

const SECRET_VALUE = 'secret-value';
const SECRET_PASSWORD = 'secret-password';

const dataStore = new CosmosDataStore(dbConfig);
const app = new App(dataStore);

beforeAll(async () => {
  return dataStore.connect().then(() => {
    console.log('DataStore connected');
  }).catch(e => console.log('dbConnect error:', e));
});

test('can create secret without password', async () => {
  const id = await _createSecret();
  expect(id).toBeDefined();
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

test('should not find a secret', async () => {
  const secret = await app.getSecret('NOTHING_TO_SEE_HERE', {});
  expect(secret).toEqual({});
});

async function _createSecret(password?: string) {
  return await app.createSecret({
    value: SECRET_VALUE,
    time: 1,
    scale: 'minute',
    password: password
  });
}
