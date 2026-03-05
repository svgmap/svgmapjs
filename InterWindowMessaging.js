// Description:
// InterWindowMessagingクラス（クロスオリジン版 ＋ 同一ドメインパスチェック統合）
// クロスオリジンwindow間で、指定した関数をPromise実行、帰り値を得る
//
// History:
// 2022/08/10 1st rel.
// 2025/07/02 ホワイトリストで別オリジンからのメッセージを受け取りも可能にする
//
// 別系統(S-LaWA用InterWindowMessaging:クロスオリジン通信用)
// 2025/08/04 First implementation
// 2025/09/08 セキュリティ改善 : "negotioation"機構を構築し、targetOriginに"*"を使用しないで済むようにした
//
// リファクタリング
// 2026/03/02 S-LaWA用をベースに統合 ～ 同一ドメイン時のパスチェック機能とGetter対応を追加
//
//  Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class InterWindowMessaging {
	constructor(functionSet, targetWindow, targetOrigin) {
		// functionSet に connectionReady関数が含まれている場合接続が確認したら呼び出される
		if (!targetWindow) {
			console.warn("No targetWindow provided.");
			return;
		}
		// --- 統合修正: targetOriginの型判定による互換性維持 ---
		if (targetOrigin === undefined || targetOrigin === null) {
			console.log("No targetOrigin provided, regard as same origin. ");
		}
		if (typeof functionSet !== "object") {
			console.warn("functionSet must be an object.");
			return;
		}

		this.#functionSet = functionSet;

		// --- 統合修正: Getter関数のサポート ---
		if (typeof targetWindow === "function") {
			this.#targetWindowGetter = targetWindow;
		} else {
			this.#targetWindow = targetWindow;
		}

		// --- 統合修正: 引数がboolean(旧版)かstring(n版)かで分岐 ---
		if (targetOrigin === "negotiation") {
			//console.log ("InterWindowMessaging construct enter negotiation process");
			this.#targetOrigin = null;
			this.#isNegotiating = true;
			this.#negotiationKey = crypto.randomUUID(); // ネゴシエーション用の乱数を生成
		} else if (typeof targetOrigin === "string") {
			//console.log ("InterWindowMessaging construct basic process");
			this.#targetOrigin = targetOrigin;
			this.#isNegotiating = false;
		} else {
			// 旧版互換: targetOriginにboolean(ready)が渡された場合　もしくは省略されている場合
			// Same Originとする
			this.#targetOrigin = window.location.origin;
			this.#isNegotiating = false;
			if (targetOrigin === true) this.#readyState = true;
		}

		//console.log("targetOrigin:", this.#targetOrigin);
		this.#setMessageListener();

		// オブジェクト初期化時に自動でreadyメッセージを送信
		this.#submitReady(); // 先に立ち上がったほうのReadyは当然受け取れない
	}

	#targetWindow = null;
	#targetWindowGetter = null;
	#readyState = false;
	#functionSet = {};
	#targetOrigin = null;
	#pendingResponses = new Map();
	// ネゴシエーション機能のためのプロパティ
	#isNegotiating = false;
	#negotiationKey = null;
	#isNegotiatingCount = 0;

	#setMessageListener() {
		window.addEventListener("message", async (event) => {
			const origin = event.origin;

			// --- 統合修正: 同一ドメイン時のパスチェック(混線防止) ---
			if (origin === window.location.origin) {
				try {
					const targetWin = this.#getTargetWindow();
					if (
						targetWin &&
						event.source.location.pathname !== targetWin.location.pathname
					) {
						return;
					}
				} catch (e) {
					// クロスオリジン時はエラーになるため無視
				}
			}

			//console.log("Recieve message", event, " from ", event.origin, " on ", location.origin);
			let msg;
			try {
				// messageのdataが文字列の場合はJSON.parse、それ以外はそのまま
				msg =
					typeof event.data === "string" ? JSON.parse(event.data) : event.data;
			} catch (e) {
				console.warn("Invalid message data format:", event.data);
				return;
			}
			//console.log("Recieve message", msg, " from ", event.origin, " on ", location.origin);

			// 親ウィンドウ（ネゴシエーションモード接続を受ける側）の処理
			if (!this.#isNegotiating && msg.negotiationKey) {
				// 子から乱数を受け取ったら、そのまま返信
				this.#postMessage({
					ready: true,
					negotiationKey: msg.negotiationKey,
				});
				return;
			}
			// 子ウィンドウ（ネゴシエーションモード接続を発出する側）の処理
			if (this.#isNegotiating && !this.#targetOrigin) {
				if (msg.ready === true && msg.negotiationKey === this.#negotiationKey) {
					this.#targetOrigin = origin;
					this.#isNegotiating = false;
					this.#completeConnection();
					return;
				}
				if (this.#isNegotiatingCount < 2) {
					//console.log("Retry Negotiation because of negotiating side launches faster");
					this.#submitReady(); // 先にNegotioationしないほうが立ち上がった場合は1度はチャレンジする
				} else {
					console.warn(
						"Ignoring message during negotiation phase from:",
						origin,
						" msg:",
						msg,
					);
				}
				return;
			}

			if (this.#targetOrigin != "*" && this.#targetOrigin != origin) {
				console.warn(
					`Message from disallowed origin: ${origin} (Allowed:${this.#targetOrigin})`,
				);
				return;
			}

			// Transferable Objectsを含むメッセージの処理
			if (msg.transferable) {
				msg.parameter = msg.parameter || [];
				msg.parameter[msg.transferable.index] = event.data;
			}

			if (msg.response && msg.id && this.#pendingResponses.has(msg.id)) {
				this.#pendingResponses.get(msg.id).resolve(msg);
				this.#pendingResponses.delete(msg.id);
				return;
			}

			if (msg.ready === true) {
				if (!this.#readyState) {
					this.#completeConnection();
				}
				return;
			}

			if (msg.command && typeof msg.command === "string") {
				const func = this.#functionSet[msg.command];
				if (typeof func === "function") {
					const params = Array.isArray(msg.parameter)
						? msg.parameter
						: msg.parameter !== null && msg.parameter !== undefined
							? [msg.parameter]
							: [];
					const result = await func(...params);

					const response = {
						id: msg.id || null,
						response: msg.command,
						content: result,
					};
					this.#postMessage(response);
				} else {
					console.warn(`Unknown command: ${msg.command}`);
					this.#postMessage({
						id: msg.id || null,
						response: "error",
						error: "Unknown command",
					});
				}
			}
		});
	}

	#completeConnection() {
		console.log(
			`Connection successful. Target origin set to: ${this.#targetOrigin}`,
		);
		this.#readyState = true;
		this.#submitReady();
		if (typeof this.#functionSet["connectionReady"] === "function") {
			this.#functionSet["connectionReady"](true);
		}
	}

	#getTargetWindow() {
		return this.#targetWindowGetter
			? this.#targetWindowGetter()
			: this.#targetWindow;
	}

	#postMessage(messageObject, transferables = []) {
		const targetWin = this.#getTargetWindow();
		if (!targetWin) {
			console.warn("Target window not available");
			return;
		}

		// ネゴシエーションモードで初期メッセージを送る場合のみ、ターゲットオリジンを`*`にする
		const postOrigin =
			this.#isNegotiating && !this.#targetOrigin ? "*" : this.#targetOrigin;

		// 移譲可能オブジェクトがある場合
		if (transferables.length > 0) {
			targetWin.postMessage(messageObject, postOrigin, transferables);
		} else {
			// --- 統合修正: 旧版との互換性を高めるため、基本はJSON文字列で送信 ---
			targetWin.postMessage(JSON.stringify(messageObject), postOrigin);
		}
	}

	async callRemoteFunc(command, parameter = [], transferables = []) {
		await this.getReady();

		const id = crypto.randomUUID();
		const message = {
			id,
			command,
			parameter,
		};

		return new Promise((resolve, reject) => {
			this.#pendingResponses.set(id, { resolve, reject });
			this.#postMessage(message, transferables);
		}).then((msg) => msg.content);
	}

	#submitReady() {
		let message;
		if (this.#isNegotiating) {
			// ネゴシエーション用の初期メッセージ
			message = { ready: true, negotiationKey: this.#negotiationKey };
			this.#isNegotiatingCount++;
		} else {
			// 通常のreadyメッセージ
			message = { ready: true };
		}
		this.#postMessage(message);
	}

	async getReady() {
		while (!this.#readyState) {
			await new Promise((res) => setTimeout(res, 5));
		}
	}
}

export { InterWindowMessaging };
