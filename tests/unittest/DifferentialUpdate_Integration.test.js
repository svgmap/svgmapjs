
import { jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";
import { UtilFuncs } from "../../libs/UtilFuncs.js";

describe("Differential Update Integration Test (Sandbox to Host)", () => {
	let handler;
	let mockSvgMap;
	let mockAuthoringTool;
	let mockGetLayerStatus;
	let testImages = {};
	let testProps = {
		layer1: { Path: "test.svg", parentDocId: "root" }
	};

	beforeEach(() => {
		mockSvgMap = {
			getSvgImages: jest.fn().mockReturnValue(testImages),
			getSvgImagesProps: jest.fn().mockReturnValue(testProps),
			getCRS: jest.fn().mockImplementation((doc, id) => ({ a: 100, b: 0, c: 0, d: -100, e: 0, f: 0, isSVG2: false })),
			dynamicLoad: jest.fn(),
			refreshScreen: jest.fn(),
		};
		mockAuthoringTool = {};
		mockGetLayerStatus = jest.fn();

		document.body.innerHTML = '<div id="layerSpecificUI"></div><div id="mapcanvas"></div>';
		
		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
	});

	it("should parse XML, update CRS and trigger dynamicLoad when replaceSvgImage is called", async () => {
		const exposed = handler.getExposedFunctionsForTesting();
		const svgXml = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg"><image id="img1" href="data:image/png;base64,..."/></svg>';
		
		// Mock source window to layer mapping
		const mockSource = { postMessage: jest.fn() };
		// 内部の #popupWindows に登録
		handler.setPopupWindowForTesting("layer1", mockSource);

		// Execute replaceSvgImage as if called from Sandbox
		const context = { source: mockSource, origin: "http://sandbox.com" };
		const result = await exposed.replaceSvgImage.call(context, svgXml);

		expect(result).toBe(true);
		
		// 1. svgImages が更新されているか
		expect(testImages["layer1"]).toBeDefined();
		expect(testImages["layer1"].querySelector("image")).toBeDefined();

		// 2. CRS が更新されているか
		expect(mockSvgMap.getCRS).toHaveBeenCalled();
		expect(testProps["layer1"].CRS.a).toBe(100);

		// 3. dynamicLoad が呼ばれているか
		expect(mockSvgMap.dynamicLoad).toHaveBeenCalledWith("layer1", expect.any(HTMLElement));
	});
});
