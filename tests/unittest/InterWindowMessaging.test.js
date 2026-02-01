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

describe("InterWindowMessaging ID Based Messaging (Task 1.1)", () => {
	let mockTargetWindow;
	let functionSet;
	let messaging;

	beforeEach(() => {
		mockTargetWindow = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" },
			origin: "http://localhost"
		};

		global.window.location = { origin: "http://localhost" };

		functionSet = {
			func1: jest.fn().mockResolvedValue("res1"),
			func2: jest.fn().mockResolvedValue("res2")
		};

		// 既存の互換性を保ちつつ初期化
		messaging = new InterWindowMessaging(functionSet, mockTargetWindow, true);
	});

	it("should include a unique ID in the sent message and resolve when response with same ID is received", async () => {
		const callPromise = messaging.callRemoteFunc("func1", ["p1"]);

		// 送信されたメッセージに id が含まれているか確認
		expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		const sentData = JSON.parse(mockTargetWindow.postMessage.mock.calls[1][0]); // calls[0] は submitReady
		expect(sentData).toHaveProperty("id");
		const requestId = sentData.id;

		// レスポンスをシミュレート
		const responseEvent = new MessageEvent("message", {
			origin: "http://localhost",
			source: mockTargetWindow,
			data: JSON.stringify({
				id: requestId,
				response: "func1",
				content: "async-res"
			})
		});
		window.dispatchEvent(responseEvent);

		const result = await callPromise;
		expect(result).toBe("async-res");
	});

	it("should handle multiple concurrent requests using different IDs", async () => {
		const promise1 = messaging.callRemoteFunc("func1", ["p1"]);
		const promise2 = messaging.callRemoteFunc("func2", ["p2"]);

		// 送信された各メッセージの ID を取得
		const id1 = JSON.parse(mockTargetWindow.postMessage.mock.calls[1][0]).id;
		const id2 = JSON.parse(mockTargetWindow.postMessage.mock.calls[2][0]).id;
		expect(id1).not.toBe(id2);

		// 逆順でレスポンスを返して、正しく紐付けられるか確認
		window.dispatchEvent(new MessageEvent("message", {
			origin: "http://localhost",
			source: mockTargetWindow,
			data: JSON.stringify({ id: id2, response: "func2", content: "res2-sync" })
		}));

		window.dispatchEvent(new MessageEvent("message", {
			origin: "http://localhost",
			source: mockTargetWindow,
			data: JSON.stringify({ id: id1, response: "func1", content: "res1-sync" })
		}));

		expect(await promise1).toBe("res1-sync");
		expect(await promise2).toBe("res2-sync");
	});

	it("should reject with timeout error if no response is received within timeout period", async () => {
		jest.useFakeTimers();
		
		// タイムアウトを1秒に設定
		const messagingWithTimeout = new InterWindowMessaging(functionSet, mockTargetWindow, { timeout: 1000, submitReady: false });
		
		const promise = messagingWithTimeout.callRemoteFunc("func1", ["p1"]);
		
		// 1秒経過させる
		jest.advanceTimersByTime(1001);
		
		await expect(promise).rejects.toThrow("InterWindowMessaging: Response timeout for command: func1");
		
		jest.useRealTimers();
	});
});

describe("InterWindowMessaging Handshake (Task 2)", () => {
	let mockTargetWindow;
	let functionSet;
	let onHandshakeMock;

	beforeEach(() => {
		mockTargetWindow = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" },
			origin: "http://localhost"
		};

		global.window.location = { origin: "http://localhost" };

		functionSet = {
			secureFunc: jest.fn().mockResolvedValue("secured")
		};

		onHandshakeMock = jest.fn();
	});

	it("should establish handshake and add origin to allowedOrigins", async () => {
		const messaging = new InterWindowMessaging(functionSet, mockTargetWindow, {
			handshake: true,
			onHandshake: onHandshakeMock,
			submitReady: false
		});

		// 内部トークンを取得（テスト用。実際はURL経由などで渡る）
		// ここでは実装前なのでエラーになるか、トークンが存在しない
		const token = messaging.getHandshakeTokenForTesting();
		expect(token).toBeDefined();

		const clientOrigin = "http://trusted-client.com";

		// handshakeAck をシミュレート
		const ackEvent = new MessageEvent("message", {
			origin: clientOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "handshakeAck",
				parameter: ["dummy-lid", token]
			})
		});
		window.dispatchEvent(ackEvent);

		// 非同期処理の完了を待機
		await new Promise(resolve => setTimeout(resolve, 50));

		// オリジンが追加されていることを確認（間接的に確認）
		expect(onHandshakeMock).toHaveBeenCalledWith(clientOrigin);

		// 以降のメッセージが許可されるか確認
		const secureMsg = new MessageEvent("message", {
			origin: clientOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "secureFunc",
				parameter: []
			})
		});
		window.dispatchEvent(secureMsg);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(functionSet.secureFunc).toHaveBeenCalled();
	});

	it("should reject commands before handshake is established", async () => {
		const messaging = new InterWindowMessaging(functionSet, mockTargetWindow, {
			handshake: true,
			submitReady: false
		});

		const untrustedOrigin = "http://unknown.com";
		const msgEvent = new MessageEvent("message", {
			origin: untrustedOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "secureFunc",
				parameter: []
			})
		});
		
		window.dispatchEvent(msgEvent);
		await new Promise(resolve => setTimeout(resolve, 50));

		// オリジンが未承認なので呼び出されないはず
		expect(functionSet.secureFunc).not.toHaveBeenCalled();
	});
});
