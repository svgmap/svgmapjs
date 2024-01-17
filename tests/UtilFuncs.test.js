import {UtilFuncs} from "../libs/UtilFuncs";

describe("unittest for UtilFuncs",()=>{
    describe("target UtilFuncs class",()=>{
        it("Triming Spaces",()=>{
            let result = UtilFuncs.trim("    abcd    ");
            expect(result).toBe("abcd");
        });
        it("Compress Spaces",()=>{
            let result = UtilFuncs.compressSpaces("  ab cd\n");
            expect(result).toBe(" ab cd ");
        });
        it("numberFormat",()=>{
            // default digits
            const number = 1.23456789;
            let result = UtilFuncs.numberFormat(number);
            expect(result).toBe(1.2345679);// 繰り上がりしますが、これでいいのかな
            result = UtilFuncs.numberFormat(number, 3);
            expect(result).toBe(1.235);
        });
    });

});