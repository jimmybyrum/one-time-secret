FROM node:slim

ENV PORT 3000
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000

CMD [ "node", "index.js" ]