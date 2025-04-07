// Description:
// SvgStyle Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { UtilFuncs } from "./UtilFuncs.js";

class SvgStyle {
	styleCatalog = new Array(
		"stroke",
		"stroke-width",
		"stroke-linejoin",
		"stroke-linecap",
		"fill",
		"fill-rule",
		"fill-opacity",
		"filter",
		"opacity",
		"vector-effect",
		"display",
		"font-size",
		"stroke-dasharray",
		"marker-end",
		"visibility",
		"image-rendering"
	);

	constructor() {}

	getStyle(svgNode, defaultStyle, hasHyperLink, styleCacheMap) {
		// 親のスタイルを継承して該当要素のスタイルを生成する
		// hasUpdateはその要素自身にスタイルattrが付いていたときに設定される

		var nodeStyle;

		if (styleCacheMap) {
			nodeStyle = styleCacheMap.get(svgNode);
		}

		if (nodeStyle == undefined) {
			//			if ( true){}
			nodeStyle = this.getNodeStyle(svgNode, hasHyperLink);
			if (styleCacheMap) {
				styleCacheMap.set(svgNode, nodeStyle);
			}
		}

		var computedStyle = {};
		var hasStyle = false;
		for (var styleName of this.styleCatalog) {
			if (nodeStyle[styleName]) {
				computedStyle[styleName] = nodeStyle[styleName];
				hasStyle = true;
			} else if (defaultStyle && defaultStyle[styleName]) {
				computedStyle[styleName] = defaultStyle[styleName];
				hasStyle = true;
			}
		}
		if (nodeStyle.minZoom) {
			computedStyle.minZoom = nodeStyle.minZoom;
		} else if (defaultStyle && defaultStyle.minZoom) {
			computedStyle.minZoom = defaultStyle.minZoom;
			hasStyle = true;
		}
		if (nodeStyle.maxZoom) {
			computedStyle.maxZoom = nodeStyle.maxZoom;
		} else if (defaultStyle && defaultStyle.maxZoom) {
			computedStyle.maxZoom = defaultStyle.maxZoom;
			hasStyle = true;
		}
		if (nodeStyle.nonScalingOffset) {
			computedStyle.nonScalingOffset = nodeStyle.nonScalingOffset;
		} else if (defaultStyle && defaultStyle.nonScalingOffset) {
			// 2017.1.17 debug
			computedStyle.nonScalingOffset = defaultStyle.nonScalingOffset;
			hasStyle = true;
		}
		if (defaultStyle && defaultStyle.usedParent) {
			// use要素のためのhittest用情報・・・ 2017.1.17
			computedStyle.usedParent = defaultStyle.usedParent;
			hasStyle = true;
		}
		//console.log(svgNode.nodeName, computedStyle, nodeStyle);
		return computedStyle;
	}

	getNodeStyle(svgNode, hasHyperLink) {
		// getStyleの親スタイル継承部を分離した処理
		var hasUpdate = false;
		var style = {};
		style.fill = null; // Array.prototype.fill()があるので、バッティングしておかしいことがあり得る・・ 2016.12.1

		// "style"属性の値を取る
		var styleAtt = this.getStyleAttribute(svgNode);

		for (var i = 0; i < this.styleCatalog.length; i++) {
			var st = this.getStyleOf(this.styleCatalog[i], svgNode, styleAtt);
			if (st) {
				style[this.styleCatalog[i]] = st;
				hasUpdate = true;
			}
		}

		if (svgNode.getAttribute("visibleMinZoom")) {
			style.minZoom = Number(svgNode.getAttribute("visibleMinZoom")) / 100.0;
			hasUpdate = true;
		}
		if (svgNode.getAttribute("visibleMaxZoom")) {
			style.maxZoom = Number(svgNode.getAttribute("visibleMaxZoom")) / 100.0;
			hasUpdate = true;
		}

		style.hasUpdate = hasUpdate;

		if (hasHyperLink) {
			var hyperLink = svgNode.getAttribute("xlink:href");
			var hyperLinkTarget = svgNode.getAttribute("target");
			if (hyperLink) {
				style.hyperLink = hyperLink;
				style.target = hyperLinkTarget;
			}
		}

		const svgNodeTransfom = svgNode.getAttribute("transform");
		if (svgNodeTransfom) {
			// <g>の svgt1.2ベースのnon-scaling機能のオフセット値を"スタイル"として設定する・・ 2014.5.12
			if (svgNodeTransfom.indexOf("ref") >= 0) {
				style.nonScalingOffset =
					UtilFuncs.parseNonScalingOffset(svgNodeTransfom); // 2024/11/21 getNonScalingOffset使用を止めた
			}
		}
		return style;
	}

	getStyleAttribute(svgElement) {
		var styles = null;
		if (svgElement.getAttribute("style")) {
			styles = {};
			var stylesa = svgElement.getAttribute("style").split(";");
			if (stylesa) {
				for (var i = 0; i < stylesa.length; i++) {
					var style = stylesa[i].split(":");
					if (style && style.length > 1) {
						var name = UtilFuncs.trim(style[0]);
						var value = UtilFuncs.trim(style[1]);
						if (name == "fill" || name == "stroke") {
							if (value.length == 6 && value.match(/^[0-9A-F]/)) {
								value = "#" + value;
							}
						}
						styles[name] = value;
					}
				}
			}
		}
		return styles;
	}

	getStyleOf(styleName, svgElement, styleAtt) {
		var style;
		if (svgElement.getAttribute(styleName)) {
			style = svgElement.getAttribute(styleName);
		} else if (styleAtt && styleAtt[styleName]) {
			style = styleAtt[styleName];
		}
		return style;
	}

	static setCanvasStyle(style, context) {
		// var styleCatalog = new Array("stroke" , "stroke-width" , "stroke-linejoin" , "stroke-linecap" , "fill" , "fill-rule" , "fill-opacity" , "opacity" , "vector-effect");
		// http://www.html5.jp/canvas/ref/method/beginPath.html
		var ret = {
			fillStyle: null,
			strokeStyle: null,
		};

		if (style) {
			if (style["stroke"]) {
				if (style["stroke"] == "none") {
					context.strokeStyle = "rgba(0, 0, 0, 0)";
				} else {
					context.strokeStyle = style["stroke"];
					ret.strokeStyle = style.stroke;
				}
			} else {
				context.strokeStyle = "rgba(0, 0, 0, 0)";
			}
			if (style.fill) {
				if (style.fill == "none") {
					context.fillStyle = "rgba(0, 0, 0, 0)";
				} else {
					context.fillStyle = style.fill;
					ret.fillStyle = style.fill;
				}
			}
			if (style["stroke-width"]) {
				// 2014.2.26
				if (style["vector-effect"]) {
					if (style["stroke-width"]) {
						context.lineWidth = style["stroke-width"];
					} else {
						context.lineWidth = 0;
					}
				} else {
					// if none then set lw to 1 .... working
					context.lineWidth = 1;
				}
			} else {
				context.lineWidth = 0;
			}
			if (style["stroke-dasharray"]) {
				var dashList = style["stroke-dasharray"].split(/\s*[\s,]\s*/);
				context.setLineDash(dashList);
			}
			if (style["stroke-linejoin"]) {
				context.lineJoin = style["stroke-linejoin"];
			}
			if (style["stroke-linecap"]) {
				context.lineCap = style["stroke-linecap"];
			}
			if (style.opacity) {
				context.globalAlpha = style.opacity;
			}
			if (style["fill-opacity"]) {
				context.globalAlpha = style["fill-opacity"];
			}
		}
		return ret;
	}
}
export { SvgStyle };
