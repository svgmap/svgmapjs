
import { CustomHitTester } from "../../libs/CustomHitTester.js";
import { jest } from "@jest/globals";

describe("CustomHitTester Security Protection", () => {
	let mockSvgMap;
	let mockGetLayerName;
	let svgImagesProps;
	let svgImages;

	beforeEach(() => {
		svgImagesProps = {};
		svgImages = {};
		mockGetLayerName = jest.fn((layer) => layer ? layer.title : "Unknown");
		mockSvgMap = {
			getSvgImagesProps: () => svgImagesProps,
			getSvgImages: () => svgImages,
			getLayer: (id) => ({ title: `Layer ${id}` }),
			screen2Geo: () => ({ lat: 35, lng: 135 }),
		};
	});

	it("should catch SecurityError and continue processing other layers", () => {
		// 1. 正常なレイヤー (i1)
		svgImagesProps["i1"] = {
			controllerWindow: {
				customHitTester: jest.fn(() => true),
			},
			metaSchema: "schema1",
		};
		svgImages["i1"] = { documentElement: { nodeType: 1, getAttribute: () => "" } };

		// 2. セキュリティエラーを投げるレイヤー (i2: クロスオリジン模倣)
		// プロパティアクセス時にエラーを投げるように設定
		const crossOriginSip = {
			metaSchema: "schema2",
		};
		Object.defineProperty(crossOriginSip, "controllerWindow", {
			get: () => {
				throw new Error("SecurityError: Blocked a frame with origin...");
			},
			enumerable: true,
			configurable: true
		});
		svgImagesProps["i2"] = crossOriginSip;
		svgImages["i2"] = { documentElement: { nodeType: 1, getAttribute: () => "" } };

		// 3. もう一つの正常なレイヤー (i3)
		svgImagesProps["i3"] = {
			controllerWindow: {
				customHitTester: jest.fn(() => ["hitted_item"]),
			},
			metaSchema: "schema3",
		};
		svgImages["i3"] = { documentElement: { nodeType: 1, getAttribute: () => "" } };

		const tester = new CustomHitTester(mockSvgMap, mockGetLayerName);
		
		let results;
		// 修正済みであれば、ここで例外が投げられずに終了する
		results = tester.getLayerHitTestAtPoint(100, 100);

		// 検証: i1 と i3 の結果が含まれていること (i2 はスキップ)
		const layerNames = results.map(r => r.layerName);
		expect(layerNames).toContain("Layer i1");
		expect(layerNames).toContain("Layer i3");
		expect(layerNames).not.toContain("Layer i2");
	});
});
