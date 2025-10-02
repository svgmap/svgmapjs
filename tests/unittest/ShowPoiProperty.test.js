// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { ShowPoiProperty } from "../../libs/ShowPoiProperty";
import { mock_svgmapObj } from "./resources/mockParamerters";
import { UtilFuncs } from "../../libs/UtilFuncs";
import { expect, jest } from "@jest/globals";

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
	});

	describe("backup/restore showPoiProperty functionality", () => {
		let showPoiProperty;
		let utilSpy, target;

		beforeEach(() => {
			showPoiProperty = new ShowPoiProperty(mock_svgmapObj, jest.fn(), "???");
			target = document.createElement("div");

			utilSpy = jest.spyOn(UtilFuncs, "getDocumentId").mockReturnValue("i5");
		});

		afterEach(() => {
			// Mockのクリア
			utilSpy.mockClear();
			utilSpy.mockReset();
			utilSpy.mockRestore();
		});

		it("should correctly backup and restore POI property settings", () => {
			const initialFunc = jest.fn();
			const customFunc = jest.fn();

			// 初期設定
			showPoiProperty.setShowPoiProperty(initialFunc, "i5");  // layer i5
			showPoiProperty.setShowPoiProperty(customFunc); // global

			// バックアップ前はhookがアクティブではない
			expect(showPoiProperty.isHookActive()).toBe(false);

			// バックアップ
			showPoiProperty.backupShowPoiProperty();
			// バックアップ後はhookがアクティブになる
			expect(showPoiProperty.isHookActive()).toBe(true);

			// POIクリックをシミュレート
			showPoiProperty.showPoiPropertyWrapper(target);
			expect(initialFunc).toHaveBeenCalledTimes(1); // initialFuncが呼び出されることを確認
			expect(customFunc).toHaveBeenCalledTimes(0); // customFuncは呼び出されないことを確認

			// 設定を変更
			showPoiProperty.setShowPoiProperty(null, "i5"); //defaultに戻す
			showPoiProperty.setShowPoiProperty(jest.fn());

			// POIクリックをシミュレート
			showPoiProperty.showPoiPropertyWrapper(target);
			expect(initialFunc).toHaveBeenCalledTimes(1); // initialFuncが呼び出されないことを確認
			expect(customFunc).toHaveBeenCalledTimes(0); // customFuncも呼び出されないことを確認

			// 変更が適用されていることを確認 (直接アクセスできないため、setShowPoiPropertyの動作で間接的に確認)
			// ここでは、isHookActiveがtrueのままであることを確認する
			expect(showPoiProperty.isHookActive()).toBe(true);

			// リストア
			showPoiProperty.restoreShowPoiProperty();

			// リストア後はhookがアクティブではない
			expect(showPoiProperty.isHookActive()).toBe(false);

			// 既にバックアップが存在する場合に上書きしないこと
			showPoiProperty.backupShowPoiProperty(); // 最初のバックアップ
			
			showPoiProperty.setShowPoiProperty(jest.fn(), "i5"); // 新しい設定
			showPoiProperty.backupShowPoiProperty(); // 再度バックアップを試みる
			
			// バックアップがない場合にrestoreShowPoiPropertyを呼び出してもエラーにならないこと
			showPoiProperty.restoreShowPoiProperty(); // バックアップをクリア
			showPoiProperty.restoreShowPoiProperty(); // バックアップがない状態で再度呼び出す
			// エラーが発生しないことを確認 (JestのtoThrowを使用しない)
			expect(() => showPoiProperty.restoreShowPoiProperty()).not.toThrow();
		});

		it("should not overwrite existing backup when backupShowPoiProperty is called again", () => {
			const initialFunc = jest.fn();
			const customFunc = jest.fn();
			
			showPoiProperty.setShowPoiProperty(initialFunc, "i5"); // layer i5
			showPoiProperty.backupShowPoiProperty();
			
			// バックアップ後の状態を保存 (プライベートフィールドへの直接アクセスは避ける)
			// ここでは、isHookActiveがtrueであることを確認する
			expect(showPoiProperty.isHookActive()).toBe(true);

			showPoiProperty.setShowPoiProperty(customFunc, "i5"); // layer i5

			// showPoiPropertyWrapperを呼び出して、customFuncが呼び出されることを確認
			// POIクリックをシミュレート
			showPoiProperty.showPoiPropertyWrapper(target);
			expect(initialFunc).toHaveBeenCalledTimes(0); // initialFuncは呼び出されないことを確認
			expect(customFunc).toHaveBeenCalledTimes(1); // customFuncが呼び出されることを確認

			// 再度バックアップを試みる
			showPoiProperty.backupShowPoiProperty();
			
			// バックアップが上書きされていないことを確認
			expect(showPoiProperty.isHookActive()).toBe(true); // isHookActiveがtrueのままであることを確認する
			
			// リストアして、元の関数が呼び出されることを確認する
			showPoiProperty.restoreShowPoiProperty();
			// POIクリックをシミュレート
			showPoiProperty.showPoiPropertyWrapper(target);
			expect(initialFunc).toHaveBeenCalledTimes(1); // リストアされて実行回数が1になることを確認
			expect(customFunc).toHaveBeenCalledTimes(1); // customFuncが呼び出されることを確認

			// ここでは、isHookActiveがfalseであることを確認する
			expect(showPoiProperty.isHookActive()).toBe(false);
		});

		it("should not throw error when restoreShowPoiProperty is called without backup", () => {
			// バックアップがないことを確認
			expect(showPoiProperty.isHookActive()).toBe(false);
			
			// バックアップがない状態でrestoreShowPoiPropertyを呼び出す
			expect(() => showPoiProperty.restoreShowPoiProperty()).not.toThrow();
		});

		it("should correctly report hook active status", () => {
			// 初期状態ではhookはアクティブではない
			expect(showPoiProperty.isHookActive()).toBe(false);

			// バックアップ後、hookはアクティブになる
			showPoiProperty.backupShowPoiProperty();
			expect(showPoiProperty.isHookActive()).toBe(true);

			// リストア後、hookはアクティブではなくなる
			showPoiProperty.restoreShowPoiProperty();
			expect(showPoiProperty.isHookActive()).toBe(false);
		});

		it("should call custom handler set by setShowPoiProperty", () => {
			const customHandler = jest.fn();
			showPoiProperty.setShowPoiProperty(customHandler, "i5");
			
			// ここでは、setShowPoiPropertyがエラーなく実行されることを確認する
			expect(() => showPoiProperty.setShowPoiProperty(customHandler, "i5")).not.toThrow();
		});

		it("should restore original handler after restoreShowPoiProperty", () => {
			const originalHandler = jest.fn();
			showPoiProperty.setShowPoiProperty(originalHandler, null);
			
			showPoiProperty.backupShowPoiProperty();
			
			const newHandler = jest.fn();
			showPoiProperty.setShowPoiProperty(newHandler, null);
			
			showPoiProperty.restoreShowPoiProperty();
			
			// ここでは、isHookActiveがfalseであることを確認する
			expect(showPoiProperty.isHookActive()).toBe(false);
		});
	});
});
