const extend = require('./utils/extend');

let Br = function Br(dbType = 'mysql') {
  if (!(this instanceof Br)) {
    return new Br(arguments);
  }
  this.dbType = dbType;

  if (!this.dbs[dbType]) {
    throw new Error(`No database methods defined for ${dbType}`);
  }

  return this;
};

Br.prototype.dbs = {
  mysql: require('./lib/mysql'),
  rethink: require('./lib/rethink'),
};

Br.prototype.backup = function backup(options = {}) {
  let fns = this.dbs[this.dbType];

  if (!fns.backup) {
    throw new Error(`No backup method defined for ${this.dbType}`);
  }

  return fns.backup(options);
};

Br.prototype.restore = function restore(options = {}) {
  let fns = this.dbs[this.dbType];

  if (!fns.restore) {
    throw new Error(`No restore method defined for ${this.dbType}`);
  }

  return fns.restore(options);
};

module.exports = Br;
