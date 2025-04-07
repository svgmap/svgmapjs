// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { ProxyManager } from "../../libs/ProxyManager";
import { jest } from "@jest/globals";

// ユースケースがよくわかってないため実装ありきの試験になっています
// 引数のパターンが不足していたら追加ください
const proxyPatterns = [
	{
		description: "nothing.",
		arguments: {
			documentURLviaProxyFunction: null,
			imageURLviaProxyFunction: null,
			imageCrossOriginAnonymous: null,
			imageURLviaProxyFunctionForNonlinearTransformation: null,
			imageCrossOriginAnonymousForNonlinearTransformation: false,
		},
		correct: {
			getAccessInfo: "http://example.com",
			getImageAccessInfo: {
				crossOriginFlag: true,
				hasNonLinearImageTransformation: false,
				href: "http://example.com",
			},
			getCORSURL: { crossorigin: false, url: "http://example.com" },
		},
	},
	{
		description: "documentURLviaProxyFunction and imageCrossOriginAnonymous",
		arguments: {
			documentURLviaProxyFunction: jest
				.fn()
				.mockReturnValue("http://hogehoge.com"),
			imageURLviaProxyFunction: jest
				.fn()
				.mockReturnValue("http://hogehoge.com"),
			imageCrossOriginAnonymous: jest
				.fn()
				.mockReturnValue("http://hogehoge.com"),
			imageURLviaProxyFunctionForNonlinearTransformation: jest
				.fn()
				.mockReturnValue("http://hogehoge.com"),
			imageCrossOriginAnonymousForNonlinearTransformation: true,
		},
		correct: {
			getAccessInfo: "http://hogehoge.com",
			getImageAccessInfo: {
				crossOriginFlag: true,
				hasNonLinearImageTransformation: false,
				href: "http://hogehoge.com",
			},
			getCORSURL: { crossorigin: true, url: "http://hogehoge.com" },
		},
	},
	{
		description: "documentURLviaProxyFunction and imageCrossOriginAnonymous",
		arguments: {
			documentURLviaProxyFunction: null,
			imageURLviaProxyFunction: jest
				.fn()
				.mockReturnValue("http://hogehoge.com"),
			imageCrossOriginAnonymous: jest
				.fn()
				.mockReturnValue("http://hogehoge.com"),
			imageURLviaProxyFunctionForNonlinearTransformation: jest
				.fn()
				.mockReturnValue("http://hogehoge.com"),
			imageCrossOriginAnonymousForNonlinearTransformation: true,
		},
		correct: {
			getAccessInfo: "http://example.com",
			getImageAccessInfo: {
				crossOriginFlag: true,
				hasNonLinearImageTransformation: false,
				href: "http://hogehoge.com",
			},
			getCORSURL: { crossorigin: true, url: "http://hogehoge.com" },
		},
	},
];

// コンストラクタの引数がほとんど関数のため、あんまり試験の意味がなさそう
describe("unittest for ProxyManager", () => {
	describe.each(proxyPatterns)(
		"mock the argument of $description",
		(proxyPattern) => {
			let proxymanager;
			beforeEach(() => {
				proxymanager = new ProxyManager();
				proxymanager.setProxyURLFactory(
					...Object.values(proxyPattern.arguments)
				);
			});

			it("check getAccessInfo", () => {
				let result = proxymanager.getAccessInfo("http://example.com");
				expect(result).toStrictEqual(proxyPattern.correct.getAccessInfo);
			});

			it("check getImageAccessInfo", () => {
				let result = proxymanager.getImageAccessInfo(
					"http://example.com",
					true,
					true
				);
				expect(result).toStrictEqual(proxyPattern.correct.getImageAccessInfo);
			});

			it("check getCORSURL", () => {
				// 注意：第2引数のFlagによって戻り値の方が異なります。
				let result = proxymanager.getCORSURL("http://example.com", true);
				expect(result).toStrictEqual(proxyPattern.correct.getCORSURL);
				result = proxymanager.getCORSURL("http://example.com", false);
				expect(result).toStrictEqual(proxyPattern.correct.getCORSURL.url);
			});
		}
	);
});
