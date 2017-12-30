const fs = require('fs-extra');
const path = require('path');
const Promises = require('bluebird');
const chalk = require('chalk');
const {exec} = require('child_process');
const utils = require('../utils/index.js');


const defaults = {
  host: 'localhost',
  user: 'root',
  dropTable: true,
  comments: true,
  gzip: false,
  dir: process.cwd(),
  // db
  // password
  // file
};

const setFilePath = (options) => {
  const filename = options.file || `${options.db}_${utils.ymd()}.sql`;

  return path.join(options.dir, filename);
};

const buildDumpCmd = (options, filePath) => {
  const boolArgs = {
    dropTable: '--add-drop-table',
    comments: '-c',
  };

  const args = [
    '-h', options.host,
    '-u', options.user,
    `--password=${options.password}`,
    options.db,
    '>',
    filePath
  ];

  Object.keys(boolArgs).forEach((key) => {
    if (options[key]) {
      args.unshift(boolArgs[key]);
    }
  });

  if (options.args && Array.isArray(options.args)) {
    args.unshift(...options.args);
  }

  args.unshift('mysqldump');

  return args.join(' ');
};

const dump = (cmd) => {
  return new Promise(function(resolve, reject) {
    console.log(chalk.yellow('Running mysqldump'));
    exec(cmd, utils.handleData(resolve, reject));
  });
};

const gzip = (file) => {
  const gzed = `${file}.gz`;

  return fs.pathExists(gzed)
  .then((exists) => {
    if (exists) {
      console.log(chalk.cyan(`Removing file that already exists at ${gzed}`));

      return fs.remove(gzed);
    }
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`Gzipping to ${gzed}`));
      exec(`gzip ${file}`, utils.handleData(resolve, reject));
    });
  });
};

module.exports = {
  backup: function(options = {}) {
    const settings = Object.assign({
      dropTable: true,
    }, defaults, options);

    utils.validate(['db', 'password'], settings);

    const filePath = setFilePath(settings);
    const cmd = buildDumpCmd(settings, filePath);

    let dumped = dump(cmd);

    if (settings.gzip) {
      dumped = dumped
      .then(() => {
        return gzip(filePath);
      });
    }

    return dumped;
  },

  restore: function(options = {}) {
    const settings = Object.assign({}, defaults, options);
    const filePath = setFilePath(settings);

    const restoreCmd = `mysql -u ${settings.user} -p=${settings.password} ${settings.db} < ${filePath}`;

    return new Promise(function(resolve, reject) {
      exec(restoreCmd, utils.handleData(resolve, reject));
    });
  },

};
