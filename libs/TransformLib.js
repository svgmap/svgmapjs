// Description:
// MatrixUtil Class for SVGMap.js
// 汎化されたmatrix (GenericMatrix)を用いて、種々の座標変換を行うライブラリクラス
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// 2022/08/16 SVGMap.jsから切り出し

class MatrixUtil {
	/**
	 *
	 * @param {Object} inBox 変換前のViewBox
	 * @param {GenericMatrix} matrix 変換行列
	 * @returns {Object|null} 変換後のViewBox（座標と縦横のサイズ）
	 */
	getTransformedBox(inBox, matrix) {
		// transformRectと被っていると思われる・・ので実質統合化した 2020/10/22
		if (!matrix.transform && matrix.b == 0 && matrix.c == 0) {
			// 線形且つ b,c==0のときのみの簡易関数・・ もう不要な気はする・・
			var x, y, w, h;
			if (matrix.a > 0) {
				x = matrix.a * inBox.x + matrix.e;
				w = matrix.a * inBox.width;
			} else {
				x = matrix.a * (inBox.x + inBox.width) + matrix.e;
				w = -matrix.a * inBox.width;
			}

			if (matrix.d > 0) {
				y = matrix.d * inBox.y + matrix.f;
				h = matrix.d * inBox.height;
			} else {
				y = matrix.d * (inBox.y + inBox.height) + matrix.f;
				h = -matrix.d * inBox.height;
			}

			return {
				x: x,
				y: y,
				width: w,
				height: h,
			};
		} else if (!matrix.transform) {
			// 2021/2/22 debug c,d!=0対応してなかった
			var ptx = [];
			var pty = [];
			var iPart = 1;
			for (var iy = 0; iy <= iPart; iy++) {
				for (var ix = 0; ix <= iPart; ix++) {
					var pt = this.transform(
						inBox.x + (ix * inBox.width) / iPart,
						inBox.y + (iy * inBox.height) / iPart,
						matrix,
					);
					ptx.push(pt.x);
					pty.push(pt.y);
				}
			}

			var x = Math.min.apply(null, ptx);
			var y = Math.min.apply(null, pty);
			var width = Math.max.apply(null, ptx) - x;
			var height = Math.max.apply(null, pty) - y;
			return {
				x: x,
				y: y,
				width: width,
				height: height,
			};
		} else if (matrix.transform) {
			// transformRectと同様の処理に変更
			// 対角での処理から四隅に変更したが、もっと非線形なものはこれでもダメです 2020/10/20
			// ということで、p4..8を追加した・・・苦しぃ　何か根本的に変えるべき
			var ptx = [];
			var pty = [];
			var iPart = 4;
			for (var iy = 0; iy <= iPart; iy++) {
				for (var ix = 0; ix <= iPart; ix++) {
					var pt = matrix.transform({
						x: inBox.x + (ix * inBox.width) / iPart,
						y: inBox.y + (iy * inBox.height) / iPart,
					});
					ptx.push(pt.x);
					pty.push(pt.y);
				}
			}

			var x = Math.min.apply(null, ptx);
			var y = Math.min.apply(null, pty);
			var width = Math.max.apply(null, ptx) - x;
			var height = Math.max.apply(null, pty) - y;
			return {
				x: x,
				y: y,
				width: width,
				height: height,
			};
		} else {
			return null;
		}
	}

	/**
	 * @function 2つの行列の積を計算する関数
	 *
	 * @param {GenericMatrix} m1
	 * @param {GenericMatrix} m2
	 * @returns {Object} // GenericMatrixで返すの方がよいのでは？
	 */
	matMul(m1, m2) {
		// getConversionMatrixViaGCSとほとんど同じでは？
		// m1: 最初の変換マトリクス
		// m2: 二番目の変換マトリクス
		// x',y' = m2(m1(x,y))

		// 2020/3/17 マトリクスでなくtransform(関数)がある場合、それらの積の関数を返却する
		if (m1.transform || m2.transform) {
			var mulFunc = function (inp) {
				var int1, ans;
				if (m1.transform) {
					int1 = m1.transform(inp);
				} else {
					int1 = this.transform(inp.x, inp.y, m1);
				}
				if (m2.transform) {
					ans = m2.transform(int1);
				} else {
					ans = this.transform(int1.x, int1.y, m2);
				}
				return ans;
			}.bind(this);
			return { transform: mulFunc }; // inverseがないのは不十分だと思われる 2020/8/18
		}
		return {
			a: m2.a * m1.a + m2.b * m1.b,
			b: m2.b * m1.a + m2.d * m1.b,
			c: m2.a * m1.c + m2.c * m1.d,
			d: m2.b * m1.c + m2.d * m1.d,
			e: m2.a * m1.e + m2.c * m1.f + m2.e,
			f: m2.b * m1.e + m2.d * m1.f + m2.f,
		};
	}

	transform(x, y, mat, calcSize, nonScaling) {
		if (calcSize == true) {
			if (mat.transform) {
				var origin = mat.transform(0, 0);
				var ans = mat.transform({ x: x, y: y });
				ans.x = ans.x - origin.x;
				ans.y = ans.y - origin.y;
				return ans;
			} else {
				return {
					x: mat.a * x + mat.c * y,
					y: mat.b * x + mat.d * y,
				};
			}
		}

		if (nonScaling) {
			// vector Effect 2014.5.12
			// 2025/07/11 DPRの変更に対応
			let dpr = 1;
			if (nonScaling.docDPR) {
				dpr = nonScaling.docDPR;
			}
			if (mat) {
				if (mat.transform) {
					var ans = mat.transform({ x: nonScaling.x, y: nonScaling.y });
					ans.x = ans.x + x * dpr;
					ans.y = ans.y + y * dpr;
					return ans;
				} else {
					return {
						x: mat.a * nonScaling.x + mat.c * nonScaling.y + mat.e + x * dpr,
						y: mat.b * nonScaling.x + mat.d * nonScaling.y + mat.f + y * dpr,
					};
				}
			} else {
				return {
					x: nonScaling.x + x * dpr,
					y: nonScaling.y + y * dpr,
				};
			}
		}

		if (mat) {
			if (mat.transform) {
				var ans = mat.transform({ x: x, y: y });
				return ans;
			} else {
				return {
					x: mat.a * x + mat.c * y + mat.e,
					y: mat.b * x + mat.d * y + mat.f,
				};
			}
		} else {
			return {
				x: x,
				y: y,
			};
		}
	}

	/**
	 *
	 * @param {Number} svgX
	 * @param {Number} svgY
	 * @param {Object} crs
	 * @param {Object} inv
	 * @returns {Object|null} lat/lngのキーを含むhashを戻す
	 */
	SVG2Geo(svgX, svgY, crs, inv) {
		var iCrs;
		if (inv) {
			iCrs = inv;
		} else {
			iCrs = this.getInverseMatrix(crs);
		}
		if (iCrs) {
			var ans = this.transform(svgX, svgY, iCrs);
			return {
				lng: ans.x,
				lat: ans.y,
			};
		} else {
			return null;
		}
	}

	Geo2SVG(lat, lng, crs) {
		return this.transform(lng, lat, crs);
	}

	getConversionMatrixViaGCS(fromCrs, toCrs) {
		if (fromCrs === toCrs) {
			// 2026/04/02  変換元と変換先が全く同じCRSオブジェクトなら、恒等行列を返す
			return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, scale: 1 };
		}
		// Child 2 Rootのzoomを計算できるよう、ちゃんとした式を算出するように変更 2012/11/2
		var ifCrs = this.getInverseMatrix(fromCrs);

		if (toCrs.transform || fromCrs.transform) {
			// マトリクスの代わりに関数を返却する 2020.3.17
			var itCrs = this.getInverseMatrix(toCrs);
			// スケールはどうするか‥　原点でのスケールにしておくか？ TBD
			var conversionFunc = function (inCrd) {
				var globalCrds = this.transform(inCrd.x, inCrd.y, ifCrs);
				var ans = this.transform(globalCrds.x, globalCrds.y, toCrs);
				return ans;
			}.bind(this);
			var inverseFunc = function (inCrd) {
				var globalCrds = this.transform(inCrd.x, inCrd.y, itCrs);
				var ans = this.transform(globalCrds.x, globalCrds.y, fromCrs);
				return ans;
			}.bind(this);
			var scale, sif, sit, st;
			if (ifCrs.inverse) {
				sif = ifCrs.scale;
			} else {
				sif = Math.sqrt(Math.abs(ifCrs.a * ifCrs.d - ifCrs.b * ifCrs.c));
			}
			if (toCrs.inverse) {
				st = toCrs.scale;
			} else {
				st = Math.sqrt(Math.abs(toCrs.a * toCrs.d - toCrs.b * toCrs.c));
			}
			scale = sif * st;
			return {
				transform: conversionFunc,
				inverse: inverseFunc,
				scale: scale,
			};
		}

		var a = toCrs.a * ifCrs.a + toCrs.c * ifCrs.b;
		var b = toCrs.b * ifCrs.a + toCrs.d * ifCrs.b;
		var c = toCrs.a * ifCrs.c + toCrs.c * ifCrs.d;
		var d = toCrs.b * ifCrs.c + toCrs.d * ifCrs.d;

		var e = toCrs.a * ifCrs.e + toCrs.c * ifCrs.f + toCrs.e;
		var f = toCrs.b * ifCrs.e + toCrs.d * ifCrs.f + toCrs.f;

		return {
			a: a,
			b: b,
			c: c,
			d: d,
			e: e,
			f: f,
			scale: Math.sqrt(Math.abs(a * d - b * c)),
		};
	}

	matMul(m1, m2) {
		// getConversionMatrixViaGCSとほとんど同じでは？
		// m1: 最初の変換マトリクス
		// m2: 二番目の変換マトリクス
		// x',y' = m2(m1(x,y))

		// 2020/3/17 マトリクスでなくtransform(関数)がある場合、それらの積の関数を返却する
		if (m1.transform || m2.transform) {
			var mulFunc = function (inp) {
				var int1, ans;
				if (m1.transform) {
					int1 = m1.transform(inp);
				} else {
					int1 = this.transform(inp.x, inp.y, m1);
				}
				if (m2.transform) {
					ans = m2.transform(int1);
				} else {
					ans = this.transform(int1.x, int1.y, m2);
				}
				return ans;
			}.bind(this);
			return { transform: mulFunc }; // inverseがないのは不十分だと思われる 2020/8/18
		}
		return {
			a: m2.a * m1.a + m2.c * m1.b,
			b: m2.b * m1.a + m2.d * m1.b,
			c: m2.a * m1.c + m2.c * m1.d,
			d: m2.b * m1.c + m2.d * m1.d,
			e: m2.a * m1.e + m2.c * m1.f + m2.e,
			f: m2.b * m1.e + m2.d * m1.f + m2.f,
		};
	}

	transformRect(rect, c2r) {
		// 2020/10/22 getTransformedBox()を使うようにした
		var x, y, width, height;
		var mm;
		if (!rect.transform) {
			mm = c2r;
		} else {
			mm = this.matMul(rect.transform, c2r);
		}

		var tbox = this.getTransformedBox(rect, mm);

		tbox.c2rScale = c2r.scale; // mm.scaleじゃなくて良いのか？ 2020/10/20

		return tbox;
	}

	// 逆座標変換のための変換マトリクスを得る
	getInverseMatrix(matrix) {
		if (matrix.inverse) {
			return {
				transform: matrix.inverse,
				inverse: matrix.transform,
				scale: 1 / matrix.scale,
			};
		} else {
			var det = matrix.a * matrix.d - matrix.b * matrix.c;
			if (det != 0) {
				return {
					a: matrix.d / det,
					b: -matrix.b / det,
					c: -matrix.c / det,
					d: matrix.a / det,
					e: (-matrix.d * matrix.e + matrix.c * matrix.f) / det,
					f: (matrix.b * matrix.e - matrix.a * matrix.f) / det,
				};
			} else {
				return null;
			}
		}
	}
	
	/**
	 * 単純なアフィン線形変換
	 * @param {number} x
	 * @param {number} y
	 * @param {Object} mat - a, b, c, d, e, f を持つ行列オブジェクト
	 * @returns {Object} {x, y}
	 */
	static linearTransform(x, y, mat) {
		return {
			x: mat.a * x + mat.c * y + mat.e,
			y: mat.b * x + mat.d * y + mat.f
		};
	}
}

class GenericMatrix {
	/**
	 *
	 * @param {Function} transform 座標変換する際に用いる関数
	 * @param {Function} inverse 逆行列を計算する関数
	 * @param {Number} scale たぶん倍率
	 */
	setNonLinearCRS(transform, inverse, scale) {
		this.transform = transform;
		this.inverse = inverse;
		this.scale = scale;
	}
	/**
	 *
	 * @description 汎用的な行列
	 *
	 * | a c e |
	 * | b d f |
	 * | 0 0 1 |
	 *
	 * @param {Number} a
	 * @param {Number} b
	 * @param {Number} c
	 * @param {Number} d
	 * @param {Number} e
	 * @param {Number} f
	 */
	setLinearCRS(a, b, c, d, e, f) {
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

class Mercator {
	constructor() {
		this.scale = 1 / 360;
		this.mercator = true;
	}

	#latLng2MercatorXY(lat, lng) {
		// 正規化メルカトル座標と緯度経度との間の変換関数 (下の関数とセット)
		// lng:-180..180 -> x:0..1,   lat: 85.051128..-85.051128 -> y:0..1 グラフィックスのY反転座標になってる
		var size = 1;
		var sinLat = Math.sin((lat * Math.PI) / 180.0);
		var pixelX = ((lng + 180.0) / 360.0) * size;
		var pixelY =
			(0.5 - Math.log((1 + sinLat) / (1.0 - sinLat)) / (4 * Math.PI)) * size;
		return {
			x: pixelX,
			y: pixelY,
		};
	}

	#MercatorXY2latLng(px, py) {
		// px,py: 上のx,y　正規化メルカトル座標
		var size = 1;
		var x = px / size - 0.5;
		var y = 0.5 - py / size;
		var lat = 90 - (360 * Math.atan(Math.exp(-y * 2 * Math.PI))) / Math.PI;
		var lng = 360 * x;
		return {
			lat: lat,
			lng: lng,
		};
	}

	transform = function (inp) {
		return this.#latLng2MercatorXY(inp.y, inp.x);
	}.bind(this);

	inverse = function (inp) {
		var latlng = this.#MercatorXY2latLng(inp.x, inp.y);
		return {
			x: latlng.lng,
			y: latlng.lat,
		};
	}.bind(this);

	scale;
	mercator; // 2021/8/10 メルカトルタイルのための特殊処理を起動するキーパラメータ
}

// 2026/7/22 LUTによるCRS拡張
class LUTMatrix {
	constructor(lutFloat32Array) {
		const type = lutFloat32Array[0];
		if (type !== 1) console.warn("LUTMatrix: Unsupported type:", type);

		this.grid = lutFloat32Array[1];
		this.fwdBox = { x: lutFloat32Array[2], y: lutFloat32Array[3], w: lutFloat32Array[4], h: lutFloat32Array[5] };
		this.invBox = { x: lutFloat32Array[6], y: lutFloat32Array[7], w: lutFloat32Array[8], h: lutFloat32Array[9] };

		const dataLength = (this.grid + 1) * (this.grid + 1) * 2;
		
		this.fwd = lutFloat32Array.subarray(10, 10 + dataLength);
		this.inv = lutFloat32Array.subarray(10 + dataLength, 10 + dataLength * 2);

		if (this.fwdBox.w > 0 && this.fwdBox.h > 0) {
			const px1 = this.fwdBox.x + this.fwdBox.w / 3;
			const py1 = this.fwdBox.y + this.fwdBox.h / 3;
			const px2 = this.fwdBox.x + this.fwdBox.w * 2 / 3;
			const py2 = this.fwdBox.y + this.fwdBox.h * 2 / 3;
			const tp1 = this.#bilinearInterpolate(px1, py1, this.fwdBox, this.fwd);
			const tp2 = this.#bilinearInterpolate(px2, py2, this.fwdBox, this.fwd);
			const distIn = Math.sqrt(Math.pow(px2 - px1, 2) + Math.pow(py2 - py1, 2));
			const distOut = Math.sqrt(Math.pow(tp2.x - tp1.x, 2) + Math.pow(tp2.y - tp1.y, 2));
			this.scale = distIn > 0 ? distOut / distIn : 1;
		} else {
			this.scale = 1;
		}
		this.isLUT = true;
	}

	transform = function (inp) {
		return this.#bilinearInterpolate(inp.x, inp.y, this.fwdBox, this.fwd);
	}.bind(this);

	inverse = function (inp) {
		return this.#bilinearInterpolate(inp.x, inp.y, this.invBox, this.inv);
	}.bind(this);

	#bilinearInterpolate(x, y, box, gridArray) {
		const grid = this.grid;
		let rx = box.w !== 0 ? (x - box.x) / box.w : 0;
		let ry = box.h !== 0 ? (y - box.y) / box.h : 0;

		let ix = Math.floor(rx * grid);
		let iy = Math.floor(ry * grid);

		if (ix < 0) ix = 0;
		if (ix >= grid) ix = grid - 1;
		if (iy < 0) iy = 0;
		if (iy >= grid) iy = grid - 1;

		const fx = (rx * grid) - ix;
		const fy = (ry * grid) - iy;
		const stride = grid + 1;
		const getVal = (idx_x, idx_y) => {
			const base = (idx_y * stride + idx_x) * 2;
			return { x: gridArray[base], y: gridArray[base + 1] };
		};

		const p00 = getVal(ix, iy);
		const p10 = getVal(ix + 1, iy);
		const p01 = getVal(ix, iy + 1);
		const p11 = getVal(ix + 1, iy + 1);

		const outX = p00.x * (1 - fx) * (1 - fy) + p10.x * fx * (1 - fy) + p01.x * (1 - fx) * fy + p11.x * fx * fy;
		const outY = p00.y * (1 - fx) * (1 - fy) + p10.y * fx * (1 - fy) + p01.y * (1 - fx) * fy + p11.y * fx * fy;

		return { x: outX, y: outY };
	}
	
	// 明示的なメモリ解放メソッド(念のため)
	dispose() {
		// TypedArray のビューおよび関連オブジェクトの参照を切る
		this.fwd = null;
		this.inv = null;
		this.fwdBox = null;
		this.invBox = null;
	}
}

class LUTGenerator {
	/**
	 * どちらか一方のViewBoxからLUTバッファ(Float32Array)を生成し、もう片方のViewBoxも自動算出する
	 */
	static generateFloat32Array(crsObj, sourceBox, sourceBoxType, grid = 16) {
		//console.log("Called generateFloat32Array");
		if (!crsObj || typeof crsObj.transform !== 'function' || typeof crsObj.inverse !== 'function'){
			console.warn(`generateFloat32Array: 関数が不足しているためLUT生成を放棄します。`);
			return null
		};
		if (!sourceBox || sourceBox.width === 0) return null;

		const stride = grid + 1;
		const pointsCount = stride * stride;
		const fwdData = new Float32Array(pointsCount * 2);
		const invData = new Float32Array(pointsCount * 2);

		let geoViewBox, actualViewBox;
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

		if (sourceBoxType === 'actual') {
			actualViewBox = sourceBox;
			for (let iy = 0; iy <= grid; iy++) {
				for (let ix = 0; ix <= grid; ix++) {
					const ivx = actualViewBox.x + (ix / grid) * actualViewBox.width;
					const ivy = actualViewBox.y + (iy / grid) * actualViewBox.height;
					const iRes = crsObj.inverse({ x: ivx, y: ivy });
					
					const idx = (iy * stride + ix) * 2;
					if (iRes) {
						invData[idx] = iRes.x; invData[idx+1] = iRes.y;
						if (iRes.x < minX) minX = iRes.x; if (iRes.x > maxX) maxX = iRes.x;
						if (iRes.y < minY) minY = iRes.y; if (iRes.y > maxY) maxY = iRes.y;
					} else {
						invData[idx] = 0; invData[idx+1] = 0;
					}
				}
			}
			geoViewBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

			for (let iy = 0; iy <= grid; iy++) {
				for (let ix = 0; ix <= grid; ix++) {
					const fx = geoViewBox.x + (ix / grid) * geoViewBox.width;
					const fy = geoViewBox.y + (iy / grid) * geoViewBox.height;
					const fRes = crsObj.transform({ x: fx, y: fy });
					const idx = (iy * stride + ix) * 2;
					if (fRes) {
						fwdData[idx] = fRes.x; fwdData[idx+1] = fRes.y;
					} else {
						fwdData[idx] = 0; fwdData[idx+1] = 0;
					}
				}
			}
		} else if (sourceBoxType === 'geo') {
			geoViewBox = sourceBox;
			for (let iy = 0; iy <= grid; iy++) {
				for (let ix = 0; ix <= grid; ix++) {
					const fx = geoViewBox.x + (ix / grid) * geoViewBox.width;
					const fy = geoViewBox.y + (iy / grid) * geoViewBox.height;
					const fRes = crsObj.transform({ x: fx, y: fy });
					
					const idx = (iy * stride + ix) * 2;
					if (fRes) {
						fwdData[idx] = fRes.x; fwdData[idx+1] = fRes.y;
						if (fRes.x < minX) minX = fRes.x; if (fRes.x > maxX) maxX = fRes.x;
						if (fRes.y < minY) minY = fRes.y; if (fRes.y > maxY) maxY = fRes.y;
					} else {
						fwdData[idx] = 0; fwdData[idx+1] = 0;
					}
				}
			}
			actualViewBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

			for (let iy = 0; iy <= grid; iy++) {
				for (let ix = 0; ix <= grid; ix++) {
					const ivx = actualViewBox.x + (ix / grid) * actualViewBox.width;
					const ivy = actualViewBox.y + (iy / grid) * actualViewBox.height;
					const iRes = crsObj.inverse({ x: ivx, y: ivy });
					const idx = (iy * stride + ix) * 2;
					if (iRes) {
						invData[idx] = iRes.x; invData[idx+1] = iRes.y;
					} else {
						invData[idx] = 0; invData[idx+1] = 0;
					}
				}
			}
		} else {
			return null;
		}

		const totalFloats = 10 + pointsCount * 4;
		const f32 = new Float32Array(totalFloats);
		
		f32[0] = 1; // type
		f32[1] = grid;
		f32[2] = geoViewBox.x; f32[3] = geoViewBox.y; f32[4] = geoViewBox.width; f32[5] = geoViewBox.height;
		f32[6] = actualViewBox.x; f32[7] = actualViewBox.y; f32[8] = actualViewBox.width; f32[9] = actualViewBox.height;
		
		f32.set(fwdData, 10);
		f32.set(invData, 10 + pointsCount * 2);

		return f32;
	}
}

export { MatrixUtil, GenericMatrix, Mercator, LUTMatrix, LUTGenerator };
