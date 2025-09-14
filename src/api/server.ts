/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { ChatApiService } from './services/chatApiService';
import { ApiConfig, IApiConfig } from './types/apiConfig';
import { ApiLogger } from './utils/logger';

/**
 * HTTP API Server for Copilot Chat functionality
 * Exposes chat capabilities as REST endpoints for MCP-assisted tasks
 */
export class CopilotChatApiServer {
	private server?: ReturnType<typeof createServer>;
	private chatService: ChatApiService;
	private logger: ApiLogger;
	private config: IApiConfig;

	constructor(config: Partial<IApiConfig> = {}) {
		this.config = new ApiConfig(config);
		this.logger = new ApiLogger(this.config.logLevel);
		this.chatService = new ChatApiService(this.config, this.logger);
	}

	/**
	 * Start the API server
	 */
	async start(): Promise<void> {
		if (this.server) {
			throw new Error('Server is already running');
		}

		await this.chatService.initialize();

		this.server = createServer((req, res) => {
			this.handleRequest(req, res).catch(error => {
				this.logger.error('Request handling error:', error);
				this.sendErrorResponse(res, 500, 'Internal Server Error');
			});
		});

		return new Promise((resolve, reject) => {
			this.server!.listen(this.config.port, this.config.host, () => {
				this.logger.info(`Copilot Chat API Server started on ${this.config.host}:${this.config.port}`);
				resolve();
			});

			this.server!.on('error', reject);
		});
	}

	/**
	 * Stop the API server
	 */
	async stop(): Promise<void> {
		if (!this.server) {
			return;
		}

		return new Promise((resolve) => {
			this.server!.close(() => {
				this.logger.info('Copilot Chat API Server stopped');
				this.server = undefined;
				resolve();
			});
		});
	}

	/**
	 * Handle incoming HTTP requests
	 */
	private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const url = new URL(req.url || '', `http://${req.headers.host}`);
		const path = url.pathname;
		const method = req.method?.toUpperCase();

		// Set CORS headers
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

		if (method === 'OPTIONS') {
			res.writeHead(200);
			res.end();
			return;
		}

		// Route requests
		try {
			switch (path) {
				case '/api/health':
					await this.handleHealthCheck(req, res);
					break;
				case '/api/chat':
					await this.handleChatRequest(req, res);
					break;
				case '/api/sessions':
					await this.handleSessionsRequest(req, res);
					break;
				case '/api/models':
					await this.handleModelsRequest(req, res);
					break;
				case '/api/tools':
					await this.handleToolsRequest(req, res);
					break;
				default:
					this.sendErrorResponse(res, 404, 'Not Found');
			}
		} catch (error) {
			this.logger.error(`Error handling ${method} ${path}:`, error);
			this.sendErrorResponse(res, 500, 'Internal Server Error');
		}
	}

	/**
	 * Health check endpoint
	 */
	private async handleHealthCheck(req: IncomingMessage, res: ServerResponse): Promise<void> {
		this.sendJsonResponse(res, 200, {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			version: '1.0.0'
		});
	}

	/**
	 * Chat endpoint - main chat functionality
	 */
	private async handleChatRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method !== 'POST') {
			this.sendErrorResponse(res, 405, 'Method Not Allowed');
			return;
		}

		const body = await this.readRequestBody(req);
		const chatRequest = JSON.parse(body);

		const response = await this.chatService.processChat(chatRequest);
		this.sendJsonResponse(res, 200, response);
	}

	/**
	 * Sessions endpoint - manage chat sessions
	 */
	private async handleSessionsRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		switch (req.method) {
			case 'GET':
				const sessions = await this.chatService.getSessions();
				this.sendJsonResponse(res, 200, sessions);
				break;
			case 'POST':
				const body = await this.readRequestBody(req);
				const sessionRequest = JSON.parse(body);
				const session = await this.chatService.createSession(sessionRequest);
				this.sendJsonResponse(res, 201, session);
				break;
			default:
				this.sendErrorResponse(res, 405, 'Method Not Allowed');
		}
	}

	/**
	 * Models endpoint - list available models
	 */
	private async handleModelsRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method !== 'GET') {
			this.sendErrorResponse(res, 405, 'Method Not Allowed');
			return;
		}

		const models = await this.chatService.getAvailableModels();
		this.sendJsonResponse(res, 200, models);
	}

	/**
	 * Tools endpoint - list available MCP tools
	 */
	private async handleToolsRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method !== 'GET') {
			this.sendErrorResponse(res, 405, 'Method Not Allowed');
			return;
		}

		const tools = await this.chatService.getAvailableTools();
		this.sendJsonResponse(res, 200, tools);
	}

	/**
	 * Send JSON response
	 */
	private sendJsonResponse(res: ServerResponse, statusCode: number, data: any): void {
		res.writeHead(statusCode, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(data, null, 2));
	}

	/**
	 * Send error response
	 */
	private sendErrorResponse(res: ServerResponse, statusCode: number, message: string): void {
		this.sendJsonResponse(res, statusCode, {
			error: message,
			timestamp: new Date().toISOString()
		});
	}

	/**
	 * Read request body
	 */
	private async readRequestBody(req: IncomingMessage): Promise<string> {
		return new Promise((resolve, reject) => {
			let body = '';
			req.on('data', chunk => body += chunk);
			req.on('end', () => resolve(body));
			req.on('error', reject);
		});
	}
}