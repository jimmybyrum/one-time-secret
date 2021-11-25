FROM node:slim

ENV PORT 3000
ENV HOST 0.0.0.0
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=prod
COPY dbConfig.js .
COPY . .

EXPOSE 3000

CMD [ "node", "./dist/index.js" ]
