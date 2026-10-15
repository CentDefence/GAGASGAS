import { Redis } from '@upstash/redis';
import { timingSafeEqual } from 'crypto';
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});
export const isAdmin = (req) => {
  const a = Buffer.from(String(req.headers['x-admin'] || '')), b = Buffer.from(process.env.ADMIN_PASSWORD || '');
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
};
export const discord = (path, method = 'GET', body) =>
  fetch('https://discord.com/api/v10' + path, {
    method, headers: { Authorization: 'Bot ' + process.env.DISCORD_TOKEN, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  }).then((r) => r.json());
