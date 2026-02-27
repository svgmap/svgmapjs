// License: (MPL v2)
import { beforeAll, beforeEach, describe, it, expect, jest } from "@jest/globals";
import * as fs from "node:fs/promises";

// モックのセットアップ
const xhrMock = {
	open: jest.fn(),
	send: jest.fn().mockImplementation(function() {
		this.readyState = 4;
		this.status = 200;
		this.onreadystatechange();
	}),
	onreadystatechange: jest.fn(),
	readyState: 0,
	status: 0,
	responseText: "",
	setRequestHeader: jest.fn(),
};

const xhrSpy = jest.spyOn(window, "XMLHttpRequest").mockImplementation(() => xhrMock);

// 正しい名前空間を持つSVG形式
const rootSvgText = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
	<globalCoordinateSystem transform="matrix(1,0,0,-1,0,0)"/>
	<animation iid="layer1" xlink:href="child.svg" x="0" y="0" width="100" height="100" />
</svg>
`;

describe("Animation Baseline Test (Existing Behavior)", () => {
	let SvgMap;
	let svgmap;

	beforeAll(async () => {
		const mod = await import("../../SVGMapLv0.1_Class_r18module.js");
		SvgMap = mod.SvgMap;
	});

	beforeEach(() => {
		jest.clearAllMocks();

		document.body.innerHTML = `
			<div id="mapcanvas" data-src="root.svg"></div>
			<div id="centerSight"></div>
			<div id="layerList"></div>
			<div id="layerSpecificUI"></div>
		`;

		jest.useFakeTimers();
		svgmap = new SvgMap();
		svgmap.initLoad();
		jest.runAllTimers();
		jest.useRealTimers();
	});

	it("should call loadSVG for child animation when parsing SVG (standard behavior)", (done) => {
		let callCount = 0;
		xhrMock.send.mockImplementation(function() {
			callCount++;
			this.readyState = 4;
			this.status = 200;
			if (callCount === 1) {
				// root
				this.responseText = rootSvgText;
			} else {
				// child
				this.responseText = `<svg xmlns="http://www.w3.org/2000/svg"><globalCoordinateSystem transform="matrix(1,0,0,-1,0,0)"/></svg>`;
				// 2回目のロードが呼ばれた＝既存の挙動（animationがパースされロードされる）を確認
				done();
			}
			this.onreadystatechange();
		});

		svgmap.loadSVG("root.svg", "root", document.getElementById("mapcanvas"));
	});
});