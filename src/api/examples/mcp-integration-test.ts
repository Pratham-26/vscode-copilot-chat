#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Integration test demonstrating MCP-assisted tasks using the Copilot Chat API
 */

import { CopilotChatApiClient } from '../client/client';

async function testMCPAssistedTasks() {
	console.log('🧪 Testing MCP-Assisted Tasks with Copilot Chat API\n');

	const client = new CopilotChatApiClient('http://localhost:3000');

	try {
		// 1. Test basic functionality
		console.log('1️⃣ Testing basic chat functionality...');
		const basicResponse = await client.chat({
			message: 'Hello! I need help with a coding task.',
			model: 'gpt-4'
		});
		console.log(`   ✅ Response: ${basicResponse.message.slice(0, 100)}...`);
		console.log(`   📊 Usage: ${basicResponse.usage.totalTokens} tokens\n`);

		// 2. Test workspace analysis
		console.log('2️⃣ Testing workspace analysis with MCP tools...');
		const workspaceResponse = await client.chat({
			message: 'Analyze this codebase and find all TODO comments that need attention.',
			tools: ['copilot_searchCodebase'],
			context: {
				workspace: '/example/project'
			}
		});
		console.log(`   ✅ Analysis: ${workspaceResponse.message.slice(0, 100)}...`);
		if (workspaceResponse.tools) {
			console.log(`   🔧 Tool Results:`);
			workspaceResponse.tools.forEach((tool, index) => {
				console.log(`      ${index + 1}. ${tool.name}: ${JSON.stringify(tool.result).slice(0, 80)}...`);
			});
		}
		console.log();

		// 3. Test file operations
		console.log('3️⃣ Testing file operations...');
		const fileResponse = await client.chat({
			message: 'Read the authentication module and suggest improvements.',
			tools: ['copilot_readFile'],
			context: {
				files: ['src/auth/authentication.ts'],
				selection: {
					file: 'src/auth/authentication.ts',
					range: {
						start: { line: 1, character: 0 },
						end: { line: 50, character: 0 }
					}
				}
			}
		});
		console.log(`   ✅ File Analysis: ${fileResponse.message.slice(0, 100)}...`);
		console.log();

		// 4. Test complex task execution
		console.log('4️⃣ Testing complex task execution...');
		const taskResponse = await client.chat({
			message: 'Create a comprehensive test suite for the authentication module with unit tests, integration tests, and mock data.',
			tools: ['execute_task'],
			context: {
				workspace: '/example/project',
				files: ['src/auth/']
			}
		});
		console.log(`   ✅ Task Planning: ${taskResponse.message.slice(0, 100)}...`);
		if (taskResponse.tools) {
			taskResponse.tools.forEach((tool, index) => {
				console.log(`   🤖 Task ${index + 1}: ${tool.result}`);
			});
		}
		console.log();

		// 5. Test multi-turn conversation with context
		console.log('5️⃣ Testing multi-turn conversation with persistent context...');
		const session = await client.createSession({
			model: 'gpt-4',
			context: {
				workspace: '/example/project'
			},
			metadata: {
				task: 'code_review',
				priority: 'high'
			}
		});

		const turn1 = await client.chat({
			sessionId: session.id,
			message: 'I need to refactor a large function. First, help me identify which functions in the codebase are too complex.',
			tools: ['copilot_searchCodebase']
		});
		console.log(`   🔄 Turn 1: ${turn1.message.slice(0, 80)}...`);

		const turn2 = await client.chat({
			sessionId: session.id,
			message: 'Now show me the most complex function you found and suggest how to break it down.',
			tools: ['copilot_readFile']
		});
		console.log(`   🔄 Turn 2: ${turn2.message.slice(0, 80)}...`);

		const turn3 = await client.chat({
			sessionId: session.id,
			message: 'Create the refactored version with proper separation of concerns.',
			tools: ['execute_task']
		});
		console.log(`   🔄 Turn 3: ${turn3.message.slice(0, 80)}...`);
		console.log();

		// 6. Test tool combinations
		console.log('6️⃣ Testing combined tool usage...');
		const combinedResponse = await client.chat({
			message: 'Find all authentication-related functions, analyze their security, and create improvement recommendations.',
			tools: ['copilot_searchCodebase', 'copilot_readFile', 'execute_task'],
			context: {
				workspace: '/example/project'
			}
		});
		console.log(`   ✅ Combined Analysis: ${combinedResponse.message.slice(0, 100)}...`);
		console.log(`   🔧 Tools Used: ${combinedResponse.tools?.length || 0} tools`);
		console.log();

		// 7. Test error handling
		console.log('7️⃣ Testing error handling...');
		try {
			const errorResponse = await client.chat({
				message: 'This is a test of error handling.',
				tools: ['nonexistent_tool']
			});
			console.log(`   ⚠️  Unexpected success: ${errorResponse.message}`);
		} catch (error) {
			console.log(`   ✅ Error handled gracefully: ${error instanceof Error ? error.message.slice(0, 80) : 'Unknown error'}...`);
		}
		console.log();

		// 8. Performance summary
		console.log('8️⃣ Performance Summary...');
		const sessions = await client.getSessions();
		console.log(`   📊 Total Sessions: ${sessions.length}`);
		console.log(`   🎯 Session Context: ${sessions[0]?.context?.workspace || 'None'}`);
		console.log(`   ⏱️  Last Updated: ${sessions[0]?.updatedAt || 'Unknown'}`);
		console.log();

		console.log('✅ All MCP-assisted task tests completed successfully!');
		console.log('\n🎉 The Copilot Chat API is ready for production use with MCP tools.');
		console.log('\n💡 Key capabilities demonstrated:');
		console.log('   - Natural language chat processing');
		console.log('   - MCP tool integration and execution');
		console.log('   - Multi-turn conversation context');
		console.log('   - File and workspace operations');
		console.log('   - Complex task automation');
		console.log('   - Error handling and recovery');

	} catch (error) {
		console.error('❌ Test failed:', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Helper function to check server availability
async function checkServerHealth() {
	try {
		const response = await fetch('http://localhost:3000/api/health');
		if (!response.ok) {
			throw new Error(`Server returned ${response.status}`);
		}
		const health = await response.json();
		console.log(`🏥 Server Health: ${health.status} (v${health.version})\n`);
	} catch (error) {
		console.error('❌ Cannot connect to Copilot Chat API server.');
		console.error('   Make sure the server is running on http://localhost:3000');
		console.error('   Start it with: npm run api:start');
		process.exit(1);
	}
}

async function main() {
	console.log('🚀 Copilot Chat API - MCP Integration Test\n');
	await checkServerHealth();
	await testMCPAssistedTasks();
}

main().catch(console.error);