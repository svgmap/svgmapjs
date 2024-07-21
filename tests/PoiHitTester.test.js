import {PoiHitTester} from "../libs/PoiHitTester"

describe("",()=>{
	let poi;
	describe("",()=>{
		
		beforeAll(()=>{
			poi = new PoiHitTester();
		});

		beforeEach(()=>{
			for(let i = 0; i < 5; i++){
				poi.setPoiBBox(i.toString(), 5, 3, 5, 8);
			}
		});

		afterEach(()=>{
			poi.clear();
		});

		it("set POIs",()=>{
			let result = poi.getPoiObjectsAtPoint(7, 10); //データあり
			expect(result).toHaveLength(5);
			result = poi.getPoiObjectsAtPoint(100,100) //データなし
			expect(result).toHaveLength(0);
		});
	});

});
