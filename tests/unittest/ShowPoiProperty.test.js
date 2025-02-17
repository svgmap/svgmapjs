import { ShowPoiProperty } from "../../libs/ShowPoiProperty";
import { mock_svgmapObj } from "./resources/mockParamerters";
import { UtilFuncs } from "../../libs/UtilFuncs";
import { jest } from "@jest/globals";

describe("unittest for ShowPoiProperty", () => {
	describe("target ShowPoiProperty class", () => {
		let showPoiProperty, result, element;
		beforeEach(() => {
			result = "";
			element = "";
			let func = jest.fn();
			//func.getSvgImagesProps = jest.fn();
			// ISSUE:文法的にエラーがあったため、実装コードを一部変更
			// ShowPoiProperty.js line244
			showPoiProperty = new ShowPoiProperty(mock_svgmapObj, func, "???");
		});

		it("parseEscapedCsvLine", () => {
			result = showPoiProperty.parseEscapedCsvLine("'a',\"b\",c,'dd'");
			expect(result).toEqual(["a", "b", "c", "dd"]);
		});

		it.skip("showPoiPropertyWrapper", async () => {
			// TODO: 引数が何かわからないため後ほど修正
			// 引数はElementと想像するが、Property属性があるownerDocumentが何か不明
			// DOMは以下のようになっているため、parentNodeが適切じゃないかと思っている
			// <div id="iXX" class="rootLayer:i41" property="id,title,p0,p1">
			//   <img src="./mappin.png" width="19" height="27" id="iYY" content="#1,Aセンター,岐阜県,中津川市" title="Aセンター" style="(略)" data-pixelated="true">
			// </div>
			jest.spyOn(UtilFuncs, "getDocumentId").mockReturnValue("root");
			jest
				.spyOn(global.document.firstChild, "getAttribute")
				.mockReturnValue("a,b,c,d,e");

			//document.getAttribute = jest.fn().mockReturnValue("a,b,c,d,e");
			console.log(global.document);
			//
			let elm = document.createElement("div");
			console.log(elm.ownerDocument);
			console.log(elm.ownerDocument.firstElementChild.getAttribute("property"));
			showPoiProperty.showPoiPropertyWrapper(elm);
			expect(elm.getAttribute("data-title")).toBe("Test Title");
		});

		it("setShowPoiProperty", () => {
			// エラーがないことを確認
			let mock_func = jest.fn();
			// 関数を登録してみる
			result = showPoiProperty.setShowPoiProperty(mock_func, "tasikasuuji");
			// 関数削除
			result = showPoiProperty.setShowPoiProperty(null, "tasikasuuji");
		});
	});
});
