const fs = require('fs');
const path = require('path');
//const yaml = require('js-yaml');
const colors = require('ansi-colors');
const { getConfig } = require('./configLoader');

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(colors.blue(`  ├─ Created directory: ${dirPath}`));
    }
}

function updateDashboardEnv() {
    try {
        const config = getConfig();
        const dashboardDir = path.join(process.cwd(), 'dashboard');
        const envPath = path.join(dashboardDir, '.env');
        const publicDir = path.join(dashboardDir, 'public');
        const distDir = path.join(dashboardDir, 'dist');
        const publicConfigPath = path.join(publicDir, 'config.js');
        const distConfigPath = path.join(distDir, 'config.js');

        ensureDirectoryExists(publicDir);
        ensureDirectoryExists(distDir);

        const requiredValues = {
            'mongoURI': config.mongoURI,
            'GuildID': config.GuildID,
            'BotToken': config.BotToken,
            'Dashboard.ClientID': config.Dashboard?.ClientID,
            'Dashboard.ClientSecret': config.Dashboard?.ClientSecret,
            'Dashboard.Url': config.Dashboard?.Url,
            'Dashboard.Port': config.Dashboard?.Port,
            'Dashboard.Auth.JWTSecret': config.Dashboard?.Auth?.JWTSecret,
            'TicketTypes': config.TicketTypes,
            'Timezone': config.Timezone
        };

        const missingValues = Object.entries(requiredValues)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingValues.length > 0) {
            console.error(colors.red('[ENV] Error: Missing required values in config.yml:'));
            missingValues.forEach(key => console.error(colors.red(`  - ${key}`)));
            return false;
        }

        const baseUrl = config.Dashboard.Url;
        const redirectUri = `${baseUrl}/api/auth/callback`;
        const apiUrl = `${baseUrl}/api`;

        const envContent = `MONGODB_URI=${config.mongoURI}
DISCORD_GUILD_ID=${config.GuildID}
BOT_TOKEN=${config.BotToken}
DISCORD_CLIENT_ID=${config.Dashboard.ClientID}
DISCORD_CLIENT_SECRET=${config.Dashboard.ClientSecret}
DISCORD_REDIRECT_URI=${redirectUri}
APP_URL=${baseUrl}
VITE_APP_URL=${baseUrl}
PORT=${config.Dashboard.Port}
JWT_SECRET=${config.Dashboard.Auth.JWTSecret}
TIMEZONE=${config.Timezone}
DASHBOARD_LOGIN_ROLES=${(config.Dashboard?.Permissions?.Dashboard?.Login || []).filter(r => r).join(',')}
DASHBOARD_USAGE_ROLES=${(config.Dashboard?.Permissions?.Dashboard?.Usage || []).filter(r => r).join(',')}
DASHBOARD_SETTINGS_ROLES=${(config.Dashboard?.Permissions?.Dashboard?.Settings || []).filter(r => r).join(',')}
DASHBOARD_EMBED_ROLES=${(config.Dashboard?.Permissions?.Dashboard?.Embed || []).filter(r => r).join(',')}`;

        const configJsContent = `// Generated from config.yml - DO NOT EDIT DIRECTLY
window.DASHBOARD_CONFIG = {
    API_URL: '${apiUrl}',
    CLIENT_URL: '${baseUrl}',
    TIMEZONE: '${config.Timezone}',
    DISCORD: {
        CLIENT_ID: '${config.Dashboard.ClientID}',
        REDIRECT_URI: '${redirectUri}',
        GUILD_ID: '${config.GuildID}'
    },
    PERMISSIONS: {
        Dashboard: {
            Login: ${JSON.stringify(config.Dashboard?.Permissions?.Dashboard?.Login || [])},
            Usage: ${JSON.stringify(config.Dashboard?.Permissions?.Dashboard?.Usage || [])},
            Settings: ${JSON.stringify(config.Dashboard?.Permissions?.Dashboard?.Settings || [])},
            Embed: ${JSON.stringify(config.Dashboard?.Permissions?.Dashboard?.Embed || [])}
        }
    },
    TICKETS: {
        TYPES: ${JSON.stringify(Object.entries(config.TicketTypes)
            .filter(([_, type]) => type.Enabled)
            .reduce((acc, [key, type]) => ({
                ...acc,
                [key]: {
                    name: type.Name,
                    channelName: type.ChannelName,
                    supportRoles: type.SupportRole,
                    userRoles: type.UserRole,
                    claiming: type.Claiming?.Enabled ? {
                        enabled: true,
                        restrictResponse: type.Claiming.RestrictResponse,
                        announceClaim: type.Claiming.AnnounceClaim,
                        button: type.Claiming.Button
                    } : null,
                    button: type.Button,
                    questions: type.Questions || []
                }
            }), {}), null, 2)}
    }
};`;

        try {
            const tempEnvPath = envPath + '.tmp';
            const tempPublicConfigPath = publicConfigPath + '.tmp';
            const tempDistConfigPath = distConfigPath + '.tmp';

            let createdTempFiles = [];

            try {
                fs.writeFileSync(tempEnvPath, envContent);
                createdTempFiles.push(tempEnvPath);
                
                fs.writeFileSync(tempPublicConfigPath, configJsContent);
                createdTempFiles.push(tempPublicConfigPath);
                
                if (fs.existsSync(path.dirname(distConfigPath))) {
                    fs.writeFileSync(tempDistConfigPath, configJsContent);
                    createdTempFiles.push(tempDistConfigPath);
                }

                fs.renameSync(tempEnvPath, envPath);
                createdTempFiles = createdTempFiles.filter(file => file !== tempEnvPath);
                
                fs.renameSync(tempPublicConfigPath, publicConfigPath);
                createdTempFiles = createdTempFiles.filter(file => file !== tempPublicConfigPath);
                
                if (fs.existsSync(path.dirname(distConfigPath))) {
                    fs.renameSync(tempDistConfigPath, distConfigPath);
                    createdTempFiles = createdTempFiles.filter(file => file !== tempDistConfigPath);
                }
                
                return true;
            } catch (writeError) {
                console.error(colors.red('[ENV] Error writing configuration files:'), writeError);

                for (const tempFile of createdTempFiles) {
                    try {
                        if (fs.existsSync(tempFile)) {
                            fs.unlinkSync(tempFile);
                            console.log(colors.yellow(`[ENV] Cleaned up temp file: ${tempFile}`));
                        }
                    } catch (cleanupError) {
                        console.error(colors.yellow(`[ENV] Error cleaning up temp file ${tempFile}:`), cleanupError);
                    }
                }
                
                return false;
            }
        } catch (writeError) {
            console.error(colors.red('[ENV] Error writing configuration files:'), writeError);
            const tempFiles = [
                envPath + '.tmp',
                publicConfigPath + '.tmp',
                distConfigPath + '.tmp'
            ];
            tempFiles.forEach(file => {
                try {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                        console.log(colors.yellow(`[ENV] Cleaned up temp file: ${file}`));
                    }
                } catch (cleanupError) {
                    console.error(colors.yellow('[ENV] Error cleaning up temp file:'), cleanupError);
                }
            });
            return false;
        }
    } catch (error) {
        console.error(colors.red('[ENV] Error updating dashboard configuration:'), error);
        return false;
    }
}

module.exports = { updateDashboardEnv };