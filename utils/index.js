const pad = (item) => {
  return item < 10 ? `0${item}` : `${item}`;
};

module.exports = {
  handleData: (resolve, reject) => {
    return (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }

      if (stdout) {
        console.log(`${stdout}`);
      }

      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }

      return resolve();
    };
  },

  validate: (required, settings) => {
    required.forEach((key) => {
      const missingRequiredValue = `Required setting ${key} was not provided`;

      // Bail on 'db' validation if --all-databases arg is defined
      if (key === 'db' && settings.args.includes('--all-databases')) {
        return;
      }

      if (typeof settings[key] === 'undefined') {
        throw new Error(missingRequiredValue);
      }
    });
  },

  ymd: (glue = '-') => {
    const date = new Date();

    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    ]
    .map(pad)
    .join(glue);
  },

  hms: (glue = '-') => {
    const date = new Date();

    return [
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    ]
    .map(pad)
    .join(glue);
  }
};
