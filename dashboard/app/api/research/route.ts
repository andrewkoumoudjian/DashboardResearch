export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return new Response('symbol required', { status: 400 });
  }
  const api = process.env.WORKER_URL;
  if (!api) {
    return new Response('worker not configured', { status: 501 });
  }
  const upstream = `${api}/research?symbol=${symbol}`;
  const resp = await fetch(upstream);
  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers
  });
}
