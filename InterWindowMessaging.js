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
// 2026/03/02 プロトタイプS-LaWA用をベースに統合 ～ 同一ドメイン時のパスチェック機能とGetter対応を追加
// 2026/03/10 いろいろ改善
//   - 複数インスタンス動作時のクロストーク対策
//   - getReady()のビジーウェイト廃止 → Promiseベースの待機に変更
//   - #pendingResponsesのメモリリーク対策（タイムアウト付きreject）
// 2026/07/22 transferablesをサポート
//
//  Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class InterWindowMessaging {
	// -----------------------------------------------------------------------
	// 定数
	// -----------------------------------------------------------------------

	/** ネゴシエーション再試行の上限回数 */
	static #MAX_NEGOTIATION_RETRIES = 2;

	/** getReady() のデフォルトタイムアウト (ms) */
	static #DEFAULT_READY_TIMEOUT_MS = 10_000;

	/** callRemoteFunc() のデフォルトタイムアウト (ms) */
	static #DEFAULT_CALL_TIMEOUT_MS = 30_000;

	/** ネゴシエーションモードを示す内部シンボル */
	static #NEGOTIATION = Symbol("negotiation");

	// -----------------------------------------------------------------------
	// 静的ファクトリメソッド
	// -----------------------------------------------------------------------

	/**
	 * ネゴシエーションモードでインスタンスを生成する。
	 * targetOriginに文字列 "negotiation" を直接渡す代わりにこちらを使用する。
	 *
	 * @param {object} functionSet
	 * @param {Window|function(): Window} targetWindow
	 * @param {object} [options]
	 * @returns {InterWindowMessaging}
	 */
	static createWithNegotiation(functionSet, targetWindow, options = {}) {
		return new InterWindowMessaging(
			functionSet,
			targetWindow,
			InterWindowMessaging.#NEGOTIATION,
			options,
		);
	}

	// -----------------------------------------------------------------------
	// プライベートフィールド
	// -----------------------------------------------------------------------

	#targetWindow = null;
	#targetWindowGetter = null;
	#readyState = false;
	#functionSet = {};
	#targetOrigin = null;
	#pendingResponses = new Map();

	/** getReady() で待機中の resolve 関数リスト */
	#readyResolvers = [];

	// ネゴシエーション機能のためのプロパティ
	#isNegotiating = false;
	#negotiationKey = null;
	#isNegotiatingCount = 0;

	// オプション
	#readyTimeoutMs;
	#callTimeoutMs;

	// -----------------------------------------------------------------------
	// コンストラクタ
	// -----------------------------------------------------------------------

	/**
	 * @param {object}               functionSet    - 公開する関数の集合
	 * @param {Window|function}      targetWindow   - 通信先ウィンドウ（またはそのGetter）
	 * @param {string|Symbol|null}   targetOrigin   - 許可するオリジン / "negotiation" / Symbol / null(同一オリジン)
	 * @param {object}               [options]
	 * @param {number}               [options.readyTimeoutMs]  - getReady() タイムアウト (ms)
	 * @param {number}               [options.callTimeoutMs]   - callRemoteFunc() タイムアウト (ms)
	 */
	constructor(functionSet, targetWindow, targetOrigin, options = {}) {
		// --- ガード節をコンストラクタ冒頭に集約 ---
		if (!targetWindow) {
			console.warn("No targetWindow provided.");
			return;
		}
		if (typeof functionSet !== "object" || functionSet === null) {
			console.warn("functionSet must be an object.");
			return;
		}

		this.#functionSet = functionSet;
		this.#readyTimeoutMs =
			options.readyTimeoutMs ?? InterWindowMessaging.#DEFAULT_READY_TIMEOUT_MS;
		this.#callTimeoutMs =
			options.callTimeoutMs ?? InterWindowMessaging.#DEFAULT_CALL_TIMEOUT_MS;

		// Getter関数のサポート
		if (typeof targetWindow === "function") {
			this.#targetWindowGetter = targetWindow;
		} else {
			this.#targetWindow = targetWindow;
		}

		// targetOrigin の判定
		if (targetOrigin === InterWindowMessaging.#NEGOTIATION) {
			// ネゴシエーションモード（ファクトリメソッド経由）
			this.#targetOrigin = null;
			this.#isNegotiating = true;
			this.#negotiationKey = crypto.randomUUID();
		} else if (targetOrigin === "negotiation") {
			// 後方互換: 文字列 "negotiation" も受け付ける
			this.#targetOrigin = null;
			this.#isNegotiating = true;
			this.#negotiationKey = crypto.randomUUID();
		} else if (typeof targetOrigin === "string") {
			this.#targetOrigin = targetOrigin;
			this.#isNegotiating = false;
		} else {
			// 旧版互換: targetOriginにboolean(ready)が渡された場合 もしくは省略されている場合
			// Same Originとする
			this.#targetOrigin = window.location.origin;
			this.#isNegotiating = false;
			if (targetOrigin === true) this.#readyState = true;
		}

		this.#setMessageListener();

		// オブジェクト初期化時に自動でreadyメッセージを送信
		// 先に立ち上がったほうのReadyは当然受け取れない
		this.#submitReady();
	}

	// -----------------------------------------------------------------------
	// パブリックメソッド
	// -----------------------------------------------------------------------

	/**
	 * 接続が確立されるまで待機する。
	 * ビジーウェイトではなくPromiseベースで待機し、タイムアウト時はrejectする。
	 *
	 * @param {number} [timeoutMs] - タイムアウト (ms)。省略時はコンストラクタのオプション値を使用
	 * @returns {Promise<void>}
	 */
	async getReady(timeoutMs) {
		if (this.#readyState) return;

		const ms = timeoutMs ?? this.#readyTimeoutMs;

		return new Promise((resolve, reject) => {
			// msが0以下の場合はタイムアウトさせない（無限待機）
			if (ms <= 0) {
				this.#readyResolvers.push({ resolve });
				return;
			}
			const timerId = setTimeout(() => {
				// タイムアウト時にリストから自身を除去してreject
				this.#readyResolvers = this.#readyResolvers.filter(
					(entry) => entry.resolve !== resolve,
				);
				reject(
					new Error(`InterWindowMessaging: getReady() timed out after ${ms}ms`),
				);
			}, ms);

			this.#readyResolvers.push({
				resolve: () => {
					clearTimeout(timerId);
					resolve();
				},
			});
		});
	}

	/**
	 * リモートウィンドウの関数を呼び出し、結果をPromiseで返す。
	 *
	 * @param {string}   command       - 呼び出す関数名
	 * @param {Array}    [parameter]   - 引数リスト
	 * @param {Array}    [transferables] - Transferable Objects
	 * @param {number}   [timeoutMs]   - タイムアウト (ms)。省略時はコンストラクタのオプション値を使用
	 * @returns {Promise<*>}
	 */
	async callRemoteFunc(command, parameter = [], transferables = [], timeoutMs) {
		await this.getReady();

		const id = crypto.randomUUID();
		const ms = timeoutMs ?? this.#callTimeoutMs;
		const message = { id, command, parameter };

		return new Promise((resolve, reject) => {
			let timerId;
			if (ms > 0) {
				// タイムアウト処理
				timerId = setTimeout(() => {
					if (this.#pendingResponses.has(id)) {
						this.#pendingResponses.delete(id);
						reject(
							new Error(
								`InterWindowMessaging: callRemoteFunc("${command}") timed out after ${ms}ms`,
							),
						);
					}
				}, ms);
			}

			this.#pendingResponses.set(id, {
				resolve: (msg) => {
					if (timerId) clearTimeout(timerId); // タイマーがあれば解除
					resolve(msg);
				},
				reject: (err) => {
					if (timerId) clearTimeout(timerId); // タイマーがあれば解除
					reject(err);
				},
			});

			this.#postMessage(message, transferables);
		}).then((msg) => {
			// リモート側からエラーレスポンスが返ってきた場合はthrow
			if (msg.response === "error") {
				throw new Error(
					msg.error ??
						`InterWindowMessaging: remote error on command "${command}"`,
				);
			}
			return msg.content;
		});
	}

	// -----------------------------------------------------------------------
	// プライベートメソッド
	// -----------------------------------------------------------------------

	#setMessageListener() {
		window.addEventListener("message", async (event) => {
			// 自分が投げたメッセージが跳ね返ってきたものは無視
			if (event.source === window) return;

			// シャドーイング解消: リスナー冒頭で一度だけ取得し、以降はこれを使う
			const targetWin = this.#getTargetWindow();

			if (!targetWin || event.source !== targetWin) {
				return;
			}

			const origin = event.origin;

			// 同一ドメイン時のパスチェック（混線防止）
			if (origin === window.location.origin) {
				try {
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

			let msg;
			try {
				msg =
					typeof event.data === "string" ? JSON.parse(event.data) : event.data;
			} catch (e) {
				console.warn("Invalid message data format:", event.data);
				return;
			}

			// 親ウィンドウ（ネゴシエーションモード接続を受ける側）の処理
			if (!this.#isNegotiating && msg.negotiationKey) {
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
				if (
					this.#isNegotiatingCount <
					InterWindowMessaging.#MAX_NEGOTIATION_RETRIES
				) {
					// 先にNegotiationしない側が立ち上がった場合はリトライ
					this.#submitReady();
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

			if (this.#targetOrigin !== "*" && this.#targetOrigin !== origin) {
				console.warn(
					`Message from disallowed origin: ${origin} (Allowed targetOrigin:${this.#targetOrigin}), location=${window.location.origin}, msg:`,
					msg,
				);
				return;
			}

			// Transferable Objectsを含むメッセージの処理
			if (msg.transferable) {
				msg.parameter = msg.parameter || [];
				msg.parameter[msg.transferable.index] = event.data;
			}

			// レスポンスメッセージの処理
			if (msg.response && msg.id && this.#pendingResponses.has(msg.id)) {
				this.#pendingResponses.get(msg.id).resolve(msg);
				this.#pendingResponses.delete(msg.id);
				return;
			}

			// ready シグナルの処理
			if (msg.ready === true) {
				if (!this.#readyState) {
					this.#completeConnection();
				}
				return;
			}

			// コマンドの処理
			if (msg.command && typeof msg.command === "string") {
				const func = this.#functionSet[msg.command];
				if (typeof func === "function") {
					const params = Array.isArray(msg.parameter)
						? msg.parameter
						: msg.parameter !== null && msg.parameter !== undefined
							? [msg.parameter]
							: [];

					let result;
					try {
						result = await func(...params);
					} catch (err) {
						console.warn(`Error executing command "${msg.command}":`, err);
						this.#postMessage({
							id: msg.id || null,
							response: "error",
							error: err?.message ?? "Unknown error",
						});
						return;
					}
					// 2027/7/22 戻り値が transferables 配列を持つ場合の転送
					let transferables = [];
					if (result && Array.isArray(result.transferables)) {
						transferables = result.transferables;
						result = result.data; // 実データのみを抽出
					}
					this.#postMessage({
						id: msg.id || null,
						response: msg.command,
						content: result,
					}, transferables);
				} else {
					console.warn(`Unknown command: ${msg.command}`);
					this.#postMessage({
						id: msg.id || null,
						response: "error",
						error: `Unknown command: ${msg.command}`,
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

		// getReady() で待機中のPromiseをすべて解決する
		for (const entry of this.#readyResolvers) {
			entry.resolve();
		}
		this.#readyResolvers = [];

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
			// console.warn("Target window not available");
			return;
		}

		// ネゴシエーションモードで初期メッセージを送る場合のみ、ターゲットオリジンを`*`にする
		const postOrigin =
			this.#isNegotiating && !this.#targetOrigin ? "*" : this.#targetOrigin;

		if (transferables.length > 0) {
			targetWin.postMessage(messageObject, postOrigin, transferables);
		} else {
			// 旧版との互換性を高めるため、基本はJSON文字列で送信
			targetWin.postMessage(JSON.stringify(messageObject), postOrigin);
		}
	}

	#submitReady() {
		let message;
		if (this.#isNegotiating) {
			message = { ready: true, negotiationKey: this.#negotiationKey };
			this.#isNegotiatingCount++;
		} else {
			message = { ready: true };
		}
		this.#postMessage(message);
	}
}

export { InterWindowMessaging };
