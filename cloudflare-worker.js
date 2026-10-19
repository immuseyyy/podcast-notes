// 播客速记 Worker：CORS 中转代理 + 播放历史/收藏同步接口（KV 存储）
// 部署后用法:
//   代理: https://<你的worker>.workers.dev/?url=<encodeURIComponent(目标URL)>
//         把完整地址填到 App「设置 → 自建代理地址」里（保留 ?url={url} 占位写法）
//   同步: 需要在 Worker 上绑定 KV 命名空间（变量名 SYNC_KV），并设置环境变量 SYNC_TOKEN（同步口令）
//         POST /api/sync/pull  {token, since}      -> {ok, history, favorites, serverTime}
//         POST /api/sync/push  {token, history, favorites} -> {ok, serverTime}

const KV_HISTORY = 'history:v1';
const KV_FAVORITES = 'favorites:v1';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}

function checkAuth(request, env, bodyToken) {
  const secret = env.SYNC_TOKEN || '';
  if (!secret) return { ok: false, status: 503, error: 'SYNC_TOKEN 未配置' };
  const h = request.headers.get('authorization') || '';
  if (h === 'Bearer ' + secret) return { ok: true };
  if (bodyToken && bodyToken === secret) return { ok: true };
  return { ok: false, status: 401, error: 'unauthorized' };
}

// 按 key 合并，updatedAt 大的赢（last-write-wins）
function mergeRecords(oldArr, newArr) {
  const map = new Map();
  for (const r of oldArr || []) if (r && r.key) map.set(r.key, r);
  for (const r of newArr || []) {
    if (!r || !r.key) continue;
    const cur = map.get(r.key);
    if (!cur || (r.updatedAt || 0) >= (cur.updatedAt || 0)) map.set(r.key, r);
  }
  return [...map.values()];
}

async function handleSync(request, env) {
  const url = new URL(request.url);
  const kv = env.SYNC_KV;
  if (!kv) return json({ ok: false, error: 'SYNC_KV 未绑定' }, 503);
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

  let body = {};
  if (request.method === 'POST') {
    try { body = await request.json(); } catch { body = {}; }
  }
  const path = url.pathname;

  if (path === '/api/sync/pull' && request.method === 'POST') {
    const auth = checkAuth(request, env, body.token);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
    const since = Number(body.since || 0);
    const [history, favorites] = await Promise.all([
      kv.get(KV_HISTORY, 'json'),
      kv.get(KV_FAVORITES, 'json'),
    ]);
    const fresh = (arr) => (arr || []).filter((r) => r && (r.updatedAt || 0) > since);
    return json({ ok: true, history: fresh(history), favorites: fresh(favorites), serverTime: Date.now() });
  }

  if (path === '/api/sync/push' && request.method === 'POST') {
    const auth = checkAuth(request, env, body.token);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
    const oldHistory = await kv.get(KV_HISTORY, 'json');
    // history 按 key 合并保留最近 200 条；favorites 以客户端全量为准（取消收藏即删除）
    let history = mergeRecords(oldHistory, body.history);
    history.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
    history = history.slice(0, 200);
    const favorites = (body.favorites || []).filter((r) => r && r.key).slice(0, 500);
    await Promise.all([
      kv.put(KV_HISTORY, JSON.stringify(history)),
      kv.put(KV_FAVORITES, JSON.stringify(favorites)),
    ]);
    return json({ ok: true, serverTime: Date.now() });
  }

  return json({ ok: false, error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const reqUrl = new URL(request.url);

    // 同步接口（/api/*）
    if (reqUrl.pathname.startsWith('/api/')) {
      return handleSync(request, env);
    }

    // ---- 以下是原 CORS 代理逻辑（保持不变） ----
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const target = reqUrl.searchParams.get('url');
    if (!target) {
      return new Response('missing ?url= parameter', { status: 400, headers: corsHeaders() });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
      if (!['http:', 'https:'].includes(targetUrl.protocol)) throw new Error('bad protocol');
    } catch {
      return new Response('invalid url', { status: 400, headers: corsHeaders() });
    }

    const res = await fetch(targetUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (podcast-notes-proxy)' },
      redirect: 'follow',
    });

    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.delete('content-security-policy');
    return new Response(res.body, { status: res.status, headers });
  },
};
