// Description:
// LayerStyleCustomizer Class for SVGMap.js
// レイヤースタイルのカスタマイザオブジェクト
//
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class LayerStyleCustomizer {
	#svgMapObj;
	/**
	 * Creates an instance of LayerStyleCustomizer.
	 * @param {*} svgMapObj
	 * @memberof LayerStyleCustomizer
	 */
	constructor(svgMapObj) {
		this.#svgMapObj = svgMapObj;
	}
	/**
	 * レイヤスタイルカスタマイザのUIを開く
	 * @param {*} layerID
	 * @memberof LayerStyleCustomizer
	 */
	openCustomizerUI(layerID) {
		var initStyles = this.getLayerStyles(layerID);
		console.log(initStyles);
		let modal_elm = document.createElement("div");
		modal_elm.innerHTML = this.uiSrc
			.replaceAll(
				"layerStyleCustom_saturateValue",
				this.saturateTransform(initStyles.saturate, true),
			)
			.replaceAll("layerStyleCustom_invertValue", initStyles.invert)
			.replaceAll("layerStyleCustom_hueRotateValue", initStyles["hue-rotate"])
			.replaceAll("layerStyleCustom_opacityValue", initStyles.opacity * 100)
			.replaceAll(
				"layerStyleCustom_colorizeValue",
				initStyles.colorize ? "checked" : "",
			);

		//		svgMap.setCustomModal(modal_elm, null, this.CustomizerUiCallBack, layerID);
		svgMap.showModal(modal_elm);
		const uiElements = this.getUiElements(modal_elm);
		console.log(uiElements);

		const s = this.getStyleParamsFromUi(uiElements);
		this.setStyle(layerID, uiElements, s.gv, s.iv, s.hv, s.ov, s.cv);

		this.setUiEventHandlers(layerID, uiElements, modal_elm);
	}
	/**
	 * カスタマイザの各UIパーツを変数化してるだけ
	 * @param {*} modal_elm
	 * @return {*}
	 * @memberof LayerStyleCustomizer
	 */
	getUiElements(modal_elm) {
		console.log(modal_elm);
		var qgi = modal_elm.querySelector(`#layerStyleCustom_saturateInput`);
		console.log(qgi);
		const gi = modal_elm.querySelector(`#layerStyleCustom_saturateInput`);
		const gt = modal_elm.querySelector(`#layerStyleCustom_saturateText`);
		const ii = modal_elm.querySelector(`#layerStyleCustom_invertInput`);
		const it = modal_elm.querySelector(`#layerStyleCustom_invertText`);
		const hi = modal_elm.querySelector(`#layerStyleCustom_hueRotateInput`);
		const ht = modal_elm.querySelector(`#layerStyleCustom_hueRotateText`);
		const oi = modal_elm.querySelector(`#layerStyleCustom_opacityInput`);
		const ot = modal_elm.querySelector(`#layerStyleCustom_opacityText`);
		const ci = modal_elm.querySelector(`#layerStyleCustom_colorizeInput`);
		const ct = modal_elm.querySelector(`#layerStyleCustom_colorizeText`);

		const nb = modal_elm.querySelector(`#layerStyleCustom_normal`);
		const mb = modal_elm.querySelector(`#layerStyleCustom_mono`);
		const ib = modal_elm.querySelector(`#layerStyleCustom_monoInv`);
		const db = modal_elm.querySelector(`#layerStyleCustom_dark`);
		return { gi, gt, ii, it, hi, ht, oi, ot, ci, ct, nb, mb, ib, db };
	}
	/**
	 * 彩度の値は特にsepia設定で着色したいとき10000%とかにしたいのだけど、スライダーバーは0..200ぐらいに留めておきたい　のでその非線形変換をしている
	 * @param {*} v
	 * @param {*} rev
	 * @return {*}
	 * @memberof LayerStyleCustomizer
	 */
	saturateTransform(v, rev) {
		if (v <= 100) {
			return v;
		} else {
			if (rev) {
				return Math.round(Math.log10(v) * 50);
			} else {
				return Math.round(Math.pow(10, v / 50));
			}
		}
	}
	/**
	 * UIパーツから各スタイルの値を得ている
	 * @param {*} uiElements
	 * @return {*}
	 * @memberof LayerStyleCustomizer
	 */
	getStyleParamsFromUi(uiElements) {
		const gv = this.saturateTransform(uiElements.gi.value);
		const iv = uiElements.ii.value;
		const hv = uiElements.hi.value;
		const ov = uiElements.oi.value;
		const cv = uiElements.ci.checked;
		return { gv, iv, hv, ov, cv };
	}
	/**
	 * スタイルを設定している UIパーツに対しても行ってます
	 * @param {*} layerID
	 * @param {*} uiElements
	 * @param {*} gv
	 * @param {*} iv
	 * @param {*} hv
	 * @param {*} ov
	 * @param {*} colorize
	 * @memberof LayerStyleCustomizer
	 */
	setStyle(layerID, uiElements, gv, iv, hv, ov, colorize) {
		console.log("g:", gv, " i:", iv, " h:", hv, " o:", ov, " c:", colorize);
		uiElements.gt.innerText = `${gv}%`;
		uiElements.it.innerText = `${iv}%`;
		uiElements.ht.innerText = `${hv}deg.`;
		uiElements.gi.value = this.saturateTransform(gv, true);
		uiElements.ii.value = iv;
		uiElements.hi.value = hv;
		if (colorize) {
			uiElements.ci.checked = true;
		} else {
			uiElements.ci.checked = false;
		}
		let opacityVal;
		if (ov != undefined) {
			uiElements.ot.innerText = `${ov}%`;
			uiElements.oi.value = ov;
			opacityVal = `${ov / 100}`;
		}

		let layerElm = document.querySelector(`#mapcanvas #${layerID}`);
		let filterVal = "";

		if (iv > 0) {
			filterVal += `invert(${iv}%) `;
		}
		if (colorize) {
			filterVal += `sepia(100%) `;
		}
		if (hv > 0) {
			filterVal += `hue-rotate(${hv}deg) `;
		}
		if (gv != 100) {
			filterVal += `saturate(${gv}%) `;
		}
		if (layerElm) {
			layerElm.style.filter = filterVal;
			if (opacityVal != undefined) {
				layerElm.style.opacity = opacityVal;
			}
		}
		let animationElm = this.#svgMapObj
			.getSvgImages()
			["root"].querySelector(`animation[iid="${layerID}"]`);
		if (animationElm) {
			animationElm.setAttribute("style", `filter:${filterVal}`);
			if (opacityVal != undefined) {
				animationElm.setAttribute("opacity", opacityVal);
			}
		}
	}
	/**
	 * 各UIパーツのイベントハンドラを設定
	 * @param {*} layerID
	 * @param {*} uiElements
	 * @param {*} modal_elm
	 * @memberof LayerStyleCustomizer
	 */
	setUiEventHandlers(layerID, uiElements, modal_elm) {
		uiElements.gi.addEventListener(
			"input",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, s.gv, s.iv, s.hv, s.ov, s.cv);
			},
			false,
		);
		uiElements.ii.addEventListener(
			"input",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, s.gv, s.iv, s.hv, s.ov, s.cv);
			},
			false,
		);
		uiElements.hi.addEventListener(
			"input",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, s.gv, s.iv, s.hv, s.ov, s.cv);
			},
			false,
		);
		uiElements.oi.addEventListener(
			"input",
			() => {
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, s.gv, s.iv, s.hv, s.ov, s.cv);
			},
			false,
		);
		uiElements.ci.addEventListener(
			"change",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				//				this.setStyle(layerID, uiElements, s.gv, s.iv, s.hv, s.ov, s.cv);
				if (s.cv) {
					this.setStyle(layerID, uiElements, 2000, 35, s.hv, s.ov, s.cv);
				} else {
					this.setStyle(layerID, uiElements, 100, 0, s.hv, s.ov, s.cv);
				}
			},
			false,
		);
		uiElements.nb.addEventListener(
			"click",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, 100, 0, 0, s.ov);
			},
			false,
		);
		uiElements.mb.addEventListener(
			"click",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, 0, 0, 0, s.ov, s.cv);
			},
			false,
		);
		uiElements.ib.addEventListener(
			"click",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, 0, 100, 0, s.ov, s.cv);
			},
			false,
		);
		uiElements.db.addEventListener(
			"click",
			() => {
				this.checkFirstTime(modal_elm);
				const s = this.getStyleParamsFromUi(uiElements);
				this.setStyle(layerID, uiElements, 100, 100, 180, s.ov, s.cv);
			},
			false,
		);
	}

	/**
	 *カスタマイザのUIパネルが開いた後に呼ばれるコールバック(今のところ何もしていない)
	 *
	 * @param {*} etid
	 * @param {*} layerID
	 * @memberof LayerStyleCustomizer
	 */
	CustomizerUiCallBack(etid, layerID) {
		let elem = document.querySelector(`#mapcanvas #${layerID}`);
		console.log(
			"Layer Style Customizer UI CallBack : ",
			layerID,
			elem.style.filter,
		);
	}
	/**
	 * 指定したレイヤに設定されているスタイルを取得
	 * @param {*} layer_id
	 * @return {*}
	 * @memberof LayerStyleCustomizer
	 */
	getLayerStyles(layer_id) {
		let elem = document.querySelector(`#mapcanvas #${layer_id}`);
		let opacity = 1;
		if (elem.style.opacity) {
			opacity = Number(elem.style.opacity);
		}
		const computedStyle = window.getComputedStyle(elem);
		console.log(layer_id, elem, computedStyle);
		const filterValue = computedStyle.filter;
		console.log("filterValue:", filterValue);
		const filterMap = { opacity };
		if (filterValue !== "none") {
			const filters = filterValue.match(/(\w+-?\w*)\(([^)]+)\)/g);
			filters.forEach((filter) => {
				const [key, value] = filter.split("(");
				filterMap[key.trim()] = parseFloat(value); // 数値部分のみ取得
			});
		}
		if (filterMap.invert == undefined) {
			filterMap.invert = 0;
		} else {
			filterMap.invert = filterMap.invert * 100;
		}
		/**
		if (filterMap.grayscale == undefined) {
			filterMap.grayscale = 0;
		} else {
			filterMap.grayscale = filterMap.grayscale * 100;
		}
		**/
		if (filterMap.saturate == undefined) {
			filterMap.saturate = 100;
		} else {
			filterMap.saturate = filterMap.saturate * 100;
		}
		if (filterMap["hue-rotate"] == undefined) {
			filterMap["hue-rotate"] = 0;
		}
		if (filterMap.sepia == undefined) {
			filterMap.colorize = false;
		} else {
			filterMap.colorize = true;
		}
		return filterMap;
	}

	firstTimeFilterApplied = true;
	/**
	 * 初回のフィルタ適用時の警告表示機能
	 * @param {*} modal_elm
	 * @return {*}
	 * @memberof LayerStyleCustomizer
	 */
	checkFirstTime(modal_elm) {
		//初回のフィルタ適用時に警告表示
		if (this.firstTimeFilterApplied == false) {
			return;
		}
		this.firstTimeFilterApplied = false;
		const parentDiv = modal_elm.querySelector(
			`#svgMapLayerStyleCustomizerUiTable`,
		);
		const mTr = document.createElement("tr");
		const msgContent = `<td colspan="3" style="font-size:12px;background-color:#eee;">Note:レイヤの色を変更した場合、凡例やラスタGISの色と表示色が一致しなくなります。これらを利用する場合は解除してください</td>`;
		mTr.innerHTML = msgContent;
		parentDiv.appendChild(mTr);
		setTimeout(() => {
			mTr.remove();
		}, 10000);
	}

	//レイヤスタイルカスタマイザのUI
	uiSrc = `
	<table style="width:250px;border:none;border-collapse: collapse;font-size:12px;" id="svgMapLayerStyleCustomizerUiTable">
	<tr style="background-color:#ccf"><td>不透明度</td><td style="width:120px"><input id="layerStyleCustom_opacityInput" type="range" min="0" max="100" value="layerStyleCustom_opacityValue" step="1" style="width:120px"/></td><td style="width:60px" id="layerStyleCustom_opacityText"></td></tr>
	<tr style="background-color:#eee"><td>彩度</td><td><input id="layerStyleCustom_saturateInput" type="range" min="0" max="200" value="layerStyleCustom_saturateValue" step="1" style="width:120px"/></td><td id="layerStyleCustom_saturateText"></td></tr>
	<tr style="background-color:#eee"><td>色相反転</td><td><input id="layerStyleCustom_invertInput" type="range" min="0" max="100" value="layerStyleCustom_invertValue" step="1" style="width:120px"/></td><td id="layerStyleCustom_invertText"></td></tr>
	<tr style="background-color:#eee"><td>色相回転</td><td><input id="layerStyleCustom_hueRotateInput" type="range" min="0" max="360" value="layerStyleCustom_hueRotateValue" step="1" style="width:120px"/></td><td id="layerStyleCustom_hueRotateText"></td></tr>
<tr style="background-color:#eee"><td><label for="layerStyleCustom_colorizeInput">着色</label></td><td><input id="layerStyleCustom_colorizeInput" type="checkbox" layerStyleCustom_colorizeValue /></td><td id="layerStyleCustom_colorizeText"></td></tr>
	<tr style="background-color:#eee"><td></td><td colspan=2><input type="button" id="layerStyleCustom_normal" value="解除"/></td></tr>
	<tr style="background-color:#eee"><td></td><td colspan=2><input type="button" id="layerStyleCustom_mono" value="モノクロ化" /></td></tr>
	<tr style="background-color:#eee"><td></td><td colspan=2><input type="button" id="layerStyleCustom_monoInv" value="モノクロ反転"/></td></tr>
	<tr style="background-color:#eee"><td></td><td colspan=2><input type="button" id="layerStyleCustom_dark" value="ダーク"/></td></tr>
	</table>`;
}

export { LayerStyleCustomizer };
