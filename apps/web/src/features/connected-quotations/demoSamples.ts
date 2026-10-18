import exampleAUrl from '../../assets/example-quotation-a.pdf?url&no-inline';
import exampleBUrl from '../../assets/example-quotation-b.pdf?url&no-inline';
import type { IntakeSample } from '../quotations/types';

export interface DemoQuotationSample extends IntakeSample {
  readonly url: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly mimeType: 'application/pdf';
  readonly pageCount: 1;
}

// Public product inputs only. Extraction and human confirmation use the ordinary API.
export const demoSamples: readonly DemoQuotationSample[] = Object.freeze([
  Object.freeze({
    id: 'example-a', label: 'Supplier A example', fileName: 'example-quotation-a.pdf',
    description: 'A fictional fabric quotation with a faster delivery commitment. One-page English PDF.',
    url: exampleAUrl, sizeBytes: 3199,
    sha256: '556f3dd36a3a265f5ca6517759f94b4611b204b0ed987870d16cfe896a69db04',
    mimeType: 'application/pdf' as const, pageCount: 1 as const,
  }),
  Object.freeze({
    id: 'example-b', label: 'Supplier B example', fileName: 'example-quotation-b.pdf',
    description: 'A fictional fabric quotation with a lower unit price and longer delivery. One-page English PDF.',
    url: exampleBUrl, sizeBytes: 3200,
    sha256: '5d9f95429e4d9d8ea6120d989fa76904427167954a413f30246f065ba04fe9d9',
    mimeType: 'application/pdf' as const, pageCount: 1 as const,
  }),
]);

const MAX_SAMPLE_BYTES = 64 * 1024;
const LOAD_TIMEOUT_MS = 15_000;

/** Fetch an allowlisted public PDF; this never uploads, extracts or confirms a quotation. */
export async function loadDemoSample(sampleId: string, signal?: AbortSignal): Promise<File> {
  const sample = demoSamples.find(item => item.id === sampleId);
  if (!sample) throw new Error('This example is unavailable. Choose one of the listed examples.');
  const url = new URL(sample.url, window.location.href);
  if (url.origin !== window.location.origin || !['https:', 'http:'].includes(url.protocol)
      || url.username || url.password || url.hash) {
    throw new Error('The example must come from this application. Upload your own PDF instead.');
  }
  if (signal?.aborted) throw new DOMException('Example loading was cancelled.', 'AbortError');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, LOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url.href, {
      signal: controller.signal, credentials: 'omit', redirect: 'error', cache: 'no-cache',
    });
    if (response.status !== 200 || response.redirected || response.url !== url.href) {
      throw new Error('The example could not be loaded from this application. Please try again.');
    }
    if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== sample.mimeType) {
      throw new Error('The example response was not a PDF. Please reload the application.');
    }
    const declaredSize = response.headers.get('content-length');
    if (declaredSize !== null && (!/^\d+$/.test(declaredSize) || Number(declaredSize) > MAX_SAMPLE_BYTES)) {
      throw new Error('The example exceeds its allowed size. Please reload the application.');
    }
    if (!response.body) throw new Error('The example PDF was empty. Please try again.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_SAMPLE_BYTES || length > sample.sizeBytes) {
          throw new Error('The example differs from the published PDF. Please reload the application.');
        }
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
    }
    if (length !== sample.sizeBytes) {
      throw new Error('The example download was incomplete. Please try again.');
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    if (!new TextDecoder().decode(bytes.subarray(0, 5)).startsWith('%PDF-')) {
      throw new Error('The example is not a valid PDF. Please reload the application.');
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes.buffer);
    const sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (sha256 !== sample.sha256) {
      throw new Error('The example differs from the published PDF. Please reload the application.');
    }
    if (controller.signal.aborted) throw new DOMException('Example loading was cancelled.', 'AbortError');
    return new File([bytes.buffer], sample.fileName, { type: sample.mimeType, lastModified: 0 });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
