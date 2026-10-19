"""读取 data/subscriptions.json，抓取各订阅源 RSS，生成 data/feeds.json（供 App 同源读取）。"""
import json
import datetime
import re
import html

import feedparser

MAX_EPISODES = 50


def clean(s):
    s = re.sub(r'<[^>]+>', '', s or '')
    return html.unescape(s).strip()


def main():
    with open('data/subscriptions.json', encoding='utf-8') as f:
        subs = json.load(f)

    out_feeds = []
    for sub in subs:
        fid = sub.get('id') or re.sub(r'\W+', '-', sub.get('name', 'feed')).strip('-').lower()
        print(f"抓取: {sub.get('name')} <{sub.get('feedUrl')}>")
        try:
            d = feedparser.parse(sub['feedUrl'])
            eps = []
            for e in d.entries[:MAX_EPISODES]:
                audio = ''
                for link in e.get('links', []):
                    if link.get('rel') == 'enclosure':
                        audio = link.get('href', '')
                        break
                img = e.get('image', {})
                cover = img.get('href', '') if isinstance(img, dict) else ''
                eps.append({
                    'title': clean(e.get('title', '')),
                    'pubDate': e.get('published', ''),
                    'duration': str(e.get('itunes_duration', '')),
                    'audioUrl': audio,
                    'cover': cover,
                    'link': e.get('link', ''),
                })
            out_feeds.append({
                'id': fid,
                'name': sub.get('name', ''),
                'feedUrl': sub.get('feedUrl', ''),
                'updatedAt': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                'episodes': eps,
            })
            print(f'  -> {len(eps)} 集')
        except Exception as ex:  # noqa: BLE001 - 单个源失败不影响其他源
            print(f'  !! 失败: {ex}')

    out = {
        'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'feeds': out_feeds,
    }
    with open('data/feeds.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'共 {len(out_feeds)} 个订阅源已写入 data/feeds.json')


if __name__ == '__main__':
    main()
