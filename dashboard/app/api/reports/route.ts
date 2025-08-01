export const runtime = 'edge';

export async function GET() {
  const api = process.env.WORKER_URL;
  if (!api) {
    return new Response('worker not configured', { status: 501 });
  }
  const resp = await fetch(`${api}/reports`);
  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers
  });
}
