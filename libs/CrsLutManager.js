// Description:
// CrsLutManager
// CRSのtransformがfunctionのケースをS-LaWA（およびT-LaWA）でも駆動するために、
// LUT（Look Up Table）による座標変換を管理する。従来の関数ベースの座標変換機構と異なり、
// LUTは有限領域のメッシュデータであるため、ズーム・パン等でビューポートが変化するたびに更新が必要となる。
//
// 本モジュールは描画パイプラインの前に立つ安全弁（ゲートウェイ）として機能し、シグネチャによる状態管理を用い、
// 必要なタイミングで非同期なLUTの生成・要求（RPC等）を制御・同期させる役割を担う。
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History
// 2026/08/03 初期実装
// 2026/08/18 TLaWA, SLaWA(lv1,2)に対応


import { LUTGenerator, LUTMatrix, MatrixUtil } from "./TransformLib.js";

class CrsLutManager {
	#mapViewerProps;
	#svgImagesProps;
	#essentialUIs;
	#layerSpecificWebAppHandler;
	
	#lastLutSignature = "";
	#updateToken = 0; // 多重実行時のレースコンディション対策

	constructor(mapViewerProps, svgImagesProps, essentialUIs, layerSpecificWebAppHandler) {
		this.#mapViewerProps = mapViewerProps;
		this.#svgImagesProps = svgImagesProps;
		this.#essentialUIs = essentialUIs;
		this.#layerSpecificWebAppHandler = layerSpecificWebAppHandler;
	}

	// 現在のViewBoxと全レイヤーの非線形状態を文字列化する
	#getLutSignature() {
		const vb = this.#mapViewerProps.rootViewBox;
		let sig = `${vb.x}_${vb.y}_${vb.width}_${vb.height}`;
		
		const rootCrs = this.#mapViewerProps.rootCrs;
		const rUnres = rootCrs ? !!rootCrs.unresolved : false;
		const rHasLut = rootCrs ? !!rootCrs.lut : false;
		sig += `|R:needs=${this.#needsLut(rootCrs)}_unres=${rUnres}_hasLut=${rHasLut}`;

		const layerIds = Object.keys(this.#svgImagesProps);
		for (const docId of layerIds) {
			if (docId === "root") continue;
			const props = this.#svgImagesProps[docId];
			const crs = props ? props.CRS : null;
			
			const isUnres = crs ? !!crs.unresolved : false;
			const hasLut = crs ? !!crs.lut : false;
			const ready = props ? !!props.slawaReady : false; 
			sig += `|${docId}:needs=${this.#needsLut(crs)}_unres=${isUnres}_hasLut=${hasLut}_ready=${ready}`;
		}
		return sig;
	}
	
	// LUTの更新が必要かどうか判定（安全弁ゲートから呼ばれる）
	isLutUpdateNeeded() {
		const newSig = this.#getLutSignature();
		//console.log(`[Trace] CrsLutManager: isLutUpdateNeeded判定 - oldSig="${this.#lastLutSignature}" / newSig="${newSig}"`);
		if (newSig !== this.#lastLutSignature) {
			//console.log(`[Trace] CrsLutManager: シグネチャ変更によりLUT更新が必要と判定`);
			return true;
		}
		return false;
	}
	
	async updateAllLuts() {
		//console.log("updateAllLuts");
		const targetSignature = this.#getLutSignature();
		const currentToken = ++this.#updateToken; // この実行セッションのトークンを取得
		
		const rootViewBox = this.#mapViewerProps.rootViewBox;
		const rootCrs = this.#mapViewerProps.rootCrs;
		const root2Geo = this.#mapViewerProps.root2Geo;

		// 1. ルートLUTの生成と geoViewBox の確定
		if (this.#needsLut(rootCrs)) {
			// 'actual' (画面座標系=rootViewBox) からLUTを生成し、geoViewBoxを自律的に確定させる
			const rootF32 = LUTGenerator.generateFloat32Array(rootCrs, rootViewBox, 'actual');
			if (rootF32) {
				// CRSオブジェクト内に lut プロパティとして格納
				rootCrs.lut = new LUTMatrix(rootF32);
				
				// LUTから算出された geoViewBox を抽出 (インデックス2〜5)
				this.#essentialUIs.setGeoViewBox({
					x: rootF32[2],
					y: rootF32[3],
					width: rootF32[4],
					height: rootF32[5]
				});
			}
		} else {
			if (rootCrs.lut) {
				rootCrs.lut.dispose();
				rootCrs.lut = null;
			}
			
			// 線形関数を利用して geoViewBox を確定する
			this.#essentialUIs.setGeoViewBox(
				new MatrixUtil().getTransformedBox(rootViewBox, root2Geo)
			);
		}

		// 2. 各レイヤーLUTの生成（並列処理）
		const geoViewBox = this.#essentialUIs.geoViewBox;
		const layerIds = Object.keys(this.#svgImagesProps).filter(id => id !== "root");

		const layerPromises = layerIds.map(async (docId) => {
			const props = this.#svgImagesProps[docId];
			if (!props || !props.CRS) return;

			if (this.#needsLut(props.CRS)) {
				let f32Buffer = null;
				
				//console.log(`[原因究明 1] docId: ${docId} LUT生成直前.`,`unresolved: ${props.CRS.unresolved},`,`typeof transform: ${typeof props.CRS.transform}`);

				//const sandboxWrapper = this.#layerSpecificWebAppHandler?.getSandboxWrapper?.(docId);
				//console.log(`[テスト] S-LaWAルートへLUT要求開始: docId=${docId}`);
				const buffer = await this.#layerSpecificWebAppHandler?.requestLutDataForLayer?.(docId, geoViewBox, 'geo');
				//console.log(`[テスト] S-LaWAルートからの返答 buffer:`, buffer);
				
				if (buffer) {
					f32Buffer = new Float32Array(buffer);
				} else {
					// ローカルレイヤー および Tight-LaWA: 'geo' を基準に同期計算でフォールバック
					f32Buffer = LUTGenerator.generateFloat32Array(props.CRS, geoViewBox, 'geo');
				}

				if (f32Buffer) {
					if (props.CRS.lut) props.CRS.lut.dispose();
					props.CRS.lut = new LUTMatrix(f32Buffer);

					// 初回のみ: S-LaWAの場合「代役フラグ」を立てる
					if (props.CRS.unresolved) {
						props.CRS.unresolved = false;
						props.CRS.isProxyFunction = true;
					}

					// S-LaWAの場合は、LUTの更新のたびに代役関数を最新のLUTにバインドし直す
					if (props.CRS.isProxyFunction) {
						// ★変更: thisのコンテキスト喪失を防ぐため、必ず bind を使って参照を渡す
						props.CRS.transform = props.CRS.lut.transform.bind(props.CRS.lut);
						props.CRS.inverse = props.CRS.lut.inverse.bind(props.CRS.lut);
					}

					props.getActualViewBox = () => ({
						x: f32Buffer[6], y: f32Buffer[7], width: f32Buffer[8], height: f32Buffer[9]
					});
				}
			} else {
				// 古いLUTがあれば破棄して null に
				if (props.CRS.lut) {
					props.CRS.lut.dispose();
					props.CRS.lut = null;
				}
			}
		});

		await Promise.all(layerPromises);
		
		// 非同期処理完了後、自身が最新のセッションである場合のみシグネチャを更新
		if (this.#updateToken === currentToken) {
			this.#lastLutSignature = targetSignature;
		}
	}

	#needsLut(crsObj) {
		if (!crsObj) return false;
		if (crsObj.isLUT) return false;
		// transform関数を持つ場合だけでなく、mercator等も含め非線形図法であればすべてLUT生成対象とする
		return typeof crsObj.transform === 'function' || !!crsObj.transformFunctionName || !!crsObj.mercator;
	}
	
}

export { CrsLutManager };