import { jest } from "@jest/globals";

let messageHandlers = {};
jest.unstable_mockModule("../../InterWindowMessaging.js", () => {
	return {
		InterWindowMessaging: jest.fn().mockImplementation((handlers) => {
			messageHandlers = handlers;
			return {
				// Mock instance
			};
		}),
	};
});

describe("SandboxWrapper applySvgDiff 同期機能の検証", () => {
	let SandboxWrapper;
	let mockSvgMap;
	let testSvgDoc;
	let wrapper;

	beforeAll(async () => {
		// モジュールを動的インポート
		const mod = await import("../../libs/SandboxWrapper.js");
		SandboxWrapper = mod.SandboxWrapper;
	});

	beforeEach(() => {
		messageHandlers = {};

		// テスト用のDOM（SVG）を作成
		const parser = new DOMParser();
		testSvgDoc = parser.parseFromString(
			`<svg><path data-slawa-id="slawa-id-1" fill="purple" stroke="blue" /></svg>`,
			"image/svg+xml"
		);

		// svgMapのモック
		mockSvgMap = {
			getSvgImages: () => ({ "test-layer": testSvgDoc }),
			getSvgImagesProps: () => ({ "test-layer": {} }),
			getGeoViewBox: () => ({}),
			refreshScreen: jest.fn(),
		};

		// iframeのモック
		const mockIframe = {
			contentWindow: {},
			addEventListener: jest.fn().mockImplementation((event, callback) => {
				// loadイベントが発生したときに即座にchannel確立をシミュレート
				if (event === "load") {
					setTimeout(callback, 0);
				}
			}),
			setAttribute: jest.fn(),
		};

		wrapper = new SandboxWrapper(
			mockSvgMap,
			"test-layer",
			mockIframe,
			"http://example.com/app.html"
		);
	});

	it("applySvgDiff で attributeChange (value: null) を受信した際、親DOMの該当属性が削除されること", async () => {
		// 初期化してチャンネルを確立させ、messageHandlersをキャプチャする
		await wrapper.initLaWA();
		
		// loadイベントの発火待ち
		await new Promise((resolve) => setTimeout(resolve, 10));

		// messageHandlers.applySvgDiff が登録されていることを確認
		expect(messageHandlers.applySvgDiff).toBeDefined();

		// 同期前：fill="purple", stroke="blue"
		const path = testSvgDoc.querySelector('[data-slawa-id="slawa-id-1"]');
		expect(path.getAttribute("fill")).toBe("purple");

		// fill を null（削除）にする差分を適用
		const diffPayload = [
			{
				type: "attributeChange",
				payload: {
					id: "slawa-id-1",
					attr: "fill",
					value: null,
				},
			},
		];

		const result = messageHandlers.applySvgDiff(diffPayload);
		expect(result).toBe(true);

		// 同期後：fill属性が削除されており、文字列 "null" にキャストされていないこと
		expect(path.getAttribute("fill")).toBeNull();
		expect(path.hasAttribute("fill")).toBe(false);
	});
});
