/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChatRequest, IChatResponse, IChatSession, IModelInfo, IToolInfo } from '../types/apiConfig';

/**
 * TypeScript client for the Copilot Chat API
 */
export class CopilotChatApiClient {
	constructor(private baseUrl: string, private apiKey?: string) {
		// Remove trailing slash
		this.baseUrl = baseUrl.replace(/\/$/, '');
	}

	/**
	 * Send a chat message
	 */
	async chat(request: IChatRequest): Promise<IChatResponse> {
		return this.request('POST', '/api/chat', request);
	}

	/**
	 * Create a new session
	 */
	async createSession(request: {
		model?: string;
		context?: IChatRequest['context'];
		metadata?: Record<string, any>;
	}): Promise<IChatSession> {
		return this.request('POST', '/api/sessions', request);
	}

	/**
	 * Get all sessions
	 */
	async getSessions(): Promise<IChatSession[]> {
		return this.request('GET', '/api/sessions');
	}

	/**
	 * Get available models
	 */
	async getModels(): Promise<IModelInfo[]> {
		return this.request('GET', '/api/models');
	}

	/**
	 * Get available tools
	 */
	async getTools(): Promise<IToolInfo[]> {
		return this.request('GET', '/api/tools');
	}

	/**
	 * Health check
	 */
	async health(): Promise<{ status: string; timestamp: string; version: string }> {
		return this.request('GET', '/api/health');
	}

	/**
	 * Make HTTP request
	 */
	private async request<T>(method: string, path: string, body?: any): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (this.apiKey) {
			headers['Authorization'] = `Bearer ${this.apiKey}`;
		}

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Unknown error' }));
			throw new Error(`API Error (${response.status}): ${error.error || response.statusText}`);
		}

		return response.json();
	}
}

/**
 * Example usage of the client
 */
export async function exampleUsage() {
	const client = new CopilotChatApiClient('http://localhost:3000');

	try {
		// Health check
		const health = await client.health();
		console.log('Server status:', health.status);

		// Get available models
		const models = await client.getModels();
		console.log('Available models:', models.map(m => m.id));

		// Simple chat
		const response = await client.chat({
			message: 'Hello! Can you help me with coding?',
			model: 'gpt-4'
		});
		console.log('Response:', response.message);

		// Chat with tools
		const codeResponse = await client.chat({
			message: 'Search for functions that handle user authentication',
			tools: ['copilot_searchCodebase'],
			context: {
				workspace: '/path/to/project'
			}
		});
		console.log('Code search result:', codeResponse.tools?.[0]?.result);

		// Create session for multi-turn conversation
		const session = await client.createSession({
			model: 'gpt-4',
			context: {
				workspace: '/my/project'
			}
		});

		// Continue conversation in session
		const followUp = await client.chat({
			message: 'Now help me refactor that authentication code',
			sessionId: session.id,
			tools: ['copilot_readFile']
		});
		console.log('Follow-up response:', followUp.message);

	} catch (error) {
		console.error('Client error:', error);
	}
}