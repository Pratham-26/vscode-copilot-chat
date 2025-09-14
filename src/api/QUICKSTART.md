# 🚀 Quick Start Guide - Copilot Chat API

Get up and running with the Copilot Chat API in under 5 minutes!

## Prerequisites

- Node.js 22.14.0 or higher
- npm 9.0.0 or higher
- Git

## Installation

```bash
# Clone the repository
git clone https://github.com/microsoft/vscode-copilot-chat.git
cd vscode-copilot-chat

# Install dependencies (this may take a few minutes)
npm install --force

# Start the API server
npm run api:start
```

## First Test

Open a new terminal and test the API:

```bash
# Health check
curl http://localhost:3000/api/health

# Simple chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! How can you help me?"}'

# Run the example script
npm run api:example
```

## Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health status |
| `/api/chat` | POST | Send chat messages |
| `/api/sessions` | GET/POST | Manage chat sessions |
| `/api/models` | GET | Available AI models |
| `/api/tools` | GET | Available MCP tools |

## Example Usage

### 1. Basic Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain how to optimize this SQL query",
    "model": "gpt-4"
  }'
```

### 2. Code Analysis with Tools
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find all TODO comments in my codebase",
    "tools": ["copilot_searchCodebase"],
    "context": {
      "workspace": "/path/to/your/project"
    }
  }'
```

### 3. File Reading
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze this authentication file",
    "tools": ["copilot_readFile"],
    "context": {
      "files": ["src/auth.ts"]
    }
  }'
```

## Using the TypeScript Client

```typescript
import { CopilotChatApiClient } from './src/api/client/client';

const client = new CopilotChatApiClient('http://localhost:3000');

async function example() {
  // Simple chat
  const response = await client.chat({
    message: 'Help me write a function to validate email addresses',
    model: 'gpt-4'
  });
  console.log(response.message);

  // With tools
  const fileAnalysis = await client.chat({
    message: 'Analyze the structure of this codebase',
    tools: ['copilot_searchCodebase', 'copilot_readFile'],
    context: {
      workspace: '/my/project'
    }
  });
  console.log(fileAnalysis.tools);
}
```

## Configuration

Set environment variables:

```bash
# Optional - API configuration
export COPILOT_API_PORT=3000
export COPILOT_API_HOST=0.0.0.0
export COPILOT_API_LOG_LEVEL=info

# Optional - Authentication
export COPILOT_API_AUTH_REQUIRED=false
export COPILOT_API_KEY=your-api-key

# Optional - AI model API keys
export OPENAI_API_KEY=your-openai-key
export ANTHROPIC_API_KEY=your-anthropic-key
export GITHUB_TOKEN=your-github-token
```

## Docker Quick Start

```bash
# Build and run
docker-compose up --build

# Test
curl http://localhost:3000/api/health
```

## Next Steps

1. **Read the full documentation**: `src/api/README.md`
2. **Try the MCP integration**: `npm run api:test:integration`
3. **Explore available tools**: `curl http://localhost:3000/api/tools`
4. **Create your first session**: Use the sessions endpoint
5. **Build your integration**: Use the TypeScript client library

## Need Help?

- 📖 **Full Documentation**: [src/api/README.md](./README.md)
- 🏗️ **Implementation Details**: [src/api/IMPLEMENTATION.md](./IMPLEMENTATION.md)
- 🧪 **Run Examples**: `npm run api:example`
- 🔧 **Test MCP Tools**: `npm run api:test:integration`

## Common Issues

### Port Already in Use
```bash
# Change the port
export COPILOT_API_PORT=3001
npm run api:start
```

### Node Version Issues
```bash
# Check Node version
node -v  # Should be 22.14.0+

# Use nvm to install correct version
nvm install 22.14.0
nvm use 22.14.0
```

### Dependency Installation Issues
```bash
# Force install if there are peer dependency warnings
npm install --force

# Clear cache if needed
npm cache clean --force
npm install --force
```

That's it! You now have a fully functional Copilot Chat API running locally. 🎉