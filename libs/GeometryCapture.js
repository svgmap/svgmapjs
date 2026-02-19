// Description:
// svgMap.js coreの、captureGISgeometries関連機能を切り分けたクラス
//
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

//
// 2022/08/18～
//
// 2023/11/21 GISgeometriesCaptureOptions.captureAlsoAsBitImage : ベクタデータのラスタイメージも追加で取得するオプション(実装中)

import { MatrixUtil } from "./TransformLib.js";
import { SvgMapElementType } from "./SvgMapElementType.js";

class GeometryCapture {
	#svgMapObj;
	#matUtil;
	#getImageURL;
	#docDir;

	constructor(svMapObj, getImageURLfunc) {
		this.#svgMapObj = svMapObj;
		this.#matUtil = new MatrixUtil();
		this.#getImageURL = getImageURLfunc;
		this.#GISgeometries = new Object();
	}

	GISgeometriesCaptureFlag = false; // for GIS 2016.12.1
	GISgeometriesCaptureOptions = {
		// for GIS 2021.9.16
		BitImageGeometriesCaptureFlag: false,
		TreatRectAsPolygonFlag: false,
		SkipVectorRendering: false, // 2021.9.16 描画しなくてもベクタはgeomが取得できるので高速化を図れる canvasレンダリングだけでなく、POIのimg生成もやめるようにしたい
		// dummy2DContext : this.dummy2DContextBuilder(), // 関数で直接公開するようにした
		captureAlsoAsBitImage: false, // 2023/11/21 レイヤ単位でベクタをビットイメージとして(も)キャプチャする(SkipVectorRenderingが優先)
	};

	#GISgeometries;
	#cgstat;
	#printCGET() {
		console.log("CGET:", new Date().getTime() - this.#cgstat);
	}
	captureGISgeometries(
		cbFunc,
		prop1,
		prop2,
		prop3,
		prop4,
		prop5,
		prop6,
		prop7,
	) {
		// 非同期、callbackFuncいるだろうね
		if (this.GISgeometriesCaptureFlag) {
			// 2019/12/24 排他制御
			console.log("Now processing another captureGISgeometries. Try later.");
			cbFunc(false);
			return false;
		}
		this.#cgstat = new Date().getTime();
		this.GISgeometriesCaptureFlag = true;
		// delete GISgeometries;
		this.#GISgeometries = new Object();
		// 仕様変更により、viewbox変化ないケースのイベントがscreenRefreshedに変更 2017.3.16
		var cgf = function () {
			document.removeEventListener("screenRefreshed", cgf, false);
			console.log("screenRefreshed start prepare Geom");
			this.#printCGET();
			this.#prepareGISgeometries(
				cbFunc,
				prop1,
				prop2,
				prop3,
				prop4,
				prop5,
				prop6,
				prop7,
			);
		}.bind(this);
		document.addEventListener("screenRefreshed", cgf, false);
		console.log("Start capture geom");
		this.#svgMapObj.refreshScreen();
	}

	#prepareGISgeometries(
		cbFunc,
		prop1,
		prop2,
		prop3,
		prop4,
		prop5,
		prop6,
		prop7,
	) {
		//	DEBUG 2017.6.12 geojsonの座標並びが逆だった・・・
		var svgImagesProps = this.#svgMapObj.getSvgImagesProps();
		for (var docId in this.#GISgeometries) {
			var layerGeoms = this.#GISgeometries[docId];
			if (layerGeoms.length > 0) {
				var crs = svgImagesProps[docId].CRS;

				var invCrs = this.#matUtil.getInverseMatrix(crs);

				var geoCrd, geoCrd2;
				for (var i = 0; i < layerGeoms.length; i++) {
					var geom = layerGeoms[i];
					if (geom.type === "Point") {
						geoCrd = this.#matUtil.SVG2Geo(
							geom.svgXY[0],
							geom.svgXY[1],
							null,
							invCrs,
						);
						geom.coordinates = [geoCrd.lng, geoCrd.lat];
					} else if (geom.type === "Coverage") {
						geom.coordinates = new Array();
						if (
							!geom.transform ||
							(geom.transform && geom.transform.b == 0 && geom.transform.c == 0)
						) {
							if (!geom.transform) {
								geoCrd = this.#matUtil.SVG2Geo(
									geom.svgXY[0][0],
									geom.svgXY[0][1],
									null,
									invCrs,
								);
								geoCrd2 = this.#matUtil.SVG2Geo(
									geom.svgXY[1][0],
									geom.svgXY[1][1],
									null,
									invCrs,
								);
							} else {
								// transform 一時対応（回転成分がないケースのみ）2019.5.16
								var sxy = this.#matUtil.transform(
									geom.svgXY[0][0],
									geom.svgXY[0][1],
									geom.transform,
								);
								var sxy2 = this.#matUtil.transform(
									geom.svgXY[1][0],
									geom.svgXY[1][1],
									geom.transform,
								);
								geoCrd = this.#matUtil.SVG2Geo(sxy.x, sxy.y, null, invCrs);
								geoCrd2 = this.#matUtil.SVG2Geo(sxy2.x, sxy2.y, null, invCrs);
							}
							geom.coordinates.push({
								lat: Math.min(geoCrd.lat, geoCrd2.lat),
								lng: Math.min(geoCrd.lng, geoCrd2.lng),
							});
							geom.coordinates.push({
								lat: Math.max(geoCrd.lat, geoCrd2.lat),
								lng: Math.max(geoCrd.lng, geoCrd2.lng),
							});
							delete geom.transform; // TBDです・・・
						} else {
							// 非対角成分transform
							geom.coordinates.push({
								x: geom.svgXY[0][0],
								y: geom.svgXY[0][1],
							});
							geom.coordinates.push({
								x: geom.svgXY[1][0],
								y: geom.svgXY[1][1],
							});
							var geoTf = this.#matUtil.matMul(geom.transform, invCrs);
							geom.transform = geoTf;
						}
					} else {
						geom.coordinates = new Array();
						if (geom.svgXY.length == 1 && geom.svgXY[0].length == 1) {
							// Vector EffectのPolygonなどはPointにこの時点で変換する。
							geoCrd = this.#matUtil.SVG2Geo(
								geom.svgXY[0][0][0],
								geom.svgXY[0][0][1],
								null,
								invCrs,
							);
							geom.coordinates = [geoCrd.lng, geoCrd.lat];
							geom.type = "Point";
						} else {
							for (var j = 0; j < geom.svgXY.length; j++) {
								var subP = geom.svgXY[j];
								var wgSubP = new Array();
								var startP;
								if (
									(geom.type === "Polygon" && subP.length > 2) ||
									(geom.type === "MultiLineString" && subP.length > 1)
								) {
									// 面の場合３点以上、　線の場合は２点以上が必須でしょう
									for (var k = 0; k < subP.length; k++) {
										var point = subP[k];
										geoCrd = this.#matUtil.SVG2Geo(
											point[0],
											point[1],
											null,
											invCrs,
										);
										if (k == 0) {
											var startP = geoCrd;
										}
										wgSubP.push([geoCrd.lng, geoCrd.lat]);
									}
									if (
										geom.type === "Polygon" &&
										(startP.lat != geoCrd.lat || startP.lng != geoCrd.lng)
									) {
										wgSubP.push([startP.lng, startP.lat]);
									}
									geom.coordinates.push(wgSubP);
								}
							}
						}
					}
					delete geom.svgXY;
				}
			}
		}
		this.GISgeometriesCaptureFlag = false;

		if (this.GISgeometriesCaptureOptions.captureAlsoAsBitImage) {
			// 2023/11/21 ベクタデータのラスタイメージも追加で取得するオプション(実装中)
			this.#addLayerImages(this.#GISgeometries);
		}

		cbFunc(
			this.#GISgeometries,
			prop1,
			prop2,
			prop3,
			prop4,
			prop5,
			prop6,
			prop7,
		);
	}

	prepareDocGeometries(docId) {
		// svg文書ツリーの再帰パーサなので、同じ文書が何度もparseSVGを通るので!GISgeometries[docId] の条件必要
		if (!this.#GISgeometries[docId]) {
			this.#GISgeometries[docId] = new Array();
		}
	}

	removeDocGeometries(docId) {
		delete this.#GISgeometries[docId];
	}

	addGeometry(docId, GISgeometry, imgElem, docDir) {
		if (GISgeometry.href) {
			// 2018/2/27 debug
			// console.log("addGeometry0 setCoverage:", GISgeometry,imgElem,imgElem.naturalHeight);

			GISgeometry.href = this.#getImageURL(GISgeometry.href, docDir);
			if (
				(imgElem && imgElem.naturalHeight > 0) ||
				GISgeometry.href.indexOf("data:") == 0 ||
				GISgeometry.href.indexOf("blob:") == 0
			) {
				// ロードできてないイメージは外す。 cesiumのimageryではerr404imgで動作が停止する・・　何とかしてよねぇ‥
				// ただし、ロード済みでないとこの値はセットされないので・・　ロード中にgisgeomを呼ぶパターンでは使えないはず・・ 2018.2.27
				// dataURLの場合は、データは実存するにもかかわらずnaturalHeightの設定が遅延するので・・・なんか、こういう話じゃなかも・・(これだと本当にロードが遅延してるdataURLじゃないコンテンツの場合にどうするかがわからない感じもするが・) 2019/12/26
				this.#GISgeometries[docId].push(GISgeometry);
			}
		} else {
			this.#GISgeometries[docId].push(GISgeometry);
		}
	}

	dummy2DContextBuilder() {
		// ダミーのCanvas2D contextを作る getterはなにも返ってこないが・・
		// for SkipVectorRendering
		var funcs = [
			"clearRect",
			"fillRect",
			"strokeRect",
			"fillText",
			"strokeText",
			"measureText",
			"getLineDash",
			"setLineDash",
			"createLinearGradient",
			"createRadialGradient",
			"createPattern",
			"beginPath",
			"closePath",
			"moveTo",
			"lineTo",
			"bezierCurveTo",
			"quadraticCurveTo",
			"arc",
			"arcTo",
			"ellipse",
			"rect",
			"fill",
			"stroke",
			"drawFocusIfNeeded",
			"scrollPathIntoView",
			"clip",
			"isPointInPath",
			"isPointInStroke",
			"rotate",
			"scale",
			"translate",
			"transform",
			"setTransform",
			"resetTransform",
			"drawImage",
			"createImageData",
			"getImageData",
			"putImageData",
			"save",
			"restore",
			"addHitRegion",
			"removeHitRegion",
			"clearHitRegions",
		];
		var ret = {};
		for (var fn of funcs) {
			ret[fn] = function () {};
		}
		return ret;
	}

	#addLayerImages(GISgeometries) {
		// clickableで実行すると、ベクタ画像は、画面中心が勝手にハイライトするかも。これはまずい。(TBD)
		var layerCanvases = this.getLayerCanvases(GISgeometries);
		var rootSip = this.#svgMapObj.getSvgImagesProps()["root"];
		var gvb = svgMap.getGeoViewBox();
		console.log(
			"layerCanvases:",
			layerCanvases,
			" root SvgImagesProps:",
			rootSip,
		);
		for (var layerId in layerCanvases) {
			var imgUri = layerCanvases[layerId].toDataURL("image/png");
			console.log("imgUri:", layerId, " url:", imgUri);
			var layerImageGeom = this.#getLayerImageGeom(imgUri, gvb, rootSip.CRS);
			GISgeometries[layerId] = GISgeometries[layerId].concat(layerImageGeom);
		}
	}

	#getLayerImageGeom(imgUri, gvb, CRS) {
		var hasNonlinearTransformation = false;
		if (CRS.transform) {
			// 緯度経度と画像との関係がノンリニアの場合には、非線形が無視できる程度に画像を分割する処理を導入するべき(TBD) 2023/11/21
			hasNonlinearTransformation = true;
			// splitImage();
		}
		var dummyElm = document.createElement("span");
		dummyElm.setAttribute("iid", "layerCanvasImage");
		var covGeom = {
			type: "Coverage",
			coordinates: [
				{ lat: gvb.y, lng: gvb.x },
				{ lat: gvb.y + gvb.height, lng: gvb.x + gvb.width },
			],
			href: imgUri,
			layerCanvasImage: true,
			src: dummyElm,
		};

		var ans = [covGeom];
		return ans;
	}

	splitImage = async function (sourceImageURL) {
		// 非線形の画像については、n x nに分割して非線形の歪みを無視できるようにする
		// n x n 分割については、画像の非線形変換でも同種の考えを取り入れて高速化したいが・・
		var n = 4;
		var img = await this.getImage(sourceImageURL);
		var subWidth = Math.ceil(img.naturalWidth / n);
		var subHeight = Math.ceil(img.naturalHeight / n);

		var canvas = document.createElement("canvas");
		canvas.width = subWidth;
		canvas.height = subHeight;
		var ctx = canvas.getContext("2d");
		var ret = [];
		for (var ty = 0; ty < n; ++ty) {
			var row = [];
			for (var tx = 0; tx < n; ++tx) {
				ctx.clearRect(0, 0, subWidth, subHeight);
				ctx.drawImage(
					img,
					tx * subWidth,
					ty * subHeight,
					subWidth,
					subHeight,
					0,
					0,
					subWidth,
					subHeight,
				);
				row.push(canvas.toDataURL());
			}
			ret.push(row);
		}
		return ret;
	};

	getImage(srcUrl) {
		return new Promise(function (okCb) {
			var img = new Image();
			img.src = srcUrl;
			img.onload = function () {
				okCb(img);
			};
		});
	}

	getLayerCanvases(GISgeometries) {
		var ans = {};
		for (var docId in GISgeometries) {
			var canvas = document.getElementById(docId + "_canvas");
			if (canvas) {
				ans[docId] = canvas;
			}
		}
		return ans;
	}
}

class SVGMapGISgeometry {
	type;

	svgXY;

	src;

	// 以下はある場合とない場合がある・・
	//	usedParent;
	//	transform;

	// 生成不要のケースがあるので、ファクトリメソッドを作る
	// https://stackoverflow.com/questions/8618722/how-to-return-null-from-a-constructor-called-with-new-in-javascript
	static createSVGMapGISgeometry(
		cat,
		subCat,
		svgNode,
		GISgeometriesCaptureOptions,
	) {
		if (cat == SvgMapElementType.EMBEDSVG) {
			console.log("return null for GISGeometry");
			return null;
		} else if (
			cat == SvgMapElementType.BITIMAGE &&
			!GISgeometriesCaptureOptions.BitImageGeometriesCaptureFlag
		) {
			console.log("return null for GISGeometry");
			return null;
		} else {
			return new SVGMapGISgeometry(
				cat,
				subCat,
				svgNode,
				GISgeometriesCaptureOptions,
			);
		}
	}

	// added 2016.12.1 for GIS ext.
	constructor(cat, subCat, svgNode, GISgeometriesCaptureOptions) {
		switch (cat) {
			case SvgMapElementType.EMBEDSVG:
				// nothing
				break;
			case SvgMapElementType.BITIMAGE:
				if (GISgeometriesCaptureOptions.BitImageGeometriesCaptureFlag) {
					this.type = "Coverage";
				}
				break;
			case SvgMapElementType.POI:
				this.type = "Point";
				break;
			case SvgMapElementType.VECTOR2D:
				switch (subCat) {
					case SvgMapElementType.PATH:
						this.type = "TBD"; // 最初に決めきれない　あとで　determineTypeで決定するケース
						break;
					case SvgMapElementType.POLYLINE:
						this.type = "MultiLineString";
						break;
					case SvgMapElementType.POLYGON:
						this.type = "Polygon";
						break;
					case SvgMapElementType.RECT:
						if (GISgeometriesCaptureOptions.TreatRectAsPolygonFlag) {
							this.type = "Polygon";
						} else {
							this.type = "Point";
						}
						break;
					case SvgMapElementType.CIRCLE:
						this.type = "Point";
						break;
					case SvgMapElementType.ELLIPSE:
						this.type = "Point";
						break;
				}
				break;
		}
		if (this.type) {
			this.src = svgNode;
		}
	}

	// 以下の関数は、元のSVGMap.jsではインライン展開されているルーチン
	// if ( GISgeometry )...内を抜き出して関数化

	determineType(cStyle) {
		if (this.type === "TBD") {
			// 2016.12.1 for GIS: TBD要素は塗りがあるならPolygonにする
			if (cStyle["fill"] && cStyle["fill"] != "none") {
				this.type = "Polygon";
			} else {
				this.type = "MultiLineString";
			}
		}
		if (cStyle.usedParent) {
			// 2018.3.5 useによって2D Vectorを使用した場合、そのuse要素の値が欲しいでしょう
			this.usedParent = cStyle.usedParent;
			this.type = "Point"; // transform(svg,,)のときのみの気はするが・・
		}
	}

	// 以下の座標は、SVGコンテンツのローカル座標。最終的に地理座標への変換が必要
	setCoverage(x, y, width, height, transform, href) {
		// transformのあるものはまだうまく処理できてないです・・　まぁこの最初のユースケースのcesiumでも非対角ありtransformのあるイメージはうまく処理できないので・・
		// さらに、 nonScalingはPOIとして処理して良いと思うが・・ 2018.3.2 まず、parse*側でnonScalingなimageをPOIに改修
		this.svgXY = [];
		this.svgXY[0] = [x, y];
		this.svgXY[1] = [x + width, y + height];
		this.transform = transform;
		this.href = href;
	}

	setPoint(x, y) {
		this.svgXY = [x, y];
	}

	makePath() {
		this.svgXY = new Array(); // PolygonもMultiLineStringもsvgXYに[[x,y],[x,y],[x,y]],[[x,y],[x,y],[x,y]]というのが入る ただし、vectorEffectOffsetがあったら、それは全体で一個のPoint化するので注意
	}

	startSubPath(sx, sy) {
		var svgP = [sx, sy];
		var svgPs = [svgP];
		this.svgXY.push(svgPs);
	}

	addSubPathPoint(sx, sy) {
		var svgP = [sx, sy];
		var thisPs = this.svgXY[this.svgXY.length - 1];
		thisPs.push(svgP);
	}
}

export { GeometryCapture, SVGMapGISgeometry };
