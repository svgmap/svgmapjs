import { beforeAll, it, describe, expect, jest, afterEach } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";
import { SvgMapLayerUI } from "../../SVGMapLv0.1_LayerUI_r6module.js";

describe("Task 7: Compatibility and Button Visibility", () => {
    let handler;
    let layerUI;
    let mockSvgMap;
    let mockBody;
    let mockLayerList;
    
    beforeAll(() => {
        const layers = [
            { id: "layer1", visible: true, target: "_blank", title: "Layer 1", hasDocument: true, svgImageProps: { controller: { url: "test.html" } } }
        ];
        const mockProps = [...layers];
        layers.forEach(l => mockProps[l.id] = l);

        mockSvgMap = {
            registLayerUiSetter: jest.fn().mockImplementation((init, update) => {
                mockSvgMap.initUI = init;
                mockSvgMap.updateUI = update;
            }),
            getRootLayersProps: jest.fn().mockReturnValue(mockProps),
            getSvgImagesProps: jest.fn().mockReturnValue({
                layer1: { controller: { url: "test.html" } }
            }),
            getSvgImages: jest.fn().mockReturnValue({
                layer1: {}
            }),
            refreshScreen: jest.fn()
        };

        mockLayerList = {
            id: "layerList",
            getAttribute: jest.fn(),
            appendChild: jest.fn(),
            style: {},
            ownerDocument: document,
            addEventListener: jest.fn()
        };

        mockBody = {
            childNodes: [],
            appendChild: jest.fn().mockImplementation(function(node) {
                this.childNodes.push(node);
            }),
            style: {},
            ownerDocument: document,
            getAttribute: jest.fn(),
            getElementById: jest.fn().mockImplementation((id) => {
                if (id === "layerTable") return mockTable;
                return mockBody.childNodes.find(n => n.id === id) || null;
            })
        };

        const mockTable = {
            id: "layerTable",
            childNodes: [],
            appendChild: jest.fn().mockImplementation(function(node) {
                this.childNodes.push(node);
            }),
            removeChild: jest.fn().mockImplementation(function(node) {
                const idx = this.childNodes.indexOf(node);
                if (idx > -1) this.childNodes.splice(idx, 1);
            }),
            offsetHeight: 100
        };

        const mockTableDiv = {
            id: "layerTableDiv",
            style: {},
            scrollTop: 0,
            childNodes: [mockTable]
        };

        jest.spyOn(document, "getElementById").mockImplementation((id) => {
            if (id === "layerSpecificUI") return mockBody;
            if (id === "layerTable") return mockTable;
            if (id === "layerTableDiv") return mockTableDiv;
            if (id === "layerList") return mockLayerList;
            if (id === "layerListmessage") return { innerHTML: "", title: "" };
            
            // Find in mock nodes
            let found = mockBody.childNodes.find(n => n.id === id);
            if (found) return found;
            found = mockTable.childNodes.find(n => n.id === id);
            if (found) return found;
            // Support searching in TR children
            for (let tr of mockTable.childNodes) {
                if (tr.childNodes) {
                    for (let td of tr.childNodes) {
                        if (td.childNodes) {
                            let btn = td.childNodes.find(n => n.id === id);
                            if (btn) return btn;
                        }
                    }
                }
            }
            return null;
        });

        jest.spyOn(document, "createElement").mockImplementation((tag) => {
            const elem = {
                id: "",
                tag,
                style: {},
                ownerDocument: document,
                appendChild: jest.fn().mockImplementation(function(node) {
                    if (!this.childNodes) this.childNodes = [];
                    this.childNodes.push(node);
                }),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                getAttribute: jest.fn(),
                setAttribute: jest.fn(),
                childNodes: [],
                parentNode: { removeChild: jest.fn() },
                contentWindow: { 
                    document: { 
                        readyState: "complete", 
                        addEventListener: jest.fn(),
                        removeEventListener: jest.fn(),
                        URL: "http://localhost/",
                        write: jest.fn(),
                        close: jest.fn(),
                        documentElement: { offsetWidth: 100 },
                        body: { offsetHeight: 100 }
                    },
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    XMLHttpRequest: { prototype: { send: jest.fn(), open: jest.fn() } },
                    fetch: jest.fn().mockResolvedValue({}),
                    Response: { prototype: { blob: jest.fn(), text: jest.fn() } }
                }
            };
            if (tag === "div") elem.scrollTop = 0;
            return elem;
        });

        handler = new LayerSpecificWebAppHandler(mockSvgMap, {}, jest.fn());
        layerUI = new SvgMapLayerUI(mockSvgMap, handler);
        handler.setLayerUIobject(layerUI);
        handler.initLayerSpecificUI();
        
        // Initialize UI components
        mockSvgMap.initUI({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("7.1 should keep layerUiButton visible and enabled when UI is windowed", () => {
        const lid = "layer1";
        const mockWindow = {
            closed: false,
            close: jest.fn(),
            focus: jest.fn(),
            location: { href: "" },
            document: { 
                write: jest.fn(), 
                close: jest.fn(), 
                readyState: "complete", 
                createEvent: jest.fn().mockReturnValue({ initEvent: jest.fn() }), 
                dispatchEvent: jest.fn(),
                URL: "http://localhost/",
                documentElement: { offsetWidth: 100 },
                body: { offsetHeight: 100 }
            },
            XMLHttpRequest: { prototype: { send: jest.fn(), open: jest.fn() } },
            fetch: jest.fn().mockResolvedValue({}),
            Response: { prototype: { blob: jest.fn(), text: jest.fn() } }
        };
        global.window.open = jest.fn().mockReturnValue(mockWindow);

        // Initial UI update to create the button
        mockSvgMap.updateUI();

        const btn = document.getElementById("bt_" + lid);
        expect(btn).not.toBeNull();
        expect(btn.style.visibility).toBe("visible");
        expect(btn.disabled).toBe(false);

        // Open as popup
        handler.showLayerSpecificUI(lid, "test.html");

        // Update UI again
        mockSvgMap.updateUI();

        // Button should still be visible and enabled
        const btnAfter = document.getElementById("bt_" + lid);
        expect(btnAfter).not.toBeNull();
        expect(btnAfter.style.visibility).toBe("visible");
        expect(btnAfter.disabled).toBe(false);
    });
});
