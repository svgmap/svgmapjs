import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { InterWindowMessaging } from "../../InterWindowMessaging.js";

describe("InterWindowMessaging Handshake Security (Requirement 1.1)", () => {
	let functionSet;
	let parentMessaging;
	let mockChildWindow;

	beforeEach(() => {
		// location のモックをリセット
		delete global.window.location;
		global.window.location = new URL("http://localhost/");

		mockChildWindow = {
			postMessage: jest.fn(),
		};

		functionSet = {};
	});

	it("should respond with handshakeAck ONLY if origin is pre-registered", async () => {
		const trustedOrigin = "http://trusted-app.com";
		const untrustedOrigin = "http://malicious-app.com";
		const testToken = "secure-token-123";

		// 親側: 信頼できるオリジンをあらかじめ登録
		parentMessaging = new InterWindowMessaging(functionSet, null, false, [trustedOrigin]);

		// 1. 信頼されていないオリジンからの HELO
		const untrustedHelo = new MessageEvent("message", {
			origin: untrustedOrigin,
			source: mockChildWindow,
			data: JSON.stringify({
				command: "HELO",
				parameter: [testToken]
			})
		});
		window.dispatchEvent(untrustedHelo);
		await new Promise(resolve => setTimeout(resolve, 50));

		// handshakeAck が送信されていないことを確認
		expect(mockChildWindow.postMessage).not.toHaveBeenCalled();

		// 2. 信頼されているオリジンからの HELO
		const trustedHelo = new MessageEvent("message", {
			origin: trustedOrigin,
			source: mockChildWindow,
			data: JSON.stringify({
				command: "HELO",
				parameter: [testToken]
			})
		});
		window.dispatchEvent(trustedHelo);
		await new Promise(resolve => setTimeout(resolve, 50));

		// handshakeAck が送信されたことを確認
		expect(mockChildWindow.postMessage).toHaveBeenCalled();
		const sentData = JSON.parse(mockChildWindow.postMessage.mock.calls[0][0]);
		expect(sentData.command).toBe("handshakeAck");
		expect(sentData.parameter).toContain(testToken);
	});

	it("child should send HELO when token is present in URL", async () => {
		const parentOrigin = "http://host-domain.com";
		const testToken = "token-from-url";
		
		// URLSearchParams をモックしてトークンが存在するように見せかける
		const originalURLSearchParams = global.URLSearchParams;
		global.URLSearchParams = jest.fn().mockImplementation((query) => {
			return {
				get: (key) => {
					if (key === 'svgMapHandshakeToken') return testToken;
					if (key === 'svgMapParentOrigin') return parentOrigin;
					return null;
				}
			};
		});

		const mockOpener = {
			postMessage: jest.fn(),
		};
		global.window.opener = mockOpener;

		try {
			// 子側のMessagingインスタンス作成
			const childMessaging = new InterWindowMessaging({}, () => global.window.opener, false, [], { handshake: true });

			// 非同期のメッセージ送信を待機
			await new Promise(resolve => setTimeout(resolve, 100));

			// 親に対して HELO が送信されたか確認
			expect(mockOpener.postMessage).toHaveBeenCalled();
			const calls = mockOpener.postMessage.mock.calls;
			const heloCall = calls.find(call => {
				try {
					const data = JSON.parse(call[0]);
					return data.command === "HELO";
				} catch (e) {
					return false;
				}
			});
			expect(heloCall).toBeDefined();
			const sentData = JSON.parse(heloCall[0]);
			expect(sentData.parameter).toContain(testToken);
		} finally {
			global.URLSearchParams = originalURLSearchParams;
		}
	});
});
