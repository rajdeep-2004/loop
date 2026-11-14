import type { FastifyInstance, FastifyRequest } from 'fastify';
import { badRequest } from '../../lib/errors';
import { requireAuth } from '../auth/guard';
import { readPublicImage, savePublicImage } from './uploads.service';

/** Reads the single uploaded file of a multipart request into memory (size is capped by the multipart plugin). */
export async function readUpload(request: FastifyRequest): Promise<{ data: Buffer; filename: string; mimetype: string }> {
  if (!request.isMultipart()) throw badRequest('expected_multipart', 'Send the file as multipart/form-data');
  const file = await request.file();
  if (!file) throw badRequest('missing_file', 'No file was sent');
  return { data: await file.toBuffer(), filename: file.filename, mimetype: file.mimetype };
}

export async function uploadsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post('/uploads/images', async (request, reply) => {
    const upload = await readUpload(request);
    return reply.status(201).send({ data: await savePublicImage(upload.data) });
  });

  app.get<{ Params: { name: string } }>('/files/public/:name', async (request, reply) => {
    const file = await readPublicImage(request.params.name);
    return reply
      .header('Content-Type', file.contentType)
      .header('Cache-Control', 'private, max-age=86400')
      .send(file.data);
  });
}
