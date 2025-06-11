// Description:
// PathRenderer Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { UtilFuncs } from "./UtilFuncs.js";
import { SvgMapElementType } from "./SvgMapElementType.js";
import { SvgStyle } from "./SvgStyle.js";

class PathRenderer {
	#geometryCapturer;
	#matUtil;
	#mapTicker;
	#mapViewerProps;

	constructor(geometryCapturer, matUtil, mapTicker, mapViewerProps) {
		console.log("new PathRenderer");
		this.#geometryCapturer = geometryCapturer;
		this.#matUtil = matUtil;
		this.#mapTicker = mapTicker;
		this.#mapViewerProps = mapViewerProps;
	}

	defaultHilightStyle = {
		stroke: {
			color: "rgba(255,0,0,1)",
			widthIncrement: 6,
		},
		fill: {
			color: "rgba(255,0,0,1)",
			lineWidth: 6,
			lineColor: null,
		},
	};

	setDefaultHilightStyle(style) {
		if (typeof style !== "object") {
			return;
		}
		if (style.stroke) {
			if (typeof style.stroke.color == "string") {
				this.defaultHilightStyle.stroke.color = style.stroke.color;
			}
			if (typeof style.stroke.widthIncrement == "number") {
				this.defaultHilightStyle.stroke.widthIncrement =
					style.stroke.widthIncrement;
			}
		}
		if (style.fill) {
			if (typeof style.fill.color == "string") {
				this.defaultHilightStyle.fill.color = style.fill.color;
			}
			if (typeof style.fill.lineWidth == "number") {
				this.defaultHilightStyle.fill.lineWidth = style.fill.lineWidth;
			}
			if (typeof style.fill.lineColor == "string") {
				this.defaultHilightStyle.fill.lineColor = style.fill.lineColor;
			}
		}
		console.log("Set defaultHilightStyle:", this.defaultHilightStyle);
	}

	setSVGcirclePoints(
		pathNode,
		inCanvas,
		child2canvas,
		clickable,
		category,
		cStyle,
		GISgeometry
	) {
		var cx = Number(pathNode.getAttribute("cx"));
		var cy = Number(pathNode.getAttribute("cy"));

		var rx, ry;

		if (category == SvgMapElementType.CIRCLE) {
			rx = Number(pathNode.getAttribute("r"));
			ry = rx;
		} else {
			rx = Number(pathNode.getAttribute("rx"));
			ry = Number(pathNode.getAttribute("ry"));
		}

		if (GISgeometry) {
			GISgeometry.setPoint(cx, cy);
		}

		var repld =
			"M" +
			(cx - rx) +
			"," +
			cy +
			"A" +
			rx +
			"," +
			ry +
			" 0 0 1 " +
			(cx + rx) +
			"," +
			cy +
			"A" +
			rx +
			"," +
			ry +
			" 0 0 1 " +
			(cx - rx) +
			"," +
			cy +
			"z";

		var ret = this.setSVGpathPoints(
			pathNode,
			inCanvas,
			child2canvas,
			clickable,
			repld,
			cStyle,
			GISgeometry
		);
		if (cStyle.nonScalingOffset) {
			// non scaling circle support 2018.3.6
			ret.y -= ry;
			ret.height = ry * 2;
		} else {
			var csize = this.#matUtil.transform(rx, ry, child2canvas, true);
			ret.y -= csize.y;
			ret.height = csize.y * 2;
		}
		return ret;
	}

	setSVGrectPoints(
		pathNode,
		inCanvas,
		child2canvas,
		clickable,
		cStyle,
		GISgeometry
	) {
		var rx = Number(pathNode.getAttribute("x"));
		var ry = Number(pathNode.getAttribute("y"));
		var rw = Number(pathNode.getAttribute("width"));
		var rh = Number(pathNode.getAttribute("height"));

		if (
			GISgeometry &&
			!this.#geometryCapturer.GISgeometriesCaptureOptions.TreatRectAsPolygonFlag
		) {
			GISgeometry.setPoint(rx + rw / 2.0, ry + rh / 2.0);
		}

		var repld =
			"M" +
			rx +
			"," +
			ry +
			"L" +
			(rx + rw) +
			"," +
			ry +
			" " +
			(rx + rw) +
			"," +
			(ry + rh) +
			" " +
			rx +
			"," +
			(ry + rh) +
			"z";

		var ret = this.setSVGpathPoints(
			pathNode,
			inCanvas,
			child2canvas,
			clickable,
			repld,
			cStyle,
			GISgeometry
		);
		return ret;
	}

	setSVGpolyPoints(
		pathNode,
		inCanvas,
		child2canvas,
		clickable,
		nodeType,
		cStyle,
		GISgeometry
	) {
		var pp = pathNode.getAttribute("points");
		if (pp) {
			var points = pp.replace(/,/g, " ").split(" ");
			if (points.length > 3) {
				var repld = "M";

				for (var i = 0; i < points.length / 2; i++) {
					repld += points[i * 2] + "," + points[i * 2 + 1];
					if (i == 0) {
						repld += "L";
					} else {
						repld += " ";
					}
				}

				if (nodeType == SvgMapElementType.POLYGON) {
					repld += "Z";
				}

				var ret = this.setSVGpathPoints(
					pathNode,
					inCanvas,
					child2canvas,
					clickable,
					repld,
					cStyle,
					GISgeometry
				);
				return ret;
			}
		}
	}

	ssppRe0 = new RegExp(/,/gm);
	ssppRe1 = new RegExp(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm);
	ssppRe2 = new RegExp(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm);
	ssppRe3 = new RegExp(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm);
	ssppRe4 = new RegExp(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm);
	ssppRe5 = new RegExp(/([0-9])([+\-])/gm);
	ssppRe6 = new RegExp(/(\.[0-9]*)(\.)/gm);
	ssppRe7 = new RegExp(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm);

	setSVGpathPoints(
		pathNode,
		inCanvas,
		child2canvas,
		clickable,
		repld,
		cStyle,
		GISgeometry
	) {
		var vectorEffectOffset = cStyle.nonScalingOffset;
		var context = inCanvas.context;
		// this routine is based on canvg.js's path parser
		if (GISgeometry) {
			if (vectorEffectOffset) {
				// vectorEffectOffsetがあったら、それは全体で一個のPoint化
				GISgeometry.setPoint(vectorEffectOffset.x, vectorEffectOffset.y); // bug fix 2018.3.5
				if (
					this.#geometryCapturer.GISgeometriesCaptureOptions.SkipVectorRendering
				) {
					return {};
				}
			} else if (!GISgeometry.svgXY) {
				GISgeometry.makePath();
			}
		}

		var sret = SvgStyle.setCanvasStyle(cStyle, context);
		var canvasNonFillFlag = false;
		if (!sret.fillStyle) {
			canvasNonFillFlag = true;
		}
		var canvasNonStrokeFlag = false;
		if (!sret.strokeStyle) {
			canvasNonStrokeFlag = true;
		}

		var minx = 60000,
			maxx = -60000,
			miny = 60000,
			maxy = -60000;
		// 指定されたcanvas 2d contextに対して、svgのpathNodeを座標変換(child2canvas)して出力する
		var d;
		var altd = inCanvas.altdMap.get(pathNode); // 正規化済みpathをinCanvas.altdMapに投入しておく (TBD issue: dが変化した場合にobserveできていない2024/4/17)
		if (!altd) {
			if (repld) {
				d = repld;
			} else {
				d = pathNode.getAttribute("d"); // from canvg
			}
			if (!d) {
				d = "";
			}
			d = d.replace(this.ssppRe0, " "); // get rid of all commas
			d = d.replace(this.ssppRe1, "$1 $2"); // separate commands from commands
			d = d.replace(this.ssppRe2, "$1 $2"); // separate commands from commands
			d = d.replace(this.ssppRe3, "$1 $2"); // separate commands from points
			d = d.replace(this.ssppRe4, "$1 $2"); // separate commands from points
			d = d.replace(this.ssppRe5, "$1 $2"); // separate digits when no comma
			d = d.replace(this.ssppRe6, "$1 $2"); // separate digits when no comma
			d = d.replace(this.ssppRe7, "$1 $3 $4 "); // shorthand elliptical arc path syntax
			d = UtilFuncs.trim(UtilFuncs.compressSpaces(d)); // compress multiple spaces
			d = d.split(" "); // compress multiple spaces
			inCanvas.altdMap.set(pathNode, d);
		} else {
			d = altd;
		}

		var prevCommand = "M";
		var prevCont = false;
		var sx = 0,
			sy = 0;
		var mx = 0,
			my = 0;
		var startX = 0,
			startY = 0; // mx,myと似たようなものだがtransformかけてない・・・ 2016/12/1 debug
		var prevX = 0,
			prevY = 0;
		context.beginPath();
		var i = 0;
		var command = d[i];
		var cp;
		var closed = false;
		while (i < d.length) {
			if (cp) {
				prevX = cp.x;
				prevY = cp.y;
			}
			switch (command) {
				case "M":
					++i;
					sx = Number(d[i]);
					++i;
					sy = Number(d[i]);
					startX = sx;
					startY = sy;
					cp = this.#matUtil.transform(
						sx,
						sy,
						child2canvas,
						false,
						vectorEffectOffset
					);
					mx = cp.x;
					my = cp.y;
					//			hitPoint = getHitPoint(hitPoint, cp , true );
					context.moveTo(cp.x, cp.y);
					if (GISgeometry && !vectorEffectOffset) {
						GISgeometry.startSubPath(sx, sy);
					}
					command = "L"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
					break;
				case "m":
					++i;
					sx += Number(d[i]);
					++i;
					sy += Number(d[i]);
					startX = sx;
					startY = sy;
					cp = this.#matUtil.transform(
						sx,
						sy,
						child2canvas,
						false,
						vectorEffectOffset
					);
					mx = cp.x;
					my = cp.y;
					//			hitPoint = getHitPoint(hitPoint, cp , true );
					context.moveTo(cp.x, cp.y);
					if (GISgeometry && !vectorEffectOffset) {
						GISgeometry.startSubPath(sx, sy);
					}
					command = "l"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
					break;
				case "L":
					++i;
					sx = Number(d[i]);
					++i;
					sy = Number(d[i]);
					//			console.log("L",sx,sy);
					cp = this.#matUtil.transform(
						sx,
						sy,
						child2canvas,
						false,
						vectorEffectOffset
					);
					//			hitPoint = getHitPoint(hitPoint, cp);
					context.lineTo(cp.x, cp.y);
					if (GISgeometry && !vectorEffectOffset) {
						GISgeometry.addSubPathPoint(sx, sy);
					}
					break;
				case "l":
					++i;
					sx += Number(d[i]);
					++i;
					sy += Number(d[i]);
					cp = this.#matUtil.transform(
						sx,
						sy,
						child2canvas,
						false,
						vectorEffectOffset
					);
					//			hitPoint = getHitPoint(hitPoint, cp);
					context.lineTo(cp.x, cp.y);
					if (GISgeometry && !vectorEffectOffset) {
						GISgeometry.addSubPathPoint(sx, sy);
					}
					break;
				case "A": // non scaling が効いていない・・のをたぶん解消 2017.1.18
					var curr = { x: sx, y: sy };
					++i;
					var rx = Number(d[i]);
					++i;
					var ry = Number(d[i]);
					++i;
					var xAxisRotation = Number(d[i]);
					++i;
					var largeArcFlag = Number(d[i]);
					++i;
					var sweepFlag = Number(d[i]);
					++i;
					sx = Number(d[i]);
					++i;
					sy = Number(d[i]);

					cp = { x: sx, y: sy };
					var point = function (x, y) {
						return { x: x, y: y };
					}; // これはなぜあるのだろう・・・ 2022/05/24
					// Conversion from endpoint to center parameterization
					// http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
					// x1', y1' (in user coords)
					var currp;
					if (xAxisRotation == 0) {
						currp = { x: (curr.x - cp.x) / 2.0, y: (curr.y - cp.y) / 2.0 };
					} else {
						currp = {
							x:
								(Math.cos(xAxisRotation) * (curr.x - cp.x)) / 2.0 +
								(Math.sin(xAxisRotation) * (curr.y - cp.y)) / 2.0,
							y:
								(-Math.sin(xAxisRotation) * (curr.x - cp.x)) / 2.0 +
								(Math.cos(xAxisRotation) * (curr.y - cp.y)) / 2.0,
						};
					}
					// adjust radii

					var l =
						Math.pow(currp.x, 2) / Math.pow(rx, 2) +
						Math.pow(currp.y, 2) / Math.pow(ry, 2);
					if (l > 1) {
						rx *= Math.sqrt(l);
						ry *= Math.sqrt(l);
					}
					// cx', cy'
					var s =
						(largeArcFlag == sweepFlag ? -1 : 1) *
						Math.sqrt(
							(Math.pow(rx, 2) * Math.pow(ry, 2) -
								Math.pow(rx, 2) * Math.pow(currp.y, 2) -
								Math.pow(ry, 2) * Math.pow(currp.x, 2)) /
								(Math.pow(rx, 2) * Math.pow(currp.y, 2) +
									Math.pow(ry, 2) * Math.pow(currp.x, 2))
						);
					if (isNaN(s)) s = 0;
					var cpp = {
						x: (s * rx * currp.y) / ry,
						y: (s * -ry * currp.x) / rx,
					};

					// cx, cy
					var centp;
					if (xAxisRotation == 0) {
						centp = {
							x: (curr.x + cp.x) / 2.0 + cpp.x,
							y: (curr.y + cp.y) / 2.0 + cpp.y,
						};
					} else {
						centp = {
							x:
								(curr.x + cp.x) / 2.0 +
								Math.cos(xAxisRotation) * cpp.x -
								Math.sin(xAxisRotation) * cpp.y,
							y:
								(curr.y + cp.y) / 2.0 +
								Math.sin(xAxisRotation) * cpp.x +
								Math.cos(xAxisRotation) * cpp.y,
						};
					}

					// vector magnitude
					var m = function (v) {
						return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
					};
					// ratio between two vectors
					var r = function (u, v) {
						return (u[0] * v[0] + u[1] * v[1]) / (m(u) * m(v));
					};
					// angle between two vectors
					var a = function (u, v) {
						return (u[0] * v[1] < u[1] * v[0] ? -1 : 1) * Math.acos(r(u, v));
					};
					// initial angle
					var a1 = a([1, 0], [(currp.x - cpp.x) / rx, (currp.y - cpp.y) / ry]);
					// angle delta
					var u = [(currp.x - cpp.x) / rx, (currp.y - cpp.y) / ry];
					var v = [(-currp.x - cpp.x) / rx, (-currp.y - cpp.y) / ry];
					var ad = a(u, v);
					if (r(u, v) <= -1) ad = Math.PI;
					if (r(u, v) >= 1) ad = 0;

					var r = rx > ry ? rx : ry;
					var ssx = rx > ry ? 1 : rx / ry;
					var ssy = rx > ry ? ry / rx : 1;

					var tc = this.#matUtil.transform(
						centp.x,
						centp.y,
						child2canvas,
						false,
						vectorEffectOffset
					); // こっちはvectoreffect効いている
					var tsc;
					if (vectorEffectOffset) {
						// 2017.1.17 non scaling 対応
						tsc = { x: ssx, y: ssy };
					} else {
						tsc = this.#matUtil.transform(ssx, ssy, child2canvas, true); // スケール計算 これがVE fixed size効いていない
					}

					context.translate(tc.x, tc.y);
					if (xAxisRotation == 0 && tsc.x == 1 && tsc.y == 1) {
						context.arc(0, 0, r, a1, a1 + ad, 1 - sweepFlag);
					} else {
						context.rotate(xAxisRotation);
						context.scale(tsc.x, tsc.y);
						context.arc(0, 0, r, a1, a1 + ad, 1 - sweepFlag);
						context.scale(1 / tsc.x, 1 / tsc.y);
						context.rotate(-xAxisRotation);
					}
					context.translate(-tc.x, -tc.y);
					cp = this.#matUtil.transform(
						sx,
						sy,
						child2canvas,
						false,
						vectorEffectOffset
					);
					break;
				case "Z":
				case "z":
					context.closePath();
					//			hitPoint = getHitPoint(hitPoint, cp);
					closed = true;
					sx = startX; // debug 2016.12.1
					sy = startY;
					if (GISgeometry && !vectorEffectOffset) {
						GISgeometry.addSubPathPoint(sx, sy);
					}
					break;
				default:
					//			hitPoint = getHitPoint(hitPoint, cp);
					prevCont = true;
					break;
			}
			if (cp) {
				if (cp.x < minx) {
					minx = cp.x;
				}
				if (cp.x > maxx) {
					maxx = cp.x;
				}
				if (cp.y < miny) {
					miny = cp.y;
				}
				if (cp.y > maxy) {
					maxy = cp.y;
				}
			}

			if (!prevCont) {
				prevCommand = command;
				++i;
				command = d[i];
			} else {
				command = prevCommand;
				prevCont = false;
				--i;
			}
		}
		if (!canvasNonFillFlag) {
			context.fill();
		}
		if (!canvasNonStrokeFlag) {
			context.stroke();
		}
		var hitted = false;

		if (
			clickable &&
			!canvasNonFillFlag &&
			(this.#mapTicker.pathHitTester.enable ||
				this.#mapTicker.pathHitTester.centralGetter)
		) {
			// ヒットテスト要求時の面の場合　且つ　面検索
			if (
				context.isPointInPath(
					this.#mapTicker.pathHitTester.x,
					this.#mapTicker.pathHitTester.y
				) ||
				context.isPointInStroke(
					this.#mapTicker.pathHitTester.x,
					this.#mapTicker.pathHitTester.y
				)
			) {
				// テストしヒットしてたら目立たせる isPointInStrokeも実施してみる
				hitted = true;

				var hilightFillStyle;
				if (clickable.hilightFillStyle) {
					if (
						clickable.hilightFillStyle.color &&
						clickable.hilightFillStyle.lineWidth
					) {
						hilightFillStyle = clickable.hilightFillStyle;
					}
				} else {
					hilightFillStyle = this.defaultHilightStyle.fill;
				}
				if (hilightFillStyle) {
					var pathWidth = context.lineWidth;
					context.lineWidth = hilightFillStyle.lineWidth;
					var pathStyle = context.fillStyle;
					context.fillStyle = hilightFillStyle.color;
					context.fill();
					var pathColor = context.strokeStyle;
					if (hilightFillStyle.lineColor) {
						context.strokeStyle = hilightFillStyle.lineColor;
					}
					context.stroke();
					context.fillStyle = pathStyle;
					context.lineWidth = pathWidth;
					context.strokeStyle = pathColor;
				}
			}
		}

		if (clickable && canvasNonFillFlag) {
			var tmpLineWidth = context.lineWidth;
			var tmpStrokeStyle = context.strokeStyle;
			if (context.lineWidth < 6) {
				// 細すぎる線はヒットテスト用のダミー太線を隠して配置する 6pxは決め打値
				context.lineWidth = 6;
				context.strokeStyle = "rgba(0,0,0,0)"; // hittestにalphaは関係ないので隠せる
				context.stroke();
			}

			if (
				this.#mapTicker.pathHitTester.enable ||
				this.#mapTicker.pathHitTester.centralGetter
			) {
				// ヒットテスト要求時の線検索
				if (
					context.isPointInStroke(
						this.#mapTicker.pathHitTester.x,
						this.#mapTicker.pathHitTester.y
					)
				) {
					// テストしヒットしてたら目立たせる isPointInStrokeに変更し線上なら」どこでもヒット可能にしてみる
					hitted = true;

					var hilightStrokeStyle;
					if (clickable.hilightStrokeStyle) {
						if (
							clickable.hilightStrokeStyle.color &&
							clickable.hilightStrokeStyle.widthIncrement
						) {
							hilightStrokeStyle = clickable.hilightStrokeStyle;
						}
					} else {
						hilightStrokeStyle = this.defaultHilightStyle.stroke;
					}
					if (hilightStrokeStyle) {
						context.lineWidth =
							tmpLineWidth + hilightStrokeStyle.widthIncrement;
						context.strokeStyle = hilightStrokeStyle.color;
						context.stroke();
					}
				}
			}
			context.lineWidth = tmpLineWidth;
			context.strokeStyle = tmpStrokeStyle;
		}

		var endX,
			endY,
			endCos = 0,
			endSin = 0;

		if (closed) {
			endX = mx;
			endY = my;
		} else {
			endX = cp.x;
			endY = cp.y;
		}

		var vabs = Math.sqrt(
			(endX - prevX) * (endX - prevX) + (endY - prevY) * (endY - prevY)
		);
		if (vabs) {
			endCos = (endX - prevX) / vabs;
			endSin = (endY - prevY) / vabs;
		}

		return {
			hitted: hitted,
			x: minx,
			y: miny,
			width: maxx - minx,
			height: maxy - miny,
			endX: endX,
			endY: endY,
			endCos: endCos,
			endSin: endSin,
		};
	}
}

export { PathRenderer };
