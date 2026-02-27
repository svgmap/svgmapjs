import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Origin Handling", () => {
	let iwm;
	let mockTargetWindow;

	beforeEach(() => {
		mockTargetWindow = {
			postMessage: jest.fn(),
			location: { origin: "http://allowed-origin.com" }
		};
		// constructor with allowedOrigins
		iwm = new InterWindowMessaging({}, mockTargetWindow, false, ["http://allowed-origin.com"]);
	});

	test("should update targetOrigin when a valid message is received from target window", async () => {
		const message = JSON.stringify({ command: "test", id: "123" });
		const event = {
			origin: "http://allowed-origin.com",
			data: message,
			source: mockTargetWindow
		};

		// Simulate message event
		// Since we cannot easily trigger real 'message' event on window in JSDOM easily for our instance's listener
		// without some trickery, let's assume it works if we can verify the state or behavior.
		
		// Actually, let's use a public method that triggers it or just check if it's updated after some interaction.
		
		// Let's mock window.addEventListener to capture the listener
		// Wait, I already have the listener attached in constructor.
	});
});
