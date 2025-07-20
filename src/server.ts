/**
 * MCP Filesystem Toolhost Server
 * Provides tools for basic file system operations: create, read, update, delete, append, and list.
 * Exposed via HTTP transport using the MCP (Model Context Protocol) SDK.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import express, { Request, Response } from "express";
import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";

// Holds active HTTP transports per MCP session
const transports: Record<string, StreamableHTTPServerTransport> = {};

/**
 * Initializes and returns an MCP server instance with filesystem tools.
 */
const getServer = () => {
  const mcp = new McpServer({
    name: "fs-toolhost",
    version: "1.0.0",
  });

  mcp.tool(
    "describeServer",
    "Returns general information about this MCP server, its purpose, and how to interact with it.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: `
📡 MCP Filesystem Toolhost Server

This server provides file system operations such as:
- 📄 createFile
- ✏️ updateFile
- 🧾 readFile
- ➕ appendToFile
- 🗑️ deleteFile
- 📂 listFiles

🧠 How to use:
• Send a JSON-RPC 2.0 message to this server via /mcp endpoint.
• Each tool expects specific parameters (path, content, etc.).
• Use the tool 'describeTools' to get a list of all available tools with input schemas.

🔍 Example call:
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "readFile",
  "params": {
    "path": "./example.txt"
  }
}

💡 Tip:
You can dynamically explore all tools using the 'describeTools' method.
This server is session-aware using the 'mcp-session-id' header.
          `.trim(),
          },
        ],
      };
    }
  );

  /**
   * Tool: updateFile
   * Overwrites content of an existing file at the given path.
   */
  mcp.tool(
    "updateFile",
    "Overwrite the content of an existing file.",
    {
      path: z
        .string()
        .describe("Path of the file to update")
        .default(`${process.cwd()}/temp.cpp`),
      content: z.string().describe("New content to overwrite the file with."),
    },
    async ({ path, content }) => {
      // Validate input
      if (!path || typeof path !== "string" || path.trim() === "") {
        return {
          content: [
            { type: "text", text: "❌ 'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      // Ensure file exists before updating
      try {
        await fs.access(path);
      } catch {
        return {
          content: [
            {
              type: "text",
              text: `❌ File not found at ${path}. Cannot update non-existent file.`,
            },
          ],
          isError: true,
        };
      }

      // Attempt to write new content
      try {
        await fs.writeFile(path, content, "utf-8");
        console.log(`✏️ Updated file at: ${path}`);
        return {
          content: [
            {
              type: "text",
              text: `✅ File successfully updated at ${path}.`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to update file: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Tool: deleteFile
   * Deletes a file from disk. Folders are not allowed.
   */
  mcp.tool(
    "deleteFile",
    "Delete a file from the user's machine at the specified path.",
    {
      path: z
        .string()
        .describe(
          "Path to the file to delete. Only deletes files, not folders."
        ),
    },
    async ({ path }) => {
      // Validate path
      if (!path || typeof path !== "string" || path.trim() === "") {
        return {
          content: [
            {
              type: "text",
              text: "❌ 'path' must be a non-empty string.",
            },
          ],
          isError: true,
        };
      }

      try {
        const stat = await fs.stat(path);

        // Reject if path is a directory
        if (stat.isDirectory()) {
          return {
            content: [
              {
                type: "text",
                text: `⚠️ '${path}' is a directory. Use a directory-specific tool to delete folders.`,
              },
            ],
            isError: true,
          };
        }

        await fs.unlink(path);
        console.log(`🗑️ File deleted: ${path}`);

        return {
          content: [
            {
              type: "text",
              text: `🗑️ File successfully deleted: ${path}`,
            },
          ],
        };
      } catch (err: any) {
        if (err.code === "ENOENT") {
          return {
            content: [
              {
                type: "text",
                text: `❌ File not found at ${path}.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to delete file: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Tool: readFile
   * Reads and returns file content from the specified path.
   */
  mcp.tool(
    "readFile",
    "Read and return the content of a file at the given path.",
    {
      path: z
        .string()
        .describe("Path to the file you want to read.")
        .default(`${process.cwd()}/example.txt`),
    },
    async ({ path }) => {
      // Validate path
      if (!path || typeof path !== "string" || path.trim() === "") {
        return {
          content: [
            { type: "text", text: "❌ 'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      try {
        const fileContent = await fs.readFile(path, "utf-8");

        return {
          content: [
            {
              type: "text",
              text: `📄 Content of ${path}:\n\n\`\`\` is \n${fileContent}\n\`\`\``,
            },
          ],
        };
      } catch (err: any) {
        if (err.code === "ENOENT") {
          return {
            content: [{ type: "text", text: `❌ File not found at ${path}.` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `❌ Error reading file: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Tool: appendToFile
   * Appends content to an existing file.
   */
  mcp.tool(
    "appendToFile",
    "Append text content to a file.",
    {
      path: z
        .string()
        .describe("Path to file")
        .default(`${process.cwd()}/new.txt`),
      content: z
        .string()
        .describe("Text to append")
        .default("📎 Appended content from the MCP tool."),
    },
    async ({ path, content }) => {
      if (!path || typeof path !== "string" || path.trim() === "") {
        return {
          content: [
            { type: "text", text: "❌ 'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      try {
        await fs.appendFile(path, content + "\n", "utf-8");
        console.log(`➕ Appended to file: ${path}`);

        return {
          content: [
            {
              type: "text",
              text: `✅ Content appended to ${path} (${content.length} characters).`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to append to file: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Tool: createFile
   * Creates a new file and writes content. Prevents overwriting existing files.
   */
  mcp.tool(
    "createFile",
    "Create a new file on the user's machine via the external tool server.",
    {
      path: z
        .string()
        .describe(
          `Path where the file should be created (including filename). Default Path = ${process.cwd()}`
        )
        .default(process.cwd()),
      content: z.string().describe("Content to write into the file").optional(),
    },
    async (params) => {
      const { path, content } = params;

      if (!path || typeof path !== "string" || path.trim() === "") {
        return {
          content: [
            { type: "text", text: "❌ 'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      const finalContent =
        typeof content === "string" && content.trim()
          ? content
          : "📄 Default file content generated by the MCP tool.";

      try {
        // Check if file exists to prevent overwrite
        try {
          await fs.access(path);
          return {
            content: [
              {
                type: "text",
                text: `⚠️ A file already exists at ${path}. File creation aborted to prevent overwrite.`,
              },
            ],
            isError: true,
          };
        } catch {}

        // Ensure parent directory exists
        const parentDir = path.split("/").slice(0, -1).join("/") || ".";
        try {
          await fs.access(parentDir);
        } catch {
          return {
            content: [
              {
                type: "text",
                text: `❌ Parent directory "${parentDir}" does not exist.`,
              },
            ],
            isError: true,
          };
        }

        await fs.writeFile(path, finalContent, "utf-8");
        console.log(`📝 File created at: ${path}`);

        return {
          content: [
            {
              type: "text",
              text: `✅ File created at ${path} with ${finalContent.length} characters.`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Unexpected error while creating file: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Tool: listFiles
   * Lists files in the given directory.
   */
  mcp.tool(
    "listFiles",
    `List files in a directory on the user's machine, called via an external tool server.`,
    {
      path: z
        .string()
        .describe(
          `path to the directory, Default path of the mcp server is ${process.cwd()}`
        )
        .default(process.cwd()),
    },
    async (params) => {
      const path = params?.path;
      if (typeof path !== "string") {
        return {
          content: [
            {
              type: "text",
              text: `❌ Invalid 'path' argument. Must be a string. Received: ${JSON.stringify(
                params
              )}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const files = await fs.readdir(path);
        console.log("path: " + path);
        console.log("files: " + files);
        return {
          content: [
            {
              type: "text",
              text: `📁 Files in ${path}: ${files.join(", ")}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Error reading directory: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return mcp;
};

// Express HTTP server and MCP entrypoint setup

const MCP_PORT = 4001;
const app = express();
app.use(express.json());

/**
 * HTTP POST endpoint for receiving MCP requests.
 * Creates a new session if not already present.
 */
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else {
    // Create new transport and session
    const mcp = getServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
        console.log(`Session initialized: ${sid}`);
      },
    });

    await mcp.connect(transport);
  }

  // Handle incoming MCP request
  await transport.handleRequest(req, res, req.body);
});

/**
 * Starts the Express server to serve MCP tools.
 */
app.listen(MCP_PORT, () => {
  console.log(`✅ MCP FS Server running on http://localhost:${MCP_PORT}/mcp`);
});
