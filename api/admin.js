import { redis, isAdmin, discord } from '../lib/util.js';
const pub = ({ token, ...t }) => t;
export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  if (req.method === 'GET') {
    const ids = await redis.lrange('tickets', 0, 99);
    const list = ids.length ? await redis.mget(...ids.map((i) => 't:' + i)) : [];
    return res.json(list.filter(Boolean).map(pub));
  }
  const { action, id, text, status } = req.body || {};
  const t = await redis.get('t:' + id);
  if (!t) return res.status(404).json({ error: 'not found' });
  if (action === 'reply') {
    if (text && text.trim()) t.messages.push({ from: 'admin', text: text.trim().slice(0, 2000), at: Date.now() });
    t.status = status || 'answered';
  } else if (action === 'discord' && !t.url) {
    const g = process.env.GUILD_ID;
    const ch = await discord(`/guilds/${g}/channels`, 'POST', {
      name: `ticket-${t.id.toLowerCase()}`, type: 0, parent_id: process.env.CATEGORY_ID || undefined,
      permission_overwrites: [
        { id: g, type: 0, deny: '1024' }, // @everyone не видит
        { id: process.env.ADMIN_ROLE_ID, type: 0, allow: '68608' }, // админы
        { id: process.env.CLIENT_ID, type: 1, allow: '68608' }, // бот
      ],
    });
    if (!ch.id) return res.status(500).json({ error: ch.message || 'Discord error' });
    await discord(`/channels/${ch.id}/messages`, 'POST', {
      content: `**Ticket ${t.id}** · ${t.category}\n**From:** ${t.discord}\n**Subject:** ${t.subject}\n\n${t.message}`.slice(0, 1900),
    });
    t.url = `https://discord.com/channels/${g}/${ch.id}`;
  }
  await redis.set('t:' + id, t);
  res.json(pub(t));
}
