// Description:
// ShowPoiProperty Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { UtilFuncs } from "./UtilFuncs.js";

class ShowPoiProperty {
	#svgMapObject;
	#svgImagesProps;
	#getLayerName;
	#matUtil;

	constructor(svgMapObject, getLayerName, matUtil) {
		this.#svgMapObject = svgMapObject;
		this.#svgImagesProps = this.#svgMapObject.getSvgImagesProps();
		this.#getLayerName = getLayerName;
		this.#matUtil = matUtil;
	}

	// 指定した2Dベクタ要素のプロパティ表示画面をキックするためのプリプロセッサ
	// getObjectAtPoint()に元々あった機能を切り分け
	vectorDataWrapperForShowPoiProperty(targetElement, targetBbox, usedParent) {
		var vMeta = this.getVectorMetadata(targetElement, usedParent, targetBbox);
		var meta = this.getMetadataObject(
			vMeta.metadata,
			vMeta.metaSchema,
			vMeta.title
		);
		var geolocMin = this.#svgMapObject.screen2Geo(
			targetBbox.x,
			targetBbox.y + targetBbox.height
		);
		var geolocMax = this.#svgMapObject.screen2Geo(
			targetBbox.x + targetBbox.width,
			targetBbox.y
		);

		var contentMeta = targetElement.getAttribute("content"); // useの場合 use先のメタデータにはたいてい意味がない
		if (usedParent && usedParent.getAttribute("content")) {
			targetElement.setAttribute("content", usedParent.getAttribute("content"));
		}

		console.log("targetElement:", targetElement);

		// showPoiPropertyWrapper()が想定しているオブジェクト形式に無理やり合わせて、呼び終わったら戻している・・・微妙
		targetElement.setAttribute("lat", geolocMin.lat + "," + geolocMax.lat);
		targetElement.setAttribute("lng", geolocMin.lng + "," + geolocMax.lng);
		targetElement.setAttribute("data-title", meta.title);
		this.showPoiPropertyWrapper(targetElement);
		if (contentMeta) {
			targetElement.setAttribute("content", contentMeta);
		} else {
			targetElement.setAttribute("content", "");
		}
		targetElement.removeAttribute("data-title");
		targetElement.removeAttribute("lat");
		targetElement.removeAttribute("lng");
	}

	getVectorMetadata(element, parent, bbox) {
		console.log("called getVectorMetadata: ", element, parent, bbox);
		var geolocMin = this.#svgMapObject.screen2Geo(bbox.x, bbox.y + bbox.height);
		var geolocMax = this.#svgMapObject.screen2Geo(bbox.x + bbox.width, bbox.y);
		var metadata = "";
		var title = "";
		if (parent && parent.getAttribute("content")) {
			metadata = parent.getAttribute("content");
		} else if (element.getAttribute("content")) {
			metadata = element.getAttribute("content");
		}

		if (parent && parent.getAttribute("xlink:title")) {
			// xlink:titleをとれるようにした 2018.1.30
			title = parent.getAttribute("xlink:title");
		} else if (element.getAttribute("xlink:title")) {
			title = element.getAttribute("xlink:title");
		}

		var metaSchema = "";

		var layerName = this.#getLayerName(
			this.#svgMapObject.getLayer(
				this.#svgImagesProps[
					element.ownerDocument.firstChild.getAttribute("about")
				].rootLayer
			)
		);
		if (element.ownerDocument.firstChild.getAttribute("property")) {
			metaSchema = element.ownerDocument.firstChild.getAttribute("property");
		}
		return {
			geolocMin: geolocMin,
			geolocMax: geolocMax,
			metadata: metadata,
			metaSchema: metaSchema,
			layerName: layerName,
			title: title,
		};
	}

	// svgMapのcsv型のメタデータをオブジェクトに変換　もしもスキーマがない場合は配列だけが返却
	// titleはデフォルトのものを設定可能とした
	getMetadataObject(dataCsv, schemaCsv, title) {
		var data = this.parseEscapedCsvLine(dataCsv);
		var obj;
		if (schemaCsv) {
			var schema = this.parseEscapedCsvLine(schemaCsv);
			if (data.length == schema.length) {
				obj = new Object();
				for (var i = 0; i < data.length; i++) {
					obj[schema[i]] = data[i];
				}
				if (!title) {
					if (obj.name) {
						title = obj.name;
					} else if (obj.title) {
						title = obj.title;
					} else if (obj["名前"]) {
						title = obj["名前"];
					} else if (obj["名称"]) {
						title = obj["名称"];
					} else if (obj["タイトル"]) {
						title = obj["タイトル"];
					}
				}
			}
		}
		if (!title) {
			title = data[0];
		}
		return {
			object: obj,
			title: title,
			array: data,
		};
	}

	// ビットイメージPOI要素のためのshowPoiPropertyWrapper呼び出し用プリプロセッサ
	#showUseProperty(target) {
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
		this.showPoiPropertyWrapper(target);
		//	target.setAttribute("x",useX);
		//	target.setAttribute("y",useY);
		//	target.setAttribute("transform",useTf);
		target.removeAttribute("data-title");
		target.removeAttribute("lat");
		target.removeAttribute("lng");
	}

	// showPoiPropertyWrapper: POI or vector2Dのくりっかぶるオブジェクトをクリックしたときに起動する関数
	// 　ただし、アンカーの起動はこの関数呼び出し前に判断される
	// (フレームワーク化した 2017/1/25)
	// 第一引数には、該当する"SVGコンテンツ"の要素が投入されます。
	// 便利関数：svgImagesProps[UtilFuncs.getDocumentId(svgElem)], UtilFuncs.getImageProps(imgElem,category)
	//

	#specificShowPoiPropFunctions = {};
	/**
	 *
	 * @param {HTMLElement} target -
	 */
	showPoiPropertyWrapper(target) {
		var targetIsXMLElement = false;
		if (target.nodeType === Node.ELEMENT_NODE) {
			targetIsXMLElement = true;
			var docId = UtilFuncs.getDocumentId(target);
			var layerId = this.#svgImagesProps[docId].rootLayer;

			var layerName = this.#getLayerName(this.#svgMapObject.getLayer(layerId));
			target.setAttribute("data-layername", layerName); // 2017.8.22 added
		}
		var ans = true;
		if (this.#specificShowPoiPropFunctions[docId]) {
			// targeDoctに対応するshowPoiProperty処理関数が定義されていた場合、それを実行する。
			ans = this.#specificShowPoiPropFunctions[docId](target);
		} else if (this.#specificShowPoiPropFunctions[layerId]) {
			// targetDocが属する"レイヤー"に対応する　同上
			ans = this.#specificShowPoiPropFunctions[layerId](target);
		} else {
			// それ以外は・・
			if (targetIsXMLElement) {
				this.#defaultShowPoiProperty(target);
			} else {
				console.warn(
					" Skip. The result of the hit test is not an Element, so it is necessary to setShowPoiProperty. :",
					target
				);
			}
		}

		if (ans == false) {
			// レイヤ固有関数による呼び出しでfalseが返ってきたらデフォルト関数を呼び出す。
			this.#defaultShowPoiProperty(target);
		}

		if (targetIsXMLElement) {
			target.removeAttribute("data-layername");
		}
	}

	// setShowPoiProperty: 特定のレイヤー・svg文書(いずれもIDで指定)もしくは、全体に対して別のprop.表示関数を指定できる。
	// 指定した関数は、帰り値がfalseだった場合、デフォルトprop.表示関数を再度呼び出す

	setShowPoiProperty(func, docId) {
		if (!func) {
			// 消去する
			if (docId) {
				//			this.#specificShowPoiPropFunctions[docId] = null;
				delete this.#specificShowPoiPropFunctions[docId];
			} else {
				this.#defaultShowPoiPropertyCustom = null;
			}
		} else {
			if (docId) {
				// 特定のレイヤーもしくはドキュメントID向け
				this.#specificShowPoiPropFunctions[docId] = func;
			} else {
				this.#defaultShowPoiPropertyCustom = func;
			}
		}
	}

	#defaultShowPoiPropertyCustom;

	#defaultShowPoiProperty(target) {
		if (this.#defaultShowPoiPropertyCustom) {
			this.#defaultShowPoiPropertyCustom(target);
		} else {
			this.#defaultShowPoiPropertyEmbed(target);
		}
	}
	#defaultShowPoiPropertyEmbed(target) {
		// 何も設定されていない場合のデフォルトパネル

		//	var metaSchema = target.parentNode.getAttribute("property").split(",");
		var metaSchema = null;
		if (target.ownerDocument.firstChild.getAttribute("property")) {
			metaSchema = target.ownerDocument.firstChild
				.getAttribute("property")
				.split(","); // debug 2013.8.27
		}

		var message =
			"<table border='1' style='word-break: break-all;table-layout:fixed;width:100%;border:solid orange;border-collapse: collapse'>";

		var titleAndLayerName = "";
		if (target.getAttribute("data-title")) {
			titleAndLayerName =
				target.getAttribute("data-title") +
				"/" +
				target.getAttribute("data-layername") +
				"\n";
		}

		if (target.getAttribute("content")) {
			// contentメタデータがある場合

			var metaData = this.parseEscapedCsvLine(target.getAttribute("content"));

			message += "<tr><th style='width=25%'>name</th><th>value</th></tr>";
			if (titleAndLayerName != "") {
				message +=
					"<tr><td>title/Layer</td><td> " + titleAndLayerName + "</td></tr>";
			}

			if (metaSchema && metaSchema.length == metaData.length) {
				for (var i = 0; i < metaSchema.length; i++) {
					var data = "--";
					if (metaData[i] != "") {
						data = metaData[i];
					}
					message +=
						"<tr><td>" + metaSchema[i] + " </td><td> " + data + "</td></tr>";
				}
			} else {
				for (var i = 0; i < metaData.length; i++) {
					var data = "--";
					if (metaData[i] != "") {
						data = metaData[i];
					}
					message += "<tr><td>" + i + " </td><td> " + data + "</td></tr>";
				}
			}
		} else {
			// 無い場合
			var nm = target.attributes;
			for (var i = 0; i < nm.length; i++) {
				message +=
					"<tr><td>" +
					nm.item(i).nodeName +
					" </td><td> " +
					domElement.getAttribute(nm.item(i).nodeName) +
					"</td></tr>";
			}
		}

		if (UtilFuncs.getHyperLink(target)) {
			message +=
				"<tr><td>link</td> <td><a href='" +
				UtilFuncs.getHyperLink(target).href +
				"' target=`_blank'>" +
				UtilFuncs.getHyperLink(target).href +
				"</a></td></tr>";
		}

		if (target.getAttribute("lat")) {
			message +=
				"<tr><td>latitude</td> <td>" +
				this.#getFormattedRange(target.getAttribute("lat")) +
				"</td></tr>";
			message +=
				"<tr><td>longitude</td> <td>" +
				this.#getFormattedRange(target.getAttribute("lng")) +
				"</td></tr>";
		}

		message += "</table>";
		this.showModal(message, 400, 600);
	}

	#getFormattedRange(prop) {
		var rangeStr = prop.split(",");
		var ans = "";
		for (var i = 0; i < rangeStr.length; i++) {
			ans += UtilFuncs.numberFormat(Number(rangeStr[i]), 6);
			if (i < rangeStr.length - 1) {
				ans += ",";
			}
		}
		return ans;
	}

	/**
	 * モーダルではなく、実際はモードレスダイアログです。maxW,maxHがない場合、渡したコンテンツから適当なサイズでつくります
	 * @param {string|HTMLElement} htm UIなどを含むHTMLをStringもしくはElement型にて受け渡します
	 * @param {Number} [maxW]
	 * @param {Number} [maxH]
	 * @returns {Document} UIのDocumentObjectが返却
	 */
	showModal(htmOrChildDom, maxW, maxH) {
		var modalDiv;
		var flexibleSizing = false;
		if (!maxW || !maxH) {
			flexibleSizing = true;
		}
		if (document.getElementById("modalDiv")) {
			modalDiv = document.getElementById("modalDiv");
			modalDiv.parentNode.removeChild(modalDiv);
			modalDiv = document.createElement("div");
		} else {
			modalDiv = document.createElement("div");
		}
		if (window.innerWidth - 100 < maxW) {
			maxW = window.innerWidth - 100;
		}
		if (window.innerHeight - 140 < maxH) {
			maxH = window.innerHeight - 100;
		}
		if (flexibleSizing) {
			modalDiv.style.maxHeight = maxH + 36 + "px";
			modalDiv.style.maxWidth = maxW + 10 + "px";
		} else {
			modalDiv.style.height = maxH + 36 + "px";
			modalDiv.style.width = maxW + 10 + "px";
		}
		modalDiv.style.backgroundColor = "rgba(180, 180, 180, 0.4)";
		modalDiv.style.zIndex = "1000";
		modalDiv.style.position = "absolute";
		modalDiv.style.top = "40px";
		modalDiv.style.left = "40px";
		modalDiv.style.overflowY = "hidden";
		modalDiv.style.overflowX = "hidden";
		modalDiv.id = "modalDiv";

		// Shadow DOMの作成
		const shadowRoot = modalDiv.attachShadow({ mode: "closed" });

		// Info divを作成
		const infoDiv = document.createElement("div");
		if (flexibleSizing) {
			infoDiv.style.overflow = "hidden";
			infoDiv.style.margin = "5px";
			infoDiv.style.marginBottom = "30px";
		} else {
			infoDiv.style.height = maxH + "px";
			infoDiv.style.width = maxW + "px";
			infoDiv.style.position = "absolute";
			infoDiv.style.top = "5px";
			infoDiv.style.left = "5px";
			infoDiv.style.overflowY = "scroll";
			infoDiv.style.overflowX = "hidden";
		}
		infoDiv.style.backgroundColor = "rgba(255,240,220,0.7)";
		infoDiv.id = "infoDiv";

		if (typeof htmOrChildDom == "string") {
			infoDiv.innerHTML = htmOrChildDom;
		} else if (htmOrChildDom instanceof Element) {
			// Shadow DOMに隔離
			infoDiv.appendChild(htmOrChildDom);
		}

		// Close ボタンを作成
		const btn = document.createElement("button");
		const txt = document.createTextNode("CLOSE");
		btn.appendChild(txt);
		btn.onclick = function () {
			modalDiv.parentNode.removeChild(modalDiv);
		};
		btn.style.position = "absolute";
		btn.style.width = "30%";
		btn.style.bottom = "5px";
		btn.style.right = "40px";

		// Shadow DOMに要素を追加
		shadowRoot.appendChild(infoDiv);
		shadowRoot.appendChild(btn);

		// ホイールイベントリスナー（Shadow DOM外の設定）
		modalDiv.addEventListener(
			"wheel",
			function (event) {
				UtilFuncs.MouseWheelListenerFunc(event);
			},
			false
		); // chrome
		modalDiv.addEventListener(
			"mousewheel",
			function (event) {
				UtilFuncs.MouseWheelListenerFunc(event);
			},
			false
		); // chrome
		modalDiv.addEventListener(
			"DOMMouseScroll",
			function (event) {
				UtilFuncs.MouseWheelListenerFunc(event);
			},
			false
		); // firefox

		// Modal divをbodyに追加
		document.getElementsByTagName("body")[0].appendChild(modalDiv);
		return infoDiv;
	}
	/**
	 * @function' や " でエスケープされたcsvの1ラインをパースして配列に格納する関数
	 *
	 * @param {String} csv
	 * @returns {Array}
	 *
	 * @description TODO: utilに移設するほうがよいのでは？
	 */
	parseEscapedCsvLine(csv) {
		// ' や " でエスケープされたcsvの1ラインをパースして配列に格納する。(高級split(","))
		var metaData = csv.split(",");
		for (var j = 0; j < metaData.length; j++) {
			metaData[j] = UtilFuncs.trim(metaData[j]);
			if (metaData[j].indexOf("'") == 0 || metaData[j].indexOf('"') == 0) {
				var countss = 0;
				while (
					metaData[j].substr(metaData[j].length - 1, 1) != "'" &&
					metaData[j].substr(metaData[j].length - 1, 1) != '"'
				) {
					metaData[j] = metaData[j] + "," + metaData[j + 1];
					metaData.splice(j + 1, 1);
					++countss;
					if (countss > 5) {
						break;
					}
				}
				metaData[j] = metaData[j].replace(/['"]/g, "");
			}
		}
		return metaData;
	}
}

export { ShowPoiProperty };
