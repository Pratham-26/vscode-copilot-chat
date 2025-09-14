/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { randomUUID } from 'crypto';
import { IApiConfig, IChatRequest, IChatResponse, IChatSession, IModelInfo, IToolInfo } from '../types/apiConfig';
import { ApiLogger } from '../utils/logger';
import { StandaloneChatPlatform } from './standaloneChatPlatform';

/**
 * Core chat service that interfaces with the extracted chat logic
 * This service abstracts the VS Code-specific functionality and provides a clean API
 */
export class ChatApiService {
	private sessions: Map<string, IChatSession> = new Map();
	private initialized = false;
	private platform: StandaloneChatPlatform;

	constructor(
		private config: IApiConfig,
		private logger: ApiLogger
	) {
		this.platform = new StandaloneChatPlatform(logger);
	}

	/**
	 * Initialize the chat service
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		this.logger.info('Initializing Chat API Service...');
		
		// Initialize the standalone platform with extracted chat logic
		await this.platform.initialize();
		
		this.initialized = true;
		this.logger.info('Chat API Service initialized successfully');
	}

	/**
	 * Process a chat request
	 */
	async processChat(request: IChatRequest): Promise<IChatResponse> {
		this.logger.debug('Processing chat request:', { 
			sessionId: request.sessionId, 
			model: request.model,
			hasTools: !!request.tools?.length 
		});

		// Get or create session
		const sessionId = request.sessionId || randomUUID();
		let session = this.sessions.get(sessionId);
		
		if (!session) {
			session = await this.createSessionInternal({
				model: request.model || this.config.models.default,
				context: request.context
			});
			this.sessions.set(sessionId, session);
		}

		// Process the chat using the standalone platform
		const platformResponse = await this.platform.processChat(request);
		
		const response: IChatResponse = {
			id: platformResponse.id,
			sessionId: session.id,
			message: platformResponse.message,
			model: platformResponse.model,
			usage: platformResponse.usage,
			timestamp: platformResponse.timestamp,
			references: []
		};

		// Handle tool calls if requested
		if (request.tools && request.tools.length > 0) {
			response.tools = await this.handleToolCalls(request.tools, request);
		}

		this.logger.debug('Chat response generated:', { 
			responseId: response.id, 
			sessionId: response.sessionId,
			toolCallCount: response.tools?.length || 0
		});

		return response;
	}

	/**
	 * Create a new chat session
	 */
	async createSession(request: { 
		model?: string; 
		context?: IChatRequest['context'];
		metadata?: Record<string, any>;
	}): Promise<IChatSession> {
		const session = await this.createSessionInternal(request);
		this.sessions.set(session.id, session);
		
		this.logger.info('Created new chat session:', { sessionId: session.id, model: session.model });
		return session;
	}

	/**
	 * Get all active sessions
	 */
	async getSessions(): Promise<IChatSession[]> {
		return Array.from(this.sessions.values());
	}

	/**
	 * Get available models
	 */
	async getAvailableModels(): Promise<IModelInfo[]> {
		// Connect to the standalone platform's model provider
		return await this.platform.getAvailableModels();
	}

	/**
	 * Get available tools
	 */
	async getAvailableTools(): Promise<IToolInfo[]> {
		// TODO: Connect to the MCP tools and builtin tools from the extension
		return [
			{
				id: 'copilot_searchCodebase',
				name: 'Search Codebase',
				description: 'Search for code in the workspace',
				schema: {
					type: 'object',
					properties: {
						query: { type: 'string', description: 'Search query' }
					},
					required: ['query']
				},
				category: 'code_search',
				provider: 'builtin'
			},
			{
				id: 'copilot_readFile',
				name: 'Read File',
				description: 'Read contents of a file',
				schema: {
					type: 'object',
					properties: {
						filePath: { type: 'string', description: 'Path to the file' },
						startLine: { type: 'number', description: 'Start line number' },
						endLine: { type: 'number', description: 'End line number' }
					},
					required: ['filePath', 'startLine', 'endLine']
				},
				category: 'file_operations',
				provider: 'builtin'
			},
			{
				id: 'execute_task',
				name: 'Execute Task',
				description: 'Execute a complex multi-step task autonomously',
				schema: {
					type: 'object',
					properties: {
						prompt: { type: 'string', description: 'Task description' },
						description: { type: 'string', description: 'Short task description' }
					},
					required: ['prompt', 'description']
				},
				category: 'automation',
				provider: 'mcp'
			}
		];
	}

	/**
	 * Create session internally
	 */
	private async createSessionInternal(request: {
		model?: string;
		context?: IChatRequest['context'];
		metadata?: Record<string, any>;
	}): Promise<IChatSession> {
		const now = new Date().toISOString();
		return {
			id: randomUUID(),
			createdAt: now,
			updatedAt: now,
			model: request.model || this.config.models.default,
			context: request.context,
			metadata: request.metadata
		};
	}

	/**
	 * Handle tool calls
	 */
	private async handleToolCalls(toolIds: string[], request: IChatRequest): Promise<any[]> {
		this.logger.debug('Handling tool calls:', { toolIds, requestId: request.sessionId });
		
		// Use the standalone platform to execute tools
		const toolCalls = toolIds.map(toolId => ({
			id: randomUUID(),
			name: toolId,
			arguments: request.variables || {}
		}));

		return await this.platform.executeTools(toolCalls);
	}

	/**
	 * Generate mock response for development
	 */
	private generateMockResponse(request: IChatRequest): string {
		const responses = [
			"I'll help you with that. Let me analyze your request and provide a solution.",
			"Based on your question, here's what I found...",
			"I can assist you with that task. Here's my recommendation:",
			"Let me search through your codebase to find relevant information.",
			"I'll help you implement this functionality step by step."
		];
		
		const baseResponse = responses[Math.floor(Math.random() * responses.length)];
		
		if (request.tools && request.tools.length > 0) {
			return `${baseResponse}\n\nI'll use the following tools to help: ${request.tools.join(', ')}`;
		}
		
		if (request.context?.files) {
			return `${baseResponse}\n\nI'll analyze the files: ${request.context.files.join(', ')}`;
		}
		
		return baseResponse;
	}
}