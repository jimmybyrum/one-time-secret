const dbConfig = {
  endpoint: "<COSMOS ENDPOINT>",
  key: "<COSMOS KEY>",
  databaseId: "<COSMOS Database ID>",
  containerId: "<COSMOS Container ID>",
  partitionKey: { kind: "Hash", paths: ["/id"] } // or whatever your partition key is
};

export default dbConfig;
