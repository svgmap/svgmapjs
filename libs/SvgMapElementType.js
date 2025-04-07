// Description:
// SvgMapElementType Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class SvgMapElementType {
	// for childCategory
	static EMBEDSVG = 0;
	static BITIMAGE = 1;
	static POI = 2;
	static VECTOR2D = 3;
	static GROUP = 4;
	static TEXT = 5;
	static NONE = -1;
	// for childSubCategory
	static PATH = 0;
	static POLYLINE = 1;
	static POLYGON = 2;
	static RECT = 3;
	static CIRCLE = 4;
	static ELLIPSE = 5;
	static HYPERLINK = 10;
	static SYMBOL = 11;
	static USEDPOI = 12;
	static DIRECTPOI = 13;
	static SVG2EMBED = 100;

	// for layerCategory
	static EXIST = 1;
	static CLICKABLE = 2;

	static ns_svg = "http://www.w3.org/2000/svg"; // つかわれてないな・・・
}

export { SvgMapElementType };
