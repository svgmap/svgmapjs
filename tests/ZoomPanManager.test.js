import {ZoomPanManager} from "../libs/ZoomPanManager";
import {jest} from "@jest/globals";
import * as fs from "node:fs/promises";

const basePath = "./resources/zoompanmanager/";
const devices = [
    {
        // SmartPhone
        device: "smartPhone",
        smartPhone: true,
        clickEvent:{
            eventFile: "touchEventForSmartPhone.json",
            correct: {"x": 300, "y": 500}
        },
        scrollEvent:{
            eventFile: "touchEventForSmartPhone.json",
            correct: false
        },
    },{
        // PC
        device: "PC",
        smartPhone: false,
        clickEvent:{
            eventFile: "clickEventForPC.json",
            correct: {"x": 48, "y": 648}
        },
        scrollEvent:{
            eventFile: "scrollEventForPC.json",
            correct: false
        },
    }
];

describe("unittest for ZoomPanManager",()=>{
    describe.each(devices)("returns $device",(device)=>{
        let zoompanmanager, dummy_eventData;
        let mock_hideTickerFunc, mock_checkLoadCompletedFunc, mock_getObjectAtPointFunc, mock_getIntValueFunc, mock_getRootSvg2CanvasFunc, mock_mapViewerProps, mock_svgMapObj;
        beforeAll(()=>{
            mock_hideTickerFunc = jest.fn();
            mock_checkLoadCompletedFunc = jest.fn();
            mock_getObjectAtPointFunc = jest.fn();
            mock_getIntValueFunc = jest.fn();
            mock_getRootSvg2CanvasFunc = jest.fn();
            mock_mapViewerProps = {"uaProps":{"isIE":false}}    // IEは対象外とするため固定です
            mock_svgMapObj = jest.fn();

            zoompanmanager = new ZoomPanManager(mock_hideTickerFunc, mock_checkLoadCompletedFunc, mock_getObjectAtPointFunc, mock_getIntValueFunc, mock_getRootSvg2CanvasFunc, mock_mapViewerProps, mock_svgMapObj);
        });

        it("マウス座標の取得", async ()=>{
            const json = await fs.readFile(basePath + device.clickEvent.eventFile, "UTF-8");
            const dummy_eventData = JSON.parse(json,"text/xml");
            let result = zoompanmanager.getMouseXY(dummy_eventData);
            expect(result).toEqual(device.clickEvent.correct);
        });
        
        it("スクロール開始時の挙動", async ()=>{
            const json = await fs.readFile(basePath + device.scrollEvent.eventFile, "UTF-8");
            const dummy_eventData = JSON.parse(json);
            let result = zoompanmanager.startPan(dummy_eventData);
            expect(result).toEqual(device.scrollEvent.correct);
        });

        it("スクロール終了時の挙動", async ()=>{
            const json = await fs.readFile(basePath + device.scrollEvent.eventFile, "UTF-8");
            const dummy_eventData = JSON.parse(json);
            //let result = zoompanmanager.endPan(dummy_eventData);
            //expect(result).toEqual(device.scrollEvent.correct); // returnないので何を確認したらよいのか不明
        });
    });
});

