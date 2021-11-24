import { Container, CosmosClient } from '@azure/cosmos';
import { DataStore, Secret, SecretConfig } from '../types';
// @ts-ignore
import dbConfig from '../../dbConfig.js';

export class CosmosDataStore implements DataStore {
  public name: string = 'Cosmos';
  public connectionString: string = '';
  private _container!: Container;

  async connect(): Promise<any> {
    const { endpoint, key, databaseId, containerId } = dbConfig;
    const client = new CosmosClient({ endpoint, key });
    const database = client.database(databaseId);
    const container = database.container(containerId);
    await this.dbCreate(client, databaseId, containerId);
    this._container = container;
    this.connectionString = `${endpoint}${container.id}`;
    return container;
  }

  async getSecret(id: string, config: SecretConfig): Promise<Secret> {
    const query = `SELECT * from c WHERE c.id="${id}"`;
    const { resources: items } = await this._container.items.query({ query: query }).fetchAll();
    return items[0] || {};
  }

  async createSecret(secret: Secret): Promise<Secret> {
    const { resource: createdItem } = await this._container.items.create(secret);
    return {
      id: createdItem?.id,
      value: createdItem?.value,
    };
  }

  async removeSecret(id: string): Promise<any> {
    return this._container.item(id, id).delete();
  }

  private async dbCreate(client: CosmosClient, databaseId: string, containerId: string) {
    const { partitionKey } = dbConfig;
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
}
