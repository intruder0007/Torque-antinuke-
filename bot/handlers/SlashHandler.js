const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) return;

    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            let CommandImport = require(filePath);

            try {
                let command;
                
                // If it's a class inheriting SecureCommand, instantiate it
                if (typeof CommandImport === 'function' && CommandImport.prototype && CommandImport.prototype.execute) {
                    command = new CommandImport();
                } else if (typeof CommandImport === 'object') {
                    // Fallback to normal object
                    command = CommandImport;
                } else {
                    continue;
                }

                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    client.slashArray.push(command.data.toJSON());
                } else {
                    console.log(`[WARNING] Command at ${filePath} missing "data" or "execute".`);
                }
            } catch (err) {
                 console.log(`[ERROR] Failed loading command ${filePath}:`, err.message);
            }
        }
    }
};
