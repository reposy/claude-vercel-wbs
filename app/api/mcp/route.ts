import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handle(req: Request): Promise<Response> {
  if (process.env.MCP_PUBLIC_ENABLED !== '1') {
    return NextResponse.json({ error: 'MCP route disabled' }, { status: 503 });
  }

  const { createMcpServer } = await import('@/lib/mcp/server');
  const { WebStandardStreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
  );

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
