import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Baseline Test", () => {
	let mockTargetWindow;
	let functionSet;
	let messaging;

	beforeEach(() => {
		// モックウィンドウの設定
		mockTargetWindow = {
			postMessage: jest.fn(),
			location: {
				origin: "http://localhost",
				pathname: "/test-path"
			},
			origin: "http://localhost"
		};

		// グローバルウィンドウのモック
		delete global.window.location;
		global.window.location = {
			origin: "http://localhost",
			pathname: "/test-path"
		};

		functionSet = {
			testFunc: jest.fn().mockResolvedValue("result")
		};

		messaging = new InterWindowMessaging(functionSet, mockTargetWindow, true);
	});

	it("should receive a message and call the corresponding function when origin and pathname match", async () => {
		const messageEvent = {
			origin: "http://localhost",
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "testFunc",
				parameter: ["param1"]
			})
		};

		// 手動でメッセージイベントを発火させる（JSDOMのdispatchEventを使用）
		const event = new MessageEvent("message", messageEvent);
		window.dispatchEvent(event);

		// 非同期処理の完了を待機
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(functionSet.testFunc).toHaveBeenCalledWith("param1");
		expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		
		const response = JSON.parse(mockTargetWindow.postMessage.mock.calls[1][0]);
		expect(response.response).toBe("testFunc");
		expect(response.content).toBe("result");
	});

	it("should allow messages even if pathname does not match (Task 2.1 fix)", async () => {
		const differentPathWindow = {
			...mockTargetWindow,
			location: {
				...mockTargetWindow.location,
				pathname: "/different-path"
			}
		};

		// targetWindow をこのモックに差し替えたインスタンスを作成
		const messagingWithDiffPath = new InterWindowMessaging(functionSet, differentPathWindow, true);

		const messageEvent = {
			origin: "http://localhost",
			source: differentPathWindow,
			data: JSON.stringify({
				command: "testFunc",
				parameter: ["param1"]
			})
		};

		const event = new MessageEvent("message", messageEvent);
		window.dispatchEvent(event);

		await new Promise(resolve => setTimeout(resolve, 50));

		// Task 2.1 の修正により、pathname が異なっても source が一致すれば呼び出されるはず
		expect(functionSet.testFunc).toHaveBeenCalledWith("param1");
	});

	it("should allow messages from different origin if whitelisted (Task 2 preview)", async () => {
		const otherOrigin = "http://other-domain.com";
		const otherWindow = {
			postMessage: jest.fn(),
			location: {
				origin: otherOrigin,
				pathname: "/app.html"
			}
		};

		// ホワイトリストに他ドメインを追加
		const messagingWithWhitelist = new InterWindowMessaging(functionSet, otherWindow, true, [otherOrigin]);

		const messageEvent = {
			origin: otherOrigin,
			source: otherWindow,
			data: JSON.stringify({
				command: "testFunc",
				parameter: ["param-cross"]
			})
		};

		const event = new MessageEvent("message", messageEvent);
		window.dispatchEvent(event);

		await new Promise(resolve => setTimeout(resolve, 50));

		// 現在の実装では pathname チェック (otherWindow.location.pathname vs self.location.pathname) で失敗するはず
		// また、他ドメインの location.pathname にアクセスしようとすると本来はエラーになる
		expect(functionSet.testFunc).toHaveBeenCalledWith("param-cross");
	});
});
