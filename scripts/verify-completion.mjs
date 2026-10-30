import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

const server = await createServer({ server: { host: "127.0.0.1", port: 0, hmr: false } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(
    () => window.__cubeAttackDebug__?.getState().scene === "title",
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => window.__cubeAttackDebug__?.getState().scene === "game",
  );
  const jumps = await page.evaluate(
    () => window.__cubeAttackDebug__.getState().guideJumps,
  );
  for (const x of jumps) {
    await page.waitForFunction(
      (target) => {
        const state = window.__cubeAttackDebug__.getState();
        if (state.lastResult === "crash")
          throw new Error(
            "Crash before jump " + target + ": x=" + state.playerX,
          );
        return state.playerX >= target && state.grounded;
      },
      x,
      { timeout: 15000, polling: "raf" },
    );
    await page.keyboard.press("Space");
  }
  await page.waitForFunction(
    () => window.__cubeAttackDebug__.getState().lastResult !== "idle",
    undefined,
    { timeout: 15000 },
  );
  const result = await page.evaluate(() =>
    window.__cubeAttackDebug__.getState(),
  );
  assert.equal(result.lastResult, "clear", JSON.stringify(result));
  assert.equal(result.completed, true);
  await page.reload();
  await page.waitForFunction(
    () => window.__cubeAttackDebug__?.getState().scene === "title",
  );
  assert.equal(
    await page.evaluate(() => window.__cubeAttackDebug__.getState().completed),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS full level via real keyboard jumps at authored guide positions; completion survives reload. No gameplay state modified.",
  );
} finally {
  await browser?.close();
  await server.close();
}

