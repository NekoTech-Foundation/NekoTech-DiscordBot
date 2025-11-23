const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// Register the Minecraft font
const fontPath = path.join(__dirname, 'minecraft.ttf');
console.log('[Minecraft Addon] Loading font from:', fontPath);

if (fs.existsSync(fontPath)) {
    try {
        registerFont(fontPath, { family: 'Minecraft' });
        console.log('[Minecraft Addon] Font registered successfully.');
    } catch (e) {
        console.error('[Minecraft Addon] Failed to register font:', e);
    }
} else {
    console.error('[Minecraft Addon] Font file not found at:', fontPath);
}

const MC_COLORS = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
};

const ANSI_COLORS = {
    '0': 30, // Black
    '1': 34, // Dark Blue
    '2': 32, // Dark Green
    '3': 36, // Dark Aqua
    '4': 31, // Dark Red
    '5': 35, // Dark Purple
    '6': 33, // Gold
    '7': 37, // Gray
    '8': 90, // Dark Gray
    '9': 94, // Blue
    'a': 92, // Green
    'b': 96, // Aqua
    'c': 91, // Red
    'd': 95, // Light Purple
    'e': 93, // Yellow
    'f': 97  // White
};

function parseMotdToAnsi(motd) {
    if (!motd) return '';
    if (typeof motd !== 'string') return JSON.stringify(motd);

    let ansi = '';
    let currentColor = '';
    let currentStyle = '';

    // Split by section sign
    const parts = motd.split('§');

    // First part is plain text (unless it started with §)
    ansi += parts[0];

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.length === 0) continue;

        const code = part[0].toLowerCase();
        const text = part.substring(1);

        if (ANSI_COLORS[code]) {
            // Color code
            currentColor = `\u001b[0;${ANSI_COLORS[code]}m`;
            // Reset style when color changes in MC? Usually yes.
            // But for ANSI we need to re-apply.
            // Let's just reset and apply color.
            ansi += `\u001b[0m${currentColor}${currentStyle}${text}`;
        } else if (code === 'l') {
            // Bold
            currentStyle += '\u001b[1m';
            ansi += `\u001b[0m${currentColor}${currentStyle}${text}`;
        } else if (code === 'n') {
            // Underline
            currentStyle += '\u001b[4m';
            ansi += `\u001b[0m${currentColor}${currentStyle}${text}`;
        } else if (code === 'r') {
            // Reset
            currentColor = '';
            currentStyle = '';
            ansi += `\u001b[0m${text}`;
        } else {
            // Other codes (k, m, o) ignored or just print text
            ansi += text;
        }
    }

    return ansi + '\u001b[0m';
}

function parseMotdForCanvas(motd) {
    if (!motd) return [{ text: '', color: '#AAAAAA' }];

    const chunks = [];
    let currentColor = '#AAAAAA'; // Default gray
    let currentShadow = '#2A2A2A'; // Default shadow

    const parts = motd.split('§');

    if (parts[0].length > 0) {
        chunks.push({ text: parts[0], color: currentColor });
    }

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.length === 0) continue;

        const code = part[0].toLowerCase();
        const text = part.substring(1);

        if (MC_COLORS[code]) {
            currentColor = MC_COLORS[code];
        } else if (code === 'r') {
            currentColor = '#AAAAAA';
        }
        // Ignore styles for simplicity in this version, or add support later

        if (text.length > 0) {
            chunks.push({ text: text, color: currentColor });
        }
    }
    return chunks;
}

async function createBanner(data, address, serverName) {
    const width = 600;
    const height = 100; // Standard server list height is usually small, but let's make it nice
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Dark dirt texture or just dark color
    ctx.fillStyle = '#181818'; // Dark background
    ctx.fillRect(0, 0, width, height);

    // Optional: Draw a subtle pattern or border
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Icon
    let iconImage;
    try {
        // Use mcstatus icon endpoint
        const iconUrl = `https://api.mcstatus.io/v2/icon/${address}`;
        iconImage = await loadImage(iconUrl);
    } catch (e) {
        // Fallback icon
    }

    if (iconImage) {
        ctx.drawImage(iconImage, 10, 10, 80, 80);
    } else {
        ctx.fillStyle = '#333333';
        ctx.fillRect(10, 10, 80, 80);
        ctx.fillStyle = '#666666';
        ctx.font = '40px "Minecraft"';
        ctx.fillText('?', 35, 65);
    }

    // Server Name
    ctx.font = '22px "Minecraft"';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(serverName || address, 100, 30);

    // MOTD
    // We need to handle newlines in MOTD
    const motdRaw = data.motd.raw || '';
    const motdLines = motdRaw.split('\n');

    let y = 55;
    ctx.font = '20px "Minecraft"';

    for (let i = 0; i < Math.min(motdLines.length, 2); i++) {
        const chunks = parseMotdForCanvas(motdLines[i]);
        let x = 100;
        for (const chunk of chunks) {
            ctx.fillStyle = chunk.color;
            // Simple shadow effect
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillText(chunk.text, x, y);
            x += ctx.measureText(chunk.text).width;
        }
        y += 25;
    }

    // Player Count & Ping
    // Right aligned
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const onlineText = `${data.players.online}/${data.players.max}`;
    ctx.font = '20px "Minecraft"';
    ctx.fillStyle = '#AAAAAA';
    const onlineWidth = ctx.measureText(onlineText).width;
    ctx.fillText(onlineText, width - onlineWidth - 40, 30);

    // Ping Bar (Simulated based on latency if available, or just green)
    const barX = width - 30;
    const barY = 15;

    // Draw signal bars
    ctx.fillStyle = '#00AA00'; // Green
    ctx.fillRect(barX, barY + 12, 4, 4);
    ctx.fillRect(barX + 5, barY + 8, 4, 8);
    ctx.fillRect(barX + 10, barY + 4, 4, 12);
    ctx.fillRect(barX + 15, barY, 4, 16);

    return canvas.toBuffer();
}

module.exports = { parseMotdToAnsi, createBanner };
