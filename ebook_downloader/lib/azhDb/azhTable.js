export class azhTable {
  constructor(
    args = {
      db: null,
      name: '',
      columns: [],
    }
  ) {
    if (!args.db) throw new Error('db not found in table');
    if (!args.name) throw new Error('Table missing name');
    if (!args.columns || !args.columns.length) throw new Error('Table column not defined.');
    this.db = args.db;
    this.name = args.name;
    args.columns.forEach((column) => {
      this.columns = {
        ...this.columns,
        [column.title]: {
          defaultValue: column.defaultValue,
        },
      };
    });
    this.tableIndex = `${this.db.getDbName()}__${this.name}`;
  }
  db = null;
  name = '';
  columns = {};
  dataValue = null;
  tableIndex = '';

  async _getAllKeyByName(name) {
    const keys = await localforage.keys();
    return keys.filter((key) => _.startsWith(key, name));
  }

  async getAllKeysTable() {
    return this._getAllKeyByName(`${this.tableIndex}[`);
  }

  async createOrUpdate(args) {
    if (!args.id) args.id = uniqid();
    const dataStorage = {};
    Object.keys(args).forEach((key) => {
      if (this.columns[key]) {
        dataStorage[key] = args[key];
      }
    });
    // set default value
    Object.keys(this.columns).forEach((key) => {
      if (dataStorage[key] === undefined && this.columns[key].defaultValue !== undefined) {
        dataStorage[key] = this.columns[key].defaultValue;
      }
    });
    const isExist = await localforage.getItem(`${this.tableIndex}[${args.id}]`);
    if (isExist) {
      return this.update(
        {
          where: {
            id: args.id,
          },
        },
        dataStorage,
        isExist
      );
    }
    await localforage.setItem(`${this.tableIndex}[${args.id}]`, dataStorage);
    return dataStorage;
  }

  async update(args, value, data) {
    let currenData = data;
    if (!data || !data.id) {
      const findData = await this.findOne({
        where: args.where,
      });
      currenData = {
        ...findData,
        ...currenData,
      };
    }
    if (!currenData) return currenData;
    await localforage.setItem(`${this.tableIndex}[${currenData.id}]`, {
      ...currenData,
      ...value,
    });
    return localforage.getItem(`${this.tableIndex}[${currenData.id}]`);
  }

  async bulkCreateOrUpdate(args) {
    return Promise.all(args.map(this.createOrUpdate));
  }

  async findOne(
    args = {
      where: {},
    }
  ) {
    this.dataValue = null;
    const allKeyOnThisTable = await this.getAllKeysTable();
    if (!allKeyOnThisTable.length) return this.dataValue;
    switch (true) {
      case !args || !args.where || !Object.keys(args.where).length:
        if (allKeyOnThisTable[0]) {
          this.dataValue = await localforage.getItem(allKeyOnThisTable[0]);
        }
        break;
      case !!args.where && !!Object.keys(args.where).length:
        if (typeof args.where.id !== undefined && args.where.id !== null) {
          this.dataValue = await localforage.getItem(`${this.tableIndex}[${args.where.id}]`);
        } else {
          const allData = await Promise.all(allKeyOnThisTable.map(localforage.getItem));
          this.dataValue = allData.find((item) => this._compareObject(item, args.where));
        }
        break;
      default:
        break;
    }
    return this.dataValue;
  }

  _compareObject(obj1, obj2) {
    const keysObj2 = Object.keys(obj2);
    for (const key2 of keysObj2) {
      if (obj2[key2] != obj1[key2]) return false;
    }
    return true;
  }

  async findAll(
    args = {
      where: {},
    }
  ) {
    this.dataValue = [];
    const allKeyOnThisTable = await this.getAllKeysTable();
    if (!allKeyOnThisTable.length) return this.dataValue;
    switch (true) {
      case !args || !args.where || !Object.keys(args.where).length:
        this.dataValue = await Promise.all(allKeyOnThisTable.map((key) => localforage.getItem(key)));
        break;
      case !!args.where && !!Object.keys(args.where).length:
        if (typeof args.where.id !== undefined && args.where.id !== null) {
          if (_.isArray(args.where.id)) {
            this.dataValue = await Promise.all(
              args.where.id.map((id) => localforage.getItem(`${this.tableIndex}[${id}]`))
            );
          } else {
            this.dataValue = [await localforage.getItem(`${this.tableIndex}[${args.where.id}]`)];
          }
        } else {
          const allData = await Promise.all(allKeyOnThisTable.map(localforage.getItem));
          this.dataValue = allData.filter((item) => this._compareObject(item, args.where));
        }
        break;
      default:
        break;
    }
    return this.dataValue;
  }
}
