import {TernarySimultaneousEquationsSolution} from "../libs/TernarySimultaneousEquationsSolution";

describe("",()=>{
	describe("3元1次連立方程式",()=>{
		it("解が1つの場合",()=>{
			let result = TernarySimultaneousEquationsSolution.getTernarySimultaneousEquationsSolution(1,-2,3,2,-1,1,1,3,-5,5,6,2);
			expect(result).toEqual({
				x1 : 6,
				x2 : 17,
				x3 : 11
			});
		});
		it("解が複数の場合",()=>{
			// (a11*a22*a33 + a12*a23*a31 + a13*a21*a32 - a11*a23*a32 - a12*a21*a33 - a13*a22*a31) not 0
			let result = TernarySimultaneousEquationsSolution.getTernarySimultaneousEquationsSolution(1,1,1,1,1,1,1,1,1,3,4,5);
			expect(result).toEqual(null);
		});
	});
	describe("3元1次連立方程式",()=>{
		it("",()=>{
			// getLinearTransformMatrixの使用用途を知りたい。。。
		});
	});
});
