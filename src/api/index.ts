/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CopilotChatApiServer } from './server';
import { IApiConfig } from './types/apiConfig';

/**
 * Main entry point for the Copilot Chat API
 */
export async function startCopilotChatApi(config?: Partial<IApiConfig>): Promise<CopilotChatApiServer> {
	const server = new CopilotChatApiServer(config);
	await server.start();
	return server;
}

/**
 * CLI entry point when running as standalone server
 */
async function main() {
	try {
		const config: Partial<IApiConfig> = {
			port: parseInt(process.env.PORT || '3000'),
			host: process.env.HOST || '0.0.0.0',
			logLevel: (process.env.LOG_LEVEL as any) || 'info'
		};

		console.log('Starting Copilot Chat API Server...');
		const server = await startCopilotChatApi(config);

		// Graceful shutdown
		process.on('SIGINT', async () => {
			console.log('\nShutting down server...');
			await server.stop();
			process.exit(0);
		});

		process.on('SIGTERM', async () => {
			console.log('\nShutting down server...');
			await server.stop();
			process.exit(0);
		});

	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

// Export types and classes for library usage
export { CopilotChatApiServer } from './server';
export { ChatApiService } from './services/chatApiService';
export { ApiConfig } from './types/apiConfig';
export type { 
	IApiConfig, 
	IChatRequest, 
	IChatResponse, 
	IChatSession, 
	IModelInfo, 
	IToolInfo 
} from './types/apiConfig';

// Run as CLI if this is the main module
if (require.main === module) {
	main();
}