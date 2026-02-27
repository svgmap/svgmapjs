import { beforeAll, it, describe, expect, jest, afterEach } from "@jest/globals";
import { LayerSpecificWebAppHandler } from "../../libs/LayerSpecificWebAppHandler.js";

describe("Task 6: Lifecycle Integration", () => {
    let handler;
    let mockSvgMap;
    let mockLayerUI;
    let mockBody;
    
    beforeAll(() => {
        const layers = [
            { id: "layer1", visible: true, target: "_blank", title: "Layer 1" },
            { id: "layer2", visible: true, target: "_blank", title: "Layer 2" }
        ];
        const mockProps = [...layers];
        layers.forEach(l => mockProps[l.id] = l);

        mockSvgMap = {
            registLayerUiSetter: jest.fn(),
            getRootLayersProps: jest.fn().mockReturnValue(mockProps),
            getSvgImagesProps: jest.fn().mockReturnValue({
                layer1: {},
                layer2: {}
            }),
            getSvgImages: jest.fn().mockReturnValue({
                layer1: {},
                layer2: {}
            }),
            refreshScreen: jest.fn()
        };
        mockLayerUI = {
            updateLayerTable: jest.fn()
        };
        
        mockBody = {
            childNodes: [],
            appendChild: jest.fn().mockImplementation(function(node) {
                this.childNodes.push(node);
            }),
            style: {},
            ownerDocument: document,
            getElementById: jest.fn().mockImplementation((id) => {
                return mockBody.childNodes.find(n => n.id === id) || null;
            }),
            offsetHeight: 100
        };

        jest.spyOn(document, "getElementById").mockImplementation((id) => {
            if (id === "layerSpecificUI") return mockBody;
            if (id === "layerTable") return { appendChild: jest.fn() };
            return mockBody.childNodes.find(n => n.id === id) || null;
        });

        jest.spyOn(document, "createElement").mockImplementation((tag) => {
            return {
                id: "",
                tag,
                style: {},
                ownerDocument: document,
                appendChild: jest.fn(),
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
                        close: jest.fn()
                    },
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    XMLHttpRequest: { prototype: { send: jest.fn(), open: jest.fn() } },
                    fetch: jest.fn().mockResolvedValue({}),
                    Response: { prototype: { blob: jest.fn(), text: jest.fn() } }
                }
            };
        });

        handler = new LayerSpecificWebAppHandler(mockSvgMap, {}, jest.fn());
        handler.setLayerUIobject(mockLayerUI);
        handler.initLayerSpecificUI();
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockBody.childNodes = [];
    });

    function createMockWindow(name) {
        return {
            name: name,
            closed: false,
            close: jest.fn().mockImplementation(function() { 
                console.log("MockWindow close called for:", name);
                this.closed = true; 
            }),
            focus: jest.fn(),
            location: { href: "" },
            document: { 
                write: jest.fn(), 
                close: jest.fn(), 
                readyState: "complete", 
                createEvent: jest.fn().mockReturnValue({ initEvent: jest.fn() }), 
                dispatchEvent: jest.fn(),
                URL: "http://localhost/"
            },
            XMLHttpRequest: { prototype: { send: jest.fn(), open: jest.fn() } },
            fetch: jest.fn().mockResolvedValue({}),
            Response: { prototype: { blob: jest.fn(), text: jest.fn(), arrayBuffer: jest.fn(), formData: jest.fn(), json: jest.fn() } }
        };
    }

    it("6.1 should close window and cleanup when layer visibility is set to false", () => {
        const lid = "layer1";
        const mockWindow = createMockWindow("win1");
        global.window.open = jest.fn().mockReturnValue(mockWindow);
        const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
        
        handler.showLayerSpecificUI(lid, "test.html");
        
        const updatedLayers = [
            { id: "layer1", visible: false, target: "_blank", title: "Layer 1" }
        ];
        updatedLayers["layer1"] = updatedLayers[0];
        mockSvgMap.getRootLayersProps.mockReturnValue(updatedLayers);
        
        handler.updateLayerSpecificWebAppHandler();

        expect(mockWindow.close).toHaveBeenCalled();
        expect(removeEventListenerSpy).toHaveBeenCalledWith("zoomPanMap", expect.any(Function), false);
    });

    it("6.2 should close all windows when main window unload event occurs", () => {
        const mockWindow1 = createMockWindow("win1");
        const mockWindow2 = createMockWindow("win2");
        
        const openSpy = jest.spyOn(global.window, "open")
            .mockReturnValueOnce(mockWindow1)
            .mockReturnValueOnce(mockWindow2);
            
        // Reset and refine mock props for this specific test
        const layers = [
            { id: "layer1", visible: true, target: "_blank", title: "Layer 1" },
            { id: "layer2", visible: true, target: "_blank", title: "Layer 2" }
        ];
        const mockProps = [...layers];
        layers.forEach(l => mockProps[l.id] = l);
        mockSvgMap.getRootLayersProps.mockReturnValue(mockProps);

        console.log("Opening popup 1...");
        handler.showLayerSpecificUI("layer1", "test1.html");
        console.log("Opening popup 2...");
        handler.showLayerSpecificUI("layer2", "test2.html");
        
        console.log("Number of times window.open was called:", openSpy.mock.calls.length);
        
        console.log("Dispatching unload event...");
        window.dispatchEvent(new Event("unload"));
        
        expect(mockWindow1.close).toHaveBeenCalled();
        expect(mockWindow2.close).toHaveBeenCalled();
    });
});
