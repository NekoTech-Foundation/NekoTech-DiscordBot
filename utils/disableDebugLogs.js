const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

function shouldFilterLog(message) {
    if (typeof message !== 'string') return false;
    
    const ytKeywords = [
        '[YOUTUBEJS]',
        'Unable to find matching run',
        'command_run',
        'parsed_runs',
        'Invalid argument passed',
        'No video formats found',
        'ERR_YTDL_NO_SUITABLE_FORMAT_FOUND',
        'ERR_YTDL_ERROR'
    ];
    
    return ytKeywords.some(keyword => message.includes(keyword));
}

function disableYouTubeDebugLogs() {
    console.log = function() {
        const args = Array.from(arguments);
        if (args.length > 0 && shouldFilterLog(args[0])) {
            return;
        }
        originalConsoleLog.apply(console, args);
    };

    console.error = function() {
        const args = Array.from(arguments);
        if (args.length > 0 && shouldFilterLog(args[0])) {
            return;
        }
        originalConsoleError.apply(console, args);
    };

    console.warn = function() {
        const args = Array.from(arguments);
        if (args.length > 0 && shouldFilterLog(args[0])) {
            return;
        }
        originalConsoleWarn.apply(console, args);
    };

    console.debug = function() {
        const args = Array.from(arguments);
        if (args.length > 0 && shouldFilterLog(args[0])) {
            return;
        }
        originalConsoleDebug.apply(console, args);
    };
}

function restoreConsoleLogs() {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
}

function disableYoutubeiLogs() {
    try {
        const { Log } = require('youtubei.js');
        Log.setLevel(Log.Level.NONE);
    } catch (error) {
        console.error("Failed to disable youtubei.js logs:", error);
    }
}

module.exports = {
    disableYouTubeDebugLogs,
    restoreConsoleLogs,
    disableYoutubeiLogs
}; 