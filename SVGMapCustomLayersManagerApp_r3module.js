// 
// Description:
// Code to build an SVGMap custom layer management app using SVGMapLv0.1_CustomLayersManager_r1.js
//
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
//  2021/04/01 Rev1完成かな
//  2021/04/06 カスタムビューポート設定パネルを構築
//  2021/07/14 同じオリジンに複数のコンテナがある場合に対応
//  2021/07/19 カスタム設定保存機能
//  2022/07/19 リファクタリング(ESM,class,windowMessaging)

// ISSUE:
//  FIXED: 同じオリジンに複数のコンテナがある場合、localStorageはオリジンで共通なので、コンテナのURLを相対パスで扱っているため矛盾が起きる・・

// =================================================================================================
// =================================================================================================
//
// カスタムレイヤー設定パネルの部
//
// =================================================================================================
// =================================================================================================

import { SvgMapCustomLayersManagerClient } from './SvgMapCustomLayersManagerClient.js';


class SvgMapCustomLayersManagerApp{
	// 重要なこのオブジェクト内のグローバル変数（一個だけのはずです）
	#lpEdit; // 編集したlayersProperty (最初にdeepCopyしているので上のオリジナルは保持)
	
	#svgMapCustomLayersManagerClient;
	
	constructor(){
		addEventListener("load",
			async function(){
				await this.#setInitialSartupSetting();
				console.log("setInitialSartupSetting");
				// await buildFromOriginal();
				await this.#buildFromCurrentMap();
				console.log("buildFromCurrentMap");
				await this.#buildSettingList(true);
				console.log("buildSettingList");
				await this.#svgMapCustomLayersManagerClient.getDetailedOriginalLayersPropertySet();
				console.log("on load process done");
			}.bind(this));
		this.#svgMapCustomLayersManagerClient = new SvgMapCustomLayersManagerClient();
		this.#setStartupPanelEvent();
		this.#setLayersPanelEvent();
		this.#setOthersPanelEvent();
	}
	
	// public methods
	async getRootContainer(){
		var rootSvg= await this.#svgMapCustomLayersManagerClient.getRootContainerXML();
		return ( rootSvg );
	}
	
	
	// private methods
	
	#setStartupPanelEvent(){
		document.getElementById("defaultVbRadio").addEventListener("click",this.#selectStartupSetting.bind(this));
		document.getElementById("keepVbRadio").addEventListener("click",this.#selectStartupSetting.bind(this));
		document.getElementById("customVbRadio").addEventListener("click",this.#selectStartupSetting.bind(this));
		document.getElementById("addVbButton").addEventListener("click",this.#addCurrentMapViewBox.bind(this));
	}
	#setLayersPanelEvent(){
		document.getElementById("renameButton").addEventListener("click",this.#renameSetting.bind(this));
		document.getElementById("deleteButton").addEventListener("click",this.#deleteSetting.bind(this));
		document.getElementById("saveButton").addEventListener("click",this.#buildCustomLayersSettingFromUI.bind(this));
	}
	#setOthersPanelEvent(){
		document.getElementById("downloadButton").addEventListener("click",this.#saveSetting.bind(this));
		document.getElementById("loadFile").addEventListener("change",this.#loadSetting.bind(this));
		document.getElementById("removeAllButton").addEventListener("click",this.#removeAllSettings.bind(this));
	}
	
	async #buildFromOriginal(){
		// 指定したパスもしくはopenerなどのsvgmap objectに設定されているルートコンテナのパスをもとにレイヤ編集UIを構築
		// window.openerで紐づいているSVGMapオブジェクト
		
		// Note:この関数はgenerateLayerTableFromCustomSetting(null)と、同じ振る舞いのものだといえる（ので統合）
		//this.#lpEdit = await this.#svgMapCustomLayersManager.getDetailedOriginalLayersPropertySetFromOpener();
		//buildLayerTable();
		await this.#generateLayerTableFromCustomSetting(null);
	}

	// カスタムレイヤー設定UIを既存の設定から生成する
	async #generateLayerTableFromCustomSetting(setting,customLayersObject){
//		var originalHref = new URL(window.opener.svgMap.getSvgImagesProps()["root"].Path, window.opener.location.href).href;
//		var baseLayersPropertySet = await this.#svgMapCustomLayersManager.getDetailedLayersPropertySetFromPath( originalHref, true);
		var baseLayersPropertySet = await this.#svgMapCustomLayersManagerClient.getDetailedOriginalLayersPropertySet();
		var appliedLPset;
		console.log("baseLayersPropertySet:",baseLayersPropertySet);
		if ( setting ){ // API ISSUE settingは実際に使われてない　実際はcustomLayersObject.currentSettingKeyを直に引用してる
			if ( !customLayersObject ){
				customLayersObject = this.#svgMapCustomLayersManagerClient.loadCustomLayerSettings();
			}
			var appliedLP = await this.#svgMapCustomLayersManagerClient.applyCustomLayers(customLayersObject,baseLayersPropertySet);
			appliedLPset = {layersProperty:appliedLP};
			console.log("appliedLP:",appliedLP);
		} else {
			appliedLPset = baseLayersPropertySet;
		}
		console.log(setting,appliedLPset);
		this.#lpEdit = appliedLPset;
		this.#buildLayerTable();
	}

	async #buildFromCurrentMap(){
		// 表示中のレイヤー構造をもとに、編集用のレイヤー構成データを生成し、それをUIに反映させる
		if (window.opener  ){
	//		lpEdit = svgMapCustomLayersManager.getDetailedLayersPropertySet(window.opener.svgMap.getSvgImages()["root"],true);
			this.#lpEdit = await this.#svgMapCustomLayersManagerClient.getDetailedLayersPropertySet(window,null,true); // 2021/7/12
			console.log("this.#lpEdit:",this.#lpEdit);
			this.#buildLayerTable();
		} else {
			console.warn("No  window.opener");
		}
	}

	#buildLayerTable(){
		this.#removeChildren(layerTable);
		layerTable.insertAdjacentHTML('afterbegin', "<tr><td></td><td>Title</td><td>xlink:href</td><td>Visibility</td><td>Opacity</td><td>Group</td><td><input type='button' id='topLayerAdd' value='add Layer' onclick='insertLayer(event)'></input></td></tr>");
		
		var lps = this.#lpEdit.layersProperty;
		for ( var i = lps.length-1 ; i >= 0 ; i-- ){
			if ( lps[i].toBeRemoved ){
				continue;
			}
			var tr = document.createElement("tr");
			tr.setAttribute("data-index",i);
			
			// remove Layer Button
			var rmvTd = document.createElement("td");
			//rmvTd.setAttriute("data-prop","remove");
			rmvTd.appendChild(this.#getButton("remove",this.#removeLayer,"remove_"+i));
			tr.appendChild(rmvTd);
			
			// title
			var tileTd = document.createElement("td");
			tileTd.setAttribute("data-prop","title");
			tileTd.appendChild(this.#getTextArea(lps[i].title));
			tr.appendChild(tileTd);
			
			// xlin:href
			var hrefTd = document.createElement("td");
			hrefTd.setAttribute("data-prop","href");
			hrefTd.appendChild(this.#getTextArea(lps[i].href,300));
			tr.appendChild(hrefTd);
			
			// Visibility
			var visTd = document.createElement("td");
			visTd.setAttribute("data-prop","visibility");
			var vis = lps[i].attributes.visibility;
			var visB;
			if ( vis==undefined || vis == "visible" ){
				visB=true;
			} else {
				visB=false;
			}
			visTd.appendChild(this.#getOnOffChoice(visB));
			tr.appendChild(visTd);
			
			// Opacity
			var opaTd = document.createElement("td");
			opaTd.setAttribute("data-prop","opacity");
			var opa = lps[i].attributes.opacity;
			if ( opa==undefined ){
				opa="";
			}
			opaTd.appendChild(this.#getTextArea(opa,40));
			tr.appendChild(opaTd);
			
			// Class-group
			var grTd = document.createElement("td");
			grTd.setAttribute("data-prop","detail group");
			var group = lps[i].detail.group;
			if ( !group ){
				group="";
			}
			grTd.appendChild(this.#getTextArea(group,100));
			tr.appendChild(grTd);
			
			
			// Class-clickable TBD
			// Class-batch TBD
			// Class-switch TBD
			
			// Insert↓ Layer Button
			var insTd = document.createElement("td");
			insTd.appendChild(this.#getButton("insert↓",this.#insertLayer,"insert_"+i));
			tr.appendChild(insTd);
			
			layerTable.appendChild(tr);
			
		}
	}

	#generateStructFromUI(){
		// この関数は、lpEdit(オリジナルのSVGMapコンテナをもとに作ったもの)をUIに基づいて書き換える機能を持つ
		console.log("generateStructFromUI");
		var lps = this.#lpEdit.layersProperty;
		var cr = layerTable.childNodes;
		for ( var i = cr.length -1 ; i >= 0 ; i-- ){ // レイヤーを取り出す
			var lTr = cr[i];
			var idx = Number(lTr.getAttribute("data-index"));
			var targetLp = lps[idx];
			for ( var j = 0 ; j < lTr.childNodes.length ; j++ ){ // そのレイヤーの中のアトリビュートを取り出す
				var propTd = lTr.childNodes[j];
				if ( propTd.getAttribute("data-prop")){ // data-prop属性に属性名  detailとあるものはclassを細かく分けた.detailに対応するもの
					var propName = propTd.getAttribute("data-prop");
					var propValue = (propTd.childNodes[0].value).trim();
	//				console.log("idx:",idx,"  propName:",propName,"  propValue:",propValue);
					if ( propName == "href" || propName == "title" ){
						targetLp[propName]=propValue;
						if ( propName == "href" ){
							targetLp.attributes["xlink:href"]=propValue;
						} else {
							targetLp.attributes["title"]=propValue;
						}
					} else if ( propName.indexOf("detail")==0 ){ // classのあれやこれやをやる
						var  dpName = propName.split(" ")[1];
						targetLp.detail[dpName]=propValue;
						var clss=[];
						if ( targetLp.attributes.class ){
							clss = targetLp.attributes.class.split(" ");
						}
						if ( dpName == "group"){
							// グループ名を探す
							var noGrp=true;
							for ( var k = 0 ; k < clss.length ; k++ ){
								if ( clss[k]=="group" || !targetLp.detail[clss[k]] ){
									// この条件のものがグループ名
									clss[k]=propValue;
									noGrp = false;
									break;
								}
							}
							if ( noGrp ){ // もともとグループ名がなかったら追加する
								clss.push(propValue);
							}
							var clsStr = (clss.join(" ")).trim();
							if ( clsStr !="" ){
								targetLp.attributes["class"]=clsStr;
								console.log("set class:",targetLp.attributes["class"]);
							}
						} else {
							if ( clss.indexOf(dpName) ==-1){
								targetLp.attributes["class"]+=" "+dpName;
							}
						}
					} else {
						if ( propName == "visibility" ){
							if ( propValue=="false" ){
								propValue = "hidden";
							} else {
								propValue = "visible";
							}
						} else {
						}
						if ( propValue !=""){
							targetLp.attributes[propName]=propValue;
						}
					}
				}
			}
		}
		
		// この処理を最後にやるのかどうかが考えどこかな(削除したものを後で復活させたいケースで)
		for ( var i = lps.length -1 ; i >= 0 ; i-- ){
			if ( lps[i].toBeRemoved){
				lps.splice(i,1);
			}
		}
		console.log(lps);
	//	return ( lpe);
	}

	#getTextArea(defTxt,width){
		if(!width){
			width=150;
		}
		var inp = document.createElement("input");
		inp.style.width=width+"px";
		inp.type="text";
		inp.value=defTxt;
		return(inp);
	}

	#getOnOffChoice(onOff){
		var ch= document.createElement("select");
		
		var on =document.createElement("option");
		on.value="true"
		on.innerText="O";
		if (onOff){
			on.selected=true;
		}
		ch.appendChild(on);
		
		var off=document.createElement("option");
		off.value="false"
		off.innerText="X";
		if (!onOff){
			off.selected=true;
		}
		ch.appendChild(off);
		return(ch);
	}

	#getButton(title,listener,id){
		var inp = document.createElement("input");
		inp.type="button";
		inp.value=title;
		if ( listener ){
			inp.addEventListener("click",listener.bind(this));
		}
		if ( id ){
			inp.id=id;
		}
		
		return(inp);
	}

	#removeLayer(event){
		console.log("called removeLayer:",event.target.id);
		var numb = Number((event.target.id).split("_")[1]);
		this.#lpEdit.layersProperty[numb].toBeRemoved = true;
		this.#generateStructFromUI();
		this.#buildLayerTable();
	}

	#insertLayer(event){
		console.log("called insertLayer:",event.target.id);
		var bid = event.target.id;
		var numb;
		if ( bid != "topLayerAdd"){
			numb = Number((bid).split("_")[1]);
		} else {
			numb = this.#lpEdit.layersProperty.length;
		}
		var newLayerProp={
			title:"Name_for_layer_"+numb,
			href:"Href_for_layer_"+numb,
			visibile:false,
			attributes:{
				visibility:"hidden",
				opacity:0.8,
				x:-30000, // 2021/3/11 これがなかった・・・
				y:-30000,
				width:60000,
				height:60000
			}
		};
		
		if ( numb < this.#lpEdit.layersProperty.length && this.#lpEdit.layersProperty[numb].detail.group){
			newLayerProp.detail={
				group:this.#lpEdit.layersProperty[numb].detail.group
			}
		} else {
			newLayerProp.detail={
			}
		}
		this.#generateStructFromUI();
		this.#lpEdit.layersProperty.splice(numb,0,newLayerProp)
		console.log(this.#lpEdit.layersProperty);
		
		buildLayerTable();
	}

	#removeChildren(element){
		while (element.firstChild) element.removeChild(element.firstChild);
	}

	async #buildCustomLayersSettingFromUI(){
		this.#generateStructFromUI();
		//var df = svgMapCustomLayersManager.getDif(lpEdit.layersProperty); // 2021/7/20 下の関数がdif自体取るように
		var cls = await this.#svgMapCustomLayersManagerClient.buildCustomLayersSetting(this.#lpEdit.layersProperty);
		console.log("buildCustomLayersSettingFromUI:",cls);
		await this.#svgMapCustomLayersManagerClient.registCustomLayer(cls);
		if ( window.opener ){
			await this.#svgMapCustomLayersManagerClient.applyCustomLayersSettingsToCurrentMapView(this.#lpEdit);
		}
		await this.#buildSettingList(true);
	}


	// カスタムレイヤー設定の選択肢プルダウンメニューを生成する
	async #buildSettingList(useCurrentSetting){
		var sl = document.getElementById("settingList");
		this.#removeChildren(sl);
		sl.addEventListener("change",this.#selectSetting.bind(this));
		console.log("buildSettingList");
		var customLayersObject = await this.#svgMapCustomLayersManagerClient.loadCustomLayerSettings();
		var currentSettingKey = customLayersObject.currentSettingKey;
		
		console.log("customLayersObject:",customLayersObject);
		
		var opt = document.createElement("option");
		opt.value="none";
		opt.innerText="none";
		if ( ! useCurrentSetting ){
			opt.selected=true;
		}
		sl.appendChild(opt);
		for ( var key in customLayersObject.customLayersSettings ){
			var cls = customLayersObject.customLayersSettings[key];
			//console.log(cls);
			opt = document.createElement("option");
			opt.value = cls.metadata.key;
			opt.innerText = cls.metadata.title;
			if ( useCurrentSetting && currentSettingKey == key ){
				//console.log("select:",key);
				opt.selected=true;
			}
			sl.appendChild(opt);
		}
	}

	// プルダウンメニューから選択したカスタムレイヤー設定をカレントに設定すると同時に、そのカスタム設定内容を表示、openerの地図の方にも反映させる
	async #selectSetting(event){
		var customLayersObject = await this.#svgMapCustomLayersManagerClient.loadCustomLayerSettings();
		var customSettingKey = event.target.options[event.target.selectedIndex].value;
		var setting = customLayersObject.customLayersSettings[customSettingKey];
		customLayersObject.currentSettingKey = customSettingKey;
		await this.#generateLayerTableFromCustomSetting(setting,customLayersObject);
		await this.#changeCustomLayersSetting(customSettingKey, this.#lpEdit);
	}

	// 保存済みのカスタムレイヤー設定の中から、有効な設定を切り替え、localStorageに反映
	// それを地図にも反映させる
	async #changeCustomLayersSetting(customSettingKey, lpEdit){ 
		console.log("changeCustomLayersSetting:");
		var customLayersObject = await this.#svgMapCustomLayersManagerClient.loadCustomLayerSettings();
		var setting = customLayersObject.customLayersSettings[customSettingKey];
		
		// localStorageに選択を反映する
		if ( setting ){
			await this.#svgMapCustomLayersManagerClient.setCustomLayerSettingIndex(customSettingKey);
		} else {
			await this.#svgMapCustomLayersManagerClient.setCustomLayerSettingIndex(null);
		}
		
		// 現在表示中の地図に、その選択を反映させる
		if ( window.opener ){
			await this.#svgMapCustomLayersManagerClient.applyCustomLayersSettingsToCurrentMapView(lpEdit );
		}
	}


	// 現在選択中のセッティングを消去する
	async #deleteSetting(){
		// var sl = document.getElementById("settingList");
		// var customSettingKey = sl.options[sl.selectedIndex].value; // これはUI特定できな時があるが・・やめるか？
		var customLayersObject = await this.#svgMapCustomLayersManagerClient.loadCustomLayerSettings(); // これのほうがいいかも
		var customSettingKey = customLayersObject.currentSettingKey;
		
		var slst = document.getElementById("settingList");
		var selK = slst.options[slst.selectedIndex].value;
		console.log("customSettingKey:",customSettingKey,"  selKey:",selK);
		
		if ( !customSettingKey || customSettingKey=="none" || selK == "none" || selK != customSettingKey){
			return;
		}
		
		await this.#svgMapCustomLayersManagerClient.deleteCustomLayerSetting(customSettingKey);
		customLayersObject.currentSettingKey = null;
		await this.#generateLayerTableFromCustomSetting(null,customLayersObject);
		await this.#changeCustomLayersSetting(null, this.#lpEdit);
		await this.#buildSettingList(true)
	}

	async #renameSetting(){
		var customLayersObject = await this.#svgMapCustomLayersManagerClient.loadCustomLayerSettings(); 
		var customSettingKey = customLayersObject.currentSettingKey;
		var slst = document.getElementById("settingList");
		var selK = slst.options[slst.selectedIndex].value;
		console.log("customSettingKey:",customSettingKey,"  selKey:",selK);
		
		if ( !customSettingKey || customSettingKey=="none" || selK == "none" || selK != customSettingKey){
			return;
		}
		console.log("customSettingKey:",customSettingKey," current title:",ct);

		var ct = customLayersObject.customLayersSettings[customSettingKey].metadata.title;
		
		var div = document.createElement("div");
		var txts = document.createElement("span");
		txts.innerHTML="New Setting Name : <br>";
		var txtInp = document.createElement("input");
		txtInp.id="renameText";
		txtInp.type="text";
		txtInp.value=ct;
		txtInp.style.width="90%";
		div.appendChild(txts);
		div.appendChild(txtInp);
		
		var cbf = async function(dom){
			//console.log(dom);
			var tval = document.getElementById("renameText").value;
			console.log(customSettingKey,tval);
			tval=tval.trim();
			if ( tval !="" ){
				customLayersObject.customLayersSettings[customSettingKey].metadata.title = tval;
				await this.#svgMapCustomLayersManagerClient.storeCustomLayerSettings(customLayersObject);
				await this.#buildSettingList(true);
				
			}
		}.bind(this);
		
		this.#showModal( div , 600, 70 , cbf)
		
	}

	#removeAllSettings(){
		var div = document.createElement("div");
		div.insertAdjacentHTML('beforeend','CLEAR ALL Settings OK?');
		var cbf = async function(resp){
			// console.log(resp);
			if (resp!=null){
				console.log("to clear  this:",this);
				await this.#svgMapCustomLayersManagerClient.deleteAllCustomLayerSettings();
				await this.#svgMapCustomLayersManagerClient.deleteAllCustomViewBoxSettings();
				await this.#buildSettingList(true);
				await this.#buildVbTable();
				document.getElementById("startup_content").querySelector('li [value="0"]').checked=true;
			}
		}.bind(this);
		this.#showModal( div , 600, 70 , cbf);
	}


	#showModal( dom_or_htm , maxW, maxH , cbf){
		var modalDiv;
		if ( document.getElementById("modalDiv") ){
			modalDiv = document.getElementById("modalDiv")
			modalDiv.parentNode.removeChild(modalDiv);
			modalDiv=document.createElement("div");
		} else {
			modalDiv=document.createElement("div");
		}
		if ( window.innerWidth -100 < maxW ){
			maxW = window.innerWidth -100;
		}
		if ( window.innerHeight -140 < maxH ){
			maxH = window.innerHeight -100;
		}
		modalDiv.style.height=  window.innerHeight + "px";
		modalDiv.style.width= window.innerWidth + "px";
		modalDiv.style.backgroundColor="rgba(180, 180, 180, 0.6)";
		modalDiv.style.zIndex="1000";
		modalDiv.style.position="fixed";
		modalDiv.style.top="0px";
		modalDiv.style.left="0px";
		modalDiv.style.overflowY="hidden";
		modalDiv.style.overflowX="hidden";
		modalDiv.id="modalDiv";

		var infoDiv=document.createElement("div");
		infoDiv.style.height= maxH + "px";
		infoDiv.style.width= maxW + "px";
		infoDiv.style.backgroundColor="rgba(255,240,220,0.7)";
		infoDiv.style.position="absolute";
		infoDiv.style.top="50px";
		infoDiv.style.left="50px";
		infoDiv.style.overflowY="scroll";
		infoDiv.style.overflowX="hidden";
		infoDiv.id="infoDiv";
		modalDiv.appendChild(infoDiv);
		
		if ( typeof(dom_or_htm)=="string"){
			infoDiv.innerHTML = dom_or_htm;
		} else {
			infoDiv.appendChild(dom_or_htm);
		}

		if ( cbf ){
			var okbtn=document.createElement("button");
			var txt=document.createTextNode("OK");
			okbtn.appendChild(txt);
			okbtn.onclick=function(){
				cbf(infoDiv);
				modalDiv.parentNode.removeChild(modalDiv);
			}.bind(this);
			okbtn.style.position="absolute";
			okbtn.style.width="100px";
			okbtn.style.top=maxH + 50 + "px";
			okbtn.style.left="50px";

			modalDiv.appendChild(okbtn);
			
			var ngbtn=document.createElement("button");
			var txt=document.createTextNode("CANCEL");
			ngbtn.appendChild(txt);
			ngbtn.onclick=function(){
				cbf(null);
				modalDiv.parentNode.removeChild(modalDiv);
			}.bind(this);
			ngbtn.style.position="absolute";
			ngbtn.style.width="100px";
			ngbtn.style.top=maxH + 50 + "px";
			ngbtn.style.left="170px";

			modalDiv.appendChild(ngbtn);
			
		} else {
			var btn=document.createElement("button");
			var txt=document.createTextNode("CLOSE");
			btn.appendChild(txt);
			btn.onclick=function(){
				modalDiv.parentNode.removeChild(modalDiv);
			}.bind(this);
			btn.style.position="absolute";
			btn.style.width="30%";
			btn.style.top=maxH + 50 + "px";
			btn.style.left="50px";

			modalDiv.appendChild(btn);
		}

		document.getElementsByTagName("body")[0].appendChild(modalDiv);
		return(infoDiv);
	}












	// =================================================================================================
	// =================================================================================================
	//
	// カスタムビューポート設定パネルの部
	//
	// =================================================================================================
	// =================================================================================================


	async #setInitialSartupSetting(){
		console.log("setInitialSartupSetting:");
		if (window.opener ){
//			var resume = window.opener.svgMap.getResume(); // これはsvgMapCustomLayersManagerにmessagingによるAPIが必要
			var resume = await this.#svgMapCustomLayersManagerClient.getResume(); // こんな感じの
			var cvbs = await this.#buildVbTable(); // localstorageのセッティングを取ってテーブルを作る。cvbs.currentSettingKey
			// ISSUE resumeにあり、currentSettingKeyでvirewboxが設定されていた時に、レイヤーの表示状態だけresumeしたいケースがあると思う resumeをviewboxとvisibilityに分ける必要があると思う。
			var setIndex = 0;
			if ( cvbs.currentSettingKey ){
				setIndex = 2;
			}
			if ( resume ){
				setIndex = 1;
			}
			console.log(setIndex);
			this.#setStartupSetting(setIndex,true);
		}
	}

	async #buildMapViewSettingsFromUI(){
		console.log("buildMapViewSettingsFromUI called");
		var customViewObj = {
			settings:{},
		};
		var vt = document.getElementById("viewboxTable");
		for ( var i = 0 ; i < vt.children.length ; i++ ){
			var title = vt.children[i].children[1].innerText;
			var tr = vt.children[i];
			var vbs = tr.getAttribute("data-geoviewBox").split(",");
			var x = Number(vbs[0]);
			var y = Number(vbs[1]);
			var width = Number(vbs[2]);
			var height = Number(vbs[3]);
			var key = tr.getAttribute("data-key");
			if ( key == "null" ){
				key = null;
			}
			var vs = await this.#svgMapCustomLayersManagerClient.buildCustomGeoViewboxSettingObject(key, title, x, y, width, height);
	//		console.log(vs);
			key = vs.key;
			var ckd = vt.children[i].children[0].children[0].checked;
			if ( ckd ){
				customViewObj.currentSettingKey = key;
			}
			tr.setAttribute("data-key",vs.key);
			customViewObj.settings[key]=vs;
		}
		// TBD
		console.log("customViewObj:",customViewObj);
		await this.#svgMapCustomLayersManagerClient.storeCustomGeoViewboxes(customViewObj);
		return ( customViewObj );
	}

	async #buildVbTable(){
		console.log("buildVbTable called");
	//local storageからカスタムビューボックス設定を読み取りUIに反映
		var vt = document.getElementById("viewboxTable");
		this.#removeChildren(vt);
		var cvbs = await this.#svgMapCustomLayersManagerClient.loadCustomGeoViewboxes();
		for ( var key in cvbs.settings ){
			var setting = cvbs.settings[key];
			var selectedSetting = false;
			if ( cvbs.currentSettingKey && key == cvbs.currentSettingKey ){
				selectedSetting = true;
			}
			this.#addMapViewTable(key, setting.title, 
				{	
					x:setting.x, 
					y:setting.y, 
					width:setting.width,
					height:setting.height
				},
				selectedSetting
			);
		}
		this.#customVBoptionAvailable(false);
		return ( cvbs );
	}

	async #addCurrentMapViewBox(){
		if (window.opener  ){
		} else {
			console.error("No window.opener");
			return;
		}
		var gvb = await this.#svgMapCustomLayersManagerClient.getGeoViewBox();
		this.#addMapViewTable(null,null,gvb,true);
		return(gvb);
	}

	async #addMapViewTable(key,title,geoViewBox,selectedSetting){
		var vt = document.getElementById("viewboxTable");
		var gvbMeta = geoViewBox.x+","+geoViewBox.y+","+geoViewBox.width+","+geoViewBox.height;
		if ( ! title ){
			title = new Date().toString();
		}
		
		var tr = document.createElement("tr");
		tr.setAttribute("data-key",key);
		tr.setAttribute("data-geoViewbox",gvbMeta);
		
		var tdName = document.createElement("td");
		tdName.innerText= title;
		
		var tdRename = document.createElement("td");
		var renameInp = document.createElement("input");
		renameInp.addEventListener("click",this.#renameCustomViewPort.bind(this));
		this.#setAttributes(renameInp, { type:"button",value:"rename"});
		tdRename.appendChild(renameInp);
		
		var tdDel = document.createElement("td");
		var deleteInp =  document.createElement("input");
		deleteInp.addEventListener("click",this.#removeViewBox.bind(this));
		this.#setAttributes(deleteInp, { type:"button",value:"DELETE"});
		tdDel.appendChild(deleteInp);
		
		var tdChoice = document.createElement("td");
		var chVbInp = document.createElement("input");
		chVbInp.addEventListener("click",this.#changeViewBox.bind(this));
		this.#setAttributes(chVbInp, { type:"radio",name:"vbSelect",value:"true"});
		tdChoice.appendChild(chVbInp);
		
		if ( selectedSetting ){
			tdChoice.children[0].checked=true;
		}
		tr.appendChild(tdChoice);
		tr.appendChild(tdName);
		tr.appendChild(tdRename);
		tr.appendChild(tdDel);
		vt.appendChild(tr);
		await this.#buildMapViewSettingsFromUI();
	}
	
	#setAttributes(el, attrs) {
		Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
	}

	#evt;
	async #removeViewBox(event){
		this.#evt=event;
		console.log("removeViewBox:",event.target);
		var tr = event.target.parentElement.parentElement;
		tr.parentElement.removeChild(tr);
	//	var key = evt.target.parentElement.parentElement.getAttribute("data-key");
		await this.#buildMapViewSettingsFromUI();
	}

	async  #changeViewBox(event){
		// ラジオボタンでカスタムビューボックスを選んだ
		var key = event.target.parentElement.parentElement.getAttribute("data-key");
		console.log("changeViewBox:",key);
		var cvbobj = await this.#buildMapViewSettingsFromUI();
		var cvb = cvbobj.settings[cvbobj.currentSettingKey];
		await this.#svgMapCustomLayersManagerClient.setGeoViewPort(cvb.y,cvb.x,cvb.height,cvb.width )
		
	}

	async #selectStartupSetting(event){
		console.log("selectStartupSetting called");
		var vtype = Number(event.target.getAttribute("value"));
		this.#setStartupSetting(vtype, false);
		console.log("type:",vtype);
		if ( vtype==1 ){
			// resume
			await this.#svgMapCustomLayersManagerClient.setResume(true);
		} else {
			// not resume mode
			await this.#svgMapCustomLayersManagerClient.setResume(false);
		}
		if ( vtype==0 ){
			var cvbs = await this.#svgMapCustomLayersManagerClient.loadCustomGeoViewboxes();
			cvbs.currentSettingKey=null;
			await this.#svgMapCustomLayersManagerClient.storeCustomGeoViewboxes(cvbs);
		}
	}

	#setStartupSetting(vtype, reflectUI){
		var ssls = document.querySelectorAll('[name="startupSelect"]');
		console.log(vtype,ssls);
		if ( reflectUI){
			for ( var i = 0 ; i < ssls.length ; i++){
				if ( vtype == Number(ssls[i].getAttribute("value"))){
					ssls[i].checked=true;
				}
			}
		}
		// ISSUE resumeはレイヤの表示状態とカスタムビューボックスの両方を設定するオプションしかない
		if ( vtype == 0 ){
			// resumeなし、カスタムビューボックスなし
			this.#customVBoptionAvailable(false);
		} else if ( vtype == 1 ){
			// resumeあり、カスタムビューボックスなし
			this.#customVBoptionAvailable(false);
		} else if ( vtype == 2 ){
			// resumeなし、カスタムビューボックスあり
			this.#customVBoptionAvailable(true);
		}
	}

	#customVBoptionAvailable(flag){
		var cvb = document.getElementById("viewboxTable").children;
		for ( var i = 0 ; i < cvb.length ; i++ ){
			if ( flag == true ){
				cvb[i].children[0].children[0].removeAttribute("disabled");
			} else {
				cvb[i].children[0].children[0].setAttribute("disabled",true);
			}
		}
		if ( flag == true ){
			document.getElementById("viewboxTable").parentElement.children[0].removeAttribute("disabled");
		}else{
			document.getElementById("viewboxTable").parentElement.children[0].setAttribute("disabled",true);
		}
	}

	#renameCustomViewPort(event){
		var tr = event.target.parentElement.parentElement;
		var ct = tr.children[1].innerText;
		var cvKey = tr.getAttribute("data-key");
		
		var div = document.createElement("div");
		var txts = document.createElement("span");
		txts.innerHTML="New Setting Name : <br>";
		var txtInp = document.createElement("input");
		txtInp.id="renameVpText";
		txtInp.type="text";
		txtInp.value=ct;
		txtInp.style.width="90%";
		div.appendChild(txts);
		div.appendChild(txtInp);
		
		var cbf = async function(dom){
			//console.log(dom);
			var tval = document.getElementById("renameVpText").value;
			console.log(cvKey,tval);
			tval=tval.trim();
			if ( tval !="" ){
				tr.children[1].innerText = tval;
				await this.#buildMapViewSettingsFromUI();
			}
		}.bind(this);
		
		this.#showModal( div , 600, 70 , cbf)
		
	}

	async #saveSetting(){
		console.log("saveSetting called");
		var layerSet = await this.#svgMapCustomLayersManagerClient.loadCustomLayerSettings();
		var vbSet = await this.#svgMapCustomLayersManagerClient.loadCustomGeoViewboxes();
		layerSet.host=location.host;
		layerSet.customGeoViewboxSettings=vbSet.settings;
		delete layerSet.currentSettingKey;
		
		// https://qiita.com/Toyoharu-Nishikawa/items/dfb187cf6eb4ba743995 だがまぁ今回はサイズが小さい想定なので
		var blob = new Blob([JSON.stringify(layerSet)],{type:"text/plain"});
		document.getElementById("downloadAnchor").href = window.URL.createObjectURL(blob);
		document.getElementById("downloadAnchor").setAttribute("download","customLayerSet_"+(location.host).replaceAll(".","_") + layerSet.rootContainerHref.replaceAll(".","_").replaceAll("/","_") + ".json");
		
		document.getElementById("downloadAnchor").click();
	}

	#loadSetting(event){
		console.log("loadSetting:",event.target.files[0]);
		
		
		var file = event.target.files[0];
		console.log("file:",file);
		const fr = new FileReader();
		fr.onload = async function(e){
			var loadJson = JSON.parse(e.target.result);
			console.log(loadJson);
			var result = await this.#svgMapCustomLayersManagerClient.mergeSettings(loadJson);
			if ( result != true ){
				this.#showModal( result , 400, 100 );
			} else {
				await this.#buildSettingList(true);
				await this.#buildVbTable();
				document.getElementById("startup_content").querySelector('li [value="0"]').checked=true;
			}
		}.bind(this);
		fr.readAsText(file);
		event.target.value="";
	}

}

window.svgMapCustomLayersManagerApp = new SvgMapCustomLayersManagerApp();
