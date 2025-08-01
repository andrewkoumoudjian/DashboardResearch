export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const resp = await fetch(
    `https://ticker-2e1ica8b9.now.sh/keyword?q=${encodeURIComponent(q)}`
  );
  const data = await resp.json();
  const symbols = (data || []).map((d: { symbol: string }) => d.symbol).slice(0, 5);
  return new Response(JSON.stringify(symbols), {
    headers: { 'Content-Type': 'application/json' }
  });
}
