const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'Viet74K.txt');

console.log('🔧 Fixing dictionary file...');

let content = fs.readFileSync(FILE, 'utf8');
const originalLength = content.length;

// Remove the corrupted "con mèo" lines (likely at the end)
// We'll just split by newlines, filter out empty or corrupted ones, and append fresh
let lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

// Remove ANY line that looks like 'con mo' or exactly 'con mèo' to start fresh
lines = lines.filter(l => !l.includes('con mo') && l.trim() !== 'con mèo');

// Append correct one
lines.push('con mèo');

console.log(`📝 Re-writing file (Lines: ${lines.length})...`);
fs.writeFileSync(FILE, lines.join('\n'), 'utf8');

console.log('✅ Dictionary fixed.');
