import { describe, it, expect } from "@jest/globals";
import { UtilFuncs } from "../../libs/UtilFuncs.js";

describe("UtilFuncs.getCRSFromSVG", () => {
	it("should extract CRS from svgmap:crs attribute", () => {
		const parser = new DOMParser();
		const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:svgmap="http://www.purl.org/net/svgmap/ns/1.0" svgmap:crs="EPSG:3857"></svg>`;
		const svgDoc = parser.parseFromString(svgXml, "image/svg+xml");
		
		const crs = UtilFuncs.getCRSFromSVG(svgDoc);
		expect(crs).toBe("EPSG:3857");
	});

	it("should extract CRS from simple crs attribute", () => {
		const parser = new DOMParser();
		const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" crs="EPSG:4326"></svg>`;
		const svgDoc = parser.parseFromString(svgXml, "image/svg+xml");
		
		const crs = UtilFuncs.getCRSFromSVG(svgDoc);
		expect(crs).toBe("EPSG:4326");
	});

	it("should return null if no CRS attribute exists", () => {
		const parser = new DOMParser();
		const svgXml = `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
		const svgDoc = parser.parseFromString(svgXml, "image/svg+xml");
		
		const crs = UtilFuncs.getCRSFromSVG(svgDoc);
		expect(crs).toBeNull();
	});
});
