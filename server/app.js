import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { generateLevel, GenerationError } from './providers.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const requestSchema = z.object({
  image: z.string().min(1).max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4).optional(),
  mimeType: z.enum(['image/jpeg', 'image/png']).optional(),
  question: z.string().trim().min(1).max(2000),
}).strict();

export function validateRequest(body) {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) throw new GenerationError('INVALID_REQUEST', 'Choose a JPEG/PNG frame up to 5 MB and enter a question of 1–2000 characters.', 400);
  const { image, mimeType } = parsed.data;
  if (image === undefined && mimeType === undefined) return parsed.data;
  if (image === undefined || mimeType === undefined) throw new GenerationError('INVALID_REQUEST', 'Provide both a frame and its JPEG/PNG format, or leave both out.', 400);
  if (image.length % 4 || /[^A-Za-z0-9+/=]/.test(image)) throw new GenerationError('INVALID_IMAGE', 'Send a base64 JPEG or PNG frame, without a URL or data prefix.', 400);
  const bytes = Buffer.from(image, 'base64');
  if (bytes.toString('base64') !== image) throw new GenerationError('INVALID_IMAGE', 'The frame contains invalid base64 data.', 400);
  if (bytes.length > MAX_IMAGE_BYTES) throw new GenerationError('IMAGE_TOO_LARGE', 'The selected frame exceeds 5 MB.', 413);
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.length >= 24;
  const jpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  if (!(mimeType === 'image/png' ? png : jpeg)) throw new GenerationError('INVALID_IMAGE', 'The frame does not match its JPEG/PNG format. Please capture it again.', 400);
  return parsed.data;
}

export function createApp({ generate = generateLevel, rateLimitMax = 10 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.post('/api/generate-level', rateLimit({ windowMs: 60000, limit: rateLimitMax, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a minute before generating another level.' } } }),
  express.json({ limit: '7mb' }), async (req, res, next) => {
    try { const input = validateRequest(req.body); const result = await generate(input); res.json(result); }
    catch (error) { next(error); }
  });
  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found.' } }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'IMAGE_TOO_LARGE', message: 'The selected frame exceeds the request size limit.' } });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request must contain valid JSON.' } });
    const known = error instanceof GenerationError;
    res.status(known ? error.status : 500).json({ error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Could not generate this level. Please try again.' } });
  });
  return app;
}
