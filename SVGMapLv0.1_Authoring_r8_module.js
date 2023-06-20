// 
// Description:
//  SVG Map Authoring Tools Extention for > Rev.14 of SVGMap Level0.1 Framework
//  
//  Programmed by Satoru Takagi
//  
//  Copyright (C) 2016-2023 by Satoru Takagi @ KDDI CORPORATION
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
// Rev1: Rev11以前の内蔵システム
// 2016/12/16 Rev2: Start Porting from Rev11 code and Modularization
// 2016/12/21 Base FW Rev11のオーサリングコードとほぼ同等(以上)のものを移植完了 
// 2016/12/28 Rev3: Polygon/Polyline Tools
// 2017/01/30 Rev4: Rubber Band for Polyline/Polygon
// 2017/02/03 Rev5: Point入力UIのTextArea使用を廃止する(for Tablet devices)
// 2017/02/xx Rev6: ポリゴンUIのdelete機能を改善
// 2017/03/17 zoomPanMap -> screenRefreshed + zoomPanMap
// 2017/06/09 Rev7: add POIregistTool
// 2018/02/01 minor bug fix
// 2018/02/02 cursor.style.zIndexを設定するようにした(toBeDel on rev15対策)
// 2018/03/05 polylineを編集できる機能をおおよそ実装
// 2019/03/12 POIのアイコン定義が1個しかない場合はアイコン選択UI省略
// 2019/03/12 タイリングされたレイヤーに対して処理可能にする(制約としては、タイルにあるオブジェクトを編集したものは保持されない。新規のオブジェクトはレイヤルートに設置。メタデータスキーマ・アイコン定義は、共通のものをレイヤールートにも設置必要)
// 2019/12/27 refreshScreen後コールバック処理の精密化
// 2020/01/21 同上マイナー修正
// 2020/07/17 redis用でブランチしていた機能を取り込み(poiToolsの帰り値オプション)
// 2021/03/16 POIregistTool(initPOIregistToolの方)でタッチイベントでの座標入力に対応、また座標入力のキャンセル関数を設けた
// 2021/06/23 複数のレイヤーでツールが起動されたとき、処理が破綻したのをひとまず回避（まだ不完全かも。特に状態を保持するline/polygon系）
//
// ESM fork  SVGMapLv0.2_Authoring_r7_
// 2023/06/06 polylineの操作性向上。polygonも最初の一点可視化
// 2023/06/14 Rev8: バッファ付きポイント・ライン・ポリゴンUI、6個のＵＩを統合したＵＩ(initGenericTool)
// 2023/06/19 POIもoptionsで設定するように変更。 bufferedのvecrot-effectバグ修正、　いずれでもeditingStyle,shapeStyleを設定可能に（POIの場合はbuiffered時有効)
// 2023/06/20 GenericTool周りのコードのブラッシュアップ、editingStyle,shapeStyleを設定可能に
//
// ToDo,ISSUES:
//  POI以外の描画オブジェクトを選択したときに出るイベントbase fwに欲しい
//  編集UIを出した状態で、TypeError: svgImagesProps[layerId] is undefined[詳細]  SVGMapLv0.1_r14.js:3667:3
// POIToolsとPolytoolsが排他処理が完全ではない
// 複数のレイヤーでツールが起動されたとき、処理が破綻している? (2021/06で対応できたか？)このライブラリは基本的にレイヤーにカプセル化されていない・・リファクタリングすべき ひとまず破綻しないようにしてみた
// 重なったオブジェクトが標準UIの中で選べない

// Notes:
//  root containerでclass=editableの設定がないと、再編集や、レイヤ消去後の再表示での編集結果の保持はできない 2018.2.5

// path は 以下のルールとしておこう・・
//   zが一個でも付いたら無条件でポリゴン認定、
//   zが一個もない場合
//     fill="none"でポリライン認定
//     fillなしもしくはnone以外でポリゴン認定


// Notes:
//  root containerでclass=editableの設定がないと、再編集や、レイヤ消去後の再表示での編集結果の保持はできない 2018.2.5

import { SvgMapGIS } from './SVGMapLv0.1_GIS_r4_module.js';

class SvgMapAuthoringTool {

	#svgMap;
	#mapViewerProps;
	#svgMapGIStool;
	
	constructor(svgMapObject, mapViewerProps){
		console.log("Hello this is svgMapAuthoringTool");
		this.#svgMap = svgMapObject;
		this.#mapViewerProps = mapViewerProps;
		this.#svgMapGIStool=new SvgMapGIS(svgMapObject, window.jsts);
		
		console.log("construct SvgMapAuthoringTool: svgMapObject: ",svgMapObject);
	}


//var editLayerTitle = ""; // 編集対象のレイヤーのtitle属性（もしくは
//var action = "none"; // 起こしたアクションがなんなのか（かなりいい加減・・）2013/1 (for Dynamic Layer)


// handleResultに入れてある
//			var layers=getEditableLayers();


// 開いている編集UIに関するグローバル情報を入れているオブジェクト
// uiMapping = {uiPanel,editingLayerId,editingMode,uiDoc,editingGraphicsElement,modifyTargetElement,toolsCbFunc,toolsCbFuncParam,genericMode{panel,editingStyle,shapeStyle,withBufferedTools},editingStyle,shapeStyle,bufferOption,editedElement}
// uiPanel : オーサリングUIを発生させる(layer specific UI iframe中などの)div要素
// editingLayerId : 編集中のSVG文書のレイヤーID(svgMapProps[]などの)
// editingMode : POI,POLYLINE,POIreg...
// uiDoc : uiPanelのオーナードキュメント(layer specific UI iframe中などのhtml)
// editingGraphicsElement : 図形要素を編集中かどうか(boolean)
// modifyTargetElement : 既存図形要素を改変中かどうか(そうならばその要素のNode)
// selectedPointsIndex,insertPointsIndex: Poly*用の編集対象ポイント ない場合は-1
// toolsCbFunc : コールバック 2019/3/12
// toolsCbFuncParam : コールバック関数の任意パラメータ
// genericMode: .panel: ポリゴン、ポリライン、ポイント、（さらに拡張）全部乗せUIの時に設定される、div要素, .editingStyle, .shapeStyle : 共通のスタイル,  withBufferedTools: bufferedツールあるときはtrue
// shapeStyle, edigingStyle : 図形のスタイルや編集中のスタイル
// bufferOption : バッファー生成オプション
// editedElement : polylie/polygon/POI(full)編集ツールで編集したオブジェクト
#uiMapping = {};

#uiMappingG ={}; //  uiMapping[layerID]:uiMapping  layerID毎にuiMappingを入れる 2021/6/23
#defaultShapeStyle = {
	strokeWidth:3,
	opacity:1,
	fill:"skyblue",
	stroke:"blue",
};
#defaultEditingStyle = {
	strokeWidth:3,
	opacity:1,
	fill:"yellow",
	stroke:"red",
};
	

#editPoint( x , y ){
	var geop = this.#svgMap.screen2Geo( x , y );
	console.log("Get EditPoint event! :",geop);
//	POIAppend( geop , isEditingLayer().getAttribute("iid") ,"TEST");
	// まず、すべてのレイヤーイベントリスナ（含パンズーム）を停止させる?(やってない)
	// かわりに、指定したレイヤーのPOIに新しいイベントリスナーを設置する?
	// 
}

#POIAppend( geoLocation ,  docId  ,title){
	var layerSVGDOM = this.#svgImages[docId];
	var layerCRS = this.#svgImagesProps[docId].CRS;
	var symbols = this.#svgMap.getSymbols(this.#svgImages[docId]);
//	var metaSchema = layerSVGDOM.ownerDocument.documentElement.getAttribute("property").split(",");
	
	if ( layerCRS && layerSVGDOM && symbols ){
		var symbd = layerSVGDOM.getElementsByTagName("defs");
		if ( symbd[0].getElementsByTagName("g") ){
			var firstSymbol = null;
			for ( var key in symbols ){
				firstSymbol = symbols[key];
//				console.log(key);
				break;
			}
//			var symbolId = firstSymbol.getAttribute("id");
			var svgxy = this.#svgMap.Geo2SVG( geoLocation.lat , geoLocation.lng , layerCRS )
			var tf = "ref(svg," + svgxy.x + "," + svgxy.y + ")";
			var nssvg = layerSVGDOM.documentElement.namespaceURI;
			var poi = layerSVGDOM.createElementNS(nssvg,"use"); // FirefoxではちゃんとNSを設定しないと大変なことになるよ^^; 2013/7/30
			poi.setAttribute("x" , 0);
			poi.setAttribute("y" , 0);
//			poi.setAttribute("transform" , tf);
			poi.setAttributeNS(nssvg,"transform" , tf);
			poi.setAttribute("xlink:href" , "#" + firstSymbol.id);
			poi.setAttribute("xlink:title" , title);
			poi.setAttribute("content" , "null");
			layerSVGDOM.documentElement.appendChild(poi);
//			console.log(layerSVGDOM);
//			console.log("POIAppend::",poi.parentNode);
//			POIeditSelection(poi);
//			console.log("addPoi:",poi,poi.getAttribute("xtransform"),poi.getAttribute("transform"));
			//dynamicLoad( "root" , mapCanvas );
			this.#svgMap.refreshScreen();
//			console.log("call poi edit props");
			setTimeout(function(){POIeditProps(poi,true,symbols);}.bind(this),50);
		}
	}
}



#clearTools = function( e ){
	console.log( "call clear tools");
	
	var targetDoc = this.#uiMapping.uiDoc;
	var confStat = "Cancel";
	this.#editConfPhase2( targetDoc, this.#uiMapping.toolsCbFunc, this.#uiMapping.toolsCbFuncParam, confStat );
	
	// 以下editConfPhase2で済み
//	poiCursor.removeCursor();
//	polyCanvas.removeCanvas();
//	clearForms(uiMapping.uiDoc);
	if ( this.#uiMapping.modifyTargetElement && this.#uiMapping.modifyTargetElement.getAttribute("iid") && document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid")) ){
		document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid")).style.backgroundColor="";
	}
	this.#uiMapping.modifyTargetElement=null;
	this.#uiMapping.editingGraphicsElement = false;
	console.log( "get iframe close/hide event from authoring tools framework.");
	this.#svgMap.setRootLayersProps(this.#uiMapping.editingLayerId, null , false );
	
	this.#removePointEvents( this.#editPolyPoint );
	
//	svgMap.refreshScreen();
}.bind(this);
#setTools = function( e ){
	console.log( "get iframe appear event from authoring tools framework.");
	this.#svgMap.setRootLayersProps(this.#uiMapping.editingLayerId, true , true );
}.bind(this);


// 特定POINTオブジェクトの登録ツール・座標入力ツール　特定のIDを持ったuse要素を登録（上書き）複数設置できる
// 座標の登録のみ　アイコンやプロパティの編集は出来ない(init時にあらかじめの設定は可能)
#initPOIregistTool(targetDiv,poiDocId,poiId,iconId,title,metaData,cbFunc,cbFuncParam,getPointOnly,returnSvgElement){
	
	var uiDoc = targetDiv.ownerDocument;
	
	// iconId: svg文書でdefsされたID setPoiSvg()に仕様により、"#"頭についたものをuiMapping.poiParams[].hrefに送る必要あるので・・
	if ( iconId.indexOf("#")!=0){
		iconId = "#"+iconId;
	}
	
	
	if ( this.#uiMapping.editingMode && this.#uiMapping.editingMode=="POIreg" && uiDoc === this.#uiMapping.uiDoc && poiDocId == this.#uiMapping.editingLayerId){ // すでにそのUIdocでPOIregモードの初期化済みのときは二個目以降のツールが追加されていく。このときcbFuncは無視・・
		console.log("ADD uiMapping");
	} else { // uiMappingを新規作成する系
		console.log("NEW uiMapping");
		
		this.#initUiMapping({  
			uiPanel : [],
			editingLayerId : poiDocId,
			editingMode : "POIreg",
			uiDoc: uiDoc,
			editingGraphicsElement: false,
			modifyTargetElement: null,
			poiParams:[],
			returnSvgElement:returnSvgElement,
			selectedPointsIndex:-1
		}) ;
		if ( cbFunc ){
			this.#uiMapping.toolsCbFunc = cbFunc;
			this.#uiMapping.toolsCbFuncParam = cbFuncParam;
		} else {
			this.#uiMapping.toolsCbFunc = null;
			this.#uiMapping.toolsCbFuncParam = null;
		}
		
	}
	this.#uiMapping.uiPanel.push(targetDiv);
	
	this.#uiMapping.poiParams.push(
		{
			title:title,
			metadata:metaData,
			href:iconId,
			id:poiId,
		}
	);
	
	var toolNumb = this.#uiMapping.uiPanel.length-1;
	
	this.#removeChildren(targetDiv);
	console.log("called initPOIregistTool: docId:",poiDocId);

	this.#svgImages = this.#svgMap.getSvgImages();
	this.#svgImagesProps = this.#svgMap.getSvgImagesProps();
	var symbols = this.#svgMap.getSymbols(this.#svgImages[poiDocId]);
	var metaSchema = this.#getMetaSchema(poiDocId);
	
	var centerRegButton=uiDoc.createElement("input");
	centerRegButton.setAttribute("type","button");
	centerRegButton.id="cernterRegButton"+toolNumb;
	centerRegButton.setAttribute("value","mapCenterCoord");
	
	var coordInputButton = uiDoc.createElement("input");
	coordInputButton.setAttribute("type","button");
	coordInputButton.id="coordInputButton"+toolNumb;
	coordInputButton.setAttribute("value","lat/lng");
	
	var coordTextBox = uiDoc.createElement("input");
	coordTextBox.setAttribute("type","text");
	coordTextBox.id="coordTextBox"+toolNumb;
	coordTextBox.setAttribute("value","---,---");
	
	targetDiv.appendChild(centerRegButton);
	targetDiv.appendChild(coordInputButton);
	targetDiv.appendChild(coordTextBox);
	
	this.#setPoiRegUiEvents(targetDiv);
	
}


// POINTオブジェクト(use)の"編集"ツール 新規追加、削除、変更などが可能　ただし一個しか設置できない
#svgImages;
#svgImagesProps;
#initPOItools(targetDiv,poiDocId,cbFunc,cbFuncParam,getPointOnly,returnSvgElement,options,){
	var bufferOption = false;
	if (  options?.bufferOption){
		bufferOption = options.bufferOption;
	}
	// getPointOnlyuse: useは作るものの　作った後に座標を取得してすぐに捨てるような使い方(アイコンを打つわけではない)
	
	this.#removeChildren(targetDiv);
	
	var uiDoc = targetDiv.ownerDocument;
	
	console.log("called initPOItools: docId:",poiDocId);
	this.#svgMap.setRootLayersProps(poiDocId, true , true ); // 子docの場合もあり得ると思う・・
	
	this.#svgImages = this.#svgMap.getSvgImages();
	this.#svgImagesProps = this.#svgMap.getSvgImagesProps();
	var symbols = this.#svgMap.getSymbols(this.#svgImages[poiDocId]);
	var metaSchema = this.#getMetaSchema(poiDocId);
	
	var symbolCount = 0;
	for ( var key in symbols ){ 
		++symbolCount;
	}
	
	var ihtml = '<table id="poiEditor">';
	if ( symbolCount > 1 ){
		ihtml += '<tr><td colspan="2" id="iconselection" >';
	} else { // アイコンが一個しかないときはアイコン選択UIは不要でしょう 2018.6.21
		ihtml += '<tr style="display:none"><td colspan="2" id="iconselection" >';
	}
	
	var firstSymbol = true;
	for ( var key in symbols ){ // srcに相対パスが正しく入っているか？
		if ( symbols[key].type=="symbol"){
	//		console.log(key , poiHref);
	//		console.log(key,getImagePath(symbols[key].path,poiDocId));
			ihtml+='<img id="symbol'+key+'" src="' + symbols[key].path + '" width="' + symbols[key].width + '" height="' + symbols[key].height + '" property="' + key + '" ';
			if ( firstSymbol ){
				ihtml += 'border="2" style="border-color:red" ';
				firstSymbol = false;
			} else {
				ihtml += 'border="2" style="border-color:white" ';
			}
			ihtml+='/>';
		}
	}
	ihtml += '</td></tr>';
	if ( !getPointOnly ){
		ihtml += '<tr><td>title</td><td><input type="text" id="poiEditorTitle" value="' + "title" + '"/></td></tr>';
	}
	ihtml += '<tr><td><input type="button" id="pointUI" value="lat/lng"/></td><td><input id="poiEditorPosition" type="text" value="--,--"/></td></tr></table>'
	
	ihtml += '<table id="metaEditor">';
	if ( metaSchema ){
		var latMetaCol,lngMetaCol,titleMetaCol; // 位置とtitleがメタデータにも用意されている（ダブっている）ときに、それらのカラム番号が設定される。
		for ( var i = 0 ; i < metaSchema.length ; i++ ){
			var mdval ="";
			if ( metaSchema[i] == "title" || metaSchema[i] == "name" || metaSchema[i] == "名称" || metaSchema[i] == "タイトル" ){
				titleMetaCol =i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" data-type="titleMetaCol" disabled="disabled" value="'+"title"+'"/></td></tr>';
			} else if ( metaSchema[i] == "latitude" || metaSchema[i] == "lat" || metaSchema[i] == "緯度"){
				latMetaCol = i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" data-type="latMetaCol"  disabled="disabled" value="' + "numberFormat(latlng.lat )" + '"/></td></tr>';
			} else if ( metaSchema[i] == "longitude"|| metaSchema[i] == "lon" || metaSchema[i] == "lng" || metaSchema[i] == "経度"){
				lngMetaCol = i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" data-type="lngMetaCol" disabled="disabled" value="' + "numberFormat(latlng.lng )" + '"/></td></tr>';
				
			} else {
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" value="' + mdval + '"/></td></tr>';
			}
		}
	}
	ihtml+='</table>';
	if ( bufferOption ){
		ihtml +='<div><input type="text" id="objectBufferLength"  value=""  placeholder="バッファ半径[m]"></input></div>';
	}
	ihtml+='<div id="editConf"><input type="button" id="pepok" value="決定"/><input type="button" id="pepng" value="キャンセル"/><input type="button" id="pepdel" disabled value="削除"/><span id="editMode">newObject</span></div>';
	targetDiv.innerHTML = ihtml;
	
//	addPoiEditEvents(document.getElementById(poiDocId));
	
	this.#initUiMapping( {
		uiPanel : targetDiv,
		editingLayerId : poiDocId,
		editingMode : "POI",
		uiDoc: uiDoc,
		editingGraphicsElement: false,
		modifyTargetElement: null,
		returnSvgElement: returnSvgElement,
		selectedPointsIndex:-1,
		editingStyle:structuredClone(this.#defaultEditingStyle), // bufferedの時に有効になる
		shapeStyle:structuredClone(this.#defaultShapeStyle), // 同上
	}, true );
	if ( cbFunc ){
		this.#uiMapping.toolsCbFunc = cbFunc;
		this.#uiMapping.toolsCbFuncParam = cbFuncParam;
	} else {
		this.#uiMapping.toolsCbFunc = null;
		this.#uiMapping.toolsCbFuncParam = null;
	}
	if ( bufferOption ){
		this.#uiMapping.bufferOption = true;
	}
	this.#setUiStyle(this.#uiMapping.editingStyle, options?.editingStyle);
	this.#setUiStyle(this.#uiMapping.shapeStyle, options?.shapeStyle);
	
	this.#setPoiUiEvents(uiDoc, poiDocId);
	this.#setMetaUiEvents(uiDoc, poiDocId);
	this.#setEditConfEvents(uiDoc, poiDocId);
	return ( this.#uiMapping );
}

#setMetaUiEvents(targetDoc){
	targetDoc.getElementById("metaEditor").addEventListener("click",function(e){
		console.log( this.#getMetaUiData(targetDoc));
		switch ( e.target.id ){
		}
	}.bind(this),false);
}

#getMetaUiData(targetDoc){
	var metaAns = [];
	var tbl = targetDoc.getElementById("metaEditor");
	for ( var i = 0 ; i < tbl.rows.length ; i++ ){
//		console.log(tbl.rows[i].cells[1]);
		metaAns.push(tbl.rows[i].cells[1].childNodes[0].value);
	}
	return ( metaAns );
}

#getAllAttrs(elem){
	var attrs = elem.attributes;
	var ret={};
	for (var i = 0 ; i < attrs.length; i++) {
		ret[attrs[i].name]=attrs[i].value;
	}
	return ( ret );
}

#setEditConfEvents( targetDoc , poiDocId){
	this.#pointAddMode = false;
	targetDoc.getElementById("editConf").addEventListener("click",function(e){
		console.log("editConf event : id:",e.target.id, " editMode:",this.#uiMapping);
		
		if ( this.#uiMapping.editingMode ==="POLYLINE" || this.#uiMapping.editingMode ==="POLYGON"){
			this.#removePointEvents( this.#editPolyPoint );
		}
		var confStat;
		if ( this.#uiMapping.modifyTargetElement ){
			this.#uiMapping.prevAttrs = this.#getAllAttrs(this.#uiMapping.modifyTargetElement);
		}
		var ret=null;
		switch ( e.target.id ){
		case"pepok": // 値設定決定用
			confStat = "OK";
			if ( this.#uiMapping.editingMode ==="POI"){
//				clearPoiSelection();
				ret = this.#setPoiSvg(this.#readPoiUiParams(targetDoc),poiDocId);
				// 既存アイコンを選択しているものがあれば（ＳＶＧではなく、ＨＴＭＬの方を）元に戻す
//				console.log(uiMapping.modifyTargetElement,document.getElementById(uiMapping.modifyTargetElement.getAttribute("iid")));
				if ( this.#uiMapping.modifyTargetElement && document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid"))){
					document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid")).style.backgroundColor="";
					if ( ret ){
						document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid")).title =ret.getAttribute("xlink:title");
					}
				}
			} else if ( this.#uiMapping.editingMode ==="POLYLINE" || this.#uiMapping.editingMode ==="POLYGON"){
				ret = this.#setPolySvg(targetDoc,poiDocId);
			}
			this.#uiMapping.modifyTargetElement=null;
			this.#uiMapping.editingGraphicsElement=false;
			break;
				
		case"pepng": // キャンセル用
			confStat = "Cancel";
			console.log("do cancel",this.#uiMapping.editingMode);
			// POIのケースで既存アイコンを選択しているものがあれば（ＳＶＧではなく、ＨＴＭＬの方を）元に戻す
			if ( this.#uiMapping.modifyTargetElement && document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid"))){
				document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid")).style.backgroundColor="";
			}
			this.#uiMapping.modifyTargetElement=null;
			this.#uiMapping.editingGraphicsElement = false;
//			if ( uiMapping.editingMode ==="POI"){
//			} else if ( uiMapping.editingMode ==="POLYLINE"){
//				polyCanvas.removeCanvas();
//			}
			break;
		case"pepdel": // 削除 2017.2.27 delにpolygonの要素ポイントの削除機能を拡張する
			console.log("pepdel button: selP",this.#uiMapping.selectedPointsIndex, "  insP:",this.#uiMapping.insertPointsIndex);
			if ( this.#uiMapping.selectedPointsIndex == -1 ){
				this.#svgMap.setCustomModal("Delete Object?",["YES","Cancel"],this.#delConfModal,{targetDoc:targetDoc,toolsCbFunc:this.#uiMapping.toolsCbFunc,toolsCbFuncParam:this.#uiMapping.toolsCbFuncParam});
				/**
				confStat = "Delete";
				uiMapping.editingGraphicsElement = false;
				var svgElem = uiMapping.modifyTargetElement;
				svgElem.parentNode.removeChild(svgElem);
				uiMapping.modifyTargetElement=null;
				**/
			} else {
				console.log("remove a point not skip edit conf");
				confStat = null;
				var geoPoints = this.#polyCanvas.getPoints();
				geoPoints.splice(this.#uiMapping.selectedPointsIndex , 1 );
				this.#uiMapping.selectedPointsIndex = -1;
				this.#polyCanvas.setPoints(geoPoints);
				this.#updatePointListForm( this.#uiMapping.uiDoc.getElementById("polyEditorPosition") , geoPoints );
			}
			break;
		}
		if ( ret ){
			if ( this.#uiMapping.bufferOption ){
				this.#bufferObject(ret);
			} else {
				ret.removeAttribute("data-geometry");
			}
		}
		this.#uiMapping.editedElement = ret;
		if ( confStat ){
			this.#editConfPhase2( targetDoc, this.#uiMapping.toolsCbFunc, this.#uiMapping.toolsCbFuncParam, confStat );
		}
	}.bind(this),false);
}

#editConfPhase2( targetDoc, toolsCbFunc, toolsCbFuncParam, confStat ){
//	console.log("editConfPhase2:",confStat,"   toolsCbFunc:",toolsCbFunc);
	this.#uiMapping.selectedPointsIndex = -1;
	this.#uiMapping.insertPointsIndex = -1;
	this.#clearForms(targetDoc);
	this.#poiCursor.removeCursor();
	this.#polyCanvas.removeCanvas();
//		console.log("editConfPhase2: toolsCbFunc?:",toolsCbFunc);
	if ( toolsCbFunc ){
		var retVal;
		if ( this.#uiMapping.returnSvgElement){ // 2020/7/17
			var attrs = null;
			if ( this.#uiMapping.editedElement ){
				attrs = this.#getAllAttrs(this.#uiMapping.editedElement);
			}
			retVal = 
				{
					confStat:confStat,
					element:this.#uiMapping.editedElement,
					attrs: attrs,
					prevAttrs:this.#uiMapping.prevAttrs
				}
			this.#uiMapping.prevAttrs = null;
			this.#uiMapping.editedElement = null;
			
		} else {
			retVal = confStat;
		}
		this.#callAfterRefreshed(toolsCbFunc,retVal,toolsCbFuncParam);
//		callAfterRefreshed(toolsCbFunc,confStat,toolsCbFuncParam);
//		toolsCbFunc(confStat, toolsCbFuncParam);
	}
	this.#svgMap.refreshScreen();
}

#delConfModal=function(index,opt){
	if ( index == 0 ){
		var confStat = "Delete";
		this.#uiMapping.editingGraphicsElement = false;
		var svgElem = this.#uiMapping.modifyTargetElement;
		svgElem.parentNode.removeChild(svgElem);
		this.#uiMapping.modifyTargetElement=null;
		this.#editConfPhase2( opt.targetDoc, opt.toolsCbFunc, opt.toolsCbFuncParam, confStat );
	} else {
		// do nothing
	}
}.bind(this);


#clearForms(targetDoc){
	console.log("clearForms");
	if ( this.#uiMapping.modifyTargetElement && this.#uiMapping.modifyTargetElement.getAttribute("iid")){
		document.getElementById(this.#uiMapping.modifyTargetElement.getAttribute("iid")).style.backgroundColor="";
		this.#uiMapping.modifyTargetElement = null;
	}
	if ( targetDoc.getElementById("pepdel") ){
		targetDoc.getElementById("pepdel").disabled=true;
	}
	if ( targetDoc.getElementById("editMode") ){
		targetDoc.getElementById("editMode").innerHTML="newObject";
	}
	if ( this.#uiMapping.editingMode ==="POI"){
		var tbl = targetDoc.getElementById("poiEditor");
		var symbs = tbl.rows[0].cells[0].childNodes;
		for ( var i = 0 ; i < symbs.length ; i++ ){
			if ( i==0 ){
				symbs[i].style.borderColor = "red";
			} else {
				symbs[i].style.borderColor = "white";
			}
		}
//		tbl.rows[1].cells[1].childNodes[0].value="";
//		tbl.rows[2].cells[1].childNodes[0].value="--,--";
		if ( targetDoc.getElementById("poiEditorTitle") ){
			targetDoc.getElementById("poiEditorTitle").value="";
		}
		targetDoc.getElementById("poiEditorPosition").value="--,--";
	} else if ( this.#uiMapping.editingMode ==="POLYLINE" || this.#uiMapping.editingMode ==="POLYGON"){
		var tbl = targetDoc.getElementById("polyEditorPosition");
		this.#removeChildren(tbl);
		tbl.innerHTML='<tr><td><input type="button" id="pointAdd" value="ADD"/></td></tr>';
	}
	
	var tbl = targetDoc.getElementById("metaEditor");
	if ( tbl){
		for ( var i = 0 ; i < tbl.rows.length ; i++ ){
	//		console.log(tbl.rows[i].cells[1]);
			tbl.rows[i].cells[1].childNodes[0].value="";
		}
	}
}

#setPoiSvg(poiParams, poiDocId, targetPoiId){
	// targetPoiId: svg文書に任意に設定したID(svgと対応htmlに設定されるiidではない!), poiParams:{title,geoPos[lat,lng],metadata,href}
	
	console.log("setPoiSvg called :", poiParams,poiDocId,targetPoiId);
	var targetId;
	if ( this.#uiMapping.modifyTargetElement ){
		targetId = this.#uiMapping.modifyTargetElement.getAttribute("iid");
	}
	var poiElem;
	var poiDoc = this.#svgImages[poiDocId];
	if ( targetId ){
		poiElem = this.#svgMap.getElementByImageId(poiDoc,targetId); // getElementByIdじゃないのよね・・・
		if (!poiElem){ // edit existing POI
			poiDocId = this.#uiMapping.modifyTargetElement.ownerDocument.documentElement.getAttribute("about");
			poiDoc = this.#svgImages[poiDocId];
			poiElem = this.#svgMap.getElementByImageId(poiDoc,targetId);
			
			if ( ! poiElem ){
	//			poiElem = poiDoc.createElement("use");
	//			このケースは原理上はあってはならない　エラー
				console.log("Can not find element.... Exit...");
				return ( false );
			} else {
				console.log("Tiled Doc....continue");
			}
		}
	} else if ( targetPoiId ){
		if ( poiDoc.getElementById(targetPoiId) ){
			poiElem = poiDoc.getElementById(targetPoiId);
		} else {
			poiElem = poiDoc.createElement("use");
			poiElem.setAttribute("id",targetPoiId);
			poiDoc.documentElement.appendChild(poiElem);
		}
			
	} else {
		poiElem = poiDoc.createElement("use");
//		nextsibling.....? なんか無造作すぎる気もする・・・
		poiDoc.documentElement.appendChild(poiElem);
	}
	
	var param = poiParams;
	console.log("setPoiSvg:",param);
	
	if ( param.geoPos[0] ){
		var svgPoint = this.#svgMap.Geo2SVG( param.geoPos[0] , param.geoPos[1] , this.#svgImagesProps[poiDocId].CRS);
		
		if ( param.metadata ){
			var metaStr = "";
				for ( var i = 0 ; i < param.metadata.length ; i++ ){
					metaStr += this.#svgMap.escape(param.metadata[i]);
					if ( i == param.metadata.length -1 ){
						break;
					}
					metaStr += ",";
				}
			poiElem.setAttribute("content",metaStr);
		}
		if ( param.title ){
			poiElem.setAttribute("xlink:title",param.title);
		}
		poiElem.setAttribute("transform" , "ref(svg,"+svgPoint.x + ","+svgPoint.y+")");
		if ( param.href ){
			poiElem.setAttribute("xlink:href", param.href);
		}
		poiElem.setAttribute("data-geometry",JSON.stringify({type:"Point",coordinates:[param.geoPos[1],param.geoPos[0]],icon:param.href}));
		console.log("setPoiSvg:",poiElem);
		return ( poiElem );
	} else {
		// ERROR
		return ( false );
	}
	
}

#setPolySvg(targetDoc,poiDocId){
	console.log("setPolySvg:",targetDoc,poiDocId);
	var targetSvgElem = null;
	var geoPoints = this.#polyCanvas.getPoints();
	if ( geoPoints.length < 2 || (this.#uiMapping.editingMode == "POLYGON" && geoPoints.length < 3) ){
		return ( false );
	}
	var gtype ="LineString";
	if (this.#uiMapping.editingMode== "POLYGON"){
		gtype ="Polygon";
	}
	
	if (  this.#uiMapping.modifyTargetElement &&  ( this.#uiMapping.modifyTargetElement.nodeName == "polygon" || this.#uiMapping.modifyTargetElement.nodeName == "polyline" ) ){
		// 編集対象が既存オブジェクトであり、polygon,pathの場合
		targetSvgElem = this.#uiMapping.modifyTargetElement;
		var d="";
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			var svgPoint = this.#svgMap.Geo2SVG( geoPoints[i].lat , geoPoints[i].lng , this.#svgImagesProps[poiDocId].CRS);
			d+=svgPoint.x+","+svgPoint.y+" ";
		}
		targetSvgElem.setAttribute("points",d);
	} else {
		// 編集対象が新規もしくは既存pathオブジェクトの場合
		if ( this.#uiMapping.modifyTargetElement){
			targetSvgElem = this.#uiMapping.modifyTargetElement;
		} else {
			var poiDoc = this.#svgImages[poiDocId];
			targetSvgElem = poiDoc.createElement("path");
			if ( this.#uiMapping.editingMode == "POLYGON" ){
				targetSvgElem.setAttribute("fill", this.#uiMapping.shapeStyle.fill);
			} else {
				targetSvgElem.setAttribute("fill","none");
			}
			targetSvgElem.setAttribute("stroke", this.#uiMapping.shapeStyle.stroke);
			targetSvgElem.setAttribute("stroke-width", this.#uiMapping.shapeStyle.strokeWidth);
			targetSvgElem.setAttribute("vector-effect","non-scaling-stroke");
			poiDoc.documentElement.appendChild(targetSvgElem);
		}
		var d="";
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			var svgPoint = this.#svgMap.Geo2SVG( geoPoints[i].lat , geoPoints[i].lng , this.#svgImagesProps[poiDocId].CRS);
			if ( i == 0 ){
				d="M"+svgPoint.x+","+svgPoint.y+"L";
			} else {
				d+=svgPoint.x+","+svgPoint.y+" ";
			}
		}
		if ( this.#uiMapping.editingMode == "POLYGON"){
			d+="z";
		} else {
		}
		targetSvgElem.setAttribute("d",d);
		
		var meta = this.#getMetaUiData(targetDoc);
		var metaStr = "";
		for ( var i = 0 ; i < meta.length ; i++ ){
			metaStr += this.#svgMap.escape(meta[i]);
			if ( i == meta.length -1 ){
				break;
			}
			metaStr += ",";
		}
		targetSvgElem.setAttribute("content",metaStr);
	}
	var crds=[];
	for ( var gp of geoPoints){
		crds.push([gp.lng, gp.lat]);
	}
	if ( gtype =="Polygon"){
		if ( crds[0][0] != crds[crds.length-1][0] || crds[0][1] != crds[crds.length-1][1] ){
			// 端が閉じてないのはgeojson的にはpolygonじゃないので
			crds.push([crds[0][0],crds[0][1]]);
		}
		crds = [crds];
	}
	targetSvgElem.setAttribute("data-geometry",JSON.stringify({type:gtype,coordinates:crds}));
	return (targetSvgElem);
}


#readPoiUiParams(targetDoc){
	var meta = this.#getMetaUiData(targetDoc);
	var tbl = targetDoc.getElementById("poiEditor");
	var symbs = tbl.rows[0].cells[0].childNodes;
	var symbolHref;
	for ( var i = 0 ; i < symbs.length ; i++ ){
		if ( symbs[i].style.borderColor === "red" ){
			symbolHref = symbs[i].getAttribute("property");
			break;
		}
	}
	console.log("readPoiUiParams:symbols:",symbs,"  symHref:",symbolHref);
//	var title = tbl.rows[1].cells[1].childNodes[0].value;
	var title="";
	if ( targetDoc.getElementById("poiEditorTitle")){
		title = targetDoc.getElementById("poiEditorTitle").value
	}
//	var geoPos = tbl.rows[2].cells[1].childNodes[0].value.split(",");
	var geoPos = targetDoc.getElementById("poiEditorPosition").value.split(",");
	console.log(geoPos);
	geoPos[0]=Number(geoPos[0]);
	geoPos[1]=Number(geoPos[1]);
	
	// geoPos及びtitleに相当する重複メタデータを上書きする 2017.6.1
	var tbl = targetDoc.getElementById("metaEditor");
	for ( var i = 0 ; i < tbl.rows.length ; i++ ){
//		console.log(tbl.rows[i].cells[1].childNodes[0]);
		if ( tbl.rows[i].cells[1].childNodes[0].dataset.type ){
			if ( tbl.rows[i].cells[1].childNodes[0].dataset.type=="latMetaCol"){
				meta[i]=geoPos[0]+""; // 文字列化しないとescape関数がエラー起こす..
			} else if ( tbl.rows[i].cells[1].childNodes[0].dataset.type=="lngMetaCol"){
				meta[i]=geoPos[1]+"";
			} else if ( tbl.rows[i].cells[1].childNodes[0].dataset.type=="titleMetaCol"){
				meta[i]=title;
			}
		}
	}
	
	return {
		title: title,
		geoPos : geoPos,
		metadata : meta,
		href : symbolHref
	}
}


#setPoiRegPosition(e,targetTxtBoxId, directPutPoiParams){ // setPoiPositionはこれで置き換えの方向
	var targetDoc = this.#uiMapping.uiDoc;
	var mxy = this.#svgMap.getMouseXY(e);
	var geop = this.#svgMap.screen2Geo(mxy.x , mxy.y );
	console.log("XY:",mxy, " latlng:",geop, " form:",targetDoc.getElementById("poiEditorPosition"));
	targetDoc.getElementById(targetTxtBoxId).value= this.#svgMap.numberFormat(geop.lat) + "," + this.#svgMap.numberFormat(geop.lng);
//	document.removeEventListener("click", setPoiRegPosition, false);
	if ( !directPutPoiParams ){
		this.#poiCursor.setCursorGeo(geop);
	} else {
		this.#setPoiSvg(
			{title:directPutPoiParams.title,geoPos:[geop.lat,geop.lng],metadata:directPutPoiParams.metadata,href:directPutPoiParams.href},
			this.#uiMapping.editingLayerId,
			directPutPoiParams.id
		);
		if ( this.#uiMapping.toolsCbFunc ){
			this.#callAfterRefreshed(this.#uiMapping.toolsCbFunc,true,this.#uiMapping.toolsCbFuncParam);
//			toolsCbFunc(true, toolsCbFuncParam); // refreshが完了してから呼ばないと行儀が悪く、問題が出るようになった(2019/12/27)
		}
		this.#svgMap.refreshScreen(); 
	}
	
	// メタデータで緯度経度重複のあるdisabled formに値をコピー
	console.log("setPoiRegPosition: copy lat lng to meta");
	if ( targetDoc.getElementById("metaEditor")){
		var tbl = targetDoc.getElementById("metaEditor");
		for ( var i = 0 ; i < tbl.rows.length ; i++ ){
			console.log(tbl.rows[i].cells[1].childNodes[0]);
			if ( tbl.rows[i].cells[1].childNodes[0].dataset.type ){
				if ( tbl.rows[i].cells[1].childNodes[0].dataset.type=="latMetaCol"){
					tbl.rows[i].cells[1].childNodes[0].value = this.#svgMap.numberFormat(geop.lat);
				} else if ( tbl.rows[i].cells[1].childNodes[0].dataset.type=="lngMetaCol"){
					tbl.rows[i].cells[1].childNodes[0].value = this.#svgMap.numberFormat(geop.lng);
				}
			}
		}
	} 
}

// 2021/3/16 マウスクリックだけでなくタッチイベントにも対応させる
// キャンセルも可能にする(cancelPointingPoiRegister)
#pointingPoiRegister(targetTxtBoxId,directPutPoiParams){
	this.#cancelPointingPoiRegister();
	this.#pointingPoiRegObject={
		targetTxtBoxId:targetTxtBoxId,
		directPutPoiParams:directPutPoiParams
	}
	this.#addPointEvents(this.#pointingPoiRegisterListener);
	//addEventListener("click",pointingPoiRegisterListener,false);
	//addEventListener("touchend",pointingPoiRegisterListener,false);
}

// POIのUIのクリック・タッチイベント聞き取り状態は排他的なのでクロージャ内に一個の管理オブジェクトがあれば良いはず
#pointingPoiRegObject={};
#pointingPoiRegisterListener=function(event){
	this.#setPoiRegPosition(event, this.#pointingPoiRegObject.targetTxtBoxId, this.#pointingPoiRegObject.directPutPoiParams);
	this.#cancelPointingPoiRegister();
}.bind(this)

#cancelPointingPoiRegister(){
	this.#pointingPoiRegObject={};
	this.#removePointEvents(this.#pointingPoiRegisterListener);
	//removeEventListener("click",pointingPoiRegisterListener,false);
	//removeEventListener("touchend",pointingPoiRegisterListener,false);
}



#callAfterRefreshed(cbf,cbfParam0,cbfParam1){ // refreshが完了してから呼ぶための関数(2019/12/27)
	console.log("set cbf on callAfterRefreshed :", cbf,cbfParam0,cbfParam1);
	if ( typeof(cbf)!="function"){return}
	window.addEventListener('screenRefreshed', (function(cbf,cbfParam0,cbfParam1) {
		var f = function() {
			console.log("catch screenRefreshed call:",cbf," param:",cbfParam0,cbfParam1)
			window.removeEventListener('screenRefreshed', f, false);
			cbf(cbfParam0,cbfParam1);
		}.bind(this)
		return (f);
	}.bind(this))(cbf,cbfParam0,cbfParam1), false);
}



#setPoiRegUiEvents( targetDiv ){ // setPoiUiEventsはこれで置き換えの方向
	targetDiv.addEventListener("click",function(e){
		console.log("get PoiRegUiEvents: targetId:",e.target.id);
		if ( e.target.parentNode.id =="pointUI"){// 緯度経度のカーソル入力用
			console.log("pointUIev");
			setTimeout(function(){
				this.#pointingPoiRegister("poiEditorPosition");
				
//				document.addEventListener("click", function(ev){setPoiRegPosition(ev , "poiEditorPosition" )} , false );
			}.bind(this),100);
		} else if ( e.target.parentNode.id =="iconselection"){
			for ( var i = 0 ; i < e.target.parentNode.childNodes.length ; i++ ){
				e.target.parentNode.childNodes[i].setAttribute("style","border-color:white");
			}
			e.target.setAttribute("style","border-color:red");
			var selectedPoiHref = e.target.getAttribute("property");
			console.log("selPoi:",selectedPoiHref);
		} else if ( (e.target.id).indexOf("coordInputButton")==0){
			var targetUInumber =  Number((e.target.id).substring(16));
			console.log("coordInputButton event numb:",targetUInumber);
			
			setTimeout(function(){
				this.#pointingPoiRegister("coordTextBox"+targetUInumber , this.#uiMapping.poiParams[targetUInumber]);
				/** pointingPoiRegisterで置き換え(2021/3/16)
				document.addEventListener("click", function(ev){
					setPoiRegPosition(ev , "coordTextBox"+targetUInumber , uiMapping.poiParams[targetUInumber]);
					document.removeEventListener("click", arguments.callee, false);
				} , false );
				**/
			}.bind(this),100);
		} else if ( (e.target.id).indexOf("cernterRegButton")==0){
			var targetUInumber =  Number((e.target.id).substring(16));
			
			var geop = this.#svgMap.getCentralGeoCoorinates();
			console.log("map center coord Input Button event numb:",targetUInumber,geop, this.#uiMapping.poiParams);
			this.#uiMapping.uiDoc.getElementById("coordTextBox"+targetUInumber).value= this.#svgMap.numberFormat(geop.lat) + "," + this.#svgMap.numberFormat(geop.lng);
			var params = this.#uiMapping.poiParams[targetUInumber];
			
			this.#setPoiSvg(
				{title:params.title,geoPos:[geop.lat,geop.lng],metadata:params.metadata,href:params.href},
				this.#uiMapping.editingLayerId,
				params.id
			);
			if ( this.#uiMapping.toolsCbFunc ){
				this.#callAfterRefreshed(this.#uiMapping.toolsCbFunc,true,this.#uiMapping.toolsCbFuncParam);
//				toolsCbFunc(true, toolsCbFuncParam);
			}
			this.#svgMap.refreshScreen();
		}
	}.bind(this),false);
}


#setPoiPosition=function(e){
	var targetDoc = this.#uiMapping.uiDoc;
	var mxy = this.#svgMap.getMouseXY(e);
	var geop = this.#svgMap.screen2Geo(mxy.x , mxy.y );
	this.#poiCursor.setCursorGeo(geop);
//	cursor.style.left = (screenPoint.x - 6) + "px";
//	cursor.style.top = (screenPoint.y - 6)+ "px";
	console.log("XY:",mxy, " latlng:",geop, " form:",targetDoc.getElementById("poiEditorPosition"));
//	values[2].value= numberFormat(geop.lat) + "," + numberFormat(geop.lng);
	targetDoc.getElementById("poiEditorPosition").value= this.#svgMap.numberFormat(geop.lat) + "," + this.#svgMap.numberFormat(geop.lng);
	document.removeEventListener("click", this.#setPoiPosition, false);
	
	// メタデータで緯度経度重複のあるdisabled formに値をコピー
	console.log("setPoiPosition: copy lat lng to meta");
	var tbl = targetDoc.getElementById("metaEditor");
	for ( var i = 0 ; i < tbl.rows.length ; i++ ){
		console.log(tbl.rows[i].cells[1].childNodes[0]);
		if ( tbl.rows[i].cells[1].childNodes[0].dataset.type ){
			if ( tbl.rows[i].cells[1].childNodes[0].dataset.type=="latMetaCol"){
				tbl.rows[i].cells[1].childNodes[0].value = this.#svgMap.numberFormat(geop.lat);
			} else if ( tbl.rows[i].cells[1].childNodes[0].dataset.type=="lngMetaCol"){
				tbl.rows[i].cells[1].childNodes[0].value = this.#svgMap.numberFormat(geop.lng);
			}
		}
	}
	
}.bind(this)

#setPoiUiEvents( targetDoc){
	targetDoc.getElementById("poiEditor").addEventListener("click",function(e){
		console.log("PoiUiEvent: targetId:",e.target.id);
		switch ( e.target.id ){
		case"pointUI": // 緯度経度のカーソル入力用
			console.log("pointUIev");
			setTimeout(function(){
				document.addEventListener("click", this.#setPoiPosition , false );
			}.bind(this),100);
			break;
		}
		if ( e.target.parentNode.id =="iconselection"){
			for ( var i = 0 ; i < e.target.parentNode.childNodes.length ; i++ ){
				e.target.parentNode.childNodes[i].setAttribute("style","border-color:white");
			}
			e.target.setAttribute("style","border-color:red");
			var selectedPoiHref = e.target.getAttribute("property");
			console.log("selPoi:",selectedPoiHref);
		}
	}.bind(this),false);
}

// Polygon,Polyline,Path用のキャンバスのクロージャ
#polyCanvas = (function(){
	var enabled = false;
	
	var isPolygon = true;
	
	var cv; // canvas elem
	var cc; // context of canvas
	var cs; // canvasSize
	var geoPoints=[]; // draw points
	
	var defaultFillColor = "rgba(255,127,0,1.0)";
	var defaultStrokeColor = "rgba(255,0,0,1.0)";
	var defaultLineWidth = 3.0;
	
	var initCanvas = function(){
		defaultFillColor = this.#uiMapping.editingStyle.fill;
		defaultStrokeColor = this.#uiMapping.editingStyle.stroke;
		defaultLineWidth = this.#uiMapping.editingStyle.strokeWidth;

		enabled = true;
//		console.log("initCanvas");
		if (  document.getElementById("PolyEditCanvas") ){
			cv = document.getElementById("PolyEditCanvas");
		} else {
			cv = document.createElement("canvas");
			cs = this.#svgMap.getMapCanvasSize();
			cv.width = cs.width;
			cv.height = cs.height;
			cv.id="PolyEditCanvas";
			cv.style.position="absolute";
			cv.style.left="0px";
			cv.style.top="0px";
			cv.style.zIndex="20";
//			cv.style.width=cs.width+"px";
//			cv.style.height=cs.height+"px";
			var mapc=this.#mapViewerProps.mapCanvas;
//			document.getElementById("centerSight").parentNode.appendChild(cv);
			mapc.appendChild(cv);
		}
		cc = cv.getContext("2d");
		cc.globalAlpha = 0.5;
		cc.lineWidth = defaultLineWidth;
		cc.strokeStyle = defaultStrokeColor;
		cc.fillStyle = defaultFillColor;
//		cc.clearRect(0, 0, cv.width, cv.height);
//		cc.beginPath();
//		cc.fillRect(400,300,500,500);
//		cc.stroke();
//		cc.beginPath();
//		cc.moveTo(0, 0);
//		cc.lineTo(200, 100);
//		cc.lineTo(100, 100);
//		cc.closePath();
//		cc.stroke();
		document.addEventListener("screenRefreshed",updateCanvas);
		document.addEventListener("zoomPanMap",updateCanvas);
	}.bind(this);
	
	function addPoint(point){
		geoPoints.push(point);
//		console.log("addPoint:",point,geoPoints);
		updateCanvas();
	}
	
	function setPoints(points , objIsPolygon){
		if ( points[0].lat ){
			geoPoints = points;
		} else {	
			geoPoints=[];
			for ( var i = 0 ; i < points.length ; i++ ){
				geoPoints.push({lat:points[i][0],lng:points[i][1]});
			}
		}
		if ( objIsPolygon ){
			isPolygon = objIsPolygon;
		}
		updateCanvas();
	}
	
	function getPoints(){
		return ( geoPoints );
	}
	
	var updateCanvas = function(){
		console.log("updateCanvas: insP:", this.#uiMapping.insertPointsIndex , "  selP:" , this.#uiMapping.selectedPointsIndex, "   isPolygon:",isPolygon);
		initCanvas();
		cc.clearRect(0, 0, cs.width, cs.height);
		cc.beginPath();
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			var screenPoint = this.#svgMap.geo2Screen( geoPoints[i].lat , geoPoints[i].lng );
//			console.log(screenPoint);
			if ( i==0 ){
				cc.moveTo(screenPoint.x, screenPoint.y);
			} else {
				cc.lineTo(screenPoint.x, screenPoint.y);
			}
		}
		if ( isPolygon ){
			cc.closePath();
		}
		cc.stroke();
		
		if ( geoPoints.length == 1 ){
			hilightPoint(0);
		}
		if ( this.#uiMapping.insertPointsIndex >=0 ){
			if ( this.#uiMapping.editingMode == "POLYLINE" && this.#uiMapping.insertPointsIndex == geoPoints.length){
				hilightPoint(this.#uiMapping.insertPointsIndex-1);
			} else if ( this.#uiMapping.editingMode == "POLYLINE" &&this.#uiMapping.insertPointsIndex == 0){
				hilightPoint(0);
			} else {
				if ( this.#uiMapping.insertPointsIndex == 0 ){ // 上の条件があるのでPolygon専用処理
					hilightPoint(geoPoints.length-1);
				} else {
					hilightPoint(this.#uiMapping.insertPointsIndex-1);
				}
				hilightLine(this.#uiMapping.insertPointsIndex);
			}
		} else if ( this.#uiMapping.selectedPointsIndex >=0 ){
			hilightPoint(this.#uiMapping.selectedPointsIndex);
		}
		
		
	}.bind(this);
	
	function clearPoints(){
		geoPoints = [];
	}
	
	var hilightPoint = function( index ){
		if ( index >=0 && index < geoPoints.length ){
			var P1 = this.#svgMap.geo2Screen(geoPoints[index].lat , geoPoints[index].lng);
		console.log("hilightPoint:",index," XY:",P1);
//			updateCanvas();
			cc.lineWidth = defaultLineWidth * 2;
			cc.strokeStyle = "rgba(0,255,0,1.0)";
			cc.fillStyle = "rgba(0,255,0,1.0)";
			
			cc.beginPath();
			cc.arc(P1.x, P1.y , defaultLineWidth * 2 , 0 , Math.PI*2, true);
			cc.fill();
			cc.stroke();
			
			cc.lineWidth = defaultLineWidth;
			cc.strokeStyle = defaultStrokeColor;
			cc.fillStyle = defaultFillColor;
		}
	}.bind(this);
	
	var hilightLine = function ( index ){
		console.log("polyCanvas hilightLine:",index, " totalPoints:",geoPoints.length);
		var P1,P2;
		if ( index >0 && index < geoPoints.length ){
			P1 = this.#svgMap.geo2Screen(geoPoints[index-1].lat , geoPoints[index-1].lng);
			P2 = this.#svgMap.geo2Screen(geoPoints[index].lat , geoPoints[index].lng);
		} else if ( index == 0 || index == geoPoints.length ){
			if ( geoPoints.length > 0 ){
				P1 = this.#svgMap.geo2Screen(geoPoints[geoPoints.length-1].lat , geoPoints[geoPoints.length-1].lng);
				P2 = this.#svgMap.geo2Screen(geoPoints[0].lat , geoPoints[0].lng);
			}
		}
		if ( P1 ){
//			updateCanvas();
			cc.lineWidth = defaultLineWidth * 2;
			cc.strokeStyle = "rgba(0,255,0,1.0)";
//			cc.strokeStyle = "rgba(255,255,0,1.0)";
			cc.beginPath();
			cc.moveTo(P1.x, P1.y);
			cc.lineTo(P2.x, P2.y);
			cc.closePath();
//			cc.fill();
			cc.stroke();
			
			cc.lineWidth = defaultLineWidth;
			cc.strokeStyle = defaultStrokeColor;
			cc.fillStyle = defaultFillColor;
		}
	}.bind(this);
	
	function removeCanvas(){
		enabled = false;
		clearPoints();
		console.log("removeCanvas");
		document.removeEventListener("screenRefreshed", updateCanvas, false);
		document.removeEventListener("zoomPanMap", updateCanvas, false);
		if ( document.getElementById("PolyEditCanvas") ){
			var cv = document.getElementById("PolyEditCanvas");
			cv.parentNode.removeChild(cv);
		}
	}
	
	function setPolygonMode( polygonMode ){
		isPolygon = polygonMode;
	}
	
	return{
//		initCanvas: initCanvas,
		clearPoints: clearPoints,
		addPoint: addPoint,
		setPoints: setPoints,
		getPoints: getPoints,
		removeCanvas: removeCanvas,
		updateCanvas: updateCanvas,
		setPolygonMode : setPolygonMode,
//		hilightLine: hilightLine,
//		hilightPoint: hilightPoint
	}
}.bind(this))();

	
// POI用グラフィックスカーソルのクロージャ
// 今のところ一個のみ
#poiCursor = (function (){
	var enabled = false;
	var cursorGeoPoint;
	
	function setCursorGeo(geoPoint){
		console.log("setCursorGeo :", cursorGeoPoint,geoPoint);
		cursorGeoPoint = geoPoint;
		enabled = true;
		updateCursorGeo();
		document.addEventListener("screenRefreshed",updateCursorGeo);
		document.addEventListener("zoomPanMap",updateCursorGeo);
	}
	
	var updateCursorGeo = function(event){
		console.log("updateCursor:",cursorGeoPoint, "  ev:",event);
		if ( document.getElementById("centerSight") ){
			var screenPoint = this.#svgMap.geo2Screen( cursorGeoPoint.lat , cursorGeoPoint.lng );
			if ( ! document.getElementById("POIeditCursor") ){
				var cursor = document.createElement("img");
		//		poiの画面上の位置を得る
				cursor.style.position = "absolute";
				cursor.style.width="10";
				cursor.style.height="10";
				cursor.id = "POIeditCursor";
				var cs = document.getElementById("centerSight");
				cursor.src = cs.src;
	//			cs.parentNode.appendChild(cursor);
				var mapc=this.#mapViewerProps.mapCanvas;
				mapc.appendChild(cursor);
			} else {
				cursor = document.getElementById("POIeditCursor");
			}
			cursor.style.zIndex="100"; // rev15では、checkLoadCompletedがpathHitTest時には走らず、toBeDel部にcenterSightが入るため、zIndexを上げてパッチすることにする。rev14でも影響はない。
			cursor.style.left = (screenPoint.x - 6) + "px";
			cursor.style.top = (screenPoint.y - 6)+ "px";
		}
	}.bind(this);
	
	function removeCursor(){
		enabled = false;
		console.log("removeCursor");
		document.removeEventListener("screenRefreshed", updateCursorGeo, false);
		document.removeEventListener("zoomPanMap", updateCursorGeo, false);
		if ( document.getElementById("POIeditCursor") ){
			var cursor = document.getElementById("POIeditCursor");
			cursor.parentNode.removeChild(cursor);
		}
	}
	return {
		setCursorGeo: setCursorGeo,
		removeCursor:removeCursor
	};
}.bind(this))();



#addPoiEditEvents( targetCanvasNode ){ // 不使用
	var cn = targetCanvasNode.childNodes;
	for ( var i = 0 ; i < cn.length ; i++ ){
		if ( cn[i].nodeName==="img" ){
			addEventListener("click",function(e){
				cdonsole.log("click:",e);
			}.bind(this));
		} else if ( cn[i].nodeName==="div" ){
			this.#addPoiEditEvents(cn[i]);
		}
	}
}

#getPOIprops( svgTarget ){
	var poiNode = svgTarget.element;
	var poiDocId = svgTarget.docId
	
	var svgPos = this.#svgMap.getPoiPos(poiNode);
	var poiHref = poiNode.getAttribute("xlink:href");
//	var metaSchema = poiNode.parentNode.getAttribute("property").split(",");
	var metaData = poiNode.getAttribute("content");
	if ( metaData && metaData !="" ){
		metaData = metaData.split(",");
	} else {
		metaData = [];
	}
	var title = poiNode.getAttribute("xlink:title");
	var latlng = this.#svgMap.SVG2Geo(Number(svgPos.x) , Number(svgPos.y) , this.#svgImagesProps[poiDocId].CRS);
	return {
		position : latlng,
		href : poiHref,
		metaData : metaData,
		title : title
	}
}

#getPolyProps( svgTarget ){
	console.log("getPolyProps:",svgTarget,svgTarget.element.nodeName);
	var poiNode = svgTarget.element;
	var poiDocId = svgTarget.docId
	
//	var svgPos = svgMap.getPoiPos(poiNode);
//	var poiHref = poiNode.getAttribute("xlink:href");
//	var metaSchema = poiNode.parentNode.getAttribute("property").split(",");
	var metaData;
	if ( poiNode.getAttribute("content") ){
		metaData = poiNode.getAttribute("content").split(",");
	}
//	var title = poiNode.getAttribute("xlink:title");
//	var latlng = svgMap.SVG2Geo(Number(svgPos.x) , Number(svgPos.y) , svgImagesProps[poiDocId].CRS);
	
	var geops;
	if (svgTarget.element.nodeName == "path"){
		var svgps = this.#getPolyPoints(this.#pathConditioner(svgTarget.element.getAttribute("d")));
//		console.log(svgps);
		geops = this.#getGeoCoordinates(svgps,this.#svgImagesProps[poiDocId].CRS);
//		console.log(geops);
		
	} else if (svgTarget.element.nodeName == "polygon"|| svgTarget.element.nodeName == "polyline"){
		// TBD
	}
	return {
		position : geops,
//		href : poiHref,
		metaData : metaData,
//		title : title
	}
}

// 以下の pathのためのパーサは本体に既に存在しており、重複しているのが好ましくない。2016.12.28
#pathConditioner( d ){
	d = d.replace(/,/gm,' '); // get rid of all commas
	d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
	d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
	d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm,'$1 $2'); // separate commands from points
	d = d.replace(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from points
	d = d.replace(/([0-9])([+\-])/gm,'$1 $2'); // separate digits when no comma
	d = d.replace(/(\.[0-9]*)(\.)/gm,'$1 $2'); // separate digits when no comma
	d = d.replace(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm,'$1 $3 $4 '); // shorthand elliptical arc path syntax
	d = this.#trim(this.#compressSpaces(d)).split(' '); // compress multiple spaces
//	console.log("d:",d);
	return ( d );
}
#compressSpaces(s) { return s.replace(/[\s\r\t\n]+/gm,' '); }
#trim(s) { return s.replace(/^\s+|\s+$/g, ''); }
#getPolyPoints(d){
	var svgXY = [];
	var prevCommand="M";
	var prevCont = false;
	var sx = 0, sy = 0;
	var startX = 0, startY = 0; // mx,myと似たようなものだがtransformかけてない・・・ 2016/12/1 debug
	var i = 0;
	var command = d[i];
	var closed = false;
	
	var hitPoint = new Object(); // pathのhitPoint(線のためのhitTestエリア)を追加してみる(2013/11/28)
	while ( i < d.length ){
		switch (command){
		case "M":
			++i;
			sx = Number(d[i]);
			++i;
			sy = Number(d[i]);
			startX = sx;
			startY = sy;
			var svgP = [sx,sy];
			var svgPs = [svgP];
			svgXY.push( svgPs );
			command ="L"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
			break;
		case "m":
			++i;
			sx += Number(d[i]);
			++i;
			sy += Number(d[i]);
			startX = sx;
			startY = sy;
			var svgP = [sx,sy];
			var svgPs = [svgP];
			svgXY.push( svgPs );
			command ="l"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
			break;
		case "L":
			++i;
			sx = Number(d[i]);
			++i;
			sy = Number(d[i]);
			var svgP = [sx,sy];
			var thisPs = svgXY[svgXY.length -1 ]
			thisPs.push(svgP);
			break;
		case "l":
			++i;
			sx += Number(d[i]);
			++i;
			sy += Number(d[i]);
			var svgP = [sx,sy];
			var thisPs = svgXY[svgXY.length -1 ]
			thisPs.push(svgP);
			break;
		case "A":
			// skip
			++i;
			++i;
			++i;
			++i;
			++i;
			++i;
			++i;
			break;
		case "Z":
		case "z":
			closed = true;
			sx = startX; // debug 2016.12.1
			sy = startY;
			var svgP = [sx,sy];
			var thisPs = svgXY[svgXY.length -1 ]
			thisPs.push(svgP);
			svgXY.type = "POLYGON";
			break;
		default:
			prevCont = true;
			break;
		}
		
		
		if ( !prevCont ){
			prevCommand = command;
			++i;
			command = d[i];
		} else {
			command = prevCommand;
			prevCont = false;
			--i;
		}
		
	}
	return ( svgXY );
}
#getGeoCoordinates(svgXY , CRS){
	var latlng;
	var geoXY = [];
	var subGeoXY;
	for ( var i = 0 ; i < svgXY.length ; i++ ){
		if ( svgXY[0] instanceof Array ){
			subGeoXY = [];
			for ( var j = 0 ; j < svgXY[i].length ; j++ ){
				latlng = this.#svgMap.SVG2Geo(svgXY[i][j][0],svgXY[i][j][1],CRS);
				subGeoXY.push([latlng.lat,latlng.lng]);
			}
			geoXY.push(subGeoXY);
		} else {
			latlng = this.#svgMap.SVG2Geo(svgXY[i][0],svgXY[i][1],CRS);
			geoXY.push([latlng.lat,latlng.lng]);
		}
	}
	if ( svgXY.type ){
		geoXY.type = svgXY.type;
	}
	return(geoXY);
}





#setTargetObject(svgTarget){
	console.log("called setTargetObject:",svgTarget);
	console.log( this.#uiMapping.editingLayerId , svgTarget.docId, svgTarget);
	
	if ( this.#uiMapping.editingLayerId === svgTarget.docId  || this.#uiMapping.editingLayerId === this.#svgImagesProps[svgTarget.docId].rootLayer){ // 冗長・・
		var svgNode = svgTarget.element;
		
		console.log(svgNode.nodeName,svgNode.getAttribute("fill"),this.#uiMapping.editingMode, this.#uiMapping.genericModePanel);
		if ( this.#uiMapping.genericMode.panel ){
			this.#switchGenericTool(svgTarget);
			
		} else {
			//		var targetDocId = svgTarget.docId
			console.log("setTargetObject:", svgNode);
			if (svgNode.nodeName == "use" && this.#uiMapping.editingMode == "POI") {
				this.#hilightPOI(svgNode.getAttribute("iid"));
				this.#displayPOIprops(svgTarget);
			} else if (
				(svgNode.nodeName == "path" ||
					svgNode.nodeName == "polygon" ||
					svgNode.nodeName == "polyline") &&
				(this.#uiMapping.editingMode == "POLYGON" ||
					this.#uiMapping.editingMode == "POLYLINE")
			) {
				this.#displayPolyProps(svgTarget);
			}
		}
	}
	this.#svgMap.refreshScreen(); // 選択状態を解除(2023/1/20)
}

#selectedObjectID; // これは、メイン画面上の選択されたオブジェクト(アイコン)のIDなのでたぶんグローバルで問題ないはずです。
#hilightPOI( poiID ){
	console.log("hilightPOI  :  targetPOI ID:",poiID, " poiIcon:",document.getElementById(poiID));
	if ( !document.getElementById(poiID)){return}
	document.getElementById(poiID).style.backgroundColor="#FFFF00";
	if ( this.#selectedObjectID && (this.#selectedObjectID != poiID ) && document.getElementById(this.#selectedObjectID) ){
		document.getElementById(this.#selectedObjectID).style.backgroundColor="";
	}
	this.#selectedObjectID = poiID;
}





#displayPOIprops(svgTarget){
	// 選択されたPOIに対する属性を編集パネルに書き込む。
	var props = this.#getPOIprops(svgTarget);
//	console.log(props);
	var targetDiv = this.#uiMapping.uiPanel;
//	console.log(targetDiv, targetDiv.ownerDocument);
	var uiDoc = targetDiv.ownerDocument;
	var de = uiDoc.documentElement;
	this.#uiMapping.modifyTargetElement = svgTarget.element;
	
	uiDoc.getElementById("pepdel").disabled=false;
	uiDoc.getElementById("editMode").innerHTML="modifyObject";
	var me = uiDoc.getElementById("metaEditor");
	var pep = uiDoc.getElementById("poiEditorPosition");
	pep.value=this.#svgMap.numberFormat(props.position.lat) + "," + this.#svgMap.numberFormat(props.position.lng);
	if ( uiDoc.getElementById("poiEditorTitle") ){
		uiDoc.getElementById("poiEditorTitle").value = props.title;
	}
	for ( var i = 0 ; i < props.metaData.length ; i++ ){
//		console.log(props.metaData[i],me.rows[i].cells[1]);
		uiDoc.getElementById("meta"+i).value = props.metaData[i];
	}
	var smbls =  uiDoc.getElementById("iconselection").childNodes;
	for ( var i = 0 ; i < smbls.length ; i++ ){
		smbls[i].style.borderColor="white";
	}
	uiDoc.getElementById("symbol"+props.href).style.borderColor="red";
	
	var screenPoint = this.#svgMap.geo2Screen( props.position.lat , props.position.lng );
	this.#poiCursor.setCursorGeo(props.position);
}

#displayPolyProps(svgTarget){
	var props = this.#getPolyProps(svgTarget);
	var targetDiv = this.#uiMapping.uiPanel;
	var uiDoc = targetDiv.ownerDocument;
	var de = uiDoc.documentElement;
	this.#uiMapping.modifyTargetElement = svgTarget.element;
	
	uiDoc.getElementById("pepdel").disabled=false;
	uiDoc.getElementById("editMode").innerHTML="modifyObject";
	
	var me = uiDoc.getElementById("metaEditor");
	var pep = uiDoc.getElementById("polyEditorPosition");
	console.log(props.position, "  props:",props , "   svgTarget:", svgTarget);
	if ( props.position.type &&  props.position.type==="POLYGON"){
		// geojsonとちがい最終点は閉じないことにする
		this.#uiMapping.editingMode ="POLYGON";
		var pointsLength = props.position[0].length-1;
	} else {
		this.#uiMapping.editingMode ="POLYLINE";
		var pointsLength = props.position[0].length;
	}
	
	var points = [];
	for ( var i = 0 ; i < pointsLength ; i++ ){
		points.push({lat:props.position[0][i][0],lng:props.position[0][i][1]});
	}
	
	this.#updatePointListForm(pep, points);
	
	console.log("points:",points, "  docId:",svgTarget.docId,"  metaSchema:",this.#getMetaSchema(svgTarget.docId));
	this.#polyCanvas.setPoints(points);
	
	
	
//	uiMapping.insertPointsIndex = points.length;
	this.#polyCanvas.updateCanvas();
	if ( props.metaData && props.metaData.length && this.#getMetaSchema(svgTarget.docId)){ // メタデータがあってもスキーマがない場合は表示できないのでパスさせる 2018.2.1
		for ( var i = 0 ; i < props.metaData.length ; i++ ){
	//		console.log(props.metaData[i],me.rows[i].cells[1]);
			uiDoc.getElementById("meta"+i).value = props.metaData[i];
		}
	}
}

#updatePointListForm(pep, points){
	var taVal = "";
	
	for ( var i = 0 ; i < points.length ; i++ ){
		taVal += '<tr><td><input type="button" id="pointIns' + i + '" value="INS"/></td><td><input id="point' + i + '" style="width:200px" type="button" value="' + this.#svgMap.numberFormat(points[i].lat) + ', ' + this.#svgMap.numberFormat(points[i].lng) + '"/></td></tr>';
	}
	
	taVal +='<tr><td><input type="button" id="pointAdd" value="ADD"/></td></tr>';
	pep.innerHTML=taVal;
}

// POLYGONオブジェクトの"編集"ツール 新規追加、削除、変更などが可能　ただし一個しか設置できない
// var toolsCbFunc; // uiMapping.toolsCbFuncに収納変更
// var toolsCbFuncParam; // 同上
#initPolygonTools(targetDiv,poiDocId,cbFunc,cbFuncParam,isPolylineMode,options  ){
	
	console.log("initPolygonTools : isPolylineMode:",isPolylineMode,  "  uiMapping.toolsCbFunc:",this.#uiMapping.toolsCbFunc);
	
	this.#removeChildren( targetDiv );
	
	var uiDoc = targetDiv.ownerDocument;
	console.log("called initPolygonTools: docId:",poiDocId);
	var isRootLayer = this.#svgMap.setRootLayersProps(poiDocId, true , true ); // 子docの場合もあり得ると思う・・
		if ( ! isRootLayer ){ // 実質なにも今のところしていないがアラートはメッセージする(2017.1.20)
		console.log("This ID is not layer (child document of layer).. thus you can only add new elements ( not edit existing element) ");
	}
	var bufferOption = false;
	if ( options?.bufferOption==true){
		bufferOption = true;
	}
	
	this.#svgImages = this.#svgMap.getSvgImages();
	this.#svgImagesProps = this.#svgMap.getSvgImagesProps();
	var symbols = this.#svgMap.getSymbols(this.#svgImages[poiDocId]);
	var metaSchema = this.#getMetaSchema(poiDocId);
	var ihtml = '<div id="polyEditor" style="width:300px;height:100px;overflow:auto"><table id="polyEditorPosition"><tr><td><input type="button" id="pointAdd" value="ADD"/></td></tr></table></div>';
	
	
	console.log(" init metaEditor table... metaSchema:",metaSchema );
	
	ihtml += '<table id="metaEditor">';
	var latMetaCol,lngMetaCol,titleMetaCol; // 位置とtitleがメタデータにも用意されている（ダブっている）ときに、それらのカラム番号が設定される。
	if ( metaSchema ){
		for ( var i = 0 ; i < metaSchema.length ; i++ ){
			var mdval ="";
			if ( metaSchema[i] == "title"){
				titleMetaCol =i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="'+"title"+'"/></td></tr>';
			} else if ( metaSchema[i] == "latitude" || metaSchema[i] == "lat" || metaSchema[i] == "緯度"){
				latMetaCol = i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="' + "numberFormat(latlng.lat )" + '"/></td></tr>';
			} else if ( metaSchema[i] == "longitude"|| metaSchema[i] == "lon" || metaSchema[i] == "lng" || metaSchema[i] == "経度"){
				lngMetaCol = i;
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" disabled="disabled" value="' + "numberFormat(latlng.lng )" + '"/></td></tr>';
				
			} else {
				ihtml+='<tr><td>' + metaSchema[i] + '</td><td><input id="meta'+i+'" type="text" value="' + mdval + '"/></td></tr>';
			}
		}
	}
	ihtml +='</table>';
	if ( bufferOption ){
		ihtml +='<div><input type="text" id="objectBufferLength"  value=""  placeholder="バッファ半径[m]"></input></div>';
	}
	ihtml+='<div id="editConf"><input type="button" id="pepok" value="決定"/><input type="button" id="pepng" value="キャンセル"/><input type="button" id="pepdel" disabled value="削除"/><span id="editMode">newObject</span></div>';
	targetDiv.innerHTML = ihtml;
	
	var polyMode = "POLYGON";
	if ( isPolylineMode ){
		polyMode = "POLYLINE"; // TBD...
		this.#polyCanvas.setPolygonMode(false);
		console.log("polyMode:",polyMode);
	} else {
		this.#polyCanvas.setPolygonMode(true);
	}
	
	this.#initUiMapping( {
		uiPanel : targetDiv,
		editingLayerId : poiDocId,
		editingMode : polyMode,
		uiDoc: uiDoc,
		editingGraphicsElement: false,
		modifyTargetElement: null,
		selectedPointsIndex : -1,
		insertPointsIndex : -1,
		editingStyle:structuredClone(this.#defaultEditingStyle),
		shapeStyle:structuredClone(this.#defaultShapeStyle),
	},true);
	this.#setUiStyle(this.#uiMapping.editingStyle, options?.editingStyle);
	this.#setUiStyle(this.#uiMapping.shapeStyle, options?.shapeStyle);
	if ( cbFunc ){
		this.#uiMapping.toolsCbFunc = cbFunc;
		this.#uiMapping.toolsCbFuncParam = cbFuncParam;
	} else {
		this.#uiMapping.toolsCbFunc = null;
		this.#uiMapping.toolsCbFuncParam = null;
	}
	if ( bufferOption ){
		this.#uiMapping.bufferOption = true;
	}
//	polyCanvas.initCanvas();
	this.#setPolyUiEvents(uiDoc, poiDocId);
	this.#setMetaUiEvents(uiDoc, poiDocId);
	this.#setEditConfEvents(uiDoc, poiDocId);
	return ( this.#uiMapping );
}

#setUiStyle(targetStyle, setupObj){
	if (!setupObj){return}
	
	if (setupObj.opacity && isNaN(setupObj.opacity)==false ){
		var op  = Number(setupObj.opacity);
		if ( op >0 && op <=1 ){
			targetStyle.opacity = op;
		}
	}
	if (setupObj.strokeWidth && isNaN(setupObj.strokeWidth)==false){
		var sw  = Number(setupObj.strokeWidth);
		if ( sw >0 && sw <=100 ){
			targetStyle.strokeWidth = sw;
		}
	}
	if (setupObj.fill && typeof(setupObj.fill)=="string"){
		targetStyle.fill = setupObj.fill;
	}
	if (setupObj.stroke && typeof(setupObj.stroke)=="string"){
		targetStyle.stroke = setupObj.stroke;
	}
}

#initUiMapping(tmpl, maintainGenericMode){
	this.#initGlobalVars(tmpl);
	//uiMappingGとのつながりが切れるので、uiMappingは不用意にnewできない
	var genericMode = false;
	console.log("uiMapping:",this.#uiMapping);
	if (this.#uiMapping.genericMode ){
		genericMode = this.#uiMapping.genericMode;
	}
	for ( var uk in this.#uiMapping ){
		delete this.#uiMapping[uk];
	}
	for ( var uk in tmpl){
		this.#uiMapping[uk]=tmpl[uk];
	}
	if ( maintainGenericMode && genericMode){
		this.#uiMapping.genericMode = genericMode;
	}
	console.log(this.#uiMapping);
}

#initGlobalVars(tmpl) {
	// 2021/6/23 グローバル変数を、レイヤ固有UIの切り替えに応じて変更する
	//uiMappingG[uiMapping.editingLayerId] = uiMapping;
	// appearなどしたときにuiMappingを切り替えるためのフックを設置する
	var layerId = tmpl.editingLayerId;
	var mdoc = tmpl.uiDoc;
	console.log("Authoring: initGlobalVars :", this.#uiMappingG,"  layerId:",layerId," uiDoc:",mdoc );
	if ( !layerId || !mdoc ){
		console.error( "No editingLayerId or uiDoc ", layerId, mdoc);
		return false;
	}
	this.#initClearToolsEvents(mdoc);
	if ( this.#uiMappingG[layerId] ){
		this.#uiMapping = this.#uiMappingG[layerId];
	} else {
		this.#uiMapping = {};
		this.#uiMappingG[layerId]=this.#uiMapping;
		mdoc.addEventListener("appearFrame", function () {
			console.log("change uiMapping var : ", layerId, this.#uiMappingG);
			this.#uiMapping = this.#uiMappingG[layerId];
			this.#prevMouseXY = { x: 0, y: 0 };
		}.bind(this));
		mdoc.addEventListener("closeFrame", function () {
			console.log("delete uiMappingGloval var");
			delete this.#uiMappingG[layerId];
		}.bind(this));
	}

	// polyCanvas //初期化は？
	// poiCursor // 初期化は？
	// selectedObjectID // 初期化は？
	this.#prevMouseXY = { x: 0, y: 0 };
}

#initClearToolsEvents(uiDoc){
	uiDoc.removeEventListener("hideFrame", this.#clearTools, false);
	uiDoc.removeEventListener("closeFrame", this.#clearTools, false);
	uiDoc.removeEventListener("appearFrame", this.#setTools, false);
	uiDoc.addEventListener("hideFrame", this.#clearTools);
	uiDoc.addEventListener("closeFrame", this.#clearTools);
	uiDoc.addEventListener("appearFrame", this.#setTools);
}

#testTouch(e){
	console.log("testTouch:",e, e.changedTouches[0]);
	console.log( e.changedTouches[0].pageX, e.changedTouches[0].pageY );
}

#prevMouseXY={x:0,y:0};
#pointAddMode = false;

#editPolyPoint=function(e){
	var mxy = this.#svgMap.getMouseXY(e);
	console.log("editPolyPoint:",mxy);
	if ( this.#prevMouseXY.x == mxy.x && this.#prevMouseXY.y == mxy.y && this.#pointAddMode == false ){
//		document.removeEventListener("click", arguments.callee, false);
		this.#removePointEvents( this.#editPolyPoint );
	}
	this.#prevMouseXY = mxy;
	var geop = this.#svgMap.screen2Geo(mxy.x , mxy.y );
	
	var geoPoints = this.#polyCanvas.getPoints();
	console.log("uiMapping:",this.#uiMapping);
	if ( this.#uiMapping.insertPointsIndex >= 0 && this.#uiMapping.insertPointsIndex < geoPoints.length ){
		// ポイント挿入モード
		console.log( "insert point:",this.#uiMapping.insertPointsIndex);
		var newPoints = [];
		for ( var i = 0 ; i < geoPoints.length ; i++ ){
			if ( i == this.#uiMapping.insertPointsIndex ){
				newPoints.push(geop);
			}
			newPoints.push(geoPoints[i]);
		}
		console.log("insert points::::",newPoints);
		this.#polyCanvas.setPoints(newPoints);
		this.#uiMapping.insertPointsIndex = this.#uiMapping.insertPointsIndex+1;
	} else if ( this.#uiMapping.selectedPointsIndex >= 0 ){
		// ポイント変更モード
		console.log( "replace point:",this.#uiMapping.selectedPointsIndex);
		geoPoints[this.#uiMapping.selectedPointsIndex] = geop;
		this.#polyCanvas.setPoints(geoPoints);
//		document.removeEventListener("click", arguments.callee, false);
//		document.removeEventListener("click", editPolyPoint, false);
		removePointEvents( this.#editPolyPoint );
//		uiMapping.insertPointsIndex = geoPoints.length;
	} else {
		console.log( "add last point:",this.#uiMapping.insertPointsIndex);
		this.#polyCanvas.addPoint(geop);
		this.#uiMapping.insertPointsIndex = geoPoints.length;
	}
	
	geoPoints = this.#polyCanvas.getPoints();
	
	this.#uiMapping.selectedPointsIndex = -1;
//	uiMapping.insertPointsIndex = -1;
//	polyCanvas.hilightLine(uiMapping.insertPointsIndex);
	this.#polyCanvas.updateCanvas();
//*	uiMapping.pointsUiSelectionRange = null;
	
	console.log("updatePointListForm:",geoPoints);
	this.#updatePointListForm( this.#uiMapping.uiDoc.getElementById("polyEditorPosition") , geoPoints );
	
//	document.removeEventListener("click", arguments.callee, false);
	
}.bind(this)

#addPointEvents( func ){
	var mapc = this.#mapViewerProps.mapCanvas;
	mapc.addEventListener( "click", func, false );
	mapc.addEventListener( "touchend", func, false );
}
#removePointEvents( func ){
//	console.log("removePointEvents: ",func);
	var mapc = this.#mapViewerProps.mapCanvas;
	mapc.removeEventListener( "click", func, false );
	mapc.removeEventListener( "touchend", func, false );
}

#setPolyUiEvents( targetDoc){
	targetDoc.getElementById("polyEditor").addEventListener("click",function(e){
		console.log("PoiUiEvent: targetId:",e.target.id);
		if (  e.target.id.indexOf("point")==0 ){
			// pointsTableのカーソル位置変更イベント
			this.#pointAddMode = false;
			
			
			this.#hilightEditingPoint( e.target , targetDoc );
			
			if ( !this.#uiMapping.editingGraphicsElement){
				this.#uiMapping.editingGraphicsElement = true;
//				polyCanvas.initCanvas();
			}
			if ( this.#uiMapping.selectedPointsIndex >=0 || this.#uiMapping.insertPointsIndex >= 0 ){
				console.log ( "FOUCUS SELECTION");
			}
			this.#pointAddMode = true; // これはどうかな・・・
			setTimeout(function(){
				this.#addPointEvents( this.#editPolyPoint );
//				document.addEventListener( "click", editPolyPoint, false );
//				document.addEventListener( "touchend", testTouch, false );
			}.bind(this),30);
			
		} else {
			console.log("should be clear selection");
			this.#pointAddMode = false;
			this.#uiMapping.selectedPointsIndex = -1;
			this.#uiMapping.insertPointsIndex = -1;
			this.#polyCanvas.updateCanvas();
			targetDoc.getElementById("pepdel").disabled=false; // 全体を削除する意味でenable化
		}
	}.bind(this),false);
}

#hilightEditingPoint( targetElem , targetDoc ){
	// ボタンIDによって編集対象を洗い出す
	var insertBefore = false;
	var editPointN;
	targetDoc.getElementById("pepdel").disabled=true; // 削除ボタンをdisable
	if ( targetElem.id.indexOf("pointAdd")==0){
		insertBefore = true;
		console.log("hilightEditingPoint pointAdd:", this.#polyCanvas.getPoints().length);
		var pl =  this.#polyCanvas.getPoints().length; 
		if ( pl >= 0 ){
			editPointN = pl; 
		}
	} else if ( targetElem.id.indexOf("pointIns")==0){
		insertBefore = true;
		editPointN = Number(targetElem.id.substring(8));
	} else {
		targetDoc.getElementById("pepdel").disabled=false; // pointのみ削除可能化
		editPointN = Number(targetElem.id.substring(5));
	}
	
	var pointC = 0;
	var selectedIndex = -1;
	var insertIndex = -1;
	
	if ( insertBefore ){
		insertIndex = editPointN;
	} else{
		selectedIndex = editPointN;
	}
	
	console.log("insertIndex:",insertIndex,"  selectedIndex:",selectedIndex);
	
	this.#uiMapping.selectedPointsIndex = selectedIndex;
	this.#uiMapping.insertPointsIndex = insertIndex;
	
	this.#polyCanvas.updateCanvas();
	
}

#getSelectionRange( selectedIndex, insertIndex ,srcStr){
	// hilightEditingPointの逆
	var pointC = 0;
	var varStart = -1;
	if ( insertIndex == 0 ){
		return ( [0 , 0 ] );
	} else if ( selectedIndex == 0 ){
		varStart = 0;
	}
	for ( var i = 0 ; i < srcStr.length ; i++){
		if ( insertIndex > 0){
			if ( i>0 && srcStr.charAt(i-1) == "\n" && insertIndex == pointC ){
				return ( [ i-1 , i-1 ] );
			} else if ( i == srcStr.length -1 ){
				return ( [ i , i ] );
			}
		}
		if (srcStr.charAt(i) == "\n"){
			++ pointC;
		}
		if ( insertIndex < 0 && selectedIndex >=0){
			if ( pointC == selectedIndex ){
				if ( varStart < 0){
					varStart = i +1;
				}
			} else if ( pointC > selectedIndex ){
				return ( [ varStart , i ] );
			}
			
			if ( i == (srcStr.length -1) && varStart >=0){
				return ( [ varStart , i+1 ] );
			}
		}
	}
}


#removeChildren( targetElem ){
	for (var i =targetElem.childNodes.length-1; i>=0; i--) {
		targetElem.removeChild(targetElem.childNodes[i]);
	}

}

#isEditingGraphicsElement(){
	if ( !this.#uiMapping){return false}
	if ( this.#uiMapping.editingGraphicsElement ){
		return ( true );
	} else {
		return ( false );
	}
}

#getMetaSchema(docId){ // 同じ文が大量にあるので関数化 2018.2.1
	var metaSchema = null;
	if ( this.#svgImages[docId].documentElement.getAttribute("property") && this.#svgImages[docId].documentElement.getAttribute("property").length>0 ){
		metaSchema = this.#svgImages[docId].documentElement.getAttribute("property").split(",");
	}
	return ( metaSchema)
}

#clearTools_with_UI(){
	var uiPanel;
	if (this.#uiMapping.genericMode?.panel){
		this.#clearChangeGenericToolMode(uiMapping.uiDoc);
		uiPanel = this.#uiMapping.genericMode.panel;
		delete this.#uiMapping.genericMode.panel;
	} else {
		uiPanel = this.#uiMapping.uiPanel;
	}
	this.#clearTools_with_UI_int(uiPanel);
}
	

#clearTools_with_UI_int(uiPanel) {
	//console.log("clearTools_with_UI:",this.#uiMapping.uiPanel);
	this.#clearTools();
	if ( uiPanel && uiPanel.nodeType && uiPanel.nodeType===1 ){
		this.#removeChildren(this.#uiMapping.uiPanel);
	}
}
	
#genericToolModeDivName = "genericAuthoringToolModeDiv";
#genericToolMainDivName = "genericAuthoringToolMainDiv";
#pointToolRadio ="pointGenericToolRadioButton";
#polylineToolRadio ="polylineGenericToolRadioButton";
#polygonToolRadio ="polygonGenericToolRadioButton";

#bufferedPointToolRadio ="bufferedPointGenericToolRadioButton";
#bufferedPolylineToolRadio ="bufferedPolylineGenericToolRadioButton";
#bufferedPolygonToolRadio ="bufferedPolygonGenericToolRadioButton";

#initGenericTool(
	targetDiv,
	poiDocId,
	cbFunc,
	cbFuncParam,
	options
) {
	this.#removeChildren(targetDiv);
	var uiDoc = targetDiv.ownerDocument;
	
	this.#initUiMapping({
		genericMode:{
			panel:targetDiv ,
			editingStyle:structuredClone(this.#defaultEditingStyle) ,
			shapeStyle:structuredClone(this.#defaultShapeStyle)
		},
		editingLayerId:poiDocId,
		uiDoc:uiDoc,
		toolsCbFunc:cbFunc,
		toolsCbFuncParam:cbFuncParam,
	});
	this.#setUiStyle(this.#uiMapping.genericMode.editingStyle, options?.editingStyle);
	this.#setUiStyle(this.#uiMapping.genericMode.shapeStyle, options?.shapeStyle);

	/**
	console.log(
		"initGenericTool :",
		"  cbFunc:",this.#uiMapping.toolsCbFunc,
		" uiDoc:",this.#uiMapping.uiDoc
	);
	**/
	var modeSelDiv = uiDoc.createElement("div");
	modeSelDiv.id = this.#genericToolModeDivName;
	targetDiv.appendChild(modeSelDiv);
	var modeSelDivHTML = `	<input type="radio" value="poi" id="${this.#pointToolRadio}" name="amode" checked></input><label for="${this.#pointToolRadio}">POINT</label>
<input type="radio" value="polyline" id="${this.#polylineToolRadio}" name="amode" ></input><label for="${this.#polylineToolRadio}">POLYLINE</label>
<input type="radio" value="polygon" id="${this.#polygonToolRadio}" name="amode" ></input><label for="${this.#polygonToolRadio}">POLYGON</label>`;
	if ( options?.withBufferedTools){
		this.#uiMapping.genericMode.withBufferedTools = true;
		modeSelDivHTML += `	<input type="radio" value="b_poi" id="${this.#bufferedPointToolRadio}" name="amode" ></input><label for="${this.#bufferedPointToolRadio}">CIRCLE</label>
<input type="radio" value="b_polyline" id="${this.#bufferedPolylineToolRadio}" name="amode" ></input><label for="${this.#bufferedPolylineToolRadio}">Buffered POLYLINE</label>
<input type="radio" value="b_polygon" id="${this.#bufferedPolygonToolRadio}" name="amode" ></input><label for="${this.#bufferedPolygonToolRadio}">Buffered POLYGON</label>`;
	}
	
	modeSelDiv.insertAdjacentHTML("beforeend",modeSelDivHTML);

	uiDoc.getElementById(this.#pointToolRadio).addEventListener("change",this.#changeGenericToolMode);
	uiDoc.getElementById(this.#polylineToolRadio).addEventListener("change",this.#changeGenericToolMode);
	uiDoc.getElementById(this.#polygonToolRadio).addEventListener("change",this.#changeGenericToolMode);
	
	uiDoc.getElementById(this.#bufferedPointToolRadio).addEventListener("change",this.#changeGenericToolMode);
	uiDoc.getElementById(this.#bufferedPolylineToolRadio).addEventListener("change",this.#changeGenericToolMode);
	uiDoc.getElementById(this.#bufferedPolygonToolRadio).addEventListener("change",this.#changeGenericToolMode);
	
	var toolMainDiv = uiDoc.createElement("div");
	toolMainDiv.id = this.#genericToolMainDivName;
	targetDiv.appendChild(toolMainDiv);
	
	this.#changeGenericToolMode({target:{value:"poi"}});
	return ( this.#uiMapping );
}

#clearChangeGenericToolMode(uiDoc){
	uiDoc.getElementById(this.#pointToolRadio).removeEventListener("change",this.#changeGenericToolMode,false);
	uiDoc.getElementById(this.#polylineToolRadio).removeEventListener("change",this.#changeGenericToolMode,false);
	uiDoc.getElementById(this.#polygonToolRadio).removeEventListener("change",this.#changeGenericToolMode,false);
	
	uiDoc.getElementById(this.#bufferedPointToolRadio).removeEventListener("change",this.#changeGenericToolMode,false);
	uiDoc.getElementById(this.#bufferedPolylineToolRadio).removeEventListener("change",this.#changeGenericToolMode,false);
	uiDoc.getElementById(this.#bufferedPolygonToolRadio).removeEventListener("change",this.#changeGenericToolMode,false);
}

#changeGenericToolMode = function(event){
	var mode = event.target.value.toLowerCase();
	// modeSpan.innerText=mode;
	
	var editingLayerId = this.#uiMapping.editingLayerId;
	var uiDoc = this.#uiMapping.uiDoc
	var toolsCbFunc = this.#uiMapping.toolsCbFunc;
	var toolsCbFuncParam = this.#uiMapping.toolsCbFuncParam;
	//var genericModePanel = this.#uiMapping.genericModePanel;
	
	this.#clearTools_with_UI_int(this.#uiMapping.uiPanel); // genericモードの変更なのでgenericModePanelは消してはダメなので・・
	var options = {
		editingStyle:this.#uiMapping.genericMode.editingStyle,
		shapeStyle:this.#uiMapping.genericMode.shapeStyle
	}
	if ( mode.indexOf("b_")==0){
		options.bufferOption=true;
	}
	
	var toolMainDiv = uiDoc.getElementById(this.#genericToolMainDivName);
	switch (mode){
	case "poi":
		uiDoc.getElementById(this.#pointToolRadio).checked = true;
		this.#initPOItools(toolMainDiv,editingLayerId,toolsCbFunc,toolsCbFuncParam,false,false,options);
		break;
	case "polyline":
		uiDoc.getElementById(this.#polylineToolRadio).checked = true;
		this.#initPolygonTools(toolMainDiv,editingLayerId,toolsCbFunc,toolsCbFuncParam,true,options);
		break;
	case "polygon":
		uiDoc.getElementById(this.#polygonToolRadio).checked = true;
		this.#initPolygonTools(toolMainDiv,editingLayerId,toolsCbFunc,toolsCbFuncParam,false,options);
		break;
		
	// Buffered
	case "b_poi":
		uiDoc.getElementById(this.#bufferedPointToolRadio).checked = true;
		this.#initPOItools(toolMainDiv,editingLayerId,toolsCbFunc,toolsCbFuncParam,false,false,options);
		break;
	case "b_polyline":
		uiDoc.getElementById(this.#bufferedPolylineToolRadio).checked = true;
		this.#initPolygonTools(toolMainDiv,editingLayerId,toolsCbFunc,toolsCbFuncParam,true,options);
		break;
	case "b_polygon":
		uiDoc.getElementById(this.#bufferedPolygonToolRadio).checked = true;
		this.#initPolygonTools(toolMainDiv,editingLayerId,toolsCbFunc,toolsCbFuncParam,false,options);
		break;
		
	}
}.bind(this);

#switchGenericTool(svgTarget){
	console.log("switchGenericTool svgTarget:",svgTarget);
	var svgNode = svgTarget.element;
	var opt = this.#uiMapping.genericMode;
	//console.log("GenericToolOptions:",opt);
	var nodeName = svgNode.nodeName;
	var fill = svgNode.getAttribute("fill");
	var objectType;
	if ( nodeName == "use"){
		objectType = "POI";
	} else if ( nodeName == "polygon" ){
		objectType = "POLYGON";
	} else if ( nodeName == "polyline" ){
		objectType = "POLYLINE";
	} else if ( nodeName == "path" ){
		if ( fill == "none" ){
			objectType = "POLYLINE";
		} else {
			objectType = "POLYGON";
		}
	}
	
	var buffered;
	if ( opt?.withBufferedTools && svgNode.getAttribute("data-buffered")){
		buffered={};
		buffered.length = Number(svgNode.getAttribute("data-buffered"));
		buffered.baseGeometry = JSON.parse(svgNode.getAttribute("data-geometry"));
		//console.log(buffered.baseGeometry.type.toLowerCase(), this.#uiMapping.editingMode);
		switch(buffered.baseGeometry.type.toLowerCase()){
		case "point":
			objectType = "B_POI";
			break;
		case "linestring":
			objectType = "B_POLYLINE";
			break;
		case "polygon":
			objectType = "B_POLYGON";
			break;
		}
		
		 svgTarget.element = this.#unBufferObject(svgNode, buffered.baseGeometry );
		
	}
	
	var currentEditingMode_w_bufferMode = this.#uiMapping.editingMode;
	if ( this.#uiMapping.bufferOption ){ currentEditingMode_w_bufferMode = "B_"+currentEditingMode_w_bufferMode}
	
	//console.log("switchGenericTool  currentEditingMode:",currentEditingMode_w_bufferMode,"  objectType:",objectType);
	if ( objectType != currentEditingMode_w_bufferMode  ){ // 厳密にモードがあっているかどうか。
		if ( objectType.indexOf("B_")==-1 && currentEditingMode_w_bufferMode.indexOf(objectType)>=0 ){
			// ただし、BufferでないオブジェクトはBufferモードを選んでいればそのまま編集可能にしたいので、そのままにしてあげる
		} else {
			this.#changeGenericToolMode({target:{value:objectType}});
		}
	}
	if ( objectType =="POI" || objectType =="B_POI"){
		this.#hilightPOI(svgNode.getAttribute("iid"));
		this.#displayPOIprops(svgTarget);
	} else {
		this.#displayPolyProps(svgTarget);
	}
	if ( buffered  && this.#uiMapping.uiDoc.getElementById("objectBufferLength") ){
		this.#uiMapping.uiDoc.getElementById("objectBufferLength").setAttribute("value",buffered.length);
	}
}

#bufferObject(svgElem){
	if ( !this.#uiMapping.shapeStyle){
		this.#uiMapping.shapeStyle = this.#defaultShapeStyle;
	}
	var geomTxt = svgElem.getAttribute("data-geometry");
	if (!geomTxt){ return}
	var geom = JSON.parse(geomTxt);
	//console.log("bufferObject geom:",geom);
	var bufInput = this.#uiMapping.uiDoc.getElementById("objectBufferLength");
	if ( isNaN(bufInput.value) || Number( bufInput.value) <=0 ){
		return;
	}
	var blen = Number( bufInput.value) ;
	if ( blen <=0 ){return}
	var bgeom = this.#svgMapGIStool.getBufferedPolygon(geom, blen);
	//console.log("Buffered Geometry : ", bgeom, svgElem.parentElement);
	var svgDoc = svgElem.ownerDocument;
	var bpath =svgDoc.createElement("path");
	bpath.setAttribute("data-geometry",geomTxt);
	bpath.setAttribute("data-buffered",blen);
	bpath.setAttribute("d",this.#getPolygonPathD(bgeom));
	bpath.setAttribute("fill", this.#uiMapping.shapeStyle.fill);
	bpath.setAttribute("stroke", this.#uiMapping.shapeStyle.stroke);
	bpath.setAttribute("stroke-width", this.#uiMapping.shapeStyle.strokeWidth);
	bpath.setAttribute("vector-effect", "non-scaling-stroke");
	(svgElem.parentElement).insertBefore(bpath, svgElem);
	svgElem.remove();
}

#unBufferObject(svgElem, geom){
	// data-bufferedと、data-geometryがあるものについて、オリジナルの形状を復元
	// 再編集で使用する
	if ( !this.#uiMapping.shapeStyle){
		this.#uiMapping.shapeStyle = this.#defaultShapeStyle;
	}
	var unbufElm = svgElem;
	var svgDoc = svgElem.ownerDocument;
	
	var path, use;
	var layerCRS = this.#svgImagesProps[this.#uiMapping.editingLayerId].CRS;
	var svgCrds =  this.#svgMap.Geo2SVG(geom.coordinates[1], geom.coordinates[0], layerCRS);
	switch (geom.type.toLowerCase()){
	case "point":
		use =svgDoc.createElement("use");
		use.setAttribute("transform",`ref(svg,${svgCrds.x},${svgCrds.y})`);
		use.setAttribute("xlink:href",geom.icon);
		break;
	case "linestring":
		path =svgDoc.createElement("path");
		path.setAttribute("d",this.#getPathD(geom.coordinates,layerCRS));
		path.setAttribute("fill", "none");
		break;
	case "polygon":
		path =svgDoc.createElement("path");
		path.setAttribute("d",this.#getPolygonPathD(geom));
		path.setAttribute("fill", this.#uiMapping.shapeStyle.fill);
		break;
	}
	
	if ( path ){
		path.setAttribute("stroke", this.#uiMapping.shapeStyle.stroke);
		path.setAttribute("stroke-width", this.#uiMapping.shapeStyle.strokeWidth);
		path.setAttribute("vector-effect", "non-scaling-stroke");
		unbufElm = path;
	} else {
		unbufElm = use;
	}
	
	(svgElem.parentElement).insertBefore(unbufElm, svgElem);
	svgElem.remove();
	
	return ( unbufElm );
}

#getPolygonPathD(polygonGeom){
	// この関数、　svgMapGISのputPolygonと完全にかぶってる。整理必要・・・TBD?
	var layerCRS = this.#svgImagesProps[this.#uiMapping.editingLayerId].CRS;
	var pathD = "";
	for (var i = 0; i < polygonGeom.coordinates.length; i++) {
		pathD += this.#getPathD(polygonGeom.coordinates[i], layerCRS) + "z ";
	}
	return pathD;
}

#getPathD(geoCoords, crs) {
	if (geoCoords.length == 0) {
		return " ";
	}
	//console.log(geoCoords,crs);
	var ans = "M";
	var svgc = this.#svgMap.Geo2SVG(geoCoords[0][1],geoCoords[0][0], crs);
	if (svgc) {
		ans += svgc.x + "," + svgc.y + " L";
		for (var i = 1; i < geoCoords.length; i++) {
			svgc = this.#svgMap.Geo2SVG(geoCoords[i][1],geoCoords[i][0], crs);
			if (svgc) {
				ans += svgc.x + "," + svgc.y + " ";
			}
		}
	} else {
		ans = " ";
	}
	return ans;
}

	
cancelPointingPoiRegister(...params){ return (this.#cancelPointingPoiRegister(...params))};
editPoint(...params){ return (this.#editPoint(...params))};
initGenericTool(...params){ return (this.#initGenericTool(...params))};
initPOItools(...params){ return (this.#initPOItools(...params))};
initPOIregistTool(...params){ return (this.#initPOIregistTool(...params))};
initPolygonTools(...params){ return (this.#initPolygonTools(...params))};
setTargetObject(...params){ return (this.#setTargetObject(...params))};
isEditingGraphicsElement(...params){ return (this.#isEditingGraphicsElement(...params))};
clearTools(...params){ return (this.#clearTools_with_UI(...params))};

}

export { SvgMapAuthoringTool };