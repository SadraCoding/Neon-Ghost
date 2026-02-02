/**
 * NEON GHOST DoH Proxy - Compact February 2026 Edition
 * GitHub: https://github.com/SadraCoding/Neon-Ghost
 * ETH address (Mainnet / BSC / Base): 0xa503B29d4B0fF5942e98813Ea232B215117Bf5A5
 */

const GENERAL_PROVIDERS = [
  { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query", weight: 50 },
  { name: "Google", url: "https://dns.google/dns-query", weight: 40 },
  { name: "Quad9 Secure", url: "https://dns.quad9.net/dns-query", weight: 35 },
  { name: "AdGuard Default", url: "https://dns.adguard.com/dns-query", weight: 30 },
  { name: "Mullvad Adblock", url: "https://adblock.dns.mullvad.net/dns-query", weight: 28 },
  { name: "Control D Ads+Trackers", url: "https://freedns.controld.com/p2", weight: 25 },
  { name: "RethinkDNS Max", url: "https://max.rethinkdns.com/dns-query", weight: 22 },
  { name: "dns0.eu", url: "https://dns0.eu/dns-query", weight: 18 },
  { name: "dnsforge.de", url: "https://dnsforge.de/dns-query", weight: 16 },
  { name: "DNS.sb", url: "https://doh.dns.sb/dns-query", weight: 18 },
  { name: "Surfshark DNS", url: "https://doh.surfsharkdns.com/dns-query", weight: 15 },
];

const FAMILY_SAFE_PROVIDERS = [
  { name: "Cloudflare Families", url: "https://family.cloudflare-dns.com/dns-query", weight: 55 },
  { name: "CleanBrowsing Family", url: "https://family-filter-dns.cleanbrowsing.org/dns-query", weight: 50 },
  { name: "CleanBrowsing Adult", url: "https://adult-filter-dns.cleanbrowsing.org/dns-query", weight: 45 },
  { name: "OpenDNS FamilyShield", url: "https://familyshield.opendns.com/dns-query", weight: 48 },
  { name: "AdGuard Family", url: "https://family.adguard-dns.com/dns-query", weight: 40 },
];

const CACHE_TTL = 300;

export default {
  async fetch(request) {
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/' || url.pathname === '') {
    return serveLandingPage(request);
  }

  if (url.pathname === '/dns-query') {
    return handleDoHRequest(request, url);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  return new Response('Not Found', { status: 404 });
}

async function handleDoHRequest(request, url) {
  const isGet = request.method === 'GET';
  const isPost = request.method === 'POST';

  if (!isGet && !isPost) return new Response('Method Not Allowed', { status: 405 });
  if (isGet && !url.searchParams.has('dns')) return new Response('Missing dns param', { status: 400 });

  const providers = GENERAL_PROVIDERS;

  const provider = selectProvider(providers);
  const targetUrl = provider.url + url.search;

  try {
    const headers = new Headers(request.headers);
    headers.set('User-Agent', 'NeonGhost/2026');

    if (isPost) headers.set('Content-Type', 'application/dns-message');
    else headers.set('Accept', 'application/dns-message');

    const req = new Request(targetUrl, {
      method: request.method,
      headers,
      body: isPost ? await request.arrayBuffer() : null,
      redirect: 'follow'
    });

    let res = await fetch(req);
    if (!res.ok) res = await tryFallback(request, url, provider, providers);

    const newHeaders = new Headers(res.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL}`);

    return new Response(res.body, { status: res.status, headers: newHeaders });
  } catch {
    return await tryFallback(request, url, provider, providers);
  }
}

function selectProvider(providers) {
  const total = providers.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * total;
  for (const p of providers) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return providers[0];
}

async function tryFallback(request, url, failed, providers) {
  const others = providers.filter(p => p.url !== failed.url);
  for (const p of others) {
    try {
      const target = p.url + url.search;
      const headers = new Headers(request.headers);
      headers.set('User-Agent', 'NeonGhost/2026');
      if (request.method === 'POST') headers.set('Content-Type', 'application/dns-message');
      else headers.set('Accept', 'application/dns-message');

      const req = new Request(target, {
        method: request.method,
        headers,
        body: request.method === 'POST' ? await request.arrayBuffer() : null
      });

      const res = await fetch(req);
      if (res.ok) {
        const newHeaders = new Headers(res.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
        return new Response(res.body, { status: res.status, headers: newHeaders });
      }
    } catch {}
  }
  return new Response('All DNS providers failed', { status: 503 });
}

function serveLandingPage(request) {
  const u = new URL(request.url);
  u.pathname = '/dns-query';
  const endpoint = u.toString();

  return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NEON GHOST • DoH</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --neon: #00ff9f;
      --pink: #ff00ea;
      --cyan: #00f0ff;
      --text: #e0f7fa;
      --dim: #a0c0c8;
      --card: rgba(10,10,25,0.88);
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Roboto Mono', monospace;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      font-size: 13.5px;
      line-height: 1.35;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 1.2rem 0.8rem; }
    header { text-align:center; padding: 3.2rem 0 2rem; }
    h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(3.2rem, 10vw, 5.8rem);
      background: linear-gradient(90deg, var(--neon), var(--pink), var(--cyan));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 0 50px rgba(0,255,159,0.8);
      letter-spacing: 6px;
      margin-bottom: 0.6rem;
      cursor: default;
      transition: text-shadow 0.4s ease;
    }
    h1:hover {
      text-shadow: 0 0 80px rgba(0,255,159,0.95), 0 0 120px rgba(255,0,234,0.8);
    }
    .subtitle { font-size: 1.15rem; color: var(--dim); margin: 0.8rem 0 1.2rem; }

    .endpoint-card {
      background: var(--card);
      border: 1.5px solid var(--neon);
      border-radius: 14px;
      padding: 1.6rem 1.4rem;
      box-shadow: 0 0 50px rgba(0,255,159,0.3);
      backdrop-filter: blur(10px);
      text-align: center;
      margin: 0 auto 2rem;
      max-width: 800px;
    }
    .endpoint-card h2 { color: var(--neon); font-size: 1.9rem; margin-bottom: 1rem; }
    #endpoint {
      background: #05050d;
      padding: 1.1rem;
      border-radius: 10px;
      font-size: 1rem;
      word-break: break-all;
      border: 1px dashed var(--cyan);
      color: var(--cyan);
      margin: 1rem 0 1.2rem;
    }
    .copy-btn {
      background: transparent;
      border: 2px solid var(--neon);
      color: var(--neon);
      padding: 0.7rem 1.8rem;
      border-radius: 999px;
      font-weight: bold;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.35s;
    }
    .copy-btn:hover { background: var(--neon); color: #000; box-shadow: 0 0 25px var(--neon); transform: scale(1.04); }
    .copy-btn:active { transform: scale(0.96); }

    .support-section {
      background: rgba(8,8,18,0.8);
      border: 1.5px solid var(--pink);
      border-radius: 14px;
      padding: 1.5rem;
      margin: 1.8rem auto 2.2rem;
      max-width: 800px;
      text-align: center;
      box-shadow: 0 0 35px rgba(255,0,234,0.25);
    }
    .support-section h3 { color: var(--pink); font-size: 1.6rem; margin-bottom: 1rem; }
    .support-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 2rem;
      margin: 1.2rem 0;
    }
    .github-link, .crypto-copy {
      color: var(--neon);
      text-decoration: none;
      font-size: 1.1rem;
      font-weight: bold;
      padding: 0.7rem 1.8rem;
      border-radius: 999px;
      border: 1.5px solid var(--neon);
      transition: all 0.35s;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .github-link:hover {
      border-color: var(--cyan);
      color: var(--cyan);
      box-shadow: 0 0 25px var(--neon);
      transform: scale(1.07) rotate(0.5deg);
    }
    .github-link:active { transform: scale(0.95); }
    
    .crypto-copy {
      border-color: var(--pink);
      color: var(--pink);
      cursor: pointer;
    }
    .crypto-copy:hover {
      background: rgba(255, 0, 234, 0.15);
      box-shadow: 0 0 25px var(--pink);
      transform: scale(1.07);
    }
    .crypto-copy:active { transform: scale(0.95); }
    
    .address-text {
      font-size: 1rem;
      margin: 1rem 0;
      word-break: break-all;
      color: var(--cyan);
      cursor: pointer;
      transition: all 0.3s;
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      display: inline-block;
    }
    .address-text:hover {
      background: rgba(0, 240, 255, 0.1);
      color: var(--pink);
      transform: scale(1.02);
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
    }
    .address-text:active { transform: scale(0.98); }
    
    .copied-tooltip {
      position: absolute;
      top: -45px;
      left: 50%;
      transform: translateX(-50%) translateY(-10px);
      background: var(--cyan);
      color: #000;
      padding: 0.55rem 1.3rem;
      border-radius: 50px;
      font-weight: bold;
      font-size: 0.95rem;
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      white-space: nowrap;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.7);
      z-index: 100;
    }
    .copied-tooltip.show {
      opacity: 1;
      transform: translateX(-50%) translateY(-20px);
      animation: pulse 0.6s 1;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(0, 240, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0); }
    }

    .toggles-section {
      margin: 1.5rem 0 1.2rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 2.2rem;
      font-size: 1.05rem;
    }
    .toggle-group {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(0,0,0,0.5);
      padding: 0.6rem 1.2rem;
      border-radius: 10px;
      border: 1px solid rgba(0,255,159,0.2);
    }
    .toggle-label { color: var(--dim); min-width: 90px; }
    .switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 30px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #555;
      transition: .35s;
      border-radius: 30px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 4px;
      bottom: 4px;
      background: white;
      transition: .35s;
      border-radius: 50%;
    }
    input:checked + .slider { background: var(--pink); }
    input:checked + .slider:before { transform: translateX(30px); }
    .status { font-weight: bold; min-width: 140px; }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin: 3rem 0 2.5rem;
    }
    .feature {
      background: var(--card);
      border: 1px solid rgba(0,255,159,0.25);
      border-radius: 12px;
      padding: 1.4rem;
      backdrop-filter: blur(8px);
      transition: all 0.35s;
    }
    .feature:hover {
      transform: translateY(-8px);
      box-shadow: 0 15px 40px rgba(0,255,159,0.2);
      border-color: var(--cyan);
    }
    .feature h3 { color: var(--neon); font-size: 1.35rem; margin-bottom: 0.6rem; }

    footer {
      text-align: center;
      padding: 3rem 1rem 2.5rem;
      color: var(--dim);
      font-size: 1rem;
      border-top: 1px solid rgba(0,255,159,0.12);
    }
    .repo-note { margin: 1rem 0; font-size: 1.05rem; }
    .repo-note a { 
      color: var(--cyan); 
      text-decoration: none;
      transition: all 0.3s;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .repo-note a:hover { 
      color: var(--pink); 
      background: rgba(255, 0, 234, 0.15);
      transform: scale(1.03);
    }
    .last-update { font-size: 0.9rem; margin-top: 1.2rem; opacity: 0.75; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>NEON GHOST</h1>
      <p class="subtitle">DoH Proxy • Adblock + Adult Filter • Fast & Private</p>
    </header>

    <div class="endpoint-card">
      <h2>YOUR DOH ENDPOINT</h2>
      <div id="endpoint">${endpoint}</div>
      <p style="color:var(--dim); font-size:0.9rem; margin:0.6rem 0 1rem;">
        Providers rotated randomly + failover
      </p>
      <button class="copy-btn" onclick="copyText('endpoint', 'endpoint-tooltip')">COPY ENDPOINT</button>
      <span class="copied-tooltip" id="endpoint-tooltip">Copied!</span>

      <div class="toggles-section">
        <div class="toggle-group">
          <span class="toggle-label">Adblocker:</span>
          <label class="switch">
            <input type="checkbox" id="adblockToggle" onchange="updateStatuses()">
            <span class="slider"></span>
          </label>
          <span class="status" id="adblockStatus">OFF</span>
        </div>

        <div class="toggle-group">
          <span class="toggle-label">Adult Filter:</span>
          <label class="switch">
            <input type="checkbox" id="adultToggle" onchange="updateStatuses()">
            <span class="slider"></span>
          </label>
          <span class="status" id="adultStatus">OFF</span>
        </div>
      </div>
    </div>

    <div class="support-section">
      <h3>Support Neon Ghost</h3>
      <div class="support-links">
        <a href="https://github.com/SadraCoding" target="_blank" class="github-link">
          🐙 GitHub
        </a>
        <div class="crypto-copy" onclick="copyDonationAddress()">
          💰 Crypto Donation
        </div>
      </div>
      <div class="address-text" onclick="copyDonationAddress()">
        0xa503B29d4B0fF5942e98813Ea232B215117Bf5A5
      </div>
      <p style="margin-top:0.8rem; color:var(--dim); font-size:0.9rem;">
        ETH address works on Ethereum Mainnet, BSC (Binance Smart Chain), and Base network
      </p>
      <p class="repo-note">
        Please star the repo: <a href="https://github.com/SadraCoding/Neon-Ghost" target="_blank">SadraCoding/Neon-Ghost</a>
      </p>
      <span class="copied-tooltip" id="crypto-tooltip">Copied!</span>
    </div>

    <div class="features-grid">
      <div class="feature">
        <h3>⚡ EDGE SPEED</h3>
        <p>Cloudflare powered — very low latency.</p>
      </div>
      <div class="feature">
        <h3>🌀 MANY PROVIDERS</h3>
        <p>Smart balancing + automatic failover.</p>
      </div>
      <div class="feature">
        <h3>🛡️ FILTER TOGGLES</h3>
        <p>Adblock & adult content control.</p>
      </div>
    </div>

    <footer>
      <p>High-Performance DoH Proxy • Open Source</p>
      <div class="last-update">February 2026</div>
    </footer>
  </div>

  <script>
    function copyText(id, tooltipId) {
      const el = document.getElementById(id);
      const text = el.innerText || el.textContent;
      showTooltip(tooltipId);
      
      navigator.clipboard.writeText(text).catch(() => {
        alert('Copy failed. Please copy manually.');
      });
    }
    
    function copyDonationAddress() {
      const address = '0xa503B29d4B0fF5942e98813Ea232B215117Bf5A5';
      showTooltip('crypto-tooltip');
      
      navigator.clipboard.writeText(address).catch(() => {
        alert('Copy failed. Please copy manually:\\n\\n0xa503B29d4B0fF5942e98813Ea232B215117Bf5A5');
      });
    }
    
    function showTooltip(id) {
      const tooltip = document.getElementById(id);
      tooltip.classList.remove('show');
      void tooltip.offsetWidth; // Trigger reflow
      tooltip.classList.add('show');
      
      // Enhanced visual feedback
      tooltip.style.animation = 'none';
      setTimeout(() => {
        tooltip.style.animation = 'pulse 0.6s 1';
      }, 10);
    }

    function updateStatuses() {
      const adblock = document.getElementById('adblockToggle');
      const adult   = document.getElementById('adultToggle');
      const adSt = document.getElementById('adblockStatus');
      const aduSt = document.getElementById('adultStatus');

      adSt.textContent = adblock.checked ? 'ON' : 'OFF';
      adSt.style.color = adblock.checked ? 'var(--pink)' : 'var(--neon)';

      aduSt.textContent = adult.checked ? 'ON' : 'OFF';
      aduSt.style.color = adult.checked ? 'var(--pink)' : 'var(--neon)';

      localStorage.setItem('adblock', adblock.checked ? 'on' : 'off');
      localStorage.setItem('adultFilter', adult.checked ? 'on' : 'off');
    }

    window.onload = () => {
      if (localStorage.getItem('adblock') === 'on') {
        document.getElementById('adblockToggle').checked = true;
      }
      if (localStorage.getItem('adultFilter') === 'on') {
        document.getElementById('adultToggle').checked = true;
      }
      updateStatuses();
    };
  </script>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}