import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// InterWindowMessaging の手動モック
class MockMessaging {
	constructor(functions, targetWin, options) {
		this.functions = functions;
		this.targetWin = targetWin;
		this.options = options;
		MockMessaging.instance = this;
	}
	callRemoteFunc = jest.fn().mockImplementation((fName, params) => {
		if (fName === "getSvgImageProps") return Promise.resolve({ Path: "http://test.com/test.svg", id: "layer1" });
		if (fName === "updateFinalProps") return Promise.resolve(true);
		if (fName === "replaceSvgImage") return Promise.resolve(true);
		if (fName === "finalizeSync") return Promise.resolve(true);
		return Promise.resolve(null);
	});
}
MockMessaging.instance = null;

describe("svgMapSandboxLayerLib Full Sync Flow (Task 5.1/5.2)", () => {
	beforeEach(async () => {
		// グローバル環境のモック
		global.window = {
			location: { search: "?svgMapHandshakeToken=test", origin: "http://sandbox.com" },
			opener: { postMessage: jest.fn() },
			addEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
			document: { readyState: "complete" }
		};
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg" crs="EPSG:3857"></svg>')
		});
		global.DOMParser = class {
			parseFromString(xml) {
				return {
					documentElement: {
						getAttribute: (name) => name === "crs" ? "EPSG:3857" : null,
						getAttributeNS: () => null
					}
				};
			}
		};
		global.Event = class {
			constructor(name) {
				this.type = name;
				this.bubbles = true;
				this.cancelable = false;
			}
		};
		// JSDOM の環境を使用しているため、実際の Event を使用するように設定
		if (typeof window !== 'undefined') {
			global.Event = window.Event;
		}

		global.MutationObserver = class {
			constructor() {}
			observe() {}
			takeRecords() { return []; }
			disconnect() {}
		};

		jest.unstable_mockModule("../../InterWindowMessaging.js", () => ({
			InterWindowMessaging: MockMessaging
		}));

		await import("../../svgMapSandboxLayerLib.js");
	});

	it("should perform full sync: fetch -> extract -> sync back -> finalize", async () => {
		const messagingInstance = MockMessaging.instance;
		const onHandshake = messagingInstance.options.onHandshake;

		// 1. ハンドシェイク開始
		await onHandshake("http://host.com");

		// 非同期の初期化フロー完了を待機
		await new Promise(resolve => setTimeout(resolve, 100));

		// 2. fetch が呼ばれたか
		expect(global.fetch).toHaveBeenCalledWith("http://test.com/test.svg");

		// 3. 親への同期が呼ばれたか
		expect(messagingInstance.callRemoteFunc).toHaveBeenCalledWith("updateFinalProps", [expect.any(Object)]);
		expect(messagingInstance.callRemoteFunc).toHaveBeenCalledWith("replaceSvgImage", [expect.stringContaining("<svg")]);

		// 4. CRSがセットされているか
		expect(global.window.svgImageProps.CRS).toBe("EPSG:3857");

		// 5. 最終同期が呼ばれたか
		expect(messagingInstance.callRemoteFunc).toHaveBeenCalledWith("finalizeSync", []);
		expect(global.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "layerWebAppReady" }));
	});
});