import { PathRenderer } from "../libs/PathRenderer";
import {jest} from "@jest/globals";
import { SvgMapElementType } from '../libs/SvgMapElementType.js';

const flagPatterns = [
	{
		description: "nonScalingOffset true and clickable true",
		nonScalingOffset: true,
		clickable: true,
		rect: {"height": 7,"x": 10,"y": 5},
		circle: {"height": 24,"x": 10,"y": -7},
		polygon: {"height": 7, "x": 10, "y": 5}
	},{
		description: "nonScalingOffset false and clickable true",
		nonScalingOffset: false,
		clickable: true,
		rect: {"height": 7,"x": 10,"y": 5},
		circle: {"height": 0,"x": 10,"y": 5},
		polygon: {"height": 7, "x": 10, "y": 5}
	},{
		description: "nonScalingOffset true and clickable false",
		nonScalingOffset: true,
		clickable: false,
		rect: {"height": 7,"x": 10,"y": 5},
		circle: {"height": 24,"x": 10,"y": -7},
		polygon: {"height": 7, "x": 10, "y": 5}
	},{
		description: "nonScalingOffset false and clickable false",
		nonScalingOffset: false,
		clickable: false,
		rect: {"height": 7,"x": 10,"y": 5},
		circle: {"height": 0,"x": 10,"y": 5},
		polygon: {"height": 7, "x": 10, "y": 5}
	},
]

describe("unittest for PathRenderer",()=>{
	describe.each(flagPatterns)("target $description",(flagPattern)=>{
			
		let pathrenderer;
		let mock_geometryCapturer, mock_matUtil, mock_mapTicker, mock_mapViewerProps;
		let original_svgpathpoints;
		let shapeNode;

		beforeAll(()=>{
			mock_geometryCapturer = {"GISgeometriesCaptureOptions":{"TreatRectAsPolygonFlag":true}};
			mock_matUtil = {"transform": jest.fn().mockReturnValue({"x":0,"y":0})};
			mock_mapTicker = jest.fn();
			mock_mapViewerProps = jest.fn();
			pathrenderer = new PathRenderer(mock_geometryCapturer, mock_matUtil, mock_mapTicker, mock_mapViewerProps);
		});
		beforeEach(()=>{
			// TODO: spyOnがうまくいかなかったため、手動でバックアップ
			original_svgpathpoints = pathrenderer.setSVGpathPoints;
			pathrenderer.setSVGpathPoints = jest.fn().mockReturnValue({"x":10,"y":5,"height":7});
			//
			shapeNode = document.createElement("shape");
			shapeNode.setAttribute("cx",5);
			shapeNode.setAttribute("cy", 10);
			shapeNode.setAttribute("r", 12);
			shapeNode.setAttribute("rx", 8);
			shapeNode.setAttribute("ry", 9);
		});

		afterEach(()=>{
			// TODO: spyOnがうまくいかなかったため、手動でリストア
			pathrenderer.setSVGpathPoints = original_svgpathpoints;
		});

		it("setSVGcirclePoints",()=>{
			let canvas = document.createElement("canvas");
			let result = pathrenderer.setSVGcirclePoints(shapeNode, canvas, null, flagPattern.clickable, SvgMapElementType.CIRCLE, flagPattern, null);
			expect(result).toEqual(flagPattern.circle);
		});

		it("setSVGrectPoints",()=>{
			let canvas = document.createElement("canvas");
			let result = pathrenderer.setSVGrectPoints(shapeNode, canvas, null, flagPattern.clickable, flagPattern, null);
			expect(result).toEqual(flagPattern.rect);
		});
		
		it("setSVGpolyPoints",()=>{
			// テスト用ノードの上書き
			shapeNode = document.createElement("shape");
			shapeNode.setAttribute("points","100,50 200,10 20,100 100,50");
			let canvas = document.createElement("canvas");
			let result = pathrenderer.setSVGpolyPoints(shapeNode, canvas, null, flagPattern.clickable, SvgMapElementType.POLYGON, flagPattern, null);
			expect(result).toEqual(flagPattern.polygon);
		});
    });
});

