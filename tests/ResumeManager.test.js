import { ResumeManager } from "../libs/ResumeManager";
import {jest} from "@jest/globals";

const urlPatterns = [
	{
		description:"pure url",
		url:"http://hogehoge.com",
		checkResume: undefined
	},{
		description:"url + a query parameter.",
		url:"http://hogehoge.com?param=1",
		checkResume: undefined
	},{
		description:"url + multi query parameters.",
		url:"http://hogehoge.com?param=1&param2",
		checkResume: undefined 
	},{
		description:"url + hash tag",
		url:"http://hogehoge.com#param=1",
		checkResume: undefined
	},{
		description:"url + hash tag(multi parameters)",
		url:"http://hogehoge.com#param=1&param2",
		checkResume: undefined
	}
]

describe("target ResumeManager.",()=>{
	describe.each(urlPatterns)("check to $description",(pattern)=>{
		let resumemanager;
		
		let mock_svgMapObject, mock_svgMapCustomLayersManager, mock_parseSVGfunc;
		let mock_localstorage, mock_location;
		beforeAll(()=>{
			mock_svgMapObject = {
				"getSvgImagesProps": jest.fn().mockReturnValue({
					"root":{"Path":{"location":{"href":"aaa"}}},
				}),
				"getSvgImages": jest.fn(),
				"getRootLayersProps": jest.fn().mockReturnValue([]),
				"getGeoViewBox": jest.fn().mockReturnValue({"x":0,"y":0,"width":0,"height":0})
			};
			mock_svgMapCustomLayersManager = jest.fn();
			mock_parseSVGfunc = jest.fn();
			
			resumemanager = new ResumeManager(mock_svgMapObject, mock_svgMapCustomLayersManager, mock_parseSVGfunc);
		});
		beforeEach(()=>{
			mock_location = jest.spyOn(global, 'location', 'get').mockReturnValue({ href: 'http://kondokoso.com', pathname: "/main.svg", "origin":"http://hontohakotti.com"});
		});
		afterEach(()=>{
			if(mock_location != null){
				mock_location.mockClear();
				mock_location.mockReset();
			}
		});
		// ブラウザにかかわるところは専用のクラスを用いると試験しやすい
		it("check Resume",()=>{
			//こういう書き方はできない
			//global.location.href = "http://nandatte.com"
			let dummy_documentElemnt;
			let dummy_symobls;
			
			let result = resumemanager.checkResume(dummy_documentElemnt, dummy_symobls);
			expect(result).toBe(pattern.checkResume);
		});

		it("get PermanentLink",()=>{
			let result = resumemanager.getBasicPermanentLink(false);
			expect(result).toBe();
		});
	});
});
