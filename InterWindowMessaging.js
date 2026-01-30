// Description:  window間で、メッセージングによってデータのやり取りをする。
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// 2022/08/10 1st rel.
// 2025/07/02 ホワイトリストで別オリジンからのメッセージを受け取りも可能にする

class InterWindowMessaging {
	constructor(
		functionSet,
		targetWindow_or_itsGetter,
		responseReady,
		allowedOrigins = []
	) {
		/**
		console.log(
			"InterWindowMessaging:functionSet, targetWindow, responseReady",
			functionSet,
			targetWindow_or_itsGetter,
			responseReady
		);
		**/
		this.#setMessageListener();

		this.#functionSet_int = functionSet;
		if (targetWindow_or_itsGetter) {
			if (typeof targetWindow_or_itsGetter == "object") {
				this.#targetWindow = targetWindow_or_itsGetter;
				// クロスドメイン通信時の正確なオリジン指定のため targetOrigin を保持
				try {
					this.#targetOrigin = this.#targetWindow.location.origin;
				} catch (e) {
					// 他ドメインの場合は location.origin にアクセスできないため、allowedOrigins から推測するか '*' を暫定使用
					this.#targetOrigin = allowedOrigins[0] || "*";
				}
			} else {
				this.#targetWindowGetter = targetWindow_or_itsGetter; // インスタンス生成時にまだターゲットのウィンドが確定していないケースがある
			}
		}

		if (responseReady == true) {
			this.#submitReady();
			this.#readyState = true;
		} else if (typeof responseReady === "object") {
			// オプションオブジェクトとしての処理 2026/01/29
			this.#options = responseReady;
			if (this.#options.submitReady !== false) {
				this.#submitReady();
				this.#readyState = true;
			}
		}

		// コンストラクタでホワイトリストを受け取る
		if (Array.isArray(allowedOrigins)) {
			this.#allowedOrigins = allowedOrigins;
		} else {
			console.warn("InterWindowMessaging: allowedOrigins must be an array.");
		}
	}

	#targetWindow = null; // イベント受信先の同定用、下のgetterかこちらのどちらかが設定されている
	#targetWindowGetter = null;
	#targetOrigin = "*"; // postMessage 用のターゲットオリジン
	#readyState = false;
	#allowedOrigins;
	#options = {};

	#functionSet_int;
	// functionSetは、インスタンス生成時に指定する。
	// 連想配列、Key: 関数名、Val: 関数（bindはたいてい必要だと思います。）

	#setMessageListener() {
		window.addEventListener(
			"message",
			async function (event) {
				let msg;
				try {
					msg = JSON.parse(event.data);
				} catch (e) {
					return;
				}

				const isOriginAllowed =
					this.#allowedOrigins.includes(event.origin) ||
					event.origin === window.location.origin ||
					(this.#options.alwaysAllowCommands &&
						this.#options.alwaysAllowCommands.includes(msg.command));

				if (!isOriginAllowed) {
					console.warn(
						`InterWindowMessaging: Message blocked from untrusted origin: ${event.origin}`
					);
					return;
				}
				var targetWin = this.#getTargetWindow();

				// クロスドメイン通信時のDOMException回避のため、event.source.location.pathname のチェックを廃止。
				// 代わりに event.source (Windowオブジェクト) 自体の一致を確認する。
				// targetWin が指定されている場合は厳格にチェック、未指定の場合は origin 許可のみで通す。
				if (targetWin && event.source !== targetWin) return;

				console.log(
					"InterWindowMessaging get message:",
					event.data,
					" srcWin:",
					event.source
				);
				if (msg.command) {
					console.log("functionSet_int:", this.#functionSet_int);
					if (this.#functionSet_int[msg.command]) {
						// ハンドラ実行時にコンテキストとして送信元情報を渡す 2026/01/29
						var ans = await this.#functionSet_int[msg.command].call(
							{ origin: event.origin, source: event.source },
							...msg.parameter
						);
						var resp = {
							response: msg.command,
							content: ans,
						};
						console.log("========\ncmd:", msg.command);
						console.log("parameter:", msg.parameter);
						console.log("ans:", ans);
						var messageJson = JSON.stringify(resp);
						// 返信先のオリジンを確定。targetOrigin が '*' の場合は受信した origin を使用して安全性を高める。
						const replyOrigin =
							this.#targetOrigin === "*" ? event.origin : this.#targetOrigin;
						event.source.postMessage(messageJson, replyOrigin);
					} else {
						console.log(
							"========\ncmd:",
							msg.command,
							" is not exists within commandSet"
						);
						var messageJson = JSON.stringify({ response: "error" });
						const replyOrigin =
							this.#targetOrigin === "*" ? event.origin : this.#targetOrigin;
						event.source.postMessage(messageJson, replyOrigin);
					}
				} else if (msg.ready == true) {
					console.log("Get ready!");
					this.#readyState = true;
				}

				if (this.#messageCallbackObj) {
					this.#messageCallbackObj(event.data);
					this.#messageCallbackObj = null;
				}
			}.bind(this),
			false
		);
	}
	#getTargetWindow = function () {
		var targetWin;
		if (this.#targetWindowGetter) {
			targetWin = this.#targetWindowGetter();
		} else {
			targetWin = this.#targetWindow;
		}
		return targetWin;
	}.bind(this);

	#messageCallbackObj = null;
	#retryMax = 100;
	#postMessagePromise(messageJson) {
		// postMessageに対して返却があるケースはこちらを使ってawaitする
		return new Promise(
			async function (okCallback, ngCallback) {
				var rc = 0;
				while (this.#readyState == false || this.#messageCallbackObj != null) {
					console.log("waiting post message");
					if (rc > this.#retryMax) {
						ngCallback(
							"postMessagePromise: Now waiting message. skip.  command:" +
								JSON.parse(messageJson).command
						);
						return;
					}
					await this.#sleep(5);
					++rc;
				}
				this.#messageCallbackObj = okCallback;
				var targetWin = this.#getTargetWindow();
				// #targetOrigin を使用して安全に送信。
				targetWin.postMessage(messageJson, this.#targetOrigin);
			}.bind(this)
		);
	}

	#sleep = (ms) => new Promise((res) => setTimeout(res, ms));

	/**
	 * 指定したウィンドウへ安全にメッセージを送信する（一方向）
	 * クロスドメイン通信時のオリジン指定をカプセル化する 2026/01/28
	 * @param {Window} targetWin 送信先ウィンドウ
	 * @param {Object|string} message 送信するデータ
	 */
	postMessageTo(targetWin, message) {
		if (!targetWin) return;
		const messageJson =
			typeof message === "string" ? message : JSON.stringify(message);
		targetWin.postMessage(messageJson, this.#targetOrigin);
	}

	async callRemoteFunc(fName, paramArray) {
		console.log("callRemoteFunc:", fName);
		var messageObj = { command: fName, parameter: paramArray };
		var messageJson = JSON.stringify(messageObj);
		var ret = await this.#postMessagePromise(messageJson);
		ret = JSON.parse(ret);
		if (ret.response == fName) {
			return ret.content;
		} else {
			return null;
		}
	}

	#submitReady() {
		var targetWin = this.#getTargetWindow();
		console.log("submitReady:", targetWin);
		if (targetWin) {
			targetWin.postMessage(
				JSON.stringify({ ready: true }),
				this.#targetOrigin
			);
		} else {
			console.log("submitReady: No target window yet, skipping.");
		}
	}

	async getReady() {
		while (this.#readyState == false) {
			await this.#sleep(5);
		}
		console.log("Ready!");
	}

	/**
	 * 動的に許可オリジンを追加する。
	 * ユーザーによるクロスドメインアクセスの事後承認に対応するため。 2026/01/28
	 * @param {string} origin 許可するオリジン
	 */
	addAllowedOrigin(origin) {
		if (origin && !this.#allowedOrigins.includes(origin)) {
			console.log("InterWindowMessaging: Adding allowed origin:", origin);
			this.#allowedOrigins.push(origin);
		}
		console.log("Current allowedOrigins:", this.#allowedOrigins);
	}
}

export { InterWindowMessaging };
