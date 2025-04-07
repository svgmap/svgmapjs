// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { ResumeManager } from "../../libs/ResumeManager";
import { jest } from "@jest/globals";

const urlPatterns = [
	{
		description: "pure url",
		url: "http://hogehoge.com",
		checkResume:
			"http://hontohakotti.com/main.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + a query parameter.",
		url: "http://hogehoge.com?param=1",
		checkResume:
			"http://hontohakotti.com/main.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + multi query parameters.",
		url: "http://hogehoge.com?param=1&param2",
		checkResume:
			"http://hontohakotti.com/main.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + hash tag",
		url: "http://hogehoge.com#param=1",
		checkResume:
			"http://hontohakotti.com/main.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
	{
		description: "url + hash tag(multi parameters)",
		url: "http://hogehoge.com#param=1&param2",
		checkResume:
			"http://hontohakotti.com/main.svg#xywh=global:0.000000,0.000000,0.000000,0.000000",
	},
];

describe("target ResumeManager.", () => {
	describe.each(urlPatterns)("check to $description", (pattern) => {
		let resumemanager;

		let mock_svgMapObject, mock_svgMapCustomLayersManager, mock_parseSVGfunc;
		let mock_localstorage, mock_location;
		beforeAll(() => {
			mock_svgMapObject = {
				getSvgImagesProps: jest.fn().mockReturnValue({
					root: { Path: { location: { href: "aaa" } } },
				}),
				getSvgImages: jest.fn(),
				getRootLayersProps: jest.fn().mockReturnValue([]),
				getGeoViewBox: jest
					.fn()
					.mockReturnValue({ x: 0, y: 0, width: 0, height: 0 }),
			};
			mock_svgMapCustomLayersManager = jest.fn();
			mock_parseSVGfunc = jest.fn();

			resumemanager = new ResumeManager(
				mock_svgMapObject,
				mock_svgMapCustomLayersManager,
				mock_parseSVGfunc
			);
		});
		beforeEach(() => {
			mock_location = jest.spyOn(global, "location", "get").mockReturnValue({
				href: "http://kondokoso.com",
				pathname: "/main.svg",
				origin: "http://hontohakotti.com",
			});
		});
		afterEach(() => {
			if (mock_location != null) {
				mock_location.mockClear();
				mock_location.mockReset();
			}
		});
		// ブラウザにかかわるところは専用のクラスを用いると試験しやすい
		it("check Resume", () => {
			//こういう書き方はできない
			//global.location.href = "http://nandatte.com"
			let dummy_documentElemnt;
			let dummy_symobls;

			let result = resumemanager.checkResume(
				dummy_documentElemnt,
				dummy_symobls
			);
			expect(result).toBe(undefined);
		});

		it("get PermanentLink", () => {
			let result = resumemanager.getBasicPermanentLink(false);
			expect(result.href).toEqual(pattern.checkResume);
		});
	});
});
