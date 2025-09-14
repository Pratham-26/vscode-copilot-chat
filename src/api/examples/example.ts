#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Example script demonstrating the Copilot Chat API
 */

import { CopilotChatApiClient } from '../client/client';

async function runExample() {
	console.log('🤖 Copilot Chat API Example\n');

	const client = new CopilotChatApiClient('http://localhost:3000');

	try {
		// 1. Health Check
		console.log('📋 Checking server health...');
		const health = await client.health();
		console.log(`   Status: ${health.status} (v${health.version})\n`);

		// 2. List Available Models
		console.log('🎭 Available models:');
		const models = await client.getModels();
		models.forEach(model => {
			console.log(`   - ${model.name} (${model.id})`);
			console.log(`     Provider: ${model.provider}, Max Tokens: ${model.maxTokens}`);
			console.log(`     Tools: ${model.supportsToolCalls ? '✅' : '❌'}, Vision: ${model.supportsVision ? '✅' : '❌'}`);
		});
		console.log();

		// 3. List Available Tools
		console.log('🔧 Available tools:');
		const tools = await client.getTools();
		tools.forEach(tool => {
			console.log(`   - ${tool.name} (${tool.id})`);
			console.log(`     Category: ${tool.category}, Provider: ${tool.provider}`);
			console.log(`     Description: ${tool.description}`);
		});
		console.log();

		// 4. Simple Chat
		console.log('💬 Simple chat example...');
		const simpleResponse = await client.chat({
			message: 'Hello! Can you explain what you can help me with?',
			model: 'gpt-4'
		});
		console.log(`   Response: ${simpleResponse.message}`);
		console.log(`   Usage: ${simpleResponse.usage.totalTokens} tokens\n`);

		// 5. Create a Session
		console.log('📝 Creating a session...');
		const session = await client.createSession({
			model: 'gpt-4',
			context: {
				workspace: '/example/project'
			},
			metadata: {
				example: true
			}
		});
		console.log(`   Session ID: ${session.id}`);
		console.log(`   Model: ${session.model}\n`);

		// 6. Chat with Tools
		console.log('🔧 Chat with tools example...');
		const toolResponse = await client.chat({
			sessionId: session.id,
			message: 'Search for any TODO comments in the codebase',
			tools: ['copilot_searchCodebase'],
			context: {
				workspace: '/example/project'
			}
		});
		console.log(`   Response: ${toolResponse.message}`);
		if (toolResponse.tools && toolResponse.tools.length > 0) {
			console.log(`   Tool Results:`);
			toolResponse.tools.forEach((tool, index) => {
				console.log(`     ${index + 1}. ${tool.name}: ${tool.result || tool.error}`);
			});
		}
		console.log();

		// 7. Multi-turn Conversation
		console.log('🔄 Multi-turn conversation...');
		const followUp = await client.chat({
			sessionId: session.id,
			message: 'Now help me create a plan to address those TODOs',
			model: 'gpt-4'
		});
		console.log(`   Follow-up: ${followUp.message}\n`);

		// 8. List Sessions
		console.log('📋 All sessions:');
		const sessions = await client.getSessions();
		sessions.forEach(sess => {
			console.log(`   - ${sess.id} (${sess.model})`);
			console.log(`     Created: ${sess.createdAt}`);
			console.log(`     Context: ${sess.context?.workspace || 'None'}`);
		});

		console.log('\n✅ Example completed successfully!');

	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Check if server is running
async function checkServer() {
	try {
		const response = await fetch('http://localhost:3000/api/health');
		if (!response.ok) {
			throw new Error(`Server returned ${response.status}`);
		}
	} catch (error) {
		console.error('❌ Cannot connect to Copilot Chat API server.');
		console.error('   Make sure the server is running on http://localhost:3000');
		console.error('   Start it with: npm run api:start');
		process.exit(1);
	}
}

async function main() {
	await checkServer();
	await runExample();
}

main().catch(console.error);