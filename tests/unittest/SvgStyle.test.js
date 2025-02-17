import { SvgStyle } from "../../libs/SvgStyle";
import { jest } from "@jest/globals";

const testParamerters = [
	{
		description: "hasHyperLink",
		hasHyperLink: true,
		getNodeStyle: {
			fill: null,
			hasUpdate: true,
			hyperLink: "http://localhost",
			maxZoom: 1,
			minZoom: -1,
			target: null,
		},
	},
	{
		description: "not hasHyperLink",
		hasHyperLink: false,
		getNodeStyle: { fill: null, hasUpdate: true, maxZoom: 1, minZoom: -1 },
	},
];

describe("unittest for SvgStyle", () => {
	describe.each(testParamerters)("target $description", (param) => {
		let style, result, defaultStyleList;
		beforeEach(() => {
			defaultStyleList = {
				minZoom: "-1000",
				maxZoom: "1000",
				nonScalingOffset: "none",
				usedParent: "usedParent",
			};
			result = null;
			const nonScalingOffset = jest.fn().mockReturnValue();
			style = new SvgStyle(nonScalingOffset);
		});

		//TODO: 以下試験はループさせることでコード量を減らすことが可能

		it("Nodeのスタイルが一部欠落している場合のgetStyle関数の挙動", () => {
			//create node
			let node = document.createElement("svg");
			node.setAttribute("visibleMaxZoom", "100000");
			node.setAttribute("visibleMinZoom", "1000");
			node.setAttribute("transform", "(100,0,0,-100,0,0)");
			result = style.getStyle(node, defaultStyleList, true, null);
			expect(result).toEqual({
				minZoom: 10,
				maxZoom: 1000,
				nonScalingOffset: "none",
				usedParent: "usedParent",
			});
		});
		it("デフォルトとNode共にスタイルが設定されている場合のgetStyle関数の挙動", () => {
			//create node
			let node = document.createElement("svg");
			result = style.getStyle(node, defaultStyleList, true, null);
			expect(result).toEqual({
				minZoom: "-1000",
				maxZoom: "1000",
				nonScalingOffset: "none",
				usedParent: "usedParent",
			});
		});
		it("target getNodeStyle without transform attribute.", () => {
			//create node
			let node = document.createElement("svg");
			node.setAttribute("xlink:href", "http://localhost");
			node.setAttribute("visibleMaxZoom", "100");
			node.setAttribute("visibleMinZoom", "-100");
			result = style.getNodeStyle(node, param.hasHyperLink);
			expect(result).toEqual(param.getNodeStyle);
		});

		it("target getNodeStyle with transform attribute.", () => {
			//create node
			let node = document.createElement("svg");
			node.setAttribute("xlink:href", "http://localhost");
			node.setAttribute("visibleMaxZoom", "100");
			node.setAttribute("visibleMinZoom", "-100");
			node.setAttribute("transform", "(100,0,0,-100,0,0)");
			result = style.getNodeStyle(node, param.hasHyperLink);
			expect(result).toEqual(param.getNodeStyle);
		});

		it("setCanvasStyle", () => {
			// この関数が何用なのか不明
			//create node
			let node = document.createElement("svg");
			node.setAttribute("xlink:href", "http://localhost");
			node.setAttribute("visibleMaxZoom", "100");
			node.setAttribute("visibleMinZoom", "-100");
			const style = {
				stroke: "none",
				fill: "",
				"stroke-width": "",
				"stroke-dasharray": "",
				"stroke-linejoin": "",
				"stroke-linecap": "",
				opacity: "",
				"fill-opacity": "",
				"vector-effect": "",
			};
			result = SvgStyle.setCanvasStyle(style, node);
			//expect(result).toEqual();
		});
	});
});
