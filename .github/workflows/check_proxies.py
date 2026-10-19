"""每天健康检查 proxies.json 中的公共代理：探测可用性，剔除失效项，按延迟排序后写回。"""
import json
import urllib.parse
import urllib.request
import time
import datetime

PROBE_TARGETS = [
    'https://www.xiaoyuzhoufm.com/robots.txt',
    'https://itunes.apple.com/search?term=test&media=podcast&limit=1',
]
TIMEOUT = 20


def probe(template):
    for target in PROBE_TARGETS:
        url = template.replace('{url}', urllib.parse.quote(target, safe=''))
        try:
            t0 = time.time()
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                body = r.read(200)
                if r.status == 200 and len(body) > 0:
                    return True, round(time.time() - t0, 2)
        except Exception as e:  # noqa: BLE001 - 探测失败即视为不可用
            print(f'  探测异常: {e}')
            continue
    return False, None


def main():
    with open('proxies.json', encoding='utf-8') as f:
        data = json.load(f)

    alive = []
    for p in data.get('proxies', []):
        print(f"检测 {p['name']} ...")
        ok, latency = probe(p['template'])
        if ok:
            print(f"  可用，延迟 {latency}s")
            p['lastOk'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            p['latency'] = latency
            alive.append(p)
        else:
            print('  不可用，已剔除')

    alive.sort(key=lambda x: x.get('latency', 999))
    data['proxies'] = alive
    data['updated'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    with open('proxies.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'可用代理数: {len(alive)}')


if __name__ == '__main__':
    main()
