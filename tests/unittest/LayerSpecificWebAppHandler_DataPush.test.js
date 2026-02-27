import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

describe("LayerSpecificWebAppHandler Data Push Test", () => {
	let handler;
	let mockSvgMap;
	let mockAuthoringTool;
	let getLayerStatusFunc;

	beforeEach(() => {
		mockSvgMap = {
			registLayerUiSetter: jest.fn(),
			getRootLayersProps: jest.fn().mockReturnValue([]),
			getSvgImagesProps: jest.fn().mockReturnValue({}),
			getSvgImages: jest.fn().mockReturnValue({}),
			refreshScreen: jest.fn()
		};
		mockAuthoringTool = {};
		getLayerStatusFunc = jest.fn();

		document.body.innerHTML = '<div id="layerSpecificUI"></div>';
		jest.spyOn(window, "confirm").mockReturnValue(true);

		handler = new LayerSpecificWebAppHandler(mockSvgMap, mockAuthoringTool, getLayerStatusFunc);
		handler.initLayerSpecificUI();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("should include svgImageProps when transferring events to Sandbox", async () => {
		const lid = "test-layer";
		const controllerURL = "http://example.com/ui.html#target=_blank";
		
		const mockPopup = {
			closed: false,
			postMessage: jest.fn(),
			location: { origin: "http://example.com" }
		};
		jest.spyOn(window, "open").mockReturnValue(mockPopup);

		const mockProps = {
			"test-layer": { scale: 1.5, geoViewBox: { minX: 0 } }
		};
		mockSvgMap.getSvgImagesProps.mockReturnValue(mockProps);
		
		const mockLprops = {};
		mockLprops[lid] = { id: lid, visible: true, target: "_blank", svgImageProps: mockProps[lid] };
		mockSvgMap.getRootLayersProps.mockReturnValue(mockLprops);

		// 1. 初期化（ポップアップ起動）
		handler.showLayerSpecificUI(lid, controllerURL, false);

		// 2. ハンドシェイクをシミュレート (handshakeAck コマンドを擬似的に受信)
		const token = handler.getHandshakeTokenForTesting(lid);
		expect(token).toBeDefined();
		
		const ackMsg = {
			origin: "http://example.com",
			source: mockPopup,
			data: JSON.stringify({
				command: "handshakeAck",
				parameter: [lid, token]
			})
		};
		const messageEvent = new MessageEvent("message", ackMsg);
		window.dispatchEvent(messageEvent);

		// ハンドシェイク処理の完了を待機
		await new Promise(resolve => setTimeout(resolve, 50));
		
		// 3. zoomPanMap イベントを発火
		const event = new Event("zoomPanMap");
		document.dispatchEvent(event);

		// 転送処理の完了を待機
		await new Promise(resolve => setTimeout(resolve, 100));

		// postMessage が呼ばれ、そのデータに Props が含まれているか
		const calls = mockPopup.postMessage.mock.calls;
		const eventPushCall = calls.find(call => {
			try {
				const data = JSON.parse(call[0]);
				return data.command === "receiveParentEvent" && data.parameter[0].event === "zoomPanMap";
			} catch(e) {
				return false;
			}
		});

		expect(eventPushCall).toBeDefined();
		const pushData = JSON.parse(eventPushCall[0]);
		const payload = pushData.parameter[0];
		expect(payload.svgImageProps).toBeDefined();
		expect(payload.svgImageProps.scale).toBe(1.5);
	});
});
