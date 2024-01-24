// import { CollidedImagesGetter } from './CollidedImagesGetter.js'; // 今は使われていません


class PoiHitTester{
	constructor(){
		this.visiblePOIs=new Array();
	}
	
	 // 現在画面上に表示されているPOI(imgアイコン)のリスト(idのハッシュ 内容はx,y,width,height)
	visiblePOIs;
	
	/**
	 * 
	 * @param {*} x 
	 * @param {*} y 
	 * @returns 
	 */
	getPoiObjectsAtPoint( x, y ){
		var hittedPOIs = new Array();
		for ( var i in this.visiblePOIs ){
			if ( x < this.visiblePOIs[i].x ||
				x > this.visiblePOIs[i].x + this.visiblePOIs[i].width ||
				y < this.visiblePOIs[i].y ||
				y > this.visiblePOIs[i].y + this.visiblePOIs[i].height ) {
					// none
			} else {
				this.visiblePOIs[i].id = i;
				hittedPOIs.push(this.visiblePOIs[i]);
			}
		}
		return ( hittedPOIs );
	}
	
	clear(){
		this.visiblePOIs = new Array(); 
	}
	
	setPoiBBox(imageId, x, y, width, height){
		this.visiblePOIs[imageId] = { x: x, y: y, width: width, height: height };
	}
	
}

export{PoiHitTester};