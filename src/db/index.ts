import { DataStore } from '../types';
import { Memory } from './memory';

function initDataStore(type: string | undefined): DataStore {
  switch (type) {
    default:
      return new Memory();
  }
}

export default initDataStore;
