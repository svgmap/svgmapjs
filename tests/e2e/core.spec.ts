// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { test, expect, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const DEMO_URL = 'https://svgmap.org/demos/demo1/';

/**
 * ローカルのJS/HTMLファイルをブラウザに読み込ませるためのルーティング設定
 */
async function applyLocalRouting(context: BrowserContext) {
    const rootDir = process.cwd();
    const searchDirs = [rootDir, path.join(rootDir, 'libs'), path.join(rootDir, '3D_extension')];
    await context.route('**/*.{js,html}', async (route) => {
        const url = new URL(route.request().url());
        const fileName = url.pathname.split('/').pop()?.split('?')[0];
        if (!fileName) return route.continue();
        let foundPath = null;
        for (const dir of searchDirs) {
            const targetPath = path.join(dir, fileName);
            if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isFile()) {
                foundPath = targetPath;
                break;
            }
        }
        if (foundPath) {
            const contentType = fileName.endsWith('.js') ? 'application/javascript' : 'text/html';
            await route.fulfill({ body: fs.readFileSync(foundPath), contentType: contentType });
        } else {
            await route.continue();
        }
    });
}

/**
 * ズーム・パン操作とインタラクション（モーダル表示）を確認するロジック
 */
async function verifyZoomOperation(page: Page) {
    await page.goto(DEMO_URL, { waitUntil: 'networkidle' });
    
    const layerTitle = '空港';

    // 1. レイヤーを有効化
    await page.getByLabel(/Layer List: \d layers visible/).click();
    const hospitalCheckbox = page.getByLabel(layerTitle, { exact: true });
    await hospitalCheckbox.check();
    await expect(page.getByLabel(/Layer List: [2-9] layers visible/)).toBeVisible({ timeout: 15000 });
    await page.getByLabel(/Layer List: [2-9] layers visible/).click();
    
    // 2. ズーム操作を実行
    await page.mouse.move(500, 500);
    // 確実にPOIが出る深さまでズーム
    await page.mouse.wheel(0, -3000);
    await page.waitForTimeout(2000); 

    // 3. 病院レイヤーのIDを取得
    const layerId = await page.evaluate((title) => {
        // @ts-ignore
        return window.svgMap.getLayerId(title);
    }, layerTitle);

    if (!layerId) throw new Error(`Layer ID for "${layerTitle}" not found`);

    // 4. POIアイコンの位置を取得してクリック
    const hospitalPoi = page.locator(`#mapcanvas #${layerId} img`).first();
    await expect(hospitalPoi).toBeVisible({ timeout: 30000 });
    
    const box = await hospitalPoi.boundingBox();
    if (!box) throw new Error('Could not get bounding box for POI');

    // アイコンの中心を正確にクリック
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // 5. モーダルダイアログ（#modalDiv）が表示されたことを確認
    const modalDiv = page.locator('#modalDiv');
    await expect(modalDiv).toBeVisible({ timeout: 10000 });
}

/**
 * Cesium 3Dビューの動作を確認する共通ロジック
 */
async function verifyCesium3DView(page: Page, context: BrowserContext) {
    await page.goto(DEMO_URL, { waitUntil: 'networkidle' });
    const cesiumBtn = page.locator('[id="3DviewButton"]');
    await expect(cesiumBtn).toBeVisible({ timeout: 15000 });
    await cesiumBtn.click();
    const simple3dBtn = page.locator('[id="svg2cesiumBtn1"]');
    await expect(simple3dBtn).toBeVisible({ timeout: 10000 });
    const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 30000 }), simple3dBtn.click()]);
    await popup.waitForLoadState('networkidle');
    await expect(popup.locator('body')).not.toBeEmpty();
    await popup.close();
    const closeBtn = page.locator('[id="3dViewBtns"] input[value="x"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('[id="3dViewBtns"]')).toBeHidden();
}

/**
 * layerCustomManager の基本動作を確認する共通ロジック
 */
async function verifyLayerCustomManager(page: Page, context: BrowserContext) {
    await page.goto(DEMO_URL, { waitUntil: 'networkidle' });
    await page.getByLabel(/Layer List: \d layers visible/).click();
    const customizerBtn = page.locator('[id="layersCustomizerImageButton"]');
    await expect(customizerBtn).toBeVisible({ timeout: 10000 });
    const [popup] = await Promise.all([context.waitForEvent('page'), customizerBtn.click()]);
    await popup.waitForLoadState('networkidle');
    const defaultVbRadio = popup.locator('[id="defaultVbRadio"]');
    await expect(async () => { await expect(defaultVbRadio).toBeChecked(); }).toPass({ timeout: 15000 });
    await popup.locator('label[for="layers_t"]').click();
    await expect(async () => {
         const hasContainer = await popup.locator('[id="layerTable"]').evaluate((table) => {
             const inputs = Array.from(table.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
             return inputs.some(i => i.value.includes('Container.svg'));
         });
         if (!hasContainer) throw new Error('Container.svg not found');
    }).toPass({ timeout: 15000 });
    await popup.locator('label[for="others_t"]').click();
    const [download] = await Promise.all([popup.waitForEvent('download', { timeout: 20000 }), popup.locator('[id="downloadButton"]').click()]);
    await expect(download.suggestedFilename()).not.toBe('');
    await popup.close();
}

test.describe('Core Features: Official vs Local', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('InterWindowMessaging') || text.includes('Handshake')) {
                console.log(`BROWSER: ${text}`);
            }
        });
        // 負荷分散のため、1秒待機してからテストを開始
        await page.waitForTimeout(1000);
    });

    test('Zoom/Pan and POI Interaction - Official', async ({ page }) => {
        test.slow();
        await verifyZoomOperation(page);
    });
    test('Zoom/Pan and POI Interaction - Local', async ({ page, context }) => { 
        test.slow();
        await applyLocalRouting(context);
        await verifyZoomOperation(page); 
    });

    test('Cesium 3D View - Official', async ({ page, context }) => { await verifyCesium3DView(page, context); });
    test('Cesium 3D View - Local', async ({ page, context }) => { 
        await applyLocalRouting(context);
        await verifyCesium3DView(page, context); 
    });

    test('LayerCustomManager - Official', async ({ page, context }) => { await verifyLayerCustomManager(page, context); });
    test('LayerCustomManager - Local', async ({ page, context }) => { 
        await applyLocalRouting(context);
        await verifyLayerCustomManager(page, context); 
    });
});
