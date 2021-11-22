import { CosmosClient } from '@azure/cosmos';
import dbConfig from './dbConfig';

const { endpoint, key, databaseId, containerId, partitionKey } = dbConfig;

export async function dbConnect() {
  const client = new CosmosClient({ endpoint, key });
  const database = client.database(databaseId);
  const container = database.container(containerId);
  console.log(`Connected to ${endpoint}${container.id}`);
  await dbCreate(client, databaseId, containerId);
  return container;
}

async function dbCreate(client: CosmosClient, databaseId: string, containerId: string) {
  await client.databases.createIfNotExists({
    id: databaseId
  });
  await client.database(databaseId).containers.createIfNotExists({
    id: containerId,
    partitionKey
  }, {
    offerThroughput: 400
  });
}
