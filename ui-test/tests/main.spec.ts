import { expect, test } from '@playwright/test';

test.describe('Test app rendering', () => {
  const frameworks = [
    'dash',
    'streamlit',
    'panel',
    'shiny',
    'textual',
    'vizro',
    'fasthtml',
    'gradio',
    'mesop',
    'nicegui'
  ];

  for (const element of frameworks) {
    test(`should render ${element}`, async ({ page }) => {
      await page.goto(`specta/?path=${element}%2F${element}.spk`);
      await expect(page.getByText(`${element}/${element}.spk`)).toBeVisible({
        timeout: 10000
      });
      await page.waitForTimeout(5000);
      await expect(page.locator('.jupyterpack-spinner')).toBeHidden({
        timeout: 150000
      });
      const timeout = element === 'streamlit' ? 20000 : 10000;
      await page.waitForTimeout(timeout);
      await expect(page).toHaveScreenshot(`${element}.png`);
    });
  }
});
