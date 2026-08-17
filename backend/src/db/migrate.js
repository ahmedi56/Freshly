const fs = require('fs');
const path = require('path');
const db = require('./index');

function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('[migrate] schema applied');
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
