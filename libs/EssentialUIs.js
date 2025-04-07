// Description:
// EssentialUIs Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { UtilFuncs } from "./UtilFuncs.js";

class EssentialUIs {
	#svgMapObj;
	#zoomPanManager;
	#mapTicker;
	#matUtil;
	#hideAllTileImgs;
	#getRootSvg2Canvas;

	#mapViewerProps;

	#customLayersPath = null; // 2024/8/5
	initialCustomLayers = null;

	rootSVGpath = null; // 一応保存しておきます(2024/8/5)
	// 以下はもっと洗練すべきメンバ
	//#mapCanvasSize;
	//#mapCanvas;
	//#rootCrs;
	//#root2Geo;
	//#rootViewBox;
	//#uaProps;

	geoViewBox = { x: 0, y: 0, width: 1, height: 1 }; // と、それを使って出したgeoのviewBox
	ignoreMapAspect = false; // 地図のアスペクト比を、rootSVGのvireBox( or hashのviewBox)そのものにする場合true

	constructor(
		svgMapObj,
		mapViewerProps,
		zoomPanManager,
		mapTicker,
		matUtil,
		hideAllTileImgs,
		getRootSvg2Canvas
	) {
		this.#svgMapObj = svgMapObj;
		this.#mapViewerProps = mapViewerProps;
		this.#zoomPanManager = zoomPanManager;
		this.#mapTicker = mapTicker;
		this.#matUtil = matUtil;
		this.#hideAllTileImgs = hideAllTileImgs;
		this.#getRootSvg2Canvas = getRootSvg2Canvas;
		this.#wheelZooming = 0;
	}

	#centerPos;
	#vScale; // 中心緯度経度表示用font要素
	#spButtonSize = 50;

	/**
	 *
	 * @returns {String|null} Container.svgのPathが返る
	 */
	initMapCanvas() {
		//		this.#mapViewerProps.mapCanvas=document.getElementById("mapcanvas");
		var mapCanvas = document.getElementById("mapcanvas");
		if (!mapCanvas) {
			console.warn("NO id:mapcanvas div exit..");
			return null; // 本来はExcetionを吐くのが正解では？
		}

		// 2023/05/24 zoom-out UI を改善するため、全画面mapcanvasのラッパーを仕掛ける
		var childMapCanvas = document.createElement("div");
		mapCanvas.setAttribute("id", "mapCanvasWrapper");
		for (var mcatr of mapCanvas.attributes) {
			if (mcatr.name == "id") {
				childMapCanvas.setAttribute("id", "mapcanvas");
			} else if (mcatr.name == "title") {
				// skip
			} else {
				childMapCanvas.setAttribute(mcatr.name, mcatr.value);
			}
		}
		mapCanvas.appendChild(childMapCanvas);
		mapCanvas.setAttribute(
			"style",
			"position: absolute; overflow: hidden; top: 0px; left: 0px; width: 100%; height: 100%;"
		);
		this.#mapViewerProps.mapCanvas = childMapCanvas;
		this.#mapViewerProps.mapCanvasWrapper = mapCanvas;

		var rootSVGpath;
		if (mapCanvas.dataset.src) {
			// data-src属性に読み込むべきSVGの相対リンクがある 2017.3.6
			rootSVGpath = mapCanvas.dataset.src;
		} else if (mapCanvas.title) {
			// title属性に読み込むべきSVGの相対リンクがあると仮定(微妙な・・) 最初期からの仕様
			rootSVGpath = mapCanvas.title;
		} else {
			console.warn("NO id:mapcanvas data-src for root svg container exit..");
			return null;
		}

		// 2024/8/5 add data-custom-layers-root
		if (mapCanvas.dataset.customLayersRoot) {
			var customLayersRootPath = mapCanvas.dataset.customLayersRoot;
			var lhash = location.href.substring(location.href.indexOf("#"));
			var lh = UtilFuncs.getUrlHash(lhash);
			if (lh && customLayersRootPath) {
				var clp;
				if (lh.customLayers) {
					clp = lh.customLayers;
				} else if (lh.customlayers) {
					clp = lh.customlayers;
				}
				if (clp) {
					this.#customLayersPath = new URL(
						clp,
						new URL(customLayersRootPath, location)
					).href;
				}
			} else if (
				customLayersRootPath &&
				customLayersRootPath.endsWith(".json")
			) {
				// hash customLayersがなくて、customLayersRootプロパティだけあり、.jsonとなっている場合
				this.#customLayersPath = new URL(customLayersRootPath, location).href;
			}
			console.log(
				"Found customLayersRoot Property:",
				customLayersRootPath,
				"  customLayersPath:",
				this.#customLayersPath
			);
		}

		return rootSVGpath;
	}

	prepareInitialCustomLayers = async function () {
		// 2024/08/05 customLayers設定ファイルの読み込み
		if (this.#customLayersPath) {
			try {
				this.initialCustomLayers = await (
					await fetch(this.#customLayersPath)
				).json();
				console.log(
					"customLayersPath:",
					this.#customLayersPath,
					" initialCustomLayers:",
					this.initialCustomLayers
				);
			} catch (e) {
				console.warn("can't load customLayers json", e);
			}
		}
		return this.initialCustomLayers;
	};

	setLayerListSize() {
		var llElem = document.getElementById("layerList");
		// id:layerList 要素はwidthが"px"で指定されていなければならない・・　とりあえず
		var llElemSize = llElem.style.width;
		if (!llElemSize || llElemSize.indexOf("px") < 0) {
			llElem.style.width =
				this.#mapViewerProps.mapCanvasSize.width * 0.5 -
				this.#spButtonSize -
				5 +
				"px";
			llElemSize = llElem.style.width;
		}
		llElemSize = Number(llElemSize.substring(0, llElemSize.indexOf("px")));
		if (!llElem.dataset.originalSize) {
			llElem.dataset.originalSize = llElemSize;
		}
		if (
			this.#spButtonSize + 5 + Number(llElem.dataset.originalSize) >
			this.#mapViewerProps.mapCanvasSize.width
		) {
			var modSize =
				this.#mapViewerProps.mapCanvasSize.width - (this.#spButtonSize + 7);
			llElem.style.width = modSize + "px";
		} else {
			llElem.style.width = llElem.dataset.originalSize + "px";
		}
	}

	initNavigationUIs(isSP) {
		// 2017.8.15 Add scroll bar on iOS safari scrollable elements :: なぜかinsertRuleはerrorで動かない・・
		// see https://stackoverflow.com/questions/3845445/how-to-get-the-scroll-bar-with-css-overflow-on-ios
		var stylesheet = document.createElement("style");
		stylesheet.innerHTML =
			"::-webkit-scrollbar{-webkit-appearance:none;width:7px;}::-webkit-scrollbar-thumb{border-radius:4px;background-color:rgba(0,0,0,.5);-webkit-box-shadow: 0 0 1px rgba(255,255,255,.5);}";
		document.documentElement.appendChild(stylesheet);

		// 2017.8.15 iPhone Safari landscape mode issue fix
		// see: https://stackoverflow.com/questions/33039537/ios9-mobile-safari-landscape-css-bug-with-positionabsolute-bottom0
		var htmlStyle = document.documentElement.style;
		htmlStyle.position = "fixed";
		htmlStyle.width = "100%";
		htmlStyle.height = "100%";
		htmlStyle.overflow = "hidden";

		var zub = document.getElementById("zoomupButton");
		var zdb = document.getElementById("zoomdownButton");
		var gpsb = document.getElementById("gpsButton");
		var llElem = document.getElementById("layerList");
		var customBtns = document.getElementsByClassName("customButton");
		if (isSP) {
			var topCrd = 0;
			if (zub) {
				zub.width = this.#spButtonSize;
				zub.height = this.#spButtonSize;
				zub.style.top = topCrd + "px";
				topCrd += this.#spButtonSize + 5;
			}

			if (zdb) {
				zdb.width = this.#spButtonSize;
				zdb.height = this.#spButtonSize;
				zdb.style.top = topCrd + "px";
				topCrd += this.#spButtonSize + 5;
			}

			if (gpsb) {
				gpsb.width = this.#spButtonSize;
				gpsb.height = this.#spButtonSize;
				gpsb.style.top = topCrd + "px";
				topCrd += this.#spButtonSize + 5;
			}

			if (customBtns) {
				for (var i = 0; i < customBtns.length; i++) {
					customBtns[i].width = this.#spButtonSize;
					customBtns[i].height = this.#spButtonSize;
					customBtns[i].style.top = topCrd + "px";
					topCrd += this.#spButtonSize + 5;
				}
			}

			if (topCrd > 0 && llElem) {
				// いずれかのボタンがある場合(topCrd>0)はレイヤUIをボタン横に移動
				llElem.style.left = this.#spButtonSize + 5 + "px";
			}
		}
		if (llElem) {
			this.setLayerListSize();
		}
		if (zub) {
			zub.style.cursor = "pointer";
		}
		if (zdb) {
			zdb.style.cursor = "pointer";
		}
		if (gpsb) {
			gpsb.style.cursor = "pointer";
		}
		if (customBtns) {
			for (var i = 0; i < customBtns.length; i++) {
				customBtns[i].style.cursor = "pointer";
			}
		}
	}

	setPointerEvents() {
		if (this.#mapViewerProps.uaProps.verIE > 8) {
			UtilFuncs.addEvent(document, "contextmenu", function (e) {
				e.preventDefault();
			});
			UtilFuncs.addEvent(
				this.#mapViewerProps.mapCanvas,
				"click",
				function (e) {
					e.preventDefault();
				},
				false
			);
			UtilFuncs.addEvent(
				this.#mapViewerProps.mapCanvas,
				"mousedown",
				function (e) {
					e.preventDefault();
				},
				false
			);
		}
		var that = this;
		if (this.#mapViewerProps.uaProps.verIE > 8) {
			// !isIEから変更（たぶんもう不要？ 2014.6.29)
			if (true) {
				// タッチパネルデバイスの場合(POIが選べない・・2013/4/4)
				// タッチイベント
				var mc = this.#mapViewerProps.mapCanvasWrapper;

				UtilFuncs.addEvent(mc, "touchstart", function (e) {
					// 2014/06/03
					e.preventDefault();
				});
				UtilFuncs.addEvent(mc, "touchend", function (e) {
					e.preventDefault();
				});
				UtilFuncs.addEvent(mc, "touchmove", function (e) {
					e.preventDefault();
				});

				UtilFuncs.addEvent(mc, "touchstart", function (event) {
					that.#zoomPanManager.startPan(event);
				});
				UtilFuncs.addEvent(mc, "touchend", function (event) {
					that.#zoomPanManager.endPan(event);
				});
				UtilFuncs.addEvent(mc, "touchmove", function (event) {
					that.#zoomPanManager.showPanning(event);
				});
				UtilFuncs.addEvent(window, "resize", function (event) {
					that.#refreshWindowSize(event);
				});

				// マウスイベント
				// 緯度経度文字を選べるようにね/ 2012/12/07

				UtilFuncs.addEvent(mc, "mousedown", function (event) {
					that.#zoomPanManager.startPan(event);
				});
				UtilFuncs.addEvent(mc, "mouseup", function (event) {
					that.#zoomPanManager.endPan(event);
				});
				UtilFuncs.addEvent(mc, "mousemove", function (event) {
					that.#zoomPanManager.showPanning(event);
				});
				UtilFuncs.addEvent(window, "resize", function (event) {
					that.#refreshWindowSize(event);
				});
			}
		} else {
			// IEの場合
			/**
			document.onmousedown = startPan;
			document.onmouseup = endPan;
			document.onmousemove = showPanning;
			document.onresize = refreshWindowSize;
			**/
		}
		var that = this;
		window.addEventListener(
			"wheel",
			function (event) {
				that.#testWheel(event);
			},
			{ passive: false }
		);
	}

	#refreshWindowSize() {
		//	console.log("refreshWindowSize()");
		var newMapCanvasSize = UtilFuncs.getCanvasSize(); // window resize後、initLoad()と同じくgetCanvasSizeが定まらない時があり得るかも 2016.5.31
		if (
			!newMapCanvasSize ||
			newMapCanvasSize.width < 1 ||
			newMapCanvasSize.height < 1
		) {
			setTimeout(
				function () {
					this.#refreshWindowSize();
				}.bind(this),
				50
			);
			return;
		}

		var prevS2C = this.#getRootSvg2Canvas(
			this.#mapViewerProps.rootViewBox,
			this.#mapViewerProps.mapCanvasSize
		);
		var pervCenterX =
			this.#mapViewerProps.rootViewBox.x +
			0.5 * this.#mapViewerProps.rootViewBox.width;
		var pervCenterY =
			this.#mapViewerProps.rootViewBox.y +
			0.5 * this.#mapViewerProps.rootViewBox.height;

		this.#mapViewerProps.setMapCanvasSize(newMapCanvasSize);

		this.#mapViewerProps.rootViewBox.width =
			this.#mapViewerProps.mapCanvasSize.width / prevS2C.a;
		this.#mapViewerProps.rootViewBox.height =
			this.#mapViewerProps.mapCanvasSize.height / prevS2C.d;

		this.#mapViewerProps.rootViewBox.x =
			pervCenterX - 0.5 * this.#mapViewerProps.rootViewBox.width;
		this.#mapViewerProps.rootViewBox.y =
			pervCenterY - 0.5 * this.#mapViewerProps.rootViewBox.height;

		this.setMapCanvasCSS(this.#mapViewerProps.mapCanvas);

		this.#svgMapObj.refreshScreen();
		this.setLayerListSize();
		this.setCenterUI();
	}

	#wheelTimerID;
	#wheelZooming;

	#testWheel(evt) {
		if (this.#wheelZooming == 0) {
			// console.log("start wheel");
			this.#zoomPanManager.startPan({
				type: "wheelDummy",
				button: 2,
				clientX: 0,
				clientY: 0,
			});
			this.#zoomPanManager.wheelZooming = true;
		}
		var zf = 1;
		// https://groups.google.com/a/chromium.org/g/chromium-dev/c/VhSKxAJFCs0
		// たしかに、パッドでピンチするとctrlはtrueになってる
		if (evt.ctrlKey) {
			zf = 3;
		}
		this.#wheelZooming -= (evt.deltaX + evt.deltaY + evt.deltaZ) * zf;
		/**
		console.log(
			"wheel Zooming ",
			this.#wheelZooming,
			evt.deltaX,
			evt.deltaY,
			evt.deltaZ,
			evt.ctrlKey
		);
		**/
		this.#zoomPanManager.showPanning({
			type: "wheelDummy",
			buttons: 1,
			clientX: 0,
			clientY: this.#wheelZooming,
		});
		clearTimeout(this.#wheelTimerID);
		this.#wheelTimerID = setTimeout(
			function () {
				// console.log("wheel終了", this.#wheelTimerID, this.#wheelZooming);
				this.#zoomPanManager.endPan();
				this.#zoomPanManager.wheelZooming = false;
				this.#wheelZooming = 0;
			}.bind(this),
			200
		);
		evt.preventDefault();
	}

	// 中心座標を提供するUIのオプション(2012/12/7)

	setCenterUI() {
		// 照準を中心位置に
		var centerSight;
		if (document.getElementById("centerSight")) {
			centerSight = document.getElementById("centerSight");
		} else {
			centerSight = document.createElement("img");
			centerSight.setAttribute("id", "centerSight");
			centerSight.setAttribute("src", BuiltinIcons.xcursor);
			centerSight.setAttribute("width", 15);
			centerSight.setAttribute("height", 15);
			centerSight.style.opacity = "0.5";
			document.documentElement.appendChild(centerSight);
		}

		centerSight.style.position = "absolute";
		centerSight.style.top =
			this.#mapViewerProps.mapCanvasSize.height / 2 -
			document.getElementById("centerSight").height / 2 +
			"px";
		centerSight.style.left =
			this.#mapViewerProps.mapCanvasSize.width / 2 -
			document.getElementById("centerSight").width / 2 +
			"px";
		this.#mapTicker.updateTicker();

		// 照準をクリックするとオブジェクトを問い合わせる機能を実装(2013/12/05)
		//		addEvent(centerSight, "mousedown", testCSclick); // Obsolute 2018.01.31

		if (document.getElementById("centerPos")) {
			this.#centerPos = document.getElementById("centerPos");
		} else {
			this.#centerPos = null;
		}
		if (document.getElementById("vScale")) {
			this.#vScale = document.getElementById("vScale");
		} else {
			this.#vScale = null;
		}
	}

	// 中心緯経度書き換え
	updateCenterPos() {
		if (this.#centerPos) {
			var cent = this.getCentralGeoCoorinates();
			//		console.log("centralGeo:", cent.lat , cent.lng);
			this.#centerPos.innerHTML =
				UtilFuncs.round(cent.lat, 6) + " , " + UtilFuncs.round(cent.lng, 6);
		}
		if (this.#vScale) {
			// 50pxのたてスケールに相当する長さをKmで表示
			this.#vScale.innerHTML =
				UtilFuncs.round(this.getVerticalScreenScale(50), 3) + "Km";
		}
	}

	// ユーザ定義を可能とする中心座標書き換え
	setUpdateCenterPos(func) {
		if (func) {
			this.updateCenterPos = func;
		}
	}

	/**
	 * @function
	 *
	 * @name getVerticalScreenScale
	 * @description 画面上の垂直距離を返す関数(地球は楕円なのでメルカトル図法では水平方向と垂直方向で距離が異なります)
	 *
	 * @param {Number} screenLength // 単位はpx
	 * @returns {Number}  // 単位はkm
	 */
	getVerticalScreenScale(screenLength) {
		// input: px, return : Km
		var p1 = this.screen2Geo(1, 1);
		var p2 = this.screen2Geo(1, 1 + screenLength);
		var vs = p1.lat - p2.lat;
		return vs * 111.111111;
	}

	//グローバル変数 rootViewBox,rootCrsから画面中心地理座標を得る
	getCentralGeoCoorinates() {
		var rscx =
			this.#mapViewerProps.rootViewBox.x +
			this.#mapViewerProps.rootViewBox.width / 2.0;
		var rscy =
			this.#mapViewerProps.rootViewBox.y +
			this.#mapViewerProps.rootViewBox.height / 2.0;

		var geoCentral = this.#matUtil.SVG2Geo(
			rscx,
			rscy,
			this.#mapViewerProps.rootCrs
		);
		return geoCentral;
	}

	/**
	 * 画面上の座標(px)を指定すると、その地理座標を返す
	 *
	 * @param {Number} screenX
	 * @param {Number} screenY
	 * @returns {Object|null} lat/lngのキーを含むhashを戻す
	 */
	screen2Geo(screenX, screenY) {
		// 画面上の座標(px)を指定すると、その地理座標を返す
		var sx, sy;
		if (!screenY) {
			sx = screenX.x;
			sy = screenX.y;
		} else {
			sx = screenX;
			sy = screenY;
		}
		var relScX =
			(this.#mapViewerProps.rootViewBox.width * sx) /
			this.#mapViewerProps.mapCanvasSize.width;
		var relScY =
			(this.#mapViewerProps.rootViewBox.height * sy) /
			this.#mapViewerProps.mapCanvasSize.height;

		var rscx = this.#mapViewerProps.rootViewBox.x + relScX;
		var rscy = this.#mapViewerProps.rootViewBox.y + relScY;

		var geoPoint = this.#matUtil.SVG2Geo(
			rscx,
			rscy,
			this.#mapViewerProps.rootCrs
		);
		return geoPoint;
	}

	geo2Screen(lat, lng) {
		var latitude, longitude;

		if (!lng) {
			latitude = lat.lat;
			longitude = lat.lng;
		} else {
			latitude = lat;
			longitude = lng;
		}

		var rootXY = this.#matUtil.Geo2SVG(
			latitude,
			longitude,
			this.#mapViewerProps.rootCrs
		);

		return {
			x:
				((rootXY.x - this.#mapViewerProps.rootViewBox.x) *
					this.#mapViewerProps.mapCanvasSize.width) /
				this.#mapViewerProps.rootViewBox.width,
			y:
				((rootXY.y - this.#mapViewerProps.rootViewBox.y) *
					this.#mapViewerProps.mapCanvasSize.height) /
				this.#mapViewerProps.rootViewBox.height,
		};
	}
	/**
	 * 中心地理座標を指定して地図を移動 (radiusは緯度方向の度1≒110Km) 2012/12/7
	 * @function
	 * @param {Number} lat 必須
	 * @param {Number} lng 必須
	 * @param {Number} radius [lat-side-deg]オプション(今の縮尺のまま移動) ( setGeoViewPort(lat,lng,h,w) という関数もあります )
	 * @returns {undefined}
	 */
	setGeoCenter(lat, lng, radius) {
		console.log("setGeoCenter:", lat, lng, radius);
		if (!lat || !lng) {
			return;
		}
		this.#hideAllTileImgs(); // 2014.6.10
		var vw, vh;
		if (!radius) {
			// シフトだけさせるといいかな
			vh = this.#mapViewerProps.rootViewBox.height;
			vw = this.#mapViewerProps.rootViewBox.width;
		} else {
			if (this.#mapViewerProps.rootCrs.d) {
				vh = Math.abs(this.#mapViewerProps.rootCrs.d * radius); // SVGの縦幅
			} else {
				// 2020.3.26 for non linear projection
				var p0 = this.#matUtil.transform(
					lng,
					lat - radius / 2.0,
					this.#mapViewerProps.rootCrs
				);
				var p1 = this.#matUtil.transform(
					lng,
					lat + radius / 2.0,
					this.#mapViewerProps.rootCrs
				);
				vh = Math.abs(p0.y - p1.y);
			}
			vw =
				(vh * this.#mapViewerProps.rootViewBox.width) /
				this.#mapViewerProps.rootViewBox.height;
		}

		var rsc = this.#matUtil.Geo2SVG(lat, lng, this.#mapViewerProps.rootCrs); // 中心のSVG座標
		var vx = rsc.x - vw / 2.0;
		var vy = rsc.y - vh / 2.0;

		this.#mapViewerProps.rootViewBox.x = vx;
		this.#mapViewerProps.rootViewBox.y = vy;
		this.#mapViewerProps.rootViewBox.width = vw;
		this.#mapViewerProps.rootViewBox.height = vh;

		//	var s2c = getRootSvg2Canvas( rootViewBox , mapCanvasSize );
		this.#svgMapObj.refreshScreen();
	}

	// 地理(グローバル)座標系で指定したエリアを包含する最小のviewportを設定する
	/**
	 * @function
	 * @name setGeoViewPort
	 * @description 地理(グローバル)座標系で指定したエリアを包含する最小のviewportを設定する
	 *
	 * @param {Number} lat
	 * @param {Number} lng
	 * @param {Number} latSpan //緯度方向の範囲？単位はdegree？
	 * @param {Number} lngSpan //軽度方向の範囲？単位はdegree？
	 * @param {Boolean} norefresh //画面更新を実施するかのフラグ
	 * @returns {Boolean}
	 */
	setGeoViewPort(lat, lng, latSpan, lngSpan, norefresh) {
		if (!latSpan || !lngSpan) {
			return false;
		}

		this.#hideAllTileImgs();

		// これはまずいかも、const化し、 updateにしたほうが良いのでは
		this.#mapViewerProps.setRootViewBox(
			this.#getrootViewBoxFromGeoArea(
				lat,
				lng,
				latSpan,
				lngSpan,
				this.ignoreMapAspect
			)
		);

		//	var s2c = getRootSvg2Canvas( rootViewBox , mapCanvasSize );

		if (!norefresh) {
			this.#svgMapObj.refreshScreen();
		} else {
			// これもまずいかも、const化し、 updateにしたほうが良いのでは
			this.setGeoViewBox(
				this.#matUtil.getTransformedBox(
					this.#mapViewerProps.rootViewBox,
					this.#mapViewerProps.root2Geo
				)
			); // setGeoViewPortだけではgeoViewBox設定されずバグ 2016.12.13 --> 2017.1.31 ここに移設
		}
		return true;
	}
	#getrootViewBoxFromGeoArea(lat, lng, latSpan, lngSpan, ignoreMapAspect) {
		var svgSW = this.#matUtil.Geo2SVG(lat, lng, this.#mapViewerProps.rootCrs);
		var svgNE = this.#matUtil.Geo2SVG(
			lat + latSpan,
			lng + lngSpan,
			this.#mapViewerProps.rootCrs
		);
		// upper values are not cared aspect...

		var vb = new Object();
		vb.x = svgSW.x;
		vb.y = svgNE.y;
		vb.width = Math.abs(svgNE.x - svgSW.x);
		vb.height = Math.abs(svgSW.y - svgNE.y);

		var ans;
		if (ignoreMapAspect) {
			ans = vb;
		} else {
			ans = UtilFuncs.getrootViewBoxFromRootSVG(
				vb,
				this.#mapViewerProps.mapCanvasSize
			);
		}
		return ans;
	}

	setGeoViewBox(vb) {
		this.geoViewBox.x = vb.x;
		this.geoViewBox.y = vb.y;
		this.geoViewBox.width = vb.width;
		this.geoViewBox.height = vb.height;
	}

	getGeoViewBox() {
		var cent = this.getCentralGeoCoorinates();
		return {
			x: this.geoViewBox.x,
			y: this.geoViewBox.y,
			width: this.geoViewBox.width,
			height: this.geoViewBox.height,
			cx: cent.lng,
			cy: cent.lat,
		};
	}

	setMapCanvasCSS(mc) {
		// 2012/12/19 firefoxに対応　スクロールバーとか出なくした
		//	console.log("setMapCanvasCSS :: mapCanvasSize:",mapCanvasSize, "  zoomRatio:",zoomRatio);
		mc.style.position = "absolute";
		mc.style.overflow = "hidden";
		mc.style.top = "0px";
		mc.style.left = "0px";
		mc.style.width = this.#mapViewerProps.mapCanvasSize.width + "px";
		mc.style.height = this.#mapViewerProps.mapCanvasSize.height + "px";
	}
}
export { EssentialUIs };
