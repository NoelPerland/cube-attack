import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const artifactsDir = path.join(repoRoot, 'artifacts');
const previewUrl = 'http://127.0.0.1:4173/?e2e=1';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const preferredBrowsers = [
  process.env.CUBE_ATTACK_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? 'null'}.`));
    });
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Preview server not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function launchBrowser() {
  let lastError = null;

  for (const executablePath of preferredBrowsers) {
    try {
      return await chromium.launch({
        executablePath,
        headless: true,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('No compatible browser executable found.');
}

async function main() {
  console.log('Cleaning artifacts...');
  await rm(artifactsDir, { recursive: true, force: true });
  await mkdir(artifactsDir, { recursive: true });

  console.log('Building production bundle...');
  await runCommand(npmCommand, ['run', 'build'], 'Build');

  console.log('Starting preview server...');
  const preview = spawn(
    npmCommand,
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'],
    {
      cwd: repoRoot,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      env: process.env,
    },
  );

  let browser;

  try {
    await waitForServer(previewUrl);

    console.log('Launching browser...');
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleErrors = [];
    const selectedCubeColorId = 'solar-gold';

    page.on('pageerror', (error) => {
      consoleErrors.push(`pageerror: ${error.message}`);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(`console.error: ${message.text()}`);
      }
    });

    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().scene === 'title');
    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();

    if (!canvasBox) {
      throw new Error('Could not resolve the Phaser canvas bounds.');
    }

    const clickGame = async (x, y) => {
      const scaledX = canvasBox.x + x * (canvasBox.width / 1280);
      const scaledY = canvasBox.y + y * (canvasBox.height / 720);
      await page.mouse.click(scaledX, scaledY);
    };

    await page.screenshot({ path: path.join(artifactsDir, 'title-screen.png') });

    console.log('Validating title customization...');
    await clickGame(1176, 74);
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().muted === true);

    await clickGame(894, 432);
    await page.waitForFunction(
      (cubeColorId) => window.__cubeAttackDebug__?.getState().cubeColorId === cubeColorId,
      selectedCubeColorId,
    );
    await page.screenshot({ path: path.join(artifactsDir, 'title-customized.png') });

    console.log('Validating start and game-over flow...');
    await clickGame(382, 334);
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().scene === 'game');
    await page.waitForFunction(
      (cubeColorId) => window.__cubeAttackDebug__?.getState().cubeColorId === cubeColorId,
      selectedCubeColorId,
    );
    await page.waitForFunction(
      () => window.__cubeAttackDebug__?.getState().lastResult === 'crash',
      undefined,
      { timeout: 12000 },
    );
    await page.screenshot({ path: path.join(artifactsDir, 'game-over.png') });

    console.log('Validating return-to-title flow...');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().scene === 'title');
    await page.waitForFunction(
      (cubeColorId) => window.__cubeAttackDebug__?.getState().cubeColorId === cubeColorId,
      selectedCubeColorId,
    );

    console.log('Validating pointer jump, keyboard jump, and mute...');
    await clickGame(382, 334);
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().scene === 'game');
    await page.keyboard.press('KeyM');
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().muted === false);
    await clickGame(1182, 56);
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().muted === true);

    await page.waitForFunction(() => {
      const state = window.__cubeAttackDebug__?.getState();
      return Boolean(state && state.grounded && state.playerX >= 760 && state.lastResult === 'idle');
    });
    await clickGame(1040, 360);

    await page.waitForFunction(() => {
      const state = window.__cubeAttackDebug__?.getState();
      return Boolean(state && state.grounded && state.playerX >= 1230 && state.lastResult === 'idle');
    });
    await page.keyboard.press('Space');

    await page.waitForFunction(() => {
      const state = window.__cubeAttackDebug__?.getState();
      return Boolean(state && state.playerX >= 1500 && state.lastResult === 'idle');
    });
    await page.screenshot({ path: path.join(artifactsDir, 'gameplay.png') });

    console.log('Validating persistence after reload...');
    await page.waitForFunction(
      () => window.__cubeAttackDebug__?.getState().lastResult === 'crash',
      undefined,
      { timeout: 15000 },
    );

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__cubeAttackDebug__?.getState().scene === 'title');

    const persistedState = await page.evaluate(() => window.__cubeAttackDebug__?.getState());

    if (persistedState.bestProgress < 10) {
      throw new Error(`Expected persisted best progress above 10, received ${persistedState.bestProgress}.`);
    }

    if (persistedState.muted !== true) {
      throw new Error('Mute state did not persist across reload.');
    }

    if (persistedState.cubeColorId !== selectedCubeColorId) {
      throw new Error(
        `Cube color did not persist across reload. Expected ${selectedCubeColorId}, received ${persistedState.cubeColorId}.`,
      );
    }

    if (consoleErrors.length > 0) {
      throw new Error(consoleErrors.join('\n'));
    }

    console.log('Validation completed.');
  } finally {
    await browser?.close();
    preview.kill();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
