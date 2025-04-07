//  window間で、メッセージングによってデータのやり取りをする。
// 2022/08/10
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//

class InterWindowMessaging {
	constructor(functionSet, targetWindow_or_itsGetter, responseReady) {
		console.log(
			"InterWindowMessaging:functionSet, targetWindow, responseReady",
			functionSet,
			targetWindow_or_itsGetter,
			responseReady
		);
		if (!targetWindow_or_itsGetter) {
			console.warn("No targetWindow_or_itsGetter Exit.");
			console.warn("targetWindow_or_itsGetter is not Window instance");
			return;
		}
		/** ??? window.openerがWindowにならない？
		if ( targetWindow instanceof Window == false){
			console.warn("targetWindow is not Window instance" );
			return;
		}
		if ( functionSet instanceof Object == false){
			console.warn("invalid functionSet");
			return;
		}
		**/
		this.#setMessageListener();

		this.#functionSet_int = functionSet;
		if (typeof targetWindow_or_itsGetter == "object") {
			this.#targetWindow = targetWindow_or_itsGetter;
		} else {
			this.#targetWindowGetter = targetWindow_or_itsGetter; // インスタンス生成時にまだターゲットのウィンドが確定していないケースがある
		}

		if (responseReady == true) {
			this.#submitReady();
			this.#readyState = true;
		}
	}

	#targetWindow = null; // イベント受信先の同定用、下のgetterかこちらのどちらかが設定されている
	#targetWindowGetter = null;
	#readyState = false;

	#functionSet_int;
	// functionSetは、インスタンス生成時に指定する。
	// 連想配列、Key: 関数名、Val: 関数（bindはたいてい必要だと思います。）

	#setMessageListener() {
		window.addEventListener(
			"message",
			async function (event) {
				if (event.origin != window.location.origin) return;
				var targetWin = this.#getTargetWindow();
				if (
					!targetWin ||
					event.source.location.pathname != targetWin.location.pathname
				)
					return;
				console.log(
					"InterWindowMessaging get message:",
					event.data,
					" srcWin:",
					event.source,
					" srcPath:",
					event.source.location.pathname
				);
				var msg = JSON.parse(event.data);
				if (msg.command) {
					if (this.#functionSet_int[msg.command]) {
						var ans = await this.#functionSet_int[msg.command](
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
						targetWin.postMessage(messageJson, targetWin.origin);
					} else {
						console.log(
							"========\ncmd:",
							msg.command,
							" is not exists within commandSet"
						);
						var messageJson = JSON.stringify({ response: "error" });
						targetWin.postMessage(messageJson, targetWin.origin);
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
				targetWin.postMessage(messageJson, targetWin.origin);
			}.bind(this)
		);
	}

	#sleep = (ms) => new Promise((res) => setTimeout(res, ms));

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
		targetWin.postMessage(JSON.stringify({ ready: true }), targetWin.origin);
	}

	async getReady() {
		while (this.#readyState == false) {
			await this.#sleep(5);
		}
		console.log("Ready!");
	}
}

export { InterWindowMessaging };
