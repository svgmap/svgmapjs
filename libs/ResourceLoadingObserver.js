// Description:
// ResourceLoadingObserver Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class ResourceLoadingObserver {
	// objs
	#mapViewerProps;
	#imgRenderer;
	#mapTicker;
	#geometryCapturer;

	// datas
	#svgImagesProps;
	#svgImages;

	// funcs
	#refreshScreen;
	#viewBoxChanged;

	// pubDatas
	usedImages = {}; // DOM操作によるsvgmapドキュメントやそのプロパティのメモリリークのチェック用 2019.5.22
	// loadingImgs = new Array(); // 読み込み途上のimgのリストが入る　2021/1/26 通常booleanだがビットイメージの場合非線形変換用の情報が入る -> definePropertyでconst化

	constructor(
		mapViewerProps,
		svgImagesProps,
		svgImages,
		refreshScreen,
		viewBoxChanged
	) {
		// pubDatas
		Object.defineProperty(this, "loadingImgs", { value: {} });

		// objs
		this.#mapViewerProps = mapViewerProps;
		// datas
		this.#svgImagesProps = svgImagesProps;
		this.#svgImages = svgImages;
		//funcs
		this.#refreshScreen = refreshScreen;
		this.#viewBoxChanged = viewBoxChanged;
	}

	init(imgRenderer, mapTicker, geometryCapturer) {
		this.#imgRenderer = imgRenderer;
		this.#mapTicker = mapTicker;
		this.#geometryCapturer = geometryCapturer;
	}

	#loadCompleted = true; // このグローバル変数はcheckLoadCompleted以外では本来セットしてはいけない（mapTicker.pathHitTester.getVectorObjectsAtPointと、refreshScreenが例外的処理してる・・）

	setLoadCompleted = function (stat) {
		this.#loadCompleted = stat;
	}.bind(this);

	getLoadCompleted = function () {
		return this.#loadCompleted;
	}.bind(this);

	checkLoadCompleted = function (forceDel) {
		// 読み込み完了をチェックし、必要な処理を起動する。
		// 具体的には、読み込み中のドキュメントをチェックし、もうなければ遅延img削除処理を実行、読み込み完了イベントを発行
		var hl = this.#getHashLength(this.loadingImgs);
		if (hl == 0 || forceDel) {
			//遅延img削除処理を動かす
			for (var i = 0; i < this.#delContainerId; i++) {
				var delSpan = document.getElementById("toBeDel" + i);
				if (delSpan) {
					delSpan.parentNode.removeChild(delSpan);
				}
			}
			this.#delContainerId = 0;
			this.#removeEmptyTiles(this.#mapViewerProps.mapCanvas); // added 2013.9.12

			if (this.#mapViewerProps.uaProps.Edge) {
				this.#imgRenderer.buildPixelatedImages4Edge(
					this.#mapViewerProps.mapCanvas
				);
			}

			// zoomPanMap||screenRefreshed イベントを発行する
			//		if ( !forceDel &&  !loadCompleted ){} // forceDelの時もイベントだすべきでは？
			//		if ( !loadCompleted ){} // forceDelの時もイベントだすべきでは？
			if (!this.#loadCompleted && !this.#mapTicker.pathHitTester.enable) {
				// forceDelの時もイベントだすべきでは？ ただしpathHitTest.enableのサーチで出すのはおかしいのでは？
				//			console.log("loading Completed");
				//			loadCompleted = true; // これ意味ない
				this.#removeUnusedDocs(); // 2019.5.22 メモリリーク対策
				if (this.#viewBoxChanged()) {
					// 2017.3.16 本当にviewboxが変化したときのみzoomPanMap ev出す
					var customEvent = document.createEvent("HTMLEvents");
					customEvent.initEvent("zoomPanMap", true, false);
					//				console.log("dispatchEvent zoomPanMap");
					document.dispatchEvent(customEvent);
				} else {
					// それ以外では新設のscreenRefreshed ev 出す
					var customEvent2 = document.createEvent("HTMLEvents");
					customEvent2.initEvent("screenRefreshed", true, false);
					//				console.log("dispatchEvent screenRefreshed");
					document.dispatchEvent(customEvent2);
				}
			}
			this.#loadCompleted = true;
			this.#startRefreshTimeout(); // 要確認：2016.10.14 この処理、複数のレイヤーでリフレッシュが起こっていたり一旦ロードされた後、消されたりした場合におかしなことが起きないでしょうか？

			//		console.log("Load Complete");
			return true;
		} else {
			if (hl == 0) {
				this.#loadCompleted = true;
			} else {
				this.#loadCompleted = false;
			}
			return false;
		}
	}.bind(this);

	#delContainerId = 0;
	requestRemoveTransition(imgElem, parentElem2) {
		// 2013.7.31 debug まだバグがあると思う・・
		var parentElem = imgElem.parentNode;
		// 遅延削除処理のph1
		var delContainer = null; // テンポラリspan要素
		if (parentElem.childNodes) {
			// すでにtoBeDel* idの要素があればそれをdelContainerとする
			for (var i = 0; i < parentElem.childNodes.length; i++) {
				// 普通は0で終わりのはず・・・
				if (
					parentElem.childNodes[i].nodeType == 1 &&
					parentElem.childNodes[i].id.indexOf("toBeDel") == 0
				) {
					// ELEMENT NODEでidがtoBeDel*
					delContainer = parentElem.childNodes[i];
					break;
				}
			}
		}

		if (!delContainer) {
			// テンポラリspan要素が無い場合は親要素の先頭に設置する
			delContainer = document.createElement("div");
			delContainer.id = "toBeDel" + this.#delContainerId;
			//		delContainer.style.display="none"; // for debug 2013.8.20 canvasで遷移中におかしなことになる(原因はほぼ判明)
			parentElem.insertBefore(delContainer, parentElem.firstChild);
			++this.#delContainerId;
			//	} else {
			//		delContainer = parentElem.firstChild;
		}
		// 指定した要素をテンポラリspan要素に移動する
		parentElem.removeChild(imgElem);
		delContainer.appendChild(imgElem);
	}

	#removeEmptyTiles(parentNode) {
		// カラのcanvasを削除する[summarizedのときには効かない？]
		var cv = parentNode.getElementsByTagName("canvas");
		for (var i = cv.length - 1; i >= 0; i--) {
			if (cv[i].getAttribute("hasdrawing") != "true") {
				cv[i].parentNode.removeChild(cv[i]);
			}
		}
		this.#checkEmptySpans(parentNode);
	}

	#checkEmptySpans(parentNode) {
		var ret = true; //再帰呼び出し時,消して良い時はtrue
		for (var i = parentNode.childNodes.length - 1; i >= 0; i--) {
			var oneNode = parentNode.childNodes.item(i);
			if (oneNode.nodeType == 1) {
				if (oneNode.nodeName != "DIV") {
					ret = false; // div以外の要素がひとつでもあった場合には削除しない
				} else if (oneNode.hasChildNodes()) {
					// divだと思う　そしてそれが子ノードを持っている
					var ans = this.#checkEmptySpans(oneNode);
					if (ans && !oneNode.getAttribute("data-layerNode")) {
						// ansがtrueだったらそのノードを削除する
						oneNode.parentNode.removeChild(oneNode);
					} else {
						ret = false;
					}
				} else if (!oneNode.getAttribute("data-layerNode")) {
					// devだけれどそれが子ノードを持っていない
					oneNode.parentNode.removeChild(oneNode);
				}
			}
		}
		return ret;
	}

	// DOM操作などでdocが追加削除されると、上の関数だけではメモリリークする可能性がある(インターバルrefreshなど) 2019.5.22
	// usedImages[]を使って使われていないドキュメントを消していく
	#removeUnusedDocs() {
		var delKeys = [];
		for (var key in this.#svgImages) {
			if (!this.usedImages[key]) {
				if (this.#svgImagesProps[key].domMutationObserver) {
					this.#svgImagesProps[key].domMutationObserver.disconnect();
				}
				delete this.#svgImages[key];
				delete this.#svgImagesProps[key];
				this.#geometryCapturer.removeDocGeometries(key); // 2020/01/23 added
				delKeys.push(key);
			}
		}
		if (delKeys.length > 0) {
			console.log(
				"removeUnusedDocs : docId:",
				delKeys,
				" are no longer used. Delete it."
			);
		}
	}

	#startRefreshTimeout() {
		for (var layerId in this.#svgImagesProps) {
			if (
				this.#svgImagesProps[layerId].refresh &&
				this.#svgImagesProps[layerId].refresh.timeout > 0
			) {
				if (this.#svgImagesProps[layerId].refresh.start == false) {
					this.#svgImagesProps[layerId].refresh.start = true;
					this.#svgImagesProps[layerId].refresh.loadScript = true;
					setTimeout(
						function (layerId) {
							this.#refreshLayer(layerId);
						}.bind(this),
						this.#svgImagesProps[layerId].refresh.timeout * 1000,
						layerId
					);
				} else {
					//				console.log("Already Started Refresh:",layerId,svgImagesProps[layerId]);
				}
			}
		}
	}

	#refreshLayer(layerId) {
		if (this.#svgImagesProps[layerId]) {
			this.#svgImagesProps[layerId].refresh.start = false;
			this.#refreshScreen();
		}
	}

	#getHashLength(arr) {
		// もうこれで良いでしょ・・
		return Object.keys(arr).length;
	}
	/**
	#getHashLength(arr){ // Arrayの個数を調べる( hashのため )
		var cnt=0;
		for(var key in arr){
			cnt++;
		}
		console.log("getHashLength:",cnt, Object.keys(arr).length);
		if ( this.#mapViewerProps.uaProps.verIE < 9 ){ // polyfillでindexOfを追加してるため・・
			--cnt;
		}
		return cnt;
	}
	**/
}
export { ResourceLoadingObserver };
