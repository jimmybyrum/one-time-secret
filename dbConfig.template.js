// these keys, or whatever config you need for your db
const dbConfig = {
  endpoint: '<COSMOS ENDPOINT>',
  key: '<COSMOS KEY>',
  databaseId: '<COSMOS Database ID>',
  containerId: '<COSMOS Container ID>',
  partitionKey: { kind: 'ash', paths: ['id'] } // or whatever your partition key is
};

module.exports = dbConfig;
