import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging HELO Handshake (Task 1.1/2.1)", () => {
	let functionSet;
	let messaging;
	let mockSourceWindow;

	beforeEach(() => {
		// グローバルウィンドウのモック
		delete global.window.location;
		global.window.location = {
			origin: "http://host-domain.com"
		};

		mockSourceWindow = {
			postMessage: jest.fn(),
		};

		functionSet = {
			testFunc: jest.fn().mockResolvedValue("res")
		};

		// 親側: ターゲットウィンドウを指定せず（null）、HELOを待機する設定
		messaging = new InterWindowMessaging(functionSet, null, false, [], {
			submitReady: false,
			alwaysAllowCommands: ["handshakeAck"]
		});
	});

	it("should respond with handshakeAck when receiving HELO from trusted origin", async () => {
		const clientOrigin = "http://client-domain.com";
		const testToken = "test-token-123";

		// 親側: 信頼できるオリジンをあらかじめ登録
		messaging.addAllowedOrigin(clientOrigin);
		
		const heloEvent = new MessageEvent("message", {
			origin: clientOrigin,
			source: mockSourceWindow,
			data: JSON.stringify({
				command: "HELO",
				parameter: [testToken]
			})
		});

		window.dispatchEvent(heloEvent);

		// 非同期処理を待機
		await new Promise(resolve => setTimeout(resolve, 50));

		// 子に対して handshakeAck が送信されたか確認
		expect(mockSourceWindow.postMessage).toHaveBeenCalled();
		const sentData = JSON.parse(mockSourceWindow.postMessage.mock.calls[0][0]);
		expect(sentData.command).toBe("handshakeAck");
		expect(sentData.parameter).toContain(testToken);
	});

	it("should register the origin as allowed after successful HELO/Ack from trusted origin", async () => {
		const clientOrigin = "http://client-domain.com";
		const testToken = "test-token-456";

		messaging.addAllowedOrigin(clientOrigin);

		// HELO受信
		window.dispatchEvent(new MessageEvent("message", {
			origin: clientOrigin,
			source: mockSourceWindow,
			data: JSON.stringify({
				command: "HELO",
				parameter: [testToken]
			})
		}));

		await new Promise(resolve => setTimeout(resolve, 50));

		// 以降の通常コマンドが許可されるか確認
		const cmdEvent = new MessageEvent("message", {
			origin: clientOrigin,
			source: mockSourceWindow,
			data: JSON.stringify({
				command: "testFunc",
				parameter: []
			})
		});
		window.dispatchEvent(cmdEvent);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(functionSet.testFunc).toHaveBeenCalled();
	});
});
