#!/usr/bin/env node

require('../utils/notifier');

const Promises = require('bluebird');
const inquirer = require('inquirer');
const DBBackupRestore = require('../index.js');
const {getEnvSettings} = require('../utils/env.js');
const args = process.argv.slice(2);

const questions = [];
const backup = async() => {
  const {dbServer} = await inquirer.prompt([
    {
      name: 'dbServer',
      message: 'which db server?',
      type: 'list',
      choices: [
        'mongo',
        'mysql',
        'rethink',
      ],
    },
  ]);

  const envSettings = getEnvSettings(dbServer, true);
  const backRest = new DBBackupRestore(dbServer);
  const settings = {};

  Object.keys(envSettings).forEach((key) => {
    if (envSettings[key] === false) {
      questions.push({
        name: key,
        message: `Enter the ${key}`,
      });
    } else if (args.includes('-V') || args.includes('--verbose')) {
      questions.push({
        name: key,
        message: `Enter the ${key}`,
        default: envSettings[key],
      });
    } else {
      settings[key] = envSettings[key];
    }
  });
  questions.push({
    name: 'dir',
    message: 'Enter the directory where you want the backup to go',
    default: process.cwd(),
  });

  if (args) {
    settings.args = args;
  }

  const answers = await inquirer.prompt(questions);

  Object.assign(settings, answers);

  const allDbs = await backRest.listDatabases(settings);

  const {dbs} = await inquirer.prompt([
    {
      name: 'dbs',
      message: 'Choose the databases you want to back up',
      type: 'checkbox',
      choices: allDbs,
    },
  ]);

  await Promises.each(dbs, (db) => {
    const opts = Object.assign({}, settings, {db});

    return backRest.backup(opts);
  });

};

backup();
