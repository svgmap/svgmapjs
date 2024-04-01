import {jest} from "@jest/globals";

// 単体試験で頻繁に使用するオブジェクトをmock化してます

const mock_svgmapObj = {
    refreshScreen: jest.fn(), 
    getSvgImagesProps: jest.fn().mockReturnValue({
        "root":{"Path":{"location":{"href":"aaa"}}},
    }),
    getSvgImages: jest.fn(),
    getRootLayersProps: jest.fn().mockReturnValue([]),
    getGeoViewBox: jest.fn().mockReturnValue({"x":0,"y":0,"width":0,"height":0})
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