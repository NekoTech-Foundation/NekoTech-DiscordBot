const fs = require('fs-extra');
const path = require('path');
const colors = require('ansi-colors');

async function prepareDashboardDist() {
    try {
        const sourceDir = path.join(process.cwd(), 'dashboard');
        const distDir = path.join(process.cwd(), 'dist-dashboard');

        await fs.remove(distDir);
        await fs.ensureDir(distDir);

        console.log(colors.blue('Copying dashboard files...'));
        await fs.copy(path.join(sourceDir, 'dist'), path.join(distDir, 'dist'));
        await fs.copy(path.join(sourceDir, 'server'), path.join(distDir, 'server'));

        const pkg = {
            name: "dashboard",
            version: "1.0.0",
            private: true,
            scripts: {
                "start": "node server/index.js"
            },
            dependencies: {
                "express": "^4.18.2",
                "cors": "^2.8.5",
                "dotenv": "^16.3.1",
                "jsonwebtoken": "^9.0.2",
                "mongoose": "^8.0.3",
                "discord.js": "^14.14.1",
                "cookie-parser": "^1.4.6",
                "node-fetch": "^2.6.7"
            }
        };

        await fs.writeFile(
            path.join(distDir, 'package.json'),
            JSON.stringify(pkg, null, 2)
        );

        const readme = `# Dashboard Setup

1. Configure your \`config.yml\` with your settings
2. Install dependencies: \`npm install\`
3. Start the server: \`npm start\`

The dashboard will automatically generate the necessary config files from your config.yml`;

        await fs.writeFile(path.join(distDir, 'README.md'), readme);

        console.log(colors.green('✓ Dashboard distribution package prepared successfully!'));
        console.log(colors.blue('Distribution package created in:'), colors.yellow(distDir));
        console.log(colors.yellow('\nReminder: Tell customers to configure their config.yml'));

    } catch (error) {
        console.error(colors.red('Error preparing dashboard distribution:'), error);
        process.exit(1);
    }
}

module.exports = { prepareDashboardDist };