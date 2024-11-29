import { test, expect } from '@playwright/test';


/**
 * Basic operation
 * 
 * Layer：background map only (OpenStreetMap)
 * 
 * Zoom
 * Pan
 * LayerSpecficUI
 * Layer ON/OFF
 * ...
 * 
 */

let url = 'https://svgmap.org/devinfo/devkddi/lvl0.1/demos/demo0.html';

test('check the LayerSpecific UI.', async ({ page }) => {
  await page.goto(url);  // 接続先は悩み中
  await page.getByLabel('Layer List: 1 layers visible').click();
  await page.locator('td').filter({ hasText: 'worldcities' }).click();
  await page.getByText('worldcities').click();
  let iframes = await page.locator('#layerSpecificUIbody').locator('iframe').last();
  await expect(iframes.contentFrame().getByRole('heading', { name: 'World Cities Layer' })).toBeVisible();
});

test("layer ON/OFF", async ({page}) => {
  await page.goto(url);
  await page.getByLabel('Layer List: 1 layers visible').click();
  await page.getByText('AED').click();
  let iframes = await page.locator('#layerSpecificUIbody').locator('iframe').last();
  await expect(iframes.contentFrame().getByRole('heading', { name: 'このレイヤーについて(ABOUT)' })).toBeVisible();
  await page.getByText('AED').click();
  await expect(iframes.contentFrame().getByRole('heading', { name: 'このレイヤーについて(ABOUT)' })).toBeHidden();
});

test("this test is action of zoom.", async ({page}) => {
  await page.goto(url);
  await page.getByLabel('Layer List: 1 layers visible').click();
  await page.getByText('病院').click();
  await page.getByLabel('Layer List: 2 layers visible').click();
  await page.mouse.move(500,500);
  await page.mouse.wheel(-2000, 0);
  await page.getByRole('img', { name: '総合病院中津川市民病院' }).waitFor();
  await page.getByRole('img', { name: '総合病院中津川市民病院' }).click();
  await expect(page.locator('#infoDiv')).toContainText('総合病院中津川市民病院');
});

