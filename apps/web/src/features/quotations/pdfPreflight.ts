export type PdfPreflightResult =
  | { ok: true }
  | { ok: false; code: 'file_type' | 'empty' | 'too_large' | 'signature' | 'unreadable'; message: string };

export function formatFileBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('en-US', { maximumFractionDigits: 1 })} KiB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('en-US', { maximumFractionDigits: 1 })} MiB`;
}

/** Local hints only: the server must inspect the full PDF, page count and encryption. */
export async function preflightPdf(file: File, maxBytes: number): Promise<PdfPreflightResult> {
  if (!/\.pdf$/i.test(file.name) || (file.type !== '' && file.type.toLowerCase() !== 'application/pdf')) {
    return { ok: false, code: 'file_type', message: 'Choose a PDF file with a .pdf extension.' };
  }
  if (file.size === 0) return { ok: false, code: 'empty', message: 'This file is empty. Choose a readable quotation PDF.' };
  if (file.size > maxBytes) {
    return { ok: false, code: 'too_large', message: `This file exceeds ${formatFileBytes(maxBytes)}. Choose a smaller PDF.` };
  }
  try {
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (header.length !== 5 || ![37, 80, 68, 70, 45].every((byte, index) => header[index] === byte)) {
      return { ok: false, code: 'signature', message: 'This file does not have a PDF header. Export the quotation as a PDF and select it again.' };
    }
  } catch {
    return { ok: false, code: 'unreadable', message: 'This file could not be read. Select it again or choose another PDF.' };
  }
  return { ok: true };
}
