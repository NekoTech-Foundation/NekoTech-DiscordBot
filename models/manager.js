const mongoose = require('mongoose');
const fs = require('fs');
const yaml = require("js-yaml");
const colors = require('ansi-colors');
const { getConfig } = require('../utils/configLoader');

const connectToMongoDB = async(mongoURI = null) => {
    const maxRetries = 5;
    let retries = 0;
    let uri = mongoURI;

    if (!uri) {
        try {
            const config = getConfig();
            uri = config.mongoURI;
        } catch (error) {
            console.error(colors.yellow('[!] Could not load config, falling back to environment variable'));
            uri = process.env.MONGODB_URI;
        }
    }

    while (retries < maxRetries) {
        try {
            if (uri) {
                await mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 30000,
                    socketTimeoutMS: 75000,
                    maxPoolSize: 10,
                    minPoolSize: 2,
                    maxIdleTimeMS: 60000,
                    connectTimeoutMS: 30000,
                    retryWrites: true
                });

                console.log(colors.green('[✓] Connected to MongoDB successfully!'));
                return;
            } else {
                throw new Error('MongoDB Connection String is not specified! (Need mongoURI parameter, config.yml, or MONGODB_URI env var)');
            }
        } catch (error) {
            if (error.message.includes('authentication failed')) {
                console.error(colors.red.bold('[✗] Authentication failed: Check your username and password.'));
            } else {
                const errorMsg = `[ERROR] Failed to connect to MongoDB: ${error.message}\n${error.stack}`;
                console.error(colors.red.bold(errorMsg));

                if (error.message.includes('network error')) {
                    console.error(colors.red.bold('Network error: Ensure MongoDB server is reachable.'));
                } else if (error.message.includes('permission denied')) {
                    console.error(colors.red.bold('Permission denied: Check MongoDB cluster permissions.'));
                } else if (error.message.includes('buffering timed out')) {
                    console.error(colors.red.bold('Connection timeout: Verify IP whitelist and server status.'));
                } else if (error.message.includes('ECONNREFUSED')) {
                    console.error(colors.red.bold('Connection refused: No response from the specified host or port.'));
                } else if (error.message.includes('ENOTFOUND')) {
                    console.error(colors.red.bold('Server not found: Check DNS configuration and server address.'));
                } else if (error.message.includes('ETIMEDOUT')) {
                    console.error(colors.red.bold('Connection timed out: Server too slow or network issues.'));
                } else if (error.message.includes('schema validation')) {
                    console.error(colors.red.bold('Schema validation error: Check your MongoDB schema setup.'));
                } else if (error.message.includes('duplicate key error')) {
                    console.error(colors.red.bold('Duplicate key error: Unique constraint violated.'));
                } else {
                    console.error(colors.red.bold('An unexpected error occurred: Check MongoDB connection and credentials.'));
                }
            }

            if (retries === maxRetries - 1) {
                console.error(colors.red.bold('Maximum connection attempts failed, exiting...'));
                process.exit(1);
            } else {
                console.log(colors.yellow(`Attempting to reconnect... (${retries + 1}/${maxRetries})`));
                await new Promise(resolve => setTimeout(resolve, 2000 * (retries + 1)));
            }

            retries++;
        }
    }
};

module.exports = connectToMongoDB;