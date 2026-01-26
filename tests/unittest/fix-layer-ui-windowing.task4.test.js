import { beforeAll, it, describe, expect, jest } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

describe("Task 4: Popup duplication prevention and focus control", () => {
    let handler;
    let mockSvgMap;
    
    beforeAll(() => {
        mockSvgMap = {
            registLayerUiSetter: jest.fn(),
            getRootLayersProps: jest.fn().mockReturnValue({
                layer1: { target: "_blank" }
            }),
            getSvgImagesProps: jest.fn().mockReturnValue({}),
        };
        // Mock document elements for initialization
        const mockElem = {
            ownerDocument: document,
            style: {},
            appendChild: jest.fn(),
        };
        jest.spyOn(document, "getElementById").mockReturnValue(mockElem);
        jest.spyOn(document, "createElement").mockReturnValue(mockElem);

        handler = new LayerSpecificWebAppHandler(mockSvgMap, {}, jest.fn());
        handler.initLayerSpecificUI();
    });

    it("should focus existing window if already open", () => {
        const lid = "layer1";
        const mockFocus = jest.fn();
        const mockWindow = {
            closed: false,
            focus: mockFocus
        };
        
        // Setup internal state (this relies on task 3 unify #popupWindows as object)
        // Accessing private field via string indexing if necessary or just testing public method side effect
        // Since we can't easily set private field, we trigger it via initPopup first
        
        global.window.open = jest.fn().mockReturnValue(mockWindow);
        
        // First call should open
        handler.showLayerSpecificUI(lid, "test.html");
        expect(global.window.open).toHaveBeenCalled();
        
        // Second call should focus
        handler.showLayerSpecificUI(lid, "test.html");
        expect(mockFocus).toHaveBeenCalled();
        expect(global.window.open).toHaveBeenCalledTimes(1);
    });
});
