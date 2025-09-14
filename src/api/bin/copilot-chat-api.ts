#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Standalone launcher for Copilot Chat API Server
 * This script can be used to run the chat API independently of VS Code
 */

import { startCopilotChatApi } from '../api';

async function launch() {
	const config = {
		port: parseInt(process.env.COPILOT_API_PORT || '3000'),
		host: process.env.COPILOT_API_HOST || '0.0.0.0',
		logLevel: (process.env.COPILOT_API_LOG_LEVEL as any) || 'info',
		authentication: {
			required: process.env.COPILOT_API_AUTH_REQUIRED !== 'false',
			apiKey: process.env.COPILOT_API_KEY,
			githubToken: process.env.GITHUB_TOKEN
		}
	};

	console.log('🚀 Starting Copilot Chat API Server...');
	console.log(`📍 Configuration:`);
	console.log(`   - Host: ${config.host}`);
	console.log(`   - Port: ${config.port}`);
	console.log(`   - Log Level: ${config.logLevel}`);
	console.log(`   - Authentication: ${config.authentication.required ? 'Enabled' : 'Disabled'}`);
	console.log();

	try {
		const server = await startCopilotChatApi(config);
		
		console.log('✅ Copilot Chat API Server is running!');
		console.log();
		console.log('📚 Available endpoints:');
		console.log(`   GET  http://${config.host}:${config.port}/api/health       - Health check`);
		console.log(`   POST http://${config.host}:${config.port}/api/chat         - Chat with AI`);
		console.log(`   GET  http://${config.host}:${config.port}/api/sessions     - List sessions`);
		console.log(`   POST http://${config.host}:${config.port}/api/sessions     - Create session`);
		console.log(`   GET  http://${config.host}:${config.port}/api/models       - List models`);
		console.log(`   GET  http://${config.host}:${config.port}/api/tools        - List tools`);
		console.log();
		console.log('🔗 Example curl commands:');
		console.log(`   curl http://${config.host}:${config.port}/api/health`);
		console.log(`   curl -X POST http://${config.host}:${config.port}/api/chat \\`);
		console.log(`     -H "Content-Type: application/json" \\`);
		console.log(`     -d '{"message": "Hello, how can you help me?"}'`);
		console.log();
		console.log('Press Ctrl+C to stop the server');

	} catch (error) {
		console.error('❌ Failed to start server:', error);
		process.exit(1);
	}
}

// Handle graceful shutdown
process.on('SIGINT', () => {
	console.log('\n👋 Shutting down gracefully...');
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\n👋 Shutting down gracefully...');
	process.exit(0);
});

launch().catch(error => {
	console.error('💥 Startup error:', error);
	process.exit(1);
});