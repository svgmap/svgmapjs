// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { ResourceLoadingObserver } from "../../libs/ResourceLoadingObserver";
import { jest } from "@jest/globals";
import { ZoomPanManager } from "../../libs/ZoomPanManager";
import { TestResetUtility } from "./TestResetUtility";

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
    afterEach(() => {
        TestResetUtility.resetAll();
    });
	describe.each(statusPattern)("$description pattern ", (pattern) => {
		let resourceloadingobserver;
		let mock_mapViewerProps,
			mock_svgImagesProps,
			mock_svgImages,
			mock_refreshScreen,
			mock_viewBoxChanged;
		let mock_imgRenderer, mock_mapTicker, mock_geometryCapturer;
		let zoomPanEventListener, screenRefreshedEventListener;

		beforeAll(() => {
			document.addEventListener("zoomPanMap", (msg) => {
				zoomPanEventListener(msg);
			});
			document.addEventListener("screenRefreshed", (msg) => {
				screenRefreshedEventListener(msg);
			});
		});

		beforeEach(() => {
			zoomPanEventListener = jest.fn();
			screenRefreshedEventListener = jest.fn();

			let canvasNode = document.createElement("canvas");
			mock_mapViewerProps = { mapCanvas: canvasNode, uaProps: { Edge: false } };
			mock_svgImagesProps = {};
			mock_svgImages = {};
			mock_refreshScreen = jest.fn();
			mock_viewBoxChanged = jest.fn().mockReturnValue(pattern.isViewBoxChanged);
			mock_mapTicker = { pathHitTester: { enable: false } };
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
		});

		it("loadingImgs object have empty.", () => {
			// loadingImgsオブジェクトが空のとき、ロード完了とみなす
			let result = resourceloadingobserver.checkLoadCompleted(pattern.forceDel);
			expect(result).toBe(true);
			expect(zoomPanEventListener).toHaveBeenCalledTimes(
				pattern.countFireTheZoomPanEvent
			);
			expect(screenRefreshedEventListener).toHaveBeenCalledTimes(
				pattern.countFireTheScreenFreshedEvent
			);
		});

		it("loadingImgs object have something.", () => {
			// loadingImgsオブジェクトに何か入っているとき、ロード完了とみなさない
			resourceloadingobserver.loadingImgs["iid10"] = true;
			let result = resourceloadingobserver.checkLoadCompleted(pattern.forceDel);
			expect(result).toBe(pattern.isLoadCompleted);
			expect(zoomPanEventListener).toHaveBeenCalledTimes(0);
			expect(screenRefreshedEventListener).toHaveBeenCalledTimes(0);
		});

		it("RootNode doesn't have elements that have toBeDel id", () => {
			let rootNode = document.createElement("div");
			let imgElement = document.createElement("img");
			let imgElementOtherID = document.createElement("img");
			let imgElementToBeDel = document.createElement("img");
			imgElement.setAttribute("id", "img1");
			imgElementOtherID.setAttribute("id", "img2");
			imgElementToBeDel.setAttribute("id", "img3");
			rootNode.appendChild(imgElement);
			rootNode.appendChild(imgElementOtherID);
			rootNode.appendChild(imgElementToBeDel);
			expect(rootNode.childNodes.length).toBe(3); // 正しく子ノードが追加されたことを確認
			resourceloadingobserver.requestRemoveTransition(imgElementToBeDel, null);
			expect(rootNode.querySelector("#toBeDel0 #img3")).not.toBeNull(); // 削除タグが新設され配下にimg3が移動したことを確認
			rootNode = null;
		});
	});
});
