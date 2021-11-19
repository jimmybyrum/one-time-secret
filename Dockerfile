FROM node:slim

ENV PORT 3000
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=prod
COPY dbConfig.js .
COPY . .

EXPOSE 3000

CMD [ "node", "index.js" ]