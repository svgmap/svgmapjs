// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { LayerManager } from "../../libs/LayerManager.js";

describe("LayerManager Baseline Test", () => {
	let layerManager;
	let svgImagesProps;
	let svgImages;
	let loadingImgs;
	let mockRefreshScreen;

	beforeEach(() => {
		svgImagesProps = {
			root: { isSVG2: false },
			layer1: { Path: "path1.svg" },
			layer2: { Path: "path2.svg" }
		};
		svgImages = {
			root: {
				getElementsByTagName: jest.fn().mockImplementation((tagName) => {
					if (tagName === "animation") {
						return [
							createMockElement("layer1", "Title 1", "path1.svg"),
							createMockElement("layer2", "Title 2", "path2.svg")
						];
					}
					return [];
				}),
				querySelector: jest.fn()
			},
			layer1: {},
			layer2: {}
		};
		loadingImgs = {};
		mockRefreshScreen = jest.fn();

		layerManager = new LayerManager(svgImagesProps, svgImages, loadingImgs, mockRefreshScreen);
	});

	function createMockElement(iid, title, href, target = null) {
		return {
			getAttribute: jest.fn().mockImplementation((attr) => {
				if (attr === "iid") return iid;
				if (attr === "title") return title;
				if (attr === "xlink:href") return href;
				if (attr === "target") return target;
				if (attr === "visibility") return "visible";
				if (attr === "class") return "";
				return null;
			})
		};
	}

	it("should extract basic layer properties correctly", () => {
		const props = layerManager.getRootLayersProps();
		expect(props.length).toBe(2);
		expect(props[0].id).toBe("layer1");
		expect(props[0].title).toBe("Title 1");
		expect(props[0].href).toBe("path1.svg");
		expect(props[1].id).toBe("layer2");
		expect(props[1].title).toBe("Title 2");
	});

	it("should extract 'target' attribute correctly when present", () => {
		svgImages.root.getElementsByTagName.mockReturnValue([
			createMockElement("layer1", "Title 1", "path1.svg", "_blank"),
			createMockElement("layer2", "Title 2", "path2.svg", "_self")
		]);
		const props = layerManager.getRootLayersProps();
		expect(props[0].target).toBe("_blank");
		expect(props[1].target).toBe("_self");
	});

	it("should set 'target' to null when not present", () => {
		const props = layerManager.getRootLayersProps();
		expect(props[0].target).toBeNull();
	});

	it("should identify layers as having documents if present in svgImages and props", () => {
		const props = layerManager.getRootLayersProps();
		expect(props[0].hasDocument).toBe(true);
		expect(props[1].hasDocument).toBe(true);
	});
});
