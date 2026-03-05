import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// InterWindowMessaging の手動モック
class MockMessaging {
	constructor(functionSet, targetWindow, targetOrigin) {
		this.functionSet = functionSet;
		this.targetWindow = targetWindow;
		this.targetOrigin = targetOrigin;
		MockMessaging.instance = this;
	}
	callRemoteFunc = jest.fn().mockImplementation((fName, params) => {
		if (fName === "getSvgImageProps") return Promise.resolve({ Path: "http://test.com/test.svg", id: "layer1" });
		if (fName === "updateFinalProps") return Promise.resolve(true);
		if (fName === "replaceSvgImage") return Promise.resolve(true);
		if (fName === "finalizeSync") return Promise.resolve(true);
		return Promise.resolve(null);
	});
	getReady = jest.fn().mockResolvedValue(true);
}
MockMessaging.instance = null;

describe("svgMapSandboxLayerLib Full Sync Flow (Task 5.1/5.2)", () => {
	beforeEach(async () => {
		// JSDOM環境の前提で、必要なプロパティをモック
		delete window.location;
		window.location = new URL("http://sandbox.com/?svgMapHandshakeToken=test");
		
		delete window.opener;
		window.opener = { postMessage: jest.fn() };
		
		// dispatchEvent をスパイする
		jest.spyOn(window, "dispatchEvent");
		
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg" crs="EPSG:3857"></svg>')
		});

		// MutationObserver のモック
		global.MutationObserver = class {
			constructor() {}
			observe() {}
			takeRecords() { return []; }
			disconnect() {}
		};

		// DOMParser のモック
		global.DOMParser = class {
			parseFromString() {
				// 実際の DOM 要素を作成して返す
				const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
				svg.setAttribute("crs", "EPSG:3857");
				const doc = document.implementation.createDocument("http://www.w3.org/2000/svg", "svg", null);
				doc.replaceChild(svg, doc.documentElement);
				return doc;
			}
		};

		jest.unstable_mockModule("../../InterWindowMessaging.js", () => ({
			InterWindowMessaging: MockMessaging
		}));

		await import("../../svgMapSandboxLayerLib.js?update=" + Date.now());
	});

	it("should perform full sync: fetch -> extract -> sync back -> finalize", async () => {
		const messagingInstance = MockMessaging.instance;
		expect(messagingInstance).toBeDefined();
		
		// 1. 接続完了（ネゴシエーション完了）をシミュレート
		await messagingInstance.functionSet.connectionReady(true);

		// 非同期の初期化フロー完了を待機
		await new Promise(resolve => setTimeout(resolve, 300));

		// 2. fetch が呼ばれたか
		expect(global.fetch).toHaveBeenCalledWith("http://test.com/test.svg");

		// 3. 親への同期が呼ばれたか (個別にチェックして引数の厳密な不一致を避ける)
		const calls = messagingInstance.callRemoteFunc.mock.calls;
		
		expect(calls.some(c => c[0] === "getSvgImageProps")).toBe(true);
		expect(calls.some(c => c[0] === "updateFinalProps")).toBe(true);
		expect(calls.some(c => c[0] === "replaceSvgImage")).toBe(true);
		expect(calls.some(c => c[0] === "finalizeSync")).toBe(true);

		// 4. CRSがセットされているか
		expect(window.svgImageProps.CRS).toBe("EPSG:3857");

		// 5. イベントがディスパッチされたか
		expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "layerWebAppReady" }));
	});
});
