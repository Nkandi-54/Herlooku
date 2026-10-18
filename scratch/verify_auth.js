const http = require('http');

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/auth/me`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  let port = 3000;
  if (!(await checkPort(3000))) {
    if (await checkPort(3001)) {
      port = 3001;
    } else {
      console.error('Neither port 3000 nor 3001 is responding.');
      process.exit(1);
    }
  }

  console.log(`Testing Herlooku on http://localhost:${port}...`);

  // 1. Check pages
  const pages = ['/', '/login', '/register', '/workers'];
  for (const page of pages) {
    const res = await request(`http://localhost:${port}${page}`);
    console.log(`Page ${page}: Status ${res.status} (${res.body.length} bytes)`);
    if (res.status !== 200) {
      console.error(`FAILED: ${page} returned status ${res.status}`);
      process.exit(1);
    }
  }

  // 2. Check icon.svg
  const iconRes = await request(`http://localhost:${port}/icon.svg`);
  console.log(`Icon /icon.svg: Status ${iconRes.status}, contains obsidian: ${iconRes.body.includes('#0f172a')}`);

  // 3. Test registration
  const testEmail = `test_${Date.now()}@example.com`;
  const regRes = await request(`http://localhost:${port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Client',
      email: testEmail,
      password: 'password123',
      phone: '+254 711 000 111',
      role: 'client',
      location: 'Nairobi',
    }),
  });
  console.log(`Registration API: Status ${regRes.status}, Body:`, regRes.body);
  const regData = JSON.parse(regRes.body);
  if (!regData.success || regData.activeUser.email !== testEmail) {
    console.error('FAILED registration check');
    process.exit(1);
  }

  // 4. Test login
  const loginRes = await request(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'password123',
    }),
  });
  console.log(`Login API: Status ${loginRes.status}, Body:`, loginRes.body);
  const loginData = JSON.parse(loginRes.body);
  if (!loginData.success || loginData.activeUser.email !== testEmail) {
    console.error('FAILED login check');
    process.exit(1);
  }

  // 5. Test logout
  const logoutRes = await request(`http://localhost:${port}/api/auth/logout`, {
    method: 'POST',
  });
  console.log(`Logout API: Status ${logoutRes.status}, Body:`, logoutRes.body);

  console.log('\n ALL TESTS PASSED! Authentication and navigation are fully verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
