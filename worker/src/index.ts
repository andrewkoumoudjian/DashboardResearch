export interface Env {
  OPENAI_API_KEY: string;
  REPORTS: KVNamespace;
}

async function generateReport(
  symbol: string,
  info: unknown,
  env: Env
): Promise<string> {
  const prompt = `Provide an equity research summary for ${symbol}. Use the following JSON data as context: ${JSON.stringify(
    info
  )}`;

  const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  const aiJson = await aiResp.json();
  return aiJson.choices?.[0]?.message?.content?.trim() || 'No analysis available.';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/research' && request.method === 'GET') {
      const symbol = url.searchParams.get('symbol');
      if (!symbol) {
        return new Response('symbol required', { status: 400 });
      }

      const id = `${symbol}-${Date.now()}`;

      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) =>
            controller.enqueue(`${JSON.stringify(obj)}\n`);

          send({ type: 'status', message: 'Fetching market data...', progress: 10 });
          const quoteResp = await fetch(
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
          );
          const quoteJson = await quoteResp.json();
          const info = quoteJson.quoteResponse?.result?.[0] || {};
          send({ type: 'status', message: 'Generating analysis...', progress: 60 });
          const report = await generateReport(symbol, info, env);
          await env.REPORTS.put(
            id,
            JSON.stringify({ symbol, created: Date.now(), content: report })
          );
          send({ type: 'status', message: 'Completed', progress: 100 });
          send({ type: 'report', content: report });
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'application/json', 'X-Report-Id': id }
      });
    }

    if (url.pathname === '/reports' && request.method === 'GET') {
      const list = await env.REPORTS.list();
      const reports = [] as Array<{ id: string; symbol: string; created: number }>;
      for (const key of list.keys) {
        const record = await env.REPORTS.get(key.name, 'json') as
          | { symbol: string; created: number }
          | null;
        if (record) {
          reports.push({ id: key.name, symbol: record.symbol, created: record.created });
        }
      }
      return new Response(JSON.stringify(reports), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname.startsWith('/report/') && request.method === 'GET') {
      const id = url.pathname.split('/').pop()!;
      const record = (await env.REPORTS.get(id, 'json')) as
        | { content: string }
        | null;
      if (!record) {
        return new Response('not found', { status: 404 });
      }
      return new Response(record.content, { headers: { 'Content-Type': 'text/plain' } });
    }

    return new Response('Not found', { status: 404 });
  }
};
