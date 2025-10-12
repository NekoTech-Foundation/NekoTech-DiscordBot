const colors = require('ansi-colors');
const fs = require('fs');

class Logger {
    static log(message) {
   //     console.log(`${colors.green('[INFO]')} ${message}`);
        this.writeToLogFile('INFO', message);
    }

    static debug(message) {
        this.writeToLogFile('DEBUG', message);
    }

    static warn(message) {
    //    console.log(`${colors.yellow('[WARN]')} ${message}`);
        this.writeToLogFile('WARN', message);
    }

    static error(message, error = null) {
    //    console.error(`${colors.red('[ERROR]')} ${message}`);
        if (error) {
            console.error(error);
        }
        
        this.writeToLogFile('ERROR', message, error);
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
        
        fs.appendFile('logs.txt', logMessage, (err) => {
            if (err) {
                console.error(`Failed to write to log file: ${err.message}`);
            }
        });
    }
}

module.exports = { Logger }; 