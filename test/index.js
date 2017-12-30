const DBBackupRestore = require('../index.js');


DBBackupRestore.prototype.dbs.test = {
  backup: function() {
    console.log('backup test');
  },
  restore: function() {
    console.log('restore test');
  }
};

let mysql = new DBBackupRestore('mysql');

mysql.backup({
  db: 'spt_local',
  // password: 'root',
  gzip: true
})
.then(() => {
  console.log('done');
})
.catch((err) => {
  console.log(err);
});
