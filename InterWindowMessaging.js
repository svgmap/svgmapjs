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
// 2026/02/01 IDベースのメッセージングへのリファクタリング
// 2026/02/01 ハンドシェイク機能の統合
// 2026/02/01 自動ハンドシェイク応答機能の追加 (Task 4.3)

class InterWindowMessaging {
	#targetWindow = null;
	#targetWindowGetter = null;
	#targetOrigin = "*";
	#readyState = false;
	#readyPromise = null;
	#readyResolve = null;
	#allowedOrigins = [];
	#options = {
		timeout: 30000,
		handshakeTimeout: 5000,
		handshake: false,
	};
	#functionSet_int;
	#pendingRequests = new Map();
	#handshakeToken = null;
	#handshakeTimeoutId = null;
	#isHandshakeComplete = false;

	constructor(
		functionSet,
		targetWindow_or_itsGetter,
		responseReady,
		allowedOrigins = []
	) {
		this.#readyPromise = new Promise((resolve) => {
			this.#readyResolve = resolve;
		});

		this.#setMessageListener();

		this.#functionSet_int = functionSet;
		if (targetWindow_or_itsGetter) {
			if (typeof targetWindow_or_itsGetter == "object") {
				this.#targetWindow = targetWindow_or_itsGetter;
				try {
					this.#targetOrigin = this.#targetWindow.location.origin;
				} catch (e) {
					this.#targetOrigin = allowedOrigins[0] || "*";
				}
			} else {
				this.#targetWindowGetter = targetWindow_or_itsGetter;
			}
		}

		if (responseReady === true) {
			this.#submitReady();
			this.#setReady();
		} else if (typeof responseReady === "object") {
			Object.assign(this.#options, responseReady);
			if (this.#options.submitReady !== false) {
				this.#submitReady();
				this.#setReady();
			}
			if (this.#options.handshake) {
				this.#startHandshake();
			}
		}

		if (Array.isArray(allowedOrigins)) {
			this.#allowedOrigins = [...allowedOrigins];
		} else {
			console.warn("InterWindowMessaging: allowedOrigins must be an array.");
		}

		// 自動ハンドシェイク応答 (Task 4.3)
		this.#checkAutoHandshake();
	}

	#checkAutoHandshake() {
		try {
			const params = new URLSearchParams(window.location.search);
			const token = params.get("svgMapHandshakeToken");
			const parentOrigin = params.get("svgMapParentOrigin");
			if (token) {
				console.log(
					"InterWindowMessaging: Handshake token found in URL. Responding..."
				);
				if (parentOrigin && parentOrigin !== "*") {
					this.#targetOrigin = parentOrigin;
					this.addAllowedOrigin(parentOrigin); // 親オリジンを信頼リストに追加 (Requirement 5.3)
				}
				this.#sendHandshakeAck(token);
			}
		} catch (e) {
			// location.search にアクセスできない環境（独自スキーマ等）はスキップ
		}
	}

	#sendHandshakeAck(token) {
		const targetWin = this.#getTargetWindow();
		if (targetWin) {
			const ackMsg = {
				command: "handshakeAck",
				parameter: [null, token], // lid は null でも可（ホスト側で event.source から特定可能）
			};
			targetWin.postMessage(this.#safeStringify(ackMsg), this.#targetOrigin);
		}
	}

	#startHandshake() {
		this.#handshakeToken = Math.random().toString(36).substring(2, 15);
		this.#handshakeTimeoutId = setTimeout(() => {
			if (!this.#isHandshakeComplete) {
				console.warn("InterWindowMessaging: Handshake timeout.");
				this.#handshakeToken = null;
				if (typeof this.#options.onHandshakeTimeout === "function") {
					this.#options.onHandshakeTimeout();
				}
			}
		}, this.#options.handshakeTimeout);
	}

	#setReady() {
		if (!this.#readyState) {
			this.#readyState = true;
			this.#readyResolve();
		}
	}

	#safeStringify(obj) {
		const seen = new WeakSet();
		const sanitize = (val) => {
			if (val === null || typeof val !== "object") return val;
			if (seen.has(val)) return undefined;
			try {
				if (
					typeof val === "object" &&
					val !== null &&
					"window" in val &&
					val.window === val
				)
					return undefined;
				seen.add(val);
			} catch (e) {
				return undefined;
			}
			if (Array.isArray(val)) {
				return val.map(sanitize);
			}
			const sanitizedObj = {};
			for (const key in val) {
				try {
					const sanitizedValue = sanitize(val[key]);
					if (sanitizedValue !== undefined) sanitizedObj[key] = sanitizedValue;
				} catch (e) {}
			}
			return sanitizedObj;
		};

		try {
			return JSON.stringify(sanitize(obj));
		} catch (e) {
			console.error("InterWindowMessaging: Serialization failed:", e);
			return JSON.stringify({
				error: "serialization failed",
				detail: e.message,
			});
		}
	}

	#setMessageListener() {
		window.addEventListener("message", async (event) => {
			let msg;
			try {
				msg = JSON.parse(event.data);
			} catch (e) {
				return;
			}

			const targetWin = this.#getTargetWindow();
			// 送信元ウィンドウが指定されている場合、一致しなければ無視する（他のインスタンス向けのメッセージである可能性があるため）
			if (targetWin && event.source !== targetWin) return;

			const isHandshakeAck = msg.command === "handshakeAck";
			const isAlwaysAllowed =
				this.#options.alwaysAllowCommands &&
				this.#options.alwaysAllowCommands.includes(msg.command);
			const isHELO = msg.command === "HELO";

			const isOriginAllowed =
				this.#allowedOrigins.includes(event.origin) ||
				event.origin === window.location.origin ||
				isAlwaysAllowed ||
				isHELO ||
				(isHandshakeAck && this.#handshakeToken); // ハンドシェイクACKは検証前でもオリジンを問わずパースを許可
			console.log(
				"## InterWindowMessaging: Received message from origin:",
				event.origin,
				"Allowed:",
				isOriginAllowed,
				this
			);
			if (!isOriginAllowed) {
				console.warn(
					`InterWindowMessaging: Message blocked from untrusted origin: ${event.origin}`
				);
				return;
			}

			// ターゲットオリジンの確定（* の場合）
			if (
				targetWin &&
				event.source === targetWin &&
				this.#targetOrigin === "*"
			) {
				this.#targetOrigin = event.origin;
			}

			console.log(
				"InterWindowMessaging get message:",
				event.data,
				" srcWin:",
				event.source
			);

			// HELO への応答 (ハンドシェイク確立を助ける)
			if (isHELO) {
				const params = new URLSearchParams(window.location.search);
				const token = params.get("svgMapHandshakeToken");
				if (token) {
					this.#sendHandshakeAck(token);
				}
				return;
			}

			// ハンドシェイク処理
			if (isHandshakeAck) {
				const [lid, token] = msg.parameter || [];
				if (token && token === this.#handshakeToken) {
					console.log(
						`InterWindowMessaging: Handshake established. Origin: ${event.origin}`
					);
					if (this.#handshakeTimeoutId) {
						clearTimeout(this.#handshakeTimeoutId);
						this.#handshakeTimeoutId = null;
					}
					this.addAllowedOrigin(event.origin);
					this.#isHandshakeComplete = true;
					this.#handshakeToken = null; // 使い捨て
					if (typeof this.#options.onHandshake === "function") {
						this.#options.onHandshake(event.origin);
					}
					// ACKに対する返信
					const resp = { id: msg.id, response: "handshakeAck", content: "ok" };
					event.source.postMessage(this.#safeStringify(resp), event.origin);
					return;
				} else {
					// マルチターゲット環境（LayerSpecificWebAppHandler等）への配慮:
					// 自身の待受トークンと一致しない場合でも、上位レイヤーで処理される可能性があるため警告のみ
					console.log(
						"InterWindowMessaging: Handshake token mismatch in this instance."
					);
				}
			}

			// ハンドシェイク未完了時の制限
			if (
				this.#options.handshake &&
				!this.#isHandshakeComplete &&
				!isAlwaysAllowed
			) {
				console.warn(
					"InterWindowMessaging: Message blocked before handshake completion."
				);
				return;
			}

			if (msg.id && this.#pendingRequests.has(msg.id)) {
				const { resolve } = this.#pendingRequests.get(msg.id);
				this.#pendingRequests.delete(msg.id);
				resolve(event.data);
				return;
			}

			if (msg.command) {
				if (this.#functionSet_int[msg.command]) {
					const ans = await this.#functionSet_int[msg.command].call(
						{ origin: event.origin, source: event.source },
						...(msg.parameter || [])
					);
					const resp = { id: msg.id, response: msg.command, content: ans };
					const replyOrigin =
						this.#targetOrigin === "*" ? event.origin : this.#targetOrigin;
					event.source.postMessage(this.#safeStringify(resp), replyOrigin);
				} else {
					const resp = { id: msg.id, response: "error" };
					const replyOrigin =
						this.#targetOrigin === "*" ? event.origin : this.#targetOrigin;
					event.source.postMessage(this.#safeStringify(resp), replyOrigin);
				}
			} else if (msg.ready === true) {
				this.#setReady();
			}
		});
	}

	#getTargetWindow() {
		return this.#targetWindowGetter
			? this.#targetWindowGetter()
			: this.#targetWindow;
	}

	#postMessagePromise(messageJson) {
		const msg = JSON.parse(messageJson);
		const id = Math.random().toString(36).substring(2, 15);
		msg.id = id;
		const updatedJson = JSON.stringify(msg);

		return new Promise((resolve, reject) => {
			let timeoutId = null;
			const timeout = this.#options.timeout || 0;
			if (timeout > 0) {
				timeoutId = setTimeout(() => {
					if (this.#pendingRequests.has(id)) {
						this.#pendingRequests.delete(id);
						reject(
							new Error(
								`InterWindowMessaging: Response timeout for command: ${msg.command}`
							)
						);
					}
				}, timeout);
			}

			this.#pendingRequests.set(id, {
				resolve: (data) => {
					if (timeoutId) clearTimeout(timeoutId);
					resolve(data);
				},
				reject: (error) => {
					if (timeoutId) clearTimeout(timeoutId);
					reject(error);
				},
			});

			const send = () => {
				const targetWin = this.#getTargetWindow();
				if (targetWin && (this.#readyState || msg.ready)) {
					targetWin.postMessage(updatedJson, this.#targetOrigin);
				} else {
					setTimeout(send, 50);
				}
			};
			send();
		});
	}

	postMessageTo(targetWin, message) {
		if (!targetWin) return;
		const messageJson =
			typeof message === "string" ? message : this.#safeStringify(message);
		targetWin.postMessage(messageJson, this.#targetOrigin);
	}

	async callRemoteFunc(fName, paramArray) {
		const messageObj = { command: fName, parameter: paramArray };
		const retJson = await this.#postMessagePromise(JSON.stringify(messageObj));
		const ret = JSON.parse(retJson);
		return ret.response === fName ? ret.content : null;
	}

	#submitReady() {
		const targetWin = this.#getTargetWindow();
		if (targetWin) {
			targetWin.postMessage(
				this.#safeStringify({ ready: true }),
				this.#targetOrigin
			);
		}
	}

	async getReady() {
		await this.#readyPromise;
		console.log("Ready!");
	}

	addAllowedOrigin(origin) {
		if (origin && !this.#allowedOrigins.includes(origin)) {
			this.#allowedOrigins.push(origin);
		}
	}

	getHandshakeTokenForTesting() {
		return this.#handshakeToken;
	}
}

export { InterWindowMessaging };
