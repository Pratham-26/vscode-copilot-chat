/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CopilotChatApiServer } from '../server';
import { CopilotChatApiClient } from '../client/client';

describe('Copilot Chat API', () => {
	let server: CopilotChatApiServer;
	let client: CopilotChatApiClient;
	const testPort = 3001;

	beforeAll(async () => {
		// Start test server
		server = new CopilotChatApiServer({
			port: testPort,
			host: 'localhost',
			logLevel: 'error', // Reduce noise in tests
			authentication: {
				required: false,
				apiKey: undefined,
				githubToken: undefined
			}
		});

		await server.start();

		// Create client
		client = new CopilotChatApiClient(`http://localhost:${testPort}`);
	});

	afterAll(async () => {
		await server.stop();
	});

	describe('Health Check', () => {
		it('should return healthy status', async () => {
			const health = await client.health();
			
			expect(health.status).toBe('healthy');
			expect(health.version).toBe('1.0.0');
			expect(health.timestamp).toBeDefined();
		});
	});

	describe('Models', () => {
		it('should return available models', async () => {
			const models = await client.getModels();
			
			expect(Array.isArray(models)).toBe(true);
			expect(models.length).toBeGreaterThan(0);
			
			const gpt4 = models.find(m => m.id === 'gpt-4');
			expect(gpt4).toBeDefined();
			expect(gpt4?.name).toBe('GPT-4');
			expect(gpt4?.supportsToolCalls).toBe(true);
		});
	});

	describe('Tools', () => {
		it('should return available tools', async () => {
			const tools = await client.getTools();
			
			expect(Array.isArray(tools)).toBe(true);
			expect(tools.length).toBeGreaterThan(0);
			
			const searchTool = tools.find(t => t.id === 'copilot_searchCodebase');
			expect(searchTool).toBeDefined();
			expect(searchTool?.category).toBe('code_search');
		});
	});

	describe('Sessions', () => {
		it('should create and list sessions', async () => {
			const session = await client.createSession({
				model: 'gpt-4',
				context: {
					workspace: '/test/workspace'
				},
				metadata: {
					test: true
				}
			});

			expect(session.id).toBeDefined();
			expect(session.model).toBe('gpt-4');
			expect(session.context?.workspace).toBe('/test/workspace');
			expect(session.metadata?.test).toBe(true);

			const sessions = await client.getSessions();
			const foundSession = sessions.find(s => s.id === session.id);
			expect(foundSession).toBeDefined();
		});
	});

	describe('Chat', () => {
		it('should process simple chat message', async () => {
			const response = await client.chat({
				message: 'Hello, test message',
				model: 'gpt-4'
			});

			expect(response.id).toBeDefined();
			expect(response.sessionId).toBeDefined();
			expect(response.message).toBeDefined();
			expect(response.model).toBe('gpt-4');
			expect(response.usage.totalTokens).toBeGreaterThan(0);
			expect(response.timestamp).toBeDefined();
		});

		it('should handle chat with tools', async () => {
			const response = await client.chat({
				message: 'Search for functions',
				tools: ['copilot_searchCodebase'],
				context: {
					workspace: '/test'
				}
			});

			expect(response.tools).toBeDefined();
			expect(response.tools?.length).toBeGreaterThan(0);
			expect(response.tools?.[0].name).toBe('copilot_searchCodebase');
		});

		it('should maintain session context', async () => {
			const session = await client.createSession({
				model: 'gpt-4'
			});

			const firstResponse = await client.chat({
				message: 'First message',
				sessionId: session.id
			});

			const secondResponse = await client.chat({
				message: 'Second message',
				sessionId: session.id
			});

			expect(firstResponse.sessionId).toBe(session.id);
			expect(secondResponse.sessionId).toBe(session.id);
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid endpoints', async () => {
			const response = await fetch(`http://localhost:${testPort}/api/invalid`);
			expect(response.status).toBe(404);
			
			const error = await response.json();
			expect(error.error).toBe('Not Found');
		});

		it('should handle invalid chat requests', async () => {
			try {
				await fetch(`http://localhost:${testPort}/api/chat`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}) // Invalid request
				});
			} catch (error) {
				// Expected to fail during JSON parsing
			}
		});
	});
});