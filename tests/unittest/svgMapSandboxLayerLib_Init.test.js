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
		if (fName === "getSvgImageProps") return Promise.resolve({ Path: "test.svg", id: "layer1" });
		if (fName === "finalizeSync") return Promise.resolve(true);
		return Promise.resolve(null);
	});
}
MockMessaging.instance = null;

describe("svgMapSandboxLayerLib Initialization (Task 3.1/3.2)", () => {
	beforeEach(async () => {
		// グローバル環境のモック
		global.window = {
			location: {
				search: "?svgMapHandshakeToken=test-token",
				origin: "http://sandbox.com"
			},
			opener: {
				postMessage: jest.fn()
			},
			addEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
			document: {
				readyState: "complete"
			}
		};
		global.Event = jest.fn().mockImplementation((name) => ({ type: name }));
		global.DOMParser = class {
			parseFromString() { return { documentElement: {} }; }
		};

		// モジュールをモックに差し替えてロード
		jest.unstable_mockModule("../../InterWindowMessaging.js", () => ({
			InterWindowMessaging: MockMessaging
		}));

		// ライブラリの読み込み
		await import("../../svgMapSandboxLayerLib.js");
	});

	it("should initialize SandboxSvgMap when NOT in same-domain iframe", () => {
		expect(global.window.svgMap).toBeDefined();
		expect(global.window.svgImageProps).toBeDefined();
	});

	it("should trigger initialization flow on handshake", async () => {
		const messagingInstance = MockMessaging.instance;
		expect(messagingInstance).toBeDefined();
		const onHandshake = messagingInstance.options.onHandshake;

		// ハンドシェイク完了をシミュレート
		await onHandshake("http://host.com");

		// 配置情報が取得されていることを確認
		expect(global.window.svgImageProps.id).toBe("layer1");
		expect(global.window.svgImageProps.Path).toBe("test.svg");
	});
});
