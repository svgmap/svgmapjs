import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging (Takagi Version) - Comprehensive Test Suite", () => {
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
				pathname: "/target-app"
			}
		};

		functionSet = {
			testFunc: jest.fn().mockResolvedValue("result"),
			asyncFunc: async (val) => {
				await new Promise(res => setTimeout(res, 10));
				return `async-${val}`;
			},
			connectionReady: jest.fn()
		};

		// コンストラクタ: (functionSet, targetWindow, targetOrigin)
		messaging = new InterWindowMessaging(functionSet, mockTargetWindow, true);
	});

	describe("1. Baseline RPC & Basic Message Handling", () => {
		it("should receive a message and call the corresponding function with correct parameters", async () => {
			const messageEvent = {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({
					command: "testFunc",
					parameter: ["param1"],
					id: "req-id-001"
				})
			};

			window.dispatchEvent(new MessageEvent("message", messageEvent));
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(functionSet.testFunc).toHaveBeenCalledWith("param1");
			
			// 返信の検証
			const call = mockTargetWindow.postMessage.mock.calls.find(c => {
				try { 
					const data = typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0];
					return data.id === "req-id-001"; 
				} catch(e) { return false; }
			});
			expect(call).toBeDefined();
			const response = typeof call[0] === 'string' ? JSON.parse(call[0]) : call[0];
			expect(response.content).toBe("result");
		});

		it("should handle async functions and return results", async () => {
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ command: "asyncFunc", parameter: ["val"], id: "async-1" })
			}));

			await new Promise(resolve => setTimeout(resolve, 50));

			const call = mockTargetWindow.postMessage.mock.calls.find(c => {
				try { 
					const data = typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0];
					return data.id === "async-1"; 
				} catch(e) { return false; }
			});
			expect(call).toBeDefined();
			const response = typeof call[0] === 'string' ? JSON.parse(call[0]) : call[0];
			expect(response.content).toBe("async-val");
		});

		it("should remain silent for unhandled commands (multi-instance support)", async () => {
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ command: "unknownCommand", id: "ignore-me" })
			}));

			await new Promise(resolve => setTimeout(resolve, 50));

			const call = mockTargetWindow.postMessage.mock.calls.find(c => {
				try { 
					const data = typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0];
					return data.id === "ignore-me"; 
				} catch(e) { return false; }
			});
			expect(call).toBeUndefined();
		});
	});

	describe("2. Origin & Path Security", () => {
		it("should block messages from disallowed origins", async () => {
			const untrustedOrigin = "http://evil.com";
			window.dispatchEvent(new MessageEvent("message", {
				origin: untrustedOrigin,
				source: mockTargetWindow,
				data: JSON.stringify({ command: "testFunc" })
			}));

			await new Promise(resolve => setTimeout(resolve, 50));
			expect(functionSet.testFunc).not.toHaveBeenCalled();
		});

		it("should block messages from different pathnames on the same origin (Takagi Specialty)", async () => {
			const attackerWindow = {
				postMessage: jest.fn(),
				location: { origin: "http://localhost", pathname: "/attacker-app" }
			};

			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: attackerWindow,
				data: JSON.stringify({ command: "testFunc" })
			}));

			await new Promise(resolve => setTimeout(resolve, 50));
			expect(functionSet.testFunc).not.toHaveBeenCalled();
		});
	});

	describe("3. callRemoteFunc & UUID", () => {
		it("should use crypto.randomUUID for request IDs and resolve correctly", async () => {
			if (!global.crypto) global.crypto = {};
			global.crypto.randomUUID = jest.fn().mockReturnValue("uuid-1234-5678");

			const promise = messaging.callRemoteFunc("remoteCmd", ["args"]);

			await new Promise(resolve => setTimeout(resolve, 50));
			
			// 送信メッセージにUUIDが含まれているか
			const lastCall = mockTargetWindow.postMessage.mock.calls.find(c => {
				const data = typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0];
				return data.command === "remoteCmd";
			});
			const sentData = typeof lastCall[0] === 'string' ? JSON.parse(lastCall[0]) : lastCall[0];
			expect(sentData.id).toBe("uuid-1234-5678");

			// 正しいIDでレスポンスを返す
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ id: "uuid-1234-5678", response: "remoteCmd", content: "resolved-value" })
			}));

			expect(await promise).toBe("resolved-value");
		});

		it("should handle Transferable Objects correctly", async () => {
			const buffer = new ArrayBuffer(16);
			messaging.callRemoteFunc("sendBuffer", [buffer], [buffer]);

			await new Promise(resolve => setTimeout(resolve, 50));

			const lastCallArgs = mockTargetWindow.postMessage.mock.calls.find(c => {
				// Transferableがある場合、オブジェクトのまま送信する
				const data = typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0];
				return data.command === "sendBuffer";
			});
			expect(lastCallArgs).toBeDefined();
			expect(lastCallArgs[2]).toContain(buffer); // postMessage(msg, origin, [transferables])
		});
	});

	describe("4. Negotiation Mode", () => {
		it("should perform dynamic origin locking using negotiationKey", async () => {
			const remoteWin = {
				postMessage: jest.fn(),
				location: { origin: "http://remote-map.com", pathname: "/viewer" }
			};
			if (!global.crypto) global.crypto = {};
			global.crypto.randomUUID = jest.fn().mockReturnValue("neg-key-abc");

			const negMessaging = new InterWindowMessaging(functionSet, remoteWin, "negotiation");

			// 1. 初回は "*" 宛に negotiationKey を送る
			expect(remoteWin.postMessage).toHaveBeenCalled();
			const firstCall = JSON.parse(remoteWin.postMessage.mock.calls[0][0]);
			expect(firstCall.negotiationKey).toBe("neg-key-abc");
			expect(remoteWin.postMessage.mock.calls[0][1]).toBe("*");

			// 2. 正しいキーを持つ相手からの返信でオリジンをロック
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://remote-map.com",
				source: remoteWin,
				data: JSON.stringify({ ready: true, negotiationKey: "neg-key-abc" })
			}));

			await new Promise(resolve => setTimeout(resolve, 50));
			expect(functionSet.connectionReady).toHaveBeenCalledWith(true);

			// 3. 以降の通信はロックされたオリジンにのみ送る
			negMessaging.callRemoteFunc("lockedCmd");
			const lastCallOrigin = remoteWin.postMessage.mock.calls[remoteWin.postMessage.mock.calls.length - 1][1];
			expect(lastCallOrigin).toBe("http://remote-map.com");
		});
	});

	describe("5. Future Robustness", () => {
		it("should handle circular references gracefully during serialization", async () => {
			const circularObj = { name: "circular" };
			circularObj.self = circularObj;

			functionSet.getCircular = jest.fn().mockResolvedValue(circularObj);

			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ command: "getCircular", id: "circ-1" })
			}));

			await new Promise(resolve => setTimeout(resolve, 50));
			expect(mockTargetWindow.postMessage).toHaveBeenCalled();
		});

		it.skip("should reject callRemoteFunc with timeout error if no response is received", async () => {
			const timeoutMessaging = new InterWindowMessaging(functionSet, mockTargetWindow, true);
			const promise = timeoutMessaging.callRemoteFunc("noResponseCmd", [], [], { timeout: 100 });
			await expect(promise).rejects.toThrow(/timeout/i);
		});
	});

	describe("6. Robustness & Multi-instance Guard (Task 1.1, 2.2)", () => {
		it("should log a specific warning and abort when targetWindow is not available during postMessage", async () => {
			const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
			
			// targetWindowGetterがnullを返すように設定
			const nullMessaging = new InterWindowMessaging(functionSet, () => null, true);
			
			// readyStateを強制的にセットして通信を試みる
			nullMessaging.callRemoteFunc("anyCmd");
			
			// 非同期処理を少し待つ
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(warnSpy).toHaveBeenCalledWith("Target window not available - message aborted");
			warnSpy.mockRestore();
		});

		it("should only resolve responses with matching IDs and ignore others (Task 2.2)", async () => {
			const messagingA = new InterWindowMessaging({ foo: () => "a" }, mockTargetWindow, true);
			
			// Aがリクエストを送信
			const promiseA = messagingA.callRemoteFunc("foo");
			
			// callRemoteFuncのリクエスト送信を待つ
			await new Promise(res => setTimeout(res, 20));

			// mockを検索して 'foo' コマンドの送信IDを特定する
			const fooCall = mockTargetWindow.postMessage.mock.calls.find(c => {
				const data = typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0];
				return data.command === "foo";
			});
			expect(fooCall).toBeDefined();
			const idA = JSON.parse(fooCall[0]).id;

			// 他の（存在しない）IDを持つレスポンスを流す
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ id: "wrong-id", response: "foo", content: "wrong" })
			}));

			// 【検証要点】自分が出したリクエストIDと一致しないメッセージを受信しても
			// Promiseが解決されずに正しく無視されていることを確認する。
			let resolvedA = false;
			promiseA.then(() => { resolvedA = true; });
			await new Promise(res => setTimeout(res, 20));
			expect(resolvedA).toBe(false);

			// 正しいIDでレスポンスを流す
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ id: idA, response: "foo", content: "correct" })
			}));

			// ここで解決されるはず
			const result = await promiseA;
			expect(result).toBe("correct");
		});

		it("should allow multiple instances to coexist and respond only to their respective commands (Task 3.1)", async () => {
			const funcA = jest.fn().mockResolvedValue("resultA");
			const funcB = jest.fn().mockResolvedValue("resultB");
			
			const instA = new InterWindowMessaging({ cmdA: funcA }, mockTargetWindow, true);
			const instB = new InterWindowMessaging({ cmdB: funcB }, mockTargetWindow, true);

			// cmdAを送信
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ command: "cmdA", id: "req-A" })
			}));

			await new Promise(res => setTimeout(res, 30));

			// instAのみが呼ばれ、instBは呼ばれない
			expect(funcA).toHaveBeenCalled();
			expect(funcB).not.toHaveBeenCalled();

			// 返信を確認 (instBがエラーを返していないことを暗黙的に検証)
			// instBがエラーを返していると、mockTargetWindow.postMessage に error レスポンスが記録されるはず
			const calls = mockTargetWindow.postMessage.mock.calls.map(c => 
				typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0]
			);
			
			const errorResponses = calls.filter(msg => msg.response === "error");
			expect(errorResponses.length).toBe(0);

			const successA = calls.find(msg => msg.id === "req-A");
			expect(successA.content).toBe("resultA");

			// cmdBを送信
			mockTargetWindow.postMessage.mockClear();
			window.dispatchEvent(new MessageEvent("message", {
				origin: "http://localhost",
				source: mockTargetWindow,
				data: JSON.stringify({ command: "cmdB", id: "req-B" })
			}));

			await new Promise(res => setTimeout(res, 30));

			expect(funcB).toHaveBeenCalled();
			const callsB = mockTargetWindow.postMessage.mock.calls.map(c => 
				typeof c[0] === 'string' ? JSON.parse(c[0]) : c[0]
			);
			const successB = callsB.find(msg => msg.id === "req-B");
			expect(successB.content).toBe("resultB");
		});
	});
});
