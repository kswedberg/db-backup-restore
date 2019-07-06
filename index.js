const extend = require('./utils/extend');

let BackupRestore = function BackupRestore(dbType = 'mysql') {
  if (!(this instanceof BackupRestore)) {
    return new BackupRestore(dbType);
  }
  this.dbType = dbType;

  if (!this.dbs[dbType]) {
    throw new Error(`No database methods defined for ${dbType}`);
  }

  return this;
};

BackupRestore.prototype.dbs = {
  mysql: require('./lib/mysql.js'),
  rethink: require('./lib/rethink.js'),
  mongo: require('./lib/mongo.js')
};

BackupRestore.prototype.backup = function backup(options = {}) {
  let fns = this.dbs[this.dbType];

  if (!fns.backup) {
    throw new Error(`No backup method defined for ${this.dbType}`);
  }

  return fns.backup(options);
};

BackupRestore.prototype.restore = function restore(options = {}) {
  let fns = this.dbs[this.dbType];

  if (!fns.restore) {
    throw new Error(`No restore method defined for ${this.dbType}`);
  }

  return fns.restore(options);
};

module.exports = BackupRestore;
