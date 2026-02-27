// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { ResourceLoadingObserver } from "../../libs/ResourceLoadingObserver";
import { jest } from "@jest/globals";
import { ZoomPanManager } from "../../libs/ZoomPanManager";

const statusPattern = [
	{
		description: "load completed",
		forceDel: true,
		isLoadCompleted: true,
		isViewBoxChanged: true,
		countFireTheZoomPanEvent: 0,
		countFireTheScreenFreshedEvent: 0,
	},
	{
		description: "load uncompleted && viewBox is Changed",
		forceDel: false,
		isLoadCompleted: false,
		isViewBoxChanged: true,
		countFireTheZoomPanEvent: 1,
		countFireTheScreenFreshedEvent: 0,
	},
	{
		description: "load uncompleted && viewBox is Unchanged",
		forceDel: false,
		isLoadCompleted: false,
		isViewBoxChanged: false,
		countFireTheZoomPanEvent: 0,
		countFireTheScreenFreshedEvent: 1,
	},
];

describe("unittest for ResourceLoadingObserver", () => {
	describe.each(statusPattern)("$description pattern ", (pattern) => {
		let resourceloadingobserver;
		let mock_mapViewerProps,
			mock_svgImagesProps,
			mock_svgImages,
			mock_refreshScreen,
			mock_viewBoxChanged;
		let mock_imgRenderer, mock_mapTicker, mock_geometryCapturer;
		const zoomPanEventListener = jest.fn();
		const screenRefreshedEventListener = jest.fn();
		beforeAll(() => {
			document.addEventListener("zoomPanMap", (msg) => {
				zoomPanEventListener(msg);
			});
			document.addEventListener("screenRefreshed", (msg) => {
				screenRefreshedEventListener(msg);
			});
		});
		beforeEach(() => {
			let canvasNode = document.createElement("canvas");
			mock_mapViewerProps = { mapCanvas: canvasNode, uaProps: { Edge: false } };
			mock_svgImagesProps = {};
			mock_svgImages = {};
			mock_refreshScreen = jest.fn();
			mock_viewBoxChanged = jest.fn().mockReturnValue(pattern.isViewBoxChanged);
			mock_mapTicker = { pathHitTester: { enable: false } }; // HitTestは常時無効でいいのかなぁ？
			mock_geometryCapturer = { removeDocGeometries: jest.fn() };
			resourceloadingobserver = new ResourceLoadingObserver(
				mock_mapViewerProps,
				mock_svgImagesProps,
				mock_svgImages,
				mock_refreshScreen,
				mock_viewBoxChanged
			);
			resourceloadingobserver.init(
				mock_imgRenderer,
				mock_mapTicker,
				mock_geometryCapturer
			);
			resourceloadingobserver.setLoadCompleted(pattern.isLoadCompleted);
			zoomPanEventListener.mockClear();
			screenRefreshedEventListener.mockClear();
		});

		it("loadingImgs object have empty.", () => {
			// resourceloadingobserver.loadingImgs = {}; （ロード中のタイルなしと同義）
			let result = resourceloadingobserver.checkLoadCompleted(pattern.forceDel);
			expect(result).toBe(true);
			// load完了のためイベント発火する
			expect(zoomPanEventListener).toHaveBeenCalledTimes(
				pattern.countFireTheZoomPanEvent
			);
			expect(screenRefreshedEventListener).toHaveBeenCalledTimes(
				pattern.countFireTheScreenFreshedEvent
			);
		});

		it("loadingImgs object have something.", () => {
			resourceloadingobserver.loadingImgs["iid10"] = true; //ロード中のタイルあり
			let result = resourceloadingobserver.checkLoadCompleted(pattern.forceDel);
			expect(result).toBe(pattern.isLoadCompleted);
			// loadが完了してないためイベント発火は起こりえない
			expect(zoomPanEventListener).toHaveBeenCalledTimes(0);
			expect(screenRefreshedEventListener).toHaveBeenCalledTimes(0);
		});

		it("RootNode doesn't have elements that have toBeDel id", () => {
			let rootNode = document.createElement("canvas");
			let imgElement = document.createElement("img");
			let imgElementOtherID = document.createElement("img");
			let imgElementToBeDel = document.createElement("img");
			imgElementOtherID.setAttribute("id", "notDel#1");
			rootNode.appendChild(imgElement);
			rootNode.appendChild(imgElementOtherID);
			resourceloadingobserver.requestRemoveTransition(imgElement, null);
			expect(rootNode.childNodes.length).toBe(2);
		});
		//TODO:toBeDelフラグがついた要素があった場合の試験は今後
	});
});
