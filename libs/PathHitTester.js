class PathHitTester{
	// VECTOR2Dの線や面をヒットテストする機能 2013/11/29
	// .enable:  X,Yを指定してヒットテストするときに設置する
	// .centralGetter: 通常の描画時に画面の中心にあるオブジェクトを拾う機能を設置する added 2018.1.18
	// .x,.y ヒットテストする場所を設置
	// .hittedElements* ヒットした情報が返却される　親の要素も返る
	
	/**
	 * 
	 * @param {*} svgMapObject 
	 * @param {*} svgMapAuthoringTool 
	 * @param {*} setLoadCompleted 
	 */
	constructor(svgMapObject, svgMapAuthoringTool, setLoadCompleted ){
		this.#svgMapObject = svgMapObject;
		this.#svgMapAuthoringTool = svgMapAuthoringTool;
		this.#setLoadCompleted = setLoadCompleted;
	}
	#svgMapAuthoringTool;
	#svgMapObject;
	#setLoadCompleted;
	
	// 元のpathHitTestのメンバー
	enable;
	centralGetter;
	hittedElements;
	hittedElementsBbox;
	hittedElementsUsedParent;
	pointPrevent;
	x;
	y;
	
	/**
	 * checkTicker()(画面中心のデフォルトヒットテスト)での二重パースを防止するための関数 2018.1.18
	 * 
	 * @returns 
	 */
	setCentralVectorObjectsGetter(){ 
		if ( !this.enable ){ // getVectorObjectsAtPoint(x,y)が要求されていた時はこの機能を発動させてはまずい
			this.enable = false;
			this.centralGetter = true;
			var mapCanvasSize = this.#svgMapObject.getMapCanvasSize();
			this.x = mapCanvasSize.width / 2;
			this.y = mapCanvasSize.height / 2;
			this.hittedElements = new Array();
			this.hittedElementsBbox = new Array();
			this.hittedElementsUsedParent = new Array();
			if (typeof this.#svgMapAuthoringTool == "object" && this.#svgMapAuthoringTool.isEditingGraphicsElement() ){ // オブジェクトを編集中には、ジェネラルなヒットテストは実施しない
				console.log("now object editing..");
				this.enable = false;
				return ( false );
			} else {
				return ( true );
			}
		} else {
			return ( false );
		}
	}


	/**
	 * 2018.1.17 setCentralVectorObjectsGetter用にgetVectorObjectsAtPointの一部を関数化
	 */
	getHittedObjects = function(){ // 
		this.enable = false;
		this.centralGetter = false;
		return {
			elements : this.hittedElements,
			bboxes   : this.hittedElementsBbox,
			parents  : this.hittedElementsUsedParent
		}
	}.bind(this);
	
	/**
	 * 
	 * @param {*} svgNode    - XMLオブジェクト
	 * @param {*} bbox       - 
	 * @param {*} usedParent 
	 */
	setHittedObjects(svgNode, bbox, usedParent){
		this.hittedElements.push(svgNode);
		this.hittedElementsBbox.push(bbox);
		this.hittedElementsUsedParent.push(usedParent);
	}

	/**
	 * この関数はいろいろ作法がまずい(同期refreshScreenや、loadCompletedセットなど)
	 * 
	 * @param {*} x 
	 * @param {*} y 
	 * @returns 
	 */
	getVectorObjectsAtPoint( x, y ){
		this.enable = true;
		this.centralGetter = false; // 2018.1.18
		this.x = x;
		this.y = y;
		this.hittedElements = new Array();
		this.hittedElementsBbox = new Array();
		this.hittedElementsUsedParent = new Array();
		if (typeof this.#svgMapAuthoringTool == "object" && this.#svgMapAuthoringTool.isEditingGraphicsElement() ){ // オブジェクトを編集中には、ジェネラルなヒットテストは実施しない
			console.log("now object editing..");
			this.enable = false;
			return ( null );
		}
		// this.#svgMapObject.refreshScreen(); // 本来この関数は非同期の動きをするのでこの呼び方はまずいけれど・・・（ロードさえ生じなければ同期してるはずなので大丈夫だと思う）この呼び出しケースの場合、原理的にはロード生じないはずなのでオーケー・・でもなかった　リドロー完了形のイベントがまともに動かなくなってしまう2017.8.18
		this.#svgMapObject.refreshScreen(false,null,false,true); // 本来この関数は非同期の動きをするのでこの呼び方はまずいけれど・・・（ロードさえ生じなければ同期してるはずなので大丈夫だと思う）この呼び出しケースの場合、原理的にはロード生じないはずなのでオーケー・・でもなかった　リドロー完了形のイベントがまともに動かなくなってしまう2017.8.18　（2023/4/20この呼び方をする関数を内部関数化)
		
		this.#setLoadCompleted(true); // 2019/12/19 debug　ロード済みの同期呼び出しだから当然・・・ベクトルヒットテスト(checkticker)でおかしくなってた
		return ( this.getHittedObjects() );
	}
}

export{ PathHitTester };