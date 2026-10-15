import { randomBytes } from 'crypto';
import { redis } from '../lib/util.js';
const clip = (s, n) => String(s || '').trim().slice(0, n);
const pub = ({ token, ...t }) => t;
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const t = await redis.get('t:' + req.query.id);
    if (!t || t.token !== req.query.t) return res.status(404).json({ error: 'not found' });
    return res.json(pub(t));
  }
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  if (b.id) { // ответ пользователя в своём тикете
    const t = await redis.get('t:' + b.id), text = clip(b.text, 2000);
    if (!t || t.token !== b.t || t.status === 'closed') return res.status(403).json({ error: 'forbidden' });
    if (!text) return res.status(400).json({ error: 'empty' });
    t.messages.push({ from: 'user', text, at: Date.now() }); t.status = 'open';
    await redis.set('t:' + b.id, t);
    return res.json(pub(t));
  }
  if (b.website) return res.json({ id: 'T000000', token: 'x' }); // honeypot
  const d = clip(b.discord, 64), subject = clip(b.subject, 120), message = clip(b.message, 2000);
  if (!d || !subject || !message) return res.status(400).json({ error: 'Fill in all fields' });
  const t = {
    id: 'T' + randomBytes(3).toString('hex').toUpperCase(), token: randomBytes(8).toString('hex'),
    discord: d, category: clip(b.category, 40), subject, message, status: 'open', created: Date.now(),
    messages: [{ from: 'user', text: message, at: Date.now() }],
  };
  await redis.set('t:' + t.id, t); await redis.lpush('tickets', t.id);
  res.json({ id: t.id, token: t.token });
}
