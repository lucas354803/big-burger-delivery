import { safeEnvStatus } from '../lib/_supabase.js';

export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: 'API do robô Big Burger online',
    env: safeEnvStatus()
  });
}
