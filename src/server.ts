import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import express, { Request, Response } from "express";
import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";

// Active HTTP transports per MCP session
const transports: Record<string, StreamableHTTPServerTransport> = {};

/**
 * Initialize and return an MCP server instance with filesystem tools.
 * Logic unchanged; added structured logs only (no icons).
 */
const getServer = () => {
  console.log(
    `MCP server init: name=fs-toolhost version=1.0.0 cwd=${process.cwd()}`
  );

  const mcp = new McpServer({
    name: "fs-toolhost",
    version: "1.0.0",
  });

  // describeServer
  mcp.registerTool(
    "describeServer",
    {
      title: "Describes Server",
      description:
        "Returns general information about this MCP server, its purpose, and how to interact with it.",
    },
    async () => {
      const t0 = Date.now();
      console.log(`[tool] describeServer start`);
      const result = {
        content: [
          {
            type: "text",
            text: `MCP Filesystem Toolhost Server

This server provides file system operations such as:
- createFile
- updateFile
- readFile
- appendToFile
- deleteFile
- listFiles

How to use:
• Send a JSON-RPC 2.0 message to this server via /mcp endpoint.
• Each tool expects specific parameters (path, content, etc.).
• Use the tool 'describeTools' to get a list of all available tools with input schemas.

Example call:
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "readFile",
  "params": { "path": "./example.txt" }
}

Tip:
Use the 'describeTools' method to explore all tools.
This server is session-aware via the 'mcp-session-id' header.`,
          },
        ],
      };
      console.log(
        `[tool] describeServer success duration=${Date.now() - t0}ms`
      );
      return result;
    }
  );

  // updateFile
  mcp.registerTool(
    "updateFile",
    {
      title: "Updates a File",
      description: "Overwrite the content of an existing file.",
      inputSchema: {
        path: z
          .string()
          .describe("Path of the file to update")
          .default(`${process.cwd()}/temp.cpp`),
        content: z.string().describe("New content to overwrite the file with."),
      },
    },
    async ({ path, content }) => {
      const t0 = Date.now();
      console.log(
        `[tool] updateFile start path="${path}" bytes=${content?.length ?? 0}`
      );

      if (!path || typeof path !== "string" || path.trim() === "") {
        console.warn(`[tool] updateFile invalid-arg path`);
        return {
          content: [
            { type: "text", text: "'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      try {
        await fs.access(path);
      } catch {
        console.warn(`[tool] updateFile not-found path="${path}"`);
        return {
          content: [
            {
              type: "text",
              text: `File not found at ${path}. Cannot update non-existent file.`,
            },
          ],
          isError: true,
        };
      }

      try {
        await fs.writeFile(path, content, "utf-8");
        console.log(
          `[tool] updateFile success path="${path}" duration=${
            Date.now() - t0
          }ms`
        );
        return {
          content: [
            { type: "text", text: `File successfully updated at ${path}.` },
          ],
        };
      } catch (err: any) {
        console.error(
          `[tool] updateFile error path="${path}" msg=${err.message}`
        );
        return {
          content: [
            { type: "text", text: `Failed to update file: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // deleteFile
  mcp.registerTool(
    "deleteFile",
    {
      title: "Delete a File",
      description:
        "Delete a file from the user's machine at the specified path.",
      inputSchema: {
        path: z
          .string()
          .describe(
            "Path to the file to delete. Only deletes files, not folders."
          ),
      },
    },
    async ({ path }) => {
      const t0 = Date.now();
      console.log(`[tool] deleteFile start path="${path}"`);

      if (!path || typeof path !== "string" || path.trim() === "") {
        console.warn(`[tool] deleteFile invalid-arg path`);
        return {
          content: [
            { type: "text", text: "'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      try {
        const stat = await fs.stat(path);
        if (stat.isDirectory()) {
          console.warn(`[tool] deleteFile is-directory path="${path}"`);
          return {
            content: [
              {
                type: "text",
                text: `'${path}' is a directory. Use a directory-specific tool to delete folders.`,
              },
            ],
            isError: true,
          };
        }

        await fs.unlink(path);
        console.log(
          `[tool] deleteFile success path="${path}" duration=${
            Date.now() - t0
          }ms`
        );
        return {
          content: [
            { type: "text", text: `File successfully deleted: ${path}` },
          ],
        };
      } catch (err: any) {
        if (err.code === "ENOENT") {
          console.warn(`[tool] deleteFile not-found path="${path}"`);
          return {
            content: [{ type: "text", text: `File not found at ${path}.` }],
            isError: true,
          };
        }
        console.error(
          `[tool] deleteFile error path="${path}" msg=${err.message}`
        );
        return {
          content: [
            { type: "text", text: `Failed to delete file: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // readFile
  mcp.registerTool(
    "readFile",
    {
      title: "Read a file",
      description: "Read and return the content of a file at the given path.",
      inputSchema: {
        path: z
          .string()
          .describe("Path to the file you want to read.")
          .default(`${process.cwd()}/example.txt`),
      },
    },
    async ({ path }) => {
      const t0 = Date.now();
      console.log(`[tool] readFile start path="${path}"`);

      if (!path || typeof path !== "string" || path.trim() === "") {
        console.warn(`[tool] readFile invalid-arg path`);
        return {
          content: [
            { type: "text", text: "'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      try {
        const fileContent = await fs.readFile(path, "utf-8");
        console.log(
          `[tool] readFile success path="${path}" bytes=${
            fileContent.length
          } duration=${Date.now() - t0}ms`
        );
        return {
          content: [
            {
              type: "text",
              text: `Content of ${path}:\n\n\`\`\`\n${fileContent}\n\`\`\``,
            },
          ],
        };
      } catch (err: any) {
        if (err.code === "ENOENT") {
          console.warn(`[tool] readFile not-found path="${path}"`);
          return {
            content: [{ type: "text", text: `File not found at ${path}.` }],
            isError: true,
          };
        }
        console.error(
          `[tool] readFile error path="${path}" msg=${err.message}`
        );
        return {
          content: [
            { type: "text", text: `Error reading file: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // appendToFile
  mcp.registerTool(
    "appendToFile",
    {
      title: "Append Content to a File",
      description: "Append text content to an existing file.",
      inputSchema: {
        path: z
          .string()
          .describe("Path to file")
          .default(`${process.cwd()}/new.txt`),
        content: z
          .string()
          .describe("Text to append")
          .default("Appended content from the MCP tool."),
      },
    },
    async ({ path, content }) => {
      const t0 = Date.now();
      console.log(
        `[tool] appendToFile start path="${path}" appendBytes=${
          content?.length ?? 0
        }`
      );

      if (!path || typeof path !== "string" || path.trim() === "") {
        console.warn(`[tool] appendToFile invalid-arg path`);
        return {
          content: [
            { type: "text", text: "'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      try {
        await fs.appendFile(path, content + "\n", "utf-8");
        console.log(
          `[tool] appendToFile success path="${path}" duration=${
            Date.now() - t0
          }ms`
        );
        return {
          content: [
            {
              type: "text",
              text: `Content appended to ${path} (${content.length} characters).`,
            },
          ],
        };
      } catch (err: any) {
        console.error(
          `[tool] appendToFile error path="${path}" msg=${err.message}`
        );
        return {
          content: [
            { type: "text", text: `Failed to append to file: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  // createFile
  mcp.registerTool(
    "createFile",
    {
      title: "Create a new File",
      description:
        "Create a new file on the user's machine via the external tool server.",
      inputSchema: {
        path: z
          .string()
          .describe(
            `Path where the file should be created (including filename). Default Path = ${process.cwd()}`
          )
          .default(process.cwd()),
        content: z
          .string()
          .describe("Content to write into the file")
          .optional(),
      },
    },
    async (params) => {
      const t0 = Date.now();
      const { path, content } = params;
      console.log(
        `[tool] createFile start path="${path}" bytes=${content?.length ?? 0}`
      );

      if (!path || typeof path !== "string" || path.trim() === "") {
        console.warn(`[tool] createFile invalid-arg path`);
        return {
          content: [
            { type: "text", text: "'path' must be a non-empty string." },
          ],
          isError: true,
        };
      }

      const finalContent =
        typeof content === "string" && content.trim()
          ? content
          : "Default file content generated by the MCP tool.";

      try {
        try {
          await fs.access(path);
          console.warn(`[tool] createFile path-exists path="${path}"`);
          return {
            content: [
              {
                type: "text",
                text: `A file already exists at ${path}. Creation aborted.`,
              },
            ],
            isError: true,
          };
        } catch {
          // ok, does not exist
        }

        const parentDir = path.split("/").slice(0, -1).join("/") || ".";
        try {
          await fs.access(parentDir);
        } catch {
          console.warn(`[tool] createFile parent-missing dir="${parentDir}"`);
          return {
            content: [
              {
                type: "text",
                text: `Parent directory "${parentDir}" does not exist.`,
              },
            ],
            isError: true,
          };
        }

        await fs.writeFile(path, finalContent, "utf-8");
        console.log(
          `[tool] createFile success path="${path}" bytes=${
            finalContent.length
          } duration=${Date.now() - t0}ms`
        );
        return {
          content: [
            {
              type: "text",
              text: `File created at ${path} with ${finalContent.length} characters.`,
            },
          ],
        };
      } catch (err: any) {
        console.error(
          `[tool] createFile error path="${path}" msg=${err.message}`
        );
        return {
          content: [
            {
              type: "text",
              text: `Unexpected error while creating file: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // listFiles
  mcp.registerTool(
    "listFiles",
    {
      title: "List Files",
      description:
        "List files in a directory on the user's machine, called via an external tool server.",
      inputSchema: {
        path: z
          .string()
          .describe(`path to the directory, default is ${process.cwd()}`)
          .default(process.cwd()),
      },
    },
    async (params) => {
      const t0 = Date.now();
      const path = params?.path;
      console.log(`[tool] listFiles start path="${path}"`);

      if (typeof path !== "string") {
        console.warn(`[tool] listFiles invalid-arg path`);
        return {
          content: [
            {
              type: "text",
              text: `Invalid 'path' argument. Must be a string. Received: ${JSON.stringify(
                params
              )}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const files = await fs.readdir(path);
        console.log(
          `[tool] listFiles success path="${path}" | file count=${
            files.length
          } | duration=${Date.now() - t0}ms`
        );
        return {
          content: [
            { type: "text", text: `Files in ${path}: ${files.join(", ")}` },
          ],
        };
      } catch (err: any) {
        console.error(
          `[tool] listFiles error path="${path}" msg=${err.message}`
        );
        return {
          content: [
            { type: "text", text: `Error reading directory: ${err.message}` },
          ],
          isError: true,
        };
      }
    }
  );

  console.log(
    `MCP tools registered: describeServer, updateFile, deleteFile, readFile, appendToFile, createFile, listFiles`
  );
  return mcp;
};

// Express HTTP server and MCP entrypoint setup

const MCP_PORT = 4001;
const app = express();
app.use(express.json());

// Simple request log (method, path, session, rpc method, id)
app.use((req, _res, next) => {
  const sid = req.headers["mcp-session-id"] ?? "none";
  const m = (req.body && req.body.method) || "unknown";
  const id = (req.body && req.body.id) || "n/a";
  console.log(
    `http request: ${req.method} ${req.path} sid=${String(
      sid
    )} rpc.method=${m} id=${id}`
  );
  next();
});

/**
 * HTTP POST endpoint for receiving MCP requests.
 * Creates a new session if not already present.
 */
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
    console.log(`session reuse: ${sessionId}`);
  } else {
    const mcp = getServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
        console.log(`session init: ${sid}`);
      },
    });

    await mcp.connect(transport);
    console.log(`transport connected`);
  }

  await transport.handleRequest(req, res, req.body);
  console.log(`request handled: session=${transport.sessionId ?? "unknown"}`);
});

/**
 * Start the Express server.
 */
app.listen(MCP_PORT, () => {
  console.log(`MCP-FS server listening on http://localhost:${MCP_PORT}/mcp`);
});

// Process-level error logs
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
