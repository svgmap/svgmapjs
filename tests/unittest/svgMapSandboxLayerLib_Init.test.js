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
		if (fName === "getSvgImageProps")
			return Promise.resolve({ Path: "test.svg", id: "layer1" });
		if (fName === "finalizeSync") return Promise.resolve(true);
		return Promise.resolve(null);
	});
}
MockMessaging.instance = null;

describe("svgMapSandboxLayerLib Initialization (Task 3.1/3.2)", () => {
	beforeEach(async () => {
		// グローバル環境のモック
		// window, location, document は jsdom 環境ですでに存在する場合がある
		global.location.search = "?svgMapHandshakeToken=test-token";
		global.opener = {
			postMessage: jest.fn(),
		};

		// Event, DOMParser, fetch のモック
		global.DOMParser = class {
			parseFromString() {
				return { documentElement: { id: "svgRoot" } };
			}
		};
		global.fetch = jest.fn().mockImplementation(() =>
			Promise.resolve({
				ok: true,
				text: () => Promise.resolve("<svg></svg>"),
			})
		);
		global.MutationObserver = class {
			observe() {}
			takeRecords() {
				return [];
			}
		};

		// モジュールをモックに差し替えてロード
		jest.unstable_mockModule("../../InterWindowMessaging.js", () => ({
			InterWindowMessaging: MockMessaging,
		}));

		// ライブラリの読み込み
		// dynamic import は ESM でのモックを有効にするために必要
		await import("../../svgMapSandboxLayerLib.js?update=" + Date.now());
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

	it("should fetch latest props from parent when svgMap.getSvgImageProps is called", async () => {
		const messagingInstance = MockMessaging.instance;
		// 初期化完了まで進める
		const onHandshake = messagingInstance.options.onHandshake;
		await onHandshake("http://host.com");

		// 初期化での呼び出しをクリア
		messagingInstance.callRemoteFunc.mockClear();

		// 親から新しいプロパティを返すように設定
		messagingInstance.callRemoteFunc.mockImplementation((fName) => {
			if (fName === "getSvgImageProps")
				return Promise.resolve({ Path: "updated.svg", id: "layer1" });
			return Promise.resolve(null);
		});

		const props = await global.window.svgMap.getSvgImageProps();

		// 親への問い合わせが発生したか確認
		expect(messagingInstance.callRemoteFunc).toHaveBeenCalledWith(
			"getSvgImageProps",
			[]
		);
		// 取得した値が反映されているか確認
		expect(props.Path).toBe("updated.svg");
		expect(global.window.svgImageProps.Path).toBe("updated.svg");
	});

	it("should fetch latest props from parent when svgMap.getGeoViewBox is called", async () => {
		const messagingInstance = MockMessaging.instance;

		const onHandshake = messagingInstance.options.onHandshake;

		await onHandshake("http://host.com");

		messagingInstance.callRemoteFunc.mockClear();

		messagingInstance.callRemoteFunc.mockImplementation((fName) => {
			if (fName === "getSvgImageProps")
				return Promise.resolve({ geoViewBox: { x: 10, y: 20 }, id: "layer1" });

			return Promise.resolve(null);
		});

		const gvb = await global.window.svgMap.getGeoViewBox();

		// 親への問い合わせが発生したか確認 (getSvgImageProps 経由)

		expect(messagingInstance.callRemoteFunc).toHaveBeenCalledWith(
			"getSvgImageProps",
			[]
		);

		expect(gvb.x).toBe(10);
	});

	it("should skip sandbox initialization when in same-domain iframe", async () => {
		// モックのクリア

		jest.resetModules();

		global.window.svgMap = { existing: true };

		global.window.opener = { svgMap: { existing: true } };

		global.location.search = ""; // トークンなし

		// 再ロード

		await import("../../svgMapSandboxLayerLib.js?update=" + Date.now());

		// SandboxSvgMap が作成されていないことを確認 (既存のオブジェクトが優先される)

		expect(global.window.svgMap.existing).toBe(true);
	});
});
