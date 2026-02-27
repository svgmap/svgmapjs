import { beforeAll, it, describe, expect, jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

describe("Task 5: Window close monitoring and UI sync", () => {
    let handler;
    let mockSvgMap;
    let mockLayerUI;
    
    beforeAll(() => {
        mockSvgMap = {
            registLayerUiSetter: jest.fn(),
            getRootLayersProps: jest.fn().mockReturnValue({
                layer1: { target: "_blank", id: "layer1" }
            }),
            getSvgImagesProps: jest.fn().mockReturnValue({
                layer1: {}
            }),
            getSvgImages: jest.fn().mockReturnValue({
                layer1: {}
            }),
        };
        mockLayerUI = {
            updateLayerTable: jest.fn()
        };
        
        // Mock document elements for initialization
        const mockElem = {
            ownerDocument: document,
            style: {},
            appendChild: jest.fn(),
            addEventListener: jest.fn(),
        };
        jest.spyOn(document, "getElementById").mockReturnValue(mockElem);
        jest.spyOn(document, "createElement").mockReturnValue(mockElem);

        handler = new LayerSpecificWebAppHandler(mockSvgMap, {}, jest.fn());
        handler.setLayerUIobject(mockLayerUI);
        handler.initLayerSpecificUI();
    });

    it("should detect window close and call UI update", (done) => {
        const lid = "layer1";
        const mockWindow = {
            closed: false,
            focus: jest.fn(),
            location: { href: "" },
            document: { write: jest.fn(), close: jest.fn(), readyState: "complete" },
            XMLHttpRequest: {
                prototype: {
                    send: jest.fn(),
                    open: jest.fn()
                }
            },
            fetch: jest.fn().mockResolvedValue({}),
            Response: {
                prototype: {
                    blob: jest.fn(),
                    text: jest.fn(),
                    arrayBuffer: jest.fn(),
                    formData: jest.fn(),
                    json: jest.fn()
                }
            }
        };
        
        global.window.open = jest.fn().mockReturnValue(mockWindow);
        
        // Open popup
        handler.showLayerSpecificUI(lid, "test.html");
        
        // Simulate window close after some time
        setTimeout(() => {
            mockWindow.closed = true;
        }, 50);

        // Check if UI update is called
        // Since we use setInterval (500ms), we need to wait long enough
        setTimeout(() => {
            try {
                expect(mockLayerUI.updateLayerTable).toHaveBeenCalled();
                done();
            } catch (error) {
                done(error);
            }
        }, 1000);
    });
});
