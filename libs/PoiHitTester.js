// Description:
// PoiHitTester Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// import { CollidedImagesGetter } from './CollidedImagesGetter.js'; // 今は使われていません

class PoiHitTester {
	constructor() {
		this.visiblePOIs = new Array();
	}

	visiblePOIs; // 現在画面上に表示されているPOI(imgアイコン)のリスト(idのハッシュ 内容はx,y,width,height)

	getPoiObjectsAtPoint(x, y) {
		var hittedPOIs = new Array();
		for (var i in this.visiblePOIs) {
			if (
				x < this.visiblePOIs[i].x ||
				x > this.visiblePOIs[i].x + this.visiblePOIs[i].width ||
				y < this.visiblePOIs[i].y ||
				y > this.visiblePOIs[i].y + this.visiblePOIs[i].height
			) {
				// none
			} else {
				this.visiblePOIs[i].id = i;
				hittedPOIs.push(this.visiblePOIs[i]);
			}
		}
		return hittedPOIs;
	}

	clear() {
		this.visiblePOIs = new Array();
	}

	setPoiBBox(imageId, x, y, width, height) {
		this.visiblePOIs[imageId] = { x: x, y: y, width: width, height: height };
	}
}

export { PoiHitTester };
