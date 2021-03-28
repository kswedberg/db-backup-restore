/* eslint-disable array-element-newline */
const fs = require('fs-extra');
const path = require('path');
const mysql = require('mysql');
const mysqlUtilities = require('mysql-utilities');
const Promises = require('bluebird');
const chalk = require('chalk');
const {exec} = require('child_process');
const utils = require('../utils/index.js');

const rGz = /\.gz$/;

const defaults = {
  host: 'localhost',
  user: 'root',
  dropTable: true,
  comments: true,
  dir: process.cwd(),
  gzip: false,
  // db
  // password
  // file: `${options.db}_${utils.ymd()}.sql`
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
    filePath,
  ];

  if (options.socketPath) {
    args.unshift('-S', options.socketPath);
  }
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

const buildRestoreCmd = (options, filePath) => {
  const args = [
    '-u', options.user,
    `--password=${options.password}`,
    options.db,
    '<',
    filePath,
  ];

  if (options.socketPath) {
    args.unshift('-S', options.socketPath);
  }
  if (options.args && Array.isArray(options.args)) {
    args.unshift(...options.args);
  }

  args.unshift('mysql');

  return args.join(' ');
};

const execCommand = (cmd) => {
  return new Promise((resolve, reject) => {
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
    console.log(chalk.yellow(`Gzipping to ${gzed}`));

    return execCommand(`gzip ${file}`);
  });
};

const ungzip = (from, to) => {
  return fs.pathExists(to)
  .then((exists) => {
    if (exists) {
      console.log(chalk.cyan(`Removing file that already exists at ${to}`));

      return fs.remove(to);
    }
  })
  .then(() => {
    console.log(chalk.yellow(`Uncompressing gzip file to ${to}`));

    return execCommand(`gzip -c -d ${from} > ${to}`);
  });
};

module.exports = {
  listDatabases: function(options = {}) {
    const settings = Object.assign({
      host: defaults.host,
      user: defaults.user,
    }, options);
    const connection = mysql.createConnection(settings);

    mysqlUtilities.upgrade(connection);
    mysqlUtilities.introspection(connection);

    return new Promise((resolve, reject) => {
      connection.databases((err, databases) => {
        if (err) {
          reject(err);
        } else {
          resolve(databases);
        }

        connection.end();
      });
    });


  },

  backup: function(options = {}) {
    const settings = Object.assign({
      dropTable: true,
      args: [],
    }, defaults, options);

    utils.validate(['db', 'password'], settings);

    const filePath = setFilePath(settings);
    const cmd = buildDumpCmd(settings, filePath);

    // console.log(options.env);
    if (/test|cli/.test(options.env)) {
      console.log(chalk.yellow(`Backing up ${settings.db}`));
      console.log(chalk.yellow(`to ${filePath}.`));
      console.log(chalk.cyan('This could take a while…'));
    }
    let dumped = execCommand(cmd);

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
    const gzFilePath = setFilePath(settings);
    const filePath = gzFilePath.replace(rGz, '');

    const restoreCmd = buildRestoreCmd(settings, filePath);

    const logStuff = () => {
      if (settings.env === 'test') {
        console.log('Command:');
        console.log(chalk.cyan(restoreCmd));
      }
      if (/test|cli/.test(settings.env)) {
        console.log('');
        console.log(chalk.yellow(`Restoring ${filePath}`));
        console.log(chalk.yellow(`to ${settings.db}.`));
        console.log(chalk.cyan('This could take a while…'));
      }
    };

    const firstTask = options.gzip || rGz.test(gzFilePath) ? ungzip(gzFilePath, filePath) : Promise.resolve();

    return firstTask
    .then(logStuff)
    .then(() => {
      return execCommand(restoreCmd);
    });
  },

};
