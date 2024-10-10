// 
// Description:
//  Web Mapping Framework based on SVG
//  SVG Map Level0.1 Implementation
//  evolved from SVG Map Level0
// SVGMapのインスタンスをデフォルトの状態で生成する、デフォルトsvgMapインスタンスモジュール
//  
// Programmed by Satoru Takagi
//  
// Copyright (C) 2012-2023 by Satoru Takagi @ KDDI CORPORATION
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
//
//
//
// 2023/12/28 SVGMapLv0.1_Class_r18module.jsをコアにして、new SVGMap()する部分を切り離した。
// 今後、拡張機能を使いたい場合は、このデフォルトモジュールに代えて、自分で作ったモジュールから、オプション付きでnew SVGMap(options)とすることで初期化段階を変化させることができる感じ


import { SvgMap } from './SVGMapLv0.1_Class_r18module.js';
	
var svgMap = new SvgMap();

//window.svgMap = svgMap;

export { svgMap };