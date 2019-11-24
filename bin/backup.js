#!/usr/bin/env node

require('../utils/notifier');
const inquirer = require('inquirer');
const {getEnvSettings} = require('../utils/env.js');
const args = process.argv.slice(2);

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

  const envSettings = getEnvSettings(dbServer);
  const {backup} = require(`../lib/${dbServer}`);

  console.log(args);
  console.log(envSettings);

};

backup();
