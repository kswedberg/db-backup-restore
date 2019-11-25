const DBBackupRestore = require('../index.js');
const mongo = new DBBackupRestore('mongo');

const defaults = {
  env: 'test',
  db: process.env.MONGO_TEST_DB,
  user: process.env.MONGO_USER,
  password: process.env.MONGO_PWD,
  authSource: process.env.MONGO_AUTHSOURCE,
  gzip: true,
};

defaults.file = `backup/${defaults.db}-test`;

module.exports = {
  listDbs: async() => {
    const settings = Object.assign(defaults);
    const dbs = await mongo.listDatabases(settings);

    console.log(dbs);
  },
  backup: () => {
    const settings = Object.assign(defaults);

    return mongo.backup(settings);
  },
  restore: () => {
    const settings = Object.assign({}, defaults, {db: `${defaults.db}-test`});

    return mongo.restore(settings);
  },
};
