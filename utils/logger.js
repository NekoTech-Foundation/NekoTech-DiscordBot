const colors = require('ansi-colors');
const fs = require('fs');
const path = require('path');

class Logger {
    static logs = [];
    static maxLogs = 100;

    static init() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            this.addLog('INFO', args.join(' '));
            originalLog.apply(console, args);
        };

        console.warn = (...args) => {
            this.addLog('WARN', args.join(' '));
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            this.addLog('ERROR', args.join(' '));
            originalError.apply(console, args);
        };
    }

    static addLog(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push({ timestamp, level, message });
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Also write to file (using original logic adapted)
        this.writeToLogFile(level, message);
    }

    static getLogs() {
        return this.logs;
    }

    static log(message) {
        console.log(message); // Redirects to intercepted console.log
    }

    static debug(message) {
        console.log(`[DEBUG] ${message}`);
    }

    static warn(message) {
        console.warn(message);
    }

    static error(message, error = null) {
        const msg = error ? `${message}\n${error.stack || error}` : message;
        console.error(msg);
    }

    static writeToLogFile(level, message, error = null) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;

        if (error) {
            if (error instanceof Error) {
                logMessage += `\n${error.stack || error.message}`;
            } else {
                logMessage += `\n${error}`;
            }
        }

        logMessage += '\n';

        const MAX_LOG_SIZE = 1 * 1024 * 1024; // 1MB
        const LOG_DIR = 'logs';
        const LOG_FILE = path.join(LOG_DIR, 'logs.txt');

        try {
            // Ensure log directory exists
            if (!fs.existsSync(LOG_DIR)) {
                fs.mkdirSync(LOG_DIR, { recursive: true });
            }

            // Check file size
            if (fs.existsSync(LOG_FILE)) {
                const stats = fs.statSync(LOG_FILE);
                if (stats.size > MAX_LOG_SIZE) {
                    // Delete immediately (No backup)
                    try {
                        fs.unlinkSync(LOG_FILE);
                        // console.log("Cleared logs"); 
                    } catch (err) {
                        // Ignore errors
                    }
                }
            }
        } catch (e) {
            // Ignore stats errors
        }

        fs.appendFile(LOG_FILE, logMessage, (err) => {
            if (err) {
                // failures to write to log file should not be infinitely logged
            }
        });
    }
}

// Auto-init on require
Logger.init();

module.exports = { Logger }; 