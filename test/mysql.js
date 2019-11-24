const chalk = require('chalk');
const dotenv = require('dotenv');
const DBBackupRestore = require('../index.js');
const mysql = new DBBackupRestore('mysql');

dotenv.config();

const defaults = {
  password: process.env.MYSQL_PWD,
  gzip: true,
  env: 'test',
  args: [
    '-S /Applications/MAMP/tmp/mysql/mysql.sock',
  ],
  db: process.env.MYSQL_TEST_DB,
};

module.exports = {
  backup: () => {
    const options = Object.assign({}, defaults, {
      file: `${defaults.db}_tmp.sql`,
    });

    return mysql.backup(options)
    .then(() => {
      console.log(chalk.green('done'));
    })
    .catch((err) => {
      console.log(err);
    });
  },
  restore: () => {
    const options = Object.assign({}, defaults, {
      db: `${defaults.db}_tmp`,
      file: `${defaults.db}_tmp.sql.gz`,
      dir: process.cwd(),
    });

    return mysql.restore(options);
  },
};
