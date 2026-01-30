import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

describe("LayerSpecificWebAppHandler Polling Test", () => {
	let handler;
	let mockSvgMap;
	let mockAuthoringTool;
	let getLayerStatusFunc;

	beforeEach(() => {
		jest.useFakeTimers();

		mockSvgMap = {
			registLayerUiSetter: jest.fn(),
			getRootLayersProps: jest.fn().mockReturnValue([]),
			getSvgImagesProps: jest.fn().mockReturnValue({}),
			refreshScreen: jest.fn()
		};
		mockAuthoringTool = {};
		getLayerStatusFunc = jest.fn();

		// DOM要素のモック
		document.body.innerHTML = '<div id="layerSpecificUI"></div>';

		// window.confirm のモック
		jest.spyOn(window, "confirm").mockReturnValue(true);

		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, getLayerStatusFunc);
		handler.initLayerSpecificUI();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("should poll HELO every 100ms and stop after 50 attempts", () => {
		const lid = "test-layer";
		const controllerURL = "http://example.com/ui.html#target=_blank";
		const reqSize = { width: 400, height: 400 };

		// window.open のモック
		const mockPopup = {
			closed: false,
			close: jest.fn(),
			postMessage: jest.fn(),
			location: { origin: "http://example.com" }
		};
		jest.spyOn(window, "open").mockReturnValue(mockPopup);

		// lprops のモック（IDをキーに持つ形式として振る舞わせる）
		const mockLprops = {};
		mockLprops[lid] = { id: lid, visible: true, target: "_blank", svgImageProps: { controller: { url: controllerURL } } };
		mockSvgMap.getRootLayersProps.mockReturnValue(mockLprops);

		handler.showLayerSpecificUI(lid, controllerURL, false);

		expect(window.open).toHaveBeenCalled();

		// 100ms 経過後の確認
		jest.advanceTimersByTime(100);
		
		// 50回分（5000ms）進める
		for(let i = 0; i < 50; i++) {
			jest.advanceTimersByTime(100);
		}

		// 51回目には停止しているはず
		const postMessageCallsBefore = mockPopup.postMessage.mock.calls.length;
		jest.advanceTimersByTime(100);
		const postMessageCallsAfter = mockPopup.postMessage.mock.calls.length;
		
		expect(postMessageCallsAfter).toBe(postMessageCallsBefore);
		// 合計で約50回呼ばれていること
		expect(postMessageCallsBefore).toBeGreaterThanOrEqual(50);
	});
});
