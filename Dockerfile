FROM node:slim

ENV PORT 3000
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=prod
COPY src/dbConfig.ts .
COPY . .

EXPOSE 3000

CMD [ "node", "./dist/index.js" ]
