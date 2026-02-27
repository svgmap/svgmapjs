import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Auto-Handshake (Task 4.3)", () => {
	let mockParentWindow;
	let functionSet;

	beforeEach(() => {
		mockParentWindow = {
			postMessage: jest.fn(),
			location: { origin: "http://parent.com" }
		};
		global.window.opener = mockParentWindow;

		functionSet = {
			testCmd: jest.fn().mockResolvedValue("ok")
		};
	});

	it("should automatically send HELO if token is present in URL", async () => {
		const testToken = "test-token-auto";
		const parentOrigin = "http://parent.com";

		// URLSearchParams をモック
		const originalURLSearchParams = global.URLSearchParams;
		global.URLSearchParams = jest.fn().mockImplementation(() => ({
			get: (key) => {
				if (key === 'svgMapHandshakeToken') return testToken;
				if (key === 'svgMapParentOrigin') return parentOrigin;
				return null;
			}
		}));

		try {
			const iwm = new InterWindowMessaging({}, () => mockParentWindow, true);

			// HELO 送信を待機
			await new Promise(resolve => setTimeout(resolve, 100));

			expect(mockParentWindow.postMessage).toHaveBeenCalled();

			const hasHelo = mockParentWindow.postMessage.mock.calls.some(call => {
				try {
					const data = JSON.parse(call[0]);
					return data.command === "HELO" && data.parameter.includes(testToken);
				} catch (e) {
					return false;
				}
			});
			expect(hasHelo).toBe(true);
		} finally {
			global.URLSearchParams = originalURLSearchParams;
		}
	});

	it("should automatically trust parent origin provided in URL after successful Ack", async () => {
		const testToken = "test-token-trust";
		const parentOrigin = "http://parent.com";

		// URLSearchParams をモック
		const originalURLSearchParams = global.URLSearchParams;
		global.URLSearchParams = jest.fn().mockImplementation(() => ({
			get: (key) => {
				if (key === 'svgMapHandshakeToken') return testToken;
				if (key === 'svgMapParentOrigin') return parentOrigin;
				return null;
			}
		}));

		try {
			const iwm = new InterWindowMessaging(functionSet, () => mockParentWindow, true);

			// HELO 送信後の Ack をシミュレート
			const ackEvent = new MessageEvent("message", {
				origin: parentOrigin,
				source: mockParentWindow,
				data: JSON.stringify({
					command: "handshakeAck",
					parameter: [null, testToken]
				})
			});
			window.dispatchEvent(ackEvent);

			await new Promise(resolve => setTimeout(resolve, 100));

			// Now send a command from parent
			const cmdEvent = new MessageEvent("message", {
				origin: parentOrigin,
				source: mockParentWindow,
				data: JSON.stringify({
					command: "testCmd",
					parameter: ["hello"],
					id: "req-1"
				})
			});
			window.dispatchEvent(cmdEvent);

			await new Promise(resolve => setTimeout(resolve, 100));

			// If origin was trusted, the function should have been called
			expect(functionSet.testCmd).toHaveBeenCalledWith("hello");
		} finally {
			global.URLSearchParams = originalURLSearchParams;
		}
	});
});
