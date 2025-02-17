import { TernarySimultaneousEquationsSolution } from "../../libs/TernarySimultaneousEquationsSolution";

describe("", () => {
	describe("3元1次連立方程式", () => {
		it("解が1つの場合", () => {
			let result =
				TernarySimultaneousEquationsSolution.getTernarySimultaneousEquationsSolution(
					1,
					-2,
					3,
					2,
					-1,
					1,
					1,
					3,
					-5,
					5,
					6,
					2
				);
			expect(result).toEqual({
				x1: 6,
				x2: 17,
				x3: 11,
			});
		});
		it("解が複数の場合", () => {
			// (a11*a22*a33 + a12*a23*a31 + a13*a21*a32 - a11*a23*a32 - a12*a21*a33 - a13*a22*a31) not 0
			let result =
				TernarySimultaneousEquationsSolution.getTernarySimultaneousEquationsSolution(
					1,
					1,
					1,
					1,
					1,
					1,
					1,
					1,
					1,
					3,
					4,
					5
				);
			expect(result).toEqual(null);
		});
	});
	describe("3元1次連立方程式", () => {
		it("メルカトル座標へ変換するための変換行列計算", () => {
			// 画像をメルカトル図法（直交座標系）に変換することを目的としているのかなぁと推測
			let result =
				TernarySimultaneousEquationsSolution.getLinearTransformMatrix(
					3,
					10,
					12,
					10,
					3,
					2,
					4,
					12,
					8,
					6,
					2,
					9
				);
			expect(result).toStrictEqual({
				a: 0.4444444444444444,
				c: 0.25,
				e: 0.16666666666666666,
				b: -0.6666666666666666,
				d: 0.375,
				f: 10.25,
			});
		});
	});
});
