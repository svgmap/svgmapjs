// Description:
// SVGMapLv0.1_CesiumWrapper_r3.js: SVGMap 3D Visualizer using CesiumJS
// Extension for 3D visualization of display content in svgMap_lv0.1*.js with CesiumJS.
//
//  Programmed by Satoru Takagi
//
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// 2018/02/08 Start coding
// 2018/02/16 レイヤによって色を変化させる
// 2018/02/28 Rev2: POIのバーグラフ化、ビットイメージレイヤー
// 2018/06/25 Rev3: クロージャ化 , 名称変更: svgMapCesiumWrapper
// 2022/08/04-開発中 Rec4: ESM化、window間連携のメッセージ化
//
// ToDo,ISSUES:
// 伸縮スクロールに対する同期表示
// cesium上でクリックしたオブジェクトのプロパティをSVGMap.js側のUIで表示
// 棒グラフ以外の表現
//

import { InterWindowMessaging } from "../InterWindowMessaging.js";

class SvgMapCesiumWrapper {
	constructor(svgMap) {
		this.#svgMapObject = svgMap;
		this.#buildUI();
	}
	#svgMapObject = null;

	#iwmsg; // window間をメッセージングでやり取りするオブジェクト 2022/08/09

	#svg2cesiumBtn1style;
	#svg2cesiumBtn2style;
	#btnDivStyle; // ボタンのスタイルを変えたい人は、この変数にスタイル文字列設定する

	#cesiumWindow;
	#cesiumWindowHtmlLocation;

	#openCesium(callBackFunc) {
		// cesiumのオブジェクトが構築されるのを待ちつつcesiumのwindowをオープンする。 cbfがある場合は、cesiumWindowが準備されたらそれを実行する
		if (!this.#cesiumWindowHtmlLocation) {
			this.#cesiumWindowHtmlLocation = "cesiumWindow2.html";
		}

		console.log("openCesium:");

		if (this.#cesiumWindow) {
			if (this.#cesiumWindow.closed) {
				this.#cesiumWindow = null;
				// delete this.#cesiumWindow;
				this.#openCesium(callBackFunc);
				//			setTimeout( openCesium, 100);
			}
		} else {
			var reldir2imageUrl = new URL(
				this.#svgMapObject.getSvgImagesProps().root.Path,
				window.location
			).pathname;
			reldir2imageUrl = reldir2imageUrl.substring(
				0,
				reldir2imageUrl.lastIndexOf("/") + 1
			);
			this.#cesiumWindow = window.open(
				this.#cesiumWindowHtmlLocation,
				"sub",
				"width=800,height=600"
			);
			this.#iwmsg = new InterWindowMessaging(
				{
					reldir2imageUrl: function () {
						return reldir2imageUrl;
					},
					getCORSURL: function (path) {
						var ans = this.#svgMapObject.getCORSURL(path);
						console.log("getCORSURL:", ans);
						return ans;
					}.bind(this),
				},
				this.#cesiumWindow
			);
		}

		if (callBackFunc) {
			this.#waitBuildCesiumAndCall(callBackFunc);
		}
	}

	async #waitBuildCesiumAndCall(callBackFunc) {
		await this.#iwmsg.getReady();
		callBackFunc();
	}

	#getGeoJson(complex) {
		// 3D可視化ボタンを押したときに最初に呼び出される関数 complex:POIのバーグラフ化を行う
		if (this.#btnDiv & this.#icon3d) {
			this.#hide3dViewBtns();
		}
		this.#svgMapObject.captureGISgeometriesOption(true); // Coverage (ビットイメージ)もキャプチャするフラグを立てる
		console.log(
			"getGeoJson  is cesiumWindow?:",
			this.#cesiumWindow,
			"   is complex:",
			complex
		);
		if (complex == "true") {
			this.#svgMapObject.captureGISgeometries(this.#jsonPropComp);
		} else {
			this.#openCesium();
			this.#svgMapObject.captureGISgeometries(this.#jsonProp);
		}
	}

	#jsonProp = function (json) {
		// SVGMapフレームワークでキャプチャしたgeomrtryデータに対しメタデータを補てんする
		var rootLayerProps = this.#svgMapObject.getRootLayersProps();
		var svgImagesProps = this.#svgMapObject.getSvgImagesProps();
		for (var svgImageId in json) {
			var imageProp = svgImagesProps[svgImageId];
			var rootLayerId = imageProp.rootLayer;
			//		console.log(svgImageId," : rootLayerId:" , rootLayerId , "  rootLayerProps:" , rootLayerProps[rootLayerId] );
			json[svgImageId].layerProps = rootLayerProps[rootLayerId];
		}
		this.#jsonCapture(json);
	}.bind(this);

	#jsonPropComp = function (json) {
		// POIのバーグラフ構築に必要なだけのメタデータを補てんする UI付きの処理
		console.log("called jsonPropComp : json:", json);
		var rootLayerProps = this.#svgMapObject.getRootLayersProps();
		var svgImagesProps = this.#svgMapObject.getSvgImagesProps();
		console.log("svgImagesProps:", svgImagesProps);

		var jLayers = [];
		for (var svgImageId in json) {
			var imageProp = svgImagesProps[svgImageId];
			var rootLayerId = imageProp.rootLayer;
			//		console.log(svgImageId," : rootLayerId:" , rootLayerId , "  rootLayerProps:" , rootLayerProps[rootLayerId] );
			json[svgImageId].layerProps = rootLayerProps[rootLayerId];
			//		console.log("svgImageProp:",imageProp , "   layerProp:",rootLayerProps[rootLayerId], "    js0:",json[svgImageId][0]);
			if (
				rootLayerId &&
				json[svgImageId][0] &&
				json[svgImageId][0].type == "Point"
			) {
				jLayers[rootLayerId] = {
					title: rootLayerProps[rootLayerId].title,
					metaSchema: imageProp.metaSchema.split(","),
				};

				//			console.log("metaSchema:",imageProp.metaSchema)
			}
		}

		//この辺からUIを生成している
		console.log("jLayers:", jLayers);
		var propDiv = document.getElementById("svg2cesiumProp");

		this.#removeChildren(propDiv);

		propDiv.style.display = "";

		var comSpan = document.createElement("span");
		comSpan.innerHTML =
			"Select property of layers which you want to visualize as bar graphs.<br>Note: If you select string property then value should be the length of string....";
		propDiv.appendChild(comSpan);

		var cTbl = document.createElement("table");
		cTbl.id = "extentTable";
		cTbl.border = 1;
		var tr = document.createElement("tr");
		tr.innerHTML =
			"<th>LayerName</th><th>targetProp</th><th>min</th><th>max</th>";
		cTbl.appendChild(tr);

		for (var lId in jLayers) {
			tr = document.createElement("tr");
			var td = document.createElement("td");
			td.innerHTML = jLayers[lId].title;
			tr.appendChild(td);

			td = document.createElement("td");
			var sel = document.createElement("select");
			sel.addEventListener(
				"change",
				function (event) {
					this.#calcExtent(event, json);
				}.bind(this)
			); // この関数を呼ぶことで、選択したプロパティの値域が算出される
			sel.id = "sel_" + lId;
			var opt = document.createElement("option");
			opt.value = "-";
			opt.innerHTML = "-";
			opt.selected = true;
			sel.appendChild(opt);
			for (var i = 0; i < jLayers[lId].metaSchema.length; i++) {
				opt = document.createElement("option");
				opt.value = jLayers[lId].metaSchema[i];
				opt.innerHTML = jLayers[lId].metaSchema[i];
				sel.appendChild(opt);
			}
			td.appendChild(sel);
			tr.appendChild(td);

			var td = document.createElement("td");
			td.innerHTML = "<input type='text' id='min_" + lId + "'  readonly>";
			tr.appendChild(td);
			var td = document.createElement("td");
			td.innerHTML = "<input type='text' id='max_" + lId + "'  readonly>";
			tr.appendChild(td);

			cTbl.appendChild(tr);
		}

		propDiv.appendChild(cTbl);

		var btn = document.createElement("input");
		btn.type = "button";
		btn.value = "view";
		btn.addEventListener(
			"click",
			function (event) {
				this.#jsonPropCompPh2(json);
			}.bind(this)
		); // このボタンを押すことでCESIUMへデータが渡される
		propDiv.appendChild(btn);

		var cancelBtn = document.createElement("input");
		cancelBtn.type = "button";
		cancelBtn.value = "cancel";
		cancelBtn.addEventListener(
			"click",
			function (event) {
				var propDiv = document.getElementById("svg2cesiumProp");
				propDiv.style.display = "none";
			}.bind(this)
		);
		propDiv.appendChild(cancelBtn);
	}.bind(this);

	// POIのバーグラフ化がなされた3D地図画面を起動する
	#jsonPropCompPh2(json) {
		// 手で入力しなおしてる値を投入する実装のやっている途中・・・ 2018.3.16
		var tbl = document.getElementById("extentTable");
		for (var i = 0; i < tbl.rows.length; i++) {
			for (var j = 0; j < tbl.rows[i].cells.length; j++) {
				var cel = tbl.rows[i].cells[j];
				console.log(cel);
			}
		}

		this.#openCesium();
		console.log("jsonPropCompPh2:", json);
		this.#jsonCapture(json);

		var propDiv = document.getElementById("svg2cesiumProp");
		propDiv.style.display = "none";
	}

	// 選択したプロパティの値域算出
	#calcExtent = function (event, json) {
		var targetId = event.target.id.substring(4);
		var sIndex = event.target.selectedIndex - 1;
		//	console.log("called calcExtent:",event, "  tId:",targetId, " sIndex:",sIndex,"   json:",json);

		var valMin = 9e99;
		var valMax = -9e99;
		for (var lid in json) {
			//		console.log("json[lid].layerProps:",json[lid]);
			if (
				json[lid].layerProps &&
				json[lid].layerProps.svgImageProps.rootLayer == targetId
			) {
				//			console.log("target found");
				for (var i = 0; i < json[lid].length; i++) {
					if (sIndex < 0) {
						delete json[lid][i].mainValue;
					} else {
						if (json[lid][i].type == "Point") {
							try {
								//							console.log("poi:",json[lid][i]);
								var meta = "";
								if (
									json[lid][i].usedParent &&
									json[lid][i].usedParent.getAttribute("content")
								) {
									meta = json[lid][i].usedParent
										.getAttribute("content")
										.split(",")[sIndex];
								} else {
									meta = json[lid][i].src.getAttribute("content").split(",")[
										sIndex
									];
								}
								//							console.log("meta:",meta, "   numb of meta:", Number(meta));
								var numMeta = Number(meta);
								if (isNaN(numMeta)) {
									numMeta = meta.length; // 文字列の長さ・・・・　うわぁ
									valMin = Math.min(valMin, numMeta);
									valMax = Math.max(valMax, numMeta);
								} else {
									valMin = Math.min(valMin, numMeta);
									valMax = Math.max(valMax, numMeta);
								}
								json[lid][i].mainValue = numMeta;
							} catch (e) {
								// do nothing
							}
						}
					}
				}
			}
		}
		if (sIndex < 0) {
			document.getElementById("min_" + targetId).value = "";
			document.getElementById("max_" + targetId).value = "";
			delete json[targetId].mainValueMin;
			delete json[targetId].mainValueMax;
		} else {
			document.getElementById("min_" + targetId).value = valMin;
			document.getElementById("max_" + targetId).value = valMax;
			json[targetId].mainValueMin = valMin;
			json[targetId].mainValueMax = valMax;
			console.log("min,max,id", valMin, valMax, targetId);
		}
	}.bind(this);

	#fixJsonObj(json) {
		// 配列に任意のメンバー追加している無作法を修正する・・・
		var ans = {};
		for (var lid in json) {
			ans[lid] = {};
			if (json[lid].length > 0) {
				ans[lid].geometry = [];
				for (var i = 0; i < json[lid].length; i++) {
					var geomObj = {};
					for (var gk in json[lid][i]) {
						if (gk == "src") {
							geomObj[gk] = {
								title: json[lid][i][gk].getAttribute("xlink:title"),
							};
						} else {
							geomObj[gk] = json[lid][i][gk];
						}
					}
					//					ans[lid].geometry.push(json[lid][i]);
					ans[lid].geometry.push(geomObj);
				}
			}
			if (json[lid].layerProps) {
				ans[lid].layerProps = {};
				console.log(lid, json[lid], json[lid].layerProps);
				ans[lid].layerProps.id = json[lid].layerProps.id;
				ans[lid].layerProps.title = json[lid].layerProps.title;
				ans[lid].layerProps.groupName = json[lid].layerProps.groupName;
				ans[lid].layerProps.svgImageProps = {
					rootLayer: json[lid].layerProps.svgImageProps.rootLayer,
				};
			}
			if (json[lid].mainValueMin) {
				ans[lid].mainValueMin = json[lid].mainValueMin;
				ans[lid].mainValueMax = json[lid].mainValueMax;
			}
		}
		console.log("fixJsonObj:", ans);
		return ans;
	}

	// CESIUM画面の生成を待って、CESIUMにgeometryデータを送信、描画を指示する
	async #jsonCapture(json) {
		var viewBox = this.#svgMapObject.getGeoViewBox();
		console.log("jsonCapture:", json);
		//	console.log("cesiumWindow:",cesiumWindow, cesiumWindow.viewGeoJson);
		if (!this.#cesiumWindow) {
			console.warn("NO cesiumWindow exit.");
		}
		await this.#iwmsg.getReady();
		await this.#iwmsg.callRemoteFunc("viewGeoJson", [
			this.#fixJsonObj(json),
			viewBox,
		]);

		/**
		if ( this.#cesiumWindow && this.#cesiumWindow.viewGeoJson ){
			console.log("launch cesiumWindow : json: ",json);
			setTimeout(function(){ this.#cesiumWindow.viewGeoJson(json,viewBox);}.bind(this),200); // これをリファクタリングする！
		} else {
			console.log("wait building cesiumWindow");
			setTimeout(function(){ this.#jsonCapture(json)}.bind(this),200);
		}
		**/
	}

	#removeChildren(targetElem) {
		for (var i = targetElem.childNodes.length - 1; i >= 0; i--) {
			targetElem.removeChild(targetElem.childNodes[i]);
		}
	}

	#show3dViewBtns = function () {
		this.#btnDiv.style.display = "";
	}.bind(this);
	#hide3dViewBtns = function () {
		this.#btnDiv.style.display = "none";
	}.bind(this);

	#btnDiv;
	#icon3d;
	#buildUI() {
		// CESIUM起動用のボタンやパラメータ設定用UIの土台を設置する loadで起動

		this.#icon3d = document.getElementById("3DviewButton");
		if (this.#icon3d) {
			if (this.#icon3d.getAttribute("data-app")) {
				this.#cesiumWindowHtmlLocation = this.#icon3d.getAttribute("data-app");
				console.log(
					"set cesiumWindowHtmlLocation:",
					this.#cesiumWindowHtmlLocation
				);
			}
			if (!this.#icon3d.title) {
				this.#icon3d.title = "View 3D Map";
			}

			var posStyle = "top:200px";
			if (this.#icon3d.style.top) {
				posStyle = `top:${this.#icon3d.style.top}`;
			} else if (this.#icon3d.style.bottom) {
				posStyle = `bottom:${this.#icon3d.style.bottom}`;
			}
			if (this.#icon3d.style.left) {
				posStyle += `;left:${this.#icon3d.style.left}`;
			} else if (this.#icon3d.style.right) {
				posStyle += `;right:${this.#icon3d.style.right}`;
			} else {
				posStyle += `;left:2px`;
			}
			//		icon3d.setAttribute("onclick","show3dViewBtns()");
			this.#icon3d.addEventListener("click", this.#show3dViewBtns);
			this.#svg2cesiumBtn1style = "left :0px; top:0px; position: relative";
			this.#svg2cesiumBtn2style = "left :0px; top:0px; position: relative";
			this.#btnDivStyle =
				posStyle +
				"; position:absolute;display:none;z-index:1000;background-color : #AAEEDD";
		} else {
			return; // this.#icon3dがない場合は、3D機能を発動できないようにする。　2024/08/29
			//			this.#btnDivStyle = "right:2px;top:145px; position:absolute;width:140px;";
		}

		if (!this.#svg2cesiumBtn1style) {
			this.#svg2cesiumBtn1style = "right :0px; top: 0px; position: relative";
		}
		if (!this.#svg2cesiumBtn2style) {
			this.#svg2cesiumBtn2style = "right :0px; top: 0px; position: relative";
		}

		// 2個の3Dボタンを入れるdiv
		this.#btnDiv = document.createElement("div");
		this.#btnDiv.id = "3dViewBtns";
		this.#btnDiv.setAttribute("style", this.#btnDivStyle);

		// シンプルな3D化ボタン
		/**
		console.log(
			"buildUI : style1,2:",
			this.#svg2cesiumBtn1style,
			this.#svg2cesiumBtn2style
		);
		**/
		var cButton1 = document.createElement("input");
		cButton1.id = "svg2cesiumBtn1";
		cButton1.type = "button";
		cButton1.value = "Simple 3D view";

		cButton1.addEventListener(
			"click",
			function () {
				this.#getGeoJson();
			}.bind(this)
		);
		cButton1.setAttribute("style", this.#svg2cesiumBtn1style);

		// POIのバーグラフ生成を行う3D化ボタン
		var cButton2 = document.createElement("input");
		cButton2.id = "svg2cesiumBtn2";
		cButton2.type = "button";
		cButton2.value = "Complex 3D view";
		cButton2.addEventListener(
			"click",
			function () {
				this.#getGeoJson("true");
			}.bind(this)
		);
		cButton2.setAttribute("style", this.#svg2cesiumBtn2style);

		//
		var xBtn = document.createElement("input");
		xBtn.addEventListener("click", this.#hide3dViewBtns);
		xBtn.type = "button";
		xBtn.value = "x";

		this.#btnDiv.appendChild(cButton1);
		this.#btnDiv.appendChild(cButton2);
		if (this.#icon3d) {
			this.#btnDiv.appendChild(xBtn);
		}

		// POIのバーグラフ生成のためのパラメータ設定UI用のDIV
		var cpDiv = document.createElement("div");
		cpDiv.id = "svg2cesiumProp";
		cpDiv.setAttribute(
			"style",
			"left :80px; top: 80px; position: absolute; background-color: white;opacity:0.8;display:none;z-index:1000"
		);

		document.body.appendChild(this.#btnDiv);
		document.body.appendChild(cpDiv);
	}

	/**
	return { // svgMapCesiumWrapper. で公開する関数のリスト
		openCesium: openCesium,
		visualizeCurrentSvgMap: getGeoJson,
		getCesiumWindow : function (){
			return ( cesiumWindow );
		},
		setCesiumWindowHtmlLocation : function( path ){
			cesiumWindowHtmlLocation = path;
			console.log("cesiumWindowHtmlLocation:",cesiumWindowHtmlLocation);
		}
	}
	**/
}

export { SvgMapCesiumWrapper };
