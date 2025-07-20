# 🧠 MCP-FS (Model Context Protocol – File System)

A prototype toolhost that enables LLMs to perform basic file system operations through MCP over HTTP.

## ✨ Features

- 📄 `createFile` – Create new files
- 📖 `readFile` – Read file content
- ✏️ `updateFile` – Overwrite file content
- ➕ `appendToFile` – Append text to a file
- 🗑️ `deleteFile` – Delete files
- 📂 `listFiles` – List contents of a directory
- ℹ️ `describeServer` – Returns server tool list & usage guide

## 🧩 Architecture

- **Server**: Exposes tools via MCP HTTP transport using Express and `@modelcontextprotocol/sdk`.
- **Client**: Connects to MCP, fetches tool list, routes user input to an LLM (e.g., Ollama), and invokes tools based on LLM output.

## 🔧 Installation & Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/mcp-fs.git
cd mcp-fs

# 2. Install dependencies
npm install

# 3. Start the MCP Server
npm run server

# 4. Start the MCP Client
npm run client
```
