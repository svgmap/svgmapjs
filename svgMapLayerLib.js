//
// Description:
//  Web App Layer Initializer
//  for SVG Map Level0.1/0.2 Implementation
//
// The html of the SVGMap's web App Layer must import this initializer with the script element.
//
// Programmed by Satoru Takagi
//
// Contributors:
//  kusariya
//
// Home Page: http://svgmap.org/
// GitHub: https://github.com/svgmap/svgmapjs
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// 2024/07/23 1st implementatiion, to fix https://github.com/svgmap/svgmapjs/issues/5

// Note:
// 将来、このイニシャライザーは、より高度・複雑な実装になる可能性がある。またWeb App Layerの作法もさらに変更される可能性もある
// 今のところWebAppLayerはESMを必須としていない為、このライブラリもmoduleではないことにしている。

addEventListener("DOMContentLoaded", function () {
	// console.log(window.parent, window.parent.svgMap);
	if (window.parent?.initSvgMapWebAppLayer) {
		// for svgMapESM
		window.parent?.initSvgMapWebAppLayer(window);
	} else if (window.parent?.svgMap?.initSvgMapWebAppLayer) {
		// for svgMapESM (2)
		window.parent?.svgMap?.initSvgMapWebAppLayer(window);
	} else if (window.parent?.svgMapLayerUI?.initSvgMapWebAppLayer) {
		// for svgMap0.1_r17
		window.parent.svgMapLayerUI.initSvgMapWebAppLayer(window);
	}
});
