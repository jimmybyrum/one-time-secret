# One Time Secret

**[![Run Tests](https://github.com/jimmybyrum/one-time-secret/actions/workflows/tests.yaml/badge.svg)](https://github.com/jimmybyrum/one-time-secret/actions/workflows/tests.yaml)**

Vanilla nodejs implementation of a one-time-secret service.

Allows you to share secrets securely. Secrets can only be viewed once. No more sending secrets over Slack, email or speaking them out loud.

## Local setup
```bash
npm install
npm run start
```

## Docker
```bash
npm run build # build docker image
npm run run # run docker container via docker-compose
```
