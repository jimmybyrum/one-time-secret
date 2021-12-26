import { DataStoreCore } from "../types";

export default class DataStoreCoreImpl implements DataStoreCore {
  getUtcDate(date: Date = new Date()) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    );
  }
}
