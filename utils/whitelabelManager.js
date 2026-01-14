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
            // Exclude database, system folders, and specific files
            const ignored = ['node_modules', 'whitelabel_instances', 'logs.txt', 'database.sqlite', 'database.sqlite-wal', 'database.sqlite-shm', '.env'];

            const filterFunc = (src, dest) => {
                const basename = path.basename(src);
                // Skip ignored top-level files/folders
                if (src === ROOT_DIR) return true; // Always copy root

                // Check against ignored list (only if it's a direct child of ROOT_DIR, but simplest to check basename)
                if (ignored.includes(basename)) return false;

                // Skip ALL hidden files/folders (starting with .) EXCEPT if we really need them (e.g. .gitignore? maybe not needed for instance)
                if (basename.startsWith('.')) return false;

                // Check for Sockets or broken links
                try {
                    const stats = fs.lstatSync(src);
                    if (stats.isSocket() || stats.isBlockDevice() || stats.isCharacterDevice() || stats.isFIFO()) return false;
                } catch (e) {
                    return false; // Skip if cant stat
                }

                return true;
            };

            for (const file of files) {
                // Initial check for top-level before recursive filter
                if (ignored.includes(file) || file.startsWith('.')) continue;

                const srcPath = path.join(ROOT_DIR, file);
                const destPath = path.join(instancePath, file);

                // Use the filter for recursive copying
                await fs.copy(srcPath, destPath, { filter: filterFunc, dereference: true });
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

                // Assign a random port for SePay Webhook to avoid conflicts
                // Port range: 3001 - 4000
                const randomPort = Math.floor(Math.random() * (4000 - 3001 + 1)) + 3001;
                if (!config.SePay) config.SePay = {};
                config.SePay.Port = randomPort;
                console.log(`[Whitelabel] Assigned Port ${randomPort} to instance ${userId}`);

                // Save Config
                fs.writeFileSync(configPath, yaml.dump(config));
            }

            // 4. (Removed) Index patching is no longer needed as index.js supports dynamic ports.

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

            // 3. Sync Files using rsync (Robust & Fast)
            // Using spawn to avoid buffer overflows and provide real-time logs
            console.log(`[Whitelabel] Syncing files via rsync...`);

            await new Promise((resolve, reject) => {
                const { spawn } = require('child_process');
                // Construct arguments array for spawn
                const args = [
                    '-av',
                    '--no-perms',
                    '--exclude', 'node_modules',
                    '--exclude', 'whitelabel_instances',
                    '--exclude', '.git',
                    '--exclude', 'logs',
                    '--exclude', 'logs.txt',
                    '--exclude', 'database.sqlite*',
                    '--exclude', '.env',
                    '--exclude', 'config.yml',
                    '--exclude', 'commands/Owner/whitelabel.js',
                    '--exclude', 'utils/whitelabelManager.js',
                    '--exclude', 'templates/whitelabel/',
                    `${ROOT_DIR}/`,
                    `${instancePath}/`
                ];

                const rsyncHelper = spawn('rsync', args);

                rsyncHelper.stdout.on('data', (data) => {
                    // Log output infrequently to avoid spam, or filtered
                    // const line = data.toString().trim();
                    // if (line && !line.startsWith('skipping')) console.log(`[Rsync] ${line}`);
                });

                rsyncHelper.stderr.on('data', (data) => {
                    console.error(`[Rsync Error] ${data.toString().trim()}`);
                });

                rsyncHelper.on('close', (code) => {
                    if (code === 0) {
                        console.log('[Whitelabel] Rsync completed successfully.');
                        resolve();
                    } else {
                        console.error(`[Whitelabel] Rsync exited with code ${code}`);
                        reject(new Error(`Rsync exited with code ${code}`));
                    }
                });

                rsyncHelper.on('error', (err) => {
                    console.error('[Whitelabel] Rsync failed to start:', err);
                    reject(err);
                });
            });

            console.log(`[Whitelabel] Re-applying patches...`);

            // 4. Re-Apply Patches (Help, Manager)

            // Overwrite Help
            console.log(`[Whitelabel] Overwriting Help command...`);
            const targetHelp = path.join(instancePath, 'commands', 'General', 'help.js');
            if (fs.existsSync(TEMPLATE_HELP)) {
                fs.ensureDirSync(path.dirname(targetHelp));
                fs.copySync(TEMPLATE_HELP, targetHelp);
            }

            // Inject Manager
            console.log(`[Whitelabel] Injecting Manager command...`);
            const TEMPLATE_MANAGER = path.join(ROOT_DIR, 'templates', 'whitelabel', 'manager.js');
            const targetManager = path.join(instancePath, 'commands', 'Owner', 'manager.js');
            if (fs.existsSync(TEMPLATE_MANAGER)) {
                fs.copySync(TEMPLATE_MANAGER, targetManager);
            }

            // Remove Restricted
            console.log(`[Whitelabel] Removing restricted files...`);
            const forbidden = [
                path.join(instancePath, 'commands', 'Owner', 'whitelabel.js'),
            ];
            forbidden.forEach(file => { if (fs.existsSync(file)) fs.removeSync(file); });

            // 5. Install Dependencies (In case of package.json updates)
            console.log(`[Whitelabel] Installing dependencies...`);
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('NPM Install Timed Out (>60s)'));
                }, 60000);

                exec('npm install --production', { cwd: instancePath }, (err, stdout, stderr) => {
                    clearTimeout(timeout);
                    if (err) {
                        console.error(`[Whitelabel] NPM Install Failed: ${stderr}`);
                        // We continue even if npm install fails, as it might just be a warning
                        // But strictly speaking we should maybe warn. For now, log and resolve.
                        resolve();
                    } else {
                        // console.log(`[Whitelabel] NPM Output: ${stdout}`);
                        resolve();
                    }
                });
            });

            // 6. Start Instance
            console.log(`[Whitelabel] Starting instance ${userId}...`);
            const startResult = await this.startInstance(userId);
            if (startResult) {
                console.log(`[Whitelabel] Instance started successfully.`);
            } else {
                console.error(`[Whitelabel] Instance FAILED to start.`);
                throw new Error("Failed to start instance via PM2");
            }

            return { success: true };

        } catch (e) {
            console.error(`[Whitelabel] Update failed for ${userId}:`, e);
            return { success: false, error: e.message };
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
                    // console.log(`[Whitelabel] Stop failed (Process might not exist): ${err.message}`);
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
    async startInstance(userId) {
        const instancePath = path.join(ROOT_DIR, 'whitelabel_instances', userId);
        const pm2Name = `WL_${userId}`;
        const cmd = `${getPM2Command()} start index.js --name "${pm2Name}" --cwd "${instancePath}"`;

        return new Promise((resolve) => {
            // First check if already running? No, PM2 handles "already running" gracefully or we can just try start
            // Actually 'pm2 start index.js --name ...' will fail if name exists.
            // So we should try 'pm2 restart name' OR 'pm2 start ...'
            // Safer: 'pm2 start ...' implies create. If exists, it might error.
            // Strategy: Check list. If exists, restart. If not, start.

            exec(`${getPM2Command()} describe ${pm2Name}`, (err) => {
                if (err) {
                    // Process not found, create it
                    console.log(`[Whitelabel] Process ${pm2Name} not found, starting new...`);
                    exec(cmd, (startErr, stdout, stderr) => {
                        if (startErr) {
                            console.error(`[Whitelabel] Start Failed for WL_${userId}:`, stderr);
                            resolve(false);
                        } else {
                            console.log(`[Whitelabel] Start Success for WL_${userId}`);
                            WhitelabelModel.setSubscription(userId, { status: 'ACTIVE' });
                            resolve(true);
                        }
                    });
                } else {
                    // Process exists, restart implementation or just start
                    console.log(`[Whitelabel] Process ${pm2Name} exists, ensuring online...`);
                    exec(`${getPM2Command()} restart ${pm2Name}`, (restartErr) => {
                        if (!restartErr) {
                            console.log(`[Whitelabel] Restart Success for WL_${userId}`);
                            WhitelabelModel.setSubscription(userId, { status: 'ACTIVE' });
                            resolve(true);
                        } else {
                            // Fallback to start if restart somehow fails weirdly? No, usually valid.
                            resolve(false);
                        }
                    });
                }
            });
        });
    },

    async startAllInstances() {
        console.log('[Whitelabel] Checking for instances to auto-start...');
        const instances = await WhitelabelModel.getAllInstances();
        let count = 0;

        for (const data of instances) {
            if (data.status === 'EXPIRED') continue;
            // Additional check: Does the folder exist?
            const instancePath = path.join(ROOT_DIR, 'whitelabel_instances', data.userId);
            if (!require('fs').existsSync(instancePath)) {
                console.log(`[Whitelabel] Folder missing for ${data.userId}, skipping auto-start.`);
                continue;
            }

            const success = await this.startInstance(data.userId);
            if (success) count++;
        }
        console.log(`[Whitelabel] Auto-start complete. Started ${count} instances.`);
        return count;
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
