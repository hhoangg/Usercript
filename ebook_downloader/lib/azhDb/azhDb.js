import { azhTable } from './azhTable';

export class azhDb {
  constructor(dbName) {
    this.dbName = dbName ? `azhDb-${dbName}` : 'azhDb';
  }
  models = {};
  dbName = '';
  async init(tables = []) {
    const findDb = await localforage.getItem(this.dbName);
    if (!findDb) {
      await localforage.setItem(this.dbName, {
        tables,
      });
      this._initTable(tables);
    } else {
      this._initTable(findDb.tables);
    }
    return this;
  }
  _initTable(tables) {
    tables.forEach((table) => {
      this.models[table.name] = new azhTable({
        db: this,
        name: table.name,
        columns: table.columns,
      });
    });
  }
  getDbName() {
    return this.dbName;
  }
  getModel(name) {
    return this.models[name];
  }
  getModels() {
    return this.models;
  }
}
