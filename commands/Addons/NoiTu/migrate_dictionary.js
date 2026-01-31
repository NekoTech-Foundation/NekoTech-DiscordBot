const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DICTIONARY_FILE = path.join(__dirname, 'Viet74K.txt');
const DB_FILE = path.join(__dirname, 'dictionary.db');

async function migrate() {
    console.log('🚀 Starting dictionary migration...');

    // 1. Read the text file
    if (!fs.existsSync(DICTIONARY_FILE)) {
        console.error(`❌ Dictionary file not found at: ${DICTIONARY_FILE}`);
        process.exit(1);
    }

    console.log('📖 Reading dictionary file...');
    const content = fs.readFileSync(DICTIONARY_FILE, 'utf8');
    const words = content.split(/\r?\n/);
    console.log(`✅ Loaded ${words.length} raw lines.`);

    // 2. Filter words (2 words only)
    console.log('🔍 Filtering words (strictly 2 words)...');
    const filteredWords = words.filter(word => {
        if (!word) return false;
        const parts = word.trim().split(/\s+/);
        return parts.length === 2; // Only allow exactly 2 words
    }).map(w => w.toLowerCase().trim()); // Normalize here

    console.log(`✅ Filtered down to ${filteredWords.length} valid 2-word phrases.`);

    // 3. Initialize SQLite Database
    if (fs.existsSync(DB_FILE)) {
        console.log('🗑️ Removing existing database...');
        fs.unlinkSync(DB_FILE);
    }

    const db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');

    // 4. Create Table
    db.prepare('CREATE TABLE IF NOT EXISTS words (fragment TEXT PRIMARY KEY)').run();

    // 5. Bulk Insert
    console.log('💾 Inserting words into database...');
    const insert = db.prepare('INSERT OR IGNORE INTO words (fragment) VALUES (?)');

    const insertMany = db.transaction((wordsToInsert) => {
        let count = 0;
        for (const word of wordsToInsert) {
            insert.run(word);
            count++;
        }
        return count;
    });

    try {
        const count = insertMany(filteredWords);
        console.log(`🎉 Successfully migrated ${count} words to ${DB_FILE}`);
    } catch (error) {
        console.error('❌ Error during insertion:', error);
    } finally {
        db.close();
    }
}

migrate();
