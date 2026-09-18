// Description:
// Iframe Adapter for S-LaWA (IframeAdapter4SLaWA)
// コアフレームワーク（LayerSpecificWebAppHandler）が期待する iframe のインターフェースをエミュレートし、
// クロスオリジンの S-LaWA との通信を仲介するクラス。
//
// プロトタイピングしてきたサンドボックス強化LaWA(S-LaWA)フレームワークはLaWAとして構築していたが、本流導入に際し、
// LaWA/S-LaWA iframe入れ子構造を解消、しS-LaWAのiframeのみにする役割
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// 2026/03/09: 初期実装
// 2026/04/07: S-LaWA Level2対応
// 2026/04/16: 起動モード指定オプション(data-lawa-mode="isolated"|"tight"|"auto")を導入。

import { SandboxWrapper } from "./SandboxWrapper.js";

export class IframeAdapter4SLaWA {
	#svgMap;
	#layerID;
	#defaultStyle;
	#virtualIframe;
	#realIframe;
	#sandboxWrapper;

	constructor(svgMap, layerID, defaultStyle) {
		this.#svgMap = svgMap;
		this.#layerID = layerID;
		this.#defaultStyle = defaultStyle;
	}

	/**
	 * コアフレームワークに渡すための仮想iframe（Adapter）を生成する
	 * @param {string} crossOriginUrl - S-LaWAの起動URL
	 * @returns {HTMLDivElement} - iframeのフリをしたdiv要素
	 */
	create(crossOriginUrl) {
		// コアの appendChild やスタイル操作に耐えるための仮想iframe
		this.#virtualIframe = document.createElement("div");
		this.#virtualIframe.id = "layerSpecificUIframe_" + this.#layerID;
		this.#virtualIframe.style.width = "100%";
		this.#virtualIframe.style.height = "100%";
		this.#virtualIframe.style.overflow = "hidden"; // ★余計なスクロールを排除

		// 内部に本物の S-LaWA用 iframe を生成
		this.#realIframe = document.createElement("iframe");
		this.#realIframe.src = crossOriginUrl;
		this.#realIframe.style.width = "100%";
		this.#realIframe.style.height = "100%";
		//		this.#realIframe.style.height = "calc(100% - 50px)";
		this.#realIframe.style.border = "none";
		this.#realIframe.style.display = "block";
		
		// --- S-LaWA強制(isolated)時のサンドボックス化処理 ---
		// このアダプタが呼ばれている時点でS-LaWAとしての動作が確定している。
		// その上で対象URLが同一オリジンである場合、isolated指定による強制S-LaWAと自己判定し、
		// Opaque Origin化のためのsandbox属性を付与して隔離する。
		try {
			const targetUrlObj = new URL(crossOriginUrl, window.location.href);
			if (targetUrlObj.origin === window.location.origin) {
				this.#realIframe.setAttribute("sandbox", "allow-scripts");
				// console.info(`[S-LaWA ${this.#layerID}] Same-origin S-LaWA detected. Applied sandbox='allow-scripts'.`);
			}
		} catch (e) {
			console.warn(`[S-LaWA ${this.#layerID}] Invalid URL for sandbox check:`, e);
		}
		
		this.#virtualIframe.appendChild(this.#realIframe);

		// 実際のS-LaWA処理を担当する SandboxWrapper を初期化
		this.#sandboxWrapper = new SandboxWrapper(
			this.#svgMap,
			this.#layerID,
			this.#realIframe,
			crossOriginUrl,
		);

		// コアフレームワークに対してiframeに見せるためのモックをセットアップ
		this.#setupMocks(crossOriginUrl);

		// ラッパーの通信チャネル確立を開始
		this.#sandboxWrapper.initLaWA();

		return this.#virtualIframe;
	}

	/**
	 * このS-LaWAレイヤーに対してLUTデータ生成をRPC要求する。
	 * SandboxWrapperの存在・通信手段はここで隠蔽する。
	 */
	async requestLutData(sourceBox, sourceBoxType, grid = 16) {
		if (!this.#sandboxWrapper) return null;
		return this.#sandboxWrapper.requestLutData(sourceBox, sourceBoxType, grid);
	}

	// --------------------------------------------------------
	// コアフレームワークからの仮想iframeアクセスを受け流すモック群
	// --------------------------------------------------------
	#setupMocks(crossOriginUrl) {
		const that = this; // イベント転送内でクラスインスタンスを参照するため

		const defaultHeight = parseInt(this.#defaultStyle?.height) || 400;
		const defaultWidth = parseInt(this.#defaultStyle?.width) || 400;
		//		const safeHeight = defaultHeight - 60; //これは不要だったかな
		const safeHeight = defaultHeight;

		this.#virtualIframe.contentWindow = {
			// 【A. コアからのオブジェクト直接注入の受け皿】
			layerID: this.#layerID,
			controllerSrc: crossOriginUrl,
			svgMap: null,
			svgMapGIStool: null,
			svgMapAuthoringTool: null,
			svgMapPWA: null,
			svgMapLayerUI: null,
			putGlobalMessage: function () {},
			svgImageProps: {},
			svgImage: null,
			setLoadingFlag: function (stat) {},

			// 【B. コアからのコールバック吸い上げ用】
			preRenderFunction: null,

			// 【C. SVGスクリプト評価のダミー】
			// コアが iframe.contentWindow.Function(...) で実行を試みるのを防ぐ
			Function: function () {
				return function () {
					return {
						onloadFunction: function () {},
						preRenderFunction: function () {},
					};
				};
			},

			// 【D. XHR/Fetch 通信フックのダミー】
			// コアがネットワーク監視のためにプロトタイプを書き換えるのを空振りさせる
			fetch: async function () {},
			XMLHttpRequest: function () {},
			Response: { prototype: {} },

			addEventListener: function () {},
			removeEventListener: function () {},

			// 【E. document のダミー（Adapterの要）】
			document: {
				URL: "http://virtual-lawa", // #iFrameReady の about:blank 判定を即座にパス
				readyState: "complete", // #iFrameReady の ポーリングを即座にパス

				// レガシーなイベント作成メソッドのモック
				createEvent: function (type) {
					return {
						initEvent: function (name) {
							this.type = name;
						},
					};
				},

				// コアからきたイベント(zoomPanMap等)をキャッチして Wrapper に転送
				dispatchEvent: function (event) {
					that.#sandboxWrapper.sendEventToSLaWA(event.type);
				},

				addEventListener: function () {},
				attachEvent: function () {},
				write: function () {},
				close: function () {},

				// コアの #testIframeSize 等の自動リサイズ計測への対応
				documentElement: {
					get offsetWidth() {
						return defaultWidth;
					},
					scrollHeight: safeHeight,
					offsetHeight: safeHeight,
				},
				body: { offsetHeight: safeHeight },
			},
		};

		// XMLHttpRequest のプロトタイプ書き換え対策
		this.#virtualIframe.contentWindow.XMLHttpRequest.prototype = {
			open: function () {},
			send: function () {},
		};

		// documentエイリアス
		this.#virtualIframe.contentDocument =
			this.#virtualIframe.contentWindow.document;

		// コアの #iFrameReady で監視している load イベントを即座に発火
		const originalAddEventListener = this.#virtualIframe.addEventListener.bind(
			this.#virtualIframe,
		);
		this.#virtualIframe.addEventListener = function (type, listener, options) {
			if (type === "load") {
				setTimeout(listener, 10); // 非同期でロード完了に対応
			} else {
				originalAddEventListener(type, listener, options);
			}
		};
	}

	/**
	 * S-LaWA Lv2 として起動すべきクロスオリジンSVGロードをインターセプトし、
	 * ダミーのレスポンスを生成する静的メソッド 2026/04/08
	 */
	static createDummyResponseIfApplicable(path, id, parentElem, parentSvgDocId) {
		// Root直下のレイヤーでなければ対象外
		if (id === "root" || parentSvgDocId !== "root") return null;

		const controllerUrl = parentElem
			? parentElem.getAttribute("data-controller")
			: null;

		// 2026/4/15 LaWAモードモード指定属性(tight判定)
		const modeAttr = parentElem
			? parentElem.getAttribute("data-lawa-mode")
			: null;
		const isTight = modeAttr === "tight";

		// クロスオリジン判定
		let isCrossOrigin = false;
		let targetUrl;
		try {
			targetUrl = new URL(path, location.href);
			isCrossOrigin = targetUrl.origin !== location.origin;
		} catch (e) {
			return null;
		}

		// console.log("createDummyResponseIfApplicable : isCrossOrigin :", isCrossOrigin , " controllerUrl:",controllerUrl," parentElem:",parentElem);
		if (isCrossOrigin && controllerUrl && !isTight) {
			// console.log(`[S-LaWA Lv2] ダミーSVGを注入してロードをインターセプトします: ${path}`);
			// コントローラとCRS解決の関門を解決するダミーSVG
			const dummySvgText = `
				<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" data-controller="${controllerUrl}" data-slawa-svg-url="${targetUrl.href}">
					<globalCoordinateSystem srsName="http://purl.org/crs/84" transform="matrix(1.0,0.0,0.0,-1.0,0.0,0.0)" />
				</svg>
			`;
			return {
				readyState: 4,
				status: 200,
				responseText: dummySvgText.trim(),
			};
		}
		return null;
	}
}
