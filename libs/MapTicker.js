// Description:
// MapTicker Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { ShowPoiProperty } from "./ShowPoiProperty.js";
import { PathHitTester } from "./PathHitTester.js";
import { PoiHitTester } from "./PoiHitTester.js";
import { CustomHitTester } from "./CustomHitTester.js";
import { UtilFuncs } from "./UtilFuncs.js";
import { SvgMapElementType } from "./SvgMapElementType.js";

class MapTicker {
	#svgMapObject;

	#ticker;
	#tickerTable;

	#centerSight;
	#svgImagesProps;

	showPoiProperty;
	pathHitTester;
	poiHitTester;
	#customHitTester;

	#mapCanvasSize; // 2022/09/07 svgMapObjectの#mapCanvasSizeをconst扱いにしたので、初期化時にこれを作っても良い状態になった

	// 以下の4関数はsvgMapから持ってきているもの。今後さらに整理が必要かも
	#isEditingLayer;
	#getLayerName;

	#matUtil;
	#svgMapAuthoringTool;

	constructor(
		svgMapObject,
		matUtil,
		isEditingLayer,
		getLayerName,
		setLoadCompleted,
		svgMapAuthoringTool
	) {
		this.#svgMapObject = svgMapObject;
		this.#centerSight = document.getElementById("centerSight"); // ISSUE centerSightがないとtickerができないのはまずすぎる
		if (!this.#ticker) {
			var parentElem = this.#centerSight.parentNode;
			this.#ticker = document.createElement("span");
			parentElem.insertBefore(this.#ticker, this.#centerSight);
			this.#ticker.style.position = "absolute";
			this.#ticker.style.backgroundColor = "yellow";
			this.#ticker.style.color = "black";
			this.#ticker.style.display = "none";
			this.#ticker.style.opacity = "0.5";
			this.#ticker.id = "ticker";
			this.#ticker.style.cursor = "pointer";
			this.#ticker.style.overflowX = "hidden";
			this.#ticker.style.overflowY = "auto";
			this.#ticker.addEventListener(
				"wheel",
				UtilFuncs.MouseWheelListenerFunc,
				false
			);
			this.#ticker.addEventListener(
				"mousewheel",
				UtilFuncs.MouseWheelListenerFunc,
				false
			);
			this.#ticker.addEventListener(
				"DOMMouseScroll",
				UtilFuncs.MouseWheelListenerFunc,
				false
			);

			this.#tickerTable = document.createElement("table");
			this.#tickerTable.style.borderCollapse = "collapse";
			this.#tickerTable.style.border = "solid 1px black";
			this.#tickerTable.setAttribute("border", "1");
			this.#ticker.appendChild(this.#tickerTable);

			this.#svgImagesProps = this.#svgMapObject.getSvgImagesProps();
			this.#matUtil = matUtil;

			this.#isEditingLayer = isEditingLayer;
			this.#getLayerName = getLayerName;

			this.#svgMapAuthoringTool = svgMapAuthoringTool;
		}
		this.updateTicker();

		// このオブジェクトに含まれる、子オブジェクトを初期化する
		this.pathHitTester = new PathHitTester(
			svgMapObject,
			svgMapAuthoringTool,
			setLoadCompleted
		);
		this.poiHitTester = new PoiHitTester();
		this.#customHitTester = new CustomHitTester(svgMapObject, getLayerName);
		this.showPoiProperty = new ShowPoiProperty(
			svgMapObject,
			getLayerName,
			matUtil
		);

		//console.log("MapTicker new:",svgMapObject);
	}

	updateTicker() {
		this.#setTickerPosition();
		this.#ticker.style.fontSize = "110%";
		this.#ticker.style.fontWeight = "bolder";
	}

	isEnabled() {
		if (this.#ticker) {
			return true;
		}
	}

	showTicker() {
		if (this.#ticker) {
			this.#ticker.style.display = "";
		}
	}

	hideTicker = function () {
		if (this.#ticker) {
			this.#ticker.style.display = "none";
		}
	}.bind(this);

	#setTickerPosition(px, py) {
		if (this.#ticker) {
			if (!px && !py) {
				var mapCanvasSize = this.#svgMapObject.getMapCanvasSize();
				px = mapCanvasSize.width / 2;
				py = mapCanvasSize.height / 2;
			}
			this.#ticker.style.left = px + 2 + "px";
			this.#ticker.style.top = py + this.#centerSight.height / 2 + "px";
		}
	}

	#fixTickerSize() {
		var mapCanvasSize = this.#svgMapObject.getMapCanvasSize();
		var py = Number(this.#ticker.style.top.replace("px", "")); // tickerの位置がいろいろ動くようになったので 2018.2.2
		this.#ticker.style.height = "";
		var th = this.#ticker.offsetHeight;
		var tw = this.#ticker.offsetWidth;
		if (mapCanvasSize.height - py < th) {
			this.#ticker.style.height = mapCanvasSize.height - py - 8 + "px";
		}
	}

	#tickerTableMetadata;

	getTickerMetadata = function () {
		for (var i = 0; i < this.#tickerTableMetadata.length; i++) {
			var tm = this.#tickerTableMetadata[i];
			if (tm.img) {
				// POI
				var svgTarget = this.#svgMapObject.getSvgTarget(tm.img).element;
				var crs = this.#svgImagesProps[UtilFuncs.getDocumentId(svgTarget)].CRS;
				var iprops = UtilFuncs.getImageProps(svgTarget, SvgMapElementType.POI);
				var geoloc = this.#matUtil.SVG2Geo(iprops.x, iprops.y, crs);
				tm.geoBbox = { x: geoloc.lng, y: geoloc.lat, width: 0, height: 0 };
				tm.metadata = svgTarget.getAttribute("content");
				tm.element = svgTarget;
				tm.metaSchema =
					svgTarget.ownerDocument.firstChild.getAttribute("property");
			} else {
				// 2D Vector
				// already set!
			}
		}

		console.log("getTickerMetadata:", this.#tickerTableMetadata);

		return this.#tickerTableMetadata;
	}.bind(this);

	checkTicker(px, py) {
		// 地図中心の照準に合わせたオブジェクトを選択するUIの2017.8刷新版
		// 引数がないときは画面中央のオブジェクトの自動探索(伸縮とともに自動で探索するモード)
		// 引数があるときは、あえてクリックして探索するモード　探索結果が一個の時に違いがある
		// 2018.2.2 すべてのオブジェクトプロパティ表示UIをこの関数に統合
		//
		// FIXED : ISSUEあり（getVectorObjectsAtPointでのDOMトラバーサ二重起動の非効率）->FIXED 2018.1.18
		//
		// getObjectAtPointの機能を吸収 2018.1.31
		// testClickの機能も(getObjectAtPoint経由で)吸収 2018.2.2

		var hittedObjects; // ベクタでヒットしたモノ
		var hittedPoiObjects; // ラスタPOIでヒットしたモノ
		var hittedLayerHitTests; // 2022/05 レイヤWebAppで独自に組んだヒットテスタでヒットしたモノ

		if (px && py) {
			hittedObjects = this.pathHitTester.getVectorObjectsAtPoint(px, py); // マウスによる指定では中心でないので、この呼び出しが必要　重たいDOMトラバーサが同期で動きます
			hittedPoiObjects = this.poiHitTester.getPoiObjectsAtPoint(px, py);
			hittedLayerHitTests = this.#customHitTester.getLayerHitTestAtPoint(
				px,
				py
			); // 2022/05
		} else {
			hittedObjects = this.pathHitTester.getHittedObjects(); // 2018.1.18 setCentralVectorObjectsGetterと組み合わせ、getVectorObjectsAtPointを代替して効率化 : ベクタでヒットしたモノ
			var mapCanvasSize = this.#svgMapObject.getMapCanvasSize();
			hittedPoiObjects = this.poiHitTester.getPoiObjectsAtPoint(
				mapCanvasSize.width / 2,
				mapCanvasSize.height / 2
			); // ラスタPOIでヒットしたモノ
			hittedLayerHitTests = this.#customHitTester.getLayerHitTestAtPoint(
				mapCanvasSize.width / 2,
				mapCanvasSize.height / 2,
				true
			); // 2022/05 , 2022/09 中心ヒットテスト判別可能にする
		}

		if (
			hittedPoiObjects.length == 0 &&
			px &&
			py &&
			this.#checkAndKickEditor(hittedObjects, px, py)
		) {
			// POIがヒットしていない場合に限り、ベクタを対象にオーサリングツールのキック可能性をチェックし、キックされたならそのまま終了する
			return;
		}

		this.#removeChildren(this.#tickerTable);
		this.#tickerTableMetadata = new Array(); // tickerTableMetadataはほとんど使われていないように思われます・・ 2022/05
		if (
			(hittedObjects && hittedObjects.elements.length > 0) ||
			hittedPoiObjects.length > 0 ||
			hittedLayerHitTests.length > 0
		) {
			var lastCallback; // 候補１つだったときに自動起動させるコールバック保持用
			var that = this;
			setTimeout(
				function () {
					that.#fixTickerSize();
				}.bind(this),
				300
			);
			// for raster POI
			for (var i = 0; i < hittedPoiObjects.length; i++) {
				var poip = this.#getPropsOfPoi(hittedPoiObjects[i].id);
				var el = poip.imgElement;
				var cbf = (function (targetElem) {
					return function () {
						that.#poiSelectProcess(targetElem); // オーサリングツールのチェックがPOIはこちらで行われていてベクタとは別なのが気持ち悪すぎる。後ほど・・・ 2018.2.1
					};
				})(el);
				lastCallback = cbf;
				this.#addTickerItem(el.title, cbf, this.#tickerTable, poip.layerName);
				this.#tickerTableMetadata.push({
					title: el.title,
					layerName: poip.layerName,
					img: el,
				});
			}
			// for vector objects
			if (hittedObjects) {
				for (var i = 0; i < hittedObjects.elements.length; i++) {
					var vMeta = this.showPoiProperty.getVectorMetadata(
						hittedObjects.elements[i],
						hittedObjects.parents[i],
						hittedObjects.bboxes[i]
					);
					var meta = this.showPoiProperty.getMetadataObject(
						vMeta.metadata,
						vMeta.metaSchema,
						vMeta.title
					);
					console.log(
						vMeta.geolocMin,
						vMeta.geolocMax,
						meta,
						meta.title,
						vMeta.layerName
					);

					var vcbf = (function (elem, parent, bbox, that) {
						return function () {
							//						hitVectorObject(elem,parent,bbox);
							that.vectorDataWrapperForShowPoiProperty(elem, bbox, parent);
						};
					})(
						hittedObjects.elements[i],
						hittedObjects.parents[i],
						hittedObjects.bboxes[i],
						this.showPoiProperty
					);
					lastCallback = vcbf;
					this.#addTickerItem(
						meta.title,
						vcbf,
						this.#tickerTable,
						vMeta.layerName
					);
					this.#tickerTableMetadata.push({
						title: meta.title,
						layerName: vMeta.layerName,
						element: hittedObjects.elements[i],
						parent: hittedObjects.parents[i],
						bbox: hittedObjects.bboxes[i],
						metadata: vMeta.metadata,
						geoBbox: {
							x: vMeta.geolocMin.lng,
							y: vMeta.geolocMin.lat,
							width: vMeta.geolocMax.lng - vMeta.geolocMin.lng,
							height: vMeta.geolocMax.lat - vMeta.geolocMin.lat,
						},
						metaSchema: vMeta.metaSchema,
					});
				}
			}

			// 2022/05 for LayerUI customized hitTester
			for (var i = 0; i < hittedLayerHitTests.length; i++) {
				var hitObj = hittedLayerHitTests[i];
				// console.log("hitObj:",hitObj);
				var cbf = function (targetElem, hitTestIndex) {
					return function () {
						targetElem.setAttribute("data-hitTestIndex", hitTestIndex);
						this.showPoiProperty.showPoiPropertyWrapper(targetElem);
						targetElem.removeAttribute("data-hitTestIndex");
					}.bind(this);
				}.bind(this)(hitObj.element, hitObj.hitTestIndex);
				lastCallback = cbf;

				this.#addTickerItem(
					hitObj.title,
					cbf,
					this.#tickerTable,
					hitObj.layerName
				);
				this.#tickerTableMetadata.push(hitObj);
			}

			if (px && py && this.#tickerTableMetadata.length == 1) {
				// クリックモードで候補が一つだったら直接コールバック呼び出して、ティッカーは出現させない
				this.hideTicker(); // これは不要かな
				lastCallback();
			} else {
				this.#setTickerPosition(px, py);
				this.showTicker();
			}
			//		console.log ( " TickerElem;",ticker, "   tickerTableMetadata:",tickerTableMetadata,"  tickerDisplay:",ticker.style.display);
		} else {
			this.hideTicker();
		}
	}

	#poiSelectProcess(obj) {
		// html:img要素によるPOI(from use要素)を１個だけの選択まで決定したあとに実行するプロセス
		// testClick()に元々あった機能を切り分け　今はtestClick()を代替したcheckTicker()から呼ばれている
		var target = obj.target || obj.srcElement || obj;
		var el = this.#isEditingLayer();
		var svgTargetObj = this.#svgMapObject.getSvgTarget(target);
		var svgTarget = svgTargetObj.element;
		if (
			typeof this.#svgMapAuthoringTool == "object" &&
			el &&
			el.getAttribute("iid") ==
				this.#svgImagesProps[target.parentNode.getAttribute("id")].rootLayer
		) {
			// 選択したオブジェクトが編集中レイヤのものの場合 (2019/3/12、タイルではなくレイヤーで判別するように変更)
			this.#svgMapAuthoringTool.setTargetObject(svgTargetObj);
		} else {
			this.#processShowUse(svgTargetObj);
		}
	}

	#addTickerItem(title, callBack, table, subTitle) {
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		var spn = document.createElement("span");
		if (subTitle) {
			spn.innerHTML = title + "<font size='-2'>/" + subTitle + "</font>";
		} else {
			spn.innerHTML = title;
		}
		td.appendChild(spn);
		tr.appendChild(td);
		table.appendChild(tr);
		spn.addEventListener("mousedown", callBack, false);
	}

	// 2D Vector及び、ラスターのPOI(html img要素)のための、クリックなどによるオブジェクト検索機能。 関数名を除き、すべての機能をcheckTickerに集約した 2018.1.31
	getObjectAtPoint = function (x, y) {
		this.checkTicker(x, y);

		/**
		return ( pathHitTest.targetObject ); // こんなプロパティは存在しない null. TBD
		**/
	}.bind(this);

	// ヒットした2Dベクタオブジェクトがオーサリングシステムをキックするべきものかどうかを調べて必要であればキックする
	// getObjectAtPoint()に元々あった機能を切り分け　今はgetObjectAtPoint()を代替したcheckTicker()から呼ばれている
	#checkAndKickEditor(hittedVectorObjects, x, y) {
		var el = this.#isEditingLayer();
		var ans = false;
		if (typeof this.#svgMapAuthoringTool == "object" && el) {
			// オーサリングシステムがあり、オーサリング中のレイヤがある場合
			if (hittedVectorObjects && hittedVectorObjects.elements.length > 0) {
				// ヒットしている場合
				var editingObject = this.#getEditingObject(hittedVectorObjects, el);
				if (editingObject) {
					//編集中レイヤのオブジェクトが選択されている場合
					this.#svgMapAuthoringTool.setTargetObject({
						element: editingObject,
						docId: UtilFuncs.getDocumentId(editingObject),
					});
					ans = true;
				}
			} else {
				// 編集システムがあり、編集中の場合(ただし編集中オブジェクトはない)
				// 新しいオブジェクト作成系
				this.#svgMapAuthoringTool.editPoint(x, y);
				ans = true;
			}
		}
		return ans;
	}

	// 入力したオブジェクトの中から初めに見つかった編集中レイヤーのオブジェクトを返却する
	// 最初に見つかったものに決め打ちしているのが果たしていいのかどうかは要検討
	// getObjectAtPoint()に元々あった機能を切り分け　上のcheckAndKickEditor()から呼ばれている
	#getEditingObject(hittedObjects, editingLayer) {
		var editingTarget = -1;
		if (typeof this.#svgMapAuthoringTool == "object" && editingLayer) {
			for (var i = 0; i < hittedObjects.elements.length; i++) {
				if (
					editingLayer.getAttribute("iid") ==
					UtilFuncs.getDocumentId(hittedObjects.elements[i])
				) {
					editingTarget = i;
					break;
				}
			}
		}

		if (editingTarget >= 0) {
			return hittedObjects.elements[editingTarget];
		} else {
			return null;
		}
	}

	#removeChildren(targetElem) {
		for (var i = targetElem.childNodes.length - 1; i >= 0; i--) {
			targetElem.removeChild(targetElem.childNodes[i]);
		}
	}

	#getPropsOfPoi(poiId) {
		var screenPOIimg = document.getElementById(poiId);
		var layerName;
		if (
			screenPOIimg &&
			screenPOIimg.parentNode &&
			screenPOIimg.parentNode.getAttribute("class")
		) {
			//  2015.11.14 debug rootのPOIでは所属レイヤーなし
			var layerId = screenPOIimg.parentNode.getAttribute("class").substring(10);
			var layer = this.#svgMapObject.getLayer(layerId); // htmlのdiv(レイヤ相当)のclassには、ルートのレイヤーIDが10文字目から入っている 2014.12.15
			layerName = this.#getLayerName(layer);
		} else {
			layerName = "/";
		}
		return {
			layerId: layerId,
			layerName: layerName,
			imgElement: screenPOIimg,
		};
	}

	#processShowUse(svgTargetObj) {
		var svgTarget = svgTargetObj.element;
		if (
			UtilFuncs.getHyperLink(svgTarget) &&
			!svgTarget.getAttribute("content")
		) {
			// アンカーが付いていて且つメタデータが無い場合
			this.showPage(UtilFuncs.getHyperLink(svgTarget));
		} else if (
			UtilFuncs.getHyperLink(svgTarget) &&
			svgTarget.getAttribute("content")
		) {
			// アンカーもあってメタデータもある場合
			this.POIviewSelection(svgTarget);
		} else {
			// アンカーが無い場合
			this.showUseProperty(svgTarget);
		}
	}

	showPage(hyperLink) {
		var href = UtilFuncs.trim(hyperLink.href);

		if (href.indexOf("#") == 0) {
			// ハッシュだけの場合は viewPort変化をさせる
			var vb = UtilFuncs.getFragmentView(href);
			if (vb) {
				this.#svgMapObject.setGeoViewPort(vb.y, vb.x, vb.height, vb.width);
			}
			return;
		}

		if (hyperLink.target) {
			// 別ウィンドで
			window.open(href);
		} else {
			// そのウィンドを置き換える
			window.open(href, "_self", "");
		}
	}

	POIviewSelection(poi) {
		var pvs = this.initModal("POIviewSelection");
		var pvsVL = function (e) {
			switch (e.target.id) {
				case "pvsView":
					this.showUseProperty(poi);
					this.initModal();
					pvs.removeEventListener("click", pvsVL, false);
					break;
				case "pvsLink":
					this.showPage(UtilFuncs.getHyperLink(poi));
					this.initModal();
					pvs.removeEventListener("click", pvsVL, false);
					break;
			}
		}.bind(this);
		pvs.addEventListener("click", pvsVL, false);
	}

	initModal(target) {
		var modalUI;
		//http://black-flag.net/css/20110201-2506.html この辺を参考に
		if (!document.getElementById("modalUI")) {
			var body = document.getElementsByTagName("body")[0];
			modalUI = document.createElement("div");
			modalUI.style.position = "absolute";
			modalUI.style.left = "0px";
			modalUI.style.top = "0px";
			//		modalUI.style.width=mapCanvasSize.width + "px";
			//		modalUI.style.height=mapCanvasSize.height + "px";
			modalUI.style.width = "100%";
			modalUI.style.height = "100%";
			modalUI.style.display = "none";
			modalUI.id = "modalUI";
			modalUI.style.zIndex = "32767";
			body.appendChild(modalUI);

			//マスクを生成する
			var mask = document.createElement("div");
			mask.style.position = "absolute";
			mask.id = "modalMask";
			mask.style.left = "0px";
			mask.style.top = "0px";
			mask.style.width = "100%";
			mask.style.height = "100%";
			mask.style.backgroundColor = "#505050";
			mask.style.color = "yellow";
			mask.style.opacity = "0.5";
			modalUI.appendChild(mask);

			// POI表示の選択肢(メタデータ or リンク)を生成する
			var pvs = document.createElement("div");
			pvs.style.opacity = "1";
			// 幅を自動にしつつ真ん中に表示するのはできないのかな・・
			//		pvs.style.margin="0 auto";
			pvs.style.position = "absolute";
			//		pvs.style.width="80%";
			//		pvs.style.height="80%";
			pvs.style.backgroundColor = "white";
			pvs.id = "POIviewSelection";
			pvs.innerHTML =
				'<input type="button" id="pvsView" value="view Property"/><br><input type="button" id="pvsLink" value="open Link"/>';

			pvs.style.display = "none";
			modalUI.appendChild(pvs);

			// カスタムモーダル(アプリ提供用)を生成する 2017/1/25
			var cm = document.createElement("div");
			cm.style.opacity = "1";
			cm.style.position = "absolute";
			cm.style.backgroundColor = "white";
			cm.id = "customModal";
			//		cm.innerHTML='<input type="button" id="pvsView" value="view Property"/><br><input type="button" id="pvsLink" value="open Link"/>';
			cm.style.display = "none";
			modalUI.appendChild(cm);
		} else {
			modalUI = document.getElementById("modalUI");
		}

		var ans = null;
		if (target) {
			modalUI.style.display = "";
			ans = document.getElementById(target);
		} else {
			modalUI.style.display = "none";
		}

		var uis = modalUI.getElementsByTagName("div");
		for (var i = 0; i < uis.length; i++) {
			if (uis[i].id == target || uis[i].id == "modalMask") {
				uis[i].style.display = "";
			} else {
				uis[i].style.display = "none";
			}
		}
		return ans;
	}

	// ビットイメージPOI要素のためのshowPoiPropertyWrapper呼び出し用プリプロセッサ
	showUseProperty(target) {
		var crs = this.#svgImagesProps[UtilFuncs.getDocumentId(target)].CRS;
		var iprops = UtilFuncs.getImageProps(target, SvgMapElementType.POI);
		var geoloc = this.#matUtil.SVG2Geo(iprops.x, iprops.y, crs);
		//	var useX = target.getAttribute("x");
		//	var useY = target.getAttribute("y");
		//	var useTf = target.getAttribute("transform");

		var title = document.getElementById(target.getAttribute("iid")).title; // Added title 2017.8.22

		// showPoiPropertyWrapper()が想定しているオブジェクト形式に無理やり合わせて、呼び終わったら戻している・・・微妙
		// 2017.2.28　x,y,transformを除去する処理はバグを誘発するので中止
		//	target.removeAttribute("x");
		//	target.removeAttribute("y");
		//	target.removeAttribute("transform");
		target.setAttribute("lat", geoloc.lat);
		target.setAttribute("lng", geoloc.lng);
		target.setAttribute("data-title", title);
		//	console.log("showUseProperty",target , target.ownerDocument);
		this.showPoiProperty.showPoiPropertyWrapper(target);
		//	target.setAttribute("x",useX);
		//	target.setAttribute("y",useY);
		//	target.setAttribute("transform",useTf);
		target.removeAttribute("data-title");
		target.removeAttribute("lat");
		target.removeAttribute("lng");
	}
}

export { MapTicker };
