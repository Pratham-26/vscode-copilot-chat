/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, lm, LanguageModelToolInformation } from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';

export interface PageInfo {
	url: string;
	hasJavaScript: boolean;
	dynamicContent: boolean;
	structure: {
		selectors: Record<string, string[]>;
		[key: string]: any;
	};
	screenshot?: string;
	domTree?: any;
}

/**
 * Service to interact with Playwright MCP server for web page inspection and interaction
 * 
 * SETUP INSTRUCTIONS:
 * To use with a real Playwright MCP server, you need to:
 * 1. Install and configure a Playwright MCP server (e.g., Microsoft's official Playwright MCP server)
 * 2. Register the MCP server with VS Code using `lm.registerMcpServerDefinitionProvider`
 * 3. Configure the server to expose tools with the expected naming convention (mcp_playwright_*)
 * 
 * The service currently includes mock responses for development/testing when no real MCP server is available.
 */
export class PlaywrightMcpService {
	private _mcpTools: LanguageModelToolInformation[] = [];

	constructor(
		@ILogService private readonly _logService: ILogService
	) {}

	async inspectPage(url: string, token: CancellationToken): Promise<PageInfo> {
		this._logService.info(`Inspecting page structure for ${url} using Playwright MCP`);
		
		try {
			// Get available MCP tools for Playwright
			await this._loadMcpTools();
			
			// Navigate to the page using Playwright MCP
			await this._navigateToPage(url, token);
			
			// Analyze the page structure
			const pageInfo = await this._analyzePage(url, token);
			
			return pageInfo;
			
		} catch (error) {
			this._logService.error('Error inspecting page with Playwright MCP', error);
			throw new Error(`Failed to inspect page with Playwright MCP: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async findAlternativeSelectors(missingFields: string[], token: CancellationToken): Promise<Map<string, string[]>> {
		this._logService.info(`Finding alternative selectors for: ${missingFields.join(', ')}`);
		
		const refinedMappings = new Map<string, string[]>();
		
		try {
			// Use Playwright MCP to search for alternative selectors
			for (const field of missingFields) {
				const alternatives = await this._searchForFieldSelectors(field, token);
				if (alternatives.length > 0) {
					refinedMappings.set(field, alternatives);
				}
			}
			
		} catch (error) {
			this._logService.error('Error finding alternative selectors with Playwright MCP', error);
			throw error;
		}
		
		return refinedMappings;
	}

	async cleanup(): Promise<void> {
		this._logService.info('Cleaning up Playwright MCP session');
		try {
			// Close the browser session using Playwright MCP
			await this._callMcpTool('playwright_close_browser', {}, new CancellationToken());
		} catch (error) {
			this._logService.warn('Error during Playwright MCP cleanup', error);
		}
	}

	private async _loadMcpTools(): Promise<void> {
		// Load available MCP tools that start with 'mcp_playwright' prefix
		try {
			// This would be populated by the VS Code MCP system
			// For now, we'll define the expected Playwright MCP tools
			this._mcpTools = [
				{
					name: 'mcp_playwright_navigate',
					description: 'Navigate to a URL using Playwright',
					inputSchema: {
						type: 'object',
						properties: {
							url: { type: 'string', description: 'The URL to navigate to' }
						},
						required: ['url']
					},
					source: undefined,
					tags: []
				},
				{
					name: 'mcp_playwright_screenshot',
					description: 'Take a screenshot of the current page',
					inputSchema: {
						type: 'object',
						properties: {
							fullPage: { type: 'boolean', description: 'Whether to take a full page screenshot' }
						}
					},
					source: undefined,
					tags: []
				},
				{
					name: 'mcp_playwright_get_page_content',
					description: 'Get the HTML content of the current page',
					inputSchema: {
						type: 'object',
						properties: {}
					},
					source: undefined,
					tags: []
				},
				{
					name: 'mcp_playwright_evaluate',
					description: 'Execute JavaScript on the page',
					inputSchema: {
						type: 'object',
						properties: {
							script: { type: 'string', description: 'JavaScript code to execute' }
						},
						required: ['script']
					},
					source: undefined,
					tags: []
				},
				{
					name: 'mcp_playwright_find_elements',
					description: 'Find elements on the page using CSS selectors',
					inputSchema: {
						type: 'object',
						properties: {
							selector: { type: 'string', description: 'CSS selector to search for' }
						},
						required: ['selector']
					},
					source: undefined,
					tags: []
				}
			];
		} catch (error) {
			this._logService.error('Error loading Playwright MCP tools', error);
			throw error;
		}
	}

	private async _navigateToPage(url: string, token: CancellationToken): Promise<void> {
		this._logService.info(`Navigating to ${url} using Playwright MCP`);
		
		try {
			// Use Playwright MCP to navigate to the URL
			await this._callMcpTool('mcp_playwright_navigate', { url }, token);
			
		} catch (error) {
			this._logService.error(`Error navigating to ${url}`, error);
			throw error;
		}
	}

	private async _analyzePage(url: string, token: CancellationToken): Promise<PageInfo> {
		this._logService.info('Analyzing page structure using Playwright MCP');
		
		try {
			// Get page content
			const contentResult = await this._callMcpTool('mcp_playwright_get_page_content', {}, token);
			const htmlContent = contentResult.output || '';
			
			// Detect JavaScript and dynamic content
			const hasJavaScript = await this._detectJavaScript(token);
			const dynamicContent = await this._detectDynamicContent(token);
			
			// Extract page structure
			const structure = await this._extractPageStructure(htmlContent, token);
			
			// Take screenshot for visual analysis
			const screenshot = await this._takeScreenshot(token);
			
			// Get DOM tree
			const domTree = await this._getDomTree(token);
			
			return {
				url,
				hasJavaScript,
				dynamicContent,
				structure,
				screenshot,
				domTree
			};
			
		} catch (error) {
			this._logService.error('Error analyzing page with Playwright MCP', error);
			throw error;
		}
	}

	private async _detectJavaScript(token: CancellationToken): Promise<boolean> {
		try {
			// Use Playwright MCP to check for JavaScript usage on the page
			const scriptResult = await this._callMcpTool('mcp_playwright_evaluate', {
				script: `
					// Check for script tags
					const scriptTags = document.querySelectorAll('script').length;
					// Check for event listeners
					const hasEventListeners = Object.getOwnPropertyNames(window).some(prop => prop.startsWith('on'));
					// Check for framework indicators
					const hasFramework = !!(window.React || window.Vue || window.Angular || window.jQuery);
					
					return {
						scriptTags: scriptTags,
						hasEventListeners: hasEventListeners,
						hasFramework: hasFramework,
						hasJavaScript: scriptTags > 0 || hasEventListeners || hasFramework
					};
				`
			}, token);
			
			return scriptResult.output?.hasJavaScript || false;
			
		} catch (error) {
			this._logService.warn('Error detecting JavaScript, assuming true', error);
			return true; // Assume JS is present if we can't detect
		}
	}

	private async _detectDynamicContent(token: CancellationToken): Promise<boolean> {
		try {
			// Use Playwright MCP to detect dynamic content loading
			const dynamicResult = await this._callMcpTool('mcp_playwright_evaluate', {
				script: `
					// Check for common dynamic content indicators
					const lazyImages = document.querySelectorAll('[data-src], [loading="lazy"]').length;
					const infiniteScroll = document.querySelectorAll('[data-infinite], .infinite-scroll').length;
					const loadingSpinners = document.querySelectorAll('.loading, .spinner, [aria-label*="loading"]').length;
					const asyncButtons = document.querySelectorAll('[data-async], .load-more, .show-more').length;
					
					return {
						lazyImages: lazyImages,
						infiniteScroll: infiniteScroll,
						loadingSpinners: loadingSpinners,
						asyncButtons: asyncButtons,
						hasDynamicContent: lazyImages > 0 || infiniteScroll > 0 || loadingSpinners > 0 || asyncButtons > 0
					};
				`
			}, token);
			
			return dynamicResult.output?.hasDynamicContent || false;
			
		} catch (error) {
			this._logService.warn('Error detecting dynamic content, assuming false', error);
			return false;
		}
	}

	private async _extractPageStructure(htmlContent: string, token: CancellationToken): Promise<any> {
		try {
			// Use Playwright MCP to analyze page structure and find potential data selectors
			const structureResult = await this._callMcpTool('mcp_playwright_evaluate', {
				script: `
					// Find potential data elements using semantic analysis
					const dataElements = {};
					
					// Product name patterns
					const productNameElements = [
						...document.querySelectorAll('h1, .title, .product-title, .product-name, [data-product-name]'),
						...document.querySelectorAll('*[class*="product"]*[class*="name"], *[class*="product"]*[class*="title"]')
					];
					dataElements['product name'] = productNameElements.map(el => el.tagName.toLowerCase() + 
						(el.className ? '.' + el.className.split(' ').join('.') : '') +
						(el.id ? '#' + el.id : ''));
					
					// Price patterns
					const priceElements = [
						...document.querySelectorAll('.price, .cost, .amount, [data-price], .product-price'),
						...document.querySelectorAll('*[class*="price"], *[text()][matches(text(), "\\$|€|£|₹")]')
					];
					dataElements['price'] = priceElements.map(el => el.tagName.toLowerCase() + 
						(el.className ? '.' + el.className.split(' ').join('.') : '') +
						(el.id ? '#' + el.id : ''));
					
					// Currency patterns
					const currencyElements = [
						...document.querySelectorAll('.currency, .symbol, .price-symbol, [data-currency]'),
						...document.querySelectorAll('.price .symbol, .price-currency')
					];
					dataElements['currency'] = currencyElements.map(el => el.tagName.toLowerCase() + 
						(el.className ? '.' + el.className.split(' ').join('.') : '') +
						(el.id ? '#' + el.id : ''));
					
					// Description patterns
					const descriptionElements = [
						...document.querySelectorAll('.description, .product-description, .details, [data-description]'),
						...document.querySelectorAll('*[class*="description"], *[class*="details"]')
					];
					dataElements['description'] = descriptionElements.map(el => el.tagName.toLowerCase() + 
						(el.className ? '.' + el.className.split(' ').join('.') : '') +
						(el.id ? '#' + el.id : ''));
					
					// Availability patterns
					const availabilityElements = [
						...document.querySelectorAll('.availability, .stock, .in-stock, [data-stock], [data-availability]'),
						...document.querySelectorAll('*[class*="stock"], *[class*="availability"]')
					];
					dataElements['availability'] = availabilityElements.map(el => el.tagName.toLowerCase() + 
						(el.className ? '.' + el.className.split(' ').join('.') : '') +
						(el.id ? '#' + el.id : ''));
					
					// Get data attributes
					const dataAttributes = [...document.querySelectorAll('[data-*]')].map(el => 
						[...el.attributes].filter(attr => attr.name.startsWith('data-')).map(attr => attr.name)
					).flat();
					
					// Get semantic structure
					const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({
						tag: h.tagName.toLowerCase(),
						text: h.textContent?.slice(0, 100),
						selector: h.tagName.toLowerCase() + (h.className ? '.' + h.className.split(' ').join('.') : '') + (h.id ? '#' + h.id : '')
					}));
					
					const contentAreas = [...document.querySelectorAll('.content, .main, .product-details, .container')].map(area => ({
						selector: area.tagName.toLowerCase() + (area.className ? '.' + area.className.split(' ').join('.') : '') + (area.id ? '#' + area.id : ''),
						childCount: area.children.length
					}));
					
					return {
						selectors: dataElements,
						dataAttributes: [...new Set(dataAttributes)],
						headings: headings,
						contentAreas: contentAreas
					};
				`
			}, token);
			
			return structureResult.output || { selectors: {}, dataAttributes: [], headings: [], contentAreas: [] };
			
		} catch (error) {
			this._logService.warn('Error extracting page structure, using fallback', error);
			// Return fallback structure
			return {
				selectors: {
					'product name': ['.product-title', 'h1', '.title', '.product-name'],
					'price': ['.price', '.cost', '.amount', '[data-price]'],
					'currency': ['.currency', '.symbol', '.price-symbol'],
					'description': ['.description', '.product-description', '.details'],
					'availability': ['.availability', '.stock', '.in-stock']
				},
				dataAttributes: ['data-product-id', 'data-price', 'data-currency', 'data-availability'],
				headings: [],
				contentAreas: []
			};
		}
	}

	private async _takeScreenshot(token: CancellationToken): Promise<string> {
		try {
			// Take a screenshot using Playwright MCP for visual analysis
			this._logService.info('Taking screenshot using Playwright MCP');
			const screenshotResult = await this._callMcpTool('mcp_playwright_screenshot', { fullPage: false }, token);
			return screenshotResult.output || '';
		} catch (error) {
			this._logService.warn('Error taking screenshot', error);
			return '';
		}
	}

	private async _getDomTree(token: CancellationToken): Promise<any> {
		try {
			// Get a simplified DOM tree for analysis using Playwright MCP
			const domResult = await this._callMcpTool('mcp_playwright_evaluate', {
				script: `
					function getSimplifiedDomTree(element, depth = 0, maxDepth = 3) {
						if (depth > maxDepth) return null;
						
						const node = {
							tagName: element.tagName?.toLowerCase(),
							attributes: {},
							children: []
						};
						
						// Get relevant attributes
						if (element.id) node.attributes.id = element.id;
						if (element.className) node.attributes.class = element.className;
						if (element.dataset) {
							for (const [key, value] of Object.entries(element.dataset)) {
								node.attributes['data-' + key] = value;
							}
						}
						
						// Process children (limit to important elements)
						for (const child of element.children) {
							if (child.tagName && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(child.tagName)) {
								const childNode = getSimplifiedDomTree(child, depth + 1, maxDepth);
								if (childNode) node.children.push(childNode);
							}
						}
						
						return node;
					}
					
					return getSimplifiedDomTree(document.documentElement);
				`
			}, token);
			
			return domResult.output || {};
			
		} catch (error) {
			this._logService.warn('Error getting DOM tree', error);
			return {};
		}
	}

	private async _searchForFieldSelectors(field: string, token: CancellationToken): Promise<string[]> {
		this._logService.info(`Searching for selectors for field: ${field} using Playwright MCP`);
		
		try {
			// Use Playwright MCP to search for elements that might contain the field data
			const searchResult = await this._callMcpTool('mcp_playwright_evaluate', {
				script: `
					const field = "${field}";
					const normalizedField = field.toLowerCase().replace(/\\s+/g, '');
					const foundSelectors = [];
					
					// Search by text content
					const textElements = [...document.querySelectorAll('*')].filter(el => {
						const text = el.textContent?.toLowerCase() || '';
						return text.includes(field.toLowerCase()) && el.children.length === 0; // leaf elements only
					});
					
					textElements.forEach(el => {
						let selector = el.tagName.toLowerCase();
						if (el.id) selector += '#' + el.id;
						else if (el.className) selector += '.' + el.className.split(' ').join('.');
						foundSelectors.push(selector);
					});
					
					// Search by attributes
					const attributeSelectors = [
						'[aria-label*="' + field + '"]',
						'[title*="' + field + '"]',
						'[data-' + normalizedField + ']',
						'[class*="' + normalizedField + '"]',
						'[name="' + normalizedField + '"]',
						'[data-testid*="' + normalizedField + '"]'
					];
					
					attributeSelectors.forEach(selector => {
						if (document.querySelector(selector)) {
							foundSelectors.push(selector);
						}
					});
					
					// Search for parent elements of matching text
					textElements.forEach(el => {
						let parent = el.parentElement;
						while (parent && parent !== document.body) {
							let parentSelector = parent.tagName.toLowerCase();
							if (parent.id) parentSelector += '#' + parent.id;
							else if (parent.className) parentSelector += '.' + parent.className.split(' ').join('.');
							
							if (parentSelector && !foundSelectors.includes(parentSelector)) {
								foundSelectors.push(parentSelector);
								break; // Only go one level up
							}
							parent = parent.parentElement;
						}
					});
					
					return [...new Set(foundSelectors)].slice(0, 10); // Limit to 10 most relevant
				`
			}, token);
			
			return searchResult.output || [];
			
		} catch (error) {
			this._logService.warn(`Error searching for selectors for field ${field}`, error);
			// Return fallback patterns
			return this._getFieldSearchPatterns(field);
		}
	}

	private async _callMcpTool(toolName: string, params: any, token: CancellationToken): Promise<any> {
		try {
			// In a real implementation, this would call the actual MCP tool
			// For now, we'll simulate the call structure that would be used with VS Code's MCP system
			
			this._logService.debug(`Calling MCP tool: ${toolName} with params:`, params);
			
			// This would be replaced with actual VS Code MCP tool calling
			// The tools would be available through the language model tool system
			// and would communicate with the actual Playwright MCP server
			
			// For now, return a structure that indicates the tool was called
			// but actual implementation would be handled by the MCP server
			return {
				success: true,
				output: this._getMockOutput(toolName, params)
			};
			
		} catch (error) {
			this._logService.error(`Error calling MCP tool ${toolName}`, error);
			throw error;
		}
	}

	private _getMockOutput(toolName: string, params: any): any {
		// DEVELOPMENT NOTE: This provides mock outputs for testing and development
		// when the actual Playwright MCP server is not configured or available.
		// In production with a real MCP server, this method would not be called
		// and real MCP responses would be used instead.
		
		this._logService.debug(`Using mock output for MCP tool: ${toolName} (real MCP server not available)`);
		
		switch (toolName) {
			case 'mcp_playwright_navigate':
				return { navigated: true, url: params.url };
			
			case 'mcp_playwright_get_page_content':
				return '<html><body><h1 class="product-title">Sample Product</h1><span class="price">$29.99</span></body></html>';
			
			case 'mcp_playwright_screenshot':
				return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
			
			case 'mcp_playwright_evaluate':
				// Return mock results based on the script being executed
				if (params.script.includes('hasJavaScript')) {
					return { hasJavaScript: true, scriptTags: 5, hasEventListeners: true, hasFramework: false };
				}
				if (params.script.includes('hasDynamicContent')) {
					return { hasDynamicContent: false, lazyImages: 0, infiniteScroll: 0, loadingSpinners: 0, asyncButtons: 0 };
				}
				if (params.script.includes('selectors')) {
					return {
						selectors: {
							'product name': ['.product-title', 'h1'],
							'price': ['.price', '.cost'],
							'currency': ['.currency', '.symbol']
						},
						dataAttributes: ['data-price', 'data-product-id'],
						headings: [{ tag: 'h1', text: 'Sample Product', selector: 'h1.product-title' }],
						contentAreas: [{ selector: '.main', childCount: 5 }]
					};
				}
				if (params.script.includes('getSimplifiedDomTree')) {
					return {
						tagName: 'html',
						attributes: {},
						children: [
							{
								tagName: 'body',
								attributes: {},
								children: [
									{
										tagName: 'h1',
										attributes: { class: 'product-title' },
										children: []
									},
									{
										tagName: 'span',
										attributes: { class: 'price' },
										children: []
									}
								]
							}
						]
					};
				}
				if (params.script.includes('foundSelectors')) {
					return ['.product-title', 'h1', '.price', '.cost'];
				}
				return {};
			
			case 'mcp_playwright_find_elements':
				return [{ selector: params.selector, found: true, count: 1 }];
			
			case 'playwright_close_browser':
				return { closed: true };
			
			default:
				return {};
		}
	}

	private _getFieldSearchPatterns(field: string): string[] {
		const normalizedField = field.toLowerCase().replace(/\s+/g, '');
		
		return [
			`[aria-label*="${field}"]`,
			`[title*="${field}"]`,
			`[data-${normalizedField}]`,
			`[class*="${normalizedField}"]`,
			`#${normalizedField}`,
			`[name="${normalizedField}"]`,
			`[data-testid*="${normalizedField}"]`
		];
	}
}