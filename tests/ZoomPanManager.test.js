import {ZoomPanManager} from "../libs/ZoomPanManager";
import {jest} from "@jest/globals";
import * as fs from "node:fs/promises";

describe("unittest for ZoomPanManager",()=>{
    describe("target ZoomPanManager class",()=>{
        let zoompanmanager, dummy_eventData;
        let mock_hideTickerFunc, mock_checkLoadCompletedFunc, mock_getObjectAtPointFunc, mock_getIntValueFunc, mock_getRootSvg2CanvasFunc, mock_mapViewerProps, mock_svgMapObj;
        beforeAll(()=>{
            mock_hideTickerFunc = jest.fn();
            mock_checkLoadCompletedFunc = jest.fn();
            mock_getObjectAtPointFunc = jest.fn();
            mock_getIntValueFunc = jest.fn();
            mock_getRootSvg2CanvasFunc = jest.fn();
            mock_mapViewerProps = {"uaProps":{"isIE":false}}
            mock_svgMapObj = jest.fn();

            zoompanmanager = new ZoomPanManager(mock_hideTickerFunc, mock_checkLoadCompletedFunc, mock_getObjectAtPointFunc, mock_getIntValueFunc, mock_getRootSvg2CanvasFunc, mock_mapViewerProps, mock_svgMapObj);
        });

        it("マウス座標の取得(PC)", async ()=>{
            const json = await fs.readFile("./resources/zoompanmanager/clickEventForPC.json", "UTF-8");
            const dummy_eventData = JSON.parse(json,"text/xml");
            let result = zoompanmanager.getMouseXY(dummy_eventData);
            expect(result).toEqual({"x": 48, "y": 648});
        });

        
        it("タッチ座標の取得(SmartPhone)", async ()=>{
            const json = await fs.readFile("./resources/zoompanmanager/touchEventForSmartPhone.json", "UTF-8");
            const dummy_eventData = JSON.parse(json,"text/xml");
            let result = zoompanmanager.getMouseXY(dummy_eventData);
            expect(result).toEqual({"x": 300, "y": 500});
        });
    });
});

