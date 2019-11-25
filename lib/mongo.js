/* eslint-disable array-element-newline */
const path = require('path');
const spawn = require('child_process').spawn;
const Promises = require('bluebird');
const fs = require('fs-extra');
const chalk = require('chalk');
const {MongoClient} = require('mongodb');
const glob = require('globby');

const {log, ymd, validate} = require('../utils/index.js');

const isTest = () => {
  return process.env.NODE_ENV === 'test';
};

const setOpts = (options, remote) => {

  let opts = Object.assign({
    dir: process.cwd(),
    host: '127.0.0.1',
    port: 27017,
    // db: '',
    // user: '',
    // password: '',
    // authSource: '',
    // file: '',
    // gzip: false,
    // archive: false,
    // args: [],

  }, options);

  const file = opts.file || `${opts.db}-${ymd()}`;

  opts.filePath = path.join(opts.dir, file);

  return opts;
};


const copyDumpedFile = (settings) => {
  return fs.copy(settings.archive, settings.filePath)
  .then(() => {
    return settings;
  });
};

const clean = (settings) => {
  return fs.remove(settings.tempDir)
  .then(() => {
    log(`Housekeeping: Removed ${settings.tempDir}`);

    return settings;
  });
};

const buildUri = (settings) => {
  if (settings.uri) {
    return settings.uri;
  }
  const {authSource, user, password, host, port, db = ''} = settings;
  const params = authSource ? {authSource} : {};

  Object.assign(params, settings.uriParams || {});

  const query = Object.keys(params).map((key) => `${key}=${params[key]}`);
  const qs = query.length ? `?${query.join('&')}` : '';
  const userSection = user && password ? `${user}:${password}@` : '';
  const hostParts = host.split(':');

  if (hostParts.length === 1) {
    hostParts.push(port);
  }
  // Make sure host ends with slash
  const hostSection = hostParts.join(':').replace(/\/?$/, '/');

  return `mongodb://${userSection}${hostSection}${db}${qs}`;
};

const buildArgs = (settings) => {
  const args = [
    `--uri=${buildUri(settings)}`,
  ];

  if (settings.args && settings.args.length) {
    args.push(...settings.args);
  }

  if (!args.some((arg) => ['-o', '--out', '--archive'].includes(arg))) {
    const flag = settings.archive === true ? '--archive' : '--out';

    args.push(`${flag}=${settings.filePath}`);
  }

  const booleans = ['gzip', 'quiet', 'verbose']
  .filter((bool) => settings[bool])
  .map((item) => `--${item}`);

  return [...booleans, ...args];
};

const dump = (settings) => {
  // mongodump -d timers -o ./gitignore -u USER -p PASSWORD --host=127.0.0.1:27017 --authenticationDatabase=admin
  // --uri "mongodb://[username:password@]host1[:port1],...[,hostN[:portN]]][/[database][?options]]"

  const args = buildArgs(settings);


  if (isTest()) {
    console.log(chalk.cyan('spawning mongodump:'));
    console.log(args);
  }

  const mdb = spawn('mongodump', args);
  let line = '';

  return new Promise((resolve, reject) => {
    mdb.stdout.on('data', (data) => {
      // if (line.slice(0, 1) === '[') {
      //   process.stdout.clearLine();
      //   process.stdout.cursorTo(0);
      // }
      line = `${data}`;
      process.stdout.write(line);
    });

    mdb.stderr.on('data', (data) => {
      process.stdout.write(`${data}`);
    });

    mdb.on('close', (code) => {
      if (code) {
        reject(new Error(`dump function: ${code}`));
      } else {
        resolve();
      }
    });
  });
};

module.exports.listDatabases = async(settings) => {
  const opts = setOpts(settings);
  const uri = buildUri(opts);

  if (uri) {
    console.log(uri);
  }
  const conn = await MongoClient.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true});
  let dbs = {databases: []};

  try {
    const db = await conn.db();

    dbs = await db.executeDbAdminCommand({listDatabases: 1});
  } catch (err) {
    console.log(err);
  }

  conn.close();

  return dbs.databases.map(({name}) => name);
};

// BACKUP: backs up db from local mongodb server to a path on the local filesystem
module.exports.backup = (options = {}) => {
  let settings = setOpts(options);

  console.log('options:');
  console.log(options);
  console.log('settings:');
  console.log(settings);

  return dump(settings)
  .catch(console.error);
};


const setRestoreArgs = (settings) => {
  //
};

// RESTORE: restores a db to the local mongodb server from a file on the local filesystem
// mongorestore --db DB_NAME BACKUPFILE --username USERNAME --password PASSWORD --authenticationDatabase admin [--host localhost:27017]
const restore = module.exports.restore = (options = {}) => {
  let settings = setOpts(options);
  const args = setRestoreArgs(settings);

  const mdb = spawn('mongodump', args);
  let line = '';

  return new Promise((resolve, reject) => {
    mdb.stdout.on('data', (data) => {
      if (line.slice(0, 1) === '[') {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
      }
      line = `${data}`;
      process.stdout.write(line);
    });

    mdb.stderr.on('data', (data) => {
      console.error('stderr', `${data}`);
    });

    mdb.on('close', (code) => {
      if (code) {
        reject(new Error(`dump function: ${code}`));
      } else {
        resolve();
      }
    });
  })
  .catch((err) => {
    console.error('Process failed.');
    console.error(err);
  });
};

// SYNC: syncs from one db to another on the same server
module.exports.sync = (fromOptions = {}, toOptions = {}) => {
  const fromSettings = setOpts(fromOptions);
  const toSettings = Object.assign({}, fromSettings, setOpts(toOptions));

  return dump(fromSettings)
  .then(() => {
    return restore(toSettings);
  });
};
