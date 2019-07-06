const path = require('path');
const spawn = require('child_process').spawn;
const Promises = require('bluebird');
const fs = require('fs-extra');
const r = require('rethinkdb');
const chalk = require('chalk');
const glob = require('globby');
const {log, ymd, validate} = require('../utils/index.js');

const setOpts = (options, remote) => {
  let tunnelConfig =  {
    port: 22,
    dstHost: '127.0.0.1',
    dstPort: 28015,
    localHost: '127.0.0.1',
    localPort: 9999,
    keepAlive: true,
  };
  let opts = Object.assign({
    tempDir: '/tmp',
    includeTables: [],
    excludeTables: [],
    dir: process.cwd(),
    host: 'localhost'
    // db: '',
    // password: '',
    // file: ''
  }, options);

  const file = opts.file || `${opts.db}-${ymd()}.tar.gz`;

  if (remote) {
    opts.tunnel = Object.assign(tunnelConfig, opts.tunnel || {});
    opts['tunnel.username'] = opts.tunnel.username;
    opts['tunnel.host'] = opts.tunnel.host;
  } else {
    opts.port = opts.port || 28015;
  }

  opts.tempDir = path.join(opts.tempDir, `${+new Date()}`);
  opts.archive = opts.archive || path.join(opts.tempDir, 'rethink_dump.tar.gz');
  opts.passwordFile = path.join(opts.tempDir, `${opts.db}-pwd.txt`);
  opts.filePath = path.join(opts.dir, file);

  return opts;
};


const setImportArgs = (settings, files) => {
  let filtered = [...files];

  if (settings.includeTables.length) {
    filtered = files.filter((item) => settings.includeTables.includes(path.basename(item, '.json')));
  } else if (settings.excludeTables.length) {
    filtered = files.filter((item) => !settings.excludeTables.includes(path.basename(item, '.json')));
  }

  return Promises.map(filtered, (file) => {
    let infoFile = file.replace(/\.json$/, '.info');
    let db = settings.db;
    let table = path.basename(file, '.json');

    let args = [
      'import',
      '-c', `${settings.host}:${settings.port || settings.tunnel.dstPort}`,
      '-f', file,
      '--password-file', settings.passwordFile,
      '--table', `${db}.${table}`,
      '--format', 'json',
    ];

    return fs.readJson(infoFile)
    .then((json) => {
      if (json.primary_key) {
        args.push('--pkey', json.primary_key);
      }
    })
    .catch(() => {
      // keep going.
    })
    .then(() => {
      args.push('--force');

      return {args, table, db};
    });
  })
  .then((all) => {
    return all;
  });
};

const connectDb = (settings) => {
  return r.connect({
    host: settings.host,
    db: settings.db,
    password: settings.password
  });
};

let dump = (tnl, settings) => {
  let args = [
    'dump',
    '-c', `${settings.host}:${settings.port || settings.tunnel.localPort}`,
    '-e', settings.db,
    '-f', settings.archive,
    '--password-file', settings.passwordFile
  ];
  const rdb = spawn('rethinkdb', args);
  let line = '';

  return new Promise((resolve, reject) => {
    rdb.stdout.on('data', (data) => {
      if (line.slice(0, 1) === '[') {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
      }
      line = `${data}`;
      process.stdout.write(line);
    });

    rdb.stderr.on('data', (data) => {
      console.error('stderr', `${data}`);
    });

    rdb.on('close', (code) => {
      if (typeof tnl !== 'undefined') {
        tnl.close();
      }

      if (code) {
        reject(new Error(`dump function: ${code}`));
      } else {
        resolve();
      }
    });
  });
};

let copyDumpedFile = (settings) => {
  return fs.copy(settings.archive, settings.filePath)
  .then(() => {
    return settings;
  });
};

const dropOrMergeTable = (connected, table) => {
  log(chalk.cyan(`\nPreparing to remove ${table} table`));

  return connected
  .then((conn) => {
    return r.tableDrop(table)
    .run(conn)
    .then((cursor) => {
      return log(chalk.cyan(`\nRemoved ${table} table`));
    });
  })
  .catch(() => {
    log(chalk.yellow(`\nCould not remove table ${table} because it does not exist`));
  });

};

const createDb = (settings) => {
  const connected = connectDb(settings);

  return connected
  .then((connection) => {
    return r.dbList()
    .run(connection)
    .then((dbs) => {
      return {
        connection,
        hasDb: dbs.includes(settings.db),
      };
    });
  })
  .then(({connection, hasDb}) => {
    if (hasDb) {
      return connection;
    }

    log('Creating', settings.db);

    return r
    .dbCreate(settings.db)
    .run(connection)
    .then(() => {
      connection.use(settings.db);

      return connection;
    });
  })
  .then((connection) => {
    connection.close();
  });
};

const restoreDb = (settings) => {
  const decompress = require('decompress');
  const decompressTargz = require('decompress-targz');

  const connected = connectDb(settings);

  return fs.ensureDir(settings.tempDir)
  .then(() => {
    return fs.copy(settings.filePath, settings.archive);
  })
  .then(() => {
    return decompress(settings.archive, settings.tempDir, {
      plugins: [decompressTargz()]
    });
  })
  .then(() => {
    log(chalk.yellow(`Decompressed ${path.basename(settings.archive)}`));
  })
  .then(() => {
    return glob([
      path.join(settings.tempDir, '**/*.json')
    ]);
  })
  .then((files) => {
    return Promises.try(() => {
      return setImportArgs(settings, files);
    })
    .each(({args, table, db}) => {
      return dropOrMergeTable(connected, table)
      .then(() => {
        const rdb = spawn('rethinkdb', args);

        return new Promise((resolve, reject) => {
          rdb.stdout.on('data', (data) => {
            process.stdout.write(`${data}`);
          });

          rdb.stderr.on('data', (data) => {
            console.error('stderr:', `${data}`);
          });

          rdb.on('close', (code) => {
            if (code) {
              const err = new Error(`restore function: ${code}`);

              reject(err);
            } else {
              log(chalk.yellow(`Imported ${table} into ${db}`));
              resolve();
            }
          });
        });
      });
    });
  })
  .then(() => {
    return connected
    .then((conn) => {
      conn.close();
      log('Closing db connection:', chalk.green('Updates complete'));

      return settings;
    })
    .catch((err) => {
      console.error('Uh oh!');
      console.error(err);

      return connected.then((conn) => conn.close());
    });
  });
};

let clean = (settings) => {
  return fs.remove(settings.tempDir)
  .then(() => {
    log(`Housekeeping: Removed ${settings.tempDir}`);

    return settings;
  });
};

module.exports.backupRemote = (options) => {
  const settings = setOpts(options, 'remote');
  const tunnel = require('tunnel-ssh');

  return new Promise((resolve, reject) => {

    tunnel(settings.tunnel, (err, tnl) => {
      if (err) {
        console.error('Tunnel Error');
        tnl.close();

        return reject(err);
      }

      return fs.outputFile(settings.passwordFile, settings.password)
      .then(() => {
        return dump(tnl, settings);
      })
      .then(() => {
        return copyDumpedFile(settings);
      })
      .then(() => {
        return clean(settings);
      })
      .then(resolve);
    });
  })
  .catch(console.error);
};

// BACKUP: backs up db from local rethinkdb server to a path on the local filesystem
module.exports.backup = (options = {}) => {
  let settings = setOpts(options);

  return fs.outputFile(settings.passwordFile, settings.password)
  .then(() => {
    return dump(undefined, settings);
  })
  .then(() => {
    return copyDumpedFile(settings);
  })
  .then(() => {
    return clean(settings);
  })
  .catch(console.error);
};

// RESTORE: restores a db to the local rethinkdb server from a file on the local filesystem
const restore = module.exports.restore = (options = {}) => {
  let settings = setOpts(options);

  return fs.outputFile(settings.passwordFile, settings.password)
  .then((value) => {
    return createDb(settings);
  })
  .then(() => {
    return restoreDb(settings);
  })
  .then(() => {
    return clean(settings);
  })
  .catch((err) => {
    log('Process failed.');
    console.error(err);

    return clean(settings);
  });
};

// SYNC: syncs from one db to another on the same server
module.exports.sync = (fromOptions = {}, toOptions = {}) => {
  const fromSettings = setOpts(fromOptions);
  const toSettings = Object.assign({}, fromSettings, setOpts(toOptions));

  return fs.outputFile(fromSettings.passwordFile, fromSettings.password)
  .then(() => {
    return dump(undefined, fromSettings);
  })
  .then(() => {
    return restore(toSettings);
  });
};
