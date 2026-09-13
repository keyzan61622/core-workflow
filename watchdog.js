const axios = require('axios');

const PANEL_URL = process.env.PANEL_URL;
const API_KEY = process.env.PANEL_API_KEY;
const SERVER_IDS = (process.env.SERVER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

function validateEnv() {
  const missing = [];
  if (!PANEL_URL) missing.push('PANEL_URL');
  if (!API_KEY) missing.push('PANEL_API_KEY');
  if (SERVER_IDS.length === 0) missing.push('SERVER_IDS');

  if (missing.length > 0) {
    console.error(`Env var belum di-set: ${missing.join(', ')}`);
    console.error('Cek bagian "env:" di workflow .yml dan Secrets di Settings repo.');
    process.exit(1);
  }
}

async function checkAndStart(serverId) {
  try {
    const res = await axios.get(`${PANEL_URL}/api/client/servers/${serverId}/resources`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    const state = res.data?.attributes?.current_state;
    console.log(`[${serverId}] status: ${state}`);

    if (state === 'offline') {
      await axios.post(
        `${PANEL_URL}/api/client/servers/${serverId}/power`,
        { signal: 'start' },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            Accept: 'application/json',
          },
          timeout: 15000,
        }
      );
      console.log(`[${serverId}] offline -> signal start terkirim`);
    }
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data ?? err.message;
    console.error(`[${serverId}] gagal cek/start (status ${status ?? '-'}):`, detail);
  }
}

async function run() {
  validateEnv();
  console.log(`Cek ${SERVER_IDS.length} server pada ${new Date().toISOString()}`);

  for (const id of SERVER_IDS) {
    await checkAndStart(id);
  }

  console.log('Selesai.');
}

run();
