import {
	GeometryCapture,
	SVGMapGISgeometry,
} from "../../libs/GeometryCapture.js";
import { SvgMapElementType } from "../../libs/SvgMapElementType.js";
import { jest } from "@jest/globals";

const GeometryPatterns = [
	{
		description: "Point",
		geometory: { type: "Point", svgXY: [150, 30] },
		result: {},
	},
	{
		description: "Coverage",
		geometory: {
			type: "Coverage",
			svgXY: [
				[150, 30],
				[150, 20],
				[140, 10],
				[150, 30],
			],
		},
		result: {},
	},
	{
		description: "Polygon",
		geometory: { type: "Polygon", svgXY: [[150, 30]] },
		result: {},
	},
	{
		description: "Polygon",
		geometory: {
			type: "Polygon",
			svgXY: [
				[150, 30],
				[150, 20],
				[140, 10],
				[150, 30],
			],
		},
		result: {},
	},
	{
		description: "MultiLineString",
		geometory: {
			type: "MultiLineString",
			svgXY: [
				[150, 30],
				[150, 20],
			],
		},
		result: {},
	},
];

describe("unittest for GeometryCapture", () => {
	describe.each(GeometryPatterns)("target $description", (pattern) => {
		let geometorycap;
		let mock_svgmapObj, mock_getImageUrl;
		let mock_cbFunc = jest.fn();
		beforeAll(() => {
			mock_svgmapObj = {
				refreshScreen: jest.fn(),
				getSvgImagesProps: jest.fn().mockReturnValue({
					CRS: [100.0, 0.0, 0.0, -100.0, 0.0, 0.0],
					iid1: { CRS: [100.0, 0.0, 0.0, -100.0, 0.0, 0.0] },
				}),
			};
			mock_getImageUrl = jest.fn();
			geometorycap = new GeometryCapture(mock_svgmapObj, mock_getImageUrl);
		});
		it("captureGISgeometries", () => {
			// addGeometry試験と順序関係あり
			// captureスタート！というような意味合いっぽい？
			geometorycap.captureGISgeometries(mock_cbFunc, "p1", "p2");
		});
		it("addGeometry (href is undefined)", () => {
			let docid = "iid1";
			geometorycap.prepareDocGeometries(docid);
			geometorycap.addGeometry(docid, pattern.geometory, null, null);
		});
		it("fire a screenRefreshed event.", () => {
			document.dispatchEvent(new Event("screenRefreshed")); // fire the screenRefreshed event.
			// svgMapObj.getSvgImagesProps関数でgeometoryが取得できるらしいのですが、、、
			// getSvgImagesProps関数の戻り値を事前に定義が必要
			// 複雑なのでコールバック関数の引数チェックは断念
			expect(mock_cbFunc).toHaveBeenCalledWith(
				expect.anything(),
				"p1",
				"p2",
				undefined,
				undefined,
				undefined,
				undefined,
				undefined
			);
		});
		it("check the duplication.", () => {
			geometorycap.captureGISgeometries(mock_cbFunc, "p1", "p2");
			let result = geometorycap.captureGISgeometries(mock_cbFunc, "p1", "p2");
			expect(result).toBe(false);
		});

		it("remove Geometries", () => {
			geometorycap.removeDocGeometries("iid1");
		});
		//dummy2DContextBuilderは使用しているか判断つかないのでスキップ
	});
});

// Q.SVGMapGISgeometryのTypeは何のために存在するの？ geojson用ではない。内部フラグで有ればElementTypeを用いるべきでは？
describe("unittest for SVGMapGISgeometry", () => {
	// test pattern

	const testPatterns = [
		{
			description: "svgmap element type is RECT",
			category: SvgMapElementType.VECTOR2D,
			subcategory: SvgMapElementType.RECT,
			geometryObj: Object,
		},
		{
			description: "svgmap element type is BITIMAGE",
			category: SvgMapElementType.BITIMAGE,
			subcategory: null,
			geometryObj: null,
		},
		{
			description: "svgmap element type is POLYGON",
			category: SvgMapElementType.VECTOR2D,
			subcategory: SvgMapElementType.POLYGON,
			geometryObj: Object,
		},
		{
			description: "svgmap element type is PATH",
			category: SvgMapElementType.VECTOR2D,
			subcategory: SvgMapElementType.PATH,
			geometryObj: Object,
		},
	];

	describe.each(testPatterns)("$description", (pattern) => {
		let svgmapgisgeometry;
		beforeEach(() => {
			svgmapgisgeometry = SVGMapGISgeometry.createSVGMapGISgeometry(
				pattern.category,
				pattern.subcategory,
				null,
				{ BitImageGeometriesCaptureFlag: true }
			);
		});
		it("captureGISgeometries", () => {
			expect(svgmapgisgeometry).not.toBeNull();
		});
		it("determine type(TBD->Poly or MultiLine)", () => {
			svgmapgisgeometry.determineType({ fill: "none" });
		});
	});

	const returnNullPatterns = [
		{
			description: "svgmap element type is EMBEDSVG",
			category: SvgMapElementType.EMBEDSVG,
			subcategory: null,
			geometryObj: null,
		},
		{
			description: "svgmap element type is BITIMAGE",
			category: SvgMapElementType.BITIMAGE,
			subcategory: null,
			geometryObj: null,
		},
	];

	describe.each(returnNullPatterns)(
		"$description. But return value is Null",
		(pattern) => {
			let svgmapgisgeometry;
			let mock_svgmapObj, mock_getImageUrl;
			let mock_cbFunc = jest.fn();
			beforeEach(() => {
				svgmapgisgeometry = SVGMapGISgeometry.createSVGMapGISgeometry(
					pattern.category,
					pattern.subcategory,
					null,
					{ BitImageGeometriesCaptureFlag: false }
				);
			});
			it("createSVGMapGISgeometry", () => {
				expect(svgmapgisgeometry).toBeNull();
			});
		}
	);
});
