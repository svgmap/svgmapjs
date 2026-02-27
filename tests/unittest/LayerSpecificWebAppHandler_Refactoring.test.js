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

// Mock InterWindowMessaging to check how it's called
const mockInterWindowMessaging = jest.fn().mockImplementation(() => {
	return {
		addAllowedOrigin: jest.fn(),
		postMessageTo: jest.fn(),
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

describe("LayerSpecificWebAppHandler Refactoring (Task 4.2)", () => {
	let handler;
	let mockSvgMap;
	let mockAuthoringTool;
	let getLayerStatus;

	beforeEach(() => {
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

	test("should initialize InterWindowMessaging with handshake options", () => {
		expect(InterWindowMessaging).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Function),
			true,
			[],
			expect.objectContaining({
				alwaysAllowCommands: expect.arrayContaining(["handshakeAck"])
			})
		);
	});
});
