/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Simple logger for API operations
 */
export class ApiLogger {
	private logLevel: number;

	constructor(level: 'error' | 'warn' | 'info' | 'debug' = 'info') {
		const levels = { error: 0, warn: 1, info: 2, debug: 3 };
		this.logLevel = levels[level];
	}

	error(message: string, ...args: any[]): void {
		if (this.logLevel >= 0) {
			console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
		}
	}

	warn(message: string, ...args: any[]): void {
		if (this.logLevel >= 1) {
			console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
		}
	}

	info(message: string, ...args: any[]): void {
		if (this.logLevel >= 2) {
			console.info(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
		}
	}

	debug(message: string, ...args: any[]): void {
		if (this.logLevel >= 3) {
			console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
		}
	}
}