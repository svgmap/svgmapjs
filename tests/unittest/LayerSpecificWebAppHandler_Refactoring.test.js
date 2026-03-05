import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// Mock SvgMapGIS because it's imported in LayerSpecificWebAppHandler
jest.unstable_mockModule("../../libs/BuiltinIcons.js", () => ({}));
jest.unstable_mockModule("../../libs/UtilFuncs.js", () => ({
	UtilFuncs: {
		getControllerURL: (url) => typeof url === "string" ? url : (url ? url.url : null)
	}
}));
jest.unstable_mockModule("../../SVGMapLv0.1_GIS_r4_module.js", () => ({
	SvgMapGIS: jest.fn()
}));

// Mock InterWindowMessaging to check how it's called (3-argument version)
const mockInterWindowMessaging = jest.fn().mockImplementation(() => {
	return {
		addAllowedOrigin: jest.fn(),
		callRemoteFunc: jest.fn(),
		getHandshakeTokenForTesting: jest.fn()
	};
});

jest.unstable_mockModule("../../InterWindowMessaging.js", () => {
	return {
		InterWindowMessaging: mockInterWindowMessaging
	};
});

const { LayerSpecificWebAppHandler } = await import("../../libs/LayerSpecificWebAppHandler.js");
const { InterWindowMessaging } = await import("../../InterWindowMessaging.js");

describe("LayerSpecificWebAppHandler Refactoring Integration", () => {
	let handler;
	let mockSvgMap;
	let mockAuthoringTool;
	let getLayerStatus;

	beforeEach(() => {
		mockInterWindowMessaging.mockClear();
		mockSvgMap = {
			registLayerUiSetter: jest.fn(),
			getRootLayersProps: jest.fn().mockReturnValue([]),
			getSvgImagesProps: jest.fn().mockReturnValue({}),
			getSvgImages: jest.fn().mockReturnValue({}),
			refreshScreen: jest.fn()
		};
		mockAuthoringTool = {};
		getLayerStatus = jest.fn();

		// Mock document and elements for constructor
		document.getElementById = jest.fn().mockImplementation((id) => {
			if (id === "layerSpecificUI") return { appendChild: jest.fn(), style: {}, ownerDocument: document };
			return null;
		});
		document.createElement = jest.fn().mockImplementation(() => ({
			setAttribute: jest.fn(),
			appendChild: jest.fn(),
			style: {},
			id: ""
		}));

		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, getLayerStatus);
	});

	test("should initialize InterWindowMessaging with exactly 3 arguments according to Takagi-spec", () => {
		// 3引数形式 (functionSet, targetWindow, targetOrigin) の確認
		expect(InterWindowMessaging).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Function),
			"*" // 全オリジンからの開始を許可する設定になっていること
		);
		
		// 引数の数が 3つであることを厳密にチェック
		const callArgs = mockInterWindowMessaging.mock.calls[0];
		expect(callArgs.length).toBe(3);
	});
});
