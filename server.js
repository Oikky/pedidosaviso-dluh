const https = require('https');
const http = require('http');

const XI_KEY = '0ea811c2e82a6c12c044c7c384f2949756d2a0076b65116bf830d239ec0a9d5b';
const XI_VOICE = '21m00Tcm4TlvDq8ikWAM';
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // CORS — permite qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Health check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TTS Proxy OK');
    return;
  }

  // TTS endpoint: GET /tts?text=Olá
  if (req.url.startsWith('/tts')) {
    const url = new URL(req.url, `http://localhost`);
    const text = url.searchParams.get('text') || '';

    if (!text) {
      res.writeHead(400); res.end('text param required'); return;
    }

    const body = JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${XI_VOICE}`,
      method: 'POST',
      headers: {
        'xi-api-key': XI_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const proxy = https.request(options, (xiRes) => {
      if (xiRes.statusCode !== 200) {
        res.writeHead(xiRes.statusCode);
        xiRes.pipe(res);
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache'
      });
      xiRes.pipe(res);
    });

    proxy.on('error', (e) => {
      console.error('ElevenLabs error:', e);
      res.writeHead(500); res.end('TTS error');
    });

    proxy.write(body);
    proxy.end();
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log(`TTS proxy rodando na porta ${PORT}`));
