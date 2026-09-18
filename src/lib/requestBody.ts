import { PayloadTooLargeError } from '@/lib/errors';

async function readBoundedText(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError(`Request body exceeds ${maxBytes} bytes`);
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf-8');
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new PayloadTooLargeError(`Request body exceeds ${maxBytes} bytes`);
  }

  const text = await readBoundedText(request, maxBytes);
  return text.length > 0 ? JSON.parse(text) : {};
}
