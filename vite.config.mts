import { defineConfig } from 'vite';
import noBundlePlugin from 'vite-plugin-no-bundle';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';

import fs from 'fs';
import path from 'path';

function fallbackProxyPlugin() {
	const excludePaths = [
		'/@vite/client',
		'/@vite/env',
		// Add more paths to exclude as needed
	]
	return {
		name: 'fallback-proxy',
		configureServer(server) {
			const apiProxy = createProxyMiddleware({
				target: 'http://127.0.0.1:8188',
				// changeOrigin: true,
				// ws: true,
				// timeout: 1000,
				// proxyTimeout: 1000,
				// logLevel: 'silent', // Optional: Reduce log verbosity
			});

            server.middlewares.use((req, res, next) => {
                // Exclude specific paths from being proxied
                if (excludePaths.some(excludePath => req.url.startsWith(excludePath))) {
                    next();
                    return;
                }

                // Construct the full file path from the request URL
                const filePath = path.join(server.config.root, req.url.split('?')[0]);

                fs.access(filePath, fs.constants.F_OK, (err) => {
                    if (err) {
                        // If the file does not exist, proxy the request
                        apiProxy(req, res, next);
                    } else {
                        // If the file exists, proceed to the next middleware
                        next();
                    }
                });
            });
		}
	};
}

export default defineConfig({
	server: {
		open: true,
		proxy: {
			// Proxy websocket requests to the server
			'/ws': {
				target: 'ws://127.0.0.1:8188',
				ws: true,
			}
		}
	},
	plugins: [noBundlePlugin({
		copy: [
			'**/*.css',
			'lib/*.js',
			// Make sure to include all core extensions, as they are loaded dynamically
			'extensions/core/*.js',
			// Include modules only used by core extensions
			'scripts/ui/draggableList.js',
		]
	}), fallbackProxyPlugin()],
	build: {
		lib: {
			formats: ['es'],
			entry: 'index.html',
		},
		minify: false,
		rollupOptions: {
			// Disabling tree-shaking
			// Prevent vite remove unused exports
			treeshake: false,
			plugins: [
				dynamicImportVars({
					include: [
						'./src/scripts/**/*.ts', // Adjust the glob pattern to match your files
					],
				}),
			],
		}
	},
});