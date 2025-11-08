// Test script to validate cmd_uma_careers.js syntax
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cmd_uma_careers.js');

try {
  // Try to require the file
  require(filePath);
  console.log('✅ Syntax check passed! No errors found.');
} catch (error) {
  console.error('❌ Syntax error found:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
