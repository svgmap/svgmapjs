import { UtilFuncs } from "../../libs/UtilFuncs";
import { SvgMapElementType } from "../../libs/SvgMapElementType";
import { expect, jest } from "@jest/globals";
import * as fs from "node:fs/promises";

describe("unittest for UtilFuncs", () => {
	let mock = null;
	describe("target UtilFuncs class", () => {
		afterEach(() => {
			if (mock !== null) {
				mock.mockClear();
				mock.mockReset();
				mock.mockRestore();
			}
		});
		it("Triming Spaces", () => {
			let result = UtilFuncs.trim("    abcd    ");
			expect(result).toBe("abcd");
		});
		it("Compress Spaces", () => {
			let result = UtilFuncs.compressSpaces("  ab cd\n");
			expect(result).toBe(" ab cd ");
		});
		it("numberFormat", () => {
			// default digits
			const number = 1.23456789;
			let result = UtilFuncs.numberFormat(number);
			expect(result).toBe(1.2345679); // 繰り上がりしますが、これでいいのかな
			result = UtilFuncs.numberFormat(number, 3);
			expect(result).toBe(1.235);
		});

		it("add ramdom parameter for No cache request", () => {
			const mockDate = new Date("2024-01-20");
			mock = jest.spyOn(global, "Date").mockImplementation(() => mockDate);
			mock = jest
				.spyOn(UtilFuncs, "getNonScalingOffset")
				.mockReturnValue({ x: 5, y: 3, nonScaling: true });
			// vanilla url
			let result = UtilFuncs.getNoCacheRequest("http://localhost/aaaa");
			expect(result).toBe("http://localhost/aaaa?unixTime=1705708800000");
			// vanilla url
			result = UtilFuncs.getNoCacheRequest("http://localhost/aaaa?params");
			expect(result).toBe(
				"http://localhost/aaaa?params&unixTime=1705708800000"
			);
			// vanilla url and 2 queries
			result = UtilFuncs.getNoCacheRequest(
				"http://localhost/aaaa?params&params2"
			);
			expect(result).toBe(
				"http://localhost/aaaa?params&params2&unixTime=1705708800000"
			);
		});

		it.skip("add ramdom parameter for No cache request(LayerSpecificUI only)", () => {
			// TODO: layerspecificUIでNocacheするケースの有無を確認する

			let result = UtilFuncs.getNoCacheRequest("http://localhost/aaaa#params");
			expect(result).toBe(
				"http://localhost/aaaa#params&unixTime=1705708800000"
			);

			result = UtilFuncs.getNoCacheRequest(
				"http://localhost/aaaa#params&params2"
			);
			expect(result).toBe(
				"http://localhost/aaaa#params&params2&unixTime=1705708800000"
			);
		});

		it("getDocumentId", () => {
			// SvgElementのベースはどこにある？？
			// returnするだけなのでこの試験に意味ない
			let svgElement = {
				ownerDocument: {
					documentElement: { getAttribute: jest.fn().mockReturnValue("xxx") },
				},
			};
			let result = UtilFuncs.getDocumentId(svgElement);
			expect(result).toBe("xxx");
		});

		it("gethyperlink single node.", () => {
			//
			let mock_getAttr = jest
				.fn()
				.mockReturnValueOnce("_parent")
				.mockReturnValueOnce("http://localhost");
			let childElement = { getAttribute: mock_getAttr };

			let result = UtilFuncs.getHyperLink(childElement);
			expect(result).toEqual(null);
		});

		it("gethyperlink multi node.", () => {
			//
			let mock_getAttr = jest
				.fn()
				.mockReturnValueOnce("_parent")
				.mockReturnValueOnce("http://localhost");
			let parentElement = { nodeName: "a", getAttribute: mock_getAttr };
			let childElement = { parentNode: parentElement };

			let result = UtilFuncs.getHyperLink(childElement);
			expect(result).toEqual({ href: "http://localhost", target: undefined });
		});

		it("No hash in URL.", () => {
			let result = UtilFuncs.getUrlHash(
				"https://localhost/index.html?aaa=bbb&ccc=ddd"
			);
			expect(result).toBe(null);
		});

		it("hash in URL.", () => {
			let result = UtilFuncs.getUrlHash(
				"https://localhost/index.html#aaa=bbb&ccc=ddd"
			);
			expect(result).toContainEqual(["aaa", "bbb"]);
			expect(result).toContainEqual(["ccc", "ddd"]);
		});

		it("getImageProps(POI) without subcategory... cehck degrade", () => {
			let imgElement = document.createElement("img");
			let result = UtilFuncs.getImageProps(
				imgElement,
				SvgMapElementType.POI,
				null,
				null,
				null
			);
			expect(result).toEqual(
				expect.objectContaining({
					cdx: 0,
					cdy: 0,
					height: 0,
					nonScaling: false,
					opacity: 0,
					pixelated: false,
					visible: true,
					width: 0,
					x: 0,
					y: 0,
				})
			);
		});

		it("getImageProps(SVG)", () => {
			let imgElement = document.createElement("img");
			imgElement.setAttribute(
				"src",
				"http://localhost/sublayer.svg#parameters"
			); //これは必ず設定されるものなの？
			imgElement.setAttribute("clip", "???"); //これは必ず設定されるものなの？
			let result = UtilFuncs.getImageProps(
				imgElement,
				SvgMapElementType.EMBEDSVG,
				null,
				SvgMapElementType.SVG2EMBED,
				null
			);
			expect(result).toEqual(
				expect.objectContaining({
					cdx: 0,
					cdy: 0,
					height: 60000,
					nonScaling: false,
					opacity: 0,
					pixelated: false,
					visible: true,
					width: 60000,
					x: -30000,
					y: -30000,
				})
			);
		});

		it("getImageProps(SVG) with bitimage.", () => {
			mock = jest
				.spyOn(UtilFuncs, "getNonScalingOffset")
				.mockReturnValue({ x: 5, y: 3, nonScaling: true });
			let imgElement = document.createElement("img");
			imgElement.setAttribute(
				"src",
				"http://localhost/sublayer.svg#parameters"
			); //これは必ず設定されるものなの？
			imgElement.setAttribute("clip", "???"); //これは必ず設定されるものなの？
			let result = UtilFuncs.getImageProps(
				imgElement,
				SvgMapElementType.EMBEDSVG,
				null,
				null,
				null
			); //これでBitimageになっているのかなぁ？
			expect(result).toEqual(
				expect.objectContaining({
					cdx: 0,
					cdy: 0,
					height: 0,
					href: "",
					nonScaling: true,
					opacity: 0,
					pixelated: false,
					visible: true,
					width: 0,
					x: 5,
					y: 3,
				})
			);
		});

		it("getImageProps(POI) with nonScaling Mode", () => {
			mock = jest
				.spyOn(UtilFuncs, "getNonScalingOffset")
				.mockReturnValue({ x: 5, y: 3, nonScaling: true });
			let imgElement = document.createElement("img");
			imgElement.setAttribute("x", 100);
			imgElement.setAttribute("y", 200);
			imgElement.setAttribute("widtht", 8);
			imgElement.setAttribute("heigh", 5);
			imgElement.setAttribute("visibleMinZoom", 0);
			imgElement.setAttribute("visibleMaxZoom", 0);
			let result = UtilFuncs.getImageProps(
				imgElement,
				SvgMapElementType.POI,
				null,
				SvgMapElementType.RECT,
				null
			);
			expect(result).toEqual(
				expect.objectContaining({
					cdx: 0,
					cdy: 0,
					maxZoom: 0,
					minZoom: 0,
					nonScaling: false,
					opacity: 0,
					pixelated: false,
					visible: true,
				})
			);
		});

		it("getImageProps(Text) with nonScaling", () => {
			mock = jest
				.spyOn(UtilFuncs, "getNonScalingOffset")
				.mockReturnValue({ x: 5, y: 3, nonScaling: true });
			let txtElement = document.createElement("text");
			txtElement.setAttribute("x", 100);
			txtElement.setAttribute("y", 200);
			txtElement.setAttribute("widtht", 8);
			txtElement.setAttribute("heigh", 5);
			txtElement.setAttribute("visibleMinZoom", 1000);
			txtElement.setAttribute("visibleMaxZoom", 600000);
			txtElement.setAttribute("font-size", 10.5);
			txtElement.textContent = "hello";
			let result = UtilFuncs.getImageProps(
				txtElement,
				SvgMapElementType.TEXT,
				null,
				null,
				null
			);
			expect(result).toEqual(
				expect.objectContaining({
					cdx: 100,
					cdy: 200,
					height: 0,
					maxZoom: 6000,
					minZoom: 10,
					nonScaling: true,
					opacity: 0,
					pixelated: false,
					text: "hello",
					visible: true,
					width: 0,
					x: 5,
					y: 3,
				})
			);
		});

		it("getImageProps(Text) without nonScaling", () => {
			mock = jest
				.spyOn(UtilFuncs, "getNonScalingOffset")
				.mockReturnValue({ x: null, y: null, nonScaling: false });
			let txtElement = document.createElement("text");
			txtElement.setAttribute("x", 100);
			txtElement.setAttribute("y", 200);
			txtElement.setAttribute("widtht", 8);
			txtElement.setAttribute("heigh", 5);
			txtElement.setAttribute("visibleMinZoom", 1000);
			txtElement.setAttribute("visibleMaxZoom", 600000);
			txtElement.setAttribute("font-size", 10.5);
			txtElement.textContent = "hello";
			let result = UtilFuncs.getImageProps(
				txtElement,
				SvgMapElementType.TEXT,
				null,
				null,
				null
			);
			expect(result).toEqual(
				expect.objectContaining({
					cdx: 0,
					cdy: 0,
					height: 10.5,
					maxZoom: 6000,
					minZoom: 10,
					nonScaling: false,
					opacity: 0,
					pixelated: false,
					text: "hello",
					visible: true,
					width: 10.5,
					x: 100,
					y: 200,
				})
			);
		});

		it("getNonScalingOffset", () => {
			let svgElement = document.createElement("svg");
			svgElement.setAttribute("transform", "ref(svg,13000,-5000)");
			console.log("getNonScalingOffset Method Start... : ", performance.now());
			let result = UtilFuncs.getNonScalingOffset(svgElement);
			expect(result).toStrictEqual({ x: 13000, y: -5000, nonScaling: true }); // 引数のsvgPoiNodeとsvgElementの違いは何？
		});

		it("get a Symbol", async () => {
			const parser = new DOMParser();
			const xml = await fs.readFile(
				"./tests/unittest/resources/svgDoc_singleSymbol.svg",
				"UTF-8"
			);
			const xmlObj = parser.parseFromString(xml, "text/xml");

			let result = UtilFuncs.getSymbols(xmlObj);
			console.log(result);
			expect(result["#p0"]).toEqual({
				type: "symbol",
				id: "p0",
				path: "mappin.png",
				offsetX: -8,
				offsetY: -25,
				width: 19,
				height: 27,
			});
		});

		it("get Symbols", async () => {
			const parser = new DOMParser();
			const xml = await fs.readFile(
				"./tests/unittest/resources/svgDoc_multiSymbols.svg",
				"UTF-8"
			);
			const xmlObj = parser.parseFromString(xml, "text/xml");

			let result = UtilFuncs.getSymbols(xmlObj);
			expect(Object.keys(result)).toHaveLength(2);
		});
	});
});
