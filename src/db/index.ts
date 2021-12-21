import { DataStore } from '../types';
import { Memory } from './memory';

class DataStorage {
  private storage: any[] = [];
  
  public addStorage(ds: any) {
    this.storage.push(ds);
  }
  
  public getStorages() {
    return this.storage;
  }

  public getStorageByName(name: string): any {
    return this.storage.find(s => {
      return s.name.toLowerCase() === name?.toLowerCase();
    });
  }

  public init(type?: string): DataStore {
    if (type) {
      const dataStore = this.getStorageByName(type);
      if (dataStore) {
        return new dataStore();
      }
    }
    return new Memory();
  }
}

export default new DataStorage();
