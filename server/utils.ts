import hapi from '@hapi/hapi';
import { PassThrough } from 'node:stream';


/**
 * Starts an SSE stream. Sets the appropriate headers and starts sending the response. 
 * 
 * The specific headers set are 
 * - Content-Type: `text/event-stream`
 * - Cache-Control: `no-cache`
 * - Connection: `keep-alive`
 * - X-Accel-Buffering: `no`
 * 
 * @param h the hapi response tookit
 * @param retryMilliseconds Zero to disable the retry field, greater than zero to enable it
 * @returns 
 */
export function makeSSE(h: hapi.ResponseToolkit<hapi.ReqRefDefaults>, retryMilliseconds: number) {
  if (typeof retryMilliseconds !== "number" || retryMilliseconds < 0)
    throw new Error("Invalid retryMilliseconds: must be a non-negative number");

  const stream = new PassThrough();

  h.response(stream)
    .type('text/event-stream')
    .header('Cache-Control', 'no-cache')
    .header('Connection', 'keep-alive')
    .header("X-Accel-Buffering", "no");

  stream.write(": This is a comment. It is only visible to clients which load this page directly.\n");
  stream.write(": https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events\n");

  /**
   * 
   * @param {string} eventName The event name. If zero-length, the field is omitted
   * @param eventData The data to send. Must be stringify-able to JSON.
   * @param {string} eventId The event id. If zero-length, the field is omitted.
   */
  const write = (eventName: string, eventData: any, eventId: string) => {
    if (typeof eventName !== "string")
      throw new Error("Event name must be a string (a zero-length string disables the field)");
    if (eventName.includes("\n"))
      throw new Error("Event name cannot contain newlines");
    if (typeof eventId !== "string")
      throw new Error("Event ID must be a string");
    if (eventId.includes("\n"))
      throw new Error("Event ID cannot contain newlines");

    stream.write([
      eventName && `event: ${eventName}`,
      `data: ${JSON.stringify(eventData)}`,
      eventId && `id: ${eventId}`,
      retryMilliseconds && `retry: ${retryMilliseconds}`,
    ].filter(e => e).join("\n") + "\n\n");
  }

  const close = () => stream.end();

  return { write, close };

}
