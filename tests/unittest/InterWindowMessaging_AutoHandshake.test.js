import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Auto-Handshake (Task 4.3)", () => {
	let mockParentWindow;
	
	beforeEach(() => {
		mockParentWindow = {
			postMessage: jest.fn(),
			location: { origin: "http://parent.com" }
		};
		
		// Mock window.opener and URLSearchParams
		delete window.opener;
		window.opener = mockParentWindow;
		
		// Mock location.search
		delete window.location;
		window.location = {
			search: "?svgMapHandshakeToken=test-token&svgMapParentOrigin=http://parent.com",
			origin: "http://client.com"
		};
	});

	test("should automatically send handshakeAck if token is present in URL", () => {
		const iwm = new InterWindowMessaging({}, window.opener, true);
		
		expect(mockParentWindow.postMessage).toHaveBeenCalled();
		
		// Depending on initialization order, either 'ready' or 'handshakeAck' might be first
		const hasHandshakeAck = mockParentWindow.postMessage.mock.calls.some(call => {
			const msg = JSON.parse(call[0]);
			return msg.command === "handshakeAck" && msg.parameter[1] === "test-token";
		});
		
		expect(hasHandshakeAck).toBe(true);
	});

	test("should automatically trust parent origin provided in URL", async () => {
		const functionSet = {
			testCmd: jest.fn().mockResolvedValue("ok")
		};
		const iwm = new InterWindowMessaging(functionSet, window.opener, true);
		
		// Simulate a message from parent origin after initialization
		const messageEvent = {
			origin: "http://parent.com",
			source: mockParentWindow,
			data: JSON.stringify({
				command: "testCmd",
				parameter: ["hello"],
				id: "req-1"
			})
		};
		
		window.dispatchEvent(new MessageEvent("message", messageEvent));
		
		// Wait for async processing
		await new Promise(resolve => setTimeout(resolve, 50));
		
		// If origin was trusted, the function should have been called
		expect(functionSet.testCmd).toHaveBeenCalledWith("hello");
	});
});
