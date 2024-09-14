// SVGMap Layer Specific WebApp Handler Module
// 
//  Programmed by Satoru Takagi
//  
//  Copyright (C) 2024 by Satoru Takagi @ KDDI CORPORATION
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
// 2023/12-     : SVGMapLayerUIから、レイヤー固有WebApp部を切り離し、コアモジュール直下でインポート (レイヤUIとレイヤ制御の切り離し)
// 

// History of SVGMapLayerUI:
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
// 2023/08/24 : ↑の問題がChromeでも起きる環境があることが判明。iframeのhtmlのキャッシュを無効化することで対応。そろそろ仕様変更などの本質的な対策が求められる
// 2024/07/23 : To fix issue : https://github.com/svgmap/svgmapjs/issues/5　webAppレイヤーのプログラミング作法の変更あり

import { SvgMapGIS } from '../SVGMapLv0.1_GIS_r4_module.js';
import { UtilFuncs } from '../libs/UtilFuncs.js';
import { GlobalMessageDisplay } from './GlobalMessageDisplay.js';

class LayerSpecificWebAppHandler {

	static #totalLoadCompletedGuardTime = 20; // XHRでの非同期読み込みを含め読み込み完了検知のためのガードタイム 2021/6/18
	static #openFrame = "openFrame";
	static #closeFrame = "closeFrame";
	static #appearFrame = "appearFrame";
	static #hideFrame = "hideFrame";
	
//	#layerList;
	//#uiOpen; //ないかも
//	#layerTableDiv;
//	#uiOpened;
//	#layerGroupStatus; // layerGroupStatusは今はグループ折り畳み状態のみ管理
	#layerSpecificUI; // layerSpecificUIのコンテナ要素
	#svgMap;
	#svgMapGIStool; // ISSUE SVGMapGISは、今後はそもそも各LayerWebApp側でimportするだけで十分なのではないか説(今は従来継承のために起動時暗黙インスタンスにしてある)
	#svgMapAuthoringTool;
	#svgMapLayerUI;
	
//	#layersCustomizer;
	
	#layerSpecificUiDefaultStyle = {};
	#layerSpecificUiMaxHeight = 0;
	
	#getLayerStatus;
	
	#globalMessageDisplay;
	
	#iframeOnLoadProcessQueue = {};

	constructor(svgMapObj, svgMapAuthoringToolObj, getLayerStatusFunc){
		this.#svgMap=svgMapObj;
		this.#svgMapAuthoringTool = svgMapAuthoringToolObj;
		/**
		svgMapObj.registLayerUiSetter( 
			function(opt){
				this.#initLayerList(opt);
			}.bind(this) , 
			function(){
				this.#updateLayerTable();
			}.bind(this)
		);
		**/
		this.#iframeOnLoadProcessQueue={};
		this.#svgMapGIStool=new SvgMapGIS(svgMapObj, window.jsts);
		this.#getLayerStatus = getLayerStatusFunc.bind(this.#svgMap);
		this.#globalMessageDisplay = new GlobalMessageDisplay();
		console.log("construct layerUI: svgMapGIStool:",this.#svgMapGIStool," svgMapAuthoringTool:", this.#svgMapAuthoringTool);
		window.initSvgMapWebAppLayer = this.initSvgMapWebAppLayer; // 2024/07/23
	}
	
	#syncLayerSpecificUi(){
	//	console.log("CALLED updateLayerTable : caller:",updateLayerTable.caller);
		var lps = this.#svgMap.getRootLayersProps();
		for ( var i = lps.length -1 ; i >=0  ; i-- ){
			this.#syncLayerSpecificUiExistence( lps[i].id, lps[i].visible ); // 基幹処理(レイヤ固有UI)をレイヤリストUI更新(setLayerTable)から分けた
		}
	}
	
	#launchController(layerID, cbf){ // 2021/05/06 APIからレイヤ固有UI(コントローラ)を起動する機能を追加中
		// cbfの第一引数にコントローラwindowが入るようにしたい
		var layerProps=this.#svgMap.getRootLayersProps();
		if ( layerProps[layerID].svgImageProps ){
			if ( layerProps[layerID].svgImageProps.controller ){
				if ( layerProps[layerID].svgImageProps.controllerWindow ){
					console.warn("Already launched");
					if ( cbf ){
						cbf(layerProps[layerID].svgImageProps.controllerWindow);
					}
				} else {
					this.#checkController(layerProps[layerID].svgImageProps, layerProps[layerID].id, true, cbf );
				}
			} else {
				console.error("This layer has NO controller, EXIT.");
			}
		} else {
			console.error("This layer is not yet loaded, EXIT.");
		}
	}

	setLayerUIobject(layerUiObj){
		this.#svgMapLayerUI = layerUiObj;
	}
	
	#checkController(svgImageProps, layerId, forceLaunch, cbf ){
		// レイヤ固有UIを実際に設置する
		// さらに、レイヤ固有UIのオートスタートなどの制御を加える 2017.9.8 - 9.22
		// さらに、イヤーUIに、レイヤ固有UIの起動UIがある場合、それをイネーブルにする関数があれば呼び出す
		// console.log("checkController:",layerId);
		var ctrUrl; // ":"+path+hash(ソース埋め込みパターン),  ":"+hash(svgScriptパターン),path(通常のコントローラがあるパターン)
		var lsuiDoc = this.#layerSpecificUI.ownerDocument;
		
		if ( !svgImageProps.controller &&  svgImageProps.svgScript){ // svgScriptだけがあるパターン
			ctrUrl=":#exec=hiddenOnLayerLoad";
		}
		
		if ( svgImageProps.controller ){
	//		console.log("checkController:",svgImageProps.controller);
			if ( svgImageProps.controller.src ){ // ソースが埋め込まれているケース
				if ( svgImageProps.controller.url ){// ソースが埋め込まれていて且つhashも指定されているケース
					ctrUrl= ":"+svgImageProps.controller.url;
				} else {
					ctrUrl=":";
				}
			} else {
				ctrUrl =svgImageProps.controller.url ;
			}
			/** この処理はここにあるのは気持ち悪いので、LayerUIにもし該当関数があったら、それに任せる
			var ctbtn = document.getElementById("bt_"+layerId);
			if ( ctbtn ){ // グループが閉じられている場合などにはボタンがないので
				ctbtn.style.visibility="visible";
				ctbtn.dataset.url = ctrUrl;
			}
			**/
			
			// レイヤーUIに、レイヤ固有UIの起動UIがある場合、それをイネーブルにする関数があればそれを呼び出す
			if ( typeof this.#svgMapLayerUI.setLayerSpecificWebAppLaunchUiEnable =="function"){
				this.#svgMapLayerUI.setLayerSpecificWebAppLaunchUiEnable(layerId,ctrUrl);
			}
	//		console.log("checkController: ctbtn.dataset.url: ",ctbtn.dataset.url);
		}
		
		if ( ctrUrl ){
			// Added autostart function of layerUI 2017.9.8 (名称変更 9/22)
			// 対応するレイヤー固有UIframeがないときだけ、appearOnLayerLoad||hiddenOnLayerLoad処理が走る
			// #exec=appearOnLayerLoad,hiddenOnLayerLoad,onClick(default) 追加
			if ( !lsuiDoc.getElementById( this.#getIframeId(layerId) ) ){
				// console.log("checkController:",ctrUrl);
				var lhash = this.#getHash(ctrUrl);
				if ( svgImageProps.svgScript && (!lhash||!lhash.exec) ){ // svgScriptがあるパターンでlayerUIでexecしていない場合はexecさせる
					if (!lhash ){
						lhash = {exec:"appearOnLayerLoad"};
					} else {
						lhash.exec="appearOnLayerLoad";
					}
				}
				if ( forceLaunch ){
					if (!lhash ){
						lhash = {exec:"appearOnLayerLoad"};
					} else {
						lhash.exec="appearOnLayerLoad";
					}
				}
				// console.log("ctrUrl:",ctrUrl,"  lhash:",lhash)
				if (lhash && lhash.exec){
					if ( lhash.exec.toLowerCase()=="appearonlayerload" || lhash.exec.toLowerCase()=="hiddenonlayerload" ){
						/**
						var psEvt = {
							target:{
								dataset:{
									url:ctrUrl
								},
								id: "bt_"+layerId
							}
						};
						**/
						var hiddenOnLaunch = false;
						if ( lhash.exec=="hiddenOnLayerLoad" ){
							hiddenOnLaunch = true;
						}
						/**
						if ( cbf ){
							psEvt.target.callBackFunction = cbf;
						}
						**/
//						console.log("Find #exec=appearOnLayerLoad,hiddenOnLayerLoad Auto load LayerUI : pseudo Event:", psEvt);
						console.log("Find #exec=appearOnLayerLoad,hiddenOnLayerLoad Auto load LayerUI : layerId,ctrUrl,hiddenOnLaunch,cbf:", layerId,ctrUrl,hiddenOnLaunch,cbf);
//						this.#showLayerSpecificUI(psEvt); // showLayerSpecificUIを強制起動 ただしUIは非表示にしたいケースある(hiddenOnLayerLoad)
						this.#showLayerSpecificUI(layerId,ctrUrl,hiddenOnLaunch,cbf); // showLayerSpecificUIを強制起動 ただしUIは非表示にしたいケースある(hiddenOnLayerLoad)
					}
				}
			}
		}
	}



	#lsUIbdy;
	#lsUIbtn;

	#initLayerSpecificUI(){
	//	console.log("initLayerSpecificUI");
		if ( this.#preDefinedTargetUi.element ){ // 要素をpreDefinedTargetUiElementで明示してあった場合は、それで初期化する(assignLayerSpecificUiElement()があらかじめ呼ばれている)
			console.log("Found preDefinedTargetUiElement! : ", this.#preDefinedTargetUi)
			this.#layerSpecificUI = this.#preDefinedTargetUi.element;
			if (this.#preDefinedTargetUi.isInline ){ 
				this.#layerSpecificUI.style.display="none";
			}
		} else {
			this.#layerSpecificUI = document.getElementById("layerSpecificUI");
		}
		if ( this.#layerSpecificUI ){
			// layerSpecificUI要素が与えられている場合、レイヤ固有UIの基本配置を設定
		//	console.log("initLayerSpecificUI:",layerSpecificUI.style ,layerSpecificUI);
		//	console.log("layerSpecificUiDefaultStyle:",layerSpecificUiDefaultStyle);
			this.#layerSpecificUI.style.zIndex="20";
			this.#layerSpecificUI.style.display="none";
		} else {
			console.log("can't find id:initLayerSpecificUI elem ... create it"); // 2020/12/01 うまく動いてない？
			this.#layerSpecificUI = document.createElement("div");
			this.#layerSpecificUI.setAttribute("id","layerSpecificUI");
			
			this.#layerSpecificUI.setAttribute("style","right :10px; top: 40px; width:400px;height:400px; position: absolute; background-color: white;opacity:0.8;display:none;zIndex:20;");
			
			document.body.appendChild(this.#layerSpecificUI);
		}
		
		this.#layerSpecificUiDefaultStyle.height = this.#layerSpecificUI.style.height;
		this.#layerSpecificUiDefaultStyle.width = this.#layerSpecificUI.style.height;
		this.#layerSpecificUiDefaultStyle.top = this.#layerSpecificUI.style.top;
		this.#layerSpecificUiDefaultStyle.left = this.#layerSpecificUI.style.left;
		this.#layerSpecificUiDefaultStyle.right = this.#layerSpecificUI.style.right;
		
		// レイヤ固有UIのキャンバス
		this.#lsUIbdy = document.createElement("div");
		this.#lsUIbdy.id = "layerSpecificUIbody";
		this.#lsUIbdy.style.overflow="auto"; // for iOS safari http://qiita.com/Shoesk/items/9f81ef1fd7b3a0b516b7
		this.#lsUIbdy.style.webkitOverflowScrolling="touch"; // for iOS
		this.#lsUIbdy.style.width="100%";
		this.#lsUIbdy.style.height="100%";
	//	lsUIbdy.style.overflowY="scroll";
		this.#layerSpecificUI.appendChild(this.#lsUIbdy);
	//	console.log("lsUIbdy:",lsUIbdy);
		
		// レイヤ固有UIを閉じるボタン
		if ( !this.#preDefinedTargetUi.element || this.#preDefinedTargetUi.isInline){ // 基本的にpreDefinedTargetUiが設定されていたら閉じる機能は動かさない ただし、inlineにするなら消せるようにする　2020/12/08
			this.#lsUIbtn = document.createElement("input");
			this.#lsUIbtn.type="button";
			this.#lsUIbtn.value="x";
			this.#lsUIbtn.style.webkitTransform ="translateZ(10)";
			this.#lsUIbtn.style.zIndex ="3";
			this.#lsUIbtn.id="layerSpecificUIclose";
			this.#lsUIbtn.style.position="absolute";
			this.#lsUIbtn.style.right="0px";
			this.#lsUIbtn.style.top="0px";
			this.#layerSpecificUI.appendChild(this.#lsUIbtn);
			this.#lsUIbtn.addEventListener("click",function(event){this.#layerSpecificUIhide(event)}.bind(this),false);
		}
		
		this.#startLayerLoadingMonitor();
	}

	#preDefinedTargetUi={};
	#assignLayerSpecificUiElement( targetElement , isInline , autoSizing){
		// この関数は、initLayerList()が呼び出される前に呼ばれないと無効 2020/12/02
		// すなわち、大元のsvgMap.registLayerUiSetter( initLayerList , updateLayerTable);でセットされた関数が呼ばれる前
		// 上記でセットされる関数(svgMapのsetLayerUI)は、ルートコンテナのXMLが最初に読み込まれた直後に呼び出される
		
		// isInline: 指定した要素をインライン要素として扱い、UIが存在しえない場合は消えるし、消すボタンも付く
		// autoSizing: 自動リサイズを発動する
		this.#preDefinedTargetUi = {element:targetElement, isInline:isInline , autoSizing:autoSizing};
	}


	// layerIdに対する同レイヤ固有UIのiframe要素のID
	#getIframeId( layerId ){
		return ( "layerSpecificUIframe_" + layerId );
	}


	// URLに対してハッシュのオプションを整理して返す
	#getHash(url){
		if ( url.indexOf("#")>0){
			var lhash = url.substring(url.indexOf("#") +1 );
			if ( lhash.indexOf("?")>0){
				lhash = lhash.substring(0,lhash.indexOf("?"));
			}
			lhash = lhash.split("&");
			for ( var i = 0 ; i < lhash.length ; i++ ){
				lhash[i] = lhash[i].split("="); //"
				lhash[lhash[i][0]]=lhash[i][1];
			}
			return ( lhash );
		} else {
			return ( null );
		}
	}


	// 表示中のレイヤ固有UI要素を返す
	#getVisibleLayerSpecificUIid(){
	//	var layerSpecificUIbody = document.getElementById("layerSpecificUIbody");
		var layerSpecificUIbody = this.#lsUIbdy;
		for ( var i = layerSpecificUIbody.childNodes.length-1;i>=0;i--){
			if ( layerSpecificUIbody.childNodes[i].style.display != "none" ){
				return ( layerSpecificUIbody.childNodes[i].id );
			}
		}
		return(null);
	}


	#showLayerSpecificUI(layerId,controllerURL,hiddenOnLaunch,callBackFunction){ // 2024/2/5全部evebtに入れている汚い実装なので、整理した
		var lsuiDoc = this.#layerSpecificUI.ownerDocument;
	//	console.log("showLayerSpecificUI: catch event ",e,"    e.target.hiddenOnLaunch:",e.target.hiddenOnLaunch);
	//	var layerId = this.#getLayerId(e);
	//	var lprops = svgMap.getRootLayersProps();
	//	var controllerURL = lprops[layerId].svgImageProps.controller;
	//	console.log(lprops[layerId],controllerURL,e.target.dataset.url);
	//	var controllerURL = e.target.dataset.url;
	
		/**
		var loadButHide = false;
		if ( e.target.loadButHide ){
			loadButHide = true;
		}
		**/
	//	console.log(controllerURL);
		
		var reqSize = {height:-1,width:-1};
		// console.log("showLayerSpecificUI:",controllerURL);
		var lhash = this.#getHash(controllerURL);
	//	console.log("lhash:",lhash);
		if ( lhash ){
			if (lhash.requiredHeight ){
				reqSize.height = Number(lhash.requiredHeight);
			}
			if (lhash.requiredWidth ){
				reqSize.width = Number(lhash.requiredWidth);
			}
			
		}
		
		if ( !hiddenOnLaunch){
			if ( !this.#preDefinedTargetUi.element || this.#preDefinedTargetUi.isInline){
				this.#layerSpecificUI.style.display = "inline"; // 全体を表示状態にする
			} else {
				this.#layerSpecificUI.style.display = "block"; // 全体を表示状態にする
			}
		}
		
		var targetIframeId = this.#getIframeId(layerId);
		
		var visibleIframeId = this.#getVisibleLayerSpecificUIid();
	//	console.log("visibleIframeId:",visibleIframeId);
		
		if ( !hiddenOnLaunch && visibleIframeId && targetIframeId != visibleIframeId){ // hiddenOnLaunchでない場合で、ターゲットとは別の表示中のLayerUIがあればそれを隠す
			this.#dispatchCutomIframeEvent( LayerSpecificWebAppHandler.#hideFrame ,visibleIframeId);
			lsuiDoc.getElementById( visibleIframeId ).style.display="none";
		}
		
		var trgIframe = lsuiDoc.getElementById( targetIframeId );
		if ( trgIframe ){ // すでに対象iframeが存在している場合、表示を復活させる
			console.log("alreadyCreated iframe");
			if(trgIframe.tagName == "IMG"){
				//画像（凡例）の場合は画像を常にリサイズしてスクロールせずに見れるように処理追加
				this.#imgResize(trgIframe, lsuiDoc.getElementById("layerSpecificUI"), reqSize);
			}else{
				trgIframe.style.display="block";
				this.#testIframeSize( trgIframe, reqSize);
			}
			this.#dispatchCutomIframeEvent( LayerSpecificWebAppHandler.#appearFrame ,targetIframeId);
		} else {
	//		console.log("create new iframe");
	//		if ( controllerURL.indexOf(".png")>0 || controllerURL.indexOf(".jpg")>0 || controllerURL.indexOf(".jpeg")>0 || controllerURL.indexOf(".gif")>0){ // 拡張子がビットイメージの場合はimg要素を設置する}
			if ( false ){ // ビットイメージ凡例表示もiframeで行うこととする
				var img = lsuiDoc.createElement("img");
				img.src=controllerURL;
				img.id = targetIframeId;
				//画像サイズを指定した場合div(layerSpecificUI)のサイズを変更して画像１枚を表示させる
				var resLayerSpecificUI = lsuiDoc.getElementById("layerSpecificUI");
				resLayerSpecificUI.addEventListener("wheel" , function(event){UtilFuncs.MouseWheelListenerFunc(event)}.bind(this), false);
				resLayerSpecificUI.addEventListener("mousewheel" , function(event){UtilFuncs.MouseWheelListenerFunc(event)}.bind(this), false);
				resLayerSpecificUI.addEventListener("DOMMouseScroll" , function(event){UtilFuncs.MouseWheelListenerFunc(event)}.bind(this), false);
				this.#lsUIbdy.appendChild(img);
	//				document.getElementById("layerSpecificUIbody").appendChild(img);
				setTimeout(function(img, parentDiv, size){this.#imgResize(img, parentDiv, size)}.bind(this), 100, img, resLayerSpecificUI, reqSize); 
				setTimeout(function(targetElem , isRetry ){this.#setLsUIbtnOffset(targetElem , isRetry )}.bind(this),100,img);
			} else {
				this.#initIframe(layerId, controllerURL, reqSize, hiddenOnLaunch, callBackFunction);
			}
		}
	}

	//layerSpecificUIがIMGのみであった場合のリサイズ処理
	#imgResize(img, parentDiv, size){
		if(size.width != -1 && size.height != -1){
			console.log(parentDiv.style.width+"/"+parentDiv.style.height);
			img.style.width=size.width+"px";
			img.style.height=size.height+"px";
			parentDiv.style.width = size.width+"px";
			parentDiv.style.height = size.height+"px";
			console.log("change designation size.");
		}else{
			if(img.width && img.height){
				img.style.width=img.width;
				img.style.height=img.height;
				parentDiv.style.width = img.width+"px";
				parentDiv.style.height = img.height+"px";
			}else{
				img.style.width="100%";
				img.style.height="auto";
				this.#layerSpecificUI.style.width = this.#layerSpecificUiDefaultStyle.width;
				this.#layerSpecificUI.style.height = this.#layerSpecificUiDefaultStyle.height;
			}
		}
		img.style.display="block";
	}


	#dispatchCutomIframeEvent(evtName, targetFrameId){
		// added 2016.12.21 オーサリングツール等でUIが閉じられたときにイベントを流す
		// 今のところ、openFrame(新たに生成), closeFrame(消滅), appearFrame(隠されていたのが再度現れた), hideFrame(隠された) の４種で利用
		var lsuiDoc = this.#layerSpecificUI.ownerDocument;
		if ( lsuiDoc.getElementById(targetFrameId) && lsuiDoc.getElementById(targetFrameId).contentWindow ){
			var ifr = lsuiDoc.getElementById(targetFrameId);
			var customEvent = ifr.contentWindow.document.createEvent("HTMLEvents");
			customEvent.initEvent(evtName, true , false );
			ifr.contentWindow.document.dispatchEvent(customEvent);
			
			// 本体のウィンドにも同じイベントを配信する。
			var ce2 = document.createEvent("HTMLEvents");
			ce2.initEvent(evtName, true , false );
			document.dispatchEvent(ce2);
			
		}
	}

	#addCacheDisabledQuery(path) {
		var hashPos = path.indexOf("#");
		var queryPos = path.indexOf("?");
		if (queryPos > hashPos) {
			queryPos = -1;
		}
		var timeStampQuery = "disableCacheQuery=" + new Date().getTime();
		var ans, queryDelim;
		if (queryPos > 0) {
			queryDelim = "&";
		} else {
			queryDelim = "?";
		}
		if (hashPos > 0) {
			ans =
				path.substring(0, hashPos) +
				queryDelim +
				timeStampQuery +
				path.substring(hashPos);
		} else {
			ans = path + queryDelim + timeStampQuery;
		}
		return ans;
	}

	initSvgMapWebAppLayer = function(targetIframeWindow){ // webAppレイヤーの初期化を明示的に行うライブラリ(svgMapLayerLib.js)が呼び出す関数
		// console.log("Called iframeOnLoadProcessExp: targetIframeWindow: ", targetIframeWindow, "  this.#iframeOnLoadProcessQueue:",Object.keys(this.#iframeOnLoadProcessQueue));
		var iframeParam;
		for ( var lid in this.#iframeOnLoadProcessQueue){
			var ifp = this.#iframeOnLoadProcessQueue[lid];
			if ( ifp.iframe.contentWindow === targetIframeWindow ){
				iframeParam = ifp;
				break;
			}
		}
		if ( !iframeParam){return} // iFrameReadyで実行されてればパス
		console.log("Do initSvgMapWebAppLayer: layerID: ", lid);
		this.#iframeOnLoadProcess(iframeParam.iframe, iframeParam.lid, iframeParam.reqSize, iframeParam.controllerURL, iframeParam.cbf);
		delete  this.#iframeOnLoadProcessQueue[iframeParam.lid];
	}.bind(this);
	
	
	#initIframe(lid, controllerURL, reqSize, hiddenOnLaunch, cbf){
		// controllerURLの仕様:checkController参照 
		console.log("initIframe:",controllerURL, "  hiddenOnLaunch?:",hiddenOnLaunch);
	//	var layerSpecificUIbody = document.getElementById("layerSpecificUIbody");
		var layerSpecificUIbody = this.#lsUIbdy;
		var lsuiDoc = this.#layerSpecificUI.ownerDocument;
		var iframe = lsuiDoc.createElement("iframe");
		layerSpecificUIbody.appendChild(iframe); // doc下に設置した時点でloadイベントが走るのが問題だったようだ。 srcなりsrcdocなりを設定してからappendChildすることで初期化不具合が解消 2019/11/26　⇒　いや・・・そのloadイベントはabout:blankからくるものだった(特にsrcdoc設定が遅延するinitIframePh2ケース)　この辺を抑制した関数(iFrameReady)を得たのでその必要はなくなったはず 2021/6/17
		var iframeId = this.#getIframeId(lid);
		iframe.id = iframeId;
		
		if ( hiddenOnLaunch ){
			console.log("iframe:",iframe," display:",iframe.style.display);
			iframe.style.display="none";
		}
		
		/**
		iframe.addEventListener("load",function(){
			iframeOnLoadProcess(iframe, lid, reqSize, controllerURL, cbf);
		}, { once: true });
		**/
		this.#iframeOnLoadProcessQueue[lid]={iframe, lid, reqSize, controllerURL, cbf};
		this.#iFrameReady(iframe, function(){ // 2021/6/17 layerUIのonload()でsetTimeout要の課題をついに対策できたか
			if ( !this.#iframeOnLoadProcessQueue[lid]){console.log("skip"); return} // initSvgMapWebAppLayerで実行されていればパス
			this.#iframeOnLoadProcess(iframe, lid, reqSize, controllerURL, cbf);
			delete  this.#iframeOnLoadProcessQueue[lid];
		}.bind(this), false);
		
		var bySrcdoc = false;
		var legendImage =  this.#isLegendImage(controllerURL);
		console.log("initIframe: legendImage:",legendImage);
		if ( controllerURL.charAt(0) != ":"  && legendImage == false ){ // controllerにレイヤUIのhtmlのパスが書かれているケース(通常ケース) 
			if (controllerURL.substr(0,7)=="http://" || controllerURL.substr(0,8)=="https://"){ // startsWithaがIEでは・・・
				// CORS設定されてる別サイトのiframeでもdata-controllerでURL表現状態でも起動可能にする 2019/11/26
				console.log("Get controller by XHR");
				var httpObj = new XMLHttpRequest();
				var that = this;
				httpObj.onreadystatechange = function(){ that.#initIframePh2( this , iframe , lid, reqSize ) } ; 
				httpObj.open("GET", controllerURL , true );
				httpObj.send(null);
				bySrcdoc = true;
			} else { // 同一ドメインにあるケース(基本ケース)  
				iframe.src=controllerURL;
				iframe.src = this.#addCacheDisabledQuery(controllerURL); // 2023/08/24 キャッシュからの読み込みでは、iframeReadyが効かないことがあるため、キャッシュ無効化する
	//			layerSpecificUIbody.appendChild(iframe);
			}
		} else { // controller-srcに直接ソースが書かれている　もしくは svgScriptがある　もしくは画像のケース
			var sourceDoc;
			if ( legendImage ){ // 画像のケース
				sourceDoc = this.#getEmptyHtmlSrc('<img src="'+controllerURL+'">'); 
			} else if ( (this.#svgMap.getSvgImagesProps())[lid].controller ){ // controller-srcに直接ソースが書かれているケース
				sourceDoc = (this.#svgMap.getSvgImagesProps())[lid].controller.src;
			} else { // svgScriptだけがあるケース
				var addSrc ='<h4>svgScript only  layerUI</h4>LayerID:'+lid;
				sourceDoc = this.#getEmptyHtmlSrc(addSrc); // まず空のhtmlを立ち上げ、Window構築後、svgScriptを追加する
			}
			
			iframe.srcdoc = sourceDoc;
	//		layerSpecificUIbody.appendChild(iframe);
			bySrcdoc = true;
			if ( !iframe.getAttribute("srcdoc") ) { // patch for IE&Edge
				// 対応法はDOM操作か・・http://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q1032803595
				console.log("patch for IE&Edge:");
				sourceDoc = sourceDoc.replace(/&quot;/g,'"');
				iframe.contentWindow.document.write(sourceDoc );
				iframe.contentWindow.document.close(); // 2019.12.16 これがないとloadイベント発生しない・・
			}
		}
		iframe.setAttribute("frameborder","0");
		iframe.style.width="100%";
		iframe.style.height="100%";
		
		
		// for iOS Sfari issue:
		// http://qiita.com/Shoesk/items/9f81ef1fd7b3a0b516b7
		iframe.style.border ="none";
		if ( !hiddenOnLaunch ){
			iframe.style.display="block";
		}
		
	//	console.log("iframe.srcdoc?:",iframe.srcdoc);
		return (iframe);
	}

	#isLegendImage(path){
		if ( path.indexOf(".png")>0 || path.indexOf(".jpg")>0 || path.indexOf(".jpeg")>0 || path.indexOf(".gif")>0){
			return ( true );
		} else {
			return ( false );
		}
	}

	#getEmptyHtmlSrc(addSrc){
		return ("<!doctype html><html><body>"+addSrc+"</body></html>");
	}
	

	#iframeOnLoadProcess(iframe, lid, reqSize, controllerURL, cbf){
		// srcdocだと、xxmsぐらい待たないと、contentWindowへの設定がwindowに保持されないので、初期化されるまでリトライすることに。
		// xxmsの時間もなんかまちまち・・(on chrome) 2019/11/26
		// DOMContentLoaded イベントで動作させれば良いんじゃないかな とも思ったがどうだろう
		// 参考: https://ja.javascript.info/onload-ondomcontentloaded 2019/12/05
		// https://stackoverflow.com/questions/16960829/detect-domcontentloaded-in-iframe
		// DOMContentLoadedはiframeでは発行されない。が、力技で解決する手法を作った人がいる。 >iFrameReady
		// https://stackoverflow.com/questions/24603580/how-can-i-access-the-dom-elements-within-an-iframe/24603642#comment38157462_24603642
		var iframeId = iframe.id;
		console.log("initIframe load eventListen : controllerURL:", controllerURL,"  svgMapAuthoringTool:",this.#svgMapAuthoringTool);
		this.#dispatchCutomIframeEvent(LayerSpecificWebAppHandler.#openFrame,iframeId);
		if ( this.#layerSpecificUiMaxHeight == 0 ){
			this.#layerSpecificUiMaxHeight = this.#layerSpecificUI.offsetHeight
		}
		iframe.contentWindow.layerID=lid;
		
		iframe.contentWindow.controllerSrc = controllerURL; // Add 2019/11/26 srcdocでロードしたケースでdocPath知りたいとき
	//	iframe.contentWindow.controllerDir = controllerURL.substring(0,controllerURL.lastIndexOf("/")); // #や?があるのでもちょっとしっかりやった方が良いので後回し 2019
		
		iframe.contentWindow.svgMap = this.#svgMap;
	//	console.log("iframe.contentWindow:",iframe.contentWindow);
		if ( typeof this.#svgMapGIStool != "undefined" ){
	//			console.log("add svgMapGIStool to iframe");
			iframe.contentWindow.svgMapGIStool = this.#svgMapGIStool;
		}
		if ( typeof this.#svgMapAuthoringTool != "undefined" ){ // added 2016.12.19 AuthoringTools
	//			console.log("add svgMapAuthoringTool to iframe");
			iframe.contentWindow.svgMapAuthoringTool = this.#svgMapAuthoringTool;
		}
		if ( typeof svgMapPWA != "undefined" ){ // 2020/5/14
	//			console.log("add svgMapPWA to iframe");
			iframe.contentWindow.svgMapPWA = svgMapPWA;
		}
		
		iframe.contentWindow.svgMapLayerUI=this.#svgMapLayerUI; 
		iframe.contentWindow.putGlobalMessage = this.#globalMessageDisplay.putGlobalMessageForLayer(lid); // added 2019/12/05 今後、この種の"そのレイヤーに対するAPI"が増えると思うが、もう少しきれいにまとめたい。(TBD)
		var sip = (this.#svgMap.getSvgImagesProps())[lid];
		iframe.contentWindow.svgImageProps = sip;
		sip.controllerWindow = iframe.contentWindow; // 2020/10/13 svgImagesPropにcontrollerWindowを追加
		iframe.contentWindow.svgImage = (this.#svgMap.getSvgImages())[lid];
	//		iframe.contentWindow.testIframe("hellow from parent");
		if ( this.#transferCustomEvent2iframe[lid] ){
			document.removeEventListener("zoomPanMap", this.#transferCustomEvent2iframe[lid], false);
			document.removeEventListener("screenRefreshed", this.#transferCustomEvent2iframe[lid], false);
			document.removeEventListener("zoomPanMapCompleted", this.#transferCustomEvent2iframe[lid], false);
		} else {
			this.#transferCustomEvent2iframe[lid] = this.#transferCustomEvent4layerUi(lid);
			console.log("build transferCustomEvent2iframe for ",lid, this.#transferCustomEvent2iframe[lid]);
		}
		if ( sip.svgScript){ // 2022/03/08 svgScriptをlayerUIで動かす大改修
			this.#arrangeHtmlEmbedScript(sip.svgScript, iframe.contentWindow);
		}
		if ( typeof(iframe.contentWindow.preRenderFunction)=="function"){ // 2020/6/8 再描画の前に実行される関数を登録(これで、svg文書のscriptの中のonzoom, onscroll関数のような挙動がだせるかと・・)
			console.log("Register preRenderControllerFunction for layerID:",lid);
			(this.#svgMap.getSvgImagesProps())[lid].preRenderControllerFunction = iframe.contentWindow.preRenderFunction;
		}
		this.#setXHRhooks(iframe.contentWindow); // 2021/06/17 
		iframe.contentWindow.setLoadingFlag=function(stat){ // 2021/09/22 XHR以外でもこれをセットすると同じように動かせる
			var sipf = this.#svgMap.getSvgImagesProps();
			console.log("registLoadingFlag:",sipf[lid]);
			if ( stat == true ){
				this.#registLoadingFlag(lid,sipf);
			} else if ( stat == false ){
				this.#releaseLoadingFlag(lid,sipf);
			}
		}
		document.addEventListener("zoomPanMap", 
			this.#transferCustomEvent2iframe[lid]
		, false);
		document.addEventListener("screenRefreshed", 
			this.#transferCustomEvent2iframe[lid]
		 , false);
		document.addEventListener("zoomPanMapCompleted", 
			this.#transferCustomEvent2iframe[lid]
		 , false);
		
		
		setTimeout( function(iframe ,reqSize){this.#testIframeSize(iframe ,reqSize)}.bind(this) , 1000 , iframe ,reqSize);
		if ( cbf ){
			cbf(iframe.contentWindow);
		}
	}

	#iFrameReady(iFrame, fn, backupLoadEventEnable) {
		// loadより前の段階(ほぼDOMContentLoadedの段階)でfnを実行する。力技のポーリングをしている
		// https://stackoverflow.com/questions/24603580/how-can-i-access-the-dom-elements-within-an-iframe/24603642#comment38157462_24603642
		// This function ONLY works for iFrames of the same origin as their parent
		// この実装、Firefoxの最新版ではうまく動かなくなっている。setTimeoutの実効間隔が長く、その間にload処理が完了してしまう為？
		var timer;
		var fired = false;
		function ready() {
			if (!fired) {
				fired = true;
				clearTimeout(timer);
				fn.call(this);
				iFrame.contentWindow.removeEventListener("error",retryLoadEvent);
			}
		}
		function readyState() {
			if (this.readyState === "complete") {
				ready.call(this);
			}
		}
		// cross platform event handler for compatibility with older IE versions
		function addEvent(elem, event, fn) {
			if (elem.addEventListener) {
				return elem.addEventListener(event, fn);
			} else {
				return elem.attachEvent("on" + event, function () {
					return fn.call(elem, window.event);
				});
			}
		}
		// use iFrame load as a backup - though the other events should occur first
		if ( backupLoadEventEnable ){
			addEvent(iFrame, "load", function () {
				ready.call(iFrame.contentDocument || iFrame.contentWindow.document);
			});
		}
		
		// 2023/07/25 iFrameReady失敗のリトライを　エラーが起きた時のみにする処理
		var errorOccurred = false;
		function retryLoadEvent(event){
			console.warn("iFrame error:", event.message);
			errorOccurred = true;
		}
		iFrame.contentWindow.addEventListener("error",retryLoadEvent);
		
		function checkLoaded() {
			var doc = iFrame.contentDocument || iFrame.contentWindow.document;
			// We can tell if there is a dummy document installed because the dummy document
			// will have an URL that starts with "about:".  The real document will not have that URL
			if (doc.URL.indexOf("about:blank") !== 0) { // 2021/06/24 about: => about:blank (patch for about:srcdoc issue)
				if (doc.readyState === "complete") {
					console.warn("Already load completed.");
					ready.call(doc);
					// 2023/07/25 iFrameReady失敗のリトライ処理の試み　Firefoxの最近のバージョンで起きる確率が高い
					// このケースは、DOMContentLoaded時点での処理に失敗したケース、故にloadイベントによる初期化にも失敗しているといえるだろう。そのため、loadイベントを再送信してリカバーを試みる
					// エラーが起きている時だけリトライするべきかもしれないので、そうしてみた。
					if ( errorOccurred ){
						console.warn("Retry load process ....");
						var le = new Event("load");
						iFrame.contentWindow.dispatchEvent(le);
					}
				} else {
					// set event listener for DOMContentLoaded on the new document
					addEvent(doc, "DOMContentLoaded", ready);
					addEvent(doc, "readystatechange", readyState);
				}
			} else {
				// still same old original document, so keep looking for content or new document
				timer = setTimeout(checkLoaded, 1);
			}
		}
		checkLoaded();
	}

	#arrangeHtmlEmbedScript(scriptStr, controllerWindow){
		var transformRetStr="";
		console.log("controllerWindow:",controllerWindow);
		if ( controllerWindow.svgImageProps &&
			controllerWindow.svgImageProps.CRS &&
			controllerWindow.svgImageProps.CRS.unresolved &&
			controllerWindow.svgImageProps.CRS.transformFunctionName ){
				transformRetStr="transformFunction: " + controllerWindow.svgImageProps.CRS.transformFunctionName +",";
				console.log("transformRetStr set:",transformRetStr);
		}
		
		
		controllerWindow.svgScript = controllerWindow.Function(`
			${scriptStr}
			var document = svgImage;
//			var refreshScreen = function(){svgMap.refreshScreen()};
			console.log("arrangeHtmlEmbedScript svgScript launched : location.href:",location.href);
			setTimeout(function(){
				console.log("arrangeHtmlEmbedScript svgScript Timeout: layerID:",layerID,"  svgImage : ", svgImage);
				document = svgImage;
//				transform = svgMap.transform.bind(svgMap);
				svgMap.refreshScreen();
			},1);
			
			var scale,geoViewBox,CRS,docId,actualViewBox;
			var onload, onzoom, onscroll; 
			function preRenderFunction(svgDocStatus){
				
				scale = svgImageProps.scale;
				svgImageProps.script.scale = scale;
				geoViewBox = svgImageProps.geoViewBox;
				actualViewBox = svgDocStatus.actualViewBox;
				svgImageProps.script.geoViewBox = geoViewBox;
				CRS = svgImageProps.CRS;
				svgImageProps.script.CRS = CRS;
				docId = layerID;
				svgImageProps.script.location=svgDocStatus.location;
				
				// console.log("svgScript preRenderFunction　this?:",this, geoViewBox);
				if ( svgDocStatus && svgDocStatus.viewChanged=="scroll"){
					if ( typeof(onscroll)=="function" && window.onscroll!=onscroll ){ 
						onscroll.call(svgImageProps.script);
					}
				} else {
					if ( typeof(onzoom)=="function" && window.onzoom!=onzoom ){
						onzoom.call(svgImageProps.script);
					}
				}
			}
			function refreshScreen(...params){
				return ( svgMap.refreshScreen(...params));
			}
			function transform(...params){
				return ( svgMap.transform(...params));
			}
			function getCanvasSize(){
				return ( svgMap.getCanvasSize());
			}
			function getCORSURL(originalURL, alsoCrossoriginParam){
				return ( svgMap.getCORSURL(originalURL, alsoCrossoriginParam));
			}
			
			function onloadFunction(svgDocStatus){
				// console.log("window.onload:",window.onload,"  this.onload:",this.onload,"  onload:",onload," window.onload==onload?:",window.onload==onload);
				
				scale = svgImageProps.scale;
				svgImageProps.script.scale = scale;
				geoViewBox = svgImageProps.geoViewBox;
				actualViewBox = svgDocStatus.actualViewBox;
				svgImageProps.script.geoViewBox = geoViewBox;
				CRS = svgImageProps.CRS;
				svgImageProps.script.CRS = CRS;
				docId = layerID;
				svgImageProps.script.location=svgDocStatus.location;
				
				if ( typeof(onload)=="function" && window.onload!=onload ){
//					svgImageProps.script.location=svgDocStatus.location;
					// console.log("onloadFunctionZ　this?:",this, "  location:",location,"  svgDocStatus:",svgDocStatus);
					onload.call(svgImageProps.script); 
				}
			}
			
			function getTransforrmFunction(fName){
				
				var ans= new Function("return " + fName );
				return ( ans );
			}
			
			return{
				onloadFunction : onloadFunction,
				preRenderFunction : preRenderFunction,
				${transformRetStr}
			}
		`);
		controllerWindow.svgImageProps.script = (controllerWindow.svgScript());
		if ( !controllerWindow.preRenderFunction  ){ // 2024/4/22  controllerWindow.preRenderFunctionが上書きされてしまうのを防止
			controllerWindow.preRenderFunction = controllerWindow.svgImageProps.script.preRenderFunction;
		}
		controllerWindow.svgImageProps.script.onloadFunction(this.#getLayerStatus(controllerWindow.layerID));
	}
		

	#setXHRhooks(ifWin){ 
		// 伸縮スクロール処理が完了したかどうかをより正確に把握するため、レイヤ固有UIにおいて、データ処理中（ネットワークからデータをDL中）かどうかをモニタするためのフックを導入 2021/6/17
		// layerUIでXHRが走っている間はまだ再描画がかかる可能性があり、これを検知して完全な描画完了をできるだけ判定できるようにしたい。これを通知する新しいイベントを作る。
		
		// fetchのためのフック
		// 2023/01/13 Response自体をフックするように改修(ERR404対策)
		var fetchRes=["blob","text","arrayBuffer","formData","json"];
		var sip = this.#svgMap.getSvgImagesProps();
		
		//console.log("setXHRhooks:this:",this,this.location);
		var that = this;
		ifWin.fetch = function (fetch) {
			return async function () {
		//    	console.log("fetch v1:",v1);
		    	//console.log("[layerUI] fetch HOOK arguments:",arguments);
				that.#registLoadingFlag(ifWin.layerID,sip);
	//	        return fetch.apply(this, arguments); // これはコンテキストが間違っていました‥ 2021/6/17
	//	        return fetch.apply(ifWin, arguments); // Response自体をフックしてreleaseLoadingFlagするようにする 2023/1/13
				const resp = await fetch.apply(ifWin, arguments);
				that.#releaseLoadingFlag(ifWin.layerID,sip);
				return resp;
			};
		}(ifWin.fetch);
		
		/** 2023/01/13 Response自体をフックするように改修(ERR404対策)
		for ( var i = 0 ; i < fetchRes.length ; i++ ){
			(function(frf){
				ifWin.Response.prototype[fetchRes[i]] = function () {
					//console.log("[layerUI] Response:"+fetchRes[i]+": HOOK:arguments:",arguments," this:",this);
					that.#releaseLoadingFlag(ifWin.layerID,sip);
					return frf.apply(this, arguments); // これは上のfetchで作られたインスタンスに関するものなので良いのかな
				}
			}(ifWin.Response.prototype[fetchRes[i]]));
		}
		**/
		
		// XHRのためのフック
		(function(send) {
			ifWin.XMLHttpRequest.prototype.send = function () {
				// console.log("[layerUI] XHR HOOK: send:arguments:",arguments,"  this:",this);
				that.#registLoadingFlag(ifWin.layerID,sip);
				var callback = this.onreadystatechange
				this.onreadystatechange = function() {
					if (this.readyState == 4) {
						var responseURL = this.responseURL
						// console.log("[layerUI] XHR: send:onreadystatechange HOOK:readyState:",this.readyState,"  resURL:",responseURL," resTXT:",this.responseText.substring(0,20));
						that.#releaseLoadingFlag(ifWin.layerID,sip);
					}
					if (callback) {
						callback.apply(this, arguments)
					}
				}
				send.apply(this, arguments)
			}
		}(ifWin.XMLHttpRequest.prototype.send));

		(function(open){
			ifWin.XMLHttpRequest.prototype.open = function () {
				// console.log("[layerUI] XHR HOOK: open:arguments:",arguments);
				open.apply(this, arguments)
			}
		}(ifWin.XMLHttpRequest.prototype.open));
	}

	#registLoadingFlag(layerId,sip){
		if ( sip[layerId].xhrLoading ){
			++sip[layerId].xhrLoading;
		} else {
			sip[layerId].xhrLoading=1;
		}
		//console.log("registLoadingFlag: id:",layerId,"  count:",sip[layerId].xhrLoading);
		this.#aboutToFireXHRCevent=false;
	}

	#releaseLoadingFlag(layerId,sip){
		if ( sip[layerId].xhrLoading ){
			--sip[layerId].xhrLoading;
		} else {
			console.error("svgImagesProps["+layerId+"].xhrLoading flag is inconsistent.");
		}
		//console.log("releaseLoadingFlag: id:",layerId,"  count:",sip[layerId].xhrLoading);
	//	setTimeout( function(){checkLoadingFlag(sip);}, totalLoadCompletedGuardTime );
		this.#checkLoadingFlag(sip);
	}

	#zpm_checkLoadingFlag(){
		// console.log("zpm_checkLoadingFlag");
		var sip = this.#svgMap.getSvgImagesProps();
		this.#zpm_XHRCevent = true;
		this.#checkLoadingFlag(sip);
	}

	#checkLoadingFlag(sip){
		var totalLoading=0;
		for ( var lid in sip){
			if ( sip[lid].xhrLoading){
				totalLoading+=sip[lid].xhrLoading;
			}
		}
		if ( totalLoading == 0 && this.#aboutToFireXHRCevent==false){
			this.#aboutToFireXHRCevent = true;
			setTimeout(function(){this.#fireXHRCevent()}.bind(this), LayerSpecificWebAppHandler.#totalLoadCompletedGuardTime);
		} else {
			// console.log("reject toFireXHRCevent");
		}
	}

	#zpm_XHRCevent=false; // zoomPanMapに際して起きたXHRCeventの時はtrue
	#aboutToFireXHRCevent=false;//ガードタイム中に一回しか出さないようにする
	#fireXHRCevent(){
		if ( this.#aboutToFireXHRCevent ){
			if ( this.#zpm_XHRCevent ){
				this.#zpm_XHRCevent = false;
				// console.log("XHR processes on zoomPanMap are totally completed!!");
				var customEvent = document.createEvent("HTMLEvents");
				customEvent.initEvent("zoomPanMapCompleted", true , false );
				document.dispatchEvent(customEvent);
			} else {
				// console.log("XHR processes others are totally completed!!");
				// zoomPanMapに伴って発生していないXHRはどうしようか・・・
			}
			this.#aboutToFireXHRCevent = false;
		} else {
			// console.log("REJECT fireXHRCevent");
		}
	}

	#initIframePh2(httpRes, iframe , lid, reqSize ){
		if (( httpRes.readyState != 4 ) ){
			return;
		}
		if ( httpRes.status == 403 || httpRes.status == 404 || httpRes.status == 500 || httpRes.status == 503 ){
			console.log( "csvXHR2 : File get failed");
			return;
		}
		console.log("initIframePh2(byXHR): httpRes: ",httpRes, "   lid:",  lid);
		var sourceDoc = httpRes.responseText;
		var baseHtml = `<base href='${httpRes.responseURL}'>`; // 2023/07/26 できるだけ互換を保てるようにbase要素を設定する
		if (sourceDoc.indexOf("<script") > 0) {
			if (sourceDoc.indexOf("</head>") > 0) {
				sourceDoc = sourceDoc.replace(
					"</head>",
					`${baseHtml}</head>`
				);
			} else {
				sourceDoc = sourceDoc.replace(
					/<html[^>]*>/,
					"$&" + `<head>${baseHtml}</head>`
				);
			}
		}
		iframe.srcdoc = sourceDoc;
	//	layerSpecificUIbody.appendChild(iframe);
		//lsUIbdy.appendChild(iframe);
		if ( !iframe.getAttribute("srcdoc") ) { // patch for IE&Edge
			console.log("patch for IE&Edge");
			sourceDoc = sourceDoc.replace(/&quot;/g,'"');
			iframe.contentWindow.document.write(sourceDoc );
			iframe.contentWindow.document.close(); // 2019.12.16 これがないとloadイベント発生しない・・
		}
	}

	#pxNumb( pxval ){
		if ( pxval && pxval.indexOf("px")>0){
			return ( Number(pxval.substring(0,pxval.indexOf("px") ) ));
		} else {
			return ( 0 );
		}
	}

	#btnOffset = 0;
	#setLsUIbtnOffset( targetElem , isRetry ){ // 2017.2.17 レイヤ固有UIのクローズボタン位置の微調整
		// スクロールバーがある場合、それが隠れるのを抑止する
		// targetElem：レイヤ固有UIに配置されるimg要素もしくはiframeのdocumentElement
	//	console.log("setLsUIbtnOffset:", targetElem, targetElem.offsetWidth);
	//	console.log("targetElem.~Width:",targetElem,targetElem.clientWidth,targetElem.offsetWidth, ":::" , lsUIbdy.clientWidth, layerSpecificUI.clientWidth);
		
		if (!this.#lsUIbtn){
			return;
		}
		
		if ( targetElem.offsetWidth == 0 ){
			this.#lsUIbtn.style.right="0px";
		} else if ( this.#layerSpecificUI.clientWidth - targetElem.offsetWidth != this.#btnOffset ){
			this.#btnOffset = this.#layerSpecificUI.clientWidth - targetElem.offsetWidth;
			if ( this.#btnOffset>0 ){ // iOS safariでは0以下になることが・・・妙なスペック
	//			console.log("btnOffset:",btnOffset);
				this.#lsUIbtn.style.right=this.#btnOffset+"px";
			} else {
				this.#lsUIbtn.style.right="0px";
			}
		}
		
		if ( !isRetry &&  this.#layerSpecificUI.clientWidth == targetElem.offsetWidth ){ // 一回だけやるように変更
			setTimeout(function(targetElem , isRetry){this.#setLsUIbtnOffset(targetElem , isRetry)}.bind(this) , 1000 , targetElem , true);
		}
		
	}

	#testIframeSize( iframe ,reqSize){
		console.log("testIframeSize:",iframe, iframe.style);
		if ( iframe.style.display == "none" ){ // 2021/12/03 非表示のものはサイジングしない
			return;
		}
	//	console.log("iframeDoc, width:",iframe.contentWindow.document,  iframe.contentWindow.document.documentElement.offsetWidth);
	//	console.log("H:",iframe.contentWindow.document.documentElement.scrollHeight );
	//	console.log("H2:",iframe.contentWindow.document.body.offsetHeight , layerSpecificUI.offsetHeight);
		var maxHeight = window.innerHeight - this.#pxNumb(this.#layerSpecificUiDefaultStyle.top) - 50;
		var maxWidth = window.innerWidth - this.#pxNumb(this.#layerSpecificUiDefaultStyle.left) - this.#pxNumb(this.#layerSpecificUiDefaultStyle.right) - 50;
	//	console.log("reqSize:",reqSize, " window:",window.innerWidth,window.innerHeight, "  available w/h",maxWidth,maxHeight) - 50;
		
		if ( ! iframe.contentWindow || (this.#preDefinedTargetUi.element && !this.#preDefinedTargetUi.autoSizing) ){
			return;
		}
		this.#setLsUIbtnOffset(iframe.contentWindow.document.documentElement);
		
		if ( reqSize.width>0 ){ // 強制サイジング
			if ( reqSize.width < maxWidth ){
				this.#layerSpecificUI.style.width = reqSize.width+"px";
			} else {
				this.#layerSpecificUI.style.width = maxWidth + "px";
			}
		} else {
			// set by default css　横幅は命じない場合常にcss設定値
			this.#layerSpecificUI.style.width = this.#layerSpecificUiDefaultStyle.width;
		}
		
		if ( reqSize.height > 0 ){ // 強制サイジング
			if ( reqSize.height < maxHeight ){
				this.#layerSpecificUI.style.height = reqSize.height+"px";
			} else {
				this.#layerSpecificUI.style.height = maxHeight+"px";
			}
		} else { // 自動サイジング 最大値はcss設定値
			if ( iframe.contentWindow.document.body.offsetHeight < this.#layerSpecificUiMaxHeight ){
				this.#layerSpecificUI.style.height = (50 + iframe.contentWindow.document.body.offsetHeight) + "px";
	//		iframe.style.height = ""; //IE11対応
	//		if ( iframe.contentWindow.document.documentElement.offsetHeight < layerSpecificUiMaxHeight ){
	//			iframe.style.height = 0;
	//			iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + "px"; //モダンブラウザ対応
	//			layerSpecificUI.style.height = iframe.contentWindow.document.documentElement.offsetHeight + "px";
	//			iframe.style.height = layerSpecificUI.style.height; //IE対応
			} else {
				this.#layerSpecificUI.style.height = this.#layerSpecificUiDefaultStyle.height;
			}
		}
	}

	#transferCustomEvent2iframe = [];
		
	#transferCustomEvent4layerUi(layerId){
		return function(ev){
			console.log("get event from root doc : type: ",ev.type," forLayer:",layerId);
			// レイヤー固有UIがある場合のみイベントを転送する
			var lsuiDoc = this.#layerSpecificUI.ownerDocument;
			var ifr = lsuiDoc.getElementById(this.#getIframeId(layerId))
			if ( ifr ){
				var customEvent = ifr.contentWindow.document.createEvent("HTMLEvents");
				customEvent.initEvent(ev.type, true , false );
	//			console.log("transferCustomEvent:", ev.type , " to:",layerId);
				ifr.contentWindow.document.dispatchEvent(customEvent);
	//		} else if ( transferCustomEvent2iframe[layerId] ){
	//			document.removeEventListener("zoomPanMap", transferCustomEvent2iframe[layerId], false);
			}
		}.bind(this);
	}


	#layerSpecificUIhide(){
		var lsuiDoc = this.#layerSpecificUI.ownerDocument;
		var visibleIframeId = this.#getVisibleLayerSpecificUIid();
		
		this.#dispatchCutomIframeEvent(LayerSpecificWebAppHandler.#hideFrame,visibleIframeId);
		lsuiDoc.getElementById(visibleIframeId).style.display = "none";
		
		if ( !this.#preDefinedTargetUi.element || this.#preDefinedTargetUi.isInline ){
			this.#layerSpecificUI.style.display = "none";
			this.#layerSpecificUI.style.height = this.#layerSpecificUiDefaultStyle.height;
		}
	}

	#syncLayerSpecificUiExistence( layerId, visivility ){
		// レイヤーが非表示になったら、WebAppを終了させる
		if ( !this.#layerSpecificUI){return}
		var lsuiDoc = this.#layerSpecificUI.ownerDocument;
		var visibleIframeId = this.#getVisibleLayerSpecificUIid();
		var targetIframeId = this.#getIframeId(layerId);
		if ( visivility == false && lsuiDoc.getElementById(targetIframeId) ){
			if ( visibleIframeId == targetIframeId){
				this.#layerSpecificUIhide();
			}
			var targetIframe= lsuiDoc.getElementById(targetIframeId);
			console.log("close layer specific UI for:",layerId);
			document.removeEventListener("zoomPanMap", this.#transferCustomEvent2iframe[layerId], false);
			document.removeEventListener("screenRefreshed", this.#transferCustomEvent2iframe[layerId], false);
			document.removeEventListener("zoomPanMapCompleted", this.#transferCustomEvent2iframe[layerId], false);
			delete this.#transferCustomEvent2iframe[layerId];
			this.#dispatchCutomIframeEvent(LayerSpecificWebAppHandler.#closeFrame,targetIframeId );
			this.#globalMessageDisplay.clearGlobalMessage(layerId);
			setTimeout( function(){
				console.log( "remove iframe:",targetIframe.id);
				targetIframe.parentNode.removeChild(targetIframe);
			},100);
		}
	}


	#hasUnloadedLayers = false;
	#checkLayerListAndRegistLayerUI(){
		// console.log("checkLayerListAndRegistLayerUI");
		// レイヤーの読み込み完了まで　レイヤーリストのチェックを行い、レイヤ固有UIを設置する
	//	if ( !count ){count=1}
		var layerProps=this.#svgMap.getRootLayersProps();
		this.#hasUnloadedLayers = false;
		for ( var i = 0 ; i < layerProps.length ; i++ ){
			if ( layerProps[i].visible ){
	//			console.log("chekc for layerui existence :  svgImageProps:",layerProps[i].svgImageProps , "   hasDocument:",layerProps[i].hasDocument);
				if ( layerProps[i].svgImageProps && layerProps[i].hasDocument ){ // svgImagePropsが設定されていたとしてもまだ読み込み完了していると保証できないと思うので、hasDocumentを併せて評価する 2017.9.8
	//				var ctbtn = document.getElementById("bt_"+layerProps[i].id);
	//				setTimeout(checkController,50,layerProps[i].svgImageProps, ctbtn); // 時々失敗するので50msec待って実行してみる・・ 2016.11.17　このTimeOutはもう不要と思う 2017.9.8
					this.#checkController(layerProps[i].svgImageProps, layerProps[i].id); // 上記より直接呼出しに戻してみる 2017.9.8
				} else {
					this.#hasUnloadedLayers = true;
				}
			}
		}
	//	console.log( "hasUnloadedLayers:",hasUnloadedLayers,count);
		// 2020/2/13このループは、unloadedLayersUIupdateを動かすことで不要にできたはず
		// if ( hasUnloadedLayers && count < 5){ // 念のためリミッターをかけておく
		//	setTimeout(checkLayerListAndRegistLayerUI,200,count+1);
		// }
	}

	#unloadedLayersUIupdate(){ // 2020/2/13 ロードの遅延が大きいレイヤーのレイヤUIボタンが出現しないケースの対策
		if ( this.#hasUnloadedLayers ){
			this.#checkLayerListAndRegistLayerUI();
		}
	}
	
	#startLayerLoadingMonitor(){
		addEventListener("zoomPanMap",function(event){this.#unloadedLayersUIupdate(event)}.bind(this),false); // 2020/2/13
		addEventListener("zoomPanMap",function(event){this.#zpm_checkLoadingFlag(event)}.bind(this),false); // 2021/6/21
		addEventListener("screenRefreshed",function(event){this.#unloadedLayersUIupdate(event)}.bind(this),false); // ^
		this.#checkLayerListAndRegistLayerUI(); // 2017.9.8 この関数の先にあるcheckControllerで#loadTiming=layerLoad|uiAppear(default) を起動時処理する
		
	}

	
	/**
	customEvents(){
		return{
			"zoomPanMap":true,
			"zoomPanMapCompleted":true,
			"screenRefreshed":true,
			openFrame:true,
			closeFrame:true,
			appearFrame:true,
			hideFrame:true
		}
	};
	**/
	
	// 公開するAPI
	assignLayerSpecificUiElement(...params){ return (this.#assignLayerSpecificUiElement(...params))}; // これはSVGMapElementで使われているがLayerUIが露出しなくなった&AppHandlerがそもそも存在しなかったため、APIにアクセスできず、互換性がなくなっている：ISSUE
	initLayerSpecificUI(...params){ return (this.#initLayerSpecificUI(...params))};
	// initSvgMapWebAppLayer
	showLayerSpecificUI(...params){ return (this.#showLayerSpecificUI(...params))}; // ISSUE : layerIDだけで起動できるスキームも欲しい（controllerURLが現状必須）
	updateLayerSpecificWebAppHandler(){
		this.#syncLayerSpecificUi(); // 非表示のレイヤーについて、レイヤーwebAppを終了させる
		this.#checkLayerListAndRegistLayerUI(); // レイヤーの読み込み完了まで　レイヤーリストのチェックを行い、レイヤ固有UIを設置する
	}
	
//	checkLayerListAndRegistLayerUI(...params){ return (this.#checkLayerListAndRegistLayerUI(...params))};
//	startLayerLoadingMonitor(...params){ return (this.#startLayerLoadingMonitor(...params))};
//	syncLayerSpecificUi(...params){ return (this.#syncLayerSpecificUi(...params))};
//	launchController(...params){ return (this.#launchController(...params))};
//	layerSpecificUIhide(...params){ return (this.#layerSpecificUIhide(...params))};

}

export { LayerSpecificWebAppHandler }