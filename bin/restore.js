#!/usr/bin/env node

require('../utils/notifier');
const path = require('path');
const Promises = require('bluebird');
const inquirer = require('inquirer');
const DBBackupRestore = require('../index.js');
const {getEnvSettings} = require('../utils/env.js');
const {dbServers} = require('../utils/index.js');
const {getBackupDirs} = require('../utils/dirs.js');
const argv = require('yargs')
.scriptName('db-restore')
.usage('\n$0 [dbServer]')
.option('host', {
  alias: 'h',
})
.help()

.argv;

const questions = [];
const requiredArgs = [
  {
    name: 'db',
    message: 'Enter the database',
  },
  {
    name: 'dir',
    message: 'Enter the directory holding the dumped db files',
    default: process.cwd(),
  },
];

const restore = async() => {
  let dbServer = argv._[0];

  if (!dbServer) {
    const dbPrompt = await inquirer.prompt([
      {
        name: 'dbServer',
        message: 'Which db server?',
        type: 'list',
        choices: dbServers,
      },
    ]);

    dbServer = dbPrompt.dbServer;
  }

  const envSettings = getEnvSettings(dbServer, true);
  const backRest = new DBBackupRestore(dbServer);
  const settings = {};
  const {_, $0, ...args} = argv;

  Object.assign(envSettings, args);

  Object.keys(envSettings).forEach((key) => {
    if (envSettings[key] === false) {
      questions.push({
        name: key,
        message: `Enter the ${key}`,
      });
    } else if (args.verbose) {
      questions.push({
        name: key,
        message: `Enter the ${key}`,
        default: envSettings[key],
      });
    } else {
      settings[key] = envSettings[key];
    }
  });
  if (args && args.length) {
    settings.args = args;
  }

  const cwd = process.cwd();

  questions.push({
    name: 'dir',
    message: `Enter directory with backup(s)—
    either absolute or relative to ${cwd}`,
  });


  const answers = await inquirer.prompt(questions);

  if (!/^\s*\//.test(answers.dir)) {
    answers.dir = path.resolve(cwd, answers.dir);
  }
  Object.assign(settings, answers);

  const backupDirs = await getBackupDirs(dbServer, settings);

  if (backupDirs.error) {
    return console.error(backupDirs.error);
  }

  let moreSettings = [backupDirs];

  if (dbServer === 'mongo' && backupDirs.prompts) {
    const dbsPrompt = await inquirer.prompt(backupDirs.prompts);

    moreSettings = dbsPrompt.dbs
    .map((item) => {
      const parts = item.replace(/\/$/, '').split('/');
      const db = parts.pop();


      return {
        nsInclude: `${db}.*`,
        filePath: parts.join('/'),
      };
    });
  }

  await Promises.each(moreSettings, (setting) => {
    const opts = Object.assign({}, settings, setting);

    return backRest.restore(opts);
  });

};

restore();
