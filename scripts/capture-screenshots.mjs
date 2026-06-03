import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const toolsDir = path.join(projectRoot, '.screenshot-tools');
const outputDir = path.join(projectRoot, 'presentation-screenshots');
const baseUrl = process.env.APP_URL || 'http://localhost:6347';

async function ensurePlaywright() {
  await mkdir(toolsDir, { recursive: true });
  const packageJson = path.join(toolsDir, 'package.json');
  if (!existsSync(packageJson)) {
    await writeFile(packageJson, JSON.stringify({ private: true, type: 'module' }, null, 2));
  }

  const requireFromTools = createRequire(path.join(toolsDir, 'index.js'));
  try {
    return requireFromTools('playwright');
  } catch {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    console.log('Playwright не найден. Устанавливаю локально для скрипта...');
    execFileSync(npm, ['install', 'playwright'], { cwd: toolsDir, stdio: 'inherit', shell: process.platform === 'win32' });
    execFileSync(npx, ['playwright', 'install', 'chromium'], { cwd: toolsDir, stdio: 'inherit', shell: process.platform === 'win32' });
    return requireFromTools('playwright');
  }
}

async function waitForApp(page) {
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!response || !response.ok()) {
    throw new Error(`Frontend не открылся: ${baseUrl}`);
  }
}

async function login(page) {
  await waitForApp(page);
  const loginButton = page.getByRole('button', { name: 'Войти' });
  if ((await loginButton.count()) === 0) return;

  await page.getByLabel('Логин').fill('admin');
  await page.getByLabel('Пароль').fill('password123');
  await loginButton.click();
  await page.waitForFunction(() => !document.body.innerText.includes('Вход в систему'), null, { timeout: 20_000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

async function capture(page, item) {
  const url = `${baseUrl}${item.path}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(item.delay ?? 900);

  const file = path.join(outputDir, item.file);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`OK ${item.file}`);
}

async function main() {
  const { chromium } = await ensurePlaywright();
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });

  const pages = [
    { path: '/', file: '01-dashboard.png', delay: 1500 },
    { path: '/equipment', file: '02-equipment-registry.png' },
    { path: '/equipment/1', file: '03-equipment-card.png' },
    { path: '/employees', file: '04-employees.png' },
    { path: '/issuances', file: '05-issuances.png' },
    { path: '/repairs', file: '06-repairs.png' },
    { path: '/inventory-checks', file: '07-inventory-checks.png' },
    { path: '/reports', file: '08-reports.png' },
    { path: '/audit-log', file: '09-audit-log.png' },
    { path: '/notifications', file: '10-notifications.png' },
    { path: '/profile', file: '11-profile.png' },
    { path: '/about', file: '12-about-project.png' },
  ];

  try {
    await login(page);
    for (const item of pages) {
      await capture(page, item);
    }

    console.log(`\nГотово. Скриншоты сохранены в:\n${outputDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('\nОшибка при создании скриншотов:');
  console.error(error.message);
  console.error('\nПроверь, что проект запущен: docker compose up --build');
  process.exit(1);
});
