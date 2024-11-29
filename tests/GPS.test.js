import {GPS} from "../libs/GPS";
import {jest} from "@jest/globals";

const userAgentPatterns =[
    {
        description: "smartPhone",
        uaProps:{
            isSP:true, //smartphone
            name:"Chrome",
            userAgent: "   Chrome"
        },
        correct:{
            lat: 30, 
            lng: 130,
            acc: 0.0001
        }
    },{
        description: "pc",
        uaProps:{
            isSP:false,
            name:"Chrome",
            userAgent: "   Chrome"
        },
        correct:{
            lat: 30, 
            lng: 130,
            acc: 0.0001
        }
    },{
        description: "smartPhone",
        uaProps:{
            isSP:true, //smartphone
            name:"Safari",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
        },
        correct:{
            lat: 50, 
            lng: 150,
            acc: 0.0001
        }
    }
]

describe("unittest for GPS",()=>{
    describe.each(userAgentPatterns)("$description and $uaProps.name",(ua)=>{
        let gps, mock_svgMapObj;
        let navigatorSpy, navigatorSpy4iFrame;
        const originalNavigator = { ...navigator };
        const originalGeolocation = { ...navigator.geolocation };

        beforeAll(()=>{
            mock_svgMapObj = {getUaProp:jest.fn().mockReturnValue(ua.uaProps), setGeoCenter:jest.fn(), gpsCallback:jest.fn()};

            let gpsButton = document.createElement("img");
            gpsButton.setAttribute("id", "gpsButton");
            document.body.appendChild(gpsButton);
        });

        beforeEach(()=>{
            // mocked getCurrentPosition.
            // refer to https://qiita.com/mistolteen/items/76c335107f9859cd537f
            
            // main Frame
            navigatorSpy = jest.spyOn(global, 'navigator', 'get');
            navigatorSpy.mockImplementation(() => ({
                ...originalNavigator,
                userAgent: ua.uaProps.userAgent,
                geolocation: {
                    ...originalGeolocation,
                    getCurrentPosition: (successCallback) => {
                        successCallback({
                            coords: {
                                accuracy: 1,
                                heading: null,
                                latitude: 30,
                                longitude: 130,
                                speed: null
                            },
                            timestamp: 1
                        })
                    }
                }
            }));

            gps = new GPS(mock_svgMapObj);
            window.svgMap = {gpsCallback:gps.gpsSuccess};
            let ifElement = document.getElementsByTagName("iframe")[0];
            if(ifElement){
                navigatorSpy4iFrame = jest.spyOn(ifElement.contentWindow, 'navigator', 'get');
                navigatorSpy4iFrame.mockImplementation(() => ({
                ...originalNavigator,
                userAgent: ua.uaProps.userAgent,
                geolocation: {
                    ...originalGeolocation,
                    getCurrentPosition: (successCallback) => {
                        successCallback({
                            coords: {
                                accuracy: 1,
                                heading: null,
                                latitude: 50,
                                longitude: 150,
                                speed: null
                            },
                            timestamp: 1
                        })
                    }
                }
                }));
            }
        });

        afterEach(()=>{
            //試験内容のリセット
            document.body.innerHTML="";
            
            navigatorSpy.mockClear();
            navigatorSpy.mockReset();
            navigatorSpy.mockRestore();
        });

        it("get geolocation",()=>{
            gps.gps();
            expect(mock_svgMapObj.setGeoCenter).toHaveBeenCalledWith(ua.correct.lat, ua.correct.lng, ua.correct.acc);
        });
    });
});