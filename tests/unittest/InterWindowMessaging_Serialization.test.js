import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Serialization", () => {
	let iwm;

	beforeEach(() => {
		iwm = new InterWindowMessaging({}, null, false);
	});

	test("should handle circular references by replacing them with undefined", () => {
		const obj = { a: 1 };
		obj.self = obj;

		// Access private method for testing if possible, or test via public method that uses it
		// Since #safeStringify is private, we might need to test it through postMessageTo or similar if we mock postMessage
		// Or we can expose it for testing or just test the effect.
		
		// For now, let's use a trick to test private methods if needed, or just test via public API.
		// Actually, let's just test if it doesn't throw and produces expected JSON.
		
		const mockWin = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" }
		};
		
		iwm.postMessageTo(mockWin, obj);
		
		const sentMessage = JSON.parse(mockWin.postMessage.mock.calls[0][0]);
		expect(sentMessage.a).toBe(1);
		expect(sentMessage.self).toBeUndefined();
	});

	test("should exclude window objects", () => {
		const mockWin = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" }
		};
		const data = {
			win: window,
			other: "data"
		};

		iwm.postMessageTo(mockWin, data);
		
		const sentMessage = JSON.parse(mockWin.postMessage.mock.calls[0][0]);
		expect(sentMessage.other).toBe("data");
		expect(sentMessage.win).toBeUndefined();
	});

	test("should handle deep nested objects with circular references", () => {
		const a = { name: "a" };
		const b = { name: "b", parent: a };
		a.child = b;

		const mockWin = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" }
		};

		iwm.postMessageTo(mockWin, a);
		
		const sentMessage = JSON.parse(mockWin.postMessage.mock.calls[0][0]);
		expect(sentMessage.name).toBe("a");
		expect(sentMessage.child.name).toBe("b");
		expect(sentMessage.child.parent).toBeUndefined();
	});

	test("should handle arrays with circular references and preserve indices as null", () => {
		const circularArr = [];
		circularArr.push(circularArr);
		circularArr.push(1);
		
		const mockWin = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" }
		};

		iwm.postMessageTo(mockWin, circularArr);
		const sentMessage = JSON.parse(mockWin.postMessage.mock.calls[0][0]);
		
		// Current implementation will result in [1] because it filters undefined
		// We want it to be [null, 1]
		expect(sentMessage).toEqual([null, 1]);
	});
});
