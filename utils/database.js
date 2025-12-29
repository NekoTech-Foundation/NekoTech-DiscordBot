const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath/*, { verbose: console.log }*/);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

module.exports = db;
