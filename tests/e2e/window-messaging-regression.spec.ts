import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const LOCAL_DEMO_URL = 'https://svgmap.org/demos/demo1/';

test.describe('InterWindowMessaging Regression Proof', () => {
    test.beforeEach(async ({ page, context }) => {
        const rootDir = process.cwd();
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('InterWindowMessaging') || text.includes('Handshake')) {
                console.log(`BROWSER: ${text}`);
            }
        });

        // サーバー側の最新の機能のみを検証するため、ローカルファイルの上書き（routing）は一切行わない
    });

    test('verify Cesium 3D view functionality', async ({ page, context }) => {
        await page.goto(LOCAL_DEMO_URL, { waitUntil: 'networkidle' });
        
        // 1. Cesium 3D View メインボタンをクリック
        const cesiumBtn = page.locator('[id="3DviewButton"]');
        await expect(cesiumBtn).toBeVisible({ timeout: 15000 });
        await cesiumBtn.click();
        console.log('Cesium 3D view button clicked.');

        // 2. 表示される Simple 3D view ボタンをクリック
        const simple3dBtn = page.locator('[id="svg2cesiumBtn1"]');
        await expect(simple3dBtn).toBeVisible({ timeout: 10000 });
        
        const [popup] = await Promise.all([
            context.waitForEvent('page', { timeout: 30000 }),
            simple3dBtn.click()
        ]);

        await popup.waitForLoadState('networkidle');
        console.log('Cesium popup opened:', popup.url());
        
        // ポップアップの内容が空でないことを確認
        await expect(popup.locator('body')).not.toBeEmpty();
        await popup.close();

        // 3. 3dViewBtns パネルを閉じる ('x' ボタンをクリック)
        const closeBtn = page.locator('[id="3dViewBtns"] input[value="x"]');
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();
        
        // パネルが非表示になることを確認
        await expect(page.locator('[id="3dViewBtns"]')).toBeHidden();
        console.log('Cesium 3D view buttons panel closed.');
    });

    test('confirm baseline functionality in layerCustomManager.', async ({ page, context }) => {
        await page.goto(LOCAL_DEMO_URL, { waitUntil: 'networkidle' });
        
        // 1. カスタムレイヤーマネージャーを開く (InterWindowMessaging使用箇所2)
        const layerListBtn = page.getByLabel(/Layer List: \d layers visible/);
        await layerListBtn.click();
        const customizerBtn = page.locator('[id="layersCustomizerImageButton"]');
        await expect(customizerBtn).toBeVisible({ timeout: 10000 });
        
        const [popup] = await Promise.all([
            context.waitForEvent('page'),
            customizerBtn.click()
        ]);

        await popup.waitForLoadState('networkidle');

        // 2. 詳細な検証 (Popup内)
        
        // 2.1 defaultVbRadio が On であること
        const defaultVbRadio = popup.locator('[id="defaultVbRadio"]');
        await expect(async () => {
            await expect(defaultVbRadio).toBeChecked();
        }).toPass({ timeout: 15000 });
        console.log('defaultVbRadio is checked.');

        // 2.2 Custom Layers Setting タブの確認
        await popup.locator('label[for="layers_t"]').click();
        const layerTable = popup.locator('[id="layerTable"]');
        
        // input[type="text"] の中身も含めて Container.svg を探す
        await expect(async () => {
             const hasContainer = await layerTable.evaluate((table) => {
                 const inputs = Array.from(table.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
                 return inputs.some(i => i.value.includes('Container.svg'));
             });
             if (!hasContainer) {
                 const allValues = await layerTable.evaluate((table) => {
                     return Array.from(table.querySelectorAll('input[type="text"]')).map(i => (i as HTMLInputElement).value);
                 });
                 console.log('DEBUG: All input values in layerTable:', allValues);
                 throw new Error('Container.svg not found in layerTable inputs');
             }
        }).toPass({ timeout: 15000 });
        console.log('layerTable contains Container.svg.');

        // 2.3 Others タブの確認とダウンロード
        await popup.locator('label[for="others_t"]').click();
        const downloadBtn = popup.locator('[id="downloadButton"]');
        await expect(downloadBtn).toBeVisible();
        console.log('downloadButton found in Others tab.');

        // ダウンロードをトリガー
        const [download] = await Promise.all([
            popup.waitForEvent('download', { timeout: 20000 }),
            downloadBtn.click()
        ]);
        console.log('Download triggered:', download.suggestedFilename());
        await expect(download.suggestedFilename()).not.toBe('');
        
        await popup.close();
    });

    test('confirm baseline functionality in CesiumButton.', async ({ page, context }) => {
    });
});
