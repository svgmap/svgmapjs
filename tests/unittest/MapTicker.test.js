import { MapTicker } from "../../libs/MapTicker";
import { mock_svgmapObj } from "./resources/mockParamerters";
import { jest } from "@jest/globals";

describe("unittest for MapTicker", () => {
	describe("target class", () => {
		let maptikcer;
		beforeEach(() => {
			// MapTickerの仕様でCenterSight(画面中央の＋マーク)がないとNG
			let div = document.createElement("div");
			let center = document.createElement("img");
			center.setAttribute("id", "centerSight");
			div.appendChild(center);
			document.body.appendChild(center);

			maptikcer = new MapTicker(mock_svgmapObj);
		});
		it("XXXXXX", () => {});
	});
});
