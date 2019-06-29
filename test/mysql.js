const chalk = require('chalk');
const DBBackupRestore = require('../index.js');
const mysql = new DBBackupRestore('mysql');

const defaults = {
  password: 'root',
  gzip: true,
  env: 'test',
  args: [
    '-S /Applications/MAMP/tmp/mysql/mysql.sock'
  ]
};

module.exports = {
  backup: () => {
    const options = Object.assign({}, defaults, {db: 'spt_local'});

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
      db: 'spt_test',
      dir: process.cwd(),
      file: 'spt_local_2019-06-29.sql.gz'
    });

    return mysql.restore(options);
  }
};
