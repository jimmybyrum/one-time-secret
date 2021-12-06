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

export class CosmosDataStore implements DataStore {
  public name: string = 'Cosmos';
  private _container!: Container;

  async waitSomeTime(): Promise<any> {
      for (let index = 0; index < 30; index++) {
          const ms = 1000
          await delay (ms)
          console.log("Waiting inside wait func")
      }
  }

  async connect(): Promise<any> {
    console.log("Will wait a little to ensure that MSI will be available")
    console.log("KV secret: ", env.SomeSecret)
    for (let index = 0; index < 15; index++) {
        const ms = 1000
        await delay (ms)
        console.log("I have waited ", (ms*index)/1000, " seconds.", "-- AZURE_CLIENT_ID: ", env.AZURE_CLIENT_ID, " USER_ASSIGNED_ID: ", env.USER_ASSIGNED_ID)
    }

    const kvcredential = new DefaultAzureCredential();

    const vaultName = "kv-ots-test";
    const url = `https://${vaultName}.vault.azure.net`;

    const kvclient = new SecretClient(url, kvcredential);

    const secretName = "SecretShouldBe";

    const latestSecret = await kvclient.getSecret(secretName);
    console.log(`Latest version of the secret ${secretName}: `, latestSecret);
    const specificSecret = await kvclient.getSecret(secretName, { version: latestSecret.properties.version! });
    console.log(`The secret ${secretName} at the version ${latestSecret.properties.version!}: `, specificSecret);


    const { endpoint, databaseId, containerId } = dbConfig;
    console.log("Will create a cosmosClient using the following config values: endpoint: ", endpoint, " - databaseId: ", databaseId, " - containerId: ", containerId )
    const credential = new DefaultAzureCredential({ managedIdentityClientId: "1e717f5c-afc8-40fb-8729-9f8d88df26d2" });

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
