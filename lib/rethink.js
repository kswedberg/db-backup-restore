const path = require('path');
const fs = require('fs-extra');
const Promises = require('bluebird');
const {spawn} = require('child_process');
const utils = require('../utils/index.index.js');

let defaults = {
  host: 'localhost',
  port: '28015',
  tempDir: '/tmp',
  tables: [],
  dir: process.cwd(),
  // file
};

let clean = (settings) => {
  return fs.remove(settings.tempDirDated)
  .then(() => {
    console.log(`Housekeeping: Removed ${settings.tempDirDated}`);

    return settings;
  });
};

let mergeSettings = (settings) => {
  let opts = Object.assign({}, defaults, settings);
  let file = opts.file || `${settings.db}_${utils.ymd('')}_${utils.hms('')}`;

  opts.tempDirDated = path.join(opts.tempDir, `${+new Date()}`);
  opts.filePath = path.join(opts.dir, file);
  opts.pwdFile = path.join(opts.tempDirDated, `${opts.db}-pwd.txt`);

  return opts;
};

let setDumpArgs = (settings) => {
  let args = [
    'dump',
    '-c', `${settings.host}:${settings.port}`,
  ];
  let lastArgs = [
    '-f', settings.filePath,
    '--temp-dir', settings.tempDirDated,
    '--password-file', settings.pwdFile
  ];

  if (settings.args) {
    args.push(...settings.args);
  }

  if (settings.tables.length) {
    settings.tables.forEach((table) => {
      args.push('-e', `${settings.db}.${table}`);
    });
  } else {
    args.push('e', settings.db);
  }

  args.push(...lastArgs);

  return args;
};


let setImportArgs = (settings, files) => {
  let filtered = [...files];

  if (settings.tables.length) {
    filtered = files.filter((item) => settings.tables.includes(path.basename(item, '.json')));
  }

  return Promises.map(filtered, (file) => {
    let infoFile = file.replace(/\.json$/, '.info');
    let db = settings.localDb;
    let table = path.basename(file, '.json');

    let args = [
      'import',
      '-c', `${settings.host}:${settings.port}`,
      '-f', file,
      '--password-file', settings.localPwdFile,
      '--table', `${db}.${table}`,
      '--format', 'json',
    ];

    return fs.readJson(infoFile)
    .then((json) => {
      if (json.primary_key) {
        args.push('--pkey', json.primary_key);
      }
    })
    .catch(() => {})
    .then(() => {
      args.push('--force');

      return {args, table, db};
    });
  })
  .then((all) => {
    return all;
  });
};

let dump = (settings) => {
  let args = setDumpArgs(settings);
  let rdb = spawn('rethinkdb', args);
  let line = '';

  return new Promise(function(resolve, reject) {
    rdb.stdout.on('data', (data) => {
      if (line.slice(0, 1) === '[') {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
      }
      line = data.toString();
      process.stdout.write(line);
    });

    rdb.stderr.on('data', (data) => {
      console.log('stderr', data.toString());
    });

    rdb.on('close', (errCode) => {
      if (errCode) {
        const err = new Error(`dump function: ${errCode}`);

        return reject(err);
      }

      return resolve();
    });
  });
};

let tasks = {

  // BACKUP
  backup: (options = {}) => {
    let settings = mergeSettings(options);

    return Promise.all([
      fs.ensureDir(settings.tempDirDated),
      fs.ensureDir(settings.dir)
    ])
    .then(() => {
      return fs.writeFile(settings.pwdFile, settings.password);
    })
    .then(() => {
      return dump(settings);
    })
    .then(() => {
      return clean(settings);
    });
  },

  // RESTORE
  restore: (options = {}) => {
    let settings = mergeSettings(options);

    return fs.ensureDir(settings.dir);
  }
};

tasks.dump = tasks.backup;
tasks.import = tasks.restore;

module.exports = tasks;
