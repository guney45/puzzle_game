import { expect, test } from '@playwright/test';

test('boot scene loads and canvas exists', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible();
});

// Plays boot → menu → drag a scripted piece from the tray onto the board, using the
// iPhone-12 design canvas geometry (390×844, no safe-area insets in a plain browser) so the
// drop lands at grid origin (0,0) — always valid on an empty board regardless of which
// piece the seeded RNG dealt. Asserts the score DOM state changed (03 §3.4 M2 test note).
test.describe('gameplay smoke (iPhone-12 viewport)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('load → play → drag piece → score increases', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#app canvas');
    await expect(canvas).toBeVisible();

    // BootScene hands off to MenuScene after a short delay.
    await page.waitForTimeout(400);

    // MenuScene "Play" button is centered at (195, 844*0.55).
    await page.mouse.click(195, 464);
    await page.waitForTimeout(200);

    const scoreDebug = page.locator('#score-debug');
    await expect(scoreDebug).toHaveAttribute('data-score', '0');

    // First tray slot center (~72, 768); board cell (0,0) center (~36, 233). The drag
    // anchor is lifted above the finger, so dropping around y≈290 (row 0) with x in the
    // first column reliably resolves to grid origin (0,0).
    const trayX = 72;
    const trayY = 768;
    const dropX = 35;
    const dropY = 290;

    await page.mouse.move(trayX, trayY);
    await page.mouse.down();
    await page.mouse.move((trayX + dropX) / 2, (trayY + dropY) / 2, { steps: 5 });
    await page.mouse.move(dropX, dropY, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(200);
    await expect(scoreDebug).not.toHaveAttribute('data-score', '0');
  });

  // M4 AC: toggling mute (the Sound setting) persists across a reload (02 §2.11).
  test('settings: toggling the sound mute persists across a reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);

    // MenuScene "Settings" button sits just below "Play" (195, 464 + 56 + 20 = 540).
    await page.mouse.click(195, 540);
    await page.waitForTimeout(200);

    const settingsDebug = page.locator('#settings-debug');
    await expect(settingsDebug).toHaveAttribute('data-sound', 'true');

    // Sound is the first toggle row, centered at (390 - 32 - 36, 844 * 0.3) = (322, 253).
    await page.mouse.click(322, 253);
    await page.waitForTimeout(150);
    await expect(settingsDebug).toHaveAttribute('data-sound', 'false');

    await page.reload();
    await page.waitForTimeout(400);
    await page.mouse.click(195, 540);
    await page.waitForTimeout(200);

    await expect(page.locator('#settings-debug')).toHaveAttribute('data-sound', 'false');
  });

  // M5 AC: start a run, reload, hit Continue -> identical score restored (04 §M5).
  test('save/resume: reloading and hitting Continue restores the in-progress score', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);
    await page.mouse.click(195, 464); // Play
    await page.waitForTimeout(200);

    const scoreDebug = page.locator('#score-debug');
    const trayX = 72;
    const trayY = 768;
    const dropX = 35;
    const dropY = 290;
    await page.mouse.move(trayX, trayY);
    await page.mouse.down();
    await page.mouse.move((trayX + dropX) / 2, (trayY + dropY) / 2, { steps: 5 });
    await page.mouse.move(dropX, dropY, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const scoreBeforeReload = await scoreDebug.getAttribute('data-score');
    expect(scoreBeforeReload).not.toBe('0');

    await page.reload();
    await page.waitForTimeout(400);

    // A saved run exists, so MenuScene's first button is "Continue" (195, 464).
    await page.mouse.click(195, 464);
    await page.waitForTimeout(300);

    await expect(scoreDebug).toHaveAttribute('data-score', scoreBeforeReload!);
  });
});
