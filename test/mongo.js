const DBBackupRestore = require('../index.js');
const mongo = new DBBackupRestore('mongo');
const dotenv = require('dotenv');

dotenv.config();

const defaults = {
  env: 'test',
  db: process.env.MONGO_TEST_DB,
  user: process.env.MONGO_USER,
  password: process.env.MONGO_PWD,
  authSource: process.env.MONGO_AUTHSOURCE,
  gzip: true,
  archive: true,
};

defaults.file = `backup/${defaults.db}-test`;

module.exports = {
  backup: () => {
    const settings = Object.assign(defaults);

    return mongo.backup(settings);
  },
  restore: () => {
    const settings = Object.assign({}, defaults, {db: `${defaults.db}-test`});

    return mongo.restore(settings);
  },
};
