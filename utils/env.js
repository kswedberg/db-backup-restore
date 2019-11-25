
const envSettings = {
  user: 'DB_USER',
  password: 'DB_PASSWORD',

  // file: '',
  // gzip: false,
  // archive: false,
  // args: [],
};
const dbEnvSettings = {
  mongo: {
    authSource: 'DB_AUTHSOURCE',
  },
  mysql: {
    socketPath: 'DB_SOCKET',
  },
};

module.exports.getEnvSettings = (dbServer, showFalse) => {
  const envs = Object.assign(envSettings, dbEnvSettings[dbServer] || {});

  return Object.keys(envs)
  .reduce((settings, curr) => {
    const envKey = envs[curr];
    const value = process.env[envKey] || false;

    if (value || showFalse) {
      settings[curr] = value;
    }


    return settings;
  }, {});

};
