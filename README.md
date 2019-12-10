# DB Backup and Restore

Database backup (dump) and restore (import) for MySQL and RethinkDB

**Important**: This is a work in progress. Not ready for prime time. The API is still a mess. Use at your own risk.

## Install

With `npm`:

```bash
# Append --save or --save-dev to the following line to add to package.json dependencies or devDependencies
npm install db-backup-restore
```

With `yarn`:

```bash
# Automatically adds to package.json dependencies. Append --dev to add to devDependencies instead
yarn add db-backup-restore
```

## Usage

```js
// Require the module
const DB = require('db-backup-restore');

// Instantiate it with the type of database (either 'mysql' or 'rethink')
const mysqlDb = new DB('mysql');

// Back up the MySQL database
mysqlDb.backup({
  db: 'db_to_backup',
  user: 'myname',
  password: 'mypassword',
  dir: '/path/to/my/backups',
})
```

## MySQl API

### Constructor

```js
const DB = require('db-backup-restore');
const mysqlDb = new DB('mysql');

```

### `.backup(settings)`

Available settings, with their defaults:

```js
{
  host: 'localhost',
  user: 'root',
  dropTable: true,
  comments: true,
  gzip: false,
  dir: process.cwd(),
  db: undefined, // String
  password: undefined, // String
  args: undefined, // Array of additional arguments
  // file: [settings.db]_[YYYYMMDD]_[hhmmss].sql[.gz]
}
```

Notes:

* The complete file path will be determined by joining `settings.dir` and `settings.file`

### `.restore(settings)`


## RethinkDB API

### Constructor

```js
const DB = require('db-backup-restore');
const mysqlDb = new DB('rethink');
```

### `.backup(settings)`

Available settings, with their defaults:

```js
{
  host: 'localhost',
  user: 'root',
  dropTable: true,
  comments: true,
  file: undefined
  db: undefined, // String
  password: undefined, // String
  args: undefined, // Array of additional arguments
  // file: [settings.db]_[YYYYMMDD]_[hhmmss].sql[.gz]
}
```

### `.restore(settings)`
