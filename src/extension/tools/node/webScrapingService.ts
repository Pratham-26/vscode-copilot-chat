/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { IFileService } from '../../../platform/fileSystem/common/fileSystem';
import { URI } from '../../../util/vs/base/common/uri';
import { PlaywrightMcpService } from './playwrightMcpService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';

export interface WebScrapingResult {
	pythonScript: string;
	extractedData: any;
	approach: 'http' | 'selenium';
	iterations: number;
}

export class WebScrapingService {
	constructor(
		@ILogService private readonly _logService: ILogService,
		@IFileService private readonly _fileService: IFileService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {}

	async processWebScraping(
		url: string,
		extractionFields: string[],
		token: CancellationToken
	): Promise<WebScrapingResult> {
		this._logService.info(`Starting web scraping for ${url} with fields: ${extractionFields.join(', ')}`);

		const playwrightService = this._instantiationService.createInstance(PlaywrightMcpService);

		try {
			// Step 1: Navigate to the page using Playwright MCP to inspect structure
			const pageInfo = await playwrightService.inspectPage(url, token);
			
			// Step 2: Find the datapoints specified
			const fieldMappings = await this._findDataPoints(pageInfo, extractionFields, token);
			
			// Step 3: Determine if HTTP request is enough or if Selenium is needed
			const approach = await this._determineScrapingApproach(pageInfo, fieldMappings);
			
			// Step 4: Generate initial Python script
			let pythonScript = this._generatePythonScript(url, fieldMappings, approach);
			
			// Step 5: Execute script and check output
			let extractedData = await this._executeScript(pythonScript, token);
			let iterations = 1;
			
			// Step 6: Iterative improvement
			while (iterations < 5 && !this._isDataComplete(extractedData, extractionFields)) {
				this._logService.info(`Iteration ${iterations + 1}: Refining script`);
				
				// Compare with original page data from Playwright and refine script
				const refinedScript = await this._refineScript(
					pythonScript, 
					extractedData, 
					pageInfo, 
					fieldMappings, 
					extractionFields,
					playwrightService,
					token
				);
				
				if (refinedScript === pythonScript) {
					// No changes, break to avoid infinite loop
					break;
				}
				
				pythonScript = refinedScript;
				extractedData = await this._executeScript(pythonScript, token);
				iterations++;
			}
			
			// Step 7: Save script locally
			await this._saveScript(pythonScript, url);
			
			return {
				pythonScript,
				extractedData,
				approach,
				iterations
			};

		} finally {
			// Clean up playwright session
			await playwrightService.cleanup();
		}
	}

	private async _findDataPoints(pageInfo: any, extractionFields: string[], token: CancellationToken): Promise<Map<string, string[]>> {
		this._logService.info(`Finding data points for fields: ${extractionFields.join(', ')}`);
		
		const fieldMappings = new Map<string, string[]>();
		
		// Use AI-powered matching between extraction fields and page structure
		for (const field of extractionFields) {
			const normalizedField = field.toLowerCase().trim();
			
			// Look for matching selectors in the page structure
			const potentialSelectors = pageInfo.structure?.selectors?.[normalizedField] || [];
			
			// Add some common patterns based on field name
			const commonPatterns = this._getCommonSelectorPatterns(normalizedField);
			
			fieldMappings.set(field, [...potentialSelectors, ...commonPatterns]);
		}
		
		return fieldMappings;
	}

	private _getCommonSelectorPatterns(fieldName: string): string[] {
		const patterns: { [key: string]: string[] } = {
			'product name': ['.product-name', '.title', 'h1', '.product-title', '[data-product-name]'],
			'price': ['.price', '.cost', '.amount', '[data-price]', '.product-price'],
			'currency': ['.currency', '.symbol', '.price-symbol', '[data-currency]'],
			'description': ['.description', '.product-description', '.details'],
			'rating': ['.rating', '.stars', '.score', '[data-rating]'],
			'availability': ['.availability', '.stock', '.in-stock', '[data-stock]']
		};
		
		return patterns[fieldName] || [`.${fieldName.replace(/\s+/g, '-')}`, `[data-${fieldName.replace(/\s+/g, '-')}]`];
	}

	private async _determineScrapingApproach(pageInfo: any, fieldMappings: Map<string, string[]>): Promise<'http' | 'selenium'> {
		// Determine if simple HTTP request + BeautifulSoup is enough or if Selenium is needed
		
		if (pageInfo.hasJavaScript && pageInfo.dynamicContent) {
			this._logService.info('JavaScript and dynamic content detected, using Selenium approach');
			return 'selenium';
		}
		
		// Check if any fields seem to require interaction or are loaded dynamically
		const requiresInteraction = Array.from(fieldMappings.values()).some(selectors =>
			selectors.some(selector => 
				selector.includes('button') || 
				selector.includes('click') || 
				selector.includes('load-more')
			)
		);
		
		if (requiresInteraction) {
			this._logService.info('Interactive elements detected, using Selenium approach');
			return 'selenium';
		}
		
		this._logService.info('Static content detected, using HTTP + BeautifulSoup approach');
		return 'http';
	}

	private _generatePythonScript(url: string, fieldMappings: Map<string, string[]>, approach: 'http' | 'selenium'): string {
		if (approach === 'selenium') {
			return this._generateSeleniumScript(url, fieldMappings);
		} else {
			return this._generateHttpScript(url, fieldMappings);
		}
	}

	private _generateHttpScript(url: string, fieldMappings: Map<string, string[]>): string {
		let script = `#!/usr/bin/env python3
"""
Web scraping script for ${url}
Using HTTP requests + BeautifulSoup approach
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
from urllib.parse import urljoin

def scrape_data():
    url = "${url}"
    
    # Set up headers to mimic a real browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Make HTTP request
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract data
        data = {}
        
`;

		// Add extraction logic for each field
		for (const [field, selectors] of fieldMappings) {
			script += `        # Extract ${field}\n`;
			script += `        ${field.replace(/\s+/g, '_').toLowerCase()}_value = None\n`;
			
			for (const selector of selectors) {
				script += `        if not ${field.replace(/\s+/g, '_').toLowerCase()}_value:\n`;
				script += `            element = soup.select_one("${selector}")\n`;
				script += `            if element:\n`;
				script += `                ${field.replace(/\s+/g, '_').toLowerCase()}_value = element.get_text(strip=True)\n`;
			}
			
			script += `        data["${field}"] = ${field.replace(/\s+/g, '_').toLowerCase()}_value\n\n`;
		}

		script += `        return data
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}", file=sys.stderr)
        return {}
    except Exception as e:
        print(f"Error parsing data: {e}", file=sys.stderr)
        return {}

if __name__ == "__main__":
    result = scrape_data()
    print(json.dumps(result, indent=2, ensure_ascii=False))
`;

		return script;
	}

	private _generateSeleniumScript(url: string, fieldMappings: Map<string, string[]>): string {
		let script = `#!/usr/bin/env python3
"""
Web scraping script for ${url}
Using Selenium WebDriver approach
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import json
import sys

def scrape_data():
    url = "${url}"
    
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    
    driver = None
    try:
        # Initialize WebDriver
        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url)
        
        # Wait for page to load
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        
        # Extract data
        data = {}
        
`;

		// Add extraction logic for each field
		for (const [field, selectors] of fieldMappings) {
			script += `        # Extract ${field}\n`;
			script += `        ${field.replace(/\s+/g, '_').toLowerCase()}_value = None\n`;
			
			for (const selector of selectors) {
				script += `        if not ${field.replace(/\s+/g, '_').toLowerCase()}_value:\n`;
				script += `            try:\n`;
				
				if (selector.startsWith('.')) {
					script += `                element = driver.find_element(By.CLASS_NAME, "${selector.substring(1)}")\n`;
				} else if (selector.startsWith('#')) {
					script += `                element = driver.find_element(By.ID, "${selector.substring(1)}")\n`;
				} else if (selector.startsWith('[') && selector.endsWith(']')) {
					const attr = selector.slice(1, -1).split('=')[0];
					script += `                element = driver.find_element(By.CSS_SELECTOR, "${selector}")\n`;
				} else {
					script += `                element = driver.find_element(By.CSS_SELECTOR, "${selector}")\n`;
				}
				
				script += `                ${field.replace(/\s+/g, '_').toLowerCase()}_value = element.text.strip()\n`;
				script += `            except (NoSuchElementException, TimeoutException):\n`;
				script += `                pass\n`;
			}
			
			script += `        data["${field}"] = ${field.replace(/\s+/g, '_').toLowerCase()}_value\n\n`;
		}

		script += `        return data
        
    except Exception as e:
        print(f"Error during scraping: {e}", file=sys.stderr)
        return {}
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    result = scrape_data()
    print(json.dumps(result, indent=2, ensure_ascii=False))
`;

		return script;
	}

	private async _executeScript(pythonScript: string, token: CancellationToken): Promise<any> {
		// In a real implementation, this would execute the Python script
		// For now, simulating execution result
		this._logService.info('Executing Python script');
		
		// Simulated execution result
		return {
			"product name": "Sample Product",
			"price": "$19.99",
			"currency": "USD"
		};
	}

	private _isDataComplete(extractedData: any, extractionFields: string[]): boolean {
		// Check if all requested fields have been extracted with non-null values
		return extractionFields.every(field => 
			extractedData.hasOwnProperty(field) && 
			extractedData[field] !== null && 
			extractedData[field] !== undefined &&
			extractedData[field] !== ''
		);
	}

	private async _refineScript(
		currentScript: string,
		extractedData: any,
		pageInfo: any,
		fieldMappings: Map<string, string[]>,
		extractionFields: string[],
		playwrightService: PlaywrightMcpService,
		token: CancellationToken
	): Promise<string> {
		// Analyze what went wrong and refine the script
		const missingFields = extractionFields.filter(field => 
			!extractedData[field] || extractedData[field] === null || extractedData[field] === ''
		);
		
		if (missingFields.length === 0) {
			return currentScript; // No refinement needed
		}
		
		this._logService.info(`Refining script for missing fields: ${missingFields.join(', ')}`);
		
		// Use Playwright to get more detailed information about missing fields
		const refinedMappings = await playwrightService.findAlternativeSelectors(missingFields, token);
		
		// Update field mappings with new selectors
		for (const [field, newSelectors] of refinedMappings) {
			const currentSelectors = fieldMappings.get(field) || [];
			fieldMappings.set(field, [...currentSelectors, ...newSelectors]);
		}
		
		// Regenerate script with updated mappings
		const approach = currentScript.includes('selenium') ? 'selenium' : 'http';
		return this._generatePythonScript(pageInfo.url, fieldMappings, approach);
	}

	private _getAggresiveSelectorPatterns(fieldName: string): string[] {
		// More aggressive patterns to try when initial extraction fails
		const normalized = fieldName.toLowerCase();
		return [
			`[title*="${normalized}"]`,
			`[alt*="${normalized}"]`,
			`[data-testid*="${normalized}"]`,
			`*:contains("${fieldName}")`,
			`span:contains("${fieldName}")`,
			`div:contains("${fieldName}")`,
			`p:contains("${fieldName}")`,
			`.${normalized}`,
			`#${normalized}`,
			`[name*="${normalized}"]`,
			`[class*="${normalized}"]`
		];
	}

	private async _saveScript(pythonScript: string, url: string): Promise<void> {
		// Save the script to a local file
		const fileName = `scraper_${new URL(url).hostname.replace(/\./g, '_')}_${Date.now()}.py`;
		const scriptPath = URI.file(`/tmp/${fileName}`);
		
		try {
			await this._fileService.writeFile(scriptPath, Buffer.from(pythonScript, 'utf8'));
			this._logService.info(`Script saved to ${scriptPath.fsPath}`);
		} catch (error) {
			this._logService.error('Failed to save script', error);
		}
	}
}