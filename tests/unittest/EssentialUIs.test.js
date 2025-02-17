import { EssentialUIs } from "../../libs/EssentialUIs";
import {
	mock_svgmapObj,
	mock_mapViewerProps,
} from "./resources/mockParamerters";
import { jest } from "@jest/globals";
import * as fs from "node:fs/promises";

describe("unittest for EssentialUIs", () => {
	describe("essentialuisでDOM操作に関する試験", () => {
		let essentialui;
		beforeAll(() => {
			essentialui = new EssentialUIs(
				mock_svgmapObj,
				mock_mapViewerProps,
				jest.fn(),
				{
					updateTicker: jest.fn(),
				},
				{
					SVG2Geo: jest.fn().mockReturnValue({ lat: 130, lng: 40 }),
					Geo2SVG: jest.fn().mockReturnValue({ x: 300, y: 600 }),
				},
				jest.fn()
			);
		});
		beforeEach(async () => {
			const html = await fs.readFile(
				"./tests/unittest/resources/mock.html",
				"UTF-8"
			);
			document.body.innerHTML = ""; //DOMの初期化
			document.body.innerHTML = html; //DOMのロード

			essentialui.initMapCanvas();
		});

		it("layerListのサイズを自動調整", () => {
			essentialui.setLayerListSize();
			let result = document.getElementById("layerList");
			expect(result.getAttribute("style")).toBe(
				"left: 30px; top: 10px; width: 300px; height: 90%; position: absolute;"
			); // layerListのサイズを設定する関数
		});

		it("NavigationUIの初期化(SmartPhone)", () => {
			// setLayerListSize()が中でCallされています
			essentialui.initNavigationUIs(true);
			const zoomupBtn = document.getElementById("zoomupButton");
			expect(zoomupBtn.width).toBe(50);
			expect(zoomupBtn.height).toBe(50);
			const zoomdownBtn = document.getElementById("zoomdownButton");
			expect(zoomdownBtn.width).toBe(50);
			expect(zoomdownBtn.height).toBe(50);
			expect(zoomdownBtn.style.top).toBe("55px");
			const gpsBtn = document.getElementById("gpsButton");
			expect(gpsBtn.width).toBe(50);
			expect(gpsBtn.height).toBe(50);
			expect(gpsBtn.style.top).toBe("110px");
			expect(gpsBtn.style.cursor).toContain("pointer");
			const layerList = document.getElementById("layerList");
			const customBtn = document.getElementsByClassName("customButton");
		});

		it("NavigationUIの初期化(PC)", () => {
			essentialui.initNavigationUIs(false);
			const zoomupBtn = document.getElementById("zoomupButton");
			expect(zoomupBtn.width).toBe(20);
			expect(zoomupBtn.height).toBe(20);
			const zoomdownBtn = document.getElementById("zoomdownButton");
			expect(zoomdownBtn.width).toBe(20);
			expect(zoomdownBtn.height).toBe(20);
			expect(zoomdownBtn.style.top).toBe("25px");
			const gpsBtn = document.getElementById("gpsButton");
			expect(gpsBtn.width).toBe(20);
			expect(gpsBtn.height).toBe(20);
			expect(gpsBtn.style.top).toBe("45px");
			expect(gpsBtn.style.cursor).toContain("pointer");
			const layerList = document.getElementById("layerList");
			const customBtn = document.getElementsByClassName("customButton");
		});

		// TODO: setPointerEventsの試験を追加
	});

	describe("EssentialUIs内の関数に対する試験", () => {
		let essentialui;
		beforeAll(() => {
			essentialui = new EssentialUIs(
				mock_svgmapObj,
				mock_mapViewerProps,
				jest.fn(),
				{
					updateTicker: jest.fn(),
				},
				{
					SVG2Geo: jest.fn().mockReturnValue({ lat: 130, lng: 40 }),
					Geo2SVG: jest.fn().mockReturnValue({ x: 300, y: 600 }),
				},
				jest.fn()
			);
		});

		it("update Position of Center.", () => {
			essentialui.setCenterUI();
			// 内部でCallされるmatUtil.SVG2Geo関数はbeforeAllでMock化されているためその値がそのまま描画されるだけです。
			essentialui.updateCenterPos();
			let centerPositionLabel = document.getElementById("centerPos");
			expect(centerPositionLabel.textContent).toBe("130 , 40");
		});

		it("screen2Geo", () => {
			essentialui.getVerticalScreenScale();
		});

		it("setPointerEvents", () => {
			essentialui.setPointerEvents();
		});

		it("setGeoCenter", () => {
			essentialui.setGeoCenter(140.01, 32.01);
		});

		// TODO: setGeoViewBoxの試験を追加
		// TODO: setMapCanvasCSSの試験を追加
	});

	describe("Geo2SVGを複数回呼び出す試験", () => {
		let essentialui;
		beforeAll(() => {
			essentialui = new EssentialUIs(
				mock_svgmapObj,
				mock_mapViewerProps,
				jest.fn(),
				{
					updateTicker: jest.fn(),
				},
				{
					SVG2Geo: jest.fn().mockReturnValue({ lat: 130, lng: 40 }),
					Geo2SVG: jest
						.fn()
						.mockReturnValueOnce({ x: 300, y: 200 })
						.mockReturnValueOnce({ x: 100, y: 600 }),
				},
				jest.fn()
			);
		});
		it("setGeoViewPort", () => {
			essentialui.setGeoViewPort(120.5, 34.1, 0.1, 0.2, false);
			expect(mock_mapViewerProps.setRootViewBox).toHaveBeenCalledWith({
				height: 400,
				width: 533.3333333333334,
				x: 133.33333333333331,
				y: 600,
			});
		});
	});
});
