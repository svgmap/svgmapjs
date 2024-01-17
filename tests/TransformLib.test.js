import {MatrixUtil,GenericMatrix, Mercator} from "../libs/TransformLib";

describe("unittest for TransformLib",()=>{
    describe("target GenericMatrix class",()=>{
        it("return matrix",()=>{
            //あんまり意味のない試験
            let matrix = new GenericMatrix();
            matrix.setLinearCRS(0,1,2,3,4,5);
            expect(matrix).toHaveProperty('a',0);
        });
    });
    describe("target Mercator class",()=>{
        it("緯度経度から正規化メルカトル座標系への変換",()=>{
            let mercator = new Mercator();
            let latlng2Mercator = mercator.transform({"x":0, "y":0});
            expect(latlng2Mercator).toEqual({"x":0.5,"y":0.5});
            latlng2Mercator = mercator.transform({"x":180, "y":85.051128});
            expect(latlng2Mercator).toEqual({"x":1,"y":0});
            latlng2Mercator = mercator.transform({"x":-180, "y":-85.051128});
            expect(latlng2Mercator).toEqual({"x":0,"y":1});
        });
        it("正規化メルカトル座標系から緯度経度への変換",()=>{
            let mercator = new Mercator();
            let latlng2Mercator = mercator.inverse({"x":1, "y":0});
            expect(latlng2Mercator).toEqual({"x":180,"y":85.051128});
            latlng2Mercator = mercator.inverse({"x":0, "y":1});
            expect(latlng2Mercator).toEqual({"x":-180,"y":-85.051128});
        });
    });
});