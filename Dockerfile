FROM node:14-slim

ENV PORT 3000
ENV HOST 0.0.0.0
ENV BASE_PATH ots
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
COPY config ./
RUN node_modules/typescript/bin/tsc

EXPOSE 3000

CMD [ "node", "./dist/index.js" ]
