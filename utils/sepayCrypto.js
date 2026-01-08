const crypto = require('node:crypto');
const fs = require('fs');
const yaml = require('js-yaml');
const config = global.config || yaml.load(fs.readFileSync(__dirname + '/../config.yml', 'utf8'));

// Use BotToken to derive a consistent 32-byte key
// This ensures that if the bot token changes, previous keys are invalid (security trade-off)
// or we can fallback to a fixed secret if configured.
// For now, we'll hash the BotToken to get 32 bytes.
const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(String(config.BotToken)).digest();

function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error.message);
        return null; // Return null if decryption fails (e.g. key changed)
    }
}

module.exports = { encrypt, decrypt };
