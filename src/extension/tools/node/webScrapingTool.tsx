/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BasePromptElementProps, PromptElement, TextChunk } from '@vscode/prompt-tsx';
import { CancellationToken, LanguageModelPromptTsxPart, LanguageModelTextPart, LanguageModelToolInvocationOptions, LanguageModelToolInvocationPrepareOptions, LanguageModelToolResult, PreparedToolInvocation, ProviderResult } from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { renderPromptElementJSON } from '../../prompts/node/base/promptRenderer';
import { ToolName } from '../common/toolNames';
import { ICopilotTool, ToolRegistry } from '../common/toolsRegistry';
import { WebScrapingService } from './webScrapingService';

interface IWebScrapingParams {
	url: string;
	extractionFields: string[];
}

/**
 * Tool for web scraping using Playwright MCP to extract data and generate Python scripts
 */
class WebScrapingTool implements ICopilotTool<IWebScrapingParams> {

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@ILogService private readonly _logService: ILogService
	) {}

	public static readonly toolName = ToolName.WebScraping;

	prepareInvocation(_options: LanguageModelToolInvocationPrepareOptions<IWebScrapingParams>, _token: CancellationToken): ProviderResult<PreparedToolInvocation> {
		this._logService.trace('WebScrapingTool: prepareInvocation');
		return {
			presentation: 'always'
		};
	}

	async invoke(options: LanguageModelToolInvocationOptions<IWebScrapingParams>, token: CancellationToken): Promise<LanguageModelToolResult> {
		this._logService.trace('WebScrapingTool: invoke');
		
		const webScrapingService = this._instantiationService.createInstance(WebScrapingService);
		
		try {
			const result = await webScrapingService.processWebScraping(
				options.input.url,
				options.input.extractionFields,
				token
			);

			const element = await renderPromptElementJSON(
				this._instantiationService,
				WebScrapingResults,
				{ result },
				options.tokenizationOptions,
				token
			);

			return new LanguageModelToolResult([new LanguageModelPromptTsxPart(element)]);
		} catch (error) {
			this._logService.error('WebScrapingTool: Error during web scraping', error);
			return new LanguageModelToolResult([
				new LanguageModelTextPart(`Error during web scraping: ${error instanceof Error ? error.message : String(error)}`)
			]);
		}
	}
}

ToolRegistry.registerTool(WebScrapingTool);

interface WebScrapingResultsProps extends BasePromptElementProps {
	result: {
		pythonScript: string;
		extractedData: any;
		approach: 'http' | 'selenium';
		iterations: number;
	};
}

class WebScrapingResults extends PromptElement<WebScrapingResultsProps, void> {
	render() {
		const { result } = this.props;
		
		return <>
			<TextChunk>Web scraping completed successfully using {result.approach} approach after {result.iterations} iteration(s).</TextChunk>
			
			<TextChunk>Generated Python Script:</TextChunk>
			<TextChunk>```python
{result.pythonScript}
```</TextChunk>

			<TextChunk>Extracted Data:</TextChunk>
			<TextChunk>```json
{JSON.stringify(result.extractedData, null, 2)}
```</TextChunk>
		</>;
	}
}