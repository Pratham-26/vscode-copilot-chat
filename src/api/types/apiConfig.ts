/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * API Configuration interface
 */
export interface IApiConfig {
	port: number;
	host: string;
	logLevel: 'error' | 'warn' | 'info' | 'debug';
	authentication: {
		required: boolean;
		apiKey?: string;
		githubToken?: string;
	};
	models: {
		default: string;
		available: string[];
	};
	cors: {
		origin: string | string[];
		methods: string[];
		headers: string[];
	};
	limits: {
		maxRequestSize: number;
		maxTokens: number;
		rateLimit: {
			windowMs: number;
			maxRequests: number;
		};
	};
}

/**
 * Default API configuration
 */
export class ApiConfig implements IApiConfig {
	public readonly port: number;
	public readonly host: string;
	public readonly logLevel: 'error' | 'warn' | 'info' | 'debug';
	public readonly authentication: {
		required: boolean;
		apiKey?: string;
		githubToken?: string;
	};
	public readonly models: {
		default: string;
		available: string[];
	};
	public readonly cors: {
		origin: string | string[];
		methods: string[];
		headers: string[];
	};
	public readonly limits: {
		maxRequestSize: number;
		maxTokens: number;
		rateLimit: {
			windowMs: number;
			maxRequests: number;
		};
	};

	constructor(config: Partial<IApiConfig> = {}) {
		this.port = config.port ?? parseInt(process.env.COPILOT_API_PORT || '3000');
		this.host = config.host ?? process.env.COPILOT_API_HOST ?? 'localhost';
		this.logLevel = config.logLevel ?? (process.env.COPILOT_API_LOG_LEVEL as any) ?? 'info';

		this.authentication = {
			required: config.authentication?.required ?? true,
			apiKey: config.authentication?.apiKey ?? process.env.COPILOT_API_KEY,
			githubToken: config.authentication?.githubToken ?? process.env.GITHUB_TOKEN,
		};

		this.models = {
			default: config.models?.default ?? 'gpt-4',
			available: config.models?.available ?? [
				'gpt-4',
				'gpt-4-turbo',
				'gpt-3.5-turbo',
				'claude-3-opus',
				'claude-3-sonnet',
			],
		};

		this.cors = {
			origin: config.cors?.origin ?? '*',
			methods: config.cors?.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			headers: config.cors?.headers ?? ['Content-Type', 'Authorization'],
		};

		this.limits = {
			maxRequestSize: config.limits?.maxRequestSize ?? 1024 * 1024 * 10, // 10MB
			maxTokens: config.limits?.maxTokens ?? 4096,
			rateLimit: {
				windowMs: config.limits?.rateLimit?.windowMs ?? 60 * 1000, // 1 minute
				maxRequests: config.limits?.rateLimit?.maxRequests ?? 100,
			},
		};
	}
}

/**
 * Chat request interface
 */
export interface IChatRequest {
	message: string;
	sessionId?: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
	tools?: string[];
	context?: {
		files?: string[];
		selection?: {
			file: string;
			range: {
				start: { line: number; character: number };
				end: { line: number; character: number };
			};
		};
		workspace?: string;
	};
	variables?: Record<string, any>;
}

/**
 * Chat response interface
 */
export interface IChatResponse {
	id: string;
	sessionId: string;
	message: string;
	model: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	tools?: IToolCall[];
	timestamp: string;
	references?: IChatReference[];
}

/**
 * Tool call interface
 */
export interface IToolCall {
	id: string;
	name: string;
	arguments: Record<string, any>;
	result?: any;
	error?: string;
}

/**
 * Chat reference interface
 */
export interface IChatReference {
	type: 'file' | 'symbol' | 'url' | 'workspace';
	uri: string;
	range?: {
		start: { line: number; character: number };
		end: { line: number; character: number };
	};
	description?: string;
}

/**
 * Session interface
 */
export interface IChatSession {
	id: string;
	createdAt: string;
	updatedAt: string;
	model: string;
	context?: {
		workspace?: string;
		files?: string[];
	};
	metadata?: Record<string, any>;
}

/**
 * Model information interface
 */
export interface IModelInfo {
	id: string;
	name: string;
	description: string;
	maxTokens: number;
	supportsToolCalls: boolean;
	supportsVision: boolean;
	provider: string;
}

/**
 * Tool information interface
 */
export interface IToolInfo {
	id: string;
	name: string;
	description: string;
	schema: Record<string, any>;
	category: string;
	provider: 'mcp' | 'builtin';
}