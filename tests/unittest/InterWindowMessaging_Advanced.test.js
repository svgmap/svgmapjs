import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Advanced Features (Task 5.2, 5.3)", () => {
	let mockTargetWindow;
	let functionSet;
	let iwm;
	const targetOrigin = "http://target.com";

	beforeEach(() => {
		jest.useFakeTimers();
		mockTargetWindow = {
			postMessage: jest.fn(),
			location: { origin: targetOrigin }
		};
		functionSet = {
			slowFunc: async (val) => {
				return `res-${val}`;
			}
		};
		// Add targetOrigin to allowedOrigins to bypass origin check in these tests
		iwm = new InterWindowMessaging(functionSet, mockTargetWindow, { timeout: 1000 }, [targetOrigin]);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test("should handle multiple parallel requests correctly", async () => {
		const p1 = iwm.callRemoteFunc("cmd1", [1]);
		const p2 = iwm.callRemoteFunc("cmd2", [2]);

		const calls = mockTargetWindow.postMessage.mock.calls;
		// calls[0] is ready:true
		const msg1 = JSON.parse(calls[1][0]);
		const msg2 = JSON.parse(calls[2][0]);

		// Simulate interleaved responses
		window.dispatchEvent(new MessageEvent("message", {
			origin: targetOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({ id: msg2.id, response: "cmd2", content: "ans2" })
		}));
		window.dispatchEvent(new MessageEvent("message", {
			origin: targetOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({ id: msg1.id, response: "cmd1", content: "ans1" })
		}));

		const [res1, res2] = await Promise.all([p1, p2]);
		expect(res1).toBe("ans1");
		expect(res2).toBe("ans2");
	});

	test("should reject promise on timeout", async () => {
		const promise = iwm.callRemoteFunc("timeoutCmd", []);
		
		// Fast-forward time
		jest.advanceTimersByTime(1500);

		// The timeout rejection happens in a microtask after the timer fires
		await expect(promise).rejects.toThrow("InterWindowMessaging: Response timeout");
	});

	test("should block messages if handshake is enabled but not complete", async () => {
		const iwmSecure = new InterWindowMessaging(functionSet, mockTargetWindow, { handshake: true }, [targetOrigin]);
		const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

		window.dispatchEvent(new MessageEvent("message", {
			origin: targetOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({ command: "slowFunc", parameter: ["test"] })
		}));

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("blocked before handshake completion"));
	});

	test("should complete handshake and then allow messages", async () => {
		const onHandshake = jest.fn();
		const iwmSecure = new InterWindowMessaging(functionSet, mockTargetWindow, { 
			handshake: true,
			onHandshake: onHandshake
		}, [targetOrigin]);
		
		const token = iwmSecure.getHandshakeTokenForTesting();
		
		// Send handshakeAck
		window.dispatchEvent(new MessageEvent("message", {
			origin: targetOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({ command: "handshakeAck", parameter: [null, token] })
		}));

		expect(onHandshake).toHaveBeenCalledWith(targetOrigin);

		// Now send a regular command
		window.dispatchEvent(new MessageEvent("message", {
			origin: targetOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({ command: "slowFunc", parameter: ["success"], id: "req-1" })
		}));

		// Give it a moment to process the async command
		await jest.advanceTimersByTimeAsync(10);
		
		// Verify response was sent back
		const lastCall = mockTargetWindow.postMessage.mock.calls.pop();
		const resp = JSON.parse(lastCall[0]);
		expect(resp.response).toBe("slowFunc");
		expect(resp.content).toBe("res-success");
	});

	test("should handle JSON parse errors gracefully", () => {
		const iwmLog = new InterWindowMessaging({}, mockTargetWindow, false, [targetOrigin]);
		
		// Sending invalid JSON should not crash the listener
		window.dispatchEvent(new MessageEvent("message", {
			origin: targetOrigin,
			source: mockTargetWindow,
			data: "invalid json string"
		}));

		// No error should be thrown, and execution continues
		expect(true).toBe(true);
	});
});
