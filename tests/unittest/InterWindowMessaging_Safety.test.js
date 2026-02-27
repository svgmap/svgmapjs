import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Safety & Serialization Test", () => {
	let mockTargetWindow;
	let functionSet;
	let messaging;

	beforeEach(() => {
		mockTargetWindow = {
			postMessage: jest.fn(),
			location: {
				origin: "http://localhost"
			}
		};

		functionSet = {
			getCircular: jest.fn().mockImplementation(() => {
				const obj = { name: "circular" };
				obj.self = obj; // 循環参照
				return obj;
			}),
			getWindow: jest.fn().mockImplementation(() => {
				return { title: "Contains Window", win: window }; // Windowオブジェクトを含む
			})
		};

		messaging = new InterWindowMessaging(functionSet, mockTargetWindow, true);
	});

	it("should handle circular references gracefully during serialization", async () => {
		const messageEvent = {
			origin: "http://localhost",
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "getCircular",
				parameter: []
			})
		};

		const event = new MessageEvent("message", messageEvent);
		window.dispatchEvent(event);

		await new Promise(resolve => setTimeout(resolve, 50));

		// JSON.stringify が失敗しても、エラーメッセージを返してプロセスを継続すべき
		expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		const lastCall = mockTargetWindow.postMessage.mock.calls[mockTargetWindow.postMessage.mock.calls.length - 1][0];
		const response = JSON.parse(lastCall);
		expect(response.error || response.response).toBeDefined();
	});

	it("should filter out Window objects before serialization", async () => {
		const messageEvent = {
			origin: "http://localhost",
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "getWindow",
				parameter: []
			})
		};

		const event = new MessageEvent("message", messageEvent);
		window.dispatchEvent(event);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		const lastCall = mockTargetWindow.postMessage.mock.calls[mockTargetWindow.postMessage.mock.calls.length - 1][0];
		
		// Windowオブジェクトが含まれていると JSON.stringify が失敗するか、循環参照エラーになる
		// フィルタリングされていれば成功するはず
		const response = JSON.parse(lastCall);
		expect(response.response).toBe("getWindow");
		expect(response.content.win).toBeUndefined(); // Windowオブジェクトは除外されているべき
	});
});
