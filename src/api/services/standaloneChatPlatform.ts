/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChatRequest } from '../types/apiConfig';
import { ApiLogger } from '../utils/logger';
import { ChatPlatformAdapter } from './chatPlatformAdapter';

/**
 * Platform services adapter that creates a standalone version of the chat functionality
 * This extracts the core logic from the VS Code extension platform services
 */
export class StandaloneChatPlatform {
	private logger: ApiLogger;
	private initialized = false;
	private adapter: ChatPlatformAdapter;

	constructor(logger: ApiLogger) {
		this.logger = logger;
		this.adapter = new ChatPlatformAdapter(logger);
	}

	/**
	 * Initialize the standalone platform
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		this.logger.info('Initializing standalone chat platform...');
		
		// Initialize the platform adapter with extracted services
		await this.adapter.initialize();
		
		this.initialized = true;
		this.logger.info('Standalone chat platform initialized');
	}

	/**
	 * Process a chat message using the extracted chat logic
	 */
	async processChat(request: IChatRequest): Promise<any> {
		this.logger.debug('Processing chat with standalone platform');

		// Use the platform adapter to process the chat
		const response = await this.adapter.processChat(request);
		
		return response;
	}

	/**
	 * Get available language models
	 */
	async getAvailableModels(): Promise<any[]> {
		// Use the platform adapter's endpoint provider
		return await this.adapter.getAvailableModels();
	}

	/**
	 * Execute MCP tools
	 */
	async executeTools(toolCalls: any[]): Promise<any[]> {
		this.logger.debug('Executing tools:', { count: toolCalls.length });

		// Use the platform adapter to execute tools
		return await this.adapter.executeTools(toolCalls);
	}

	/**
	 * Search codebase (simplified version of workspace search)
	 */
	async searchCodebase(query: string, options: any = {}): Promise<any> {
		this.logger.debug('Searching codebase:', { query });

		// Use the platform adapter's search functionality
		return await this.adapter.searchCodebase(query, options);
	}

	/**
	 * Read file contents (simplified file service)
	 */
	async readFile(filePath: string, startLine?: number, endLine?: number): Promise<string> {
		this.logger.debug('Reading file:', { filePath, startLine, endLine });

		// Use the platform adapter's file service
		return await this.adapter.readFile(filePath, startLine, endLine);
	}

}