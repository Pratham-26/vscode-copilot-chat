# Web Scraping Tool Implementation

## Overview

This implementation provides a comprehensive web scraping service that integrates with VS Code Copilot Chat and uses the Playwright MCP (Model Context Protocol) to extract data from web pages and generate Python scripts for automated scraping.

## Key Features

### 🎯 **Smart Page Analysis**
- Uses Playwright MCP to navigate and inspect web pages
- Automatically detects JavaScript usage and dynamic content
- Takes screenshots and analyzes DOM structure
- Identifies optimal CSS selectors for data extraction

### 🐍 **Python Script Generation**
- Generates HTTP + BeautifulSoup scripts for static content
- Creates Selenium WebDriver scripts for dynamic content
- Includes proper error handling and retry logic
- Supports common web scraping patterns

### 🔄 **Iterative Improvement**
- Executes generated scripts and validates output
- Automatically refines scripts when data extraction fails
- Uses Playwright MCP to find alternative selectors
- Switches between HTTP and Selenium approaches as needed

### 🛡️ **Robust Error Handling**
- Validates URLs and input parameters
- Checks Python environment and installs dependencies
- Handles network timeouts and parsing errors
- Provides meaningful error messages and fallbacks

## Architecture

```
WebScrapingTool (VSCode Tool)
├── WebScrapingService (Main Logic)
│   ├── PlaywrightMcpService (Page Inspection)
│   └── PythonScriptExecutorService (Script Execution)
└── Generated Python Scripts (Output)
```

## File Structure

```
src/extension/tools/node/
├── webScrapingTool.tsx           # VS Code tool registration
├── webScrapingService.ts         # Main service logic
├── playwrightMcpService.ts       # Playwright MCP integration
├── pythonScriptExecutorService.ts # Python script execution
└── test/
    └── webScrapingService.spec.ts # Unit tests
```

## Integration Points

### VS Code Extension
- Registered as `copilot_webScraping` tool in package.json
- Added to tool names enum and registry
- Integrated with Copilot Chat interface

### Playwright MCP
- Uses Microsoft's Playwright MCP server for browser automation
- Provides page navigation, screenshot capture, and DOM analysis
- Enables intelligent selector discovery and validation

### Python Environment
- Automatically checks for Python availability
- Installs required packages (requests, beautifulsoup4, selenium)
- Executes scripts in isolated environment

## Usage Flow

1. **User Input**: User provides URL and extraction fields via Copilot Chat
2. **Page Analysis**: Playwright MCP navigates to URL and analyzes structure
3. **Approach Selection**: Service determines HTTP vs Selenium based on page complexity
4. **Script Generation**: Creates appropriate Python scraping script
5. **Execution**: Runs script and validates extracted data
6. **Refinement**: Iteratively improves script until all fields are extracted
7. **Output**: Returns both the Python script and extracted JSON data

## Configuration

### Package.json Tool Definition
```json
{
  "name": "copilot_webScraping",
  "displayName": "Web Scraping Tool",
  "toolReferenceName": "webScraping",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "The URL to scrape data from."
      },
      "extractionFields": {
        "type": "array",
        "items": {"type": "string"},
        "description": "List of fields to extract"
      }
    }
  }
}
```

### Dependencies
- **Runtime**: VS Code extension host, Node.js
- **Python**: Python 3.x with pip
- **Packages**: requests, beautifulsoup4, selenium
- **Optional**: Chrome/Chromium for Selenium WebDriver

## Example Usage

### Via Copilot Chat
```
User: "Extract product information from https://store.example.com/product/123 including product name, price, and availability"

Response: 
- Generated Python script for HTTP-based extraction
- Executed script and extracted data
- JSON output with requested fields
```

### Generated Script Example
```python
#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import json

def scrape_data():
    url = "https://store.example.com/product/123"
    headers = {'User-Agent': 'Mozilla/5.0...'}
    response = requests.get(url, headers=headers, timeout=10)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    data = {}
    
    # Extract product name
    product_name_element = soup.select_one(".product-title")
    data["product name"] = product_name_element.get_text(strip=True) if product_name_element else None
    
    # Extract price
    price_element = soup.select_one(".price")
    data["price"] = price_element.get_text(strip=True) if price_element else None
    
    return data

if __name__ == "__main__":
    result = scrape_data()
    print(json.dumps(result, indent=2, ensure_ascii=False))
```

## Testing

Run the test suite:
```bash
npm run test:unit -- webScrapingService.spec.ts
```

## Future Enhancements

- **Proxy Support**: Add proxy configuration for enterprise environments
- **Rate Limiting**: Implement request throttling for respectful scraping
- **Data Validation**: Add schema validation for extracted data
- **Multi-page Support**: Handle pagination and multiple URL scraping
- **Export Formats**: Support CSV, Excel, and other output formats

## Contributing

When contributing to this implementation:

1. Follow the existing code patterns and TypeScript conventions
2. Add comprehensive error handling for edge cases
3. Update tests for new functionality
4. Document any new configuration options
5. Ensure compatibility with VS Code extension architecture

## Security Considerations

- Scripts are executed in isolated Python processes
- Temporary files are cleaned up automatically
- No user credentials are stored or transmitted
- Generated scripts include timeout protections
- All network requests use appropriate user agents

This implementation provides a production-ready foundation for intelligent web scraping within the VS Code Copilot Chat ecosystem.