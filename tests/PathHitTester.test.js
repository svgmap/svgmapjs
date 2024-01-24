import {PathHitTester} from "../libs/PathHitTester";
import {jest} from "@jest/globals"

describe("target PathHitTest class",()=>{
	describe("",()=>{
		let pathHitter;
		let mockSvgmapObj;
		beforeAll(()=>{
			mockSvgmapObj = {"getMapCanvasSize": jest.fn(), "refreshScreen": jest.fn()};
			pathHitter = new PathHitTester(mockSvgmapObj, null, jest.fn());
		});

		it("test of getHittedObjects",()=>{
			let result = pathHitter.getHittedObjects();
			//いったん空であることを確認
			expect(result).toEqual({"bboxes": undefined, "elements": undefined, "parents": undefined});
		});
	});
});
