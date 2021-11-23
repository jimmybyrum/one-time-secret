import { CosmosDataStore } from './cosmos';
import { DataStore } from '../types';
import { Memory } from './memory';

function initDataStore(type: string | undefined): DataStore {
  switch (type) {
    case 'cosmos':
      return new CosmosDataStore();
    default:
      return new Memory();
  }
}

export default initDataStore;
