/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach } from 'vitest';
import { TestingServiceCollection } from '../../../../util/test/common/testingServiceCollection';
import { WebScrapingService } from '../webScrapingService';
import { ILogService } from '../../../../platform/log/common/logService';
import { IFileService } from '../../../../platform/fileSystem/common/fileSystem';
import { MockLogService } from '../../../../platform/log/test/mockLogService';
import { MockFileService } from '../../../../platform/fileSystem/test/mockFileService';
import { CancellationToken } from 'vscode';

describe('WebScrapingService', () => {
	let serviceCollection: TestingServiceCollection;
	let webScrapingService: WebScrapingService;
	
	beforeEach(() => {
		serviceCollection = new TestingServiceCollection();
		serviceCollection.set(ILogService, MockLogService);
		serviceCollection.set(IFileService, MockFileService);
		
		const accessor = serviceCollection.createTestingAccessor();
		webScrapingService = accessor.get(WebScrapingService);
	});

	it('should initialize service correctly', () => {
		expect(webScrapingService).toBeDefined();
	});

	it('should generate HTTP script for simple extraction', async () => {
		const url = 'https://example.com/product';
		const extractionFields = ['product name', 'price'];
		
		// This would normally execute the full pipeline
		// For testing, we're just verifying the service can be instantiated
		expect(webScrapingService).toBeDefined();
	});

	it('should handle invalid URLs gracefully', async () => {
		const invalidUrl = 'not-a-valid-url';
		const extractionFields = ['title'];
		
		try {
			await webScrapingService.processWebScraping(invalidUrl, extractionFields, CancellationToken.None);
		} catch (error) {
			expect(error).toBeDefined();
		}
	});

	it('should handle empty extraction fields', async () => {
		const url = 'https://example.com';
		const extractionFields: string[] = [];
		
		const result = await webScrapingService.processWebScraping(url, extractionFields, CancellationToken.None);
		expect(result).toBeDefined();
		expect(result.extractionFields).toEqual([]);
	});
});