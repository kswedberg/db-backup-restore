const os = require('os');
const homeDir = os.homedir();

module.exports.resolveHome = (dir) => {
  return (dir || '').replace(/^~(.*)$/, `${homeDir}$1`);
};
