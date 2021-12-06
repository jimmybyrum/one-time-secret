import { Container, CosmosClient } from '@azure/cosmos';
import { DataStore, Secret, SecretConfig } from '../types';
import { ChainedTokenCredential, AzureCliCredential, VisualStudioCodeCredential, ManagedIdentityCredential } from "@azure/identity"
// @ts-ignore
import dbConfig from '../../dbConfig.js';

export class CosmosDataStore implements DataStore {
  public name: string = 'Cosmos';
  private _container!: Container;

  async connect(): Promise<any> {
    const { endpoint, databaseId, containerId } = dbConfig;
    console.log("Will create a cosmosClient")
    const credential = new ChainedTokenCredential(
        new AzureCliCredential(),
        new VisualStudioCodeCredential(),
        new ManagedIdentityCredential()
    );

    const client = new CosmosClient({
        endpoint: endpoint,
        aadCredentials: credential
    });
    console.log("Created cosmosClient")

    const database = client.database(databaseId);
    const container = database.container(containerId);
    await this.dbCreate(client, databaseId, containerId);
    this._container = container;
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
