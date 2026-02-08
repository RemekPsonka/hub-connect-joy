import { chromium, FullConfig } from '@playwright/test';
import { loginAndSaveState, TEST_USER } from './helpers/auth';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.join(__dirname, '.auth');
const AUTH_STATE_PATH = path.join(AUTH_DIR, 'user.json');

async function globalSetup(config: FullConfig) {
  // Ensure .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  if (!TEST_USER.email || TEST_USER.email === 'test@example.com') {
    console.warn(
      '⚠️  TEST_USER_EMAIL not set — using default credentials. Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars for real tests.'
    );
  }

  const baseURL =
    config.projects[0]?.use?.baseURL || 'http://localhost:5173';

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await loginAndSaveState(page, AUTH_STATE_PATH);
    console.log('✅ Auth state saved to', AUTH_STATE_PATH);
  } catch (error) {
    console.error('❌ Global login failed — tests requiring auth will fail:', error);
    // Write empty state so Playwright doesn't crash looking for the file
    fs.writeFileSync(
      AUTH_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] })
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
