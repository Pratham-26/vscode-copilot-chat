# Web Scraping Tool Usage Examples

## Overview

The Web Scraping Tool integrates Copilot chat logic with Playwright MCP to create a comprehensive web scraping service that:

1. **Navigates** to a URL using Playwright MCP
2. **Inspects** the page structure to identify data extraction fields
3. **Determines** the appropriate scraping approach (HTTP vs Selenium)
4. **Generates** a Python script to extract the specified data
5. **Executes** the script and validates the output
6. **Iteratively improves** the script until all requested fields are successfully extracted

## Prerequisites

### Playwright MCP Server Setup

To use the full functionality of the Web Scraping Tool, you need to set up a Playwright MCP server:

1. **Install Playwright MCP Server**:
   ```bash
   npm install -g @microsoft/playwright-mcp-server
   # or use the official Microsoft Playwright MCP server implementation
   ```

2. **Configure MCP Server in VS Code**:
   The server should be registered with VS Code's MCP system and expose the following tools:
   - `mcp_playwright_navigate` - Navigate to a URL
   - `mcp_playwright_screenshot` - Take page screenshots  
   - `mcp_playwright_get_page_content` - Get HTML content
   - `mcp_playwright_evaluate` - Execute JavaScript on the page
   - `mcp_playwright_find_elements` - Find elements using CSS selectors

3. **Development Mode**:
   When no MCP server is available, the service falls back to mock responses for testing and development.

## Usage Examples

### Example 1: E-commerce Product Scraping

```typescript
// Input via Copilot Chat:
// "Please scrape product information from https://example-store.com/product/123"

const input = {
  url: "https://example-store.com/product/123",
  extractionFields: ["product name", "price", "currency", "availability"]
};

// The tool will:
// 1. Navigate to the URL using Playwright MCP
// 2. Identify selectors for product name, price, etc.
// 3. Generate either HTTP+BeautifulSoup or Selenium script based on page complexity
// 4. Execute the script and return both the script and extracted data
```

### Example 2: News Article Extraction

```typescript
const input = {
  url: "https://news-site.com/article/12345",
  extractionFields: ["headline", "author", "publication date", "article text"]
};

// Generated HTTP Script Example:
// ```python
// import requests
// from bs4 import BeautifulSoup
// import json
// 
// def scrape_data():
//     url = "https://news-site.com/article/12345"
//     headers = {'User-Agent': 'Mozilla/5.0...'}
//     response = requests.get(url, headers=headers)
//     soup = BeautifulSoup(response.content, 'html.parser')
//     
//     data = {}
//     # Extract headline
//     headline_element = soup.select_one("h1.article-title")
//     data["headline"] = headline_element.get_text(strip=True) if headline_element else None
//     # ... more extraction logic
//     
//     return data
// ```
```

### Example 3: Dynamic Content Scraping (Selenium)

```typescript
const input = {
  url: "https://spa-app.com/dashboard",
  extractionFields: ["user count", "active sessions", "revenue"]
};

// For dynamic content, the tool generates Selenium scripts:
// ```python
// from selenium import webdriver
// from selenium.webdriver.common.by import By
// from selenium.webdriver.support.ui import WebDriverWait
// import json
// 
// def scrape_data():
//     chrome_options = Options()
//     chrome_options.add_argument("--headless")
//     driver = webdriver.Chrome(options=chrome_options)
//     
//     driver.get("https://spa-app.com/dashboard")
//     wait = WebDriverWait(driver, 10)
//     
//     data = {}
//     # Wait for dynamic content to load
//     user_count_element = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "user-count")))
//     data["user count"] = user_count_element.text
//     # ... more extraction logic
//     
//     driver.quit()
//     return data
// ```
```

## Tool Output Format

The web scraping tool returns a comprehensive result:

```json
{
  "pythonScript": "#!/usr/bin/env python3\n# Generated scraping script...",
  "extractedData": {
    "product name": "Wireless Bluetooth Headphones",
    "price": "79.99",
    "currency": "USD",
    "availability": "In Stock"
  },
  "approach": "http",
  "iterations": 2
}
```

## Error Handling

The tool includes robust error handling for:

- **Invalid URLs**: Validates URL format before processing
- **Missing Python dependencies**: Automatically installs required packages (requests, beautifulsoup4, selenium)
- **Network issues**: Handles timeouts and connection errors
- **Parsing failures**: Provides fallback selectors and alternative extraction methods
- **Dynamic content detection**: Automatically switches to Selenium when needed

## Integration with Playwright MCP

The service leverages the Microsoft Playwright MCP server to:

1. **Navigate** to web pages in a controlled browser environment
2. **Take screenshots** for visual analysis
3. **Inspect DOM structure** to identify optimal selectors
4. **Detect JavaScript usage** and dynamic content loading
5. **Find alternative selectors** when initial extraction fails

## Iterative Improvement

The tool implements a feedback loop:

1. Execute generated script
2. Validate extracted data against requested fields
3. If data is incomplete, use Playwright MCP to find alternative selectors
4. Regenerate script with improved selectors
5. Repeat until all fields are successfully extracted (max 5 iterations)

## Supported Extraction Patterns

The tool recognizes common web patterns:

- **E-commerce**: Product names, prices, descriptions, ratings, availability
- **News/Blogs**: Headlines, authors, dates, article content
- **Social Media**: User info, post content, engagement metrics
- **Data Tables**: Structured tabular information
- **Forms**: Input fields and their current values

## Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Copilot Chat   │───▶│ Web Scraping    │───▶│ Playwright MCP  │
│     Tool        │    │    Service      │    │    Service      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Python Script   │
                       │   Executor      │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Generated      │
                       │ Python Script   │
                       │ + JSON Output   │
                       └─────────────────┘
```

This architecture ensures a robust, scalable solution for automated web scraping that adapts to different website structures and complexity levels.