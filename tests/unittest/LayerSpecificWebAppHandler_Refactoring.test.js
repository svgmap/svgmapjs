import { describe, test, expect, beforeEach, jest } from "@jest/globals";
// Mock SvgMapGIS because it's imported in LayerSpecificWebAppHandler
jest.mock("../libs/BuiltinIcons.js", () => ({}));
jest.mock("../libs/UtilFuncs.js", () => ({
	UtilFuncs: {
		getControllerURL: (url) => typeof url === "string" ? url : (url ? url.url : null)
	}
}));
jest.mock("../SVGMapLv0.1_GIS_r4_module.js", () => ({
	SvgMapGIS: jest.fn()
}));
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

// Mock InterWindowMessaging to check how it's called
jest.mock("../../InterWindowMessaging.js", () => {
	return {
		InterWindowMessaging: jest.fn().mockImplementation(() => {
			return {
				addAllowedOrigin: jest.fn(),
				postMessageTo: jest.fn(),
				callRemoteFunc: jest.fn(),
				getHandshakeTokenForTesting: jest.fn()
			};
		})
	};
});

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
			expect.objectContaining({
				submitReady: true,
				alwaysAllowCommands: expect.arrayContaining(["handshakeAck"])
			}),
			[]
		);
	});
});
