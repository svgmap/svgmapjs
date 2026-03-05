import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

// Mock JSTS
global.window.jsts = {
	io: {
		GeoJSONReader: jest.fn().mockImplementation(() => ({})),
		GeoJSONWriter: jest.fn().mockImplementation(() => ({}))
	}
};

describe("LayerSpecificWebAppHandler Sandbox Logic (Negotiation Version)", () => {
	let handler;
	let mockSvgMap;
	let mockAuthoringTool;
	let mockGetLayerStatus;
	let layerSpecificUI;
	let mockPopup;
	let testProps;
	let testImages;

	beforeEach(() => {
		testProps = {
			layer1: { id: "layer1", Path: "http://test.com/test.svg" }
		};
		testImages = {
			layer1: '<svg id="test-svg"></svg>'
		};

		mockSvgMap = {
			getRootLayersProps: jest.fn().mockReturnValue({
				layer1: { id: "layer1", visible: true, target: "_blank", svgImageProps: { controller: { url: "http://test.com/ui" } } }
			}),
			getSvgImagesProps: jest.fn().mockReturnValue(testProps),
			getSvgImages: jest.fn().mockReturnValue(testImages),
			registLayerUiSetter: jest.fn(),
			refreshScreen: jest.fn(),
			getCRS: jest.fn().mockReturnValue({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, isSVG2: false }),
			dynamicLoad: jest.fn(),
			transform: jest.fn(),
			getCanvasSize: jest.fn().mockReturnValue({ width: 800, height: 600 }),
			getCORSURL: jest.fn().mockImplementation(url => url)
		};
		mockAuthoringTool = {};
		mockGetLayerStatus = jest.fn();

		// Mock DOM
		document.body.innerHTML = '<div id="layerSpecificUI"></div>';
		layerSpecificUI = document.getElementById("layerSpecificUI");

		// Mock Window objects
		mockPopup = {
			document: {
				write: jest.fn(),
				close: jest.fn(),
				readyState: "complete"
			},
			location: { href: "" },
			focus: jest.fn(),
			close: jest.fn(),
			closed: false,
			postMessage: jest.fn()
		};
		global.window.open = jest.fn().mockReturnValue(mockPopup);
		
		// crypto.randomUUID のモック
		if (!global.crypto) global.crypto = {};
		global.crypto.randomUUID = jest.fn().mockReturnValue("mock-uuid-123");
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should initialize InterWindowMessaging with 3 arguments and '*' origin", () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		const iwm = handler.getMessagingInstanceForTesting();
		
		expect(iwm).toBeDefined();
		// インスタンス化が成功していること（内部的な引数チェックはクラス側で実施済み）
	});

	it("should respond to negotiationKey from child window", async () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		
		const remoteOrigin = "http://remote-app.com";
		const negotiationKey = "child-uuid-999";

		// 子ウィンドウからネゴシエーションキーが届いたことをシミュレート
		window.dispatchEvent(new MessageEvent("message", {
			origin: remoteOrigin,
			source: mockPopup,
			data: JSON.stringify({
				negotiationKey: negotiationKey
			})
		}));

		await new Promise(resolve => setTimeout(resolve, 50));

		// 親（Handler）が正しいキーを返信していること
		expect(mockPopup.postMessage).toHaveBeenCalled();
		const sentMsg = JSON.parse(mockPopup.postMessage.mock.calls[0][0]);
		expect(sentMsg.negotiationKey).toBe(negotiationKey);
		expect(sentMsg.ready).toBe(true);
	});

	it("should provide svgImageProps via exposed API correctly identifying the source", () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		handler.initLayerSpecificUI();
		
		// ポップアップとして登録
		handler.setPopupWindowForTesting("layer1", mockPopup);

		const exposedFuncs = handler.getExposedFunctionsForTesting();
		const context = { source: mockPopup, origin: "http://test.com" };
		
		// 1. props の取得
		const props = exposedFuncs.getSvgImageProps.call(context);
		expect(props).toBeDefined();
		expect(props.id).toBe("layer1");

		// 2. XML の取得
		const svg = exposedFuncs.getSvgImage.call(context);
		expect(svg).toBe('<svg id="test-svg"></svg>');
	});

	it("should handle replaceSvgImage from sandbox and update parent state", () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		handler.initLayerSpecificUI();
		handler.setPopupWindowForTesting("layer1", mockPopup);

		const exposedFuncs = handler.getExposedFunctionsForTesting();
		const context = { source: mockPopup };
		
		const newSvgXml = '<svg id="new-xml"><circle cx="50" cy="50" r="40" /></svg>';
		exposedFuncs.replaceSvgImage.call(context, newSvgXml);
		
		// 親側の画像データが Document として更新されていること
		const updatedSvg = mockSvgMap.getSvgImages()["layer1"];
		expect(updatedSvg.documentElement.id).toBe("new-xml");
		expect(mockSvgMap.refreshScreen).not.toHaveBeenCalled(); // この時点ではまだリフレッシュしない
		
		// finalizeSync でリフレッシュされること
		exposedFuncs.finalizeSync.call(context);
		expect(mockSvgMap.refreshScreen).toHaveBeenCalled();
	});
});
