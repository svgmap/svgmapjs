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
import {
	MatrixUtil,
	GenericMatrix,
	Mercator,
	LUTGenerator,
} from "./libs/TransformLib.js";

import { UtilFuncs } from "./libs/UtilFuncs.js";
import { SVGMapVectorFileRenderer } from "./libs/SVGMapVectorFileRenderer.js";
import { KMLParser } from "./libs/KMLParser.js";

let messaging;
window.addEventListener("DOMContentLoaded", initSandboxLayer); // 直接これを呼んだ場合はこちらが発動

function initSandboxLayer() {
	messaging = new InterWindowMessaging(
		{
			connectionReady: function (param) {
				console.log("connection established");
			},
			setInitialSvgImage: function (msg) {
				console.log("初期SVGImageコンテンツを設定:", msg.svgImageXml);
				window.layerID = msg.layerID;
				setSvgImage(msg.svgImageXml);
				setSvgImageProps(msg.svgImagePropsJSONtext);

				readyInitialization();
			},
			getInitialSvgImage: async function (msg) {
				// 2026/4/8 S-LaWA Lv2のために実装改善
				window.layerID = msg.layerID;
				setSvgImageProps(msg.svgImagePropsJSONtext);

				try {
					// 親から指定された本来のSVG URLへフェッチ
					const rawSvgText = await (await fetch(msg.svgImageUrl)).text();

					// 子のDOMに展開
					setSvgImage(rawSvgText);

					// 子のRoot要素に "root" というIDを明記し、親のダミーと同期させる
					window.svgImage.documentElement.setAttribute(CUSTOM_ID_ATTR, "root");

					const xmlSerializer = new XMLSerializer();
					// HTMLのDOMではなく、XML Document オブジェクトそのものを渡す
					const svgXmlWithIds = xmlSerializer.serializeToString(
						window.svgImage
					);

					//console.log("[S-LaWA Lv2] 親へ置換を要求します。送信サイズ:", svgXmlWithIds.length);

					// 親に置換を依頼（ID付きのXMLを送る！）
					await messaging.callRemoteFunc("replaceSvgImage", {
						svgImageXml: svgXmlWithIds,
					});

					// 親でのキャッシュクリアと再パースが終わったら、起動！
					setTimeout(() => {
						//親からの非同期プロパティ更新(postMessage)を受信しきるまで、
						// ライブラリ側でイベントループを1周遅らせてからReadyを発火させる
						readyInitialization();
					}, 30);
					return true;
				} catch (e) {
					console.error("[S-LaWA Lv2] SVGフェッチまたは置換に失敗:", e);
					return false;
				}
			},
			eventDispatch: function (msg) {
				const svgMapEvent = new Event(msg.name);
				setSvgImageProps(msg.svgImagePropsJSONtext);
				// console.log("dispatch event on sandbox:",msg.name);
				window.dispatchEvent(svgMapEvent);
				processPreRenderFunctionByEvent(msg.name);
			},
			callCustomShowPoiPropertyFunc: function (msg) {
				//console.log("getCustomShowPoiPropertySrc:",msg);
				callCustomShowPoiPropertyFunc(msg);
			},
			// 2027/7/22  LUTデータ要求用RPC
			requestLutData: async function(msg) {
				const { sourceBox, sourceBoxType, grid, parentCrs } = msg;
				
				// CRSオブジェクトの取得 (S-LaWAコンテキストの変数を使用)
				let crsObj = window.svgImageProps.CRS; 
				
				// 親から届いた parentCrs を使って、手元の crsObj の関数名と変換関数（順変換・逆変換）を補完
				if (parentCrs && parentCrs.transformFunctionName) {
					if (!crsObj) {
						crsObj = {};
						window.svgImageProps.CRS = crsObj;
					}
					crsObj.transformFunctionName = parentCrs.transformFunctionName;
					
					const tfName = crsObj.transformFunctionName;
					if (typeof window[tfName] === "function") {
						const crsResult = window[tfName](); // 関数を実行して {transform, inverse} を取得
						if (crsResult) {
							crsObj.transform = crsResult.transform || window[tfName];
							crsObj.inverse = crsResult.inverse; // TransformLibが要求する逆変換をセット
							crsObj.unresolved = false;
						}
					}
				}
				
				// TransformLib の共通メソッドで生成
				const f32Lut = LUTGenerator.generateFloat32Array(crsObj, sourceBox, sourceBoxType, grid);
				if (!f32Lut) return null;
				// InterWindowMessaging の拡張仕様に従い、transferablesを返却
				return {
					data: { buffer: f32Lut.buffer },
					transferables: [f32Lut.buffer]
				};
			}
		},
		window.parent,
		"negotiation" //2025/09/02 セキュリティ改善
	);
}

function processPreRenderFunctionByEvent(eventName) {
	// 2025/11/21
	// 外のイベントによって引き起こされるpreRenderFunction実行（これによるrefreshScreenがS-LaWAの一つのオーバーへど部分になる）
	if (eventName == "zoomPanMap") {
		// このsvgMap.refreshScreen()を通して、下のprocessPreRenderFunction()が呼ばれる
		svgMap.refreshScreen();
	}
}

function processPreRenderFunction() {
	// これが管理しているS-LaWAのpreRenderFunctionがあれば実行する
	if (svgMap && window.preRenderFunction) {
		// console.log("processPreRenderFunction");
		window.preRenderFunction();
	}
}

let slawaConfigLoaded = false;
async function readyInitialization() {
	if (!slawaConfigLoaded) {
		await loadSlawaConfig();
		slawaConfigLoaded = true;
	}
	startObserving(); // この段階でsvgImage DOMの監視を開始
	const svgMapEvent = new Event("layerWebAppReady");
	window.dispatchEvent(svgMapEvent);
}

function assignSlawaIds(node) {
	if (!node) return;
	if (node.nodeType === 1) { // Node.ELEMENT_NODE
		if (!node.getAttribute(CUSTOM_ID_ATTR)) {
			node.setAttribute(CUSTOM_ID_ATTR, `slawa-id-${nextId++}`);
		}
	}
	let child = node.firstElementChild;
	while (child) {
		assignSlawaIds(child);
		child = child.nextElementSibling;
	}
}

function setSvgImage(svgImageXml) {
	const xmlDom = new DOMParser().parseFromString(svgImageXml, "text/xml");
	window.svgImage = xmlDom;

	// 静的DOMの既存要素すべてに対して再帰的に自動付番を行う
	assignSlawaIds(window.svgImage.documentElement);

	const originalSvgImageCreateElement = window.svgImage.createElement;
	window.svgImage.createElement = function (tagName) {
		// 元のcreateElementを呼び出し、要素を作成
		const element = originalSvgImageCreateElement.call(this, tagName);

		// 独自IDを自動的に付番
		element.setAttribute(CUSTOM_ID_ATTR, `slawa-id-${nextId++}`);

		return element;
	};
}

function setSvgImageProps(receivedPropsJSONtext) {
	const receivedProps = JSON.parse(receivedPropsJSONtext);
	for (let key in receivedProps) {
		if (key == "hash") {
			window.svgImageProps._int_hashVal = receivedProps[key];
		} else if (key === "CRS") {
			if (window.svgImageProps.CRS && typeof window.svgImageProps.CRS.transform === "function") {
				continue; 
			}
			window.svgImageProps[key] = receivedProps[key];
		} else {
			window.svgImageProps[key] = receivedProps[key]; // あ、これhashをセットするとセッターが動いてえらいことにならない？
		}
	}
	
	// コアから受け取った関数名を使って、S-LaWA自身のwindow上でCRSを解決する
	const crs = window.svgImageProps.CRS;
	if (crs && crs.unresolved && crs.transformFunctionName) {
		const tfName = crs.transformFunctionName.startsWith("controller.") 
			? crs.transformFunctionName.substring(11) 
			: crs.transformFunctionName;

		if (typeof window[tfName] === "function") {
			window.svgImageProps.CRS = window[tfName]();
			if (window.svgImageProps.CRS) {
				window.svgImageProps.CRS.isSVG2 = crs.isSVG2;
			}
		}
	}
	window.CRS = window.svgImageProps.CRS; // 2025/11/19
	return receivedProps;
}

class SandboxSvgMap {
	#mu;
	constructor() {
		this.#mu = new MatrixUtil();
	}
	getSvgImages = function () {
		return { [window.layerID]: window.svgImage };
	};
	getSvgImagesProps = function () {
		return { [window.layerID]: window.svgImageProps };
	};
	refreshScreenReplace = async function () {
		//console.log("refreshScreenReplace:");
		const serializer = new XMLSerializer();
		const svgImageXml = serializer.serializeToString(window.svgImage);
		await messaging.callRemoteFunc("replaceSvgImage", { svgImageXml });
	};
	getSvgImageProps = async function () {
		const sipTxt = await messaging.callRemoteFunc("getSvgImageProps", null);
		const sip = setSvgImageProps(sipTxt);
		return sip;
	};
	/**
	getGeoViewBox = async function(){ // これはなくていいと思う(svgImagePropsに最初から入っているべきだしasyncになり非互換なので)
		const resp = await messaging.callRemoteFunc("getGeoViewBox",null);
		console.log(resp);
		return resp;
	}
	**/
	getGeoViewBox = function () {
		// なので、これでいいよね・・・
		const gvb = window.svgImageProps.geoViewBox;
		return gvb;
	};
	transform = function (x, y, mat, calcSize, nonScaling) {
		return this.#mu.transform(x, y, mat, calcSize, nonScaling);
	};

	refreshScreen = async function () {
		if (!observer) {
			console.error("MutationObserver not initialized.");
			return;
		}
		// refreshScreen前にまずはpreRenderFunctionがあればそれが実行され、再描画前のDOM構築をエミュレートする2025/11/21
		processPreRenderFunction();
		const diffPayload = buildDiffPayload();
		await messaging.callRemoteFunc("applySvgDiff", [diffPayload]);

		// 監視を再開(これは誤りだと思う)
		//startObserving();
	};
	setShowPoiProperty = function (customShowPoiPropertyFunc, dummyLayerID) {
		console.log("TBD:", customShowPoiPropertyFunc, dummyLayerID);
		customShowPoiPropertyFunction = customShowPoiPropertyFunc;
		messaging.callRemoteFunc("enableCustomShowPoiProperty", [true]);
	};
	/**
	 * @function' や " でエスケープされたcsvの1ラインをパースして配列に格納する関数
	 *
	 * @param {String} csv
	 * @returns {Array}
	 *
	 * @description TODO: utilに移設するほうがよいのでは？
	 */
	parseEscapedCsvLine(csv) {
		// ' や " でエスケープされたcsvの1ラインをパースして配列に格納する。(高級split(","))
		var metaData = csv.split(",");
		for (var j = 0; j < metaData.length; j++) {
			metaData[j] = UtilFuncs.trim(metaData[j]);
			if (metaData[j].indexOf("'") == 0 || metaData[j].indexOf('"') == 0) {
				var countss = 0;
				while (
					metaData[j].substr(metaData[j].length - 1, 1) != "'" &&
					metaData[j].substr(metaData[j].length - 1, 1) != '"'
				) {
					metaData[j] = metaData[j] + "," + metaData[j + 1];
					metaData.splice(j + 1, 1);
					++countss;
					if (countss > 5) {
						break;
					}
				}
				metaData[j] = metaData[j].replace(/['"]/g, "");
			}
		}
		return metaData;
	}
	showModal(src, width, height) {
		messaging.callRemoteFunc("showModal", { src, width, height });
	}

	#proxy = { path: null, encodeUri: false };
	getCORSURL(href) {
		if (this.#proxy.path) {
			if (this.#proxy.encodeUri) {
				href = encodeURIComponent(href);
			}
			return this.#proxy.path + href;
		} else {
			return href;
		}
	}
	setCORSproxy(proxyPath, encodeUri) {
		this.#proxy.path = proxyPath;
		this.#proxy.encodeUri = encodeUri;
		//console.log("setCORSproxy:",this.#proxy);
	}
}

class SvgImageProps {
	_int_hashVal;
	set hash(val) {
		this._int_hashVal = val;
		messaging.callRemoteFunc("setHash", { hash: val });
	}
	get hash() {
		return this._int_hashVal;
	}
}

window.svgImageProps = new SvgImageProps();

window.svgMap = new SandboxSvgMap(); // APIの互換性のために、S-LaWAで使えるものもsvgMapというグローバルオブジェクトということにする（中身は違うが）

class SandboxSvgMapGIS {
	constructor(svgMap) {
		this.svgMap = svgMap;
		this.renderer = new SVGMapVectorFileRenderer(svgMap);
	}
	drawGeoJson(
		geojson,
		targetSvgDocId,
		strokeColor,
		strokeWidth,
		fillColor,
		POIiconId,
		poiTitle,
		parentMetadata,
		parentElm,
		metaDictionary,
		options
	) {
		try {
			const forcedTargetId = window.layerID;
			this.renderer.drawGeoJson(
				geojson,
				forcedTargetId,
				strokeColor,
				strokeWidth,
				fillColor,
				POIiconId,
				poiTitle,
				parentMetadata,
				parentElm,
				metaDictionary,
				options
			);
		} catch (e) {
			console.error("Error drawing GeoJSON in SandboxSvgMapGIS:", e);
		}
	}
	drawKml(
		kmlDoc,
		targetSvgDocId,
		strokeColor,
		strokeWidth,
		fillColor,
		POIiconId,
		poiTitle,
		parentMetadata,
		parentElm,
		metaDictionary
	) {
		try {
			const forcedTargetId = window.layerID;
			this.renderer.drawKml(
				kmlDoc,
				forcedTargetId,
				strokeColor,
				strokeWidth,
				fillColor,
				POIiconId,
				poiTitle,
				parentMetadata,
				parentElm,
				metaDictionary
			);
		} catch (e) {
			console.error("Error drawing KML in SandboxSvgMapGIS:", e);
		}
	}
	kml2GeoJson(kmlDoc) {
		try {
			return KMLParser.kmlToGeoJson(kmlDoc);
		} catch (e) {
			console.error("Error converting KML to GeoJSON in SandboxSvgMapGIS:", e);
			return null;
		}
	}
}

window.svgMapGIStool = new SandboxSvgMapGIS(window.svgMap);

// 差分更新機能

// --- カスタムIDの定義と自動付番 ---
const CUSTOM_ID_ATTR = "data-slawa-id";
let nextId = 0;

// --- MutationObserverと差分情報生成 ---
let observer;

// MutationObserverを初期化し、監視を開始します
function startObserving() {
	// console.log("startObserving:", window.svgImage.documentElement);
	if (!observer) {
		observer = new MutationObserver(function (mutationsList, observer) {
			//console.log("変更検知:", mutationsList);
			// refreshScreen()が呼ばれるまで変更を蓄積
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

let totalMutations = [];
// 蓄積された変更を元に差分情報を生成します
function buildDiffPayload() {
	const pendingMutations = observer.takeRecords();
	totalMutations.push(...pendingMutations);

	// 新たな追加ノードとそのIDを一時的に保存
	const addedNodesInfo = new Map();
	const payload = [];

	// ステップ1: すべての変更を元の順序で一時的に記録
	for (const mutation of totalMutations) {
		if (mutation.type === "childList") {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const id = node.getAttribute(CUSTOM_ID_ATTR);
					if (id) {
						// 追加ノードの情報を一時保存
						addedNodesInfo.set(id, node);
					}
				}
			});
		}
	}

	// ステップ2: 記録した変更を元の順序で最終ペイロードに整理
	for (const mutation of totalMutations) {
		if (mutation.type === "childList") {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const id = node.getAttribute(CUSTOM_ID_ATTR);
					if (id) {
						let isDescendantOfAnotherAddition = false;
						let parent = node.parentNode;

						// 親を遡り、その親が今回の変更ログに含まれていないかチェック
						// ルートノードの子孫でない追加ノードの重複を排除
						while (parent && parent !== window.svgImage.documentElement) {
							if (addedNodesInfo.has(parent.getAttribute(CUSTOM_ID_ATTR))) {
								isDescendantOfAnotherAddition = true;
								break;
							}
							parent = parent.parentNode;
						}

						if (!isDescendantOfAnotherAddition) {
							// 子孫ノードの追加ではない、ルートノードの追加
							//console.log("mutation.target:", mutation.target);
							payload.push({
								type: "addition",
								payload: {
									xml: new XMLSerializer().serializeToString(node), // 子孫ノードを含むXMLをシリアライズ
									id: id,
									parentId: mutation.target.getAttribute(CUSTOM_ID_ATTR),
									nextSiblingId: mutation.nextSibling
										? mutation.nextSibling.getAttribute(CUSTOM_ID_ATTR)
										: null,
								},
							});
						}
					}
				}
			});
			mutation.removedNodes.forEach((node) => {
				const id = node.getAttribute(CUSTOM_ID_ATTR);
				if (node.nodeType === Node.ELEMENT_NODE && id) {
					payload.push({
						type: "deletion",
						payload: { id: id },
					});
				}
			});
		} else if (mutation.type === "attributes") {
			const id = mutation.target.getAttribute(CUSTOM_ID_ATTR);
			const attrName = mutation.attributeName;
			const newValue = mutation.target.getAttribute(attrName);
			if (id) {
				payload.push({
					type: "attributeChange",
					payload: {
						id: id,
						attr: attrName,
						value: newValue,
					},
				});
			}
		} else if (mutation.type === "characterData") {
			// <- テキストノードの変更処理を追加
			const targetNode = mutation.target;
			const parentElement = targetNode.parentNode;

			// 親要素がカスタムIDを持つ ELEMENT_NODE であることを確認
			if (parentElement && parentElement.nodeType === Node.ELEMENT_NODE) {
				const id = parentElement.getAttribute(CUSTOM_ID_ATTR);
				if (id) {
					// 親要素のtextContent全体を差分として送信
					payload.push({
						type: "attributeChange", // 既存の属性変更タイプを流用
						payload: {
							id: id,
							attr: "textContent", // 特別な属性名
							value: parentElement.textContent,
						},
					});
				}
			}
		}
	}

	totalMutations = [];
	// console.log("buildDiffPayload:", payload);
	return payload;
}

// CustomShowPoiPropertyの実装

let customShowPoiPropertyFunction = null;

async function callCustomShowPoiPropertyFunc(msg) {
	if (typeof customShowPoiPropertyFunction == "function") {
		const parser = new DOMParser();
		const wrappedXml = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${msg.xml}</svg>`;
		const targetSvgDoc = parser.parseFromString(wrappedXml, "image/svg+xml");
		if (targetSvgDoc.getElementsByTagName("parsererror").length > 0) {
			console.error(
				"XML parse error:",
				targetSvgDoc.getElementsByTagName("parsererror")[0]
			);
			return { src: "" };
		}
		const receivedNode = targetSvgDoc.documentElement.firstChild;
		const slawa_id = receivedNode.getAttribute(CUSTOM_ID_ATTR);
		const targetNode = svgImage.querySelector(
			`[${CUSTOM_ID_ATTR}="${slawa_id}"]`
		);

		//console.log("targetNode:",targetNode);

		customShowPoiPropertyFunction(targetNode);
	}
}

// ====== プロキシ設定のカスケード読み込み関数 ======
// S-LaWA用設定ファイル(slawa-config.json)をLaWA相対パスとオリジンルートから並列探索します。
// 相対パスを優先し、取得できたproxy設定をsetCORSproxy()へ自動適用します。相対パスに空ファイルや{}を置くとオリジンルート側設定を無視できます。
async function loadSlawaConfig() {
	const configName = "slawa-config.json";
	const localUrl = new URL("./" + configName, location.href).href;
	const rootUrl = new URL("/" + configName, location.origin).href;

	// LaWAがルート直下にある場合、URLが同じになるので重複を排除
	const urlsToFetch = localUrl === rootUrl ? [localUrl] : [localUrl, rootUrl];

	try {
		// すべてのフェッチを同時に開始。エラー時はnullを返してPromise.allが全体でクラッシュするのを防ぐ
		const fetchPromises = urlsToFetch.map(url => 
			fetch(url).catch(err => null)
		);

		// 並列で待機
		const responses = await Promise.all(fetchPromises);

		let targetResponse = null;

		// 優先順位 1: ディレクトリ相対パス (responses[0])
		if (responses[0] && responses[0].ok) {
			targetResponse = responses[0];
		} 
		// 優先順位 2: オリジンルートパス (responses[1])
		else if (responses.length > 1 && responses[1] && responses[1].ok) {
			targetResponse = responses[1];
		}

		// 取得成功時のみテキストとして読み取り
		if (targetResponse) {
			const text = await targetResponse.text();
			
			// 完全に空(空白のみ含む)の場合は、明示的に素通し(null)として適用
			if (text.trim() === "") {
				window.svgMap.setCORSproxy(null, false);
				console.log("[S-LaWA] Config applied from:", targetResponse.url, "(bypass proxy / empty file)");
			} else {
				const config = JSON.parse(text);
				
				// フラットなキー名で取得
				const pPath = config.proxyPath !== undefined ? config.proxyPath : null;
				const pEncodeUri = !!config.proxyEncodeUri; // proxyEncodeUri一択
				
				window.svgMap.setCORSproxy(pPath, pEncodeUri);
				console.log("[S-LaWA] Config applied from:", targetResponse.url, pPath ? `(proxy path: ${pPath})` : "(bypass proxy)");
			}
		}
	} catch (e) {
		// JSONパースエラー等時のフェイルセーフ
		console.warn("[S-LaWA] Failed to apply config, continuing with defaults.", e);
	}
}

/**
{
	{
	console.log("callCustomShowPoiPropertyFunc:",html);
		if ( typeof html == "string"){
			return {src:html};
		} else {
			console.warn("S-LaWAではhtmlの文字列だけが対象です");
			return {src:null};
		}
	}
}
**/

export { initSandboxLayer };
