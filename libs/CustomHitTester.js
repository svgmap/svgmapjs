class CustomHitTester{
	constructor(svgMapObject, getLayerName){
		this.#svgMapObj = svgMapObject;
		this.#svgImagesProps = svgMapObject.getSvgImagesProps();
		this.#svgImages = svgMapObject.getSvgImages();
		this.#getLayerName = getLayerName;
	}
	#svgMapObj;
	#svgImagesProps; // const扱いにしたいのでSVGMapObj側で、Object.definePropertyで定義されていると良い
	#svgImages;
	#getLayerName;
	
	// 2020/05 カスタムヒットテスト関数を呼び出す , 2022/09 isMapCenterHitTestを追加し、中心ヒットテスト判別可能に
	getLayerHitTestAtPoint( x, y, isMapCenterHitTest ){
		var geop = this.#svgMapObj.screen2Geo(x , y );
		var pos = {
			clientX: x,
			clientY: y,
			lat:geop.lat, 
			lng: geop.lng
		};
		if ( isMapCenterHitTest ){
			pos.isMapCenterHitTest = true;
		}
		var anses =[];
		for (var  layerId in this.#svgImagesProps){
			var sip = this.#svgImagesProps[layerId];
			if ( !sip.controllerWindow){continue}
			var hitTest = sip.controllerWindow.customHitTester;
			if (typeof(hitTest)=="function" ){
				var hitted = hitTest( pos );
				if ( hitted ){ // boolean,string || element
					if ( Array.isArray(hitted)){
					} else {
						hitted = [hitted];
					}
					var layerName = this.#getLayerName( this.#svgMapObj.getLayer(layerId) );
					var hindex=0;
					for ( var hi of hitted ){
						var ans ={};
						ans.layerName = layerName;
						ans.metaSchema = sip.metaSchema;
						ans.geoBbox={x:geop.lng,y:geop.lng,width:0,height:0};
						ans.hitTestIndex=hindex;
						if ( hi === true ){
							ans.element = this.#svgImages[layerId].documentElement; // Elementが必要なので文書要素を・・
							ans.title = layerName;
							ans.metadata = hindex;
						} else if ( typeof(hi)=="string"){
							ans.element = this.#svgImages[layerId].documentElement; // 同上
							ans.title = hi;
							ans.metadata = hi;
						} else if ( hi instanceof Element ){
							ans.element = hi;
							ans.title = hi.getAttribute("xlink:title");
							ans.metadata = hi.getAttribute("content");
						}
						anses.push(ans);
						++hindex;
					}
				}
			}
		}
		return ( anses );
	}
}

export{CustomHitTester};