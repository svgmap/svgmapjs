class CustomModal {
	constructor(mapTicker) {
		this.mapTicker = mapTicker;
		console.log("const:CustomModal: this.mapTicker", this.mapTicker);
	}

	mapTicker;

	// アプリ側で利用できるモーダルフレームワーク
	// メッセージ(のhtmlソースもしくはDOM)及び、複数個のボタン、コールバック(押したボタンのインデックス入り)が使える
	// DOMをmessageHTMLに使っても良いことに 2019/7/9
	/**
	 * @function
	 * @name setCustomModal
	 * @description アプリ側で利用できるモーダルフレームワーク
	 *
	 * @param {String|Document} messageHTML
	 * @param {Array} buttonMessages // Modalを閉じるためにダイアログ下に出現するボタン群(1個以上)のメッセージを入れた配列
	 * @param {Function} callback // モーダル終了時に呼ばれるコールバック　第一引数に押されたボタンの番号,第二引数に以下のcallbackParam
	 * @param {Object} callbackParam
	 * @param {Object} options
	 */
	setCustomModal(
		messageHTML,
		buttonMessages,
		callback,
		callbackParam,
		options
	) {
		// added 2017/1/25
		console.log(
			"setCustomModal :",
			"btmMsgs:",
			buttonMessages,
			Array.isArray(buttonMessages),
			"options:",
			options
		);
		let position = { top: 0, left: 0 };
		if (options.position?.tagName) {
			// instanceof Elementとかダメだった・・・ iframeのdocだから？？
			position = this.#getAbsolutePosition(options.position);
			console.log(position);
		} else if (
			isNaN(options.position?.top) == false &&
			isNaN(options.position?.left) == false
		) {
			position = { top: options.position?.top, left: options.position?.left };
		}
		var cm = this.mapTicker.initModal("customModal");

		cm.style.top = position.top + "px";
		cm.style.left = position.left + "px";

		for (var i = cm.childNodes.length - 1; i >= 0; i--) {
			cm.removeChild(cm.childNodes[i]);
		}
		if (buttonMessages) {
			if (Array.isArray(buttonMessages)) {
			} else {
				var bm = buttonMessages;
				buttonMessages = new Array();
				buttonMessages[0] = bm;
			}
		} else {
			buttonMessages = ["OK"];
		}

		console.log("setCustomModal :", buttonMessages);

		var message = document.createElement("div");
		if (typeof messageHTML == "object" && messageHTML.nodeType == 1) {
			message.appendChild(messageHTML);
		} else {
			message.innerHTML = messageHTML;
		}
		cm.appendChild(message);

		for (var i = 0; i < buttonMessages.length; i++) {
			var btn = document.createElement("input");
			btn.setAttribute("type", "button");
			btn.id = "customModalBtn_" + i;
			btn.setAttribute("value", buttonMessages[i]);
			cm.appendChild(btn);
		}
		var clickFunc = function (e) {
			return function cmf(e) {
				if (e.target.id.indexOf("customModalBtn_") >= 0) {
					this.mapTicker.initModal();
					if (callback) {
						callback(Number(e.target.id.substring(15)), callbackParam);
					}
					cm.removeEventListener("click", clickFunc, false);
				}
			}.bind(this);
		}.bind(this)();

		cm.addEventListener("click", clickFunc, false);
		window.setTimeout(function () {
			// 出現させたウィンドが画面からはみ出る時の次善策 ResizeObserverは面倒なのでやめとく
			console.log("cm pos:", cm.offsetWidth, cm.offsetHeight);
			if (position.top + cm.offsetHeight > window.innerHeight) {
				cm.style.top = Math.max(window.innerHeight - cm.offsetHeight, 0);
			}
			if (position.left + cm.offsetWidth > window.innerWidth) {
				cm.style.left = Math.max(window.innerWidth - cm.offsetWidth, 0);
			}
		}, 100);
	}

	/**
	 * @function
	 * @name #getAbsolutePosition
	 * @description 指定した要素のブラウザウィンド内での絶対座標を取得する
	 *
	 * @return {Object} result
	 * @return {number} result.top
	 * @return {number} result.left
	 */
	#getAbsolutePosition(element) {
		let rect = element.getBoundingClientRect();
		let absoluteTop =
			rect.top + (element.ownerDocument.defaultView.scrollY || 0); // 初期ウィンドウのスクロール量
		let absoluteLeft =
			rect.left + (element.ownerDocument.defaultView.scrollX || 0); // 初期ウィンドウのスクロール量
		//		console.log("elementRect:",absoluteTop,absoluteLeft);
		let currentWindow = element.ownerDocument.defaultView; // 要素が属するウィンドウから開始
		let parentWindow;

		//		console.log("window.top?:",window.top,  "currentWindow:",currentWindow," isEqual:",currentWindow === window.top, "not:",!(currentWindow === window.top));
		//		console.log("topUrl:",window.top.location.toString()," ctUrl:",currentWindow.location.toString());

		while (!(currentWindow === window.top)) {
			parentWindow = currentWindow.parent;
			//			console.log("parent:",parentWindow);
			if (!parentWindow) {
				break;
			}
			//			let frame = parentWindow.frameElement;
			let frame = currentWindow.frameElement;
			//			console.log("cf:",currentWindow.frameElement);
			//			console.log("pf:",parentWindow.frameElement);
			if (frame) {
				let frameRect = frame.getBoundingClientRect();
				//				console.log("frameRect:",frameRect.top,frameRect.left);
				absoluteTop += frameRect.top;
				absoluteLeft += frameRect.left;
			}
			currentWindow = parentWindow;
		}

		return { top: absoluteTop, left: absoluteLeft };
	}
}

export { CustomModal };
