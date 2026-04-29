# MCP SDK Reference Notes (@modelcontextprotocol/sdk v1.29.x)

이 문서는 본 저장소에서 MCP 서버를 작성·검증할 때 참고하는 SDK 사용 패턴 모음.
import 문은 서브패스 export 구조를 그대로 보존한다.

## 1. Web Standards Streamable HTTP + Next.js Route Handler

Next.js App Router의 Route Handler는 Web `Request`/`Response`를 사용하므로,
SDK의 `WebStandardStreamableHTTPServerTransport`를 그대로 쓰면 된다.

```ts
// app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

async function handle(req: Request): Promise<Response> {
  // factory가 매 요청 신규 인스턴스를 만든다 — Already connected 회피
  const server: McpServer = await createServer();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const res = await transport.handleRequest(req);
  return res;
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
```

- `sessionIdGenerator: undefined` → stateless 모드(세션 ID 미발급).
- `enableJsonResponse: true` → SSE 대신 단일 JSON 응답을 선호(간단한 클라이언트 호환).
- 매 요청마다 새 transport + 새 McpServer를 만들어 connect.

## 2. McpServer + registerTool + zod input schema

`McpServer.registerTool`는 zod **raw shape**(객체) 또는 zod 스키마를 input/output에 받는다.
zod 4.x를 쓸 때는 raw shape를 그대로 넘기는 게 가장 단순하다.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function createServer() {
  const server = new McpServer(
    { name: 'wbs-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'list_tasks',
    {
      title: 'List tasks',
      description: '모든 작업을 반환',
      inputSchema: {}, // 빈 raw shape
    },
    async () => {
      const rows: unknown[] = []; // 실제 구현은 Drizzle 쿼리
      return {
        content: [{ type: 'text', text: JSON.stringify(rows) }],
      };
    },
  );

  server.registerTool(
    'create_task',
    {
      description: '새 작업 생성',
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        assignee: z.string().optional(),
        status: z.enum(['todo', 'doing', 'done']).optional(),
        progress: z.number().int().min(0).max(100).optional(),
        startDate: z.string().optional(),
        dueDate: z.string().optional(),
        parentId: z.string().uuid().optional(),
      },
    },
    async (input) => {
      // input은 위 shape에 따라 타입이 추론됨
      return { content: [{ type: 'text', text: JSON.stringify(input) }] };
    },
  );

  return server;
}
```

- `inputSchema`는 `z.object(...)`가 아닌 **raw shape**(필드명→zod 타입 매핑 객체)를 권장.
- 모든 partial 업데이트 스키마는 `id` 외 필드를 `.optional()`로 둘 것.

## 3. InMemoryTransport — Client/Server 페어로 검증

테스트·검증 스크립트에서 transport 없이 logic만 검증할 때 쓴다.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

async function verify() {
  const server: McpServer = createServer();
  const client = new Client({ name: 'verify', version: '0.0.1' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const result = await client.callTool({
    name: 'list_tasks',
    arguments: {},
  });

  // result.content[0].text가 핸들러가 반환한 JSON 문자열
  console.log(result);

  await client.close();
  await server.close();
}
```

- `createLinkedPair()`가 양방향 페어를 생성. 각각 client/server에 connect.
- 같은 McpServer 인스턴스에 transport를 두 번 connect하면 거절되므로 검증/Route Handler는 각자 인스턴스를 생성해 사용한다.
- callTool 결과는 `{ content: [...] }` 구조. `text` 컨텐트의 JSON을 parse해서 검증.
