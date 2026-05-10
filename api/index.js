import adminMenu from '../lib/api/admin-menu.js';
import admin from '../lib/api/admin.js';
import clientes from '../lib/api/clientes.js';
import createPix from '../lib/api/create-pix.js';
import menu from '../lib/api/menu.js';
import motoboys from '../lib/api/motoboys.js';
import orderStatus from '../lib/api/order-status.js';
import pedidos from '../lib/api/pedidos.js';
import storeSettings from '../lib/api/store-settings.js';
import webhook from '../lib/api/webhook.js';
import siteBanner from '../lib/api/site-banner.js';
import zerarRelatorio from '../lib/api/zerar-relatorio.js';
import historico from '../lib/api/historico.js';
import testWhatsapp from '../lib/api/test-whatsapp.js';

const routes = {
  'admin-menu': adminMenu,
  admin,
  clientes,
  'create-pix': createPix,
  menu,
  motoboys,
  'order-status': orderStatus,
  pedidos,
  'store-settings': storeSettings,
  webhook,
  'site-banner': siteBanner,
  'zerar-relatorio': zerarRelatorio,
  historico,
  'test-whatsapp': testWhatsapp,
};

export default async function handler(req, res) {
  const rawRoute = String(req.query.route || req.query.action || '').replace(/^\/+|\/+$/g, '');
  const route = rawRoute.split('/')[0];
  const fn = routes[route];
  if (!fn) {
    return res.status(404).json({
      ok: false,
      error: 'Rota não encontrada',
      dica: 'Use /api?route=menu ou /api/menu. Rotas disponíveis: ' + Object.keys(routes).join(', ')
    });
  }
  return fn(req, res);
}
