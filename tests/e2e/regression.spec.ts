import { test, expect, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const LOCAL_DEMO_URL = 'https://svgmap.org/demos/demo1/';

/**
 * ローカルのJS/HTMLファイルをブラウザに読み込ませるためのルーティング設定
 */
async function applyLocalRouting(context: BrowserContext) {
    const rootDir = process.cwd();
    const searchDirs = [
        rootDir,
        path.join(rootDir, 'libs'),
        path.join(rootDir, '3D_extension')
    ];

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
            await route.fulfill({ 
                body: fs.readFileSync(foundPath), 
                contentType: contentType 
            });
        } else {
            await route.continue();
        }
    });
}

// ## レイヤー事の動作確認

/**
 * 地理院 指定緊急避難場所レイヤの動作を確認する共通ロジック
 * JSで動的にレイヤを生成するタイプのレイヤとして試験項目を立ててます
 */
async function verifyGsiEvacuationLayer(page: Page) {
    await page.goto(LOCAL_DEMO_URL, { waitUntil: 'networkidle' });
    
    // 1. レイヤ一覧を開く
    const layerListBtn = page.getByLabel(/Layer List: \d layers visible/);
    await expect(layerListBtn).toBeVisible({ timeout: 15000 });
    await layerListBtn.click();

    // 2. 「地理院 指定緊急避難場所」を探して有効化
    const gsiLayerCheckbox = page.getByLabel('地理院 指定緊急避難場所');
    await expect(gsiLayerCheckbox).toBeVisible({ timeout: 10000 });
    await gsiLayerCheckbox.check();
    await expect(gsiLayerCheckbox).toBeChecked();

    // 3. レイヤIDの取得と、描画要素(img)の生成を待機
    const detectionResult = await page.evaluate(async (title) => {
        const start = Date.now();
        // @ts-ignore
        const svgMap = window.svgMap;
        if (!svgMap) return { success: false, reason: 'svgMap not found' };

        const layerId = svgMap.getLayerId(title);
        if (!layerId) return { success: false, reason: `Layer ID for "${title}" not found` };

        // mapcanvas 配下の id=layerId の要素内に img が出現するまで待機
        while (Date.now() - start < 20000) { 
            const layerElem = document.querySelector(`#mapcanvas #${layerId}`);
            if (layerElem) {
                const images = layerElem.querySelectorAll('img');
                if (images.length > 0) {
                    return { success: true, layerId, imgCount: images.length };
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        return { success: false, reason: 'Timeout: No img elements found under layer element', layerId };
    }, '地理院 指定緊急避難場所');

    if (!detectionResult.success) {
        throw new Error(`GSI layer verification failed: ${detectionResult.reason} (LayerID: ${detectionResult.layerId})`);
    }
    console.log(`GSI layer verification successful: LayerID=${detectionResult.layerId}, ImgCount=${detectionResult.imgCount}`);
}

/**
 * worldcities レイヤの動作を確認する共通ロジック
 * ブラウザの機能を用いてレイヤを差し込むタイプの試験項目を立ててます
 */
async function verifyWorldCitiesLayer(page: Page) {
    await page.goto(LOCAL_DEMO_URL, { waitUntil: 'networkidle' });
    
    // 1. レイヤ一覧を開く
    const layerListBtn = page.getByLabel(/Layer List: \d layers visible/);
    await expect(layerListBtn).toBeVisible({ timeout: 15000 });
    await layerListBtn.click();

    // 2. 「worldcities」を探して有効化
    const worldCitiesCheckbox = page.getByLabel('worldcities');
    await expect(worldCitiesCheckbox).toBeVisible({ timeout: 10000 });
    await worldCitiesCheckbox.check();
    await expect(worldCitiesCheckbox).toBeChecked();

    // 3. レイヤIDの取得と、描画要素(img)の生成を待機
    const detectionResult = await page.evaluate(async (title) => {
        const start = Date.now();
        // @ts-ignore
        const svgMap = window.svgMap;
        if (!svgMap) return { success: false, reason: 'svgMap not found' };

        const layerId = svgMap.getLayerId(title);
        if (!layerId) return { success: false, reason: `Layer ID for "${title}" not found` };

        // mapcanvas 配下の id=layerId の要素内に img が出現するまで待機
        while (Date.now() - start < 20000) { 
            const layerElem = document.querySelector(`#mapcanvas #${layerId}`);
            if (layerElem) {
                const images = layerElem.querySelectorAll('img');
                if (images.length > 0) {
                    return { success: true, layerId, imgCount: images.length };
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        return { success: false, reason: 'Timeout: No img elements found under layer element', layerId };
    }, 'worldcities');

    if (!detectionResult.success) {
        throw new Error(`Worldcities layer verification failed: ${detectionResult.reason} (LayerID: ${detectionResult.layerId})`);
    }
    console.log(`Worldcities layer verification successful: LayerID=${detectionResult.layerId}, ImgCount=${detectionResult.imgCount}`);
}

// ## メイン機能の動作確認

/**
 * Cesium 3Dビューの動作を確認する共通ロジック
 */
async function verifyCesium3DView(page: Page, context: BrowserContext) {
    await page.goto(LOCAL_DEMO_URL, { waitUntil: 'networkidle' });
    
    const cesiumBtn = page.locator('[id="3DviewButton"]');
    await expect(cesiumBtn).toBeVisible({ timeout: 15000 });
    await cesiumBtn.click();

    const simple3dBtn = page.locator('[id="svg2cesiumBtn1"]');
    await expect(simple3dBtn).toBeVisible({ timeout: 10000 });
    
    const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 30000 }),
        simple3dBtn.click()
    ]);

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
    await page.goto(LOCAL_DEMO_URL, { waitUntil: 'networkidle' });
    
    const layerListBtn = page.getByLabel(/Layer List: \d layers visible/);
    await expect(layerListBtn).toBeVisible({ timeout: 15000 });
    await layerListBtn.click();
    const customizerBtn = page.locator('[id="layersCustomizerImageButton"]');
    await expect(customizerBtn).toBeVisible({ timeout: 10000 });
    
    const [popup] = await Promise.all([
        context.waitForEvent('page'),
        customizerBtn.click()
    ]);

    await popup.waitForLoadState('networkidle');

    const defaultVbRadio = popup.locator('[id="defaultVbRadio"]');
    await expect(async () => {
        await expect(defaultVbRadio).toBeChecked();
    }).toPass({ timeout: 15000 });

    await popup.locator('label[for="layers_t"]').click();
    const layerTable = popup.locator('[id="layerTable"]');
    await expect(async () => {
         const hasContainer = await layerTable.evaluate((table) => {
             const inputs = Array.from(table.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
             return inputs.some(i => i.value.includes('Container.svg'));
         });
         if (!hasContainer) {
             throw new Error('Container.svg not found in layerTable inputs');
         }
    }).toPass({ timeout: 15000 });

    await popup.locator('label[for="others_t"]').click();
    const downloadBtn = popup.locator('[id="downloadButton"]');
    await expect(downloadBtn).toBeVisible();

    const [download] = await Promise.all([
        popup.waitForEvent('download', { timeout: 20000 }),
        downloadBtn.click()
    ]);
    await expect(download.suggestedFilename()).not.toBe('');
    await popup.close();
}

test.describe('InterWindowMessaging Regression Proof', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('InterWindowMessaging') || text.includes('Handshake') || text.includes('[IWM Debug]')) {
                console.log(`BROWSER: ${text}`);
            }
        });

        page.on('pageerror', err => {
            console.error(`BROWSER ERROR: ${err.message}`);
        });
    });

    test('verify Cesium 3D view - Official Baseline', async ({ page, context }) => {
        await verifyCesium3DView(page, context);
    });

    test('verify Cesium 3D view - Local Regression Check', async ({ page, context }) => {
        await applyLocalRouting(context);
        await verifyCesium3DView(page, context);
    });

    test('verify layerCustomManager - Official Baseline', async ({ page, context }) => {
        await verifyLayerCustomManager(page, context);
    });

    test('verify layerCustomManager - Local Regression Check', async ({ page, context }) => {
        await applyLocalRouting(context);
        await verifyLayerCustomManager(page, context);
    });

    test('verify GSI evacuation layer - Official Baseline', async ({ page }) => {
        await verifyGsiEvacuationLayer(page);
    });

    test('verify GSI evacuation layer - Local Regression Check', async ({ page, context }) => {
        await applyLocalRouting(context);
        await verifyGsiEvacuationLayer(page);
    });
});
