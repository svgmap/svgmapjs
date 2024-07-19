import {ShowPoiProperty} from "../libs/ShowPoiProperty";
import {jest} from '@jest/globals';

describe("unittest for ShowPoiProperty",()=>{
    describe("target ShowPoiProperty class",()=>{
        let showPoiProperty, result, element;
        beforeEach(() => {
            result = "";
            element = "";
            let func = jest.fn();
            func.getSvgImagesProps = jest.fn();
            // ISSUE:文法的にエラーがあったため、実装コードを一部変更
            // ShowPoiProperty.js line244
            showPoiProperty = new ShowPoiProperty(func, "layer", "???");
        });

        it("parseEscapedCsvLine",()=>{
            result = showPoiProperty.parseEscapedCsvLine("'a',\"b\",c,'dd'");
            expect(result).toEqual(["a","b","c","dd"]);
        });

        it("showPoiPropertyWrapper", ()=>{
            let elm = new Element();
            result = showPoiProperty.showPoiPropertyWrapper(elm);
        });

        it("setShowPoiProperty", ()=>{
            let mock_func = jest.fn();
            result = showPoiProperty.setShowPoiProperty(mock_func, "tasikasuuji");
            // 関数削除
            result = showPoiProperty.setShowPoiProperty(null, "tasikasuuji");
            //　何も試験ができない
        });
    });
});