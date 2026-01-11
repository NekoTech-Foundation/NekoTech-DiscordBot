const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const WhitelabelModel = require('../models/Whitelabel');

const ROOT_DIR = path.resolve(__dirname, '..');
const INSTANCES_DIR = path.join(ROOT_DIR, 'whitelabel_instances');
const TEMPLATE_HELP = path.join(ROOT_DIR, 'templates', 'whitelabel', 'help.js');

// Ensure instances directory exists
fs.ensureDirSync(INSTANCES_DIR);

const getPM2Command = () => {
    const localPath = path.join(ROOT_DIR, 'node_modules', '.bin', 'pm2');
    if (fs.existsSync(localPath)) {
        return `"${localPath}"`;
    }
    return 'pm2';
};

const WhitelabelManager = {
    /**
     * Create a new Whitelabel Instance
     * @param {string} userId 
     * @param {string} botToken 
     * @param {string} clientId 
     * @param {string} botName 
     */
    async createInstance(userId, botToken, clientId, botName = "My Whitelabel Bot", days = 30, minutes = 0) {
        console.log(`[Whitelabel] createInstance START: ${userId} (${days} days, ${minutes} mins)`);
        const instancePath = path.join(INSTANCES_DIR, userId);
        const PM2_CMD = getPM2Command();

        try {
            // ... (rest of function) ...

            // Calculate Expiry
            let expiryTime = Date.now();
            if (minutes > 0) {
                expiryTime += minutes * 60 * 1000;
            } else {
                expiryTime += days * 24 * 60 * 60 * 1000;
            }

            // 1. Copy Files (Iterate top-level to avoid recursion error)
            console.log(`[Whitelabel] Creating instance for ${userId} at ${instancePath}`);

            const files = await fs.readdir(ROOT_DIR);
            const ignored = ['node_modules', 'whitelabel_instances', '.git', 'logs.txt', 'database.sqlite', '.env'];

            for (const file of files) {
                if (ignored.includes(file)) continue;

                const srcPath = path.join(ROOT_DIR, file);
                const destPath = path.join(instancePath, file);

                // Copy everything else
                await fs.copy(srcPath, destPath);
            }

            // 2. Install Dependencies (Fresh install to avoid symlink issues)
            console.log(`[Whitelabel] Installing dependencies in ${instancePath}...`);
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('NPM Install Timed Out (>60s)'));
                }, 60000); // 60s limit for npm install

                exec('npm install --production', { cwd: instancePath }, (err, stdout, stderr) => {
                    clearTimeout(timeout);
                    if (err) {
                        console.error(`[Whitelabel] NPM Install Failed: ${stderr}`);
                        reject(err);
                    } else {
                        console.log(`[Whitelabel] NPM Output: ${stdout}`);
                        resolve();
                    }
                });
            });

            // 3. Modify Config
            const configPath = path.join(instancePath, 'config.yml');
            if (fs.existsSync(configPath)) {
                let config = yaml.load(fs.readFileSync(configPath, 'utf8'));

                // Overwrite critical values
                config.BotToken = botToken;
                config.BotName = botName;
                config.OwnerIDs = [userId]; // Set the customer as owner
                config.GiveawayLogs.Enabled = false; // Disable logs by default to avoid errors
                config.IsWhitelabel = true; // Mark as whitelabel instance

                // Save Config
                fs.writeFileSync(configPath, yaml.dump(config));
            }

            // 4. Disable SePay Webhook in index.js to prevent Port Conflict (EADDRINUSE)
            // Whitelabel instances don't use the main bot's SePay server
            const indexPath = path.join(instancePath, 'index.js');
            if (fs.existsSync(indexPath)) {
                let indexContent = fs.readFileSync(indexPath, 'utf8');
                // Comment out the startWebhookServer call
                indexContent = indexContent.replace(
                    /startWebhookServer\(client, 3000\);/g,
                    '// startWebhookServer(client, 3000); // Disabled for Whitelabel'
                );
                fs.writeFileSync(indexPath, indexContent);
            }

            // 5. Overwrite Help Command (Recode)
            const targetHelp = path.join(instancePath, 'commands', 'General', 'help.js');
            if (fs.existsSync(TEMPLATE_HELP)) {
                fs.ensureDirSync(path.dirname(targetHelp));
                fs.copySync(TEMPLATE_HELP, targetHelp);
            }

            // 6. Inject Instance Manager Command
            const TEMPLATE_MANAGER = path.join(ROOT_DIR, 'templates', 'whitelabel', 'manager.js');
            const targetManager = path.join(instancePath, 'commands', 'Owner', 'manager.js');
            if (fs.existsSync(TEMPLATE_MANAGER)) {
                fs.copySync(TEMPLATE_MANAGER, targetManager);
            }

            // 7. Remove Restricted Commands from Instance
            const forbidden = [
                path.join(instancePath, 'commands', 'Owner', 'whitelabel.js'),
            ];

            forbidden.forEach(file => {
                if (fs.existsSync(file)) fs.removeSync(file);
            });

            // 8. Start Process with PM2
            const pm2Name = `WL_${userId}`;
            const command = `${PM2_CMD} start index.js --name "${pm2Name}" --cwd "${instancePath}"`;

            console.log(`[Whitelabel] Starting PM2 process: ${command}`);
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    // Don't reject, just resolve and log warning. PM2 might have started but CLI hung.
                    console.log('[Whitelabel] PM2 Start Timed Out (Process might be running)');
                    resolve();
                }, 15000); // 15s timeout for PM2

                exec(command, (error, stdout, stderr) => {
                    clearTimeout(timeout);
                    if (error) {
                        console.error(`[Whitelabel] PM2 Error: ${error.message}`);
                        // Don't fail the whole creation, the process might need manual intervention
                    }
                    console.log(`[Whitelabel] PM2 Output: ${stdout}`);
                    resolve();
                });
            });

            // 9. Update Database
            await WhitelabelModel.setSubscription(userId, {
                status: 'ACTIVE',
                botToken,
                clientId,
                instancePath,
                startDate: new Date().toISOString(),
                // Default expiry 30 days if not set elsewhere
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });

            return { success: true, path: instancePath, pm2Name };

        } catch (error) {
            console.error('[Whitelabel] Creation Failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Stop a whitelabel instance
     */
    stopInstance(userId) {
        return new Promise((resolve) => {
            console.log(`[Whitelabel] Executing stop command for WL_${userId}...`);
            const cmd = `${getPM2Command()} stop WL_${userId}`;

            // Force resolve after 10 seconds to prevent hanging
            const timeout = setTimeout(() => {
                console.log(`[Whitelabel] Stop command TIMED OUT for WL_${userId} (PM2 likely unresponsive or process missing)`);
                resolve(false);
            }, 10000);

            exec(cmd, (err, stdout, stderr) => {
                clearTimeout(timeout);
                if (err) {
                    console.log(`[Whitelabel] Stop failed (Process might not exist): ${err.message}`);
                    resolve(false);
                } else {
                    console.log(`[Whitelabel] Stop success.`);
                    WhitelabelModel.setSubscription(userId, { status: 'STOPPED' });
                    resolve(true);
                }
            });
        });
    },

    /**
     * Start a stopped instance
     */
    startInstance(userId) {
        return new Promise((resolve) => {
            exec(`${getPM2Command()} start WL_${userId}`, (err) => {
                if (err) resolve(false);
                else {
                    WhitelabelModel.setSubscription(userId, { status: 'ACTIVE' });
                    resolve(true);
                }
            });
        });
    },

    /**
     * Delete an instance (Files + Process)
     */
    async deleteInstance(userId) {
        const instancePath = path.join(INSTANCES_DIR, userId);

        // Stop & Delete PM2
        await new Promise(r => exec(`${getPM2Command()} delete WL_${userId}`, () => r()));

        // Remove Files
        await fs.remove(instancePath);

        // Update DB
        await WhitelabelModel.deleteOne({ userId });

        return true;
    },

    /**
     * Update Config Value
     */
    updateConfig(userId, key, value) {
        const instancePath = path.join(INSTANCES_DIR, userId);
        const configPath = path.join(instancePath, 'config.yml');

        if (!fs.existsSync(configPath)) return false;

        try {
            let config = yaml.load(fs.readFileSync(configPath, 'utf8'));

            // Nested key support (e.g. "ActivitySettings.Text")
            const keys = key.split('.');
            let current = config;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;

            fs.writeFileSync(configPath, yaml.dump(config));

            // Restart to apply
            this.restartInstance(userId);

            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    restartInstance(userId) {
        exec(`${getPM2Command()} restart WL_${userId}`);
    },

    /**
     * Update an instance with latest code from Root
     * Preserves: config.yml, database.sqlite, logs.txt
     */
    async updateInstance(userId) {
        const instancePath = path.join(INSTANCES_DIR, userId);
        if (!fs.existsSync(instancePath)) return { success: false, error: 'Instance not found' };

        try {
            console.log(`[Whitelabel] Updating instance ${userId}...`);

            // 1. Stop Instance
            await this.stopInstance(userId);

            // 2. Backup Config & DB just in case
            await fs.copy(path.join(instancePath, 'config.yml'), path.join(instancePath, 'config.yml.bak'));
            if (fs.existsSync(path.join(instancePath, 'database.sqlite'))) {
                await fs.copy(path.join(instancePath, 'database.sqlite'), path.join(instancePath, 'database.sqlite.bak'));
            }

            // 3. Inject IsWhitelabel flag if missing
            console.log(`[Whitelabel] Checking config flag...`);
            const configPath = path.join(instancePath, 'config.yml');
            if (fs.existsSync(configPath)) {
                let config = yaml.load(fs.readFileSync(configPath, 'utf8'));
                if (!config.IsWhitelabel) {
                    console.log(`[Whitelabel] Injecting IsWhitelabel: true`);
                    config.IsWhitelabel = true;
                    fs.writeFileSync(configPath, yaml.dump(config));
                }
            }

            // 3. Copy Files (Overwrite code, SKIP config/db/logs)
            const files = await fs.readdir(ROOT_DIR);
            const ignored = ['node_modules', 'whitelabel_instances', '.git', 'logs.txt', 'database.sqlite', '.env', 'config.yml'];
            // ^ Added config.yml to ignored list for UPDATE only

            for (const file of files) {
                if (ignored.includes(file)) continue;

                const srcPath = path.join(ROOT_DIR, file);
                const destPath = path.join(instancePath, file);

                await fs.copy(srcPath, destPath);
            }

            // 4. Re-Apply Patches (Help, Manager, Webhook disable)

            // Disable SePay
            const indexPath = path.join(instancePath, 'index.js');
            if (fs.existsSync(indexPath)) {
                let indexContent = fs.readFileSync(indexPath, 'utf8');
                indexContent = indexContent.replace(
                    /startWebhookServer\(client, 3000\);/g,
                    '// startWebhookServer(client, 3000); // Disabled for Whitelabel'
                );
                fs.writeFileSync(indexPath, indexContent);
            }

            // Overwrite Help
            const targetHelp = path.join(instancePath, 'commands', 'General', 'help.js');
            if (fs.existsSync(TEMPLATE_HELP)) {
                fs.ensureDirSync(path.dirname(targetHelp));
                fs.copySync(TEMPLATE_HELP, targetHelp);
            }

            // Inject Manager
            const TEMPLATE_MANAGER = path.join(ROOT_DIR, 'templates', 'whitelabel', 'manager.js');
            const targetManager = path.join(instancePath, 'commands', 'Owner', 'manager.js');
            if (fs.existsSync(TEMPLATE_MANAGER)) {
                fs.copySync(TEMPLATE_MANAGER, targetManager);
            }

            // Remove Restricted
            const forbidden = [
                path.join(instancePath, 'commands', 'Owner', 'whitelabel.js'),
            ];
            forbidden.forEach(file => { if (fs.existsSync(file)) fs.removeSync(file); });

            // 5. Start Instance
            await this.startInstance(userId);

            return { success: true };

        } catch (e) {
            console.error(`[Whitelabel] Update failed for ${userId}:`, e);
            return { success: false, error: e.message };
        }
    },

    async updateAllInstances() {
        const instances = await WhitelabelModel.getAllInstances();
        const results = { success: 0, failed: 0, errors: [] };

        for (const data of instances) {
            // const data = JSON.parse(row.data);
            if (data.status === 'EXPIRED') continue; // Skip expired

            const res = await this.updateInstance(data.userId);
            if (res.success) results.success++;
            else {
                results.failed++;
                results.errors.push(`${data.userId}: ${res.error}`);
            }
        }
        return results;
    }
};

module.exports = WhitelabelManager;
