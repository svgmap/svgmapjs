import { beforeAll, it, describe, expect, jest } from "@jest/globals";
import { SvgMap } from "../../SVGMapLv0.1_Class_r18module.js";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

// Setup DOM mocks
const documentObject = {
	parentNode: {
		insertBefore: jest.fn(),
		getElementById: jest.fn().mockReturnThis(),
		getElementsByTagName: jest.fn().mockReturnValue([]),
		appendChild: jest.fn(),
		removeChild: jest.fn(),
	},
	getAttribute: jest.fn(),
	style: {},
	addEventListener: jest.fn(),
	setAttribute: jest.fn(),
	appendChild: jest.fn(),
    insertBefore: jest.fn(),
};

jest.spyOn(document, "getElementById").mockImplementation((arg) => {
    return documentObject;
});
jest.spyOn(document, "createElement").mockReturnValue(documentObject);

describe("Baseline tests for fix-layer-ui-windowing", () => {
    describe("CRS Resolution baseline", () => {
        it("should initialize SvgMap and check for getCrs behavior indirectly", () => {
            const svgMap = new SvgMap();
            expect(svgMap).toBeDefined();
            // getRootCrs should be null or unresolved initially
            expect(svgMap.getRootCrs()).toBeUndefined();
        });
    });

    describe("LayerSpecificWebAppHandler initialization baseline", () => {
        it("should verify current initialization of popupWindows", () => {
            const mockSvgMap = {
                registLayerUiSetter: jest.fn(),
                getRootLayersProps: jest.fn().mockReturnValue([]),
                getSvgImagesProps: jest.fn().mockReturnValue({}),
            };
            const handler = new LayerSpecificWebAppHandler(mockSvgMap, {}, jest.fn());
            expect(handler).toBeDefined();
        });
    });
});