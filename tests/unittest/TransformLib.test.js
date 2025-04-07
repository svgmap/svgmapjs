// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { MatrixUtil, GenericMatrix, Mercator } from "../../libs/TransformLib";

describe("unittest for TransformLib", () => {
	describe("target GenericMatrix class", () => {
		it("return matrix", () => {
			//あんまり意味のない試験
			let matrix = new GenericMatrix();
			matrix.setLinearCRS(0, 1, 2, 3, 4, 5);
			expect(matrix).toHaveProperty("a", 0);
		});
	});

	describe("target Mercator class", () => {
		it("緯度経度から正規化メルカトル座標系への変換", () => {
			let mercator = new Mercator();
			let latlng2Mercator = mercator.transform({ x: 0, y: 0 });
			expect(latlng2Mercator).toEqual({ x: 0.5, y: 0.5 });
			latlng2Mercator = mercator.transform({ x: 180, y: 85.051128 });
			expect(latlng2Mercator.x).toBeCloseTo(1);
			expect(latlng2Mercator.y).toBeCloseTo(0);
			latlng2Mercator = mercator.transform({ x: -180, y: -85.051128 });
			expect(latlng2Mercator.x).toBeCloseTo(0);
			expect(latlng2Mercator.y).toBeCloseTo(1);
		});
		it("正規化メルカトル座標系から緯度経度への変換", () => {
			let mercator = new Mercator();
			let latlng2Mercator = mercator.inverse({ x: 1, y: 0 });
			expect(latlng2Mercator.x).toBeCloseTo(180);
			expect(latlng2Mercator.y).toBeCloseTo(85.051128);
			latlng2Mercator = mercator.inverse({ x: 0, y: 1 });
			expect(latlng2Mercator.x).toBeCloseTo(-180);
			expect(latlng2Mercator.y).toBeCloseTo(-85.051128);
		});
	});

	describe("target MatrixUtil class", () => {
		it("行列の積", () => {
			const matrix1 = new GenericMatrix();
			const matrix2 = new GenericMatrix();
			const mUtil = new MatrixUtil();
			matrix1.setLinearCRS(0, 1, 2, 3, 4, 5);
			matrix2.setLinearCRS(6, 7, 8, 9, 10, 11);
			let m = mUtil.matMul(matrix1, matrix2);
			expect(m).toEqual({
				a: 8,
				b: 9,
				c: 36,
				d: 41,
				e: 74,
				f: 84,
			}); // 単純な Matrix2 * Matrix1の計算じゃない？
			//TODO Transformを用いた計算結果を追加
		});
		it("TransfomedBox？", () => {
			const mUtil = new MatrixUtil();
			// inboxって何？
			//mUtil.getTransformedBox();
		});
		it("SVG座標から緯度経度への変換", () => {
			const crs = new GenericMatrix();
			const mUtil = new MatrixUtil();
			crs.setLinearCRS(100.0, 0, 0, -100.0, 0, 0); // SVGMapコンテナでよく使わられる係数
			const result = mUtil.SVG2Geo(13500, -3300, crs, null);
			expect(result).toEqual({ lat: 33, lng: 135 });
		});
		it("緯度経度からSVG座標への変換", () => {
			const crs = new GenericMatrix();
			const mUtil = new MatrixUtil();
			crs.setLinearCRS(100.0, 0, 0, -100.0, 0, 0); // SVGMapコンテナでよく使わられる係数
			let result = mUtil.Geo2SVG(33, 135, crs);
			expect(result).toEqual({ x: 13500, y: -3300 });
		});
		it("逆座標変換用行列の取得", () => {
			const matrix = new GenericMatrix();
			const mUtil = new MatrixUtil();
			matrix.setLinearCRS(0, 1, 2, 3, 4, 5);
			let inv = mUtil.getInverseMatrix(matrix);
			expect(inv).toEqual({ a: -1.5, b: 0.5, c: 1, d: -0, e: 1, f: -2 });
		});
	});
});
