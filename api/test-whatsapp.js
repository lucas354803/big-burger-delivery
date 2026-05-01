import { enviarWhatsAppTexto } from './whatsapp.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  try {
    const { telefone, mensagem } = req.body || {};
    const result = await enviarWhatsAppTexto(telefone, mensagem || '🍔 Teste Big Burger: WhatsApp API funcionando!');
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
