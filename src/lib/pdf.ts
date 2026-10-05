import { Booking } from '@/types';
import { formatDateNumeric, money } from './scheduler';

function pdfText(value: string | number): string {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function pdfBytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    out[i] = value.charCodeAt(i) & 255;
  }
  return out;
}

export function makeFinancialPdf(items: Booking[], start: string, end: string, brandName: string): Blob {
  const total = items.reduce((acc, item) => acc + Number(item.price || 0), 0);
  const rows = items.map(
    item =>
      `${pdfText(formatDateNumeric(item.date))}  ${pdfText(item.time)}  ${pdfText(
        item.name.padEnd(20).slice(0, 20)
      )}  ${pdfText(item.serviceName.padEnd(18).slice(0, 18))}  ${pdfText(money(item.price))}`
  );

  const lines = [
    pdfText(`RELATORIO FINANCEIRO - ${brandName.toUpperCase()}`),
    pdfText(`Periodo: ${formatDateNumeric(start)} a ${formatDateNumeric(end)}`),
    pdfText(`Total de atendimentos concluidos: ${items.length}`),
    pdfText(`Faturamento total: ${money(total)}`),
    '--------------------------------------------------------------------------------',
    'DATA        HORA   CLIENTE               SERVICO             VALOR',
    '--------------------------------------------------------------------------------',
    ...rows,
    '--------------------------------------------------------------------------------',
    pdfText(`TOTAL: ${money(total)}`)
  ];

  let textStream = 'BT /F1 10 Tf 36 780 Td 14 TL\n';
  lines.forEach((line, index) => {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    textStream += index === 0 ? `(${escaped}) Tj\n` : `T* (${escaped}) Tj\n`;
  });
  textStream += 'ET';

  const streamBytes = pdfBytes(textStream);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    `<< /Length ${streamBytes.length} >>\nstream\n${textStream}\nendstream`
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, idx) => {
    offsets.push(body.length);
    body += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdfBytes(body) as any], { type: 'application/pdf' });
}
