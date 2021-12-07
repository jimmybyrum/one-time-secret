import { Container, CosmosClient } from '@azure/cosmos';
import { DataStore, Secret, SecretConfig } from '../types';
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { env } from 'process';
// @ts-ignore
import dbConfig from '../../dbConfig.js';

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function fetchPrimaryKey(env: string){
    const vaultName = `kv-ots-${env}`;
    const url = `https://${vaultName}.vault.azure.net`;

    const kvclient = new SecretClient(url, new DefaultAzureCredential());

    const key = (await kvclient.getSecret("PrimaryKey")).value ?? "No value found";

    return key
}

export class CosmosDataStore implements DataStore {
  public name: string = 'Cosmos';
  private _container!: Container;

  async connect(): Promise<any> {
    console.log("Will wait a little to ensure that MSI will be available")
    for (let index = 0; index < 10; index++) {
        const ms = 1000
        await delay (ms)
        console.log("I have waited ", (ms*index)/1000, " seconds.")
    }

    const key = await fetchPrimaryKey(env.ENVIRONMENT ?? "NoEnvAvailable");

    const { endpoint, databaseId, containerId } = dbConfig;
    const client = new CosmosClient({ endpoint, key });
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
