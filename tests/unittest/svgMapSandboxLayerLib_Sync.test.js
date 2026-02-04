import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// InterWindowMessaging の手動モック
class MockMessaging {
	constructor(functions, targetWin, responseReady, allowedOrigins, options) {
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

		jest.unstable_mockModule("../../InterWindowMessaging.js", () => ({
			InterWindowMessaging: MockMessaging
		}));

		// モジュールを再読み込みするためにキャッシュをクリアしたいが、ESMでは困難
		// そのため、テストごとに異なるパス（クエリ付き）でインポートするか、
		// 実装側が複数回呼ばれても安全なように設計されていることを期待する
		await import("../../svgMapSandboxLayerLib.js?update=" + Date.now());
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
		expect(window.svgImageProps.CRS).toBe("EPSG:3857");

		// 5. 最終同期が呼ばれたか
		expect(messagingInstance.callRemoteFunc).toHaveBeenCalledWith("finalizeSync", []);
		expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "layerWebAppReady" }));
	});
});