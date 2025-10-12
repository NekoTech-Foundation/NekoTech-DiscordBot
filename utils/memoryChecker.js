//const os = require('os');

class MemoryChecker {
    constructor(serverName = 'Unknown', interval = 1000) {
        this.serverName = serverName;
        this.interval = interval;
        this.intervalId = null;
        this._lastUsage = 0;
    }

    getMemoryUsage() {
        try {
            const used = process.memoryUsage();
            this._lastUsage = Math.round(used.heapUsed / 1048576 * 100) / 100;
            return this._lastUsage;
        } catch (error) {
            console.error(`[${this.serverName}] Error getting memory usage:`, error);
            return 0;
        }
    }

    logMemoryUsage() {
        try {
            const usage = this.getMemoryUsage();
         //   console.log(`${this.serverName}: ${usage} MiB`);
        } catch (error) {
            console.error(`[${this.serverName}] Error logging memory:`, error);
        }
    }

    start() {
        if (this.intervalId) {
            this.stop();
        }

        try {
            this.logMemoryUsage();
            this.intervalId = setInterval(() => {
                this.logMemoryUsage();
            }, this.interval);

            if (this.intervalId.unref) {
                this.intervalId.unref();
            }

            process.once('exit', () => this.stop());
            process.once('SIGINT', () => this.stop());
        } catch (error) {
            console.error(`[${this.serverName}] Error starting memory checker:`, error);
        }
    }

    stop() {
        try {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this._lastUsage = 0;
        } catch (error) {
            console.error(`[${this.serverName}] Error stopping memory checker:`, error);
        }
    }
}

module.exports = { MemoryChecker };