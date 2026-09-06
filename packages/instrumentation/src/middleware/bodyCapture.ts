import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { trace } from '@opentelemetry/api';

const MAX_BODY_SIZE_BYTES = 64 * 1024; // 64 KB limit

/**
 * Safely converts a payload into a string representation and truncates it to 64KB.
 */
function serializeAndTruncate(payload: unknown): string | undefined {
  if (payload === undefined || payload === null) {
    return undefined;
  }

  try {
    let strPayload: string;
    if (typeof payload === 'string') {
      strPayload = payload;
    } else if (Buffer.isBuffer(payload)) {
      strPayload = payload.toString('utf-8');
    } else {
      strPayload = JSON.stringify(payload);
    }

    if (strPayload.length > MAX_BODY_SIZE_BYTES) {
      return strPayload.substring(0, MAX_BODY_SIZE_BYTES) + '... [TRUNCATED at 64KB]';
    }

    return strPayload;
  } catch (error) {
    return '[Unserializable Payload]';
  }
}

/**
 * Express middleware to capture req.body and res.send/res.json bodies
 * as custom OpenTelemetry span attributes with a strict 64KB truncation limit.
 */
export const bodyCaptureMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const span = trace.getActiveSpan();

  if (span && span.isRecording()) {
    if (req.body) {
      const capturedReqBody = serializeAndTruncate(req.body);
      if (capturedReqBody !== undefined) {
        span.setAttribute('custom.http.request.body', capturedReqBody);
      }
    }

    let responseCaptured = false;

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown): Response {
      if (!responseCaptured && span.isRecording()) {
        const capturedResBody = serializeAndTruncate(body);
        if (capturedResBody !== undefined) {
          span.setAttribute('custom.http.response.body', capturedResBody);
          responseCaptured = true;
        }
      }
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = function (body: unknown): Response {
      if (!responseCaptured && span.isRecording()) {
        const capturedResBody = serializeAndTruncate(body);
        if (capturedResBody !== undefined) {
          span.setAttribute('custom.http.response.body', capturedResBody);
          responseCaptured = true;
        }
      }
      return originalSend(body);
    };
  }

  next();
};
