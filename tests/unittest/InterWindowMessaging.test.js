import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Baseline Test", () => {
	let mockTargetWindow;
	let functionSet;
	let messaging;

	beforeEach(() => {
		// グローバルウィンドウのモック
		delete global.window.location;
		global.window.location = new URL("http://localhost/");

		// モックウィンドウの設定
		mockTargetWindow = {
			postMessage: jest.fn(),
			location: {
				origin: "http://localhost",
				pathname: "/test-path"
			},
			origin: "http://localhost"
		};

		functionSet = {
			testFunc: jest.fn().mockResolvedValue("result")
		};

		messaging = new InterWindowMessaging(functionSet, mockTargetWindow, true);
	});

	it("should receive a message and call the corresponding function when origin match", async () => {
		const messageEvent = {
			origin: "http://localhost",
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "testFunc",
				parameter: ["param1"]
			})
		};

		// 手動でメッセージイベントを発火させる
		const event = new MessageEvent("message", messageEvent);
		window.dispatchEvent(event);

		// 非同期処理の完了を待機
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(functionSet.testFunc).toHaveBeenCalledWith("param1");
		expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		
		const call = mockTargetWindow.postMessage.mock.calls.find(c => {
			try {
				return JSON.parse(c[0]).response === "testFunc";
			} catch(e) { return false; }
		});
		expect(call).toBeDefined();
		const response = JSON.parse(call[0]);
		expect(response.content).toBe("result");
	});

	it("should allow messages even if pathname does not match", async () => {
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

		expect(functionSet.testFunc).toHaveBeenCalledWith("param1");
	});

	it("should allow messages from different origin if whitelisted", async () => {
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

		expect(functionSet.testFunc).toHaveBeenCalledWith("param-cross");
	});
});

describe("InterWindowMessaging ID Based Messaging (Task 1.1)", () => {
	let mockTargetWindow;
	let functionSet;
	let messaging;

	beforeEach(() => {
		delete global.window.location;
		global.window.location = new URL("http://localhost/");

		mockTargetWindow = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" },
			origin: "http://localhost"
		};

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
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		
		const call = mockTargetWindow.postMessage.mock.calls.find(c => {
			try {
				return JSON.parse(c[0]).command === "func1";
			} catch(e) { return false; }
		});
		expect(call).toBeDefined();
		const sentData = JSON.parse(call[0]);
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

		await new Promise(resolve => setTimeout(resolve, 50));

		// 送信された各メッセージの ID を取得
		const filteredCalls = mockTargetWindow.postMessage.mock.calls.filter(c => {
			try {
				const data = JSON.parse(c[0]);
				return data.command === "func1" || data.command === "func2";
			} catch(e) { return false; }
		});
		
		const id1 = JSON.parse(filteredCalls[0][0]).id;
		const id2 = JSON.parse(filteredCalls[1][0]).id;
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
		const messagingWithTimeout = new InterWindowMessaging(functionSet, mockTargetWindow, false, [], { timeout: 100 });
		
		const promise = messagingWithTimeout.callRemoteFunc("func1", ["p1"]);
		
		await expect(promise).rejects.toThrow("timeout");
	});
});

describe("InterWindowMessaging Handshake (Task 2)", () => {
	let mockTargetWindow;
	let functionSet;
	let onHandshakeMock;

	beforeEach(() => {
		delete global.window.location;
		global.window.location = new URL("http://localhost/");

		mockTargetWindow = {
			postMessage: jest.fn(),
			location: { origin: "http://localhost" },
			origin: "http://localhost"
		};

		functionSet = {
			secureFunc: jest.fn().mockResolvedValue("secured")
		};

		onHandshakeMock = jest.fn();
	});

	it("should establish handshake and add origin to allowedOrigins", async () => {
		const clientOrigin = "http://trusted-client.com";
		const messaging = new InterWindowMessaging(functionSet, mockTargetWindow, false, [clientOrigin], {
			handshake: true,
			onHandshake: onHandshakeMock
		});

		const actualToken = "dummy-token";
		
		window.dispatchEvent(new MessageEvent("message", {
			origin: clientOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "HELO",
				parameter: [actualToken]
			})
		}));

		await new Promise(resolve => setTimeout(resolve, 50));

		// HELO受信により Ack が送信されるはず
		expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		const call = mockTargetWindow.postMessage.mock.calls.find(c => JSON.parse(c[0]).command === "handshakeAck");
		expect(call).toBeDefined();

		// 以降のメッセージが許可されるか確認
		const secureMsg = new MessageEvent("message", {
			origin: clientOrigin,
			source: mockTargetWindow,
			data: JSON.stringify({
				command: "secureFunc",
				id: "req-1"
			})
		});
		window.dispatchEvent(secureMsg);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(functionSet.secureFunc).toHaveBeenCalled();
	});

	it("should reject commands before handshake is established", async () => {
		const messaging = new InterWindowMessaging(functionSet, mockTargetWindow, false, [], {
			handshake: true
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
		
		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		window.dispatchEvent(msgEvent);
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(functionSet.secureFunc).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
