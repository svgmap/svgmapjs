import {it, jest} from '@jest/globals';
import * as fs from "node:fs/promises";
import {GenericMatrix} from "../libs/TransformLib";

// query utilities:
import {
    getByLabelText,
    getByText,
    getByTestId,
    queryByTestId,
    // Tip: all queries are also exposed on an object
    // called "queries" which you could import here as well
    waitFor,
  } from '@testing-library/dom'
  


//================================================================
// mocking 結構カオスになりそう
//================================================================
const mockMethod = jest.fn();
const mockMethodReturnTrue = jest.fn().mockReturnValue(true);
const mockMethodReturnArray = jest.fn();
const mockMethodreturnString = jest.fn();
const mockGeoViewBox = jest.fn().mockReturnValue({x:0, y:0});
const mockRootLayersProps = jest.fn().mockReturnValue([]);

const original_document = window.document;

const documentObject = {
    ...original_document,
    parentNode:{
        insertBefore: jest.fn(),
        getElementById: jest.fn().mockReturnThis(),
        getElementsByTagName: jest.fn().mockReturnValue([this]),
        appendChild: jest.fn(),
        removeChild: jest.fn()
    },
    dataset:{
        src: ""
    },
    getAttribute: jest.fn(),
    style:{},
    attributes:[],
    addEventListener: jest.fn(),
    setAttribute:jest.fn(),
    appendChild: jest.fn(),
    childNodes: jest.fn(),
    insertBefore: jest.fn(),
    getElementById: jest.fn().mockReturnThis(),
    getElementsByTagName: jest.fn().mockReturnValue([]),
    appendChild: jest.fn(),
    removeChild: jest.fn()
}

jest.spyOn(document, 'getElementById').mockReturnValue(documentObject);
jest.spyOn(document, 'getElementsByTagName').mockReturnValue(documentObject);
jest.spyOn(document, 'createElement').mockReturnValue(documentObject);
jest.spyOn(document.body,"appendChild").mockReturnValue();
jest.spyOn(document.documentElement, "appendChild").mockReturnValue();
global.navigator.geolocation = {getCurrentPosition: jest.fn()}
// masked console.log
jest.spyOn(console, "log").mockReturnValue();
jest.spyOn(console, "warn").mockReturnValue();

//================================================================
// mocking 結構カオスになった
//================================================================

jest.unstable_mockModule('../libs/MapViewerProps.js', () => ({
    MapViewerProps: jest.fn().mockImplementation(() => ({
        constructor: mockMethod,
        hasUaProps: mockMethod,
        mapCanvas: documentObject,
        mapCanvasSize:{
            width: 0,
            height: 0
        },
        rootViewBox:{
            width: 0,
            height: 0
        },
        root2Geo: "",
        setMapCanvasSize: mockMethod,
        setRootViewBox: mockMethod,
        hasMapCanvasSize: mockMethodReturnTrue,
    })),
}));
jest.unstable_mockModule('../libs/LayerManager.js', () => ({
    LayerManager: jest.fn().mockImplementation(() => ({
        constructor: mockMethod,
        setRootLayersProps: mockMethod,
        getRootLayersProps: mockRootLayersProps,
        setLayerVisibility: mockMethod
    })),
}));
jest.unstable_mockModule('../libs/ResourceLoadingObserver.js',()=>({
    ResourceLoadingObserver:jest.fn().mockImplementation(() => ({
        constructor:mockMethod,
        checkLoadCompleted: jest.fn(),
        init: jest.fn(),
        loadingImgs:{
            root: false
        },
        getLoadCompleted: jest.fn(),
        setLoadCompleted: jest.fn()
    }))
}));
jest.unstable_mockModule('../SVGMapLv0.1_LayerUI_r6module.js',()=>({
    SvgMapLayerUI:jest.fn().mockImplementation(() => ({
        constructor:mockMethod,
    }))
}));
jest.unstable_mockModule('../libs/EssentialUIs.js', () => ({
    EssentialUIs: jest.fn().mockImplementation(() => ({
        constructor: mockMethod,
        setGeoCenter:mockMethod,
        setGeoViewPort: mockMethod,
        setUpdateCenterPos: mockMethod,
        setMapCanvasCSS: mockMethod,
        setGeoViewBox: jest.fn(),
        setPointerEvents: jest.fn(),
        setUpdateCenterPos:jest.fn(),
        screen2Geo:jest.fn().mockReturnValue({lat:34,lng:130}),
        updateCenterPos:jest.fn(),
        setCenterUI:jest.fn(),
        initNavigationUIs: jest.fn(),
        getVerticalScreenScale: jest.fn().mockReturnValue(1),
        getGeoViewBox: mockGeoViewBox,
        initMapCanvas: mockMethodreturnString.mockReturnValue("http://localhost/container.svg"),
    })),
}));
jest.unstable_mockModule('../libs/ZoomPanManager.js', () => ({
    ZoomPanManager: jest.fn().mockImplementation(() => ({
        setSmoothZoomInterval: mockMethod,
        setSmoothZoomTransitionTime: mockMethod,
        transform:mockMethod,
        setZoomRatio: mockMethod,
        zoomup: mockMethod,
        zoomdown: mockMethod
    })),
}));

jest.unstable_mockModule('../libs/MapTicker.js',()=>({
    MapTicker: jest.fn().mockImplementation(()=>({ 
        constructor: mockMethod,
        initModal: jest.fn().mockReturnValue(documentObject),
        showUseProperty: mockMethod,
        showPage: mockMethod,
        hideTicker:jest.fn(),
        isEnabled: jest.fn().mockReturnValue(true),
        checkTicker: jest.fn(),
        pathHitTester:{
            setCentralVectorObjectsGetter: jest.fn(),
            clear: jest.fn()
        },
        poiHitTester:{
            setCentralVectorObjectsGetter: jest.fn(),
            setPoiBBox: jest.fn(),
            clear: jest.fn()
        },
        showPoiProperty:
            {
                showModal: mockMethod,
                setShowPoiProperty: mockMethod,
                parseEscapedCsvLine: mockMethod
            },
        getTickerMetadata: jest.fn()
    })),
}));
//================================================================

describe("unittest for SVGMap Core Module", ()=>{
    let svgDocString="";
    beforeEach(async ()=>{
        // XHRで取得するデータを設定
        svgDocString = await fs.readFile("./resources/svgDoc_singleSymbol.svg", "UTF-8");
        const xhrMock = {
            open: jest.fn(),
            send: jest.fn().mockImplementation(()=>{xhrMock.onreadystatechange();}),
            onreadystatechange: jest.fn(),
            setRequestHeader: jest.fn(),
            readyState: 4,
            status: 200,
            responseText: svgDocString
        };
        jest.spyOn(window, 'XMLHttpRequest').mockImplementation(() => xhrMock);
    });
    describe("refer to own classes.",()=>{
        let svgmap, result, element, svgDoc;
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
            mockMethod.mockClear();
        });
        afterEach(()=>{
            mockMethod.mockClear();
        });
        it("setSummarizeCanvas",()=>{
            // 基本True（コード内にFalseは”だいぶ昔に消滅”と記述あり）
            svgmap.setSummarizeCanvas(true);
        });

        it("test of updateLayerListUI.",()=>{
            //registLayerUiSetterを用いて外部から関数を設定されたときに確認べき内容？
            svgmap.updateLayerListUI();
        });
        it("getDevicePixelRatio (no argument)", ()=>{
            // TODO: 引数によって戻り値が異なるため要注意
            result = svgmap.getDevicePixelRatio();
            expect(result).toStrictEqual(
                {
                    "commonDevicePixelRatio":expect.anything(),
                    "layerDevicePixelRatio":expect.anything()
                }
            );
        });
        it("getDevicePixelRatio (with argument)", ()=>{
            // TODO: 引数によって戻り値が異なるため要注意
            result = svgmap.getDevicePixelRatio("root");
            expect(result).toStrictEqual(1.0);
        });

        it("setDevicePixelRatio", ()=>{
            result = svgmap.setDevicePixelRatio();
            expect(result).toBeFalsy(); // エラーがないことだけ確認
        });

        it("loadSVG", ()=>{
            document.body.innerHTML =
            '<div>' +
            '  <input type="checkbox" data-testid="button" onclick="" />' +
            '</div>';
            let button = document.getElementById('button');
            svgmap.loadSVG("/Container.svg", "root", button);
        });
        it("getViewBox",()=>{
            const parser = new DOMParser();
            svgDoc = parser.parseFromString(svgDocString, "text/xml");
            let viewbox = svgmap.getViewBox(svgDoc);
            expect(viewbox).toStrictEqual({x:13500.0,y:-3375.0,width:1125.0,height:1125.0});
        });
        it("initLoad", ()=>{
            // 確認観点はエラーが出力されないことのみ
            svgmap.initLoad();
        });
        it("ignoreMapAspect", ()=>{
            // 確認観点はエラーが出力されないことのみ
            svgmap.ignoreMapAspect();
        });
    });
    
    describe("refer to EssentialUIs classes.",()=>{
        // 当ブロックはエラーがないこととCoverage計算の簡略化を目的に記載しています
        let svgmap, result, element;
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
            mockMethod.mockClear();
        });
        afterEach(()=>{
            mockMethod.mockClear();
        });
        it("setMapCanvasCSS", ()=>{
            result = svgmap.setMapCanvasCSS({style:{}}); 
        });
        it("setUpdateCenterPos", ()=>{
            //これは関数自体の挙動を書き換えるため試験不可
            result = svgmap.setUpdateCenterPos(function(){});
            //expect(result).toBeUndefined();
            //expect(mockMethod).toHaveBeenCalledWith();
        });
        it("setGeoViewPort", ()=>{
            result = svgmap.setGeoViewPort();
            expect(result).toBeFalsy();
            expect(mockMethod).toHaveBeenCalledWith();
        });
        it("setGeoCenter", ()=>{
            result = svgmap.setGeoCenter(40,140);
            expect(result).toBeFalsy();
            expect(mockMethod).toHaveBeenCalledWith(40,140);
        });
        it("screen2Geo", ()=>{
            result = svgmap.screen2Geo(100,110); //後ろでたたく関数をMock化しているため戻り値はでたらめです
            expect(result).toStrictEqual({lat:expect.anything(),lng:expect.anything()});
        });
        it("reLoadLayer",()=>{
            svgmap.reLoadLayer();
        });
        it("registLayerUiSetter.", ()=>{
            // カバレッジを増やすためだけの試験
            svgmap.registLayerUiSetter(jest.fn(), jest.fn());
        });
        it("getVerticalScreenScale", ()=>{
            // 確認観点はエラーが出力されないことのみ
            svgmap.getVerticalScreenScale(10);
        })
    });
    
    describe("refer to other classes.",()=>{
        // 当ブロックはエラーがないこととCoverage計算の簡略化を目的に記載しています
        let svgmap, result, element;
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
            mockMethod.mockClear();
        });

        afterEach(()=>{
            mockMethod.mockClear();
        });

        // refer to MapviewerProps
        it("setMapCanvas", ()=>{
            let mapcanvas = new Object();
            result = svgmap.setMapCanvas(mapcanvas);
            expect(result).toBeUndefined();
        });
        
        it("setMapCanvasSize", ()=>{
            result = svgmap.setMapCanvasSize({x:10,y:20,width:100,height:200}); 
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith({x:10,y:20,width:100,height:200});
        });

        it("getUaProp", ()=>{
            // ISSUE: uaPropsの作成は以下の通り。mapViewerPropsをインスタンス化する際にコンストラクタで作成するほうがスマートでは？
            // this.#mapViewerProps.uaProps = new UAtester();
            result = svgmap.getUaProp();
            expect(result).toStrictEqual({
                isIE:expect.anything(),
                isSP:expect.anything(),
                // ISSUE: UAtesterオブジェクトにもisIEとisSPがあり、重複しているため整理が必要
                uaProp:expect.anything() // = UAtesterObject
            });
        });

        // refer to LayerManager

        it("setRootLayersProps", ()=>{
            result = svgmap.setRootLayersProps(); 
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });

        it("setRootLayersProps", ()=>{
            result = svgmap.setLayerVisibility(); 
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });

        // refer to ResumeManager
        // DOMが絡むため別ファイルにする方がスマートかも？
        
        it("setResume", ()=>{
            svgmap.setResume(true);
        });

        it("resumeToggle(toggle off->on)",async ()=>{
            document.body.innerHTML =
            '<div>' +
            '  <input type="checkbox" data-testid="button" onclick="" />' +
            '</div>';
            let button = getByTestId(document.body,'button');
            button.addEventListener("click",(e)=>{svgmap.resumeToggle(e)});
            
            result = await button.click();
            expect(svgmap.getResume()).toBeTruthy();
        });
        it("resumeToggle(toggle on->off)",()=>{
            document.body.innerHTML =
            '<div>' +
            '  <input type="checkbox" data-testid="button" checked=true onclick="" />' +
            '</div>';
            let button = getByTestId(document.body,'button');
            button.addEventListener("click",(e)=>{svgmap.resumeToggle(e)});
            
            button.click();
            expect(svgmap.getResume()).toBeFalsy();
        });

        // refer to ProxyManager

        it("setProxyURLFactory", ()=>{
            let func = function(){};
            result = svgmap.setProxyURLFactory(func, func);
        });

        // refer to CustomModal

        it("setCustomModal", ()=>{
            // Look&feelの部分が多いため、試験する優先度は低め
            // TODO: 本当はClickの挙動とかも見たいのですが、今は無理
            result = svgmap.setCustomModal();
            expect(result).toBeFalsy();
        });

        // refer to UtilFuncs

        it("numberFormat. argument is normal.", ()=>{
            result = svgmap.numberFormat(3.1415925434,5);
            expect(result).toBe(3.14159);
        });
        it("numberFormat. argument is minimum.", ()=>{
            result = svgmap.numberFormat(3.1415925434,0);
            expect(result).toBe(3.1415925);  //ISSUE:これはあるべき姿？0を指定したら整数が返ってきてほしい(デフォルトの7桁で計算されてしまっている)
        });
        it("numberFormat. argument is minimum.", ()=>{
            result = svgmap.numberFormat(3.1415925434,1);
            expect(result).toBe(3.1);
        });
        it("numberFormat. argument of digit is null", ()=>{
            result = svgmap.numberFormat(3.1415925434);
            expect(result).toBe(3.1415925);
        });
        
        it("isIntersect. rect1 overlap with rect2.", ()=>{
            const rect1 = {x:10,y:10,width:70,height:40, nonScaling:false};
            const rect2 = {x:50,y:35,width:5,height:5, nonScaling:false};
            result = svgmap.isIntersect(rect1,rect2);
            expect(result).toBeTruthy();
        });
        it("isIntersect. rect1 overlap with a part of rect2", ()=>{
            const rect1 = {x:10,y:10,width:70,height:40, nonScaling:false};
            const rect2 = {x:50,y:35,width:100,height:100, nonScaling:false};
            result = svgmap.isIntersect(rect1,rect2);
            expect(result).toBeTruthy();
        });
        it("isIntersect. rect1 is far away from rect2", ()=>{
            const rect1 = {x:10,y:10,width:70,height:40, nonScaling:false};
            const rect2 = {x:100,y:100,width:100,height:100, nonScaling:false};
            result = svgmap.isIntersect(rect1,rect2);
            expect(result).toBeFalsy();
        });
        it("isIntersect. rect1 overlap with rect2(nonScaling Option is True).", ()=>{
            const rect1 = {x:10,y:10,width:70,height:40, nonScaling:false};
            const rect2 = {x:50,y:35,width:5,height:5, nonScaling:true};
            result = svgmap.isIntersect(rect1,rect2);
            expect(result).toBeTruthy();
        });
        it("isIntersect. rect1 is far away from rect2(nonScaling Option is True).", ()=>{
            const rect1 = {x:10,y:10,width:70,height:40, nonScaling:false};
            const rect2 = {x:100,y:100,width:100,height:100, nonScaling:true};
            result = svgmap.isIntersect(rect1,rect2);
            expect(result).toBeFalsy();
        });
        
        // refer to LinkedDocOp
        it("LinkedDocOp. one time",()=>{
            // ここは関数として呼び出せるかの試験
            // 再起処理の試験はLinkedDocOp.jsの試験で実施する
            const recursiveFunc = jest.fn();
            svgmap.linkedDocOp(recursiveFunc,"root","param1");
            expect(recursiveFunc).toHaveBeenCalledTimes(1);
        });

        // refer to GPS
        it("gps function. get position from gps & move position on map.", ()=>{
            result = svgmap.gps();
            expect(result).toBe();
        });

    });
    
    describe("refer to MapTicker classes.",()=>{
        // 当ブロックはエラーがないこととCoverage計算の簡略化を目的に記載しています
        let svgmap, result, element;
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
        });
        afterEach(()=>{
            mockMethod.mockClear();
        });
        it("setShowPoiProperty", ()=>{
            let propFunc = function(){};
            let result = svgmap.setShowPoiProperty(propFunc, "i10"); 
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith(propFunc, "i10");
        });

        it("showModal", ()=>{
            let result = svgmap.showModal(); 
            expect(result).toBeUndefined();
        });

        it("showPage", ()=>{
            let result = svgmap.showPage(); 
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });
        
        it("showUseProperty", ()=>{
            let result = svgmap.showUseProperty(); 
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });

        it("parseEscapedCsvLine", ()=>{
            result = svgmap.parseEscapedCsvLine("");
        });
        
        it("getTickerMetadata", ()=>{
            // dynamicLoad()時にcheckTikerが呼ばれる
            // #mapTicker.getTickerMetadataはMock化しているため何も返ってきません。
            // 単体試験は./MapTicker.test.jsで行う
            result = svgmap.getTickerMetadata();
        });
    });

    describe("refer to SVGMapLv0.1_LayerUI_r6module classes.",()=>{
        // 当ブロックはエラーがないこととCoverage計算の簡略化を目的に記載しています
        let svgmap, result, element;
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
            mockMethod.mockClear();
        });
        afterEach(()=>{
            mockMethod.mockClear();
        });
        it("",()=>{
            console.log();
        });
    });

    describe("refer to MapviewerProps classes.",()=>{
        // 当ブロックはエラーがないこととCoverage計算の簡略化を目的に記載しています
        let svgmap, result, element;
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
            mockMethod.mockClear();
        });

        it("setRootViewBox",()=>{
            result = svgmap.setRootViewBox({x:10,y:100,width:800,height:300});
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith({x:10,y:100,width:800,height:300});
        });
    });

    describe("refer to transformlib classes.",()=>{
        // 当ブロックはエラーがないこととCoverage計算の簡略化を目的に記載しています
        let svgmap, result, element;
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
        });
        afterEach(()=>{
            mockMethod.mockClear();
        });
        it("transform", ()=>{
            result = svgmap.transform();
            expect(result).toBeInstanceOf(Object);
            expect(mockMethod).toHaveBeenCalledWith();
        });

        it("matMul", ()=>{
            let m1 = new GenericMatrix();
            let m2 = new GenericMatrix();
            result = svgmap.matMul(m1, m2);
            expect(result).toBeInstanceOf(Object);
        });
        
        it("getTransformedBox", ()=>{
            let matrix = new GenericMatrix();
            matrix.setLinearCRS(1,2,3,4,5,6);
            let inBox = {x:100, y:20, width: 1000, height: 300};
            result = svgmap.getTransformedBox(inBox, matrix);
            expect(result).toStrictEqual({
                x: 165,
                y: 286,
                width: 1900,
                height: 3200
            });  //MEMO: 手計算してないのであっているかは不明
        });
        
    });

    describe("refer to zoompanmanager classes.",()=>{
        // 当ブロックはエラーがないこととCoverage計算の簡略化を目的に記載しています
        let svgmap, result, element, mock;
        afterEach(()=>{
            mockMethod.mockClear();
        });
        beforeEach(async () => {
            const {SvgMap} = await import("../SVGMapLv0.1_Class_r18module");
            svgmap = new SvgMap();
            svgmap.initLoad();
            mockMethod.mockClear();
        });
        it("setSmoothZoomInterval", ()=>{
            result = svgmap.setSmoothZoomInterval();
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });
        it("setSmoothZoomTransitionTime", ()=>{
            result = svgmap.setSmoothZoomTransitionTime();
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });
        it("setZoomRatio", ()=>{
            result = svgmap.setZoomRatio(0.1);
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith(0.1);
        });
        it("zoomDown", ()=>{
            result = svgmap.zoomdown();
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });
        it("zoomUp", ()=>{
            result = svgmap.zoomup();
            expect(result).toBeUndefined();
            expect(mockMethod).toHaveBeenCalledWith();
        });
    });
});
