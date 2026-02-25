import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return res.json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (session == null || session.user == null || session.user.id == null) {
    return res.status(401).json({ error: 'Nao autorizado' });
  }
  const uid = session.user.id;
  const form = formidable({ maxFileSize: 2 * 1024 * 1024 });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Erro ao processar arquivo' });
    const fileRaw = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!fileRaw) return res.status(400).json({ error: "Nenhum arquivo" });
    const file = fileRaw;
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype || '') === false) return res.status(400).json({ error: 'Tipo nao permitido' });
    const ext = (file.mimetype || 'image/png').split('/')[1].replace('jpeg', 'jpg');
    const filename = 'avatars/' + uid + '-' + Date.now() + '.' + ext;
    const fileBuffer = fs.readFileSync(file.filepath);
    try {
      const blob = await put(filename, fileBuffer, { access: 'public', addRandomSuffix: false, allowOverwrite: true });
      await prisma.user.update({ where: { id: uid }, data: { image: blob.url } });
      return res.json({ url: blob.url });
    } catch {
      return res.status(500).json({ error: 'Erro ao salvar arquivo' });
    }
  });
}
