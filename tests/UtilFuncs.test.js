import {UtilFuncs} from "../libs/UtilFuncs";
import {jest} from '@jest/globals';

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
        it("getDocumentId", ()=>{
            // SvgElementのベースはどこにある？？
            // returnするだけなのでこの試験に意味ない
            let svgElement ={"ownerDocument":{"documentElement":{"getAttribute":jest.fn().mockReturnValue("xxx")}}}
            let result = UtilFuncs.getDocumentId(svgElement);
            expect(result).toBe("xxx");
        });

        it("gethyperlink single node.",()=>{
            //
            let mock_getAttr = jest.fn().mockReturnValueOnce("_parent")
                                        .mockReturnValueOnce("http://localhost");
            let childElement = {"getAttribute":mock_getAttr}

            let result = UtilFuncs.getHyperLink(childElement);
            expect(result).toEqual(null);
        });

        it("gethyperlink multi node.",()=>{
            //
            let mock_getAttr = jest.fn().mockReturnValueOnce("_parent")
                                        .mockReturnValueOnce("http://localhost");
            let parentElement = {"nodeName":"a", "getAttribute":mock_getAttr};
            let childElement ={"parentNode":parentElement};

            let result = UtilFuncs.getHyperLink(childElement);
            expect(result).toEqual({"href": "http://localhost", "target": undefined});
        });

        it("No hash in URL.",()=>{
            let result = UtilFuncs.getUrlHash("https://localhost/index.html?aaa=bbb&ccc=ddd");
            expect(result).toBe(null);
        });

        it("hash in URL.",()=>{
            let result = UtilFuncs.getUrlHash("https://localhost/index.html#aaa=bbb&ccc=ddd");
            expect(result).toContainEqual(["aaa", "bbb"]);
            expect(result).toContainEqual(["ccc", "ddd"]);
        });

        it("getImageProps(POI)",()=>{
            let imgElement = document.createElement("img");
            let result = UtilFuncs.getImageProps(imgElement, 2, null, 12, null);
            expect(result).toEqual({
                "cdx": 0,
                "cdy": 0,
                "commonQuery": null,
                "crossorigin": null,
                "elemClass": undefined,
                "height": 0,
                "href": null,
                "href_fragment": undefined,
                "imageFilter": null,
                "maxZoom": undefined,
                "metadata": null,
                "minZoom": undefined,
                "nonScaling": false,
                "opacity": 0,
                "pixelated": false,
                "text": undefined,
                "title": null,
                "transform": undefined,
                "visible": true,
                "width": 0,
                "x": 0,
                "y": 0
                });
        });

        it("getImageProps(POI)",()=>{
            let imgElement = document.createElement("img");
            let result = UtilFuncs.getImageProps(imgElement, 2, null, 3, null);
            expect(result).toEqual({
                "cdx": 0,
                "cdy": 0,
                "commonQuery": null,
                "crossorigin": null,
                "elemClass": undefined,
                "height": 0,
                "href": null,
                "href_fragment": undefined,
                "imageFilter": null,
                "maxZoom": undefined,
                "metadata": null,
                "minZoom": undefined,
                "nonScaling": false,
                "opacity": 0,
                "pixelated": false,
                "text": undefined,
                "title": null,
                "transform": undefined,
                "visible": true,
                "width": 0,
                "x": 0,
                "y": 0
                });
        });
    });

});