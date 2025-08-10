# MCP-FS (Model Context Protocol – File System)

A prototype toolhost that enables LLMs to perform basic file system operations through MCP over HTTP.

## Features

- `createFile` – Create new files
- `readFile` – Read file content
- `updateFile` – Overwrite file content
- `appendToFile` – Append text to a file
- `deleteFile` – Delete files
- `listFiles` – List contents of a directory
- `describeServer` – Returns server tool list & usage guide

## Architecture

- **Server**: Exposes tools via MCP HTTP transport using Express and `@modelcontextprotocol/sdk`.
- **Client**: Connects to MCP, fetches tool list, routes user input to an LLM (e.g., Ollama), and invokes tools based on LLM output.

## Install & Run Ollama

MCP-FS uses [Ollama](https://ollama.com) to run local LLMs and respond to file system tool requests.  
Ollama allows you to run models like `mistral`, `llama2`, `codellama`, and others locally via a simple API.  
Official GitHub: [ollama/ollama](https://github.com/ollama/ollama)

### Install Ollama

- **macOS**: [Download](https://ollama.com/download/Ollama.dmg)
- **Windows**: [Download](https://ollama.com/download/OllamaSetup.exe)
- **Linux**:

  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

### Start Ollama Server

```bash
ollama serve
```

By default, Ollama runs at `http://localhost:11434`.

### Pull Required Model

```bash
ollama pull mistral-nemo
```

### Check Installation

Should list available models (confirming Ollama is up and the model is installed):

```bash
curl http://localhost:11434/api/tags
```

## Installation & Setup Project

### Clone the repo

```bash
git clone https://github.com/your-username/mcp-fs.git
cd mcp-fs
```

### Install dependencies

```bash
npm install
```

### Start the MCP Server

```bash
npm run server
```

### Start the MCP Client

```bash
npm run client
```

## Resources

- **Ollama Website**: [https://ollama.com](https://ollama.com)
- **Ollama GitHub**: [https://github.com/ollama/ollama](https://github.com/ollama/ollama)
- **Model Library**: [https://ollama.com/library](https://ollama.com/library)
