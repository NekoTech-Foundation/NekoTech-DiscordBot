declare global {
    interface Window {
        ENV: {
            API_URL: string;
        };
        DASHBOARD_CONFIG: {
            API_URL: string;
            CLIENT_URL: string;
            TIMEZONE: string;
            DISCORD: {
                CLIENT_ID: string;
                REDIRECT_URI: string;
                GUILD_ID: string;
            };
            TICKETS: {
                TYPES: Record<string, any>;
            };
            PERMISSIONS: {
                Dashboard: {
                    Login: string[];
                    Usage: string[];
                    Settings: string[];
                };
            };
        }
    }
}

const apiUrl = window.ENV?.API_URL || 'http://localhost:3000';

const defaultConfig = {
    API_URL: `${apiUrl}/api`,
    DISCORD: {
        CLIENT_ID: '',
        REDIRECT_URI: `${apiUrl}/api/auth/callback`,
        GUILD_ID: ''
    },
    PERMISSIONS: {
        Dashboard: {
            Login: [],
            Usage: [],
            Settings: []
        }
    }
};

export const config = {
    API_URL: window.DASHBOARD_CONFIG?.API_URL || defaultConfig.API_URL,
    DISCORD: {
        CLIENT_ID: window.DASHBOARD_CONFIG?.DISCORD?.CLIENT_ID || defaultConfig.DISCORD.CLIENT_ID,
        REDIRECT_URI: window.DASHBOARD_CONFIG?.DISCORD?.REDIRECT_URI || defaultConfig.DISCORD.REDIRECT_URI,
        GUILD_ID: window.DASHBOARD_CONFIG?.DISCORD?.GUILD_ID || defaultConfig.DISCORD.GUILD_ID
    },
    PERMISSIONS: {
        Dashboard: {
            Login: window.DASHBOARD_CONFIG?.PERMISSIONS?.Dashboard?.Login || defaultConfig.PERMISSIONS.Dashboard.Login,
            Usage: window.DASHBOARD_CONFIG?.PERMISSIONS?.Dashboard?.Usage || defaultConfig.PERMISSIONS.Dashboard.Usage,
            Settings: window.DASHBOARD_CONFIG?.PERMISSIONS?.Dashboard?.Settings || defaultConfig.PERMISSIONS.Dashboard.Settings
        }
    }
};

export default config; 