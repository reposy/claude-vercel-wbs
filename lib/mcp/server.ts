import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createTask,
  createTaskInput,
  deleteTask,
  deleteTaskInput,
  getTask,
  getTaskInput,
  listTasks,
  updateTask,
  updateTaskInput,
} from './tools/tasks';

export const MCP_PROTOCOL_VERSION = '2025-11-25';

function asText(payload: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(payload) },
    ],
  };
}

function asError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'wbs-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'list_tasks',
    {
      title: 'List tasks',
      description: 'WBS의 모든 작업을 반환합니다.',
      inputSchema: {},
    },
    async () => {
      try {
        const rows = await listTasks();
        return asText(rows);
      } catch (e) {
        return asError(e);
      }
    },
  );

  server.registerTool(
    'get_task',
    {
      title: 'Get task',
      description: 'id로 단일 작업을 조회합니다.',
      inputSchema: getTaskInput,
    },
    async (args) => {
      try {
        const row = await getTask(args);
        return asText(row);
      } catch (e) {
        return asError(e);
      }
    },
  );

  server.registerTool(
    'create_task',
    {
      title: 'Create task',
      description: '새 작업을 생성합니다.',
      inputSchema: createTaskInput,
    },
    async (args) => {
      try {
        const row = await createTask(args);
        return asText(row);
      } catch (e) {
        return asError(e);
      }
    },
  );

  server.registerTool(
    'update_task',
    {
      title: 'Update task',
      description: '작업을 부분 업데이트합니다. progress=100은 status=done을 강제합니다.',
      inputSchema: updateTaskInput,
    },
    async (args) => {
      try {
        const row = await updateTask(args);
        return asText(row);
      } catch (e) {
        return asError(e);
      }
    },
  );

  server.registerTool(
    'delete_task',
    {
      title: 'Delete task',
      description: 'id로 작업을 삭제합니다. 자식 작업은 cascade로 함께 삭제됩니다.',
      inputSchema: deleteTaskInput,
    },
    async (args) => {
      try {
        const result = await deleteTask(args);
        return asText(result);
      } catch (e) {
        return asError(e);
      }
    },
  );

  return server;
}
