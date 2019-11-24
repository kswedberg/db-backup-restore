
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
};

module.exports.getEnvSettings = (dbServer) => {
  const envs = Object.assign(envSettings, dbEnvSettings[dbServer] || {});

  return Object.keys(envs)
  .reduce((settings, curr) => {
    const envKey = envs[curr];
    const value = process.env[envKey] || false;

    settings[curr] = value;

    return settings;
  }, {});

};
