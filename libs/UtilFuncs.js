// なんかいろいろ使われている単純なstaticな関数を集めたもの・・
// 全部staticとする

import { SvgMapElementType } from './SvgMapElementType.js';

class UtilFuncs {
	static trim(s) {
		return s.replace(/^\s+|\s+$/g, "");
	}

	static compressSpaces(s) {
		return s.replace(/[\s\r\t\n]+/gm, " ");
	}

	static numberFormat(number, digits) {
		if (!digits) {
			digits = 7;
		}
		var base = Math.pow(10, digits);
		return Math.round(number * base) / base;
	}

	static MouseWheelListenerFunc(e) {
		//ホイールスクロールで地図の伸縮を抑制する
		//	e.preventDefault();
		e.stopPropagation();
	}

	/**
	 * 
	 * @param {Element} svgNode 
	 * @returns 
	 */
	static getHyperLink(svgNode) {
		var oneNode = svgNode;
		while (oneNode.parentNode) {
			oneNode = oneNode.parentNode;
			if (oneNode.nodeName == "a" && oneNode.getAttribute("xlink:href")) {
				return {
					href: oneNode.getAttribute("xlink:href"),
					target: oneNode.getAttribute("target"),
				};
			}
		}
		return null;
	}

	static addCommonQueryAtQueryString( originalUrl, commonQuery ){
		//	 認証キーなどに用いるレイヤー(もしくはフレームワーク全体)共通クエリストリング設置
		var rPath = originalUrl;
		if (rPath.lastIndexOf("?")>0){
			rPath += "&";
		} else {
			rPath += "?";
		}
		rPath +=  commonQuery; // 2022/09/26 queryKey+"="も含めてcommonQueryで設定することにする
		return ( rPath );
	}

	static getElementByIdUsingQuerySelector(qid) {
		return this.querySelector('[id="' + qid + '"]'); // このthisは、呼び出すオブジェクトによってそれに割り付けられる形で良い（のでbind不要）
	}

	// 同じ関数がSVGMapLv0.1_LayerUI2_r2.jsにもある・・(getHash)
	/**
	 * 
	 * 
	 * @param {String} url 
	 * @returns 
	 */
	static getUrlHash(url) {
		if (url.indexOf("#") >= 0) {
			var lhash = url.substring(url.indexOf("#") + 1);
			if (lhash.indexOf("?") > 0) {
				lhash = lhash.substring(0, lhash.indexOf("?"));
			}
			lhash = lhash.split("&");
			for (var i = 0; i < lhash.length; i++) {
				if (lhash[i].indexOf("=") > 0) {
					lhash[i] = lhash[i].split("="); //"
				} else if (lhash[i].indexOf("(") > 0) {
					// )
					var lhName = lhash[i].substring(0, lhash[i].indexOf("(")); // )
					var lhVal = lhash[i].substring(
						lhash[i].indexOf("(") + 1,
						lhash[i].length - 1
					); // )
					lhash[i] = [lhName, lhVal];
				}
				lhash[lhash[i][0]] = lhash[i][1];
			}
			return lhash;
		} else {
			return null;
		}
	}

	static getFragmentView(URLfragment) {
		// 少しチェックがいい加減だけど、svgView viewBox()のパーサ 2013/8/29
		// MyDrawing.svg#svgView(viewBox(0,200,1000,1000))
		// MyDrawing.svg#svgView(viewBox(global,0,200,1000,1000)) -- グローバル系
		if (
			URLfragment.indexOf("svgView") >= 0 &&
			URLfragment.indexOf("viewBox") >= 0
		) {
			var vals = URLfragment.substring(URLfragment.indexOf("viewBox"));
			vals = vals.substring(vals.indexOf("(") + 1, vals.indexOf(")"));
			vals = vals.split(",");
			try {
				if (vals.length == 5) {
					return {
						global: true,
						x: Number(vals[1]),
						y: Number(vals[2]),
						width: Number(vals[3]),
						height: Number(vals[4]),
					};
				} else if (vals.length == 4) {
					return {
						global: false,
						x: Number(vals[0]),
						y: Number(vals[1]),
						width: Number(vals[2]),
						height: Number(vals[3]),
					};
				} else {
					return null;
				}
			} catch (e) {
				return null;
			}
		} else {
			return null;
		}
	}

	static getImageURL(href, docDir) {
		var imageURL;
		if (
			href.lastIndexOf("http://", 0) == 0 ||
			href.lastIndexOf("https://", 0) == 0 ||
			href.lastIndexOf("data:", 0) == 0 ||
			href.lastIndexOf("blob:", 0) == 0
		) {
			// 2016.5.10 debug  2019.10.10 add dataURL
			imageURL = href;
		} else if (href.indexOf("/") == 0) {
			imageURL = href;
			//		imageURL = location.protocol + "//" + document.domain + href; // doain書いてあるとCORS規制掛けるブラウザあった気もするので、それを確認してからですかね・・・
		} else {
			imageURL = docDir + href;
		}
		return imageURL;
	}

	static getSvgLocation(hrefS) {
		// svgImagesのhrefからlocation相当変数を得る　作らなくても在る気もするのだが・・（newUR(..)Lオブジェクトでちゃんとしたのが作れるよ）　hrefSは、document.locationからのパスでないとダメ
		var hash = "",
			search = "",
			path = "";
		var hashPos = hrefS.length;
		var searchPos = hashPos;
		if (hrefS.lastIndexOf("#") > 0) {
			hashPos = hrefS.lastIndexOf("#");
			hash = hrefS.substring(hrefS.lastIndexOf("#"));
		}

		if (hrefS.indexOf("?") > 0) {
			searchPos = hrefS.indexOf("?");
			search = hrefS.substring(searchPos, hashPos);
		}

		path = hrefS.substring(0, searchPos);

		return {
			protocol: location.protocol,
			host: location.host,
			hostname: location.hostname,
			port: location.port,
			pathname: path,
			search: search,
			hash: hash,
		};
	}

	static getSvgReq(href) {
		// ハッシュなどの扱いをきちんとした 2014.6.27 (loadSVGでしか使っていないので、そっちに移動するかも)
		var sl = UtilFuncs.getSvgLocation(href);
		return sl.pathname + sl.search;
	}

	// static numberFormat(number, digits) {
	// 	if (!digits) {
	// 		digits = 7;
	// 	}
	// 	var base = Math.pow(10, digits);
	// 	return Math.round(number * base) / base;
	// }

	static escape(str) {
		str = str.replace(/&/g, "&amp;");
		str = str.replace(/"/g, "&quot;");
		str = str.replace(/'/g, "&#039;");
		str = str.replace(/</g, "&lt;");
		str = str.replace(/>/g, "&gt;");
		return str;
	}

	// 小数点以下の丸め関数です
	static round(num, n) {
		var tmp = Math.pow(10, n);
		return Math.round(num * tmp) / tmp;
	}
	
	static getNoCacheRequest( originalUrl ){
	//	強制的にキャッシュを除去するため、unixTimeをQueryに設置する
	//	console.log("NO CACHE GET REQUEST");
		var rPath = originalUrl;
		if (rPath.lastIndexOf("?")>0){
			rPath += "&";
		} else {
			rPath += "?";
		}
		rPath += "unixTime=" + (new Date()).getTime();
		return ( rPath );
	}
	
	static getDocDir( docPath ){  // 2016.10.14 関数化
		// 2016.8.10 ここに konnoさんによる、http://時の特殊処理( http://の場合docDir=""にする 2014.2.25 )が入っていたのを削除 (たぶん proxy処理に対するエラーだったと思うが・・・　テスト不十分)
		var pathWoQF = docPath.replace(/#.*/g,"");
		pathWoQF = pathWoQF.replace(/\?.*/,"");
		var docDir = pathWoQF.substring(0,pathWoQF.lastIndexOf("/")+1);
	//	docDir = docPath.substring(0,docPath.lastIndexOf("/")+1);
		return ( docDir );
	}
			
	// 指定した要素がzoomrange内にあるかどうかを返事する
	static inZoomRange( ip , zoom , c2rScale ){
		if ( !ip || (!ip.minZoom && !ip.maxZoom) ){
			// プロパティない場合はtrue
			return ( true );
		} else {
			if ( ip.minZoom && zoom * c2rScale < ip.minZoom ){
				return(false);
			}
			if ( ip.maxZoom && zoom * c2rScale > ip.maxZoom ){
				return(false);
			}
		}
		return ( true );
	}
	
	static isVisible(ip){
		if ( ip.visible ){
			return ( true );
		} else {
			return ( false );
		}
	}
	
	static isIntersect( rect1 , rect2 ){
		var sec1, sec2;
		if ( rect1.nonScaling ){ // nonScaling設定の時はサイズ０として判断するようにする 2018.3.2
			sec1 = { x:rect1.x,y:rect1.y,width:0,height:0 }
		} else {
			sec1 = rect1;
		}
		if ( rect2.nonScaling ){
			sec2 = { x:rect2.x,y:rect2.y,width:0,height:0 }
		} else {
			sec2 = rect2;
		}
		
		var ans = false;
		if ( sec1.x > sec2.x + sec2.width || sec2.x > sec1.x + sec1.width 
		 || sec1.y > sec2.y + sec2.height || sec2.y > sec1.y + sec1.height ){
			return ( false );
		} else {
			return ( true );
		}
	}

	static getBBox( x , y , width , height ){
		return {
			x: x,
			y: y,
			width: width,
			height: height
		}
	}

			
			
	//
	// 以下は、DOM系Utils
	// 
	static getElementsByDualTagName( doc , tagn1 , tagn2 ){
		var layers;
		layers = Array.prototype.slice.call(doc.getElementsByTagName(tagn1));
		layers = layers.concat(Array.prototype.slice.call(doc.getElementsByTagName(tagn2)));
		return ( layers );
	}

	 // 2013.7.30 getElementByIdはSVGNSで無いと引っかからない@Firefox 動的レイヤーでも要注意 createElement"NS"で作ることが重要(IE11でも同じことがおきるので、すべての呼び出しをこれに変更することにした 2014.6.20)
	static getElementByIdNoNS( XMLNode , searchId ){
		return ( this.getElementByAttr( XMLNode , searchId , "id" ) );
	}

	static getElementByImgIdNoNS( XMLNode , searchId ){
		return ( this.getElementByAttr( XMLNode , searchId , "iid" ) );
	}

	static getElementByAttr( XMLNode , searchId , atName ){ // 2020/09/28 元のをgetElementByAttr_obsolutedにした ISSUE対応
		if ( !XMLNode || ! XMLNode.hasChildNodes() ){
			return ( null );
		}
		var ans = XMLNode.querySelector('['+atName+'="'+searchId+'"]');
		return ( ans );
	}
	

	static getControllerSrc( resTxt , svgImageProps ){ // 2017.2.21
		// data-controller-srcがある場合、そのソースをを取得して、svgImageProps.controllerに投入するとともに
		// resTxtからdata-controller-srcを除去する
		// 注意:やらないとは思うが、したがって、data-controller-srcをDOMで操作しても何も起きない・・
		var controllerSrc = (resTxt.match(/data-controller-src[\s\S]*?"([\s\S]*?)"/ ))[1];
		controllerSrc = controllerSrc.replace(/&amp;/g,'&');
		controllerSrc = controllerSrc.replace(/&quot;/g,'"');
		svgImageProps.controller = {"src":controllerSrc};
	//	console.log("controllerSrc:",controllerSrc);
                                                          		return (resTxt.replace(/data-controller-src[\s\S]*?"[\s\S]*?"/, "" ) );
	}

	static getSvgScript(resTxt, svgImageProps){ 
		// 2022/3/4  controller-srcと同じ仕組みでsvg scriptを切り出す(eval除去工程)
		// とりあえずdata-controllerやcontrollerと排他的な実装を試してみる～svgMapLayerUIへの波及を考え
		var resScript = (resTxt.match(/<script>([\s\S]*)<\/script>/ ))[1];
		resScript = resScript.replace(/&lt;/g,'<');
		resScript = resScript.replace(/&gt;/g,'>');
		resScript = resScript.replace(/&amp;/g,'&');
		resScript = resScript.replace(/&quot;/g,'"');
		
		svgImageProps.svgScript = resScript;
		return (resTxt.replace(/<script>[\s\S]*<\/script>/ , "" ) );
	}
			
	static getSymbolProps( imageNode ){
		var id = imageNode.getAttribute("id");
		var path = imageNode.getAttribute("xlink:href");
		var offsetX = Number(imageNode.getAttribute("x"));
		var offsetY = Number(imageNode.getAttribute("y"));
		var width = Number(imageNode.getAttribute("width"));
		var height = Number(imageNode.getAttribute("height"));
		return {
			type: "symbol",
			id : id ,
			path : path ,
			offsetX : offsetX ,
			offsetY : offsetY ,
			width : width ,
			height : height
		}
	}

	static getGraphicsGroupSymbol( groupNode ){
		return {
			type: "group",
			id: groupNode.getAttribute("id"),
			node : groupNode
		}
		
	}

	static getPathSymbolMakerProps( pathNode ){
		var d = pathNode.getAttribute("d");
		var id = pathNode.getAttribute("id");
		return {
			type: "marker",
			id : id ,
			d : d
		}
	}

	static getrootViewBoxFromRootSVG( viewBox , mapCanvasSize_ , ignoreMapAspect){
		var rVPx , rVPy , rVPwidth , rVPheight;
		
		if ( ignoreMapAspect ){
			return ( viewBox );
		}
		
		if(viewBox){
			if ( mapCanvasSize_.height / mapCanvasSize_.width > viewBox.height / viewBox.width ){
				//キャンバスよりもviewBoxが横長の場合・・横をviewPortに充てる
				rVPwidth = viewBox.width;
				rVPheight = viewBox.width * mapCanvasSize_.height / mapCanvasSize_.width;
				rVPx = viewBox.x;
				rVPy = viewBox.y + viewBox.height / 2.0 - rVPheight / 2.0;
			} else {
				rVPheight = viewBox.height;
				rVPwidth = viewBox.height * mapCanvasSize_.width / mapCanvasSize_.height;
				rVPy = viewBox.y;
				rVPx = viewBox.x + viewBox.width / 2.0 - rVPwidth / 2.0;
			}
			
		} else {
			rVPx = 0;
			rVPy = 0;
			rVPwidth = mapCanvasSize_.width;
			rVPheight = mapCanvasSize_.height;
		}
		
		return {
			x : rVPx ,
			y : rVPy ,
			width : rVPwidth ,
			height : rVPheight
		}
	}

	// 定期的更新プロパティの取得
	static getRefresh( svgDoc ){
		var ans = new Array();
		ans.timeout = -1;
		ans.url ="";
		ans.start = false;
		ans.loadScript = false;
		var metas =  svgDoc.getElementsByTagName("meta");
		for ( var i = 0 ; i < metas.length ; i++ ){
			if ( metas[i].getAttribute("http-equiv") && metas[i].getAttribute("http-equiv") == "refresh" && metas[i].getAttribute("content") ){
				var refr = (metas[i].getAttribute("content")).split(";"); // at this time, ignore URL...
				ans.timeout = Number(refr[0]);
				ans.loadScript = true;
				if ( refr[1] ){
					ans.url = refs[1];
				}
				break;
			}
		}
		return ( ans );
	}

	static getMetaSchema( svgDoc ){
		return ( svgDoc.documentElement.getAttribute("property"));
	}

	static parseTransformMatrix(transformAttr){
		var matrix=null;
		if ( transformAttr ){
			var tmat = transformAttr.replace("matrix(","").replace(")","").split(",");
			if ( tmat.length == 6){
				matrix ={
					a : Number(tmat[0]) ,
					b : Number(tmat[1]) ,
					c : Number(tmat[2]) ,
					d : Number(tmat[3]) ,
					e : Number(tmat[4]) ,
					f : Number(tmat[5]) ,
				}
			}
		}
		return ( matrix );
	}
	
	/**
	 * これは何のぷしょんだろう。。。
	 * 
	 * @param {Element} svgPoiNode 
	 * @returns {Array}
	 */
	static getNonScalingOffset( svgPoiNode ){ // getPoiPosから改称 2018.3.2
		// vectorEffect,transform(ref ノンスケールのための基点座標取得
		try {
			var pos = svgPoiNode.getAttribute("transform").replace("ref(svg,","").replace(")","").split(",");
			var x = Number ( pos[0] );
			var y = Number ( pos[1] );
			if ( !isNaN(x) && !isNaN(y) ){
				return {
					x : Number ( pos[0] ),
					y : Number ( pos[1] ),
					nonScaling : true
				}
			} else {
				return{
					x : null,
					y : null,
					nonScaling : false
				}
			}
		} catch (e){
			return{
				x : null,
				y : null,
				nonScaling : false
			}
		}
	}

	static getDocumentId( svgelement ){
		return ( svgelement.ownerDocument.documentElement.getAttribute("about") );
	}
			
	// POI,タイル(use,image要素)のプロパティを得る DIRECTPOI,USEDPOIの処理に変更2018.3.2
	/**
	 * @param {Element} imgE
	 * @param {Number} category  - SvgMapElementTypeNo
	 * @param {*} parentProps
	 * @param {Number} subCategory - SvgMapElementTypeNo
	 * @param {*} GISgeometry
	 * 
	 */
	static getImageProps = function(imgE , category , parentProps , subCategory , GISgeometry){
		var x, y, width, height, meta, title, elemClass, href, transform, text , cdx , cdy , href_fragment, commonQuery;
		var nonScaling = false;
		cdx = 0;
		cdy = 0;
		var pixelated = false;
		var imageFilter = null;
		var crossorigin = null;
		if ( !subCategory && category == SvgMapElementType.POI){ // subCategory無しで呼び出しているものに対するバックワードコンパチビリティ・・・ 2018.3.2
			subCategory = SvgMapElementType.USEDPOI;
		}
		if ( category == SvgMapElementType.EMBEDSVG || category == SvgMapElementType.BITIMAGE || subCategory == SvgMapElementType.DIRECTPOI ){
			if ( category == SvgMapElementType.EMBEDSVG && subCategory == SvgMapElementType.SVG2EMBED ){ // svg2のsvgインポート
				href = imgE.getAttribute("src");
				
				var idx = href.indexOf("globe",href.lastIndexOf("#"));
				var postpone = imgE.getAttribute("postpone");
				if ( !postpone ){
					// #gpostpone="true"があることを想定しているので、本来ERRORです
				}
				if ( idx > 0 ){
	//				href = href.substring(0,idx ); // 2014.6.27 この処理は getSvgLocation()等に移管
				} else {
					// #globeがあることを想定しているので、本来ERRORです
				}
				var clip = imgE.getAttribute("clip").replace(/rect\(|\)/g,"").replace(/\s*,\s*|\s+/,",").split(",");
				if ( clip && clip.length == 4 ){
					x= Number(clip[0]);
					y= Number(clip[1]);
					width = Number(clip[2]);
					height= Number(clip[3]);
				} else {
					x = -30000;
					y = -30000;
					width = 60000;
					height= 60000;
				}
			} else { // svg1のsvgインポート及び svg1,svg2のビットイメージ(含DIRECTPOI)インポート
				var tf = UtilFuncs.getNonScalingOffset(imgE);
				if ( tf.nonScaling ){
					nonScaling = true;
					x = tf.x;
					y = tf.y;
					if ( imgE.getAttribute("x") ){
						cdx = Number(imgE.getAttribute("x"));
					}
					if ( imgE.getAttribute("y") ){
						cdy = Number(imgE.getAttribute("y"));
					}
				} else {
					x = Number(imgE.getAttribute("x"));
					y = Number(imgE.getAttribute("y"));
					transform = UtilFuncs.parseTransformMatrix( imgE.getAttribute("transform") );
				}
				width = Number(imgE.getAttribute("width")); // nonScalingではwidth,heightの値はisIntersectでは0とみなして計算するようにします
				height = Number(imgE.getAttribute("height"));
				href = imgE.getAttribute("xlink:href");
				if ( ! href ){
					href = imgE.getAttribute("href");
				}
				if ( ! href ){
					href = "";
				}
				if ( href.indexOf("#")>0 && href.indexOf("xywh=", href.indexOf("#") )>0){ // 2015.7.3 spatial fragment
					href_fragment = (href.substring( 5+href.indexOf("xywh=" ,  href.indexOf("#") ) ));
					href = href.substring(0,href.indexOf("#")); // ブラウザが#以下があるとキャッシュ無視するのを抑止
				}
				
				crossorigin=imgE.getAttribute("crossorigin");
				if ( crossorigin==""){crossorigin="anonymous"}
				
				if ( GISgeometry){
					if ( category == SvgMapElementType.BITIMAGE && !nonScaling ){ // 2018.2.26
						GISgeometry.setCoverage(x,y,width,height,transform,href);
					} else if ( subCategory == SvgMapElementType.DIRECTPOI ){ // 2018.3.2 上の話を改修した部分
						GISgeometry.setPoint(x,y);
					}
				}
				
				if ( subCategory == SvgMapElementType.DIRECTPOI){ // 2018.3.2
					meta = imgE.getAttribute("content");
					title = imgE.getAttribute("xlink:title");
				}
				
			}
			elemClass = imgE.getAttribute("class");
			
			if ( category == SvgMapElementType.BITIMAGE  && ( (imgE.getAttribute("style") && imgE.getAttribute("style").indexOf("image-rendering:pixelated")>=0) || (parentProps && parentProps["image-rendering"]  && parentProps["image-rendering"]  == "pixelated") ) ){
				pixelated = true;
			}
			
			if ( category == SvgMapElementType.BITIMAGE ){
				if ( imgE.getAttribute("style") && imgE.getAttribute("style").indexOf("filter")>=0  ){ // bitimageのfilterは継承させてない
					var fls = imgE.getAttribute("style")+";";
					fls = fls.substring(fls.indexOf("filter:"));
					fls = fls.substring(7,fls.indexOf(";"));
					imageFilter = fls;
				/** これと styleCatalog[]を編集すれば多分継承するけれど　やめておく
				} else if ( parentProps && parentProps["filter"] ){
					imageFilter = parentProps["filter"];
				**/
				}
			}
			
		} else if ( subCategory ==SvgMapElementType.USEDPOI ){ // USEDによるPOI
			var tf = UtilFuncs.getNonScalingOffset(imgE);
			if ( tf.nonScaling ){ // non scaling POI
				nonScaling = true;
				x = tf.x;
				y = tf.y;
				if ( imgE.getAttribute("x") ){ 
					cdx = Number(imgE.getAttribute("x"));
				}
				if ( imgE.getAttribute("y") ){
					cdy = Number(imgE.getAttribute("y"));
				}
			} else { // scaling POI (added 2015.7.3)
				nonScaling = false;
				x = Number(imgE.getAttribute("x"));
				y = Number(imgE.getAttribute("y"));
			}
			width = 0; // ??? そうなの？ 2014.7.25  nonScalingのときのみの気がする・・
			height = 0;
			meta = imgE.getAttribute("content");
			title = imgE.getAttribute("xlink:title");
			href = imgE.getAttribute("xlink:href");
			if ( GISgeometry ){ // 2016.12.1 scaling でもnon scalingでもここで出たx,yがそのsvg座標におけるPOIの中心位置のはず
				GISgeometry.setPoint(x,y);
			}
		} else if ( category == SvgMapElementType.TEXT ){
			var tf = UtilFuncs.getNonScalingOffset(imgE);
			if ( tf.nonScaling ){
				nonScaling = true;
				x = tf.x;
				y = tf.y;
				if ( imgE.getAttribute("x") ){
					cdx = Number(imgE.getAttribute("x"));
				}
				if ( imgE.getAttribute("y") ){
					cdy = Number(imgE.getAttribute("y"));
				}
			} else {
				nonScaling = false;
				x = Number(imgE.getAttribute("x"));
				y = Number(imgE.getAttribute("y"));
			}
			height = 16; // きめうちです　最近のブラウザは全部これ？ 
			if (imgE.getAttribute("font-size")){
				height = Number(imgE.getAttribute("font-size"));
			}
			if (nonScaling){
				height = 0; // 2018.2.23 上の決め打ちはnon-scalingの場合まずい・・・ 拡大すると常にビューポートに入ってしまうと誤解する。これならたぶん0にした方がベター
			}
			width = height; // 適当・・ 実際は文字列の長さに応じた幅になるはずだが・・・ ISSUE
			text = imgE.textContent;
		}
		
		//このコードはif/elseの中身一緒に見える
		var minZoom , maxZoom;
		if ( subCategory == SvgMapElementType.SVG2EMBED ){
			// この部分は、今後CSS media query  zoom featureに置き換えるつもりです！
			if ( imgE.getAttribute("visibleMinZoom") ){
				minZoom = Number(imgE.getAttribute("visibleMinZoom"))/100;
			} else if (parentProps && parentProps.minZoom){
				minZoom = parentProps.minZoom;
			}
			if ( imgE.getAttribute("visibleMaxZoom") ){
				maxZoom = Number(imgE.getAttribute("visibleMaxZoom"))/100;
			} else if (parentProps && parentProps.maxZoom){
				maxZoom = parentProps.maxZoom;
			}
		} else {
			if ( imgE.getAttribute("visibleMinZoom") ){
				minZoom = Number(imgE.getAttribute("visibleMinZoom"))/100;
			} else if (parentProps && parentProps.minZoom){
				minZoom = parentProps.minZoom;
			}
			if ( imgE.getAttribute("visibleMaxZoom") ){
				maxZoom = Number(imgE.getAttribute("visibleMaxZoom"))/100;
			} else if (parentProps && parentProps.maxZoom){
				maxZoom = parentProps.maxZoom;
			}
		}
		
		var visible = true;
		if ( imgE.getAttribute("visibility") == "hidden" || imgE.getAttribute("display") == "none" ){
			visible = false;
		}
		var opacity = Number(imgE.getAttribute("opacity"));
		if ( opacity > 1 || opacity < 0){
			opacity = 1;
		}
		
		//  認証キーなどに用いるレイヤー(もしくはフレームワーク全体)共通クエリストリング
		commonQuery = imgE.getAttribute("commonQuery");
		
		return {
			x : x ,
			y : y ,
			width : width ,
			height : height ,
			href : href ,
			opacity : opacity ,
			minZoom : minZoom ,
			maxZoom : maxZoom ,
			metadata : meta ,
			title : title ,
			visible : visible ,
			elemClass : elemClass ,
			transform : transform ,
			text : text ,
			cdx : cdx ,
			cdy : cdy ,
			nonScaling : nonScaling , 
			href_fragment : href_fragment,
			pixelated : pixelated,
			imageFilter : imageFilter,
			crossorigin: crossorigin,
			commonQuery: commonQuery,
		}
	}.bind(this);
	
	/**
	 * 
	 * @param {Object} svgDoc - SVG Object
	 * @returns {Object}
	 */
	static getSymbols(svgDoc){ // 2013.7.30 -- POI編集のsymbol選択を可能にするとともに、defsは、useより前に無いといけないという制約を払った
		var symbols = new Array();
		var defsNodes = svgDoc.getElementsByTagName("defs");
		for ( var i = 0 ; i < defsNodes.length ; i++ ){
			var svgNode = defsNodes[i];
			if ( svgNode.hasChildNodes ){
				var symbolNodes = svgNode.childNodes;
				for ( var k = 0 ; k < symbolNodes.length ; k++ ){
					if (  symbolNodes[k].nodeName == "image"){ // imageが直接入っているタイプ
						var symb = UtilFuncs.getSymbolProps( symbolNodes[k] );
						symbols["#"+symb.id] = symb;
					} else if ( symbolNodes[k].nodeName == "g"){ // 2012/11/27 <g>の直下のimage一個のタイプに対応
						if ( symbolNodes[k].hasChildNodes ){
							for ( var l = 0 ; l < symbolNodes[k].childNodes.length ; l++ ){
								if ( symbolNodes[k].childNodes[l].nodeType != 1){
									continue;
								} else if ( symbolNodes[k].childNodes[l].nodeName == "image" ){
									var symb = UtilFuncs.getSymbolProps( symbolNodes[k].childNodes[l] );
									if ( !symb.id ){
										symb.id = symbolNodes[k].getAttribute("id");
									}
									symbols["#"+symb.id] = symb;
									break;
								} else { // ベクタ図形などが入っている場合は、グループシンボルとしてPOIではなくグループに回す前処理(2017.1.17)
									var symb = UtilFuncs.getGraphicsGroupSymbol( symbolNodes[k] );
									symbols["#"+symb.id] = symb;
									break;
								}
							}
						}
					} else if ( symbolNodes[k].nodeName == "marker" ){ // 2015/3/30 marker下path一個のmarkerに対応
						if ( symbolNodes[k].hasChildNodes ){
							for ( var l = 0 ; l < symbolNodes[k].childNodes.length ; l++ ){
								if ( symbolNodes[k].childNodes[l].nodeName == "path" ){
									var symb = UtilFuncs.getPathSymbolMakerProps( symbolNodes[k].childNodes[l] );
									symbols["#"+symb.id] = symb;
									break;
								}
							}
						}
					} else { // ベクトル図形一個だけのシンボルを！　（後日　ペンディング・・・2014/5/12）
						
					}
				}
			}
		}
		return ( symbols );
	}
	
	static addEvent(elm,listener,fn){
		elm.addEventListener(listener,fn,false);
	}
			
	static getCanvasSize(){ // 画面サイズを得る
		var w = window.innerWidth;
		var h = window.innerHeight;
		if ( !w ) {
	//		w = document.body.clientWidth;
			w = document.documentElement.clientWidth;
	//		h = document.body.clientHeight;
			h = document.documentElement.clientHeight;
		}
		return {
			width : w,
			height : h,
			x : 0,
			y : 0
			
		}
	}
	
	/** Obsoluted funcs
	#repairScript( resTxt ){
		var resScript = (resTxt.match(/<script>([\s\S]*)<\/script>/ ))[1];
		// まず、すでにエスケープされているものをもとに戻す・・(rev11以前用に作られたコンテンツ対策)
		resScript = resScript.replace(/&lt;/g,'<');
		resScript = resScript.replace(/&gt;/g,'>');
		resScript = resScript.replace(/&amp;/g,'&');
		
		// その後、エスケープする
		resScript = resScript.replace(/&/g,'&amp;');
		resScript = resScript.replace(/</g,'&lt;');
		resScript = "<script>" + resScript.replace(/>/g,'&gt;') + "</script>";
	//	console.log("resScript:",resScript);
	//	console.log("resTxt:",resTxt);
		return( resTxt.replace(/<script>[\s\S]*<\/script>/ , resScript) );
	}
			
	#getImagePath( inDocPath , docId ){ // ルート文書に対する子文書の相対位置を加味したパスを得る getImageURLと類似していないか？（この関数は現在使われていません・・・）
		var imageURL;
		if ( inDocPath.indexOf("http://") == 0 ){
			imageURL = inDocPath;
		} else {
			var docPath = this.#svgImagesProps[docId].Path;
			var docDir = docPath.substring(0,docPath.lastIndexOf("/")+1);
			imageURL = docDir + inDocPath;
		}
		return ( imageURL );
	}
	#printProperties(obj) {
	    var properties = '';
	    for (var prop in obj){
	        properties += prop + "=" + obj[prop] + "\n";
	    }
	    return(properties);
	}
	#setImgAttr( img , x, y, width, height, href ){ // 使われていない関数・・
		if ( x ){
			img.style.left = x + "px";
		}
		if ( y ){
			img.style.top = y + "px";
		}
		if ( width ){
			img.width = width;
			img.style.width = width+"px";
		}
		if ( height ){
			img.height = height;
			img.style.height = height+"px";
		}
		if ( href ){
			img.href = href;
		}
	}

	#isSvg( doc ){
	//	console.log( doc.documentElement.nodeName );
		if ( 	doc.documentElement.nodeName == "svg" ){
			return ( true );
		} else {
			return ( false );
		}
	}
	**/
}

export { UtilFuncs };
