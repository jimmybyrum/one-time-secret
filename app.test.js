import { getSecret, createSecret } from './app';

const SECRET_VALUE = 'secret-value';
const SECRET_PASSWORD = 'secret-password';

test('can create secret without password', async () => {
  const id = await _createSecret();
  expect(id).toBeDefined();
});

test('can get secret without password', async () => {
  const id = await _createSecret();
  const secret = await getSecret(id, {});
  expect(secret.value).toEqual(SECRET_VALUE);
});

test('can create secret with password', async () => {
  const id = await _createSecret(SECRET_PASSWORD);
  expect(id).toBeDefined();
});

test('should prompt for password', async () => {
  const id = await _createSecret(SECRET_PASSWORD);
  const s = getSecret(id, {});
  await expect(s).rejects.toEqual('password-required');
});

test('can get secret with password', async () => {
  const id = await _createSecret(SECRET_PASSWORD);
  const secret = await getSecret(id, {
    password: SECRET_PASSWORD
  });
  expect(secret.value).toEqual(SECRET_VALUE);
});

test('should not find a secret', async () => {
  const secret = await getSecret('NOTHING_TO_SEE_HERE', {});
  expect(secret).toEqual({});
});

async function _createSecret(password) {
  return await createSecret({
    value: SECRET_VALUE,
    time: 1,
    scale: 'minutes',
    password: password
  });
}