const { createCanvas } = require('canvas');
const sharp = require('sharp');

async function generateCaptcha() {
    const gridSize = 3;
    const cellSize = 100;
    const padding = 10;
    const width = gridSize * cellSize + (gridSize + 1) * padding;
    const height = gridSize * cellSize + (gridSize + 1) * padding;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    const shapes = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5'];
    const selectedShapes = [];
    const shapePositions = [];
    let captchaAnswer = '';

    const targetShape = shapes[Math.floor(Math.random() * shapes.length)];

    const guaranteedPositions = [];
    const targetShapeCount = 2 + Math.floor(Math.random() * 2);
    while (guaranteedPositions.length < targetShapeCount) {
        const pos = Math.floor(Math.random() * (gridSize * gridSize)) + 1;
        if (!guaranteedPositions.includes(pos)) {
            guaranteedPositions.push(pos);
        }
    }

    const availablePositions = Array.from({length: gridSize * gridSize}, (_, i) => i + 1)
        .filter(pos => !guaranteedPositions.includes(pos));

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const position = row * gridSize + col + 1;
            const x = col * (cellSize + padding) + padding;
            const y = row * (cellSize + padding) + padding;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, cellSize, cellSize);

            if (guaranteedPositions.includes(position)) {
                selectedShapes.push({ 
                    x, y, 
                    shape: targetShape, 
                    color: colors[Math.floor(Math.random() * colors.length)] 
                });
                shapePositions.push({ shape: targetShape, position: position.toString() });
                captchaAnswer += position.toString();
            }
        }
    }

    availablePositions.forEach(position => {
        if (Math.random() < 0.7) {
            const row = Math.floor((position - 1) / gridSize);
            const col = (position - 1) % gridSize;
            const x = col * (cellSize + padding) + padding;
            const y = row * (cellSize + padding) + padding;

            const availableShapes = shapes.filter(s => s !== targetShape);
            const randomShape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
            
            selectedShapes.push({ 
                x, y, 
                shape: randomShape, 
                color: colors[Math.floor(Math.random() * colors.length)] 
            });
            shapePositions.push({ shape: randomShape, position: position.toString() });
        }
    });

    captchaAnswer = captchaAnswer.split('').sort().join('');

    selectedShapes.forEach(({ x, y, shape, color }) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const size = cellSize * 0.6;
        const rotation = (Math.random() - 0.5) * 0.5;

        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        switch (shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;

            case 'square':
                ctx.fillRect(-size / 2, -size / 2, size, size);
                ctx.strokeRect(-size / 2, -size / 2, size, size);
                break;

            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, size / 2);
                ctx.lineTo(-size / 2, size / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'star':
                const spikes = 5;
                const outerRadius = size / 2;
                const innerRadius = size / 4;
                ctx.beginPath();
                for (let i = 0; i < spikes * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / spikes;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'heart':
                ctx.beginPath();
                ctx.moveTo(0, size / 4);
                ctx.bezierCurveTo(size / 4, -size / 4, size / 2, 0, 0, size / 2);
                ctx.bezierCurveTo(-size / 2, 0, -size / 4, -size / 4, 0, size / 4);
                ctx.fill();
                ctx.stroke();
                break;

            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, 0);
                ctx.lineTo(0, size / 2);
                ctx.lineTo(-size / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }
        ctx.restore();
    });

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < gridSize * gridSize; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const x = col * (cellSize + padding) + padding + cellSize - 20;
        const y = row * (cellSize + padding) + padding + 20;
        ctx.fillText((i + 1).toString(), x, y);
    }

    const buffer = canvas.toBuffer('image/png');
    const optimizedBuffer = await sharp(buffer)
        .png({ quality: 90, compressionLevel: 8 })
        .toBuffer();

    return { 
        captcha: captchaAnswer,
        captchaImage: optimizedBuffer,
        shapePositions: shapePositions,
        targetShape: targetShape
    };
}

module.exports = { generateCaptcha };
