
import { it, expect, describe } from "@jest/globals";
import { SvgImageProps } from "../../libs/SvgImageProps.js";

describe("SvgImageProps Controller Proxy", () => {
    it("should behave like a string but also have properties (legacy support)", () => {
        const props = new SvgImageProps();
        
        // This is what we want to achieve with structured data
        const controllerData = {
            url: "http://example.com/ui.html",
            src: "<html>...</html>",
            type: "html"
        };

        // Implementation of the task: props.setController(controllerData) or similar
        // For now, let's assume we set it via a method
        props.controller = controllerData;

        // Requirement: Works like a string (for legacy concatenation or truthy checks)
        expect(String(props.controller)).toBe("http://example.com/ui.html");
        expect(props.controller == "http://example.com/ui.html").toBe(true);

        // Requirement: Has direct properties (for newer/refactored code)
        expect(props.controller.url).toBe("http://example.com/ui.html");
        expect(props.controller.src).toBe("<html>...</html>");
        expect(props.controller.type).toBe("html");
    });

    it("should support dynamic property assignment for extreme backward compatibility", () => {
        const props = new SvgImageProps();
        props.controller = { url: "old.html" };
        
        // Legacy code might do this
        props.controller.newProp = "value";
        expect(props.controller.newProp).toBe("value");
    });
});
