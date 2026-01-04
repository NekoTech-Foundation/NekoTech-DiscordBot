const fs = require('fs');
const path = require('path');

const processFile = (inputFile, outputFile) => {
    try {
        const absoluteInput = path.resolve(inputFile);
        const absoluteOutput = path.resolve(outputFile);
        
        if (!fs.existsSync(absoluteInput)) {
            console.error(`File not found: ${absoluteInput}`);
            return;
        }

        const content = fs.readFileSync(absoluteInput, 'utf-8');
        // Split by 2 or more newlines to separate command blocks
        const rawBlocks = content.split(/(\r?\n){2,}/);

        let mdOutput = '';

        rawBlocks.forEach(block => {
            const trimmedBlock = block.trim();
            if (!trimmedBlock || trimmedBlock.match(/^\s*$/)) return;

            const lines = trimmedBlock.split(/\r?\n/);
            
            // Find the header line (starts with /)
            // Sometimes there might be a blank line at start if splitting was messy, but trim() handles it.
            // Check first line for command pattern
             const headerRegex = /^(\/[^:]+) : (.+)$/;
            // Allow for some flexibility
            
            // If the first line doesn't match, this might be a fragment or formatting artifact
            // But let's try to parse index 0
            if (!lines[0].includes(' : ')) {
                // Not a valid command block start
                return;
            }
            
            const separatorIndex = lines[0].indexOf(' : ');
            const cmdName = lines[0].substring(0, separatorIndex).trim();
            const cmdDesc = lines[0].substring(separatorIndex + 3).trim();
            
            mdOutput += `## ${cmdName.replace(/_/g, '\\_')}\n\n`; 
            mdOutput += `**Mô tả:** ${cmdDesc}\n\n`;
            
            // Find sections
            let paramStartIndex = lines.findIndex(l => l.trim().startsWith('Tham số lệnh'));
            let usageStartIndex = lines.findIndex(l => l.trim().startsWith('Ví dụ sử dụng'));
            
            if (paramStartIndex !== -1) {
                mdOutput += `### Tham số\n\n`;
                
                // Determine end of params (either start of usage or end of lines)
                let paramEndIndex = usageStartIndex !== -1 ? usageStartIndex : lines.length;
                let paramLines = lines.slice(paramStartIndex + 1, paramEndIndex);
                
                if (paramLines.some(l => l.includes('Không có tham số'))) {
                    mdOutput += `Không có tham số.\n\n`;
                } else {
                    mdOutput += `| Tham số | Mô tả | Bắt buộc |\n`;
                    mdOutput += `| :--- | :--- | :--- |\n`;
                    
                    let isRequired = false;
                    let hasTableRows = false;
                    
                    paramLines.forEach(l => {
                        const line = l.trim();
                        if (!line) return;
                        
                        if (line.includes('[bắt buộc]')) {
                            isRequired = true;
                        } else if (line.includes('[tùy chọn]') || line.includes('[không bắt buộc]')) {
                            isRequired = false;
                        } else if (line.includes(':')) {
                            // Split by first colon only used for separation
                            const dIndex = line.indexOf(':');
                            const pName = line.substring(0, dIndex).trim();
                            const pDesc = line.substring(dIndex + 1).trim();
                            
                            mdOutput += `| \`${pName}\` | ${pDesc} | ${isRequired ? 'Có' : 'Không'} |\n`;
                            hasTableRows = true;
                        }
                    });
                    
                    if (!hasTableRows) {
                         // Fallback if no params parsed but section exists (unlikely)
                         mdOutput += `\n`; 
                    }
                    mdOutput += `\n`;
                }
            }
            
            if (usageStartIndex !== -1) {
                 mdOutput += `### Ví dụ\n\n`;
                 let usageLines = lines.slice(usageStartIndex + 1);
                 
                 if (usageLines.length > 0) {
                     // First line is often description
                     const uDesc = usageLines[0].trim();
                     if (uDesc && !uDesc.startsWith('/')) {
                         mdOutput += `> ${uDesc}\n\n`;
                         usageLines = usageLines.slice(1);
                     }
                     
                     // Helper to combine multiple command lines
                     const codeBlockLines = usageLines.filter(l => l.trim().length > 0);
                     if (codeBlockLines.length > 0) {
                         mdOutput += `\`\`\`bash\n`;
                         codeBlockLines.forEach(ul => {
                             mdOutput += `${ul.trim()}\n`;
                         });
                         mdOutput += `\`\`\`\n\n`;
                     }
                 }
            }
            
            mdOutput += `---\n\n`;
        });
        
        fs.writeFileSync(absoluteOutput, mdOutput, 'utf-8');
        console.log(`Successfully converted ${inputFile} to ${outputFile}`);

    } catch (e) {
        console.error(`Error processing ${inputFile}:`, e);
    }
};

processFile('gitbook_docs/single_commands.txt', 'gitbook_docs/single_commands.md');
processFile('gitbook_docs/block_commands.txt', 'gitbook_docs/block_commands.md');
