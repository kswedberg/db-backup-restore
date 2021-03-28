const path = require('path');
const os = require('os');
const homeDir = os.homedir();
const globby = require('globby');

module.exports.resolveHome = (dir) => {
  return (dir || '').replace(/^~(.*)$/, `${homeDir}$1`);
};

const dbDirs = {
  mongo: async(settings) => {
    const setDirs = new Set();
    const container = settings.dir.replace(/\/$/, '');
    const bsons = await globby([`${container}/**/*.bson`]);

    bsons.forEach((item) => {
      setDirs.add(path.dirname(item));
    });

    const dirs = [...setDirs];

    if (!dirs.length) {
      return {error: `No databases found in the specified directory:\n\t${settings.dir}`};
    }

    const dbs = dirs.map((dir) => {
      const name = path.basename(dir);

      return {
        name,
        value: dir,
        short: name,
      };
    });

    return {
      dirs,
      prompts: [
        {
          name: 'dbs',
          type: 'checkbox',
          message: 'Which databases do you want to restore?',
          choices: dbs,
          default: dirs,
        },
      ],
    };
  },

};


module.exports.getBackupDirs = (dbServer, settings) => {
  return dbDirs[dbServer](settings);
};
