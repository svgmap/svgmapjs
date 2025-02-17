import { PathHitTester } from "../../libs/PathHitTester";
import { jest } from "@jest/globals";

describe("target PathHitTest class", () => {
	describe("", () => {
		let pathHitter;
		let mock_SvgmapObj,
			mock_getMapCansasSize,
			mock_refreshScreen,
			mock_isEditingGraphicsElement;

		beforeAll(() => {
			mock_getMapCansasSize = jest
				.fn()
				.mockReturnValue({ width: 300, height: 800 });
			mock_isEditingGraphicsElement = jest.fn().mockReturnValue(null);
			mock_refreshScreen = jest.fn().mockReturnValue({
				isEditingGraphicsElement: mock_isEditingGraphicsElement,
			});
			// 本当はsvgmapObjクラスをモック化する方がよいのだがないため、手動で作成
			mock_SvgmapObj = {
				getMapCanvasSize: mock_getMapCansasSize,
				refreshScreen: mock_refreshScreen,
			};
			pathHitter = new PathHitTester(mock_SvgmapObj, jest.fn(), jest.fn());
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
