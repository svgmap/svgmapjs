// 汎化されたmatrix (GenericMatrix)を用いて、種々の座標変換を行うライブラリクラス
// Programmed by Satoru Takagi
// 2022/08/16 SVGMap.jsから切り出し

class MatrixUtil {
	getTransformedBox( inBox , matrix){
		// transformRectと被っていると思われる・・ので実質統合化した 2020/10/22
		if ( !matrix.transform && matrix.b == 0 && matrix.c == 0 ){
			// 線形且つ b,c==0のときのみの簡易関数・・ もう不要な気はする・・
			var x , y , w , h;
			if ( matrix.a > 0 ){
				x = matrix.a * inBox.x + matrix.e;
				w = matrix.a * inBox.width;
			} else {
				x = matrix.a * (inBox.x + inBox.width) + matrix.e;
				w = - matrix.a * inBox.width;
			}
			
			if ( matrix.d > 0 ){
				y = matrix.d * inBox.y + matrix.f;
				h = matrix.d * inBox.height;
			} else {
				y = matrix.d * (inBox.y + inBox.height) + matrix.f;
				h = - matrix.d * inBox.height;
			}
			
			return {
				x : x ,
				y : y ,
				width : w ,
				height : h
			}
		} else if (!matrix.transform){ // 2021/2/22 debug c,d!=0対応してなかった
			var ptx=[];
			var pty=[];
			var iPart = 1;
			for ( var iy = 0 ; iy <=iPart ; iy++ ){
				for ( var ix = 0 ; ix <=iPart ; ix++ ){
					var pt = this.transform( inBox.x+ ix * inBox.width / iPart , inBox.y+ iy * inBox.height / iPart , matrix ) ;
					ptx.push(pt.x);
					pty.push(pt.y);
				}
			}
			
			var x = Math.min.apply(null,ptx);
			var y = Math.min.apply(null,pty);
			var width = Math.max.apply(null,ptx) - x;
			var height = Math.max.apply(null,pty) - y;
			return {
				x: x,
				y: y,
				width: width,
				height: height,
			}
			
		} else if ( matrix.transform){
			// transformRectと同様の処理に変更
			// 対角での処理から四隅に変更したが、もっと非線形なものはこれでもダメです 2020/10/20
			// ということで、p4..8を追加した・・・苦しぃ　何か根本的に変えるべき
			var ptx=[];
			var pty=[];
			var iPart = 4;
			for ( var iy = 0 ; iy <=iPart ; iy++ ){
				for ( var ix = 0 ; ix <=iPart ; ix++ ){
					var pt = matrix.transform( {x:inBox.x+ ix * inBox.width / iPart , y:inBox.y+ iy * inBox.height / iPart} ) ;
					ptx.push(pt.x);
					pty.push(pt.y);
				}
			}
			
			var x = Math.min.apply(null,ptx);
			var y = Math.min.apply(null,pty);
			var width = Math.max.apply(null,ptx) - x;
			var height = Math.max.apply(null,pty) - y;
			return {
				x: x,
				y: y,
				width: width,
				height: height,
			}
		} else {
			return ( null );
		}
	}
	/**
	 * 行列の積を求める関数 = m2 * m1
	 * 
	 * @param {GenericMatrix} m1
	 * @param {GenericMatrix} m2
	 * 
	 */
	matMul( m1 , m2 ){ // getConversionMatrixViaGCSとほとんど同じでは？
		// m1: 最初の変換マトリクス
		// m2: 二番目の変換マトリクス
		// x',y' = m2(m1(x,y))
		
		// 2020/3/17 マトリクスでなくtransform(関数)がある場合、それらの積の関数を返却する
		if ( m1.transform || m2.transform){
			var mulFunc = function(inp){
				var int1,ans;
				if ( m1.transform ){
					int1 = m1.transform(inp);
				} else {
					int1 = this.transform(inp.x, inp.y, m1);
				}
				if ( m2.transform ){
					ans = m2.transform(int1);
				} else {
					ans = this.transform(int1.x, int1.y, m2);
				}
				return ( ans );
			}.bind(this)
			return ( {transform:mulFunc} ); // inverseがないのは不十分だと思われる 2020/8/18
		}
		return {
			a: m2.a * m1.a + m2.c * m1.b ,
			b: m2.b * m1.a + m2.d * m1.b ,
			c: m2.a * m1.c + m2.c * m1.d ,
			d: m2.b * m1.c + m2.d * m1.d ,
			e: m2.a * m1.e + m2.c * m1.f + m2.e ,
			f: m2.b * m1.e + m2.d * m1.f + m2.f
		}
	}
	/**
	 * @param {int} x - 何か不明
	 * @param {int} y - 何か不明
	 * @param {GenericMatrix} mat -???
	 * @param {any} calSize : any
	 * nonScaling : any
	 */
	transform( x , y , mat , calcSize , nonScaling){
		if ( calcSize == true ){
			if ( mat.transform ){
				var origin = mat.transform(0,0);
				var ans = mat.transform({x:x,y:y});
				ans.x = ans.x - origin.x;
				ans.y = ans.y - origin.y;
				return ( ans );
			} else {
				return {
					x : mat.a * x + mat.c * y  ,
					y : mat.b * x + mat.d * y 
				}
			}
		}
		
		if ( nonScaling ){ // vector Effect 2014.5.12
			if ( mat ){
				if ( mat.transform ){
					var ans = mat.transform({x:nonScaling.x,y:nonScaling.y});
					ans.x = ans.x + x;
					ans.y = ans.y + y;
					return ( ans );
				} else {
					return {
						x : mat.a * nonScaling.x + mat.c * nonScaling.y + mat.e + x ,
						y : mat.b * nonScaling.x + mat.d * nonScaling.y + mat.f + y
					}
				}
			} else {
				return {
					x : nonScaling.x + x ,
					y : nonScaling.y + y
				}
			}
		}
		
		if ( mat ){
			if ( mat.transform ){
				var ans = mat.transform({x:x,y:y});
				return (ans );
			} else {
				return {
					x : mat.a * x + mat.c * y + mat.e ,
					y : mat.b * x + mat.d * y + mat.f
				}
			}
		} else {
			return {
				x : x ,
				y : y
			}
		}
	}
	
	/***
	 * SVG座標から緯度経度への変換
	 * 
	 * @param {int} svgX 
	 * @param {int} svgY 
	 * @param {GenericMatrix} crs 
	 * @param {GenericMatrix} inv 
	 */

	SVG2Geo( svgX , svgY , crs , inv ){
		var iCrs;
		if ( inv ){
			iCrs = inv;
		} else {
			iCrs = this.getInverseMatrix(crs);
		}
		if ( iCrs ){
			var ans = this.transform(svgX, svgY, iCrs);
			return {
				lng : ans.x ,
				lat : ans.y
			}
		} else {
			return ( null );
		}
	}
	

	/***
	 * 緯度経度からSVG座標への変換
	 * 
	 * @param {float} lat - 緯度
	 * @param {float} lng - 軽度
	 * @param {GenericMatrix} crs - 座標参照系(Coordinate Reference System:CRS)
	 * 
	 */
	Geo2SVG( lat , lng , crs ){
		return ( this.transform(lng, lat, crs ) );
	}
	
	getConversionMatrixViaGCS( fromCrs , toCrs ){
		// Child 2 Rootのzoomを計算できるよう、ちゃんとした式を算出するように変更 2012/11/2
		var ifCrs = this.getInverseMatrix(fromCrs);
		
		if ( toCrs.transform || fromCrs.transform ){ // マトリクスの代わりに関数を返却する 2020.3.17
			var itCrs = this.getInverseMatrix(toCrs);
			// スケールはどうするか‥　原点でのスケールにしておくか？ TBD
			var conversionFunc = function( inCrd ){
				var globalCrds = this.transform(inCrd.x, inCrd.y, ifCrs);
				var ans = this.transform(globalCrds.x, globalCrds.y, toCrs);
				return ( ans );
			}.bind(this)
			var inverseFunc = function(inCrd ){
				var globalCrds = this.transform(inCrd.x, inCrd.y, itCrs);
				var ans = this.transform(globalCrds.x, globalCrds.y, fromCrs);
				return ( ans );
			}.bind(this)
			var scale, sif, sit, st;
			if ( ifCrs.inverse ){
				sif = ifCrs.scale;
			} else {
				sif = Math.sqrt( Math.abs(ifCrs.a * ifCrs.d - ifCrs.b * ifCrs.c ) );
			}
			if ( toCrs.inverse ){
				st = toCrs.scale;
			} else {
				st = Math.sqrt( Math.abs(toCrs.a * toCrs.d - toCrs.b * toCrs.c ) );
			}
			scale = sif * st;
			return {
				transform: conversionFunc,
				inverse: inverseFunc,
				scale: scale
			};
		}
		
		var a = toCrs.a * ifCrs.a + toCrs.c * ifCrs.b;
		var b = toCrs.b * ifCrs.a + toCrs.d * ifCrs.b;
		var c = toCrs.a * ifCrs.c + toCrs.c * ifCrs.d;
		var d = toCrs.b * ifCrs.c + toCrs.d * ifCrs.d;
		
		var e = toCrs.a * ifCrs.e + toCrs.c * ifCrs.f + toCrs.e;
		var f = toCrs.b * ifCrs.e + toCrs.d * ifCrs.f + toCrs.f;
		
		return {
			a : a ,
			b : b ,
			c : c ,
			d : d ,
			e : e ,
			f : f ,
			scale : Math.sqrt( Math.abs(a * d - b * c ) )
		}
		
	}
	
	transformRect( rect ,  c2r ){ // 2020/10/22 getTransformedBox()を使うようにした
		var x , y , width , height;
		var mm;
		if ( ! rect.transform ){
			mm = c2r;
		} else {
			mm = this.matMul( rect.transform , c2r );
		}
		
		var tbox = this.getTransformedBox( rect , mm)
		
		tbox.c2rScale = c2r.scale; // mm.scaleじゃなくて良いのか？ 2020/10/20
		
		return ( tbox );
		
	}

	
	// 逆座標変換のための変換マトリクスを得る
	getInverseMatrix( matrix ){
		if ( matrix.inverse ){
			return { 
				transform: matrix.inverse,
				inverse: matrix.transform,
				scale: 1/matrix.scale
			};
		} else {
			var det = matrix.a * matrix.d - matrix.b * matrix.c;
			if ( det != 0 ){
				return{
					a :  matrix.d / det ,
					b : -matrix.b / det ,
					c : -matrix.c / det ,
					d :  matrix.a / det ,
					e : (- matrix.d * matrix.e + matrix.c * matrix.f )/ det ,
					f : (  matrix.b * matrix.e - matrix.a * matrix.f )/ det
				}
			} else {
				return ( null );
			}
		}
	}
	

}

/**
 * CSSで使用されるMatrix()：2次元同時変換行列と同等の汎用行列クラス
 * https://developer.mozilla.org/ja/docs/Web/CSS/transform-function/matrix
 * 
 * GenericMatrix = | a, c, e|
 *                 | b, d, f|
 *                 | 0, 0, 1|
 */
class GenericMatrix{
	setNonLinearCRS(transform, inverse, scale){
		this.transform = transform;
		this.inverse = inverse;
		this.scale = scale;
	}
	setLinearCRS(a,b,c,d,e,f){
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.e = e;
		this.f = f;
	}
	transform;
	inverse;
	scale;
	a;
	b;
	c;
	d;
	e;
	f;
}

class Mercator{
	constructor(){
		this.scale =  (1/360);
		this.mercator = true;
	}
	
	#latLng2MercatorXY( lat , lng  ){ // 正規化メルカトル座標と緯度経度との間の変換関数 (下の関数とセット)
		// lng:-180..180 -> x:0..1,   lat: 85.051128..-85.051128 -> y:0..1 グラフィックスのY反転座標になってる
		var size=1;
		var sinLat = Math.sin(lat * Math.PI / 180.0);
		var pixelX = (( lng + 180.0 ) / 360.0 ) * size;
		var pixelY = (0.5 - Math.log((1 + sinLat) / (1.0 - sinLat)) / (4 * Math.PI)) * size;
		return {
			x : Math.round(pixelX*1e6)/1e6 , 
			y : Math.round(pixelY*1e6)/1e6
		}
	}

	#MercatorXY2latLng( px , py ){ // px,py: 上のx,y　正規化メルカトル座標
		var size=1;
		var x = ( px / size ) - 0.5;
		var y = 0.5 - ( py / size);
		var lat = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI;
		var lng = 360 * x;
		return{
			lat : Math.trunc(lat*1e6)/1e6 ,
			lng : Math.trunc(lng*1e6)/1e6
		}
	}
	
	transform=function(inp){
		return ( this.#latLng2MercatorXY(inp.y, inp.x) );
	}.bind(this);
	
	inverse=function(inp){
		var latlng = this.#MercatorXY2latLng(inp.x, inp.y);
		return{
			x: latlng.lng,
			y: latlng.lat
		}
	}.bind(this);
	
	scale;
	mercator; // 2021/8/10 メルカトルタイルのための特殊処理を起動するキーパラメータ
}

export{ MatrixUtil,GenericMatrix, Mercator};


