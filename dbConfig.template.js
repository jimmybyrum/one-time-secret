// these keys, or whatever config you need for your db
const dbConfig = {
    endpoint: 'https://cosmos-ots-test.documents.azure.com:443/',
    databaseId: 'db-ots',
    containerId: 'ots',
    partitionKey: { kind: 'ash', paths: ['id'] } // or whatever your partition key is
};

module.exports = dbConfig;
