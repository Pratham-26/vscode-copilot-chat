# Copilot Chat API

This API extracts the core chat functionality from the VS Code Copilot Chat extension and exposes it as a standalone HTTP API for MCP-assisted tasks.

## Features

- 🤖 **AI Chat Interface**: Process natural language queries using various language models
- 🔧 **MCP Tool Integration**: Execute Model Context Protocol tools for enhanced capabilities  
- 💬 **Session Management**: Maintain conversation context across multiple requests
- 📁 **Workspace Context**: Analyze code repositories and file structures
- 🔍 **Code Search**: Search through codebases using semantic and text-based methods
- 🚀 **Multiple Models**: Support for GPT-4, Claude, and other language models

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/microsoft/vscode-copilot-chat.git
cd vscode-copilot-chat

# Install dependencies (requires Node.js >= 22.14.0)
npm install

# Start the API server
npm run api:start
```

### Environment Variables

```bash
# Server configuration
COPILOT_API_PORT=3000
COPILOT_API_HOST=0.0.0.0
COPILOT_API_LOG_LEVEL=info

# Authentication (optional)
COPILOT_API_AUTH_REQUIRED=false
COPILOT_API_KEY=your-api-key
GITHUB_TOKEN=your-github-token

# Model configuration
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Docker Usage

```bash
# Build the Docker image
docker build -t copilot-chat-api .

# Run the container
docker run -p 3000:3000 \
  -e COPILOT_API_AUTH_REQUIRED=false \
  -e OPENAI_API_KEY=your-key \
  copilot-chat-api
```

## API Endpoints

### Health Check

```bash
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Chat

Send a message to the AI and receive a response.

```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Help me refactor this function to be more efficient",
  "sessionId": "optional-session-id",
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 4096,
  "tools": ["copilot_searchCodebase", "copilot_readFile"],
  "context": {
    "files": ["src/utils/helper.ts"],
    "workspace": "/path/to/project",
    "selection": {
      "file": "src/utils/helper.ts",
      "range": {
        "start": { "line": 10, "character": 0 },
        "end": { "line": 25, "character": 50 }
      }
    }
  },
  "variables": {
    "customContext": "value"
  }
}
```

**Response:**
```json
{
  "id": "chat-response-123",
  "sessionId": "session-456", 
  "message": "I'll help you refactor that function. Let me analyze the code first...",
  "model": "gpt-4",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 200,
    "totalTokens": 350
  },
  "tools": [
    {
      "id": "tool-call-789",
      "name": "copilot_readFile",
      "arguments": {
        "filePath": "src/utils/helper.ts",
        "startLine": 10,
        "endLine": 25
      },
      "result": "// function implementation..."
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "references": [
    {
      "type": "file",
      "uri": "src/utils/helper.ts",
      "range": {
        "start": { "line": 10, "character": 0 },
        "end": { "line": 25, "character": 50 }
      },
      "description": "Function to refactor"
    }
  ]
}
```

### Sessions

#### List Sessions

```bash
GET /api/sessions
```

**Response:**
```json
[
  {
    "id": "session-456",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:05:00.000Z",
    "model": "gpt-4",
    "context": {
      "workspace": "/path/to/project",
      "files": ["src/utils/helper.ts"]
    },
    "metadata": {
      "messageCount": 5
    }
  }
]
```

#### Create Session

```bash
POST /api/sessions
Content-Type: application/json

{
  "model": "gpt-4",
  "context": {
    "workspace": "/path/to/project"
  },
  "metadata": {
    "project": "my-project"
  }
}
```

### Models

List available language models.

```bash
GET /api/models
```

**Response:**
```json
[
  {
    "id": "gpt-4",
    "name": "GPT-4",
    "description": "Most capable GPT model",
    "maxTokens": 8192,
    "supportsToolCalls": true,
    "supportsVision": false,
    "provider": "openai"
  },
  {
    "id": "claude-3-opus",
    "name": "Claude 3 Opus",
    "description": "Most powerful Claude model", 
    "maxTokens": 200000,
    "supportsToolCalls": true,
    "supportsVision": true,
    "provider": "anthropic"
  }
]
```

### Tools

List available MCP tools and built-in functions.

```bash
GET /api/tools
```

**Response:**
```json
[
  {
    "id": "copilot_searchCodebase",
    "name": "Search Codebase",
    "description": "Search for code in the workspace",
    "schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Search query"
        }
      },
      "required": ["query"]
    },
    "category": "code_search",
    "provider": "builtin"
  },
  {
    "id": "execute_task",
    "name": "Execute Task",
    "description": "Execute a complex multi-step task autonomously",
    "schema": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "description": "Task description"
        },
        "description": {
          "type": "string", 
          "description": "Short task description"
        }
      },
      "required": ["prompt", "description"]
    },
    "category": "automation",
    "provider": "mcp"
  }
]
```

## Available Tools

### Built-in Tools

- **copilot_searchCodebase**: Search through workspace code using semantic or text search
- **copilot_readFile**: Read contents of files with optional line ranges
- **copilot_listDirectory**: List contents of directories
- **copilot_findFiles**: Find files matching glob patterns
- **copilot_getErrors**: Get compilation or lint errors from files
- **copilot_searchWorkspaceSymbols**: Search for code symbols using language services

### MCP Tools

- **execute_task**: Launch autonomous agents for complex multi-step tasks
- **execute_prompt**: Execute user-defined prompt files
- Custom MCP tools can be added through configuration

## Examples

### Simple Chat

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I optimize this SQL query?",
    "model": "gpt-4"
  }'
```

### Code Analysis with Tools

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find all TODO comments in the codebase",
    "tools": ["copilot_searchCodebase"],
    "context": {
      "workspace": "/path/to/project"
    }
  }'
```

### Multi-turn Conversation

```bash
# First message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need to refactor a large function",
    "sessionId": "my-session"
  }'

# Follow-up message in same session
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the function in src/utils/helper.ts",
    "sessionId": "my-session",
    "tools": ["copilot_readFile"],
    "context": {
      "files": ["src/utils/helper.ts"]
    }
  }'
```

### Task Automation

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a comprehensive test suite for the authentication module",
    "tools": ["execute_task"],
    "context": {
      "workspace": "/path/to/project",
      "files": ["src/auth/"]
    }
  }'
```

## Integration Examples

### Node.js Client

```javascript
import { CopilotChatApiClient } from './client';

const client = new CopilotChatApiClient('http://localhost:3000');

async function example() {
  // Simple chat
  const response = await client.chat({
    message: "Help me debug this error",
    model: "gpt-4"
  });
  
  console.log(response.message);
  
  // With tools
  const codeResponse = await client.chat({
    message: "Find all uses of the deprecated function",
    tools: ["copilot_searchCodebase"],
    context: {
      workspace: "/my/project"
    }
  });
  
  console.log(codeResponse.tools[0].result);
}
```

### Python Client

```python
import requests

class CopilotChatClient:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def chat(self, message, **kwargs):
        response = requests.post(
            f"{self.base_url}/api/chat",
            json={"message": message, **kwargs}
        )
        return response.json()

client = CopilotChatClient("http://localhost:3000")
response = client.chat("Help me optimize this algorithm")
print(response["message"])
```

### Shell Script

```bash
#!/bin/bash

API_URL="http://localhost:3000"

# Function to send chat message
chat() {
    local message="$1"
    local tools="$2"
    
    curl -s -X POST "$API_URL/api/chat" \
        -H "Content-Type: application/json" \
        -d "{
            \"message\": \"$message\",
            \"tools\": [\"$tools\"]
        }" | jq -r '.message'
}

# Example usage
chat "Find all TODO comments" "copilot_searchCodebase"
```

## Configuration

### Custom Models

Add custom OpenAI-compatible models:

```json
{
  "models": {
    "available": ["gpt-4", "my-custom-model"],
    "endpoints": {
      "my-custom-model": {
        "url": "https://api.myservice.com/v1/chat/completions",
        "apiKey": "my-api-key"
      }
    }
  }
}
```

### MCP Tool Configuration

Configure MCP servers:

```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
      },
      "github": {
        "command": "npx", 
        "args": ["@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
        }
      }
    }
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": {
    "code": "INVALID_REQUEST",
    "field": "message"
  }
}
```

Common HTTP status codes:
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Missing or invalid API key
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server error

## Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   export COPILOT_API_AUTH_REQUIRED=true
   export COPILOT_API_KEY=your-secure-key
   export NODE_ENV=production
   ```

2. **Process Management**
   ```bash
   # Using PM2
   pm2 start dist/api/bin/copilot-chat-api.js --name copilot-api
   
   # Using systemd
   sudo systemctl enable copilot-chat-api
   sudo systemctl start copilot-chat-api
   ```

3. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name api.yourhost.com;
       
       location /api/ {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Scaling

- **Horizontal Scaling**: Run multiple instances behind a load balancer
- **Session Persistence**: Use Redis for session storage across instances
- **Caching**: Implement response caching for frequently requested operations

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License - see [LICENSE.txt](./LICENSE.txt) for details.