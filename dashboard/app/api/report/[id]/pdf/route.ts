import { PDFDocument, StandardFonts } from 'pdf-lib';

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
  if (!resp.ok) {
    return new Response('not found', { status: 404 });
  }
  const text = await resp.text();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;
  let y = height - 24;
  for (const line of text.split('\n')) {
    page.drawText(line, { x: 24, y, size: fontSize, font });
    y -= fontSize + 2;
    if (y < 24) {
      page = pdfDoc.addPage();
      y = height - 24;
    }
  }
  const pdfBytes = await pdfDoc.save();
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"'
    }
  });
}
