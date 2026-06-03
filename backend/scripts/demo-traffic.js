const baseUrl = process.env.API_BASE_URL || 'http://localhost:5847/api';
const username = process.env.DEMO_USERNAME || 'admin';
const password = process.env.DEMO_PASSWORD || 'password123';
const rounds = Number(process.env.DEMO_TRAFFIC_ROUNDS || 8);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`);
  }
  return response;
}

async function main() {
  const loginResponse = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const login = await loginResponse.json();
  const token = login.token;
  const headers = { Authorization: `Bearer ${token}` };

  const endpoints = [
    '/health',
    '/dashboard/stats',
    '/equipment',
    '/employees',
    '/issuances',
    '/repairs',
    '/inventory-checks',
    '/notifications',
    '/reports/equipment.csv',
    '/reports/issuances.csv',
    '/reports/repairs.csv',
    '/audit-log',
  ];

  let total = 0;
  for (let round = 1; round <= rounds; round += 1) {
    for (const endpoint of endpoints) {
      await request(endpoint, endpoint === '/health' ? {} : { headers });
      total += 1;
    }
    await sleep(250);
  }

  console.log(`Demo traffic complete: ${total} GET requests sent to ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
