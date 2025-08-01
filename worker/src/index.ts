export interface Env {
  RESEARCH_API_URL: string;
  REPORTS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/research' && request.method === 'GET') {
      const symbol = url.searchParams.get('symbol');
      if (!symbol) {
        return new Response('symbol required', { status: 400 });
      }
      const upstream = `${env.RESEARCH_API_URL}?symbol=${encodeURIComponent(symbol)}`;
      const resp = await fetch(upstream);
      const id = `${symbol}-${Date.now()}`;

      if (resp.body) {
        const [body1, body2] = resp.body.tee();
        (async () => {
          const text = await new Response(body1).text();
          await env.REPORTS.put(
            id,
            JSON.stringify({ symbol, created: Date.now(), content: text })
          );
        })();
        const headers = new Headers(resp.headers);
        headers.set('X-Report-Id', id);
        return new Response(body2, { status: resp.status, headers });
      }

      return resp;
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
