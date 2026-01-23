// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

// Mock JSTS
global.window.jsts = {
	io: {
		GeoJSONReader: jest.fn().mockImplementation(() => ({})),
		GeoJSONWriter: jest.fn().mockImplementation(() => ({}))
	}
};

describe("LayerSpecificWebAppHandler Baseline Test", () => {
	let handler;
	let mockSvgMap;
	let mockAuthoringTool;
	let mockGetLayerStatus;
	let layerSpecificUI;
	let originalAppendChild;

	beforeEach(() => {
		mockSvgMap = {
			getRootLayersProps: jest.fn().mockReturnValue({}),
			getSvgImagesProps: jest.fn().mockReturnValue({
				layer1: { svgScript: null },
				popupLayer: { svgScript: null },
				inlineLayer: { svgScript: null }
			}),
			getSvgImages: jest.fn().mockReturnValue({
				layer1: {},
				popupLayer: {},
				inlineLayer: {}
			}),
			registLayerUiSetter: jest.fn()
		};
		mockAuthoringTool = {};
		mockGetLayerStatus = jest.fn();

		// Mock DOM
		document.body.innerHTML = '<div id="layerSpecificUI"></div>';
		layerSpecificUI = document.getElementById("layerSpecificUI");

		// Mock Window objects (for iframe and popup)
		const createMockWindow = () => {
			const win = {
				document: {
					write: jest.fn(),
					close: jest.fn(),
					readyState: "complete",
					createEvent: jest.fn().mockImplementation(() => ({
						initEvent: jest.fn().mockImplementation(function(type) {
							this.type = type;
						})
					})),
					dispatchEvent: jest.fn(),
					URL: "http://localhost/",
					body: { offsetHeight: 100 },
					documentElement: { offsetWidth: 100 }
				},
				location: { href: "" },
				focus: jest.fn(),
				close: jest.fn(),
				closed: false,
				XMLHttpRequest: function() {},
				fetch: jest.fn().mockResolvedValue({}),
				addEventListener: jest.fn(),
				removeEventListener: jest.fn()
			};
			win.XMLHttpRequest.prototype.send = jest.fn();
			win.XMLHttpRequest.prototype.open = jest.fn();
			return win;
		};
		
		const mockPopup = createMockWindow();
		global.window.open = jest.fn().mockReturnValue(mockPopup);

		// Manual prototype patch to avoid recursive access issues in JSDOM
		originalAppendChild = Element.prototype.appendChild;
		Element.prototype.appendChild = function(child) {
			if (child && child.tagName === "IFRAME") {
				const mockWin = createMockWindow();
				Object.defineProperty(child, "contentWindow", { value: mockWin, writable: true });
			}
			return originalAppendChild.call(this, child);
		};

		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, mockGetLayerStatus);
		handler.initLayerSpecificUI();
	});

	afterEach(() => {
		Element.prototype.appendChild = originalAppendChild;
	});

	it("should initialize layerSpecificUI correctly", () => {
		expect(layerSpecificUI).not.toBeNull();
		expect(layerSpecificUI.style.zIndex).toBe("20");
		expect(layerSpecificUI.querySelector("#layerSpecificUIbody")).not.toBeNull();
	});

	it("should create an iframe when showLayerSpecificUI is called with default target", () => {
		const layerId = "layer1";
		const controllerURL = "controller.html";
		
		// Mock getRootLayersProps for inner logic
		mockSvgMap.getRootLayersProps.mockReturnValue({
			layer1: { id: "layer1", svgImageProps: { controller: { url: controllerURL } } }
		});

		handler.showLayerSpecificUI(layerId, controllerURL);

		const iframe = layerSpecificUI.querySelector("iframe");
		expect(iframe).not.toBeNull();
		expect(iframe.id).toBe("layerSpecificUIframe_" + layerId);
	});

	it("should open a new window when target is '_blank'", () => {
		const layerId = "layer1";
		const controllerURL = "controller.html";
		
		mockSvgMap.getRootLayersProps.mockReturnValue({
			layer1: { id: "layer1", target: "_blank", svgImageProps: { controller: { url: controllerURL } } }
		});

		handler.showLayerSpecificUI(layerId, controllerURL);

		expect(global.window.open).toHaveBeenCalled();
		// Iframe should NOT be created in the main UI
		const iframe = layerSpecificUI.querySelector("iframe");
		expect(iframe).toBeNull();
	});

	it("should transfer events to the popup window", () => {
		const layerId = "layer1";
		const controllerURL = "controller.html";
		
		const mockPopup = global.window.open();
		mockSvgMap.getRootLayersProps.mockReturnValue({
			layer1: { id: "layer1", target: "_blank", svgImageProps: { controller: { url: controllerURL } } }
		});

		handler.showLayerSpecificUI(layerId, controllerURL);

		// Simulate an event on the main document
		const event = new Event("zoomPanMap");
		document.dispatchEvent(event);

		// Check if the event was dispatched to the popup document
		expect(mockPopup.document.dispatchEvent).toHaveBeenCalled();
		const dispatchedEvent = mockPopup.document.dispatchEvent.mock.calls[0][0];
		expect(dispatchedEvent.type).toBe("zoomPanMap");
	});

	it("should close the popup window when the layer becomes invisible", () => {
		const layerId = "layer1";
		const controllerURL = "controller.html";
		
		const mockPopup = global.window.open();
		mockSvgMap.getRootLayersProps.mockReturnValue({
			layer1: { id: "layer1", target: "_blank", svgImageProps: { controller: { url: controllerURL } } }
		});

		handler.showLayerSpecificUI(layerId, controllerURL);

		// Update rootLayersProps to simulate invisibility
		mockSvgMap.getRootLayersProps.mockReturnValue([
			{ id: "layer1", visible: false }
		]);

		// Trigger sync
		handler.updateLayerSpecificWebAppHandler();

		expect(mockPopup.close).toHaveBeenCalled();
	});

	it("should correctly dispatch to popup or iframe based on LayerManager property", () => {
		const controllerURL = "controller.html";

		// Scenario 1: target="_blank"
		mockSvgMap.getRootLayersProps.mockReturnValue({
			popupLayer: { id: "popupLayer", target: "_blank", svgImageProps: { controller: { url: controllerURL } } }
		});
		handler.showLayerSpecificUI("popupLayer", controllerURL);
		expect(global.window.open).toHaveBeenCalled();
		expect(layerSpecificUI.querySelector("iframe#layerSpecificUIframe_popupLayer")).toBeNull();

		// Scenario 2: target="_self" or null
		mockSvgMap.getRootLayersProps.mockReturnValue({
			inlineLayer: { id: "inlineLayer", target: "_self", svgImageProps: { controller: { url: controllerURL } } }
		});
		handler.showLayerSpecificUI("inlineLayer", controllerURL);
		expect(layerSpecificUI.querySelector("iframe#layerSpecificUIframe_inlineLayer")).not.toBeNull();
	});
});
