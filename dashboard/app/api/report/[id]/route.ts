export const runtime = 'edge';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const api = process.env.WORKER_URL;
  if (!api) {
    return new Response('worker not configured', { status: 501 });
  }
  const resp = await fetch(`${api}/report/${params.id}`);
  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers
  });
}
