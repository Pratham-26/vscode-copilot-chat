/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { IFileService } from '../../../platform/fileSystem/common/fileSystem';
import { URI } from '../../../util/vs/base/common/uri';
import { spawn } from 'child_process';

export interface ScriptExecutionResult {
	success: boolean;
	output: any;
	error?: string;
}

/**
 * Service to execute Python scripts and manage the execution environment
 */
export class PythonScriptExecutorService {
	constructor(
		@ILogService private readonly _logService: ILogService,
		@IFileService private readonly _fileService: IFileService
	) {}

	async executeScript(pythonScript: string, token: CancellationToken): Promise<ScriptExecutionResult> {
		this._logService.info('Executing Python script');
		
		try {
			// Save script to temporary file
			const scriptPath = await this._saveScriptTemporarily(pythonScript);
			
			// Execute the script
			const result = await this._runPythonScript(scriptPath, token);
			
			// Clean up temporary file
			await this._cleanupTempFile(scriptPath);
			
			return result;
			
		} catch (error) {
			this._logService.error('Error executing Python script', error);
			return {
				success: false,
				output: {},
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async checkPythonEnvironment(): Promise<{ available: boolean; version?: string; packages: string[] }> {
		this._logService.info('Checking Python environment');
		
		try {
			// Check if Python is available
			const pythonCheck = await this._runCommand('python3', ['--version']);
			if (!pythonCheck.success && pythonCheck.error?.includes('not found')) {
				// Try 'python' command
				const altCheck = await this._runCommand('python', ['--version']);
				if (!altCheck.success) {
					return { available: false, packages: [] };
				}
			}
			
			// Check for required packages
			const requiredPackages = ['requests', 'beautifulsoup4', 'selenium'];
			const availablePackages: string[] = [];
			
			for (const pkg of requiredPackages) {
				const checkPkg = await this._runCommand('python3', ['-c', `import ${pkg.replace('beautifulsoup4', 'bs4').replace('-', '_')}; print('${pkg}')`]);
				if (checkPkg.success) {
					availablePackages.push(pkg);
				}
			}
			
			return {
				available: true,
				version: pythonCheck.output || altCheck?.output,
				packages: availablePackages
			};
			
		} catch (error) {
			this._logService.error('Error checking Python environment', error);
			return { available: false, packages: [] };
		}
	}

	async installRequiredPackages(missingPackages: string[]): Promise<boolean> {
		if (missingPackages.length === 0) {
			return true;
		}
		
		this._logService.info(`Installing missing packages: ${missingPackages.join(', ')}`);
		
		try {
			// Try pip install
			const installCmd = await this._runCommand('pip3', ['install', ...missingPackages]);
			if (!installCmd.success) {
				// Try alternative pip command
				const altInstall = await this._runCommand('pip', ['install', ...missingPackages]);
				return altInstall.success;
			}
			return true;
			
		} catch (error) {
			this._logService.error('Error installing packages', error);
			return false;
		}
	}

	private async _saveScriptTemporarily(script: string): Promise<URI> {
		const fileName = `scraper_${Date.now()}.py`;
		const scriptPath = URI.file(`/tmp/${fileName}`);
		
		await this._fileService.writeFile(scriptPath, Buffer.from(script, 'utf8'));
		this._logService.info(`Script saved temporarily to ${scriptPath.fsPath}`);
		
		return scriptPath;
	}

	private async _runPythonScript(scriptPath: URI, token: CancellationToken): Promise<ScriptExecutionResult> {
		return new Promise((resolve) => {
			const python = spawn('python3', [scriptPath.fsPath], {
				stdio: ['pipe', 'pipe', 'pipe']
			});

			let stdout = '';
			let stderr = '';

			python.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			python.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			python.on('close', (code) => {
				if (code === 0) {
					try {
						const output = JSON.parse(stdout.trim());
						resolve({
							success: true,
							output
						});
					} catch (parseError) {
						// If JSON parsing fails, return raw output
						resolve({
							success: true,
							output: { raw: stdout.trim() }
						});
					}
				} else {
					resolve({
						success: false,
						output: {},
						error: stderr || `Process exited with code ${code}`
					});
				}
			});

			python.on('error', (error) => {
				resolve({
					success: false,
					output: {},
					error: error.message
				});
			});

			// Handle cancellation
			token.onCancellationRequested(() => {
				python.kill();
				resolve({
					success: false,
					output: {},
					error: 'Script execution was cancelled'
				});
			});
		});
	}

	private async _runCommand(command: string, args: string[]): Promise<{ success: boolean; output?: string; error?: string }> {
		return new Promise((resolve) => {
			const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
			
			let stdout = '';
			let stderr = '';

			proc.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			proc.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			proc.on('close', (code) => {
				resolve({
					success: code === 0,
					output: stdout.trim(),
					error: stderr.trim() || undefined
				});
			});

			proc.on('error', (error) => {
				resolve({
					success: false,
					error: error.message
				});
			});
		});
	}

	private async _cleanupTempFile(scriptPath: URI): Promise<void> {
		try {
			if (await this._fileService.exists(scriptPath)) {
				await this._fileService.del(scriptPath);
				this._logService.info(`Cleaned up temporary file: ${scriptPath.fsPath}`);
			}
		} catch (error) {
			this._logService.warn('Failed to clean up temporary file', error);
		}
	}
}