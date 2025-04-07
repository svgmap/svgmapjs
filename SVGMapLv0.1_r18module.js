//
// Description:
//  Web Mapping Framework based on SVG
//  SVG Map Level0.1 Implementation
//  evolved from SVG Map Level0
// SVGMapのインスタンスをデフォルトの状態で生成する、デフォルトsvgMapインスタンスモジュール
//
// Programmed by Satoru Takagi
//
// Contributors:
//  kusariya
//
// Home Page: http://svgmap.org/
// GitHub: https://github.com/svgmap/svgmapjs
//
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
//
// 2023/12/28 SVGMapLv0.1_Class_r18module.jsをコアにして、new SVGMap()する部分を切り離した。
// 今後、拡張機能を使いたい場合は、このデフォルトモジュールに代えて、自分で作ったモジュールから、オプション付きでnew SVGMap(options)とすることで初期化段階を変化させることができる感じ

import { SvgMap } from "./SVGMapLv0.1_Class_r18module.js";

var svgMap = new SvgMap();

//window.svgMap = svgMap;

export { svgMap };
