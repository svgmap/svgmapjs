class MapViewerProps{
	// SVGMapのビューアにまつわる内部グローバル変数をまとめたオブジェクト
	root2Geo;
	mapCanvas;
	rootCrs;
	uaProps;
	
	mapCanvas;	// ResourceLoadingObserver.jsで使用しているようですが、Setterがないため使い方不明
	mapCanvasWrapper;
	
	constructor(){
		Object.defineProperty(this, "rootViewBox",{value:{}});
		Object.defineProperty(this, "mapCanvasSize",{value:{}});
		
		//Object.defineProperty(this, "svgImages",{value:{}});
		//Object.defineProperty(this, "svgImagesProps",{value:{}});
	}
	
	hasUaProps(){
		var ans = false;
		if( this.uaProps && this.uaProps.verIE){
			ans = true;
		}
		return ( ans );
	}
	hasMapCanvasSize(){
		if ( this.mapCanvasSize.width ){
			return ( true );
		} else {
			return ( false );
		}
	}
	setRootViewBox(vb){
		this.rootViewBox.x = vb.x;
		this.rootViewBox.y = vb.y;
		this.rootViewBox.width = vb.width;
		this.rootViewBox.height = vb.height;
	}
	setMapCanvasSize( size ){ // this.#mapCanvasSizeをconst扱いにする
		this.mapCanvasSize.x = size.x;
		this.mapCanvasSize.y = size.y;
		this.mapCanvasSize.width = size.width;
		this.mapCanvasSize.height = size.height;
	}

}


export{ MapViewerProps }