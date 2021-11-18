import { getSecret, createSecret } from './index';

test('can create secret', async () => {
  const id = await createSecret({
    value: 'secret-value',
    time: 1,
    scale: 'minutes',
    password: undefined
  });
  expect(id).toBeDefined();
});