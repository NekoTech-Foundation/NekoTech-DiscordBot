const fs = require('fs');
const path = require('path');

const commandFiles = fs.readFileSync('found_commands.txt', 'utf-8')
    .split(/\r?\n/)
    .filter(line => line.trim() !== '');

let singleCommandsDoc = '';
let blockCommandsDoc = '';

function extractString(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : null;
}

function parseOptions(text) {
    const options = [];
    // Regex matches .addStringOption(o => o.setName('name').setDescription('desc').setRequired(true))
    // We need to match nested parentheses, which is hard with regex.
    // However, usually options are chained.
    
    // Simplistic approach: split by .add and check type
    const optionTypes = ['StringOption', 'IntegerOption', 'BooleanOption', 'UserOption', 'ChannelOption', 'RoleOption', 'MentionableOption', 'NumberOption', 'AttachmentOption'];
    
    // We will look for patterns like .addStringOption(...)
    // inside the parentheses, we look for .setName('...').setDescription('...')
    
    // Let's iterate over the text and find options
    let remaining = text;
    
    optionTypes.forEach(type => {
        const typeRegex = new RegExp(`\\.add${type}\\s*\\(\\s*(\\w+)\\s*=>\\s*([\\s\\S]*?)\\)\\s*(?=\\.add|\\.execute|$)`, 'g');
        // This regex is imperfect for nested brackets but might work for standard builder pattern
        // Better: Find valid .addXOption calls
    });
    
    // Alternative parsing:
    // 1. Find all occurrences of `.add[Type]Option(`
    // 2. Extract the content until the balancing `)`
    // 3. Parse that content for Name, Description, Required
    
    const optionPattern = /\.add([a-zA-Z]+)Option\s*\(\s*([a-zA-Z0-9_]+)\s*=>\s*/g;
    let match;
    while ((match = optionPattern.exec(text)) !== null) {
        const type = match[1];
        const varName = match[2];
        const statIndex = match.index;
        
        let openParen = 1;
        let endIndex = optionPattern.lastIndex;
        for (let i = optionPattern.lastIndex; i < text.length; i++) {
            if (text[i] === '(') openParen++;
            if (text[i] === ')') openParen--;
            if (openParen === 0) {
                endIndex = i;
                break;
            }
        }
        
        const optionContent = text.substring(optionPattern.lastIndex, endIndex);
        
        const nameMatch = optionContent.match(/\.setName\(['"`](.*?)['"`]\)/);
        const descMatch = optionContent.match(/\.setDescription\(['"`](.*?)['"`]\)/);
        const reqMatch = optionContent.match(/\.setRequired\((true|false)\)/);
        
        if (nameMatch && descMatch) {
            options.push({
                type,
                name: nameMatch[1],
                description: descMatch[1],
                required: reqMatch ? reqMatch[1] === 'true' : false
            });
        }
    }
    return options;
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Find data: new SlashCommandBuilder()
        // And the end of that chain.
        const dataStartIndex = content.indexOf('new SlashCommandBuilder()');
        if (dataStartIndex === -1) return;
        
        // Count braces/parens to find end of chain? 
        // Usually ends before 'async execute' or 'execute:'
        let dataEndIndex = content.indexOf('async execute', dataStartIndex);
        if (dataEndIndex === -1) dataEndIndex = content.indexOf('execute:', dataStartIndex);
        if (dataEndIndex === -1) return; 

        // Backtrack to find the comma or closing brace/paren of the data property
        // But simply taking substring until 'execute' is safe enough for regex searching of .setName etc.
        const commandBlock = content.substring(dataStartIndex, dataEndIndex);
        
        // Top level command info
        const cmdName = extractString(commandBlock, /\.setName\(['"`](.*?)['"`]\)/);
        const cmdDesc = extractString(commandBlock, /\.setDescription\(['"`](.*?)['"`]\)/);
        
        if (!cmdName) return;

        // Check for subcommands
        const hasSubcommands = commandBlock.includes('.addSubcommand');
        
        if (hasSubcommands) {
            // It is a Command Block
            // Find Subcommand Groups and Subcommands
            
            // Subcommands regex
            // .addSubcommand(sc => sc.setName(...)...)
            // .addSubcommandGroup(group => group.setName(...)...)
            
            // We need to parse these carefully.
            // Let's look for .addSubcommand matches
            // and .addSubcommandGroup matches
            
            // Simple parser for subitems
            const subItems = [];
            
            // Normalize: remove newlines to make regex easier? No, might break specific formatting
            // But let's iterate through .addSubcommand and .addSubcommandGroup
            
            const groupRegex = /\.addSubcommandGroup\s*\(\s*(\w+)\s*=>\s*/g;
            let groupMatch;
            while ((groupMatch = groupRegex.exec(commandBlock)) !== null) {
                let open = 1; 
                let end = groupRegex.lastIndex;
                for(let i = end; i < commandBlock.length; i++) {
                    if (commandBlock[i] === '(') open++;
                    if (commandBlock[i] === ')') open--;
                    if (open === 0) { end = i; break; }
                }
                const groupContent = commandBlock.substring(groupRegex.lastIndex, end);
                const groupName = extractString(groupContent, /\.setName\(['"`](.*?)['"`]\)/);
                const groupDesc = extractString(groupContent, /\.setDescription\(['"`](.*?)['"`]\)/);
                
                // Find subcommands inside group
                const subCmdRegex = /\.addSubcommand\s*\(\s*(\w+)\s*=>\s*/g;
                let scMatch;
                while ((scMatch = subCmdRegex.exec(groupContent)) !== null) {
                    let scOpen = 1; 
                    let scEnd = subCmdRegex.lastIndex;
                    for(let j = scEnd; j < groupContent.length; j++) {
                        if (groupContent[j] === '(') scOpen++;
                        if (groupContent[j] === ')') scOpen--;
                        if (scOpen === 0) { scEnd = j; break; }
                    }
                    const scContent = groupContent.substring(subCmdRegex.lastIndex, scEnd);
                    const scName = extractString(scContent, /\.setName\(['"`](.*?)['"`]\)/);
                    const scDesc = extractString(scContent, /\.setDescription\(['"`](.*?)['"`]\)/);
                    const options = parseOptions(scContent);
                    
                    subItems.push({
                        fullName: `/${cmdName} ${groupName} ${scName}`,
                        description: scDesc,
                        options: options
                    });
                }
            }
            
            // Standalone subcommands (not in group)
            // Regex needs to avoid those inside groups.
            // This is tricky with regex. 
            // Alternative: remove the groups we found from text and search again?
            // Or just search all .addSubcommand and check if they are top-level.
            // Checking nesting level is safer.
            
            // Let's try to parse the whole block linearly counting parenthesis depth
            // This is getting complex for a bash/js script.
            
            // Let's assume standard formatting:
            // .addSubcommand(...) is top level or inside Group.
            
            // Fallback: Find ALL .addSubcommand in the block
            // For each, check if it's inside a .addSubcommandGroup
            
            // Actually, let's just use the `extractSubcommands` helper function
            const allSubcommands = extractAllSubcommands(cmdName, commandBlock);
            allSubcommands.forEach(sc => {
                blockCommandsDoc += formatCommand(sc.fullName, sc.description, sc.options);
                blockCommandsDoc += '\n';
            });
            
        } else {
            // Single Command
            const options = parseOptions(commandBlock);
            singleCommandsDoc += formatCommand(`/${cmdName}`, cmdDesc, options);
            singleCommandsDoc += '\n';
        }
        
    } catch (err) {
        console.error(`Error processing ${filePath}: ${err.message}`);
    }
}

function extractAllSubcommands(cmdName, text) {
    const results = [];
    
    // We scan the text.
    // If we find .addSubcommandGroup, we enter Group mode
    // If we find .addSubcommand, we check if we are in Group mode.
    
    let cursor = 0;
    while (cursor < text.length) {
        const groupIdx = text.indexOf('.addSubcommandGroup', cursor);
        const subIdx = text.indexOf('.addSubcommand', cursor);
        
        if (groupIdx === -1 && subIdx === -1) break;
        
        if (groupIdx !== -1 && (subIdx === -1 || groupIdx < subIdx)) {
            // Found a Group
            // Extract Group Block
            const { content: groupBlock, end: groupEnd } = extractBlock(text, groupIdx);
            const groupName = extractString(groupBlock, /\.setName\(['"`](.*?)['"`]\)/);
            
            // Process subcommands inside group
            let subCursor = 0;
            while(subCursor < groupBlock.length) {
                const innerSubIdx = groupBlock.indexOf('.addSubcommand', subCursor);
                if (innerSubIdx === -1) break;
                // Ensure it's not nested in something else? (Unlikely for discord.js builder)
                
                const { content: scBlock, end: scEnd } = extractBlock(groupBlock, innerSubIdx);
                const scName = extractString(scBlock, /\.setName\(['"`](.*?)['"`]\)/);
                const scDesc = extractString(scBlock, /\.setDescription\(['"`](.*?)['"`]\)/);
                const options = parseOptions(scBlock);
                
                results.push({
                    fullName: `/${cmdName} ${groupName} ${scName}`,
                    description: scDesc, // Fallback to group description if undefined? No.
                    options: options
                });
                
                subCursor = scEnd;
            }
            
            cursor = groupEnd;
        } else {
            // Found a Top-Level Subcommand (OR a subcommand inside a group that we missed? The logic above should handle groups first if they appear first)
            // Wait, standard `indexOf` finds first occurance. 
            // If we have Group then Subcommand, we handle Group. 
            // If we have Subcommand then Group, we handle Subcommand.
            // CORRECT.
            
            // Check if this .addSubcommand is actually inside the previous group? 
            // No, `cursor` moves past the group.
            
            const { content: scBlock, end: scEnd } = extractBlock(text, subIdx);
            
            // We need to verify if this `scBlock` is actually part of a Group we haven't processed yet?
            // No, `.addSubcommand` is distinct.
            
             const scName = extractString(scBlock, /\.setName\(['"`](.*?)['"`]\)/);
             const scDesc = extractString(scBlock, /\.setDescription\(['"`](.*?)['"`]\)/);
             const options = parseOptions(scBlock);
             
             results.push({
                 fullName: `/${cmdName} ${scName}`,
                 description: scDesc,
                 options: options
             });
             
             cursor = scEnd;
        }
    }
    return results;
}

function extractBlock(text, startIndex) {
    // Find the opening parenthesis of the method call
    const openParenIdx = text.indexOf('(', startIndex);
    if (openParenIdx === -1) return { content: '', end: startIndex + 1 };
    
    let balance = 1;
    let i = openParenIdx + 1;
    for (; i < text.length; i++) {
        if (text[i] === '(') balance++;
        if (text[i] === ')') balance--;
        if (balance === 0) break;
    }
    return { content: text.substring(openParenIdx + 1, i), end: i + 1 };
}


function formatCommand(fullName, description, options) {
    let out = `${fullName} : ${description || 'Không có mô tả'}\n`;
    out += `Tham số lệnh (Parameters)\n`;
    
    const required = options.filter(o => o.required);
    const optional = options.filter(o => !o.required);
    
    if (required.length === 0 && optional.length === 0) {
        out += `Không có tham số\n`;
    } else {
        if (required.length > 0) {
            out += `bắt buộc:\n`;
            required.forEach(o => {
                out += `${o.name} : ${o.description}\n`;
            });
        }
        if (optional.length > 0) {
            // The prompt example didn't explicitly show optional, but implied structure. 
            // I'll add "tùy chọn:" header if there are optional params.
            out += `tùy chọn:\n`;
            optional.forEach(o => {
                out += `${o.name} : ${o.description}\n`;
            });
        }
    }
    
    out += `Ví dụ sử dụng:\n`;
    out += `${description || 'Thực thi lệnh này.'}\n`; 
    
    let usageExample = fullName;
    options.forEach(o => {
        if (o.required) {
            usageExample += ` ${o.name}:value`;
        }
    });
    out += `${usageExample}\n`;
    
    return out; // Separator handled by caller
}

// Execution
commandFiles.forEach(file => {
    // Clean path
    const cleanPath = file.trim();
    if (fs.existsSync(cleanPath)) {
        processFile(cleanPath);
    }
});

fs.writeFileSync('gitbook_docs/single_commands.txt', singleCommandsDoc, 'utf-8');
fs.writeFileSync('gitbook_docs/block_commands.txt', blockCommandsDoc, 'utf-8');
console.log('Docs generated.');
