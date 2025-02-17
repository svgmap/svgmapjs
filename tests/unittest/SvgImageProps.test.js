import { jest } from "@jest/globals";
import { SvgImageProps } from "../../libs/SvgImageProps";

describe("SvgImageProps", () => {
	let svgImageProps;

	beforeEach(() => {
		svgImageProps = new SvgImageProps();
		svgImageProps.Path = "http://example.com/path";
	});

	describe("hash getter", () => {
		it("should return the hash part of the URL", () => {
			svgImageProps.Path = "http://example.com/path#test";
			expect(svgImageProps.hash).toBe("#test");
		});

		it("should return an empty string if there is no hash", () => {
			svgImageProps.Path = "http://example.com/path";
			expect(svgImageProps.hash).toBe("");
		});

		it("should return an empty string if there is only hash.", () => {
			svgImageProps.Path = "http://example.com#";
			expect(svgImageProps.hash).toBe("");
		});
	});

	describe("hash setter", () => {
		it("should set the hash and update the Path", () => {
			svgImageProps.hash = "#newhash";
			expect(svgImageProps.Path).toBe("/path#newhash");
			expect(svgImageProps.clearHashChangedFlag()).toBe("#newhash");
		});

		it("should clear the hash if an empty string is set", () => {
			svgImageProps.hash = "";
			expect(svgImageProps.Path).toBe("/path");
			expect(svgImageProps.clearHashChangedFlag()).toBe(true);
		});

		it("should not set the hash if it does not start with #", () => {
			console.warn = jest.fn();
			svgImageProps.hash = "invalidhash";
			expect(svgImageProps.Path).toBe("http://example.com/path");
			expect(console.warn).toHaveBeenCalledWith("hash should be startd with #");
		});

		it("should not set the hash if it is just #", () => {
			console.warn = jest.fn();
			svgImageProps.hash = "#";
			expect(svgImageProps.Path).toBe("http://example.com/path");
			expect(console.warn).toHaveBeenCalledWith(
				"At least one string of characters in addition to the # is required."
			);
		});
	});
});
