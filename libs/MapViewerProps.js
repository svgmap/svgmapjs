// Description:
// MapViewerProps Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class MapViewerProps {
	// SVGMapのビューアにまつわる内部グローバル変数をまとめたオブジェクト
	root2Geo;
	mapCanvas;
	rootCrs;
	uaProps;

	mapCanvas;
	mapCanvasWrapper;

	constructor() {
		Object.defineProperty(this, "rootViewBox", { value: {} });
		Object.defineProperty(this, "mapCanvasSize", { value: {} });

		//Object.defineProperty(this, "svgImages",{value:{}});
		//Object.defineProperty(this, "svgImagesProps",{value:{}});
	}

	hasUaProps() {
		var ans = false;
		if (this.uaProps && this.uaProps.verIE) {
			ans = true;
		}
		return ans;
	}
	/**
	 *
	 * @returns {Boolean} Canvasが存在するかの確認
	 */
	hasMapCanvasSize() {
		if (this.mapCanvasSize.width) {
			return true;
		} else {
			return false;
		}
	}
	setRootViewBox(vb) {
		this.rootViewBox.x = vb.x;
		this.rootViewBox.y = vb.y;
		this.rootViewBox.width = vb.width;
		this.rootViewBox.height = vb.height;
	}
	setMapCanvasSize(size) {
		// this.#mapCanvasSizeをconst扱いにする
		this.mapCanvasSize.x = size.x;
		this.mapCanvasSize.y = size.y;
		this.mapCanvasSize.width = size.width;
		this.mapCanvasSize.height = size.height;
	}
}

export { MapViewerProps };
