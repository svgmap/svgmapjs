// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { test, expect, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const DEMO_URL = 'https://svgmap.org/demos/demo1/';

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

async function verifyLayerUI(page: Page) {
    await page.goto(DEMO_URL);
    await page.getByLabel(/Layer List: \d layers visible/).click();
    await page.locator('td').filter({ hasText: 'worldcities' }).click();
    await page.getByText('worldcities').click();
    let iframes = await page.locator('#layerSpecificUIbody').locator('iframe').last();
    await expect(iframes.contentFrame().getByRole('heading', { name: 'World Cities Layer' })).toBeVisible();
}

async function verifyLayerOnOff(page: Page) {
    await page.goto(DEMO_URL);
    await page.getByLabel(/Layer List: \d layers visible/).click();
    await page.getByText('AED').click();
    let iframes = await page.locator('#layerSpecificUIbody').locator('iframe').last();
    await expect(iframes.contentFrame().getByRole('heading', { name: 'このレイヤーについて(ABOUT)' })).toBeVisible();
    await page.getByText('AED').click();
    await expect(iframes.contentFrame().getByRole('heading', { name: 'このレイヤーについて(ABOUT)' })).toBeHidden();
}

async function verifyLayerRendering(page: Page, layerTitle: string) {
    await page.goto(DEMO_URL, { waitUntil: 'networkidle' });
    await page.getByLabel(/Layer List: \d layers visible/).click();
    const checkbox = page.getByLabel(layerTitle, { exact: true });
    await checkbox.check();
    
    const detectionResult = await page.evaluate(async (title) => {
        const start = Date.now();
        // @ts-ignore
        const svgMap = window.svgMap;
        if (!svgMap) return { success: false, reason: 'svgMap not found' };
        const layerId = svgMap.getLayerId(title);
        if (!layerId) return { success: false, reason: `Layer ID for "${title}" not found` };
        while (Date.now() - start < 20000) { 
            const layerElem = document.querySelector(`#mapcanvas #${layerId}`);
            if (layerElem && layerElem.querySelectorAll('img').length > 0) return { success: true };
            await new Promise(r => setTimeout(r, 1000));
        }
        return { success: false, reason: 'Timeout' };
    }, layerTitle);
    if (!detectionResult.success) throw new Error(`Rendering failed for ${layerTitle}`);
}

test.describe('Layer Operations: Official vs Local', () => {
    test('LayerSpecific UI - Official', async ({ page }) => { await verifyLayerUI(page); });
    test('LayerSpecific UI - Local', async ({ page, context }) => { 
        await applyLocalRouting(context);
        await verifyLayerUI(page); 
    });

    test('Layer ON/OFF - Official', async ({ page }) => { await verifyLayerOnOff(page); });
    test('Layer ON/OFF - Local', async ({ page, context }) => { 
        await applyLocalRouting(context);
        await verifyLayerOnOff(page); 
    });

    test('WorldCities Rendering - Official', async ({ page }) => { await verifyLayerRendering(page, 'worldcities'); });
    test('WorldCities Rendering - Local', async ({ page, context }) => { 
        await applyLocalRouting(context);
        await verifyLayerRendering(page, 'worldcities'); 
    });

    test('GSI Rendering - Official', async ({ page }) => { await verifyLayerRendering(page, '地理院 指定緊急避難場所'); });
    test('GSI Rendering - Local', async ({ page, context }) => { 
        await applyLocalRouting(context);
        await verifyLayerRendering(page, '地理院 指定緊急避難場所'); 
    });
});
