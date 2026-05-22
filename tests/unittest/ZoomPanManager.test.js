import { ZoomPanManager } from "../../libs/ZoomPanManager";
import { expect, jest } from "@jest/globals";
import {
	mock_svgmapObj,
	mock_mapViewerProps,
} from "./resources/mockParamerters";
import * as fs from "node:fs/promises";
import { TestResetUtility } from "./TestResetUtility";

const basePath = "./tests/unittest/resources/zoompanmanager/";
const devices = [
	{
		// PC
		device: "PC",
		smartPhone: false,
		clickEvent: {
			eventFile: "clickEventForPC.json",
			correct: { x: 100, y: 200 },
		},
		dragEvent: {
			downEventFile: "downEventForPC.json",
			moveEventFile: "moveEventForPC.json",
			upEventFile: "upEventForPC.json",
			correct: { x: -200 },
		},
		scrollEvent: {
			eventFile: "scrollEventForPC.json", //wheel down
			correct: false,
		},
	},
	// 今後スマートフォンも追加する予定
];

describe("unittest for ZoomPanManager", () => {
	describe.each(devices)("returns $device", (device) => {
		let zoompanmanager;
		let mock_hideTickerFunc,
			mock_checkLoadCompletedFunc,
			mock_getObjectAtPointFunc,
			mock_getIntValueFunc,
			mock_getRootSvg2CanvasFunc;
		beforeAll(() => {
			mock_hideTickerFunc = jest.fn();
			mock_checkLoadCompletedFunc = jest.fn();
			mock_getObjectAtPointFunc = jest.fn();
			mock_getIntValueFunc = jest.fn();
			mock_getRootSvg2CanvasFunc = jest
				.fn()
				.mockReturnValue({ a: 1, b: 0, c: 0, d: 1 });

			mock_mapViewerProps.mapCanvas.querySelectorAll = jest.fn().mockReturnValue([]);
			mock_mapViewerProps.mapCanvas.querySelector = jest.fn().mockReturnValue(null);

			zoompanmanager = new ZoomPanManager(
				mock_hideTickerFunc,
				mock_checkLoadCompletedFunc,
				mock_getObjectAtPointFunc,
				mock_getIntValueFunc,
				mock_getRootSvg2CanvasFunc,
				mock_mapViewerProps,
				mock_svgmapObj
			);
		});
		beforeEach(() => {
			TestResetUtility.resetAll();
		});

		it("マウス座標の取得", async () => {
			const json = await fs.readFile(
				basePath + device.clickEvent.eventFile,
				"UTF-8"
			);
			const dummy_eventData = JSON.parse(json, "text/xml");
			let result = zoompanmanager.getMouseXY(dummy_eventData);
			expect(result).toEqual(device.clickEvent.correct);
		});

		it("クリックの挙動", async () => {
			const json = await fs.readFile(
				basePath + device.clickEvent.eventFile,
				"UTF-8"
			);
			const dummy_eventData = JSON.parse(json);
			let result = zoompanmanager.startPan(dummy_eventData);
			expect(result).toBe(false);
			result = zoompanmanager.showPanning(dummy_eventData);
			expect(mock_getObjectAtPointFunc).toHaveBeenCalledWith(
				device.clickEvent.correct.x,
				device.clickEvent.correct.y
			);
		});

		it.skip("左クリックでのPAN - not testable", async () => {
			const down = await fs.readFile(
				basePath + device.dragEvent.downEventFile,
				"UTF-8"
			);
			const move = await fs.readFile(
				basePath + device.dragEvent.moveEventFile,
				"UTF-8"
			);
			const up = await fs.readFile(
				basePath + device.dragEvent.upEventFile,
				"UTF-8"
			);
			const downEventData = { ...JSON.parse(down), type: 'mousedown' };
			const moveEventData = { ...JSON.parse(move), type: 'mousemove' };
			const upEventData = { ...JSON.parse(up), type: 'mouseup' };

			let result = zoompanmanager.startPan(downEventData);
			expect(result).toBe(false);
			result = zoompanmanager.showPanning(moveEventData);
			expect(result).toBe(false);
			result = zoompanmanager.showPanning(upEventData);
			expect(result).toBe(false);
            zoompanmanager.endPan(); 

			expect(mock_getObjectAtPointFunc).toHaveBeenCalled(); // 座標の呼び出しは複数回行われるため、呼び出し回数を指定せずに検証
		});
	});
});
