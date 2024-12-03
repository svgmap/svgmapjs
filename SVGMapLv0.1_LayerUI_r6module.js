//
// Description:
// SVGMap Standard LayerUI2 for SVGMapLv0.1 >rev17
//
//  Programmed by Satoru Takagi
//
//  Copyright (C) 2016-2021 by Satoru Takagi @ KDDI CORPORATION
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
// 2016/10/14 : svgMapLayerUI2 Rev.1 : SVGMapLvl0.1_r12の新機能を実装する全く新しいUIを再構築開始 まだ全然粗削りです。
// 2016/10/14 : JQueryUI/multiselectを切り離してスクラッチで構築
// 2016/10/14 : グループで折りたたむ機能、リストを広げたまま他の作業が行える機能
// 2016/10/14 : レイヤー固有のGUIを提供するフレームワーク data-controller 属性で、レイヤー固有UIのリンクを記載(html||bitImage)
// 2016/10/17 : レイヤー固有UI(iframe)に、zoomPanMap イベントを配信
// 2016/10/28 : Rev.2: classをいろいろ付けた。フレームワーク化
// 2016/11/15 : レイヤリスト、レイヤ固有UIともに、内容のサイズに応じて縦長さを可変に（まだ不完全かも）
// 2016/11/15 : レイヤリストのグループに配下で表示しているレイヤの個数を表示
// 2016/12/?  : GIS Tools Support
// 2016/12/19 : Authoring Tools Support
// 2017/01/27 : レイヤ固有UIのリサイズメカニズムを拡張。 data-controllerに、#requiredHeight=hhh&requiredWidth=www　を入れるとできるだけそれを提供する
// 2017/02/17 : レイヤ固有UIのクローズボタン位置の微調整
// 2017/02/21 : svg文書のdata-controller-srcに直接レイヤ固有UIのhtmlを書ける機能を拡張。requiredWidth/Heightについてはdata-controllerに#から始まる記法で書くことで対応
// 2017/03/02 : Rev.3: レイヤーのOffに連動して、レイヤ固有UIのインスタンスが消滅する処理など、レイヤ固有UIのインスタンス管理に矛盾が生じないようにする。レイヤ固有UIインスタンスはレイヤーがvisibleである限り存続する(他のレイヤの固有UIが出現しても隠れるだけで消えない。消えるタイミングはレイヤがinvisibleになった時。またこの時はcloseFrameイベントが発行され、100ms後にインスタンスが消滅する。
// 2017/08/25 : 凡例（画像）表示時においてサイズ未指定の場合は元画像のサイズでフレームをリサイズする様追加
// 2017/09/08 : data-controllerに、#exec=appearOnLayerLoad,hiddenOnLayerLoad,onClick(default)
// 2018/04/02 : layerListmessage に選択レイヤ名称をtextで設定する処理を追加
// 2019/02/19 : ^>v等のボタンをビットイメージ化　wheel系イベントをモダンに
// 2019/11/26 : CORSがあれば、別ドメインのレイヤーでもLayerUIframeが動作できるようになった（かも）
// 2019/12/05 : SVGMap.jsのグローバルエリア"globalMesasge" span要素がある場合、そこに(調停付きで)レイヤー固有UIframeからメッセージを出せるフレームワーク putGlobalMessage()
// 2020/06/09 : レイヤ固有UIiframeのscriptに、preRenderFunction　という名の関数があると、そのレイヤーの描画前(svgの<script>要素のonzoom,onscroll関数と同じタイミング)に同期的に呼び出される。
// 2020/10/13 : svgImagesProps[layerID]に.controllerWindowを追加
// 2020/12/08 : hiddenOnLayerLoad(内部変数hiddenOnLaunch)が複数あった場合にロジックが破綻していたのを修正
// 2020/11/17-: id:layerList,layerSpecificUIの要素がなかった時ちゃんと動くようにケアした後(特にlayerSpecificUIは今や動的レイヤーで必須の要素化しているので)、layerSpecificUIを別で指定できるようにしたい
//              checkLayerListAndRegistLayerUIがid;layerList要素がないときでも動くようにした (checkControllerを発動させている)
//              checkControllerなどでshowLayerSpecificUIが発動する。次はこれをid:layerSpecificUIがないケースでも動くようにする
// 2021/03/09 : Rev.4: 2020/11-2020/12のSVGMapFrame用の改修を導入し、SVGMapCustomLayersManagerの起動機能を実装 (#layerList data-customizerで、カスタマイザを指定するとそれを起動するボタンが出現)
// 2021/06/17 : レイヤ固有UIでloadイベント時にSVGMapフレームワークがセットされるように
// 2021/06/22 : zoomPanMapCompletedイベントを実装。レイヤ固有UIでzoomPanMapイベント後 独自のXHRによりデータの取得＆描画更新が行われるようなケースでも、その読み込み完了を検知後に発行するイベント。
// 2021/09/22 : lauerUIwindowsに.setLoadingFlag(): 非同期処理中を知らせるフラグを明示的にセット・解除可能に
// 2021/10/29 : setRootLayersPropsで設定する限り(rootSvgのDOM直編集をしない限り)svgMap.updateLayerTableを呼ばなくても問題が起きないように(initLayerList(initOptions) > rev17 core svgMap)
// 2022/03/08-: コアFWとともに、svgImagesProps[].controllerを構造化、*.svgScript導入しlsUIで実行、従来型*.scriptを廃止
// 2022/05/31 : ESM, Class化
// 2023/07/25 : Firefoxの最新版では、力業のiFrameReady()がDOMContentLoadedタイミングをつかんだ処理ができないケースが多い、そこでloadイベント処理のリトライを行うルーチンを入れた（この実装までにかなりの試行錯誤があった）
// 2023/08/24 : ↑の問題がChromeでも起きる環境があることが判明。iframeのhtmlのキャッシュを無効化することで対応。そろそろ仕様変更などの本質的な対策が求められる。
// 2023/12-     : Rev6 レイヤーUIと、レイヤーwebAppハンドラの切り離し、＆レイヤUIとレイヤ制御の切り離し

// ISSUES, ToDo:
// 2021/10/14 rootsvgのDOM直編集ではupdateLayerTableが反映されるタイミングが直にない～updateLayerTableを多数呼びたくない理由は、LayerListTableの後進にオーバヘッドがかかるから　なので、それをせずにならば(例えばrefreshScreen毎に)いくら呼んでも気にならないはず
//
// (PARTIALLY FIXED) 2021/10/13 updateLayerTableを呼ばないとlayerUIframeがレイヤON/OFF状態とシンクロしない
// (FIXED?) IE,Edgeでdata-controller-src動作しない
//  レイヤ固有UIを別ウィンドウ化できる機能があったほうが良いかも
//   ただしこの機能は新たなcontextを生成する形でないと実装できないようです。
//   See also: http://stackoverflow.com/questions/8318264/how-to-move-an-iframe-in-the-dom-without-losing-its-state
//  (FIXED? 2017.9.8) レイヤUI表示ボタンが時々表示されない時がある (少なくとも一か所課題を発見し修正。本体も改修(getRootLayersProps))
//  zoomPanMapCompletedは、fetchとXHRだけを見ているが、IndexedDBやworkerも見るようにすべき

import { BuiltinIcons } from "./libs/BuiltinIcons.js";
import { UtilFuncs } from "./libs/UtilFuncs.js";

class SvgMapLayerUI {
	#layerList;
	//#uiOpen; //ないかも
	#layerTableDiv;
	#uiOpened;
	#layerGroupStatus; // layerGroupStatusは今はグループ折り畳み状態のみ管理
	//#layerSpecificUI; // layerSpecificUIの要素
	#svgMap;
	#layerSpecificWebAppHandler;
	#layersCustomizer;

	#layerListMaxHeightStyle;
	#layerListMaxHeight;
	#layerListFoldedHeight;

	#layerListmessageHead = "Layer List: ";
	#layerListmessageFoot = " layers visible";

	constructor(svgMapObj, layerSpecificWebAppHandlerObj) {
		this.#svgMap = svgMapObj;
		svgMapObj.registLayerUiSetter(
			// この関数の呼び出しは必須
			// 第一引数に、起動時に一回だけ呼ばれる初期化関数を設置
			function (opt) {
				this.#initLayerList(opt);
			}.bind(this),
			// 第二引数に、レイヤーリストUIを更新する関数を設置
			function () {
				this.#updateLayerTable();
			}.bind(this)
		);
		this.#layerSpecificWebAppHandler = layerSpecificWebAppHandlerObj;
		console.log("construct layerUI:");
	}

	#updateLayerTable() {
		var tb = document.getElementById("layerTable");
		var lps = this.#svgMap.getRootLayersProps();
		if (tb) {
			var ltst = this.#layerTableDiv.scrollTop;
			this.#removeAllLayerItems(tb);
			this.#setLayerTable(tb, lps);
			this.#layerTableDiv.scrollTop = ltst;
		}

		// レイヤー固有UIの状態を更新(レイヤーリストUIのレイヤー固有UI表示をsetLayerSpecificWebAppLaunchUiEnable経由での更新を含む)
		// この関数はレイヤー固有UIの整合性を取るため、レイヤーの表示状態変更時に呼び出しが必要
		this.#layerSpecificWebAppHandler.updateLayerSpecificWebAppHandler();
	}

	#layerListOpenClose() {
		var uiOpenBtn = document.getElementById("layerListOpenButton");
		console.log("layerListOpenClose");
		this.#layerTableDiv = document.getElementById("layerTableDiv");
		if (this.#layerList.style.height == this.#layerListFoldedHeight + "px") {
			// layer list is colsed
			this.#updateLayerTable();
			this.#layerList.style.height = this.#layerListMaxHeightStyle;
			uiOpenBtn.firstChild.src = BuiltinIcons.UTpng;
			this.#layerTableDiv.style.display = "";
			this.#uiOpened = true;
		} else {
			// opened
			this.#layerList.style.height = this.#layerListFoldedHeight + "px";
			uiOpenBtn.firstChild.src = BuiltinIcons.DTpng;
			this.#layerTableDiv.style.display = "none";
			this.#uiOpened = false;
		}
	}

	#getGroupFoldingStatus(groupName) {
		// グループ折り畳み状況回答
		var gfolded;
		if (this.#layerGroupStatus[groupName]) {
			// グループ折り畳み状態を得る[デフォルトはopen]
			gfolded = this.#layerGroupStatus[groupName];
		} else {
			gfolded = false;
			this.#layerGroupStatus[groupName] = gfolded;
		}
		return gfolded;
	}

	#setLayerTable(tb, layerProps) {
		//	console.log("call setLayerTable:",tb);
		var groups = new Object(); // ハッシュ名のグループの最後のtr項目を収めている
		var lps;
		if (!lps) {
			lps = this.#svgMap.getRootLayersProps();
		} else {
			lps = layerProps;
		}
		//	console.log(lps);
		var visibleLayers = 0;
		var visibleLayersNameArray = [];
		const visibleNum = 5; // 表示レイヤ名称数
		for (var i = lps.length - 1; i >= 0; i--) {
			var tr = this.#getLayerTR(
				lps[i].title,
				lps[i].id,
				lps[i].visible,
				false,
				lps[i].groupName
			);
			if (lps[i].groupName) {
				// グループがある場合の処理

				var gfolded = this.#getGroupFoldingStatus(lps[i].groupName); // グループ折り畳み状況獲得

				if (groups[lps[i].groupName]) {
					// すでにグループが記載されている場合
					//そのグループの最後の項目として追加
					var lastGroupMember = groups[lps[i].groupName];
					if (!gfolded) {
						tb.insertBefore(tr, lastGroupMember.nextSibling);
					}
					groups[lps[i].groupName] = tr;
				} else {
					// 新しくグループ用trを生成・項目追加
					var groupTr = this.#getGroupTR(lps[i], gfolded);
					tb.appendChild(groupTr);
					// その後にレイヤー項目を追加
					groups[lps[i].groupName] = tr;
					if (!gfolded) {
						tb.appendChild(tr);
					}
				}
				if (lps[i].visible) {
					this.#incrementGcountLabel(lps[i].groupName);
				}
			} else {
				// グループに属さない場合、単に項目追加
				tb.appendChild(tr);
			}
			if (lps[i].visible) {
				++visibleLayers;
				if (visibleLayers <= visibleNum) {
					visibleLayersNameArray.push(lps[i].title);
				} else if (visibleLayers == visibleNum + 1) {
					visibleLayersNameArray.push("...");
				}
			}
		}
		document.getElementById("layerListmessage").innerHTML =
			this.#layerListmessageHead + visibleLayers + this.#layerListmessageFoot;
		document.getElementById("layerListmessage").title = visibleLayersNameArray;
		window.setTimeout(
			function () {
				this.#setLayerTableStep2();
			}.bind(this),
			30
		);
	}

	#setLayerListmessage(head, foot) {
		// added 2018.2.6
		this.#layerListmessageHead = head;
		this.#layerListmessageFoot = foot;
		/**
		if ( document.getElementById("layerListmessage")){
			document.getElementById("layerListmessage").innerHTML = layerListmessageHead + visibleLayers + layerListmessageFoot;
		}
		**/
	}

	#setLayerTableStep2() {
		var tableHeight = document.getElementById("layerTable").offsetHeight;
		if (tableHeight == 0) {
			// patch 2020/10/28 (レイヤリスト閉じているときにレイヤ追加されたりしてupdateLayerTableすると2クリックしないと開かない微妙な不具合)
			return;
		}
		//	console.log(tableHeight, layerListMaxHeight , layerListFoldedHeight , layerListMaxHeightStyle );
		if (
			tableHeight <
			this.#layerListMaxHeight - this.#layerListFoldedHeight - 2
		) {
			this.#layerList.style.height =
				tableHeight + this.#layerListFoldedHeight + 2 + "px";
			console.log("reorder:", this.#layerList.style.height);
		} else {
			this.#layerList.style.height = this.#layerListMaxHeightStyle;
			//		layerListMaxHeight = layerList.offsetHeight;
		}
	}

	#incrementGcountLabel(groupName) {
		var gcLabel = document.getElementById("gc_" + groupName);
		var gcTxtNode = gcLabel.childNodes.item(0);
		var gCount = Number(gcTxtNode.nodeValue) + 1;
		//	console.log(groupName,gcTxtNode,gcTxtNode.nodeValue,gCount);
		gcTxtNode.nodeValue = gCount;
	}

	#getLayerTR(title, id, visible, hasLayerList, groupName) {
		var tr = document.createElement("tr");
		tr.id = "layerList_" + id;
		if (groupName) {
			tr.dataset.group = groupName;
			tr.className = "layerItem";
		} else {
			tr.className = "layerItem noGroup";
		}
		var cbid = "cb_" + id; // id for each layer's check box
		var btid = "bt_" + id; // id for each button for layer specific UI
		var ck = "";

		// レイヤラベルおよびオンオフチェックボックス生成.
		// checkBox
		var lcbtd = document.createElement("td");
		var lcb = document.createElement("input");
		lcb.className = "layerCheck";
		lcb.type = "checkBox";
		lcb.id = cbid;
		if (visible) {
			lcb.checked = true;
			tr.style.fontWeight = "bold"; // bold style for All TR elem.
		}
		lcb.addEventListener(
			"change",
			function (event) {
				this.#toggleLayer(event);
			}.bind(this)
		);
		lcbtd.appendChild(lcb);
		tr.appendChild(lcbtd);
		// label
		var labeltd = document.createElement("td");
		labeltd.setAttribute("colspan", "3");
		labeltd.style.overflow = "hidden";
		var label = document.createElement("label");
		label.title = title;
		label.setAttribute("for", cbid);
		label.className = "layerLabel";
		label.innerHTML = title;
		labeltd.appendChild(label);
		tr.appendChild(labeltd);

		// レイヤ固有UIのボタン生成
		var td = document.createElement("td");
		var btn = document.createElement("button");
		btn.innerHTML =
			"<img style='pointer-events: none;' src='" + BuiltinIcons.RTpng + "'>";
		//	btn.type="button";
		btn.className = "layerUiButton";
		btn.id = btid;
		//	btn.value=">";
		//	btn.setAttribute("onClick","svgMapLayerUI.showLayerSpecificUI(event)");
		btn.addEventListener(
			"click",
			function (event) {
				var layerId = this.#getLayerId(event);
				var lsUiUrl = event.target.dataset.url;
				this.#layerSpecificWebAppHandler.showLayerSpecificUI(layerId, lsUiUrl); // hiddenもcbfも不要でレイヤ固有UI表示
			}.bind(this),
			false
		);
		if (visible) {
			btn.disabled = false;
		} else {
			btn.disabled = true;
		}
		if (!hasLayerList) {
			btn.style.visibility = "hidden";
		}

		td.appendChild(btn);
		tr.appendChild(td);

		return tr;
	}

	#setLayerSpecificWebAppLaunchUiEnable(layerId, controllerURL) {
		console.log("setLayerSpecificWebAppLaunchUiEnable:", layerId);
		var ctbtn = document.getElementById("bt_" + layerId);
		if (ctbtn) {
			// グループが閉じられている場合などにはボタンがないので
			ctbtn.style.visibility = "visible";
			ctbtn.dataset.url = controllerURL;
		} else {
			console.log(
				"Could not find launcher button: setLayerSpecificWebAppLaunchUiEnable:",
				layerId
			);
		}
	}

	#getGroupTR(lp, gfolded) {
		// グループ項目を生成する

		var groupTr = document.createElement("tr");
		groupTr.dataset.group = lp.groupName;
		groupTr.className = "groupItem";
		groupTr.style.width = "100%";
		groupTr.id = "gtr_" + lp.groupName;
		var isBatchGroup = false;

		// グループのラベル
		var groupTD = document.createElement("td");
		groupTD.style.fontWeight = "bold";
		groupTD.setAttribute("colspan", "3");
		groupTD.className = "groupLabel";
		groupTD.style.overflow = "hidden";

		var groupTDlabel = document.createElement("label");
		groupTDlabel.title = lp.groupName;
		var gbid = "gb_" + lp.groupName; // for fold checkbox
		groupTDlabel.setAttribute("for", gbid);

		var gLabel = document.createTextNode("[" + lp.groupName + "]");
		groupTDlabel.appendChild(gLabel);
		groupTD.appendChild(groupTDlabel);

		// グループの所属メンバー数
		var groupCountTD = document.createElement("td");
		groupCountTD.className = "groupLabel";
		//	groupCountTD.style.overflow="hidden";
		groupCountTD.align = "right";

		var groupCountlabel = document.createElement("label");
		groupCountlabel.id = "gc_" + lp.groupName;

		groupCountlabel.setAttribute("for", gbid);

		var gCount = document.createTextNode("0");
		groupCountlabel.appendChild(gCount);
		groupCountTD.appendChild(groupCountlabel);

		// バッチチェックボックス
		var bid = "";
		if (lp.groupFeature == "batch") {
			groupTD.setAttribute("colspan", "2");
			var batchCheckBoxTd = document.createElement("td");

			isBatchGroup = true;
			bid = "ba_" + lp.groupName;

			var batchCheckBox = document.createElement("input");
			batchCheckBox.type = "checkBox";
			batchCheckBox.id = bid;
			batchCheckBox.addEventListener(
				"change",
				function (event) {
					this.#toggleBatch(event);
				}.bind(this),
				false
			);

			batchCheckBoxTd.appendChild(batchCheckBox);

			//		groupTD.appendChild(batchCheckBox);
			if (lp.visible) {
				batchCheckBox.checked = "true";
			}
			groupTr.appendChild(groupTD);
			groupTr.appendChild(groupCountTD);
			groupTr.appendChild(batchCheckBoxTd);
		} else {
			groupTr.appendChild(groupTD);
			groupTr.appendChild(groupCountTD);
		}

		// group fold button
		var foldTd = document.createElement("td");
		var foldButton = document.createElement("button");
		foldButton.id = gbid;
		//	foldButton.type="button";
		foldButton.addEventListener(
			"click",
			function (event) {
				this.#toggleGroupFold(event);
			}.bind(this),
			false
		);
		if (!gfolded) {
			foldButton.innerHTML =
				"<img style='pointer-events: none;' src='" + BuiltinIcons.UTpng + "'>";
		} else {
			foldButton.innerHTML =
				"<img style='pointer-events: none;' src='" + BuiltinIcons.DTpng + "'>";
		}
		foldTd.appendChild(foldButton);
		groupTr.appendChild(foldTd);

		return groupTr;
	}

	#removeAllLayerItems(tb) {
		for (var i = tb.childNodes.length - 1; i >= 0; i--) {
			tb.removeChild(tb.childNodes[i]);
		}
		tb.appendChild(this.#getColgroup());
	}

	#getLayerId(layerEvent) {
		console.log(layerEvent);
		var lid = layerEvent.target.id.substring(3);
		return lid;
	}

	#toggleLayer(e) {
		var lid = this.#getLayerId(e);
		console.log("this:", this);
		//	console.log("call toggle Layer",e.target.id,e.target.checked,lid);
		this.#svgMap.setRootLayersProps(lid, e.target.checked, false);

		// 後でアイテム消さないように効率化したい・・ (refreshLayerTable..)
		this.#svgMap.refreshScreen();
	}

	#toggleBatch(e) {
		var lid = this.#getLayerId(e);
		//	console.log("call toggle Batch",e.target.id,e.target.checked,lid);
		var batchLayers = this.#svgMap.getSwLayers("batch");
		//	console.log("this ID might be a batch gruop. :"+ lid,batchLayers);

		//	svgMap.setRootLayersProps(lid, e.target.checked , false );

		// ひとつでもhiddenのレイヤーがあれば全部visibleにする
		var bVisibility = "hidden";
		for (var i = 0; i < batchLayers[lid].length; i++) {
			if (batchLayers[lid][i].getAttribute("visibility") == "hidden") {
				bVisibility = "visible";
				break;
			}
		}
		for (var i = 0; i < batchLayers[lid].length; i++) {
			batchLayers[lid][i].setAttribute("visibility", bVisibility);
		}

		// 後でアイテム消さないように効率化する・・ (refreshLayerTable..)
		this.#updateLayerTable(); // こちらはDOM直接操作しているので必要
		this.#svgMap.refreshScreen();
	}

	#initLayerList(initOptions) {
		if (initOptions) {
			// obsoluted
			/**
			if (initOptions.updateLayerListUITiming){
				this.#updateLayerListUITiming = initOptions.updateLayerListUITiming;
			}
			**/
		}
		//	console.log("CALLED initLayerList");
		this.#layerGroupStatus = new Object();
		this.#layerList = document.getElementById("layerList");
		//	console.log("ADD EVT");

		var llUItop;
		if (this.#layerList) {
			this.#layerList.addEventListener(
				"wheel",
				function (event) {
					UtilFuncs.MouseWheelListenerFunc(event);
				}.bind(this),
				false
			); // added 2019/04/15
			this.#layerList.addEventListener(
				"mousewheel",
				function (event) {
					UtilFuncs.MouseWheelListenerFunc(event);
				}.bind(this),
				false
			);
			this.#layerList.addEventListener(
				"DOMMouseScroll",
				function (event) {
					UtilFuncs.MouseWheelListenerFunc(event);
				}.bind(this),
				false
			);
			this.#layerList.style.zIndex = "20";
			this.#layerListMaxHeightStyle = this.#layerList.style.height;
			var lps = this.#svgMap.getRootLayersProps();
			var visibleLayers = 0;
			var visibleLayersNameArray = [];
			const visibleNum = 5; // 表示レイヤ名称数
			for (var i = lps.length - 1; i >= 0; i--) {
				if (lps[i].visible) {
					++visibleLayers;
					if (visibleLayers <= visibleNum) {
						visibleLayersNameArray.push(lps[i].title);
					} else if (visibleLayers == visibleNum + 1) {
						visibleLayersNameArray.push("...");
					}
				}
			}

			llUItop = document.createElement("div");

			var llUIlabel = document.createElement("label");
			llUIlabel.id = "layerListmessage";
			llUIlabel.setAttribute("for", "layerListOpenButton");
			llUIlabel.setAttribute("title", visibleLayersNameArray);
			//	layerList.appendChild(llUIlabel);
			llUItop.appendChild(llUIlabel);

			var llUIbutton = document.createElement("button");
			llUIbutton.id = "layerListOpenButton";
			//	llUIbutton.type="button";
			llUIbutton.innerHTML =
				"<img style='pointer-events: none;' src='" + BuiltinIcons.DTpng + "'>";
			llUIbutton.style.position = "absolute";
			llUIbutton.style.right = "0px";
			llUIbutton.addEventListener(
				"click",
				function (event) {
					this.#layerListOpenClose(event);
				}.bind(this)
			);
			//	layerList.appendChild(llUIbutton);
			llUItop.appendChild(llUIbutton);

			var layersCustomizerPath =
				this.#layerList.getAttribute("data-customizer");
			if (layersCustomizerPath) {
				var layersCustomizerIcon = document.createElement("img");
				layersCustomizerIcon.src = BuiltinIcons.hamburger;
				layersCustomizerIcon.style.position = "absolute";
				layersCustomizerIcon.style.right = "35px";
				layersCustomizerIcon.style.cursor = "pointer";
				llUItop.appendChild(layersCustomizerIcon);
				layersCustomizerIcon.addEventListener(
					"click",
					function (event) {
						this.#layersCustomizer = window.open(
							layersCustomizerPath,
							"layersCustomizer",
							"toolbar=yes,menubar=yes,scrollbars=yes"
						);
					}.bind(this)
				);
			}

			this.#layerList.appendChild(llUItop);

			var llUIdiv = document.createElement("div");
			this.#layerTableDiv = llUIdiv;
			llUIdiv.id = "layerTableDiv";
			llUIdiv.style.width = "100%";
			llUIdiv.style.height = "100%";
			llUIdiv.style.overflowY = "scroll";
			llUIdiv.style.display = "none";

			this.#layerList.appendChild(llUIdiv);

			var llUItable = document.createElement("table");
			llUItable.id = "layerTable";
			llUItable.setAttribute("border", "0");
			llUItable.style.width = "100%";
			llUItable.style.tableLayout = "fixed";
			llUItable.style.whiteSpace = "nowrap";

			llUItable.appendChild(this.#getColgroup());

			llUIdiv.appendChild(llUItable);

			llUIlabel.innerHTML =
				this.#layerListmessageHead + visibleLayers + this.#layerListmessageFoot;
		}
		window.setTimeout(
			function (llUItop) {
				this.#initLayerListStep2(llUItop);
			}.bind(this),
			30,
			llUItop
		);
	}

	#initLayerListStep2(llUItop) {
		// レイヤリストのレイアウト待ち後サイズを決める　もうちょっとスマートな方法ないのかな・・
		if (llUItop) {
			this.#layerListFoldedHeight = llUItop.offsetHeight;

			if (this.#layerList.offsetHeight < 60) {
				this.#layerListMaxHeightStyle = "90%";
			}

			this.#layerListMaxHeight = this.#layerList.offsetHeight;

			//	console.log("LL dim:",layerListMaxHeightStyle,layerListFoldedHeight);

			this.#layerList.style.height = this.#layerListFoldedHeight + "px";
		}
	}

	#getColgroup() {
		var llUIcolgroup = document.createElement("colgroup");

		var llUIcol1 = document.createElement("col");
		llUIcol1.setAttribute("spanr", "1");
		llUIcol1.style.width = "25px";
		var llUIcol2 = document.createElement("col");
		llUIcol2.setAttribute("spanr", "1");
		var llUIcol3 = document.createElement("col");
		llUIcol3.setAttribute("spanr", "1");
		llUIcol3.style.width = "25px";
		var llUIcol4 = document.createElement("col");
		llUIcol4.setAttribute("spanr", "1");
		llUIcol4.style.width = "25px";
		var llUIcol5 = document.createElement("col");
		llUIcol5.setAttribute("spanr", "1");
		llUIcol5.style.width = "30px";

		llUIcolgroup.appendChild(llUIcol1);
		llUIcolgroup.appendChild(llUIcol2);
		llUIcolgroup.appendChild(llUIcol3);
		llUIcolgroup.appendChild(llUIcol4);
		llUIcolgroup.appendChild(llUIcol5);

		return llUIcolgroup;
	}

	#toggleGroupFold(e) {
		var lid = this.#getLayerId(e);
		//	console.log("call toggle Group Hidden",e.target.id,e.target.checked,lid);
		if (this.#layerGroupStatus[lid]) {
			this.#layerGroupStatus[lid] = false;
		} else {
			this.#layerGroupStatus[lid] = true;
		}
		this.#updateLayerTable();
	}

	// 公開するAPI
	setLayerListmessage(...params) {
		return this.#setLayerListmessage(...params);
	} //このメソッドの公開はオプション
	setLayerSpecificWebAppLaunchUiEnable(...params) {
		return this.#setLayerSpecificWebAppLaunchUiEnable(...params);
	} //このメソッドの公開はたいていの場合必須
	getLayersCustomizer = function () {
		// このメソッドの公開は必須
		var ans = this.#layersCustomizer;
		//		console.log("getLayersCustomizer:",ans);
		return ans;
	}.bind(this);
}

export { SvgMapLayerUI };
