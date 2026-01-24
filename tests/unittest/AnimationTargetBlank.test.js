// License: (MPL v2)
import { beforeAll, beforeEach, describe, it, expect, jest } from "@jest/globals";

// モックのセットアップ
const xhrMock = {
	open: jest.fn(),
	send: jest.fn().mockImplementation(function() {
		this.readyState = 4;
		this.status = 200;
		setTimeout(() => {
			this.onreadystatechange();
		}, 0);
	}),
	onreadystatechange: jest.fn(),
	readyState: 0,
	status: 0,
	responseText: "",
	setRequestHeader: jest.fn(),
};

const xhrSpy = jest.spyOn(window, "XMLHttpRequest").mockImplementation(() => xhrMock);

// window.open のモック
const mock_window_open = jest.fn();
jest.spyOn(window, "open").mockImplementation(mock_window_open);

const rootSvgTextBlankWithCtrl = `
<svg XMLNS="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
	<globalCoordinateSystem transform="matrix(1,0,0,-1,0,0)"/>
	<animation iid="iTestBlank" xlink:href="child.svg" target="_blank" data-controller="http://example.com/ctrl.html" x="0" y="0" width="100" height="100" />
</svg>
`;

describe("Animation target='_blank' Support - Controller Window", () => {
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
		jest.useRealTimers();
	});

	it("should call window.open when target='_blank' and data-controller is present", (done) => {
		xhrMock.send.mockImplementation(function() {
			this.readyState = 4;
			this.status = 200;
			this.responseText = rootSvgTextBlankWithCtrl;
			setTimeout(() => {
				this.onreadystatechange();
			}, 10);
		});

		svgmap = new SvgMap();
		svgmap.initLoad();

		setTimeout(() => {
			try {
				// window.open が呼ばれたか確認
				expect(mock_window_open).toHaveBeenCalled();
				// 呼ばれた引数を確認 (URL, "_blank")
				expect(mock_window_open).toHaveBeenCalledWith(expect.stringContaining("http://example.com/ctrl.html"), "_blank");
				
				done();
			} catch (e) {
				done(e);
			}
		}, 200);
	});

	it("should NOT call window.open when target='_blank' but data-controller is absent", (done) => {
		const rootSvgNoCtrl = `
<svg XMLNS="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
	<globalCoordinateSystem transform="matrix(1,0,0,-1,0,0)"/>
	<animation iid="iTestNoCtrl" xlink:href="child.svg" target="_blank" x="0" y="0" width="100" height="100" />
</svg>
`;
		xhrMock.send.mockImplementation(function() {
			this.readyState = 4;
			this.status = 200;
			this.responseText = rootSvgNoCtrl;
			setTimeout(() => {
				this.onreadystatechange();
			}, 10);
		});

		svgmap = new SvgMap();
		svgmap.initLoad();

		setTimeout(() => {
			try {
				// window.open が呼ばれていないことを確認
				expect(mock_window_open).not.toHaveBeenCalled();
				done();
			} catch (e) {
				done(e);
			}
		}, 200);
	});
});
