import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

// Mock JSTS
global.window.jsts = {
	io: {
		GeoJSONReader: jest.fn().mockImplementation(() => ({})),
		GeoJSONWriter: jest.fn().mockImplementation(() => ({}))
	}
};

describe("LayerSpecificWebAppHandler Sandbox Logic (Task 2.1/2.2)", () => {
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
			closed: false
		};
		global.window.open = jest.fn().mockReturnValue(mockPopup);
		global.window.confirm = jest.fn().mockReturnValue(true);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should generate token and append to URL when opening popup (Task 2.1)", () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		handler.initLayerSpecificUI();

		const layerId = "layer1";
		const controllerURL = "http://test.com/ui";
		
		handler.showLayerSpecificUI(layerId, controllerURL);

		expect(global.window.open).toHaveBeenCalled();
		const openedUrl = global.window.open.mock.calls[0][0];
		expect(openedUrl).toContain("svgMapHandshakeToken=");
	});

	it("should provide svgImageProps and svgImage via exposed API (Task 2.2)", () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		handler.initLayerSpecificUI();
		handler.showLayerSpecificUI("layer1", "http://test.com/ui");

		const exposedFuncs = handler.getExposedFunctionsForTesting();
		const context = { source: mockPopup };
		
		// 1. svgImageProps の取得確認
		const props = exposedFuncs.getSvgImageProps.call(context);
		expect(props).toBeDefined();
		expect(props.id).toBe("layer1");
		expect(props.Path).toBe("http://test.com/test.svg");

		// 2. svgImage (XML) の取得確認
		const svg = exposedFuncs.getSvgImage.call(context);
		expect(svg).toBe('<svg id="test-svg"></svg>');
	});

	it("should unconditionally replace existing dummy svgImage with actual XML from sandbox (Task 2.2)", () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		handler.initLayerSpecificUI();
		handler.showLayerSpecificUI("layer1", "http://test.com/ui");
		
		const exposedFuncs = handler.getExposedFunctionsForTesting();
		const context = { source: mockPopup };
		
		// 初期状態（ダミーデータとして文字列が入っているケースを想定）
		testImages.layer1 = "DUMMY_SVG_DATA_THAT_CANNOT_BE_LOADED_BY_HOST";
		
		// replaceSvgImage 呼び出し
		const actualSvgXml = '<svg id="real-svg"><rect width="100" height="100" /></svg>';
		exposedFuncs.replaceSvgImage.call(context, actualSvgXml);
		
		// 親側のデータが Document オブジェクト（置換後の実データ）になっていることを確認
		expect(testImages.layer1).not.toBe("DUMMY_SVG_DATA_THAT_CANNOT_BE_LOADED_BY_HOST");
		expect(testImages.layer1.documentElement).toBeDefined();
		expect(testImages.layer1.documentElement.id).toBe("real-svg");
	});

	it("should provide latest svgImageProps dynamically when parent state changes (Task 2.2)", () => {
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		handler.initLayerSpecificUI();
		handler.showLayerSpecificUI("layer1", "http://test.com/ui");

		const exposedFuncs = handler.getExposedFunctionsForTesting();
		const context = { source: mockPopup };
		
		// 1. 初回の取得
		let props = exposedFuncs.getSvgImageProps.call(context);
		expect(props.Path).toBe("http://test.com/test.svg");

		// 2. 親側で状態を更新 (例: zoom レベルなどが変わった想定)
		testProps.layer1.Path = "http://test.com/updated.svg";
		testProps.layer1.zoom = 2.0;

		// 3. 再取得して最新の状態が返ってくるか確認
		props = exposedFuncs.getSvgImageProps.call(context);
		expect(props.Path).toBe("http://test.com/updated.svg");
		expect(props.zoom).toBe(2.0);
	});
});
