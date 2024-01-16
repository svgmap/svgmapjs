import {UAtester} from "../libs/UAtester";

// https://stackoverflow.com/questions/73018146/jest-repeatedly-mock-navigator-test-against-useragent-vendor
// https://kzstock.blogspot.com/2023/01/useragent20230104.html
const browserDevices = [
    {
        browser:'Chrome',
        os:'android',
        userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
        smartPhone: true
    },{
        browser:'Safari',
        os:'iOS',
        userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1 OPT/3.4.0',
        smartPhone: true
    },{
        browser:'Chrome',
        os:'Windows',
        userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        smartPhone: false
    },{
        browser:'Firefox',
        os:'Windows',
        userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        smartPhone: false
    },{
        browser:'Edge',
        os:'Windows',
        userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        smartPhone: false
    },
];

describe.each(browserDevices)('returns $os', (device) => {

    const { userAgent: originalUserAgent } = window.navigator;

    beforeEach(() => {
        Object.defineProperty(window, 'navigator', {
            configurable: true,
            writable: true,
            value: { userAgent: device.userAgent, vendor: device.vendor },
        });
    });

    afterEach(() => {
        Object.defineProperty(window, 'navigator', {
            configurable: true,
            value: originalUserAgent,
        });
    });

    it(`returns ${device.browser}`, () => {
        let ua = new UAtester();
        expect(ua.isSP).toBe(device.smartPhone);
        expect(ua.checkBrowserName).toBe(device.name);
    });
});
