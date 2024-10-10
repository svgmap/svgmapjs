import { UtilFuncs } from './UtilFuncs.js';

class ResumeManager{
	
	constructor(svgMapObject, svgMapCustomLayersManager, parseSVGfunc){
		this.#svgMapObject = svgMapObject;
		this.#svgImagesProps = svgMapObject.getSvgImagesProps();
		this.#svgImages = svgMapObject.getSvgImages();
		this.#svgMapCustomLayersManager = svgMapCustomLayersManager;
		this.#parseSVGfunc = parseSVGfunc;
	}
	
	#resume = false; // 2016/10/26 resume機能のデータ
	#resumeSpan = 3; // resumeの有効期限 (日) 2021/3 rev17で無効化する予定
	#initialRootLayersProps; // 2023/06/05 for permanentLink generation
	
	static localStorageSvgMapSuffix = "svgmap_";
	
	#svgMapObject;
	#svgImagesProps;
	#svgImages;
	
	#svgMapCustomLayersManager;
	#initialCustomLayers=null;
	#parseSVGfunc;

	// setCookie(KVSへの設定 NS競合回避機能付き), getCookies（全データ読み出し）
	// 2021/7/12
	#setCookie( key, value , expire ){
		// 2021/2/3 localStorageに変更し、更に機能を増強していく
		// ひとまず　expire　は無視（無期限）とする
		var rootPath = (new URL(this.#svgImagesProps["root"].Path,location.href)).pathname;
		window.localStorage[ResumeManager.localStorageSvgMapSuffix+rootPath+"#"+key]=value;
	}

	#getCookies(){
		var result = {};
		var rootPath = (new URL(this.#svgImagesProps["root"].Path,location.href)).pathname;
		var lss=ResumeManager.localStorageSvgMapSuffix+rootPath+"#";
		for ( var i = 0 ; i < window.localStorage.length ; i++ ){
			if ( (window.localStorage.key(i)).indexOf(lss) == 0 ){
				result[window.localStorage.key(i).substring(lss.length)]=window.localStorage[window.localStorage.key(i)];
			}
		}
		return result;
	}

	#removeCookies(propName) {
		var rootPath = (new URL(this.#svgImagesProps["root"].Path,location.href)).pathname;
		var lss=ResumeManager.localStorageSvgMapSuffix+rootPath+"#";
		for ( var i = window.localStorage.length-1  ; i >=0  ; i-- ){
			if ( (window.localStorage.key(i)).indexOf(lss) == 0 ){
				if ( propName ){
					if ( (window.localStorage.key(i)).indexOf(propName)>0){
						delete window.localStorage[window.localStorage.key(i)];
					}
				} else {
					delete window.localStorage[window.localStorage.key(i)];
				}
			}
		}
	}
	
	setInitialCustomLayers(initialCustomLayersObj, rootSVGpath){
		// InitialCustomLayersの検証と設定をする。 2024/08/06
		// initialCustomLayersObjは、Custom Layers Managerが想定する、customLayersSettingsの中の連想配列要素のひとつとする
		function checkSetting(obj){
			if ( !obj.data || !obj.metadata){return false}
			var dat = obj.data;
			for ( var key in dat){
				var elm = dat[key]
				if ( typeof elm !="object"){return false}
				if ( !elm.href ){return false}
			}
			// ここで、rootContainerHref(metadataに入れる)とsettingRevisionの照合をすべき(TBD)
			console.log("setInitialCustomLayers Check OK!");
			return true;
		}
		console.log(initialCustomLayersObj);
		if ( !initialCustomLayersObj || typeof initialCustomLayersObj !="object"){
			console.warn("setInitialCustomLayers: initialCustomLayersObj is not object exit.");
			return
		}
		if ( initialCustomLayersObj.customLayersSettings){
			console.warn("setInitialCustomLayers: initialCustomLayersObj is cookie CustomLayersObj, use default setting");
			// クッキー(ローカルストレージ)の内容がそのまま保存されている・・・
			if ( !initialCustomLayersObj.currentSettingKey){
				if ( initialCustomLayersObj.currentSettingKeys?.customLayer){
					initialCustomLayersObj.currentSettingKey=initialCustomLayersObj.currentSettingKeys.customLayer;
				} else {
					// 適当に選んでしまう・・・
					var ks = Object.keys(initialCustomLayersObj.customLayersSettings);
					if (ks.length>0){
						initialCustomLayersObj.currentSettingKey=ks[0];
					}
				}
			}
			this.#initialCustomLayers=initialCustomLayersObj;
		} else if (checkSetting(initialCustomLayersObj)){
//			console.log(rootSVGpath);
			var rootURL = new URL(rootSVGpath, window.location.href);
			this.#initialCustomLayers={
				currentSettingKey:"startup",
				customLayersSettings:{
					"startup":initialCustomLayersObj,
				},
				"settingRevision": "r2", // TBD ちゃんとチェックしたほうが良いと思う
				"rootContainerHref": rootURL.pathname, // TBD
				"host": rootURL.host, // TBD
			};
			if (initialCustomLayersObj.metadata){
				if(initialCustomLayersObj.metadata.viewBox){
					this.#initialCustomLayers.viewBox = initialCustomLayersObj.metadata.viewBox;
				}
				if(initialCustomLayersObj.metadata.settingRevision){
					this.#initialCustomLayers.settingRevision=initialCustomLayersObj.metadata.settingRevision;
				}
				if(initialCustomLayersObj.metadata.rootContainerHref){
					this.#initialCustomLayers.rootContainerHref=initialCustomLayersObj.metadata.rootContainerHref;
				}
			}
			this.#initialCustomLayers.customLayersSettings.startup.metadata.key="startup";
		}
	}
	
	
	// レジューム用localStorageから、レジュームを実行する。 2021/2/3 rev17の改修の中心
	// 起動直後のルートコンテナ読み込み時(一回しか起きない想定)実行される
	resumeFirstTime = true;
	checkResume(documentElement, symbols){
		var resumeObj=null ;
		
		var lhash,lh; // ハッシュによる指定用の変数　ちょっとlhash冗長
		if ( location.href.indexOf("#")>=0 ){
			// firefox 旧版のバグ予防のためlocation.hash不使用に切り替え
			lhash = location.href.substring(location.href.indexOf("#"));
			lh = UtilFuncs.getUrlHash( lhash );
		}
		
		if ( this.resumeFirstTime ){
			var cook = this.#getCookies();
			//console.log("ResumeManager: cooks:",cook);
			if ( lh && ( lh.visibleLayer || lh.hiddenLayer ) || cook.resume || cook.customLayers ||  this.#initialCustomLayers ){
				// 外部リソースを読み込まない(そのhtmlデータ構造も作らない)rootのparseを行い、root svgだけの文書構造をまずは構築する。レイヤーのOnOffAPIの正常動作のため(iidの設定など・・) 2016/12/08 debug
				this.#parseSVGfunc( documentElement , symbols); 
			}
			
			var lp = this.#svgMapObject.getRootLayersProps();
			var initialCustomViewBox;
			this.#initialRootLayersProps = lp;
			// 2021/2/4 レイヤーのカスタムOFF＆追加＆変更を設定できるsvgMapCustomLayersManagerの情報を導入する
			// cook.customLayers の中のJSONデータからレイヤーの削除、追加などを実施する
			if ( this.#initialCustomLayers && this.#svgMapCustomLayersManager){ // 2024/08/06 initialCustomLayersの処理を行う
				try{
					console.log("applyCustomLayers using initialCustomLayers information : ", this.#initialCustomLayers);
					this.#svgMapCustomLayersManager.applyCustomLayers(this.#initialCustomLayers);
					this.#parseSVGfunc( documentElement , symbols); // iidを設定する
					lp = this.#svgMapObject.getRootLayersProps();
					if ( this.#initialCustomLayers.viewBox ){
						initialCustomViewBox =  this.#initialCustomLayers.viewBox;
					}
				} catch ( e ){
					console.error("svgMapCustomLayersManager.applyCustomLayers by initialCustomLayers step error:",e);
				}
			} else if ( cook.customLayers && this.#svgMapCustomLayersManager ){
				try{
					var customLayers = JSON.parse(cook.customLayers);
					this.#svgMapCustomLayersManager.applyCustomLayers(customLayers);
					this.#parseSVGfunc( documentElement , symbols); // 2021/3/8 iidを設定する(上と同じ)
					lp = this.#svgMapObject.getRootLayersProps();
				} catch ( e ){
					console.error("svgMapCustomLayersManager.applyCustomLayers step by cookie error:",e);
				}
			}
			if ( initialCustomViewBox){
				this.#svgMapObject.setGeoViewPort(initialCustomViewBox.y,initialCustomViewBox.x,initialCustomViewBox.height,initialCustomViewBox.width , true); // set geoviewport without refresh
			} else if ( cook.customGeoViewboxes ){ // 2021/4/2 add customViewbox function
				var customGeoViewboxes = JSON.parse(cook.customGeoViewboxes);
				console.log("customGeoViewboxes:",customGeoViewboxes);
				if ( customGeoViewboxes.currentSettingKey ){
					var cvb = customGeoViewboxes.settings[customGeoViewboxes.currentSettingKey];
					if ( cvb ){
						this.#svgMapObject.setGeoViewPort(cvb.y,cvb.x,cvb.height,cvb.width , true); // set geoviewport without refresh
					}
				}
			}
			
			if ( cook.resume ){
				resumeObj = JSON.parse(cook.resume);
				this.#resume = resumeObj.resume;
			}
			
			/** 廃止します
			if ( document.getElementById("resumeBox") ){
				if ( this.#resume ){
					document.getElementById("resumeBox").checked = "true";
				} else {
					document.getElementById("resumeBox").checked = "";
				}
			}
			**/
			this.#removeCookies("resume"); // resumeという名前のモノだけ削除する
			
			if ( this.#resume && resumeObj  ){
				if (lh && (lh.hiddenLayer || lh.visibleLayer)) {
					// skip
					console.log( "hiddenLayer or visibleLayer hash is. Skip layer visibility resume." );
				} else {
					var lprev = resumeObj.layersProperties;
					
					var matched=[];
					// titleとhrefが一致しているケース
					for ( var i = 0 ; i < lp.length ; i++ ){
						var key = lp[i].title; // titleがlprevのkeyになっているのは要注意ですよ
						matched.push(false);
						if ( lprev[key] ){
							if ( lprev[key].href == lp[i].href ){
								// titleもhrefも正しいのでOK
								var visible = lprev[key].visible;
								this.#svgMapObject.setRootLayersProps(lp[i].id,visible,false);
								matched[i]=true;
								delete lprev[key];
							} else {
								// hrefが変更されている！！　skipしておく
								console.warn("href is unmatched!!!: title:",key,"  href:",lprev[key].href ," : ", lp[i].href,"  SKIP IT");
							}
						}
					}
					
					// 未解決レイヤでtitleは違うがURLが同じモノがあるケース(titleが変更になったとみなす)
					for ( var i = 0 ; i < lp.length ; i++ ){
						if ( matched[i]==false){
							for ( var key in lprev ){
								if (lprev[key].href == lp[i].href ){
									var visible = lprev[key].visible;
									this.#svgMapObject.setRootLayersProps(lp[i].id,visible,false);
									matched[i]=true;
									console.log("layer title may be changed, but set visibility");
								}
							}
						}
					}
				}
				var vbLat = Number(resumeObj.vbLat);
				var vbLng = Number(resumeObj.vbLng);
				var vbLatSpan = Number(resumeObj.vbLatSpan);
				var vbLngSpan = Number(resumeObj.vbLngSpan);
	//			resumeFirstTime = false; // 下(setGeoViewPort)でもう一回checkが通ってバグる・・10/27 これは5番目の引数により不要になった 2017.1.31
				this.#svgMapObject.setGeoViewPort(vbLat,vbLng,vbLatSpan,vbLngSpan , true); // set geoviewport without refresh
			}
		}
		
		if ( this.#resume ){
			this.#saveResumeData();
		}
		
		if ( this.resumeFirstTime ){ // hashで指定した値はResumeもオーバーライドする 2017.1.31
			if ( lh ){
				var vb;
				if ( lh.svgView ){
					vb = UtilFuncs.getFragmentView( lhash ); // getUrlHash結果の利用は未実装 2017.1.30
				} else if ( lh.xywh && lh.xywh.indexOf("global:")==0 ){
					var gvb = lh.xywh.substring(7).split(",");
					vb = { x: Number(gvb[0]), y: Number(gvb[1]), width: Number(gvb[2]), height: Number(gvb[3]) , global: true };
					console.log(" global view by Media Fragments: ",  vb);
				}
				
				var passVL = false;
				if ( lh.visibleLayer && lh.visibleLayer.indexOf("*")>=0){
					// ワイルドカード*が設定されていたら、まずは全レイヤーをvisibleにする
					var layers = this.#svgMapObject.getLayers();
					for ( var i = 0 ; i < layers.length ; i++ ){
						var layerId = layers[i].getAttribute("iid");
						this.#svgMapObject.setRootLayersProps(layerId, true, false);
					}
				}
				
				if ( lh.hiddenLayer ){
					if ( lh.hiddenLayer.indexOf("*")>=0){ // ワイルドカード*が設定されていたら、全レイヤーをhideする　その他のURLは無視する。#オプション部も無視されてしまうが・・
						var layers = getLayers();
						for ( var i = 0 ; i < layers.length ; i++ ){
							var layerId = layers[i].getAttribute("iid");
							this.#svgMapObject.setRootLayersProps(layerId, false, false);
						}
					}else {
						var hl = decodeURIComponent(lh.hiddenLayer).split(",");
						for ( var i = 0 ; i < hl.length ; i++ ){
							hl[i]=this.#getUrlOptions(hl[i]);
							var layerId = this.#svgMapObject.getLayerId(hl[i].name);
							if ( layerId ){
								this.#svgMapObject.setRootLayersProps(layerId, false, false, hl[i].hash);
							}
						}
					}
				}
				if ( lh.visibleLayer ){
					var vl = decodeURIComponent(lh.visibleLayer).split(",");
					for ( var i = 0 ; i < vl.length ; i++ ){
						vl[i]=this.#getUrlOptions(vl[i]);
						var layerId = this.#svgMapObject.getLayerId(vl[i].name); // "*"が入ったままだとおかしなことが起きるかも？？
						if ( layerId ){
							this.#svgMapObject.setRootLayersProps(layerId, true, false, vl[i].hash);
						}
					}
				}
				if ( vb && vb.global ){
					this.#svgMapObject.setGeoViewPort(vb.y,vb.x,vb.height,vb.width , true); // set geoviewport without refresh
				} else if ( vb ){
					// 後ほどね・・・
				}
			}
		}
		
		this.resumeFirstTime = false;
		
	//	var cook = getCookies();
	}

	// URLのハッシュやサーチパートをパースしオブジェクトに投入する 2017.3.8
	// 上のcheckResumeでは実際はURLではなくレイヤ名＋ハッシュオプションのデータをパース(クエリは不使用)
	#getUrlOptions( url ){
		var hashPos = url.indexOf("#");
		var queryPos = url.indexOf("?");
		if ( queryPos > hashPos ){ // クエリパートはフラグメントパートよりも前にある必要がある
			queryPos = -1;
		}
		
		var hashStr ="";
		var queryStr ="";
		var nameStr = url;
		
		if ( hashPos > 0 ){
			hashStr = nameStr.substring(hashPos);
			nameStr = nameStr.substring(0,hashPos);
		}
		if ( queryPos > 0 ){
			queryStr  = nameStr.substring(queryPos);
			nameStr = nameStr.substring(0,queryPos);
			console.log("queryStr:",queryStr);
		}
		
		return {
			name: nameStr,
			query: queryStr,
			hash: hashStr
		}
		
	}

	#saveResumeData(){
		var expire = new Date();
		expire.setTime( expire.getTime() + 1000 * 3600 * 24 * this.#resumeSpan); // 3日の有効期限..
		var resumeObj = {};
		if ( this.#resume == true ){ // resumeがfalseの場合は、そもそもこれらは不要
			resumeObj = this.#getResumeObj();
		}
		resumeObj.resume = this.#resume;
		this.#setCookie ( "resume" , JSON.stringify(resumeObj) , expire );
	}
	
	#getResumeObj(){
		var resumeObj = {};
		var geoViewBox = this.#svgMapObject.getGeoViewBox();
		resumeObj.vbLng = geoViewBox.x;
		resumeObj.vbLat = geoViewBox.y;
		resumeObj.vbLngSpan = geoViewBox.width;
		resumeObj.vbLatSpan = geoViewBox.height;
		var lps = this.#svgMapObject.getRootLayersProps();
		var layersProps = this.#getBasicLayersPropsObject(lps);
		resumeObj.layersProperties = layersProps;
		return resumeObj;
	}
	
	#getBasicLayersPropsObject(rootLayersProps){
		// クッキーの個数よりもレイヤーがとても多い場合があるので簡略化
		var layersProps={};
		for ( var i = 0 ; i < rootLayersProps.length ; i++ ){
			var lp = rootLayersProps[i];
			var key = lp.title; // WARN titleが同じものがあるとここで上書きされることになります！！！ 2021/2/3
			var lpProps = {
				visible:lp.visible,
				editing:lp.editing,
				groupName:lp.groupName,
				groupFeature:lp.groupFeature,
				href:lp.href,
				title:lp.title,
				href:lp.href
			}
			layersProps[key]=lpProps;
			
		}
		return layersProps;
	}

	getBasicPermanentLink(copyLinkTextToClipboard){
		// 今見ているレイヤー可視状況及びビューポートのパーマリンクを発生する
		// contaier.svgにもともとあったもののみを対象とする基本的なもの
		// customLayerManagerによってレイヤの意追加や順番が変わったりしたものは、customLayerManagerの機構を別途設ける
		// さらにレイヤ固有UIの設定状況もこの機能の対象外、別途機構を設ける
		//
		// 2024/10/04 各レイヤーのフラグメントID(ハッシュ)を加味したリンクを構築
		
		//console.log("getBasicPermanentLink:",copyLinkTextToClipboard);
		var resumeObj = this.#getResumeObj();
		var hiddenDif=[];
		var visibleDif=[];
		var initialLayersProperties = this.#getBasicLayersPropsObject(this.#initialRootLayersProps);
		for ( var layerName in initialLayersProperties){
			var origLayerProp = initialLayersProperties[layerName];
			var currentLayerProp =  resumeObj.layersProperties[layerName];
			if ( currentLayerProp ){
				var origHash = UtilFuncs.getSvgLocation(origLayerProp.href).hash;
				var currentHash = UtilFuncs.getSvgLocation(currentLayerProp.href).hash;
				if ( origHash != currentHash && currentLayerProp.visible ){
						visibleDif.push(layerName+currentHash);
				} else if ( origLayerProp.visible != currentLayerProp.visible ){
					if ( origLayerProp.visible == true ){ // 非表示
						hiddenDif.push(layerName);
					} else { // 表示
						if ( origHash != currentHash ){
							visibleDif.push(layerName+currentHash);
						} else {
							visibleDif.push(layerName);
						}
					}
				}
			}
		}
		
		var visHash="";
		if ( visibleDif.length >0){
			visHash =`&visibleLayer=${visibleDif.join(",")}`
		}
		var hidHash="";
		if ( hiddenDif.length >0){
			hidHash =`&hiddenLayer=${hiddenDif.join(",")}`
		}
		
		var vbHash = `xywh=global:${resumeObj.vbLng.toFixed(6)},${resumeObj.vbLat.toFixed(6)},${resumeObj.vbLngSpan.toFixed(6)},${resumeObj.vbLatSpan.toFixed(6)}`;
		
		var permaLink= new URL(location.pathname,location.origin);
		var plHash = vbHash + visHash + hidHash;
		permaLink.hash = plHash;
		if ( copyLinkTextToClipboard == true){
			try{
				navigator.clipboard.writeText(permaLink.href);
			} catch ( e ){
				console.warn("Cant access clipboard, may be http page");
				this.#svgMapObject.showModal(`<textarea style="font-size:11px;width:390px;height:130px;">Link URL : \n${permaLink.href}</textarea>`,400,150);
			}
		}
		return ( permaLink );
	}
	
	resumeToggle(evt){
		if ( evt.target.checked ){
			this.#svgMapObject.setResume(true);
		} else {
			this.#svgMapObject.setResume(false);
		}
		
	}
	
	setResume( stat ){
//		console.log("setResume:",stat,"   ck:", Object.keys(svgImagesProps).length,svgImagesProps);
		this.#resume = stat;
		if ( !this.#resume || Object.keys(this.#svgImages).length > 0 ){ // 2017.8.22 debug 2017.9.29 dbg2: onload直後でsetResume(true)するとエラーアウトしてresumeできない : 2017.10.03 dbg3: svgImagesPropsは作られていてもsvgImagesがない場合エラーするので・・Object.keys(svgImagesProps).length -> Object.keys(svgImages).length に
			this.#saveResumeData();
		}
	};
	
	getResume(){
		return ( this.#resume );
	}
	
}
export{ ResumeManager };