import {jest} from "@jest/globals";

// 単体試験で頻繁に使用するオブジェクトをmock化してます
// TODO:以下のパラメータはSVGMapLv0.1_rXXmoduleに含まれており、いずれ外だしが必要
const mock_svgmapObj = {
    refreshScreen: jest.fn(), 
    getSvgImagesProps: jest.fn().mockReturnValue({
        "root":{"Path":{"location":{"href":"root.svg"}}},
        "i5":{"Path":{"location":{"href":"layer.svg"}},"CRS":""},
    }),
    getSvgImages: jest.fn().mockReturnValue({
        "root":{},
        "i3":{

        },
        "i5":{
            //無理やりdocumentを返しちゃっている
            createElement: jest.fn().mockReturnValue(document.createElement("use")),
            documentElement:{
                appendChild: jest.fn()
            }
        },
        "i7":{}
    }),
    getRootLayersProps: jest.fn().mockReturnValue([]),
    getGeoViewBox: jest.fn().mockReturnValue({"x":0,"y":0,"width":0,"height":0}),
    getMapCanvasSize: jest.fn().mockReturnValue({width: 1200, height: 800})
};

const mock_mapViewerProps = {
    mapCanvasSize:{
        width: 800,
        height: 600
    },
    rootViewBox:{
        width: 800,
        height: 600,
        x:500,
        y:450
    },
    rootCrs:{
        x:1,
        y:1
    },
    uaProps:{
        verIE:11
    },
    setRootViewBox:jest.fn()
};


export { mock_svgmapObj, mock_mapViewerProps };