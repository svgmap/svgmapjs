class TernarySimultaneousEquationsSolution{
	static getLinearTransformMatrix(x1i,y1i,x2i,y2i,x3i,y3i,x1o,y1o,x2o,y2o,x3o,y3o){
		// ３基準点の変換の振る舞いから、それに適合する1次変換行列を得るための関数 2020/3/26
		// メルカトル対応に伴い実装
		// input:
		// *i:変換前の座標の3組
		// *o:変換後の座標の3組
		// output:
		// matrix{.a,.b,.c,.d,.e,.f}
		var xs = TernarySimultaneousEquationsSolution.getTernarySimultaneousEquationsSolution(x1i, y1i, 1, x2i, y2i, 1, x3i, y3i, 1, x1o, x2o, x3o);
		var ys = TernarySimultaneousEquationsSolution.getTernarySimultaneousEquationsSolution(x1i, y1i, 1, x2i, y2i, 1, x3i, y3i, 1, y1o, y2o, y3o);
		if ( xs && ys ){
			var ansMatrix = {
				a:xs.x1,
				c:xs.x2,
				e:xs.x3,
				b:ys.x1,
				d:ys.x2,
				f:ys.x3
			}
			return ( ansMatrix );
		} else {
			return ( null );
		}
	}
	
	static getTernarySimultaneousEquationsSolution(a11, a12, a13, a21, a22, a23, a31, a32, a33, b1, b2, b3){
		// 三元連立方程式の解を得る関数 2020/3/26
		// getLinearTransformMatrixが使用する
		// https://www.cis.twcu.ac.jp/~nagasima/02sek3.pdf
		// x1, x2, x3 : 求める値
		// a11, a12, a13, a21, a22, a23, a31, a32, a33 : 方程式の係数
		var det3 = a11*a22*a33 + a12*a23*a31 + a13*a21*a32 - a11*a23*a32 - a12*a21*a33 - a13*a22*a31;
		if ( det3==0 ){
			return null;
		}
		var x1 = (b1*a22*a33 + a12*a23*b3 + a13*b2*a32 - b1*a23*a32 - a12*b2*a33 - a13*a22*b3)/det3;
		var x2 = (a11*b2*a33 + b1*a23*a31 + a13*a21*b3 - a11*a23*b3 - b1*a21*a33 - a13*b2*a31)/det3;
		var x3 = (a11*a22*b3 + a12*b2*a31 + b1*a21*a32 - a11*b2*a32 - a12*a21*b3 - b1*a22*a31)/det3;
		return{
			x1 : x1,
			x2 : x2,
			x3 : x3
		}
	}

}

export {TernarySimultaneousEquationsSolution}