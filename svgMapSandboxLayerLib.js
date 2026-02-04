// Description:
// サンドボックスLaWA(S-LaWA)用のsvgMapSandboxLayerLib.js
// すなわち、これはS-LaWAとなるアプリが呼び出すことで、svgmap.jsのS-LaWAとして機能するようになる。
//
//  Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { InterWindowMessaging } from "./InterWindowMessaging.js";
import { MatrixUtil } from "./libs/TransformLib.js";
import { UtilFuncs } from "./libs/UtilFuncs.js";

let messaging;

// --- クラス定義を前方に移動 ---
class SvgImageProps {
	_int_hashVal;
	set hash(val) {
		this._int_hashVal = val;
		if (messaging) messaging.callRemoteFunc("setHash", [val]);
	}
	get hash() {
		return this._int_hashVal;
	}
}

class SandboxSvgMap {
	#mu;
	constructor() {
		this.#mu = new MatrixUtil();
	}

	getSvgImageProps = async function () {
		if (messaging) {
			const props = await messaging.callRemoteFunc("getSvgImageProps", []);
			if (props) {
				setSvgImageProps(props);
			}
		}
		return window.svgImageProps;
	};
	getGeoViewBox = async function () {
		if (messaging) {
			const props = await this.getSvgImageProps();
			return props ? props.geoViewBox : null;
		}
		return window.svgImageProps ? window.svgImageProps.geoViewBox : null;
	};
	transform = function (x, y, mat, calcSize, nonScaling) {
		return this.#mu.transform(x, y, mat, calcSize, nonScaling);
	};

	// サンドボックス内での変更を検知して親に送る (Task 5.2)
	refreshScreen = async function () {
		if (!observer) {
			console.error("MutationObserver not initialized.");
			return;
		}
		// preRenderFunction があれば実行
		if (window.preRenderFunction) {
			window.preRenderFunction();
		}
		const diffPayload = buildDiffPayload();
		if (diffPayload.length > 0) {
			console.log(
				"svgMapSandboxLayerLib: Sending SVG diff to parent:",
				diffPayload.length,
				"mutations"
			);
			await messaging.callRemoteFunc("applySvgDiff", [diffPayload]);
		}
	};
}

// 実行環境の判定 (Task 3.2, Requirement 5)
// 同一ドメイン（IFrame）環境で既に svgMap が存在する場合、既存の仕組みを優先する
const isSameDomainIFrame = (() => {
	try {
		// window.svgMap が定義済み、または親と svgMap オブジェクトを共有可能な場合は同一ドメインIFrame
		return window.svgMap || (window.opener && window.opener.svgMap);
	} catch (e) {
		// 別ドメインの場合はアクセス拒否されるため、catch 節に入る
		return false;
	}
})();

// 起動時に確実に window オブジェクトへ登録する (Requirement 2.4, 5.1)
if (!isSameDomainIFrame) {
	console.log("svgMapSandboxLayerLib: Initializing global objects on window.");
	window.svgImageProps = window.svgImageProps || new SvgImageProps();
	window.svgMap = window.svgMap || new SandboxSvgMap();
	window.svgImage = window.svgImage || null;
	window.CRS = window.CRS || null;
}

if (!isSameDomainIFrame) {
	const startInitialization = () => {
		console.log(
			"svgMapSandboxLayerLib: Sandbox mode detected. Starting handshake..."
		);

		const functions = {
			eventDispatch: function (msg) {
				const svgMapEvent = new Event(msg.name);
				setSvgImageProps(msg.svgImagePropsJSONtext);
				window.dispatchEvent(svgMapEvent);
				processPreRenderFunctionByEvent(msg.name);
			},
			// 親からのイベント転送 (zoomPanMap 等) を受信
			// InterWindowMessaging.js で postMessage された event への対応
			receiveParentEvent: function (payload) {
				console.log(
					"svgMapSandboxLayerLib: Received event from parent:",
					payload.event
				);
				if (payload.svgImageProps) {
					setSvgImageProps(payload.svgImageProps);
				}
				const event = new Event(payload.event);
				window.dispatchEvent(event);
			},
		};

		// 通信の確立 (Task 3.1, Requirement 1.2)
		// InterWindowMessaging はコンストラクタ内で自動的に URL トークンを確認し HELO に対する Ack を待つ/送る
		messaging = new InterWindowMessaging(functions, window.opener, false, [], {
			handshake: true,
			onHandshake: async (origin) => {
				console.log(
					"svgMapSandboxLayerLib: Handshake established with origin:",
					origin
				);
				try {
					// Step 1: 親から配置情報を取得 (Requirement 2.1)
					console.log(
						"svgMapSandboxLayerLib: Fetching svgImageProps from parent..."
					);
					const sip = await messaging.callRemoteFunc("getSvgImageProps", []);
					setSvgImageProps(sip);

					// 以降の初期化シーケンス (Step 2〜) は Task 5.1 で実装
					if (window.svgImageProps && window.svgImageProps.Path) {
						await loadAndSyncSvg(window.svgImageProps.Path);
					}

					readyInitialization();
				} catch (e) {
					console.error(
						"svgMapSandboxLayerLib: Initialization sequence failed:",
						e
					);
				}
			},
		});
	};

	if (document.readyState === "loading") {
		window.addEventListener("DOMContentLoaded", startInitialization);
	} else {
		startInitialization();
	}
}

async function loadAndSyncSvg(svgUrl) {
	try {
		console.log("svgMapSandboxLayerLib: Fetching SVG from:", svgUrl);
		// SVG の取得 (Task 5.1, Requirement 2.2)
		const response = await fetch(svgUrl);
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		const svgText = await response.text();

		// DOM 構築
		const parser = new DOMParser();
		const xmlDom = parser.parseFromString(svgText, "image/svg+xml");
		window.svgImage = xmlDom;

		// CRS 等のメタデータ抽出 (Task 5.1, Requirement 2.3)
		const extractedCRS = UtilFuncs.getCRSFromSVG(xmlDom);
		if (extractedCRS) {
			console.log("svgMapSandboxLayerLib: Extracted CRS:", extractedCRS);
			if (!window.svgImageProps) window.svgImageProps = new SvgImageProps();
			window.svgImageProps.CRS = extractedCRS;
			window.CRS = extractedCRS;
		}

		// 親への同期 (Sync Back) (Task 5.1, Requirement 2.5, 2.6)
		console.log("svgMapSandboxLayerLib: Syncing props and XML back to host...");
		await messaging.callRemoteFunc("updateFinalProps", [window.svgImageProps]);
		await messaging.callRemoteFunc("replaceSvgImage", [svgText]);
	} catch (e) {
		console.warn("svgMapSandboxLayerLib: Failed to load or sync SVG:", e);
	}
}

function processPreRenderFunctionByEvent(eventName) {
	if (eventName == "zoomPanMap") {
		if (window.svgMap && window.svgMap.refreshScreen) {
			window.svgMap.refreshScreen();
		}
	}
}

function readyInitialization() {
	console.log(
		"svgMapSandboxLayerLib: Initialization complete. Setting up observer..."
	);
	startObserving();
	window.isLayerWebAppReady = true;
	const svgMapEvent = new Event("layerWebAppReady");
	window.dispatchEvent(svgMapEvent);
	// 親側に準備完了を通知し、画面更新を促す (Task 5.2, Requirement 2.8)
	if (messaging) {
		messaging.callRemoteFunc("finalizeSync", []);
	}
}

function setSvgImageProps(receivedProps) {
	if (!receivedProps) return {};
	const props =
		typeof receivedProps === "string"
			? JSON.parse(receivedProps)
			: receivedProps;

	console.log("svgMapSandboxLayerLib: Setting svgImageProps:", props);
	if (!window.svgImageProps) window.svgImageProps = new SvgImageProps();

	for (let key in props) {
		if (key == "hash") {
			window.svgImageProps._int_hashVal = props[key];
		} else {
			window.svgImageProps[key] = props[key];
		}
	}
	window.CRS = window.svgImageProps.CRS || window.CRS;
	return props;
}

const CUSTOM_ID_ATTR = "data-slawa-id";
let observer;
let totalMutations = [];

function startObserving() {
	if (!observer && window.svgImage && window.svgImage.documentElement) {
		observer = new MutationObserver(function (mutationsList) {
			totalMutations.push(...mutationsList);
		});
		const config = {
			childList: true,
			attributes: true,
			subtree: true,
			characterData: true,
		};
		observer.observe(window.svgImage.documentElement, config);
	}
}

function buildDiffPayload() {
	if (!observer) return [];
	const pendingMutations = observer.takeRecords();
	totalMutations.push(...pendingMutations);

	if (totalMutations.length === 0) return [];

	const payload = [];
	// 簡易的な差分抽出ロジック（将来的に洗練させる）
	for (const mutation of totalMutations) {
		// 基本的には、変更があった要素の属性や子要素の変化をパッケージ化する
		// プロトタイプの実装をベースとする
		if (mutation.type === "attributes") {
			payload.push({
				type: "attributeChange",
				payload: {
					id:
						mutation.target.getAttribute(CUSTOM_ID_ATTR) || mutation.target.id,
					attr: mutation.attributeName,
					value: mutation.target.getAttribute(mutation.attributeName),
				},
			});
		}
		// ... 他の型 (childList等) の処理
	}

	totalMutations = [];
	return payload;
}
