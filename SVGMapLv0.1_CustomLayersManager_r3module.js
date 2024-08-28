// 
// Description:
// SVGMap Custom Layers Manager Module for >rev17 of SVGMap Lv0.1 framework
// Programmed by Satoru Takagi
// 
//  Programmed by Satoru Takagi
//  
//  Copyright (C) 2021- by Satoru Takagi @ KDDI CORPORATION
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
//  2021/02/10 大まかな外観ができつつあるところかな
//  2021/03/10 ようやく初期的な動作が確認できた　ただしまだたくさん課題がある
//  2021/04/01 Rev1: 完成かな
//  2021/07/14 同じドメインに複数のルートコンテナがあるケースに対応
//  2021/07/21 Rev2: レイヤー名(title)が同じで、グループ名(class)だけ異なるレイヤーを異なるレイヤーとして扱う機構
//  2021/07/26 いろいろバグが取れて多分ちゃんとしたと思います。
//  2022/07/19 リファクタリング(ESM,class,windowMessaging)

// TBDs/ISSUEs
//  DONE: 複数のセッティングを使えるように
//  DONE: 現在使用中のカスタムレイヤー設定＋レイヤUIでのオンオフ状態をベースにさらに編集
//  DONE: viewBoxの設定は？
//  DONE: カスタムレイヤー設定を使わない設定
//  DONE: レイヤーのclass(グループ)を使う

/**
レイヤーをカスタマイズするために、
window.localStorage.svgmap_customLayers に設定されるべきJSON　customLayersObjectの構造

customLayersObject.customLayersSettings[setKey].metadata
customLayersObject.customLayersSettings[setKey].data=customLayers[] : 連想配列の要素の値(customLayers)がカスタマイズのためのレイヤ設定情報 (複数格納できることにする)
customLayersObject.currentSettingKey=setKey : currentSettingKeyは、実際にカスタマイズしてほしいレイヤ設定情報のKey
customLayersObject.rootContainerHref : このセッティングのルートコンテナのhref(絶対パス) added 2021/7/14
customLayersObject.settingRevision

customLayers[layerTitle] = layerSettingObject

layerTitle ： レイヤーのtitle

layerSettingObject[key]=value

key : value 
delete :  true : そのレイヤーを削除する (以下の設定はすべて無視される)
add : [true|{afterTitle,afterHref}] : そのレイヤーは新規に追加するレイヤー （ただし同じtitleのレイヤーが存在するときは無視する）
	afterTitle : そのnameのタイトルのレイヤの前にインサートする, ""もしくはtrueの場合は末尾(レイヤ的には一番上)
	afterHref : そのtitleが無い場合、このurlの前にインサートする
href : URL : レイヤールートのxlink:hrefにそのURLを設定
[others] : VAL: [others]アトリビュートにそのVALを設定
**/

import { InterWindowMessaging } from './InterWindowMessaging.js';

class  SvgMapCustomLayersManager{
	
	constructor(svgMap, layersCustomizerGetter ){
		if ( typeof(svgMap) == "object"){
			// svgMapがある場合にはそれなりの動きを行う
			this.#hasSvgMapObj = true;
			this.#svgMapObject = svgMap;
		}
		this.#getLayersCustomizer = layersCustomizerGetter
		this.#initInterWindowMessenger();
	}
	
	#iwmsg; // InterWindowMessenger
	#getLayersCustomizer;
	#initInterWindowMessenger(){
		this.#iwmsg = new InterWindowMessaging({
			getDetailedLayersPropertySet : this.#getDetailedLayersPropertySet.bind(this), 
			getDetailedOriginalLayersPropertySet : this.#getDetailedOriginalLayersPropertySet.bind(this), 
			setCustomLayerSettingIndex : this.#setCustomLayerSettingIndex.bind(this), 
			applyCustomLayers : this.#applyCustomLayers.bind(this), 
			getRootContainerXML : this.#getRootContainerXML.bind(this),
			registCustomLayer : this.#registCustomLayer.bind(this), 
			loadCustomLayerSettings : this.#loadCustomLayerSettings.bind(this), 
			storeCustomLayerSettings : this.#storeCustomLayerSettings.bind(this), 
			deleteAllCustomLayerSettings : this.#deleteAllCustomLayerSettings.bind(this), 
			deleteAllCustomViewBoxSettings : this.#deleteAllCustomViewBoxSettings.bind(this), 
			buildCustomGeoViewboxSettingObject : this.#buildCustomGeoViewboxSettingObject.bind(this), 
			loadCustomGeoViewboxes : this.#loadCustomGeoViewboxes.bind(this), 
			storeCustomGeoViewboxes : this.#storeCustomGeoViewboxes.bind(this), 
			applyCustomLayersSettingsToCurrentMapView : this.#applyCustomLayersSettingsToCurrentMapView.bind(this), 
			deleteCustomLayerSetting : this.#deleteCustomLayerSetting.bind(this), 
			buildCustomLayersSetting : this.#buildCustomLayersSetting.bind(this), 
			mergeSettings : this.#mergeSettings.bind(this), 
		// svgMapObjectを呼び出すもの
			getGeoViewBox : this.#svgMapObject.getGeoViewBox.bind(this.#svgMapObject), 
			setGeoViewPort : this.#svgMapObject.setGeoViewPort.bind(this.#svgMapObject), 
			getResume : this.#svgMapObject.getResume.bind(this.#svgMapObject), 
			setResume : this.#svgMapObject.setResume.bind(this.#svgMapObject), 
			refreshScreen : this.#svgMapObject.refreshScreen.bind(this.#svgMapObject), 
		} , this.#getLayersCustomizer);
	}
	
	#hasSvgMapObj=false;
	#svgMapObject=null;
	
	
	#originalLayersPropertySet = null;
	
//	#rootContainer
//	#rootContainerHref; // 2021/7/14
	
	//var customLayersObject = null; // GLOBALを廃止する 2021/7/26
	
		
	static #settingRevision = "r2"; // 2021/07/26 localStorageはリビジョンを入れて確認するようにする
	static #localStorageSvgMapSuffix = "svgmap_";
	static #customLayersKey = "customLayers";
	static #customGeoViexboxesKey = "customGeoViewboxes";
	
	async #loadOriginalLayersPropertySet(){
		if ( this.#hasSvgMapObj == false ){
			console.warn("This Object don't have svgMapObject. Exit.");
			return(null);
		}
		var originalPath = (new URL(this.#svgMapObject.getSvgImagesProps()["root"].Path,location.href)).href;
		var lpOriginal = await this.#getDetailedLayersPropertySetFromPath(originalPath,true);
		this.#setOriginalLayersPropertySet( lpOriginal );
	}
	
	async #getDetailedOriginalLayersPropertySet(){
		if ( this.#originalLayersPropertySet == null ){
			await this.#loadOriginalLayersPropertySet();
		}
		return ( this.#deepCopy(this.#originalLayersPropertySet));
	}
	
	#registCustomLayer(customLayerObject, applyImmediately, customLayerMetadata){
		// カスタムレイヤー設定を1個追加・上書き？登録、カレントをそれにする
		console.log("registCustomLayer:",customLayerObject, applyImmediately, customLayerMetadata);
		/**
		if ( !customLayersObject ){ // GLOBALを廃止する 2021/7/26
			customLayersObject = loadCustomLayerSettings();
		}
		**/
		var customLayersObject = this.#loadCustomLayerSettings();
		if ( !customLayerMetadata || !customLayerMetadata.key){
			var dt = new Date();
			customLayerMetadata = {
				key: "L_"+dt.getTime(),
				time: dt.getTime(),
				title: dt.toString(),
				description: ""
			}
		}
		customLayersObject.customLayersSettings[customLayerMetadata.key] = {
			data : customLayerObject,
			metadata : customLayerMetadata
		};
		customLayersObject.currentSettingKey = customLayerMetadata.key;
		
		this.#storeCustomLayerSettings( customLayersObject );
		
		if ( applyImmediately && this.#hasSvgMapObj ){
			this.#applyCustomLayers(customLayersObject);
			this.#svgMapObject.refreshScreen();
		}
	}
	
	/**
	function registCustomLayers(customLayersObject, applyImmediately){
		// カスタムレイヤーの情報を設定する
		storeCustomLayerSettings( customLayersObject );
		if ( svgMap && applyImmediately ){
			applyCustomLayers(customLayersObject);
			svgMap.refreshScreen();
		}
	}
	**/
	
	#applyCustomLayers(customLayersObject, baseLayersPropertySet){
		// 設定したカスタムレイヤー設定を　SVGMapのルートコンテンツ（レイヤルートコンテナ）に反映させる
		// 初期状態のコンテンツではなく、現在表示されている状態のコンテンツに対して反映させる処理を行っている
		// refreshScreenはやってない
		// baseLayersPropertySetがある場合は、svgMapルートコンテンツの編集は行わず、
		// カスタムレイヤ設定UIのためのオブジェクト(layersProperty構造のデータ)を出力する
		
		var editSvgMap = true;
		//console.log("applyCustomLayers: customLayersObject:",customLayersObject, " baseLayersPropertySet:",baseLayersPropertySet);
		
		// 前準備 (customLayersSet lp(rootContainer)を獲得)
		if ( typeof(baseLayersPropertySet)=="object" ){
			editSvgMap = false;
		}
		
		if ( !this.#hasSvgMapObj ){
			if ( typeof(baseLayersPropertySet)=="object" ){
				editSvgMap = false;
			} else {
				console.error("No svgMap Object..");
				return ( false );
			}
		}
		
		var rootContainer;
		if ( editSvgMap ){
			rootContainer = this.#getRootContainer();
			if ( !rootContainer ){
				console.error("Can't get rootContainer");
				return;
			}
		}
		
		if ( !customLayersObject ){
			customLayersObject = this.#loadCustomLayerSettings();
		}
		if ( this.#checkCustomLayersObject(customLayersObject) == false ){
			console.warn("customLayersObject is invalid");
			return ( false );
		}
		var currentSettingKey = customLayersObject.currentSettingKey;
		if (!currentSettingKey ){
			console.warn("customLayersObject's currentSettingKey is not assigned. : customLayersObject:",customLayersObject);
			return;
		}
		console.log(customLayersObject,currentSettingKey);
		var customLayersSet = customLayersObject.customLayersSettings[currentSettingKey].data;
		console.log("applyCustomLayers:customLayersSet:",customLayersSet);
		
		this.#removeIid(customLayersSet); // iidがあるといろいろ処理が破綻するので削除します。bugFix 2024/08/28
		
		var lp;
		
		if ( typeof(baseLayersPropertySet)=="object") {
			lp = baseLayersPropertySet.layersProperty;
		} else {
			//lp = svgMapObject.getRootLayersProps(); // これをどうするか(Detailedのこちらのものじゃないな・・・)
			lp = this.#getDetailedLayersPropertySet(null,null,true).layersProperty; // getDetailedLayersPropertySetに変更(カスタムレイヤー編集時に、単独動作可能なように)
		}
		//console.log("applyCustomLayers:LayersPropertySet(ORIGINAL):",lp);
		// 前準備完了
		
		var targetLayerId
		var matched = []; // レイヤーリスト(SVGMapコンテナ)に対して、カスタムレイヤー設定適用済みのモノをチェックしている
		var appliedCLS = {}; // カスタムレイヤー設定データに対して、適用済みのものをチェックしている 2021/7/27 同じCLSが何度も適用されるのを上だけでは防ぎきれない
		var hasDuplicatedLayerTitles=false;
		// レイヤ名が重複しているレイヤーを要チェックしておくduplicatedLayerTitles
		var duplicatedLayerTitles={};
		var lpTitles={};
		for ( var i = 0 ; i < lp.length ; i++ ){
			if ( lpTitles[this.#getGroupedTitle(lp[i])] ){
				hasDuplicatedLayerTitles = true;
				duplicatedLayerTitles[this.#getGroupedTitle(lp[i])] = true;
			} else {
				lpTitles[this.#getGroupedTitle(lp[i])]=true;
			}
		}
		if(hasDuplicatedLayerTitles){
			console.warn("duplicatedLayerTitles:",duplicatedLayerTitles);
		}
		
		
		// 既存レイヤーで、変更（removeも含む)するものを処理していく
		
		//console.log("First : check title and group are unchanged layer ");
		// まずはtitleとhref　(あればgroup)が共に同じモノを選択していく
		for ( var i = lp.length-1 ; i >=0 ; i-- ){
			var layerTitle = this.#getGroupedTitle(lp[i]);
			//matched.push(false);
			if ( customLayersSet[layerTitle] && !customLayersSet[layerTitle].add ){
				//console.log(layerTitle,customLayersSet[layerTitle] );
				if ( customLayersSet[layerTitle].href == lp[i].href ){
					// console.log("edit");
					if ( editSvgMap ){
//							targetLayerId = svgMapObject.getLayerId(layerTitle); // title重複コンテンツは、これで想定外のものを選んでしまってる 2021/04/06
//							targetLayerId = getElementByAttr2( rootContainer , layerTitle , "title" , lp[i].href , "xlink:href").getAttribute("iid"); //  group検索できてない　下で解決
						var plt = this.#parseGroupedTitle(layerTitle);
						targetLayerId =  this.#getElementByTitleGroupXlink( rootContainer , plt.title, plt.group, lp[i].href ).getAttribute("iid"); // 2021/07/21
						// console.log(plt,targetLayerId);
						
						if ( duplicatedLayerTitles[layerTitle] ){
							console.warn("edit duplicatedLayer:",layerTitle,lp[i].href, getElementByAttr( rootContainer , targetLayerId , "iid" ).getAttribute("xlink:href"));
						}
						this.#editLayer(targetLayerId,customLayersSet[layerTitle], rootContainer);
					}
					this.#editLayerProperty(i,customLayersSet[layerTitle],lp);
					appliedCLS[layerTitle]=true;
					matched[i]=true;
				} else {
					console.error("href is unmatched!!!: title:",layerTitle,"  href:",customLayersSet[layerTitle].href , " vs " , lp[i].href,"  SKIP IT");
					matched[i]="href is unmatched:"+layerTitle;
				}
			} else {
				matched[i]=false;
			}
		}
		
		//console.log("Next : check title or group are changed layer : matched:",matched);
		// 残ったものについては、titleが変わっているが、URLが同じモノを対象として選択する
		// URLが変わっているものは変更対象とはしない～下記のaddでのみ対応する
		var matchedCustomLayers={}; // 同じURLのものに二重適用されるのを防ぐ 2021/3/17
		for ( var i = lp.length-1 ; i >=0 ; i-- ){
			if ( matched[i]==false){
				for ( var layerTitle in customLayersSet ){
					if ( appliedCLS[layerTitle] ){continue;}
					if (customLayersSet[layerTitle].href == lp[i].href  && !customLayersSet[layerTitle].add && !matchedCustomLayers[layerTitle]){
						// console.log("edit");
						if ( editSvgMap ){
//								targetLayerId = svgMapObject.getLayerId(lp[i].title); //  svgMap.getLayerIdは classが加味できてない(下記で対策)
							var plt = this.#parseGroupedTitle(this.#getGroupedTitle(lp[i]));
							targetLayerId =  this.#getElementByTitleGroupXlink( rootContainer , plt.title, plt.group, lp[i].href ).getAttribute("iid");
							this.#editLayer(targetLayerId,customLayersSet[layerTitle], rootContainer);
						}
						this.#editLayerProperty(i,customLayersSet[layerTitle],lp);
						appliedCLS[layerTitle]=true;
						matched[i]=true;
						matchedCustomLayers[layerTitle]=true;
					}
				}
			}
		}
		
		
		// 次(最後)に、add属性があるものを追加する
		// titleが変わっていないが、URLが変わっているものはこちら側で処理するようにしてみる
		
		
		var addOrder =[];
		var nfl =[];
		// 追加されたレイヤーのさらに前に追加されたレイヤーがあるとかだと失敗するので順番を気にしないと見つからない
		// という問題を解決するための前処理
		for ( var layerTitle in customLayersSet ){
			if (customLayersSet[layerTitle].add ){
				var afterLayer = customLayersSet[layerTitle].add;
				if ( afterLayer.afterTitle ){
					var afl = this.#findLayer(afterLayer.afterTitle,afterLayer.afterHref,lp); 
					if ( afl && afl.level=="all"){ // 厳密一致させないとまずいと思われる
						//console.log("found ins pos:",layerTitle,"  afl:",afl);
						addOrder.push(layerTitle);
					} else {
//							console.log("NOT found ins pos:",layerTitle);
						nfl.push(layerTitle);
					}
				} else {
					addOrder.push(layerTitle);
				}
			}
		}
		
		function makeAddOrder(nfl){
			// 追加されたレイヤーのさらに前に追加されたレイヤーがある系を再帰処理で並べる
			var nnfl = [];
			for ( var i = 0 ; i < nfl.length ; i++ ){
				var aflt = customLayersSet[nfl[i]].add.afterTitle;
				if ( addOrder.indexOf(aflt)>=0){
					addOrder.push(nfl[i]);
				} else {
					nnfl.push(nfl[i]);
				}
			}
			if ( nnfl.length == 0 || nfl.length == nnfl.length ){
				// もうこれ以上見つからないので、ひとまず残りを末尾に追加して終了
				for ( var i = 0 ; i < nnfl.length ; i++ ){
					addOrder.push(nnfl[i]);
				}
				return;
			} else {
				makeAddOrder(nnfl);
			}
		}
		
		makeAddOrder(nfl);
		
		//console.log("LAST add added layers: addOrder:",addOrder);
		
		// ここまで　　　関数にした方が良いかも・・
		
		for ( var i = 0 ; i < addOrder.length ; i++ ){
			var layerTitle = addOrder[i];
			if ( appliedCLS[layerTitle] ){continue;}
//				console.log("add:", layerTitle);
			var hasSameTitle=false;
			for ( var j = 0 ; j < lp.length ; j++ ){
				if ( this.#getGroupedTitle(lp[j]) == layerTitle ){
					hasSameTitle = true;
				}
			}
			if ( ! hasSameTitle ){ // 同じtitleがないものだけが有効
				if ( editSvgMap ){
					this.#addLayer(layerTitle,customLayersSet[layerTitle], rootContainer);
				}
				appliedCLS[layerTitle]=true;
				this.#addLayerProperty(layerTitle,customLayersSet[layerTitle],lp);
			} else {
				console.error("Already exists the same title layer : ", layerTitle,"  SKIP...");
			}
		}
		
		// ここまでがaddのもの
		// console.log(Object.keys(customLayersSet),Object.keys(appliedCLS),matched);
		//console.log("Applied layer prop:",lp);
		return ( lp ); // 2021/3/17 既存カスタムレイヤーの編集のためにUIを生成するときに使える
	}
	
	#findLayer(groupedTitle,url,lp){
		// 第一優先はtitle+url　あればグループ
		// 第二優先はtitle(あればグループ)
		// 第三優先はurl
		// 　で　レイヤーを検索する
		// titleはtitle\ngroupとなっているケースも考慮する 2021/07/21
		
		var pgt = this.#parseGroupedTitle(groupedTitle);
		var title = pgt.title;
		var group = pgt.group;
		
		for ( var i = 0 ; i < lp.length ; i++ ){
			if( lp[i].title == title && lp[i].href == url ){
				if ( group ){ // 2021/07/21
					if ( lp[i].detail.group == group ){
						return({index:i,level:"all"});
					}
				} else {
					return({index:i,level:"all"});
				}
			}
		}
		for ( var i = 0 ; i < lp.length ; i++ ){
			if( lp[i].title == title ){
				if ( group ){ // 2021/07/21
					if ( lp[i].detail.group == group ){
						return({index:i,level:"title"});
					}
				} else {
					return({index:i,level:"all"});
				}
			}
		}
		for ( var i = 0 ; i < lp.length ; i++ ){ // 2021/07/21 url一致は第三優先にした・・
			if( lp[i].href == url ){
				return({index:i,level:"href"});
			}
		}
		return ( null );
	}
	
	#editLayer(layerId, prop, rootContainer){
		// ルートコンテナSVGのレイヤー対応要素をpropに基づき編集する
		// var layer = rootContainer.getElementById(layerId);
		var layer = this.#getElementByAttr( rootContainer , layerId , "iid" );
		// console.log("editLayer:",rootContainer,layerId,layer,prop);
		var originalHref = (layer.getAttribute("xlink:href")).trim();
		if ( prop.delete ){
			layer.parentNode.removeChild(layer);
			return;
		}
		for ( var key in prop ){
//				console.log("key:",key,"  val:",prop[key]);
			if ( key == "delete"){
				continue;
			}
			if ( key == "href" ){
				if ( originalHref != prop.href ){
					layer.setAttribute("xlink:href", prop.href);
				} else {
//						console.log("no change href");
				}
			} else {
				if ( prop[key] == "" ){
					layer.removeAttribute(key);
				} else {
//						console.log( key,prop[key]);
					layer.setAttribute(key, prop[key]);
//						console.log(layer.getAttribute(key));
				}
			}
		}
		console.log("layer:",layer,layer.getAttribute("visibility"));
	}
	
	#addLayer(groupedTitle, prop, rootContainer){
		// propのaddのvalが""もしくはtrueならばドキュメント末尾(すなわち一番上)に追加する
		var layer = rootContainer.createElement("animation");
		var title=this.#parseGroupedTitle(groupedTitle).title;
		layer.setAttribute("title",title);
		// これいい加減すぎ・・ まずい気がする・・・ 2021/3/11
		layer.setAttribute("x",-30000);
		layer.setAttribute("y",-30000);
		layer.setAttribute("width",60000);
		layer.setAttribute("height",60000);
		for ( var key in prop ){
			if ( key == "add" ){
				continue;
			}
			if ( key == "href" ){
				layer.setAttribute("xlink:href", prop.href);
			} else {
				layer.setAttribute(key, prop[key]);
			}
		}
		
		var afterLayer;
		if ( prop.add =="" || prop.add ==true){
			afterLayer = null;
		} else {
			var atg = this.#parseGroupedTitle(prop.add.afterTitle);
//				afterLayer = getElementByAttr( rootContainer , prop.add.afterTitle , "title" );
			afterLayer = this.#getElementByTitleGroupXlink( rootContainer , atg.title, atg.group);
			if ( !afterLayer ){
				afterLayer = this.#getElementByAttr( rootContainer , prop.add.afterHref , "xlink:href" );
				if ( afterLayer ){
					console.error("Can't find afterLayer element titled:",atg, "  but found ",afterLayer );
				}
			}
			if ( !afterLayer ){
				console.error("Can't find afterLayer element...:", prop.add, "   for ", atg , "layer.");
			}
		}
		if ( afterLayer ){
			var parentElem = afterLayer.parentElement;
			parentElem.insertBefore(layer,afterLayer);
		} else {
			rootContainer.documentElement.appendChild(layer);
		}
	}
	
	
	#editLayerProperty(idx,targetLayerProp,layersProperty){
		// こちらは　layersPropertyオブジェクト（SVGのルートコンテナでなく）を編集している
		var originalHref = layersProperty.href;
		if ( targetLayerProp.delete ){
			layersProperty.splice(idx,1);
			return;
		}
		for ( var key in targetLayerProp ){
			if ( key == "delete"){
				continue;
			}
			if ( key == "href" ){
				layersProperty[idx].href= targetLayerProp.href;
			} else if ( key == "title" ){
				layersProperty[idx].title= targetLayerProp.title;
			} else if ( key == "visibility" ){
				if ( targetLayerProp[key]=="visible" || targetLayerProp[key]=="" ){
					layersProperty[idx].visible= true;
				} else {
					layersProperty[idx].visible= false;
				}
			} else if ( key == "opacity" ){
				layersProperty[idx].opacity= targetLayerProp.opacity;
			} else if ( key == "class"){
				layersProperty[idx].detail = getClassDetail(targetLayerProp.class, {});
			}
			
			if ( key != "href"){
				layersProperty[idx].attributes[key]= targetLayerProp[key];
			} else {
				layersProperty[idx].attributes["xlink:href"]= targetLayerProp[key];
			}
		}
		if (layersProperty[idx].detail == undefined ){
			delete layersProperty[idx].detail;
		}
	}

	#addLayerProperty(layerTitle,targetLayerProp,layersProperty){
		// console.log("addLayerProperty: layersProperty:",layersProperty);
		// addされるときは必ず存在しているので固定的に構築。
		var nl ={
			href:targetLayerProp.href,
			opacity:targetLayerProp.opacity,
			title:targetLayerProp.title,
			visibile:false,
			attributes:{
			},
			detail:this.#getClassDetail(targetLayerProp.class, {})
		}
		for ( var key in targetLayerProp){
			if ( key == "add" ){
				continue;
			} else if ( key != "href"){
				nl.attributes[key]= targetLayerProp[key];
			} else {
				nl.attributes["xlink:href"]= targetLayerProp[key];
			}
		}
		
		var afterIndex=-1;
		if ( targetLayerProp.add =="" || targetLayerProp.add ==true){
			afterIndex = -1; // 一番先頭に追加
		} else {
			var afl = this.#findLayer(targetLayerProp.add.afterTitle,targetLayerProp.add.afterHref,layersProperty);
			if ( afl ){
				afterIndex = afl.index;
				// console.log("found afterLayer");
			} else {
				console.error("Can't find afterLayer ...:", targetLayerProp.add,"  then add top..");
			}
		}
		if ( afterIndex == -1 ){
			layersProperty.push(nl);
		} else {
			layersProperty.splice(afterIndex,0,nl);
		}
	}
	
	
	#getGroupedTitle(oneLayerProperty){
		// 2021/7/20 CustomLayersSettingの連想配列Keyをグループを加味したものにするため
		var lTitle = oneLayerProperty.title;
		if ( oneLayerProperty.detail && oneLayerProperty.detail.group ){
			var lGroup = oneLayerProperty.detail.group;
			return ( lTitle + "\t" + lGroup );
		} else {
			return ( lTitle );
		}
	}
	
	#parseGroupedTitle(groupedTitle){
		groupedTitle=groupedTitle.split("\t");
		var title=groupedTitle[0];
		var group = null;
		if ( groupedTitle.length == 2 ){
			group = groupedTitle[1];
		}
		return {
			group:group,
			title:title,
		}
	}
	
	#buildCustomLayersSetting( editedLayersProperty, originalLayersProperty){
		// 編集前後のlayerPropからCustomLayersSettingオブジェクトを生成する
		// editedLayersProperty : 編集後のlayerProp.
		// originalLayersProperty : 編集前のlayerProp.
		if (!originalLayersProperty && this.#originalLayersPropertySet){
			originalLayersProperty = this.#deepCopy(this.#originalLayersPropertySet).layersProperty;
		}
		
		// 編集前後でDifを取る 2021/7/20
		var difObj = this.#getDif(editedLayersProperty, originalLayersProperty);
		
		var cls = {};
		console.log("buildCustomLayersSetting:",editedLayersProperty, originalLayersProperty, this.#originalLayersPropertySet);
		console.log("buildCustomLayersSetting:",difObj);
		// 削除されたレイヤーを登録する
		for ( var i = 0 ; i < difObj.delIndex.length ; i++ ){
			cls[this.#getGroupedTitle(originalLayersProperty[difObj.delIndex[i]])]={
				delete:true,
				href:originalLayersProperty[difObj.delIndex[i]].href
			};
		}
		
		// ISSUE レイヤ名同じでURLが変わると、deleteしたうえで同じレイヤがaddされ、
		// 結果的にdeleteの方が下で上書きされちゃう・・・ まぁ、これはこれで良いのかも？？ URL書き換わった時点で全然別のリソースという位置づけなので　しいて言えば、delete and add ということがわかるようになっているべきかも
		
		// 追加されたレイヤーを登録する
		for ( var i = 0 ; i < difObj.addIndex.length ; i++ ){
			var aindex = difObj.addIndex[i];
			var aftLayer;
			if ( aindex == editedLayersProperty.length - 1 ){
				aftLayer = true;
			} else {
				// このレイヤーの前に追加しているという意味です(DOMのinsertBeforeのポインタとなる)
				aftLayer = {
					afterTitle:this.#getGroupedTitle(editedLayersProperty[aindex+1]),
					afterHref:editedLayersProperty[aindex+1].href
				};
			}
			var title = this.#getGroupedTitle(editedLayersProperty[aindex]);
			if ( cls[title] && cls[title].delete ){
				cls[title].originalHref=cls[title].href;
			} else {
				cls[title] = {};
			}
			cls[title].add=aftLayer;
			
			for ( var key in editedLayersProperty[aindex].attributes ){
				cls[title][key]= editedLayersProperty[aindex].attributes[key];
				if ( key == "xlink:href"){
					cls[title].href = editedLayersProperty[aindex].attributes[key];
				}
			}
		}
		
		// 属性が変更されたレイヤー(レイヤーtitleの変更も含む)を登録する
		for ( var i = 0 ; i < difObj.attrChangedIndex.length ; i++ ){
			var title = this.#getGroupedTitle(editedLayersProperty[difObj.attrChangedIndex[i].edited]);
			var href = editedLayersProperty[difObj.attrChangedIndex[i].edited].href;
			var attributes = difObj.attrChangedIndex[i].attributes;
			var changedAttrs ={};
			if (attributes.changedAttributes){
				for ( var key in attributes.changedAttributes ){
					changedAttrs[key]=attributes.changedAttributes[key];
				}
			}
			if (attributes.removedAttributes){
				for ( var key in attributes.removedAttributes ){
					changedAttrs[key]="";
				}
			}
			if (attributes.addedAttributes){
				for ( var key in attributes.addedAttributes ){
					changedAttrs[key]=attributes.addedAttributes[key];
				}
			}
			cls[title]=changedAttrs;
			cls[title].href = href;
		}
		
		return ( cls );
	}
	
	async #getDetailedLayersPropertySetFromPath(rootContainerUrl, ignoreIid){
		// getDetailedLayersPropertySetを、svgMapオブジェクトがない環境で構築する
		// rootContainerUrl = new URL(url, [base]) (awaitで呼び出し)
		// or
		// rootContainerUrl_or_doc : パス文字列
		var res = await fetch(rootContainerUrl);
		var apath = (new URL(rootContainerUrl,location.href)).pathname
		var xmlTxt = await res.text();
		var rcDoc = (new DOMParser()).parseFromString(xmlTxt, "text/xml");
		
		var ans = this.#getDetailedLayersPropertySet(rcDoc, apath, ignoreIid);
		return ( ans );
	}
	
	#tryRootContainerDocument(){
		var rootPath; // 2021/7/12 追加
		if ( this.#hasSvgMapObj ){
			console.warn("Get root container document from this window's svgMap");
			rootPath = this.#getRootContainerHref();
			var rootContainerDoc = this.#getRootContainer();
			return { rootContainerDoc:rootContainerDoc, rootContainerHref:rootPath };
		} else {
			console.warn("Can't get root container live document from this windows's svgMap ");
			return { rootContainerDoc:null, rootContainerHref:null };
		}
	}
	
	#getDetailedLayersPropertySet(rootContainerDoc, rootContainerHref_in, ignoreIid){
		// getDetailedLayersPropertySetを、svgMapオブジェクトがない環境で構築する
		// rootContainerDoc: ルートのSVGMapコンテンツ文書
		// rootContainerHref: 同href(ドメインルートからの絶対パス)
		//  無い場合は、自身のもしくはwindow.openerとそのsvgMapから取得を試みる
//			originalLayersPropertySet = null;
		
		var rootContainerDoc;
		
		if ( !rootContainerDoc || !rootContainerHref_in ){
			var trcd = this.#tryRootContainerDocument();
			rootContainerDoc = trcd.rootContainerDoc;
			rootContainerHref_in = trcd.rootContainerHref;
		} else {
			// rootContainerDoc = rootContainerDoc_or_mapWindow;
		}
		
		//rootContainerHref = rootContainerHref_in; // グローバル変数(rootContainerHref)に格納
		//console.log("rootContainerHref:",rootContainerHref);
		if (!rootContainerDoc){
			console.error("No rootContainerDoc");
			return(null);
		}
		
		var layers = rootContainerDoc.getElementsByTagName("animation");
		var groups ={};
		var lp=[];
		for ( var i = 0 ; i < layers.length ; i++ ){
			lp.push({});
			
			var layer = layers[i];
			
			var attributes = {};
			for ( var j = 0 ; j < layer.attributes.length ; j++ ){
				if ( ignoreIid && layer.attributes[j].nodeName=="iid"){
					continue;
				}
				attributes[layer.attributes[j].nodeName]  = (layer.attributes[j].nodeValue).trim();
			}
			
			var detail={};
			if (attributes.class){
				detail = this.#getClassDetail(attributes.class, groups, i);
			}
			
			if (attributes.opacity){
				lp[i].opacity=Number(attributes.opacity);
			}
			
			lp[i].visibile = true;
			if ( attributes.visibility == "hidden" || attributes.display == "none"){
				lp[i].visibile = false;
			}
			
			var href = attributes["xlink:href"];
			var title = layer.getAttribute("title");
			if ( !title ){
				title = href;
			}
			
			lp[i].title=title;
			lp[i].href=href;
			lp[i].attributes = attributes;
			lp[i].detail = detail;
		}
		//console.log("lp:",lp," groups:",groups);
		var ans = {
			layersProperty:lp,
			groupsProperty: groups,
			rootContainerHref:rootContainerHref_in // added 2021/7/12 localStorageをhref毎に作るため
		};
//			originalLayersPropertySet = deepCopy(ans);
		return ( ans );
	}
	
	#getClassDetail(classStr, groups, layerIndex){
		var detail={};
		if ( !classStr || classStr==""){
			return detail;
		}
		var cls = classStr.split(" ");
		for (var j = 0 ; j< cls.length ; j++){
			if (cls[j].trim().toLowerCase()=="clickable"){
//							lp[i].clickable=true;
				detail.clickable=true;
			} else if (cls[j].trim().toLowerCase()=="editable"){
//							lp[i].editable=true;
				detail.editable=true;
			} else if (cls[j].trim().toLowerCase()=="switch"){
				detail.switch=true;
			} else if (cls[j].trim().toLowerCase()=="batch"){
				detail.batch=true;
			} else {
				detail.group = cls[j];
				if ( !groups[detail.group] ){
					groups[detail.group]={};
					groups[detail.group].members=[];
				}
				groups[detail.group].members.push(layerIndex);
			}
			if ( detail.group ){
				if ( detail.switch ){
					groups[detail.group].switch = true;
				}
				if ( detail.batch ){
					groups[detail.group].batch = true;
				}
			}
		}
		return ( detail );
	}
	
	#setOriginalLayersPropertySet(layersPropertySet){
		this.#originalLayersPropertySet = this.#deepCopy(layersPropertySet);
	}
	
	#deepCopy(obj){
		// 雑な深いコピー
		return ( JSON.parse(JSON.stringify(obj)) );
	}
	
	
	#testOrig=[
		{title:"a",href:"A",attributes:{a:"a",b:"b",c:"c"}},
		{title:"b",href:"B",attributes:{a:"a",b:"b",c:"c"}},
		{title:"c",href:"C",attributes:{a:"a",b:"b",c:"c"}},
		{title:"d",href:"D",attributes:{a:"a",b:"b",c:"c"}},
		{title:"e",href:"E",attributes:{a:"a",b:"b",c:"c"}},
		{title:"f",href:"F",attributes:{a:"a",b:"b",c:"c"}},
		{title:"g",href:"G",attributes:{a:"a",b:"b",c:"c"}},
		{title:"h",href:"H",attributes:{a:"a",b:"b",c:"c"}},
		{title:"i",href:"I",attributes:{a:"a",b:"b",c:"c"}},
	];
	/**
	var testEdit=[
		{title:"x",href:"X",attributes:{a:"a",b:"b",c:"c"}},
		{title:"a",href:"A",attributes:{a:"a",b:"b",c:"c"}},
		{title:"b",href:"B",attributes:{a:"a",b:"b",c:"c"}},
		{title:"d",href:"D",attributes:{a:"a",b:"b",c:"c"}},
		{title:"y",href:"Y",attributes:{a:"a",b:"b",c:"c"}},
		{title:"z",href:"Z",attributes:{a:"a",b:"b",c:"c"}},
		{title:"g",href:"G",attributes:{a:"a",b:"b",c:"c"}},
		{title:"w",href:"W",attributes:{a:"a",b:"b",c:"c"}},
		{title:"v",href:"V",attributes:{a:"a",b:"b",c:"c"}},
	];
	**/
	#testEdit=[
		{title:"a",href:"A",attributes:{a:"A",b:"b",c:"c"}},
//			{title:"b",href:"B",attributes:{a:"a",b:"b",c:"c"}},
		{title:"c",href:"C",attributes:{a:"a",b:"b",c:"c"}},
		{title:"a",href:"A",attributes:{a:"a",b:"b",c:"c"}},
		{title:"d",href:"D",attributes:{a:"a",b:"b",c:"c"}},
		{title:"e",href:"E",attributes:{a:"a",b:"b",c:"c",d:"d"}},
		{title:"f",href:"F",attributes:{a:"a",b:"b",c:"c"}},
		{title:"g",href:"G",attributes:{a:"a",b:"b",c:"c"}},
		{title:"h",href:"H",attributes:{a:"a",c:"c",k:"K"}},
//			{title:"i",href:"I",attributes:{a:"a",b:"b",c:"c"}},
		{title:"w",href:"W",attributes:{a:"a",b:"b",c:"c"}},
	];

	#ignoreTitle = true; // titleが違ってもURLが同じならそのれいやーは「あり」、title属性が変化しているだけだと判断するときtrue　(なお、URLが変更されたレイヤーは、常に削除の上追加という位置づけにしてる)
	
	#getDif( edit, orig ){
		if ( !edit ){
			edit = this.#testEdit;
		}
		
		if ( !orig ){
			if ( this.#originalLayersPropertySet ){
				orig = this.#deepCopy(this.#originalLayersPropertySet).layersProperty;
			} else {
				orig = this.#testOrig
			}
		}
		
		// まず、削除・追加されたレイヤーを探索する
		// 適当に作ってみたdifアルゴリズム
		var clset = {};
		var cp = 0;
		var delIndex =[];
		var existIndex =[];
		var addIndex=[];
		for ( var i = 0 ; i < orig.length ; i++ ){
			var dp = cp;
			var deleted = false;
			// console.log(i,orig[i],dp,edit[dp]);
			if(dp >= edit.length ){
				deleted = true;
				delIndex.push(i);
			} else {
				while ( (!this.#ignoreTitle && orig[i].title != edit[dp].title) || orig[i].href != edit[dp].href){
					if ( dp == edit.length -1 ){
						//  最後まで探したけれどなかった(これを[最後までではなくある程度]にすると挙動を調整できるかも？
						deleted=true;
						delIndex.push(i);
						break;
					}
					++dp;
				}
			}
			if ( !deleted ){
				// みつかった
				existIndex.push({original:i,edited:dp});
				if ( cp != dp ){
					for ( var j = cp ; j < dp ; j++ ){
						console.log("added?:",j);
						addIndex.push(j);
						
					}
				}
				cp = dp+1;
			}
		}
		
		for ( var j = cp ; j < edit.length ; j++ ){
			console.log("added?:",j);
			addIndex.push(j);
			
		}
		
		// console.log(cp);
		// console.log("exist:",existIndex,"\ndeleted:",delIndex,"\nadded:",addIndex);
		
		
		var attrChangedIndex=[];
		// 次に、存在しているレイヤーについて、属性の変化を探索する
		for ( var i = 0 ; i < existIndex.length ; i++ ){
			var frl = orig[existIndex[i].original];
			var tol = edit[existIndex[i].edited];
			var changed = false;
			var changedAttributes = {};
			var removedAttributes = {};
			var addedAttributes = {};
			// from側のattrを探索
			for ( var fa in frl.attributes ){
				if ( tol.attributes[fa] ){
					if ( frl.attributes[fa] != tol.attributes[fa]){ // to側にもあったが値が違う
						changed = true;
						changedAttributes[fa]=tol.attributes[fa];
					}
				} else { // to側に無い
					changed = true;
					removedAttributes[fa]="";
				}
			}
			// to側のattrを探索
			for ( var ta in tol.attributes ){
				if ( !frl.attributes[ta] ){ // from側に無い
					changed = true;
					addedAttributes[ta]=tol.attributes[ta];
				}
			}
			
			if ( changed ){
				var cas = {}
				if ( Object.keys(removedAttributes).length>0){
					cas.removedAttributes = removedAttributes;
				}
				if ( Object.keys(changedAttributes).length>0){
					cas.changedAttributes = changedAttributes;
				}
				if ( Object.keys(addedAttributes).length>0){
					cas.addedAttributes = addedAttributes;
				}
				attrChangedIndex.push({
					original:existIndex[i].original,
					edited:existIndex[i].edited,
					attributes:cas
				});
			}
		}
		
		// console.log("attrChanged:",attrChangedIndex);
		
			return({
				attrChangedIndex : attrChangedIndex,
				existIndex : existIndex,
				delIndex : delIndex,
				addIndex : addIndex
			});
	}
	
	
	#getDetailedLayersPropertySM(){ // obsoluted
		// svgMap.getRootLayersProps()だとなんか不足しているので、詳細な情報を追加する
		if ( !this.#hasSvgMapObj ){
			console.error("No svgMap Object..");
			return ( false );
		}
		var lp = this.#svgMapObject.getRootLayersProps();
		var rootContainer = this.#getRootContainer();
		// console.log("lp:",lp);
		var groups ={};
		for ( var i = 0 ; i < lp.length ; i++ ){
			var layerId = lp[i].id;
			var layer = this.#getElementByAttr( rootContainer , layerId , "iid" );
			// console.log("layerId:",layerId," layer:",layer);
			var attributes = {};
			for ( var j = 0 ; j < layer.attributes.length ; j++ ){
				attributes[layer.attributes[j].nodeName]  = layer.attributes[j].nodeValue;
			}
			var detail={};
			if (attributes.class){
				var cls = attributes.class.split(" ");
				for (var j = 0 ; j< cls.length ; j++){
					if (cls[j].trim().toLowerCase()=="clickable"){
						detail.clickable=true;
					} else if (cls[j].trim().toLowerCase()=="editable"){
						detail.editable=true;
					} else if (cls[j].trim().toLowerCase()=="switch"){
						detail.switch=true;
					} else if (cls[j].trim().toLowerCase()=="batch"){
						detail.batch=true;
					} else {
						detail.group = cls[j];
						if ( !groups[detail.group] ){
							groups[detail.group]={};
							groups[detail.group].members=[];
						}
						groups[detail.group].members.push(layerId);
					}
					if ( detail.group ){
						if ( detail.switch ){
							groups[detail.group].switch = true;
						}
						if ( detail.batch ){
							groups[detail.group].batch = true;
						}
					}
				}
			}
			if (attributes.opacity){
				lp[i].opacity=Number(attributes.opacity);
			}
			
			lp[i].attributes = attributes;
			lp[i].detail = detail;
		}
		
		// ちょっと変な構造(配列とid(layerID)による連想配列の混合)なのでそっちにもコピーしておく
		
		// detailのgroup,switchは余計だった・・　処理を消した方が良いかも
		// groups構造体はどうかな？
		
		for( var i = 0 ; i < lp.length ; i++ ){
			var layerId = lp[i].id;
			
			if ( lp[i].detail.group ){
				if ( groups[lp[i].detail.group].switch){
					lp[i].detail.switch = true;
				}
				if ( groups[lp[i].detail.group].batch){
					lp[i].detail.batch = true;
				}
			}
			
			lp[layerId].attributes=lp[i].attributes;
			lp[layerId].detail=lp[i].detail;
		}
		return ( {
			layersProperty:lp,
			groupsProperty: groups
		} );
	}
	
	#getRootContainer(){
		if ( ! this.#hasSvgMapObj ){
			console.warn("Can't get root container live document from this windows's svgMap ");
			return ( null );
		}
		var rootContainer = this.#svgMapObject.getSvgImages()["root"];
		return ( rootContainer);
	}
	
	#getRootContainerXML(){
		var doc = this.#getRootContainer();
		const serializer = new XMLSerializer();
		const xmlStr = serializer.serializeToString(doc);
		return ( xmlStr );
	}
	
	#getRootContainerHref(){
		if ( ! this.#hasSvgMapObj ){
			console.warn("Can't get root container live document from this windows's svgMap ");
			return ( null );
		}
		/**
		var svgMapObj;
		if ( typeof(svgMap)=="object" ){
			svgMapObj = svgMap;
			rootPath = (new URL(svgMapObj.getSvgImagesProps()["root"].Path,location.href)).pathname;
			console.warn("Get root container document from this window's svgMap");
		} else if ( window.opener && typeof(window.opener.svgMap) =="object"  ){
			svgMapObj = window.opener.svgMap;
			rootPath = (new URL(svgMapObj.getSvgImagesProps()["root"].Path,window.opener.location.href)).pathname;
			console.warn("Get root container live document from opener's svgMap");
		}
		**/
		var rootPath = (new URL(this.#svgMapObject.getSvgImagesProps()["root"].Path, window.location.href)).pathname;
		//console.warn("Get root container document from this window's svgMap");
		return ( rootPath );
	}
	#getLocalStorageKey(keyStr){
		var rootContainerHref = this.#getRootContainerHref();
		if ( ! rootContainerHref){
			console.error("rootContainerHref is not defined... exit");
			return ( null );
		}
		var ans = SvgMapCustomLayersManager.#localStorageSvgMapSuffix + rootContainerHref + "#" + keyStr;
		return ( ans );
	}
	
	// localStorageのカスタムレイヤー設定を変更する
	#storeCustomLayerSettings( settings ){
		window.localStorage[this.#getLocalStorageKey(SvgMapCustomLayersManager.#customLayersKey)] = JSON.stringify(settings);
	}
	
	#loadCustomLayerSettings( ){
		var ret=null;
		if ( window.localStorage[this.#getLocalStorageKey(SvgMapCustomLayersManager.#customLayersKey)] ){
			ret = JSON.parse(window.localStorage[this.#getLocalStorageKey(SvgMapCustomLayersManager.#customLayersKey)]);
		}
		
		var rootContainerHref = this.#getRootContainerHref();
		if ( ret && rootContainerHref == ret.rootContainerHref && ret.settingRevision == SvgMapCustomLayersManager.#settingRevision){
			// OK!
		} else {
			if ( ret ){
				if( rootContainerHref != ret.rootContainerHref){
					console.warn("rootContainerHref mismatch:",rootContainerHref," vs ", ret.rootContainerHref);
				}
				if (ret.settingRevision != SvgMapCustomLayersManager.#settingRevision){
					console.warn("settingRevision mismatch:",SvgMapCustomLayersManager.#settingRevision," vs ", ret.settingRevision);
				}
			}
			console.warn("create new:", ret,rootContainerHref);
			ret ={
				currentSettingKey:null,
				customLayersSettings:{},
				rootContainerHref:rootContainerHref, // 2021/7/14
				settingRevision:SvgMapCustomLayersManager.#settingRevision, // 2021/7/26
			};
		}
		
		//console.log("rootContainerHref:",rootContainerHref,"  localStorage:rootContainerHref:",ret.rootContainerHref);
		return ( ret );
	}
	
	#storeCustomGeoViewboxes(customViewBoxes){
		window.localStorage[this.#getLocalStorageKey( SvgMapCustomLayersManager.#customGeoViexboxesKey)] = JSON.stringify(customViewBoxes);
	}
	#loadCustomGeoViewboxes(){
		var ret;
		if ( window.localStorage[this.#getLocalStorageKey( SvgMapCustomLayersManager.#customGeoViexboxesKey)] ){
			ret = JSON.parse(window.localStorage[this.#getLocalStorageKey( SvgMapCustomLayersManager.#customGeoViexboxesKey)]);
		} else {
			ret ={
				currentSettingKey:null,
				settings:{}
			};
		}
		
		return ( ret );
	}
	
	#buildCustomGeoViewboxSettingObject(key, title, geoViewBoxX, geoViewBoxY, geoViewBoxWidth, geoViewBoxHeight){
		if ( !key ){
			key = "V_"+new Date().getTime();
		}
		if ( !title){
			title=key;
		}
		var ret ={
			key:key,
			title:title,
			x:geoViewBoxX,
			y:geoViewBoxY,
			width:geoViewBoxWidth,
			height:geoViewBoxHeight
		};
		return ( ret );
	}
	
	#deleteAllCustomLayerSettings( ){
		delete window.localStorage[this.#getLocalStorageKey(SvgMapCustomLayersManager.#customLayersKey)];
	}
	#deleteAllCustomViewBoxSettings( ){
		delete window.localStorage[this.#getLocalStorageKey(SvgMapCustomLayersManager.#customGeoViexboxesKey)];
	}
	
	
	#deleteCustomLayerSetting( key ){
		if ( key == undefined ){
			console.error("key is requred");
		} else {
			var st = this.#loadCustomLayerSettings();
			if (st.customLayersSettings[key] ){
				delete (st.customLayersSettings[key]);
				if ( st.currentSettingKey == key){
					// カレントが消されたけされたのでカレントを無しに・・
					st.currentSettingKey = null;
				}
				this.#storeCustomLayerSettings( st );
				return ( st );
			} else {
				console.error( "layer setting key is invalid:",key);
			}
		}
	}
	
	// カスタムレイヤー設定のカレント選択を変更する
	// localStorageを変更する
	#setCustomLayerSettingIndex(key){
		var st = this.#loadCustomLayerSettings();
		if ( !key ){
			st.currentSettingKey = null;
			this.#storeCustomLayerSettings( st );
			return ( null );
		} else if ( st.customLayersSettings[key]  ){
			st.currentSettingKey = key;
			this.#storeCustomLayerSettings( st );
			return ( st );
		} else {
			console.error( "key is invalid:",key);
		}
	}
	
	#getElementByAttr( XMLNode , searchId , atName ){
		if ( atName.indexOf(":")>0){
			// ネームスペース入りのattrをqurySelectorで使うのはほぼできないぞ！！
			// ってこどでワイルドカードネームスペースで逃げる必要がある
			// https://stackoverflow.com/questions/23034283/is-it-possible-to-use-htmls-queryselector-to-select-by-xlink-attribute-in-an
			atName = "*|"+ atName.substring(atName.indexOf(":")+1);
			
		}
		if ( !XMLNode || ! XMLNode.hasChildNodes() ){
			return ( null );
		}
		var ans = XMLNode.querySelector('['+atName+'="'+searchId+'"]');
		return ( ans );
	}
	
	#getElementByAttr2( XMLNode , searchId , atName , searchId2 , atName2){
		if ( atName.indexOf(":")>0){
			atName = "*|"+ atName.substring(atName.indexOf(":")+1);
		}
		if ( !XMLNode || ! XMLNode.hasChildNodes() ){
			return ( null );
		}
		var ans = XMLNode.querySelectorAll('['+atName+'="'+searchId+'"]');
		if ( ans.length == 0 ){
			return ( null );
//			} else if ( ans.length == 1 ){
//				return ( ans[0] );
		}
		for ( var i = 0 ; i < ans.length ; i++ ){
			var aval = ans[i].getAttribute(atName2);
			if ( aval == searchId2 ){
				return ( ans[i] );
			}
		}
		return ( null );
	}
	
	#getElementByTitleGroupXlink( XMLNode , title, group, href, allOption){
		if ( !XMLNode || ! XMLNode.hasChildNodes() ){
			return ( null );
		}
		var qans = [];
		//var anims = XMLNode.getElementsByTagName("animation");
		var anims = XMLNode.querySelectorAll('*'); // エスケープにつかれた・・
		for ( var i = 0 ; i < anims.length ; i++ ){
			if ( anims[i].getAttribute("title") && anims[i].getAttribute("title")==title){
				qans.push(anims[i]);
			}
		}
		//console.log(qans);
		/** 特殊文字いっぱいだとたいへん・・
		atName = "title";
		var qans = XMLNode.querySelectorAll('['+atName+'="'+title+'"]');
		**/
		if ( qans.length == 0 ){
			return ( null );
		}
		var rans=[];
		if ( group ){
			for ( var i = 0 ; i < qans.length ; i++ ){
				var aval = qans[i].getAttribute("class");
				if ( aval.indexOf( group)>=0 ){
					rans.push ( qans[i] );
				}
			}
		} else {
			rans = qans;
		}
		
		if ( rans.length == 0 ){
			return ( null );
		}
		
		var hans=[];
		if ( href ){
			for ( var i = 0 ; i < rans.length ; i++ ){
				var aval = rans[i].getAttribute("xlink:href").trim();
				if ( aval== href ){
					hans.push ( rans[i] );
				}
			}
		} else {
			hans = rans;
		}
		
		if ( hans.length == 0){
			return ( null );
		} else if ( hans.length == 1 ){
			return ( hans[0] );
		} else if ( allOption){
			return (hans);
		} else {
			return ( hans[0] ); // allOptionでないときは、一応　1個以上の候補があったら・・・最初のを返すようにしてみる・・
		}
	}
	
	#getAppliedDetailedLayersPropertySet(originalDetailedLayersPropertySet, ){
		// svgMap.
	}
	
	// 現在の表示状態に対して、設定内容を反映して地図を表示する
	// その時のテンポラリなレイヤセッティングも返却する
	// 現在の表示状態は、レイヤUIによる表示設定変更や別のカスタムレイヤー設定などで、ルートコンテナのオリジナルの内容とは異なるため、
	// 差分を生成するなどかなり複雑なことをして反映させている
	#applyCustomLayersSettingsToCurrentMapView(lpEdit){
		
//		var rootContainerDoc = svgMapWin.svgMap.getSvgImages()["root"];
//		var rootContainerPath = (new URL(svgMapWin.svgMap.getSvgImagesProps()["root"].Path, svgMapWin.location.href)).pathname;
		var rootContainerDoc = this.#getRootContainer();
		var rootContainerPath = this.#getRootContainerHref();
		
		var tempDLPS = this.#getDetailedLayersPropertySet(rootContainerDoc, rootContainerPath, true);
		// var tempDif = getDif(lpEdit.layersProperty, tempDLPS.layersProperty); // 下の関数に組込 2021/7/20
		var tempCls = this.#buildCustomLayersSetting(lpEdit.layersProperty, tempDLPS.layersProperty);
		var tempLayersSetting={
			currentSettingKey:"L_0",
			customLayersSettings:{},
			settingRevision:SvgMapCustomLayersManager.#settingRevision,
			rootContainerHref:rootContainerPath
		}
		tempLayersSetting.customLayersSettings[tempLayersSetting.currentSettingKey]={
			data:tempCls,
			metadata:{
				key:tempLayersSetting.currentSettingKey,
				title:"temp",
			}
		}
		//console.log("lpEdit:",lpEdit);
		//console.log("tempDLPS:",tempDLPS);
		//console.log("tempDif:",tempDif);
		//console.log("tempCls:",tempCls);
		//console.log("tempLayersSetting:",tempLayersSetting);
//		applySettings(tempLayersSetting, svgMapWin);
		this.#applySettings(tempLayersSetting);
		return ( tempLayersSetting );
	}
	
	// applySettings
	// 地図の現在表示にルートSVGDOMの変更を反映させるとともに、地図の方のレイヤリストUIの方も反映させる
	// 別ウィンドウオブジェクト直接操作は廃止
	#applySettings(tempLayersSetting){
		//console.log("applySettings:",tempLayersSetting);
	//	var cs = lm.loadCustomLayerSettings();
		this.#applyCustomLayers(tempLayersSetting);
		this.#svgMapObject.refreshScreen();
		
		setTimeout(this.#svgMapObject.updateLayerListUI,1000); // ロード完了してないと>ボタンが出ない　これってここの問題じゃない
	}
	
	
	#checkCustomLayersObject(customLayersObject){
		var ret = true;
		var msg="";
		var rootContainerHref = this.#getRootContainerHref();
		if ( customLayersObject.rootContainerHref != rootContainerHref ){
			ret =false;
			msg = "rootContainerHref is invalid " + customLayersObject.rootContainerHref + " vs " + rootContainerHref;
		}
		if ( customLayersObject.settingRevision != SvgMapCustomLayersManager.#settingRevision ){
			ret = false;
			msg = "settingRevision is mismatch " + customLayersObject.settingRevision +" vs " + SvgMapCustomLayersManager.#settingRevision;
		}
		if (ret == false ){
			console.warn("customLayersObject is invalid: "+msg);
		}
		return ( ret );
	}
	
	#mergeSettings(lset){
		var currentLayerSet = this.#loadCustomLayerSettings();
		var currentVbSet = this.#loadCustomGeoViewboxes();
		if ( lset.rootContainerHref != currentLayerSet.rootContainerHref ||
		location.host != lset.host){
			return( "異なるコンテンツ用の設定ファイルです"  );
		}
		
		if ( lset.settingRevision != SvgMapCustomLayersManager.#settingRevision ){
			return( "異なるリビジョンの設定ファイルです"  );
		}
		
		for ( var setKey in lset.customLayersSettings){
			if ( currentLayerSet.customLayersSettings[setKey] ){
				console.warn("カスタムレイヤー：重複しています　スキップします");
			} else {
				currentLayerSet.customLayersSettings[setKey] = lset.customLayersSettings[setKey];
			}
		}
		for ( var setKey in lset.customGeoViewboxSettings){
			if ( currentVbSet.settings[setKey] ){
				console.warn("ビューボックス：重複しています　スキップします");
			} else {
				currentVbSet.settings[setKey] = lset.customGeoViewboxSettings[setKey];
			}
		}
		
		this.#storeCustomLayerSettings(currentLayerSet);
		this.#storeCustomGeoViewboxes(currentVbSet);
		return ( true );
		//buildSettingList(true);
		//buildVbTable();
	}
	
	#removeIid(customLayersSet){
		for ( var layerTitle in customLayersSet ){
			var lp = customLayersSet[layerTitle];
			if ( lp.iid ){
				delete  lp.iid;
				//console.log("delete iid for customLayersSet of "+layerTitle);
			}
		}
	}
	
	
	// used in SVGMap.js
	applyCustomLayers(...params){ return (this.#applyCustomLayers(...params)) };
}

export{SvgMapCustomLayersManager}