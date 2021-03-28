/* eslint-disable array-element-newline */
const path = require('path');
const spawn = require('child_process').spawn;
const {runCmd} = require('../utils/run-cmd.js');
// const Promises = require('bluebird');
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

  opts.filePath = opts.filePath || path.join(opts.dir, opts.file || '');

  return opts;
};

const clean = (settings) => {
  return fs.remove(settings.tempDir)
  .then(() => {
    log(`Housekeeping: Removed ${settings.tempDir}`);

    return settings;
  });
};

const getHost = (host, port = '') => {
  const hostParts = host.split(':');

  if (hostParts.length === 1) {
    hostParts.push(port);
  }

  return hostParts.join(':');
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

  // Make sure host ends with slash
  const hostSection = getHost(host, port).replace(/\/?$/, '/');

  return `mongodb://${userSection}${hostSection}${db}${qs}`;
};

const buildArgs = (settings) => {
  const args = [
    `--uri="${buildUri(settings)}"`,
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
    // @ts-ignore
    console.log(chalk.cyan('spawning mongodump:'));
    console.log(args);
  }

  return runCmd('mongodump', args)
  .catch((err) => {
    console.error('mongodump process failed.');
    console.error(err);
  });
};

module.exports.listDatabases = async(settings = {}) => {
  settings.file = settings.file || `${settings.db}-${ymd()}`;

  const opts = setOpts(settings);
  const uri = buildUri(opts);

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
module.exports.backup = (settings = {}) => {
  settings.file = settings.file || `${settings.db}-${ymd()}`;
  const options = setOpts(settings);

  return dump(options)
  .catch(console.error);
};


const setRestoreArgs = (opts) => {
  const settings = setOpts(opts);
  const {host, port, dir, file, filePath, user, authSource, ...options} = settings;

  const normalizing = {
    username: user,
    authenticationDatabase: authSource,
  };

  Object.entries(normalizing).forEach(([key, val]) => {
    if (!options[key] && val) {
      options[key] = val;
    }
  });

  const args = Object.keys(options).reduce((arr, curr) => {
    if (options[curr] === true) {
      arr.push(`--${curr}`);
    } else {
      arr.push(`--${curr}=${options[curr]}`);
    }

    return arr;
  }, []);

  const hostPort = getHost(host, port);
  const fileDir = filePath.replace(/\/?$/, '/');

  args.push(`--host=${hostPort}`, fileDir);

  return args;
};

// RESTORE: restores a db to the local mongodb server from a file on the local filesystem
// mongorestore --nsInclude DB_NAME.COLLECTION_NAME --username USERNAME --password PASSWORD --authenticationDatabase admin [--host localhost:27017] BACKUPFILE
const restore = module.exports.restore = (options = {}) => {
  const args = setRestoreArgs(options);

  // if (options) {
  //   return console.log(args);
  // }

  return runCmd('mongorestore', args)
  .catch((err) => {
    console.error('mongorestore failed.');
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
