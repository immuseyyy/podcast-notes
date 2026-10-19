// 播客速记专用 CORS 中转 Worker（你自己的跨域代理）
// 部署后用法: https://<你的worker>.workers.dev/?url=<encodeURIComponent(目标URL)>
// 把这个完整地址填到 App「设置 → 自建代理地址」里（保留 ?url={url} 占位写法见 README）

export default {
  async fetch(request) {
    const reqUrl = new URL(request.url);

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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}
