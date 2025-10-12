import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');
import fs from 'fs'
import path from 'path'

export default defineConfig(({ command }) => {
    const config = getConfig();
    const apiPort = config.Dashboard?.Port || 5000

    return {
        root: '.',
        plugins: [
            react()
        ],
        server: {
            proxy: {
                '/api': {
                    target: `http://localhost:${apiPort}`,
                    changeOrigin: true,
                    secure: false,
                    ws: true
                }
            }
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html')
                }
            }
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        }
    }
})