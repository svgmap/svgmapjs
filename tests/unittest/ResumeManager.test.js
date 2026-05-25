// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { ResumeManager } from "../../libs/ResumeManager";
import { mock_svgmapObj } from "./resources/mockParamerters";
import { jest } from "@jest/globals";
import { TestResetUtility } from "./TestResetUtility";

const urlPatterns = [
	{
		description: "pure url",
		url: "http://unittest.com/test.svg",
		checkResume:
			"http://unittest.com/test.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + a query parameter.",
		url: "http://unittest.com/test.svg?param=1",
		checkResume:
			"http://unittest.com/test.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + multi query parameters.",
		url: "http://unittest.com/test.svg?param=1&param2",
		checkResume:
			"http://unittest.com/test.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + hash tag",
		url: "http://unittest.com/test.svg#param=1",
		checkResume:
			"http://unittest.com/test.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + hash tag(multi parameters)",
		url: "http://unittest.com/test.svg#param=1&param2",
		checkResume:
			"http://unittest.com/test.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
];

describe("target ResumeManager.", () => {
    afterEach(() => {
        TestResetUtility.resetAll();
    });
	describe.each(urlPatterns)("check to $description", (pattern) => {
		let resumemanager;

		let mock_svgMapCustomLayersManager, mock_parseSVGfunc;
		beforeAll(() => {
			mock_svgMapCustomLayersManager = jest.fn();
			mock_parseSVGfunc = jest.fn();

			resumemanager = new ResumeManager(
				mock_svgmapObj,
				mock_svgMapCustomLayersManager,
				mock_parseSVGfunc
			);
		});
		// ブラウザにかかわるところは専用のクラスを用いると試験しやすい
		it("check the Resume. ", () => {
			//こういう書き方はできない
			//global.location.href = "http://sample.com"
			let dummy_documentElemnt;
			let dummy_symobls;

			let result = resumemanager.checkResume(
				dummy_documentElemnt,
				dummy_symobls
			);
			expect(result).toBe(undefined);
		});

		it("should generate a basic permanent link URL with the expected hash", () => {
			let result = resumemanager.getBasicPermanentLink(false);
			// テスト環境の location が http://localhost/ に固定されているため、
			// URL全体の比較ではなく、生成されたハッシュ部分が期待通りかを比較する
			// TODO: もし今後ResumeManagerをリファクタリングする際は、URL全体を比較できるようにテスト環境のURLを動的に設定することも検討する
			const expectedHash = pattern.checkResume.split("#")[1];
			expect(result.hash).toEqual("#" + expectedHash);
		});
	});
});
