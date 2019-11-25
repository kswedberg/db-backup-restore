const DBBackupRestore = require('../index.js');
const rethink = new DBBackupRestore('rethink');

const defaults = {
  env: 'test',
  db: process.env.RETHINK_TEST_DB,
  password: process.env.RETHINK_PWD,
};

defaults.file = `${defaults.db}-test.tar.gz`;

module.exports = {
  backup: () => {
    return rethink.backup(defaults);
  },
  restore: () => {
    const settings = Object.assign({}, defaults, {db: `${defaults.db}-test`});

    return rethink.restore(settings);
  },
};
