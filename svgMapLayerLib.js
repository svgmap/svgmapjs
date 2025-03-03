//
// Description:
//  Web App Layer Initializer
//  for SVG Map Level0.1/0.2 Implementation
//
// The html of the SVGMap's web App Layer must import this initializer with the script element.
//
// Programmed by Satoru Takagi
//
// Copyright (C) 2012-2021 by Satoru Takagi @ KDDI CORPORATION
//
// Contributors:
//  jakkyfc
//
// Home Page: http://svgmap.org/
// GitHub: https://github.com/svgmap/svgMapLv0.1
//
// License: (GPL v3)
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 3 as
//  published by the Free Software Foundation.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
