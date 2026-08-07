// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { PathHitTester } from "../../libs/PathHitTester";
import { mock_svgmapObj } from "./resources/mockParamerters";
import { jest } from "@jest/globals";

describe("target PathHitTest class", () => {
	describe("", () => {
		let pathHitter;

		beforeAll(() => {
			pathHitter = new PathHitTester(mock_svgmapObj, jest.fn(), jest.fn());
		});

		it("画面中央のヒットテスト時に多重起動しないよう制御", () => {
			let result = pathHitter.setCentralVectorObjectsGetter();
			expect(result).toBe(true);
		});

		it("test of getHittedObjects", () => {
			let result = pathHitter.getHittedObjects();
			//いったん空であることを確認
			expect(result).toEqual({ bboxes: [], elements: [], parents: [] });
		});

		it("getVectorObjectsAtPoint function", () => {
			// x,yを引数にとるもののどこで使用しているのか不明
			// TODO : setHittedObjectsの第２引数であるbboxで検索するのか確認
			let result = pathHitter.getVectorObjectsAtPoint(10, 3);
			expect(result).toEqual({ bboxes: [], elements: [], parents: [] });
		});
	});
});
