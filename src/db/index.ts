import { CosmosDataStore } from './cosmos';
import { Vault } from './vault';
import { DataStore } from '../types';

let dataStore: DataStore;
switch (process.env.DATASTORE) {
  case 'cosmos':
    dataStore = new CosmosDataStore();
    break;
  default:
    dataStore = new Vault();
    break;
}

export default dataStore;
