export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;

  if (!url || url.trim() === '') {
    return res.status(400).json({ success: false, message: 'Missing Meta AI URL' });
  }

  const apiUrl = `https://versevidsaver.com/api/meta-video?postUrl=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-ch-ua-platform': '"Android"',
        'sec-ch-ua': '"Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-gpc': '1',
        'accept-language': 'en-US,en;q=0.8',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://versevidsaver.com/',
        'priority': 'u=1, i',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, message: 'Upstream API error' });
    }

    const data = await response.json();

    if (!data || !data.success) {
      return res.status(422).json({ success: false, message: 'Failed to fetch video' });
    }

    return res.status(200).json({
      success: true,
      platform: data.data?.platform ?? '',
      title: data.data?.title ?? '',
      video_id: data.data?.videoId ?? '',
      thumbnail: data.data?.thumbnail ?? '',
      video: data.data?.videoUrl ?? '',
      width: data.data?.width ?? '',
      height: data.data?.height ?? '',
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
