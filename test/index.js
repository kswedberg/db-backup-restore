const Promises = require('bluebird');
const allDbs = ['mysql', 'rethink', 'mongo'];
const allTests = ['backup', 'restore'];

const argv = require('yargs')
.option('db', {
  alias: 'd',
  describe: 'choose a database server',
  choices: allDbs,
})
.options('test', {
  alias: 't',
  describe: 'choose a test',
})
.argv;

// Limit databases to the ones provided by the db argument, if provided
const dbs = argv.db ? allDbs.filter((db) => db === argv.db) : allDbs;

const dbtests = dbs.reduce((obj, name) => {
  return Object.assign(obj, {[name]: require(`./${name}.js`)});
}, {});

Promises.each(Object.keys(dbtests), (dbName) => {
  const testsForDbs = dbtests[dbName];
  let testNames = Object.keys(testsForDbs);


  if (argv.test) {
    testNames = testNames.filter((test) => test === argv.test);
  }

  console.log('Running tests for', dbName);

  return Promises.each(testNames, (testName) => {
    const test = testsForDbs[testName];

    if (typeof test !== 'function') {
      console.log('Test is not a function for', testName);
    }

    console.log(`Testing ${testName}…`);

    return test();
  });
});
