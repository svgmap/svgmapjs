// Description:
// ImgRenderer Class for SVGMap.js (Web Worker + Grid-Interpolated Fast CPU Version)
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// 2026/08/06 LUTによる座標変換機能実装に伴い、リファクタリング Workerを用いたマルチスレッド化他

import { UtilFuncs } from "./UtilFuncs.js";
import { MatrixUtil } from "./TransformLib.js";
import { SvgMapElementType } from "./SvgMapElementType.js";

class ImgRenderer {
	#svgMapObj;
	#loadingImgs;
	#proxyManager;
	#loadingTransitionTimeout;
	#svgImagesProps;
	#matUtil;
	#checkLoadCompleted;
	#loadErrorStatistics;
	#mapViewerProps;

	// Worker管理用
	#worker;
	#workerCallbacks;
	#jobCounter;

	constructor(
		svgMapObj,
		loadingImgs,
		proxyManager,
		loadingTransitionTimeout,
		mapViewerProps,
		matUtil,
		checkLoadCompletedFunc,
		loadErrorStatistics
	) {
		this.#svgMapObj = svgMapObj;
		this.#loadingImgs = loadingImgs;
		this.#proxyManager = proxyManager;
		this.#loadingTransitionTimeout = loadingTransitionTimeout;
		this.#mapViewerProps = mapViewerProps;
		this.#matUtil = matUtil;
		this.#checkLoadCompleted = checkLoadCompletedFunc;
		this.#loadErrorStatistics = loadErrorStatistics;
		this.#svgImagesProps = this.#svgMapObj.getSvgImagesProps();

		this.#initWorker();
	}

	// =========================================================================
	// Worker 初期化 (インラインBlobを用いた自己完結型Worker)
	// =========================================================================
	#initWorker() {
		this.#jobCounter = 0;
		this.#workerCallbacks = new Map();

		const workerCode = `
		self.onmessage = function(e) {
			const { srcBuffer, mapGridXBuffer, mapGridYBuffer, ciw, cih, diw, dih, STEP, gridW, gridH, jobId } = e.data;

			const srcData32 = new Uint32Array(srcBuffer);
			const dstBuffer = new ArrayBuffer(diw * dih * 4);
			const dstData32 = new Uint32Array(dstBuffer);
			const mapGridX = new Float32Array(mapGridXBuffer);
			const mapGridY = new Float32Array(mapGridYBuffer);

			const getSrcPixel = (x, y) => {
				let clampedX = x < 0 ? 0 : (x >= ciw ? ciw - 1 : x);
				let clampedY = y < 0 ? 0 : (y >= cih ? cih - 1 : y);
				return srcData32[clampedY * ciw + clampedX];
			};

			for (let gy = 0; gy < gridH - 1; gy++) {
				const y0 = gy * STEP;
				const y1 = Math.min((gy + 1) * STEP, dih);
				const rowLength = y1 - y0;

				for (let gx = 0; gx < gridW - 1; gx++) {
					const x0 = gx * STEP;
					const x1 = Math.min((gx + 1) * STEP, diw);
					const colLength = x1 - x0;

					const i00 = gy * gridW + gx;
					const i10 = i00 + 1;
					const i01 = i00 + gridW;
					const i11 = i01 + 1;

					const cx00 = mapGridX[i00], cy00 = mapGridY[i00];
					const cx10 = mapGridX[i10], cy10 = mapGridY[i10];
					const cx01 = mapGridX[i01], cy01 = mapGridY[i01];
					const cx11 = mapGridX[i11], cy11 = mapGridY[i11];

					if (cx00 < 0 || cx10 < 0 || cx01 < 0 || cx11 < 0) continue;

					for (let dy = 0; dy < rowLength; dy++) {
						const py = y0 + dy;
						const v = dy / STEP;
						const invV = 1.0 - v;
						const rowStart = py * diw;

						for (let dx = 0; dx < colLength; dx++) {
							const px = x0 + dx;
							const u = dx / STEP;
							const invU = 1.0 - u;

							const srcX = (cx00 * invU + cx10 * u) * invV + (cx01 * invU + cx11 * u) * v;
							const srcY = (cy00 * invU + cy10 * u) * invV + (cy01 * invU + cy11 * u) * v;

							if (srcX >= -0.5 && srcX < ciw + 0.5 && srcY >= -0.5 && srcY < cih + 0.5) {
								const ix = Math.floor(srcX);
								const iy = Math.floor(srcY);
								dstData32[rowStart + px] = getSrcPixel(ix, iy);
							}
						}
					}
				}
			}
			// ゼロコピー転送でメインスレッドに結果を戻す
			self.postMessage({ jobId, dstBuffer }, [dstBuffer]);
		};
		`;

		const blob = new Blob([workerCode], { type: "application/javascript" });
		this.#worker = new Worker(URL.createObjectURL(blob));

		this.#worker.onmessage = (e) => {
			const { jobId, dstBuffer } = e.data;
			if (this.#workerCallbacks.has(jobId)) {
				this.#workerCallbacks.get(jobId)(dstBuffer);
				this.#workerCallbacks.delete(jobId);
			}
		};
	}

	// =========================================================================
	// DOM / DOM-Events
	// =========================================================================

	getImgElement(
		x,
		y,
		width,
		height,
		href,
		id,
		opacity,
		category,
		meta,
		title,
		transform,
		href_fragment,
		pixelated,
		imageFilter,
		nocache,
		crossoriginProp,
		svgimageInfo,
		commonQuery
	) {
		var img = document.createElement("img");

		if (pixelated) {
			img.style.imageRendering = "pixelated";
			img.style.imageRendering = "-moz-crisp-edges";
			img.style.msInterpolationMode = "nearest-neighbor";
			img.style.imageRendering = "optimize-contrast";
			img.dataset.pixelated = "true";
		}

		// 2015.7.3 spatial fragment
		if (href_fragment) img.setAttribute("href_fragment", href_fragment);
		// ビットイメージにもnocacheを反映させてみる 2019.3.18
		if (nocache) href = UtilFuncs.getNoCacheRequest(href);
		// 認証キーなどに用いるレイヤー(もしくはフレームワーク共通)クエリストリング設置
		if (commonQuery)
			href = UtilFuncs.addCommonQueryAtQueryString(href, commonQuery);

		var imgAinf = this.#proxyManager.getImageAccessInfo(
			href,
			this.#needsNonLinearImageTransformation(
				this.#svgImagesProps[svgimageInfo.docId].CRS,
				svgimageInfo.svgNode
			),
			crossoriginProp
		);
		this.#setLoadingImagePostProcessing(
			img,
			imgAinf.href,
			id,
			false,
			svgimageInfo,
			imgAinf.crossOriginFlag,
			imgAinf.hasNonLinearImageTransformation
		);

		if (opacity) img.style.opacity = opacity;
		if (imageFilter) img.style.filter += imageFilter;
		img.style.left = x + "px";
		img.style.top = y + "px";
		img.style.display = "none"; // for Safari  
		img.style.position = "absolute";
		img.style.maxWidth = "initial"; // patch for Angular default CSS 2021/6 
		img.style.height = height + "px"; // patch for other CSS fw 2021/10/28  
		img.style.width = width + "px";
		img.width = width;
		img.height = height;
		img.id = id;

		if (transform) {
			img.style.transform = `matrix(${transform.a},${transform.b},${transform.c},${transform.d},${transform.e},${transform.f})`;
			img.style.transformOrigin = "0 0";
			img.style.webkitTransform = img.style.transform;
			img.style.webkitTransformOrigin = "0 0";
		}

		if (category == SvgMapElementType.POI) {
			img.style.zIndex = "10"; // POIがcanvasより下だとクリックできない問題への対策(POIの重ね順が間違ったことになる場当たり対策だが・・ 2013.9.12) 　ヒットテストを独自実装したので、2018.3.2コメント マウスオーバー時のticker表示がないがクリックできるようにはなりました
			img.style.cursor = "pointer";
			img.setAttribute("content", meta);
			img.setAttribute("title", title || imgAinf.href);
		} else {
			img.setAttribute("title", "");
		}
		return img;
	}

	setImgElement(
		img,
		x,
		y,
		width,
		height,
		href,
		transform,
		cdx,
		cdy,
		txtFlg,
		txtNonScaling,
		href_fragment,
		pixelated,
		imageFilter,
		id,
		opacity,
		crossoriginProp,
		svgimageInfo
	) {
		if (!cdx) cdx = 0;
		if (!cdy) cdy = 0;

		// 位置の計算
		var layoutTop = cdy + y;
		if (txtFlg) {
			if (!txtNonScaling) img.style.fontSize = height + "px";
			var fontS = parseInt(img.style.fontSize);
			const txtHeight = this.#getTextHeight(
				svgimageInfo.svgNode.textContent,
				fontS
			);
			layoutTop = y + cdy - txtHeight; // 2025/9/26 topに統一(filterで不具合が生じるため)  
		}
		var layoutLeft = cdx + x;
		var layoutTransform = transform
			? `matrix(${transform.a},${transform.b},${transform.c},${transform.d},${transform.e},${transform.f})`
			: null;

		// 非線形変換（LUT）が必要かどうかの判定
		var needsNonLinear =
			!txtFlg &&
			this.#needsNonLinearImageTransformation(
				this.#svgImagesProps[svgimageInfo.docId].CRS,
				svgimageInfo.svgNode
			);

		if (needsNonLinear) {
			// LUT適用が入る場合は、変換完了まで位置とサイズの適用を遅延させる（要素に退避）
			img._nextLutLayout = {
				left: layoutLeft,
				top: layoutTop,
				width: width,
				height: height,
				transform: layoutTransform,
			};
		} else {
			// 通常通り即座に適用する
			img.style.left = layoutLeft + "px";
			img.style.top = layoutTop + "px";

			if (!txtFlg) {
				img.width = width;
				img.height = height;
				img.style.width = width + "px";
				img.style.height = height + "px";
			}

			if (layoutTransform) {
				img.style.transform = layoutTransform;
				img.style.transformOrigin = "0 0";
				img.style.webkitTransform = layoutTransform;
				img.style.webkitTransformOrigin = "0 0";
			} else {
				img.style.transform = "";
				img.style.webkitTransform = "";
			}
		}

		// 2022/05/30 : pixelated, opacity,filterのDOM操作を反映させる
		if (pixelated) {
			// Disable anti-alias http://dachou.daa.jp/tanaka_parsonal/pixelart-topics/  Edgeが・・・
			img.style.imageRendering = "pixelated";
			img.style.imageRendering = "-moz-crisp-edges";
			img.style.msInterpolationMode = "nearest-neighbor";
			img.style.imageRendering = "optimize-contrast";
			img.dataset.pixelated = "true";
		} else {
			img.style.imageRendering = "";
			img.style.msInterpolationMode = "";
			img.dataset.pixelated = "true";
		}
		img.style.opacity = opacity || "";
		img.style.filter = imageFilter || "";

		var imgAinf = this.#proxyManager.getImageAccessInfo(
			href,
			this.#needsNonLinearImageTransformation(
				this.#svgImagesProps[svgimageInfo.docId].CRS,
				svgimageInfo.svgNode
			),
			crossoriginProp
		);

		var isPreTransformed = img.hasAttribute("data-preTransformedHref");
		var imgSrc =
			img.getAttribute("data-preTransformedHref") || img.getAttribute("src");

		if (
			!txtFlg &&
			img.src &&
			imgAinf.href &&
			this.#isHrefChanged(imgSrc, imgAinf.href)
		) {
			// firefoxでは(同じURLかどうかに関わらず)srcを書き換えるとロードしなおしてしまうのを抑制 2014.6.12 絶対パスになってバグが出てない？2015.7.8 getAttrで取れば絶対パスにならないで破たんしない。
			//		img.src = href; // これは下で行う(2020.2.4)
			img.removeAttribute("data-preTransformedHref");
			this.#setLoadingImagePostProcessing(
				img,
				imgAinf.href,
				id,
				true,
				svgimageInfo,
				imgAinf.crossOriginFlag,
				imgAinf.hasNonLinearImageTransformation
			);
		} else if (isPreTransformed) {
			var hiddenImg = new Image();
			if (imgAinf.crossOriginFlag) hiddenImg.crossOrigin = "anonymous";
			hiddenImg.onload = () => {
				this.#imageTransform(img, svgimageInfo, hiddenImg);
			};
			hiddenImg.src = imgSrc;
		}
		//	img.style.display =""; // hideAllTileImgs()用だったが、読み込み途中でスクロールと化すると豆腐が出現するバグになっていたので、それはvisibilityでの制御に変更
		img.style.visibility = "";

		// added 2015.7.8
		if (href_fragment) this.#setImgViewport(img, href_fragment);
	}

	#setLoadingImagePostProcessing(
		img,
		href,
		id,
		forceSrcIE,
		svgimageInfo,
		crossOriginFlag,
		hasNonLinearImageTransformation
	) {
		var timeout = this.#loadingTransitionTimeout;
		// 2022/3/26 NonLinearImageTransformationのあるimgはtimeoutを3倍に延ばす・・(場当たりだね)  
		if (hasNonLinearImageTransformation == true) timeout *= 3;

		if (hasNonLinearImageTransformation) {
			img.setAttribute("data-loadingHref", href);
			var hiddenImg = new Image();
			if (crossOriginFlag) hiddenImg.crossOrigin = "anonymous";

			var timerId = setTimeout(() => {
				this.#timeoutLoadingImg({ id: id });
			}, timeout);

			hiddenImg.onload = () => {
				clearTimeout(timerId);
				if (img.getAttribute("href_fragment")) {
					var href_fragment = img.getAttribute("href_fragment");
					this.#setImgViewport(img, href_fragment);
					img.removeAttribute("href_fragment");
				}

				// Workerの処理完了を待ってから、画像の表示と完了通知を行う
				this.#imageTransform(img, svgimageInfo, hiddenImg).then(() => {
					img.style.display = "";
					img.style.visibility = "";
					delete this.#loadingImgs[id];
					this.#checkLoadCompleted(); // これで古いタイルが消去される
				});
			};

			hiddenImg.onerror = () => {
				clearTimeout(timerId);
				this.#timeoutLoadingImg({ id: id });
			};

			hiddenImg.src = href;
			this.#loadingImgs[id] = svgimageInfo;
			return;
		}

		// 以下は通常の画像（変換不要）のための従来処理
		if (this.#mapViewerProps.uaProps.verIE > 8) {
			img.addEventListener("load", this.#handleLoadSuccess); // for Safari 
			img.addEventListener("error", this.#timeoutLoadingImg); // 2016.10.28 for ERR403,404 imgs (especially for sloppy tiled maps design)  
			img.src = href;
			// crossOrigin属性はsrc書き換えと同タイミングとする。2021.6.9 crossOrigin特性だけ変更するケースはない(Imageのproxy設定と一体)という想定でいる・・  
			img.crossOrigin = crossOriginFlag ? "anonymous" : null;
		} else {
			// for IE  to be obsoluted.. 
			img.attachEvent("onload", this.#handleLoadSuccess);
			// これは意味あるのか？  
			img.crossOrigin = crossOriginFlag ? "anonymous" : null;
			if (forceSrcIE) img.src = href;
			else img.setAttribute("href", href); // IE8のバグの対策のため・・hrefはDOM追加後につけるんです  
			img.style.filter = "inherit"; // 同上 (http://www.jacklmoore.com/notes/ie-opacity-inheritance/)  
		}
		setTimeout(this.#timeoutLoadingImg, timeout, img);
		this.#loadingImgs[id] = svgimageInfo; // 2021/1/26 loadingImgsには画像の場合booleanではなくsvgimageInfoを入れ、ビットイメージ非線形変換を容易にした
	}

	#handleLoadSuccess = function (obj) {
		// (bitImage)画像の読み込み完了処理  
		var target = obj.target || obj.srcElement;
		target.removeEventListener("load", this.#handleLoadSuccess);

		if (target.getAttribute("href_fragment")) {
			// 2015.7.3 spatial fragment  
			var href_fragment = target.getAttribute("href_fragment");
			this.#setImgViewport(target, href_fragment);
			target.removeAttribute("href_fragment"); // もう不要なので削除する（大丈夫？）2015.7.8  
		}

		var svgimageInfo = this.#loadingImgs[target.id]; // 2021/1/26 loadingImgsには画像の場合booleanではなくcrs等を入れるようにした。  

		// 同様に処理の完了を待つ
		this.#imageTransform(target, svgimageInfo).then(() => {
			target.style.display = "";
			target.style.visibility = "";
			delete this.#loadingImgs[target.id]; 
			this.#checkLoadCompleted();
		});
	}.bind(this);

	#needsNonLinearImageTransformation(crs, imageElem) {
		// その画像が非線形変換が必要なものかどうかを判別する 2021/08/10関数化  
		const rootCrs = this.#mapViewerProps.rootCrs;
		
		// ルートとレイヤーそれぞれの非線形性チェック（LUT対応版）
		const isRootNonLinear =
			!!rootCrs.lut ||
			typeof rootCrs.transform === "function" ||
			!!rootCrs.mercator;
		const isLayerNonLinear =
			!!crs.lut || typeof crs.transform === "function" || !!crs.mercator;
		// どちらも非線形でないなら不要
		if (!isRootNonLinear && !isLayerNonLinear) return false;
		
		// メルカトルタイルの特殊処理 2021/08/10
		const layerHasTransform = !!crs.lut || typeof crs.transform === "function";
		if (
			imageElem.getAttribute("data-mercator-tile") === "true" &&
			!layerHasTransform && 
			!!rootCrs.mercator
		) {
			return false;
		}
		
		// ビットイメージのtransformがref(svg..)の場合は不要とする特殊処理 2023/6/29  
		var tfv = imageElem.getAttribute("transform");
		if (tfv && tfv.indexOf("ref") == 0) return false;
		
		return true;
	}

	#timeoutLoadingImg = function (obj) {
		// ロード失敗(タイムアウトやERR404,403)した画像(bitImage)を強制的に読み込み完了とみなしてしまう処理
		var target;
		var timeout = false;
		if (obj.id) {
			target = obj;
			timeout = true;
		} else {
			// added 2016.10.28 ( for err403,404 imgs )
			target = obj.target || obj.srcElement;
			++this.#loadErrorStatistics.otherBitImagesCount;
		}
		if (this.#loadingImgs[target.id]) {
			console.warn("LoadImg TimeOut!!!!!");
			if (timeout) ++this.#loadErrorStatistics.timeoutBitImagesCount;
			delete this.#loadingImgs[target.id];
			this.#checkLoadCompleted();
		}
	}.bind(this);

	// =======================================
	// #imageTransform (Web Worker + Grid-Interpolated 版)
	// =======================================
	#imageTransform(imgElem, svgimageInfo, sourceImgOverride) {
		if (!svgimageInfo) return Promise.resolve();

		if (!imgElem.getAttribute("data-preTransformedHref")) {
			// data-loadingHref もチェック対象に含める
			var origHref =
				imgElem.getAttribute("data-loadingHref") ||
				imgElem.getAttribute("src") ||
				imgElem.getAttribute("href") ||
				imgElem.getAttribute("xlink:href");
			if (origHref) {
				imgElem.setAttribute("data-preTransformedHref", origHref);
				imgElem.removeAttribute("data-loadingHref"); // 不要になったら消す
			}
		}

		var imageElem = svgimageInfo.svgNode;
		var tf = imageElem.getAttribute("transform");
		// transform ref属性が付いている場合はスキップする(TBD)
		if (tf && tf.indexOf("ref") == 0) return Promise.resolve();

		var tfm = UtilFuncs.parseTransformMatrix(tf);
		var crs = this.#svgImagesProps[svgimageInfo.docId].CRS; // 長い過程を経て、直接取れるようにした・・
		if (this.#needsNonLinearImageTransformation(crs, imageElem) == false)
			return Promise.resolve(); // 2021/08/10

		var srcImg = sourceImgOverride || imgElem;
		var ciw = srcImg.naturalWidth || imgElem.naturalWidth;
		var cih = srcImg.naturalHeight || imgElem.naturalHeight;

		if (!ciw || !cih) return Promise.resolve(); // ★変更

		const currentJobId = String(++this.#jobCounter);
		imgElem.dataset.transformJobId = currentJobId;

		var overSample = 1.5;
		var diw = Math.floor(ciw * overSample);
		var dih = Math.floor(cih * overSample);

		// ソースのイメージローカルsvg座標系におけるソース画像の座標(transform前)
		var csix = Number(imageElem.getAttribute("x"));
		var csiy = Number(imageElem.getAttribute("y"));
		var csiw = Number(imageElem.getAttribute("width"));
		var csih = Number(imageElem.getAttribute("height"));

		// ソース画像系->ソースSVG系変換行列
		var ci2cs = { a: csiw / ciw, b: 0, c: 0, d: csih / cih, e: csix, f: csiy };
		if (tfm) ci2cs = this.#matUtil.matMul(ci2cs, tfm);

		// ソースSVG系->ソース画像系変換行列
		var cs2ci = this.#matUtil.getInverseMatrix(ci2cs);
		// ソース(個々のコンテンツ)SVG->ルートSVG変換
		var cs2rs = this.#matUtil.getConversionMatrixViaGCS(
			crs,
			this.#mapViewerProps.rootCrs
		);
		// ソースSVGにおける画像領域
		var cib = this.#matUtil.transformRect(
			{ x: 0, y: 0, width: ciw, height: cih },
			ci2cs
		);
		// ルートSVG座標系における該当イメージの領域
		var rib = this.#matUtil.transformRect(cib, cs2rs);

		// ルートSVG系上のイメージ画像系->ルートSVG
		var ri2rs = {
			a: rib.width / diw,
			b: 0,
			c: 0,
			d: rib.height / dih,
			e: rib.x,
			f: rib.y,
		};

		const rootCrs = this.#mapViewerProps.rootCrs;
		const layerNeedsLut =
			crs &&
			(crs.transformFunctionName ||
				typeof crs.transform === "function" ||
				crs.mercator);
		const rootNeedsLut =
			rootCrs &&
			(rootCrs.transformFunctionName ||
				typeof rootCrs.transform === "function" ||
				rootCrs.mercator);

		// LUTがない場合は潔くエラーとして処理を打ち切る
		if ((layerNeedsLut && !crs.lut) || (rootNeedsLut && !rootCrs.lut)) {
			console.error(
				`[ImgRenderer] LUT is required but not found for image: ${imgElem.id || "unknown"}. Aborting transform.`
			);
			return Promise.resolve();
		}

		const rootInverseFunc = rootCrs.lut ? rootCrs.lut.inverse : null;
		const rootInverseMat = !rootInverseFunc
			? this.#matUtil.getInverseMatrix(rootCrs)
			: null;
		const layerTransformFunc = crs.lut ? crs.lut.transform : null;

		var sc = document.createElement("canvas");
		var sctx = sc.getContext("2d");
		sc.width = diw;
		sc.height = dih;

		sctx.drawImage(srcImg, 0, 0, ciw, cih);
		var srcData = sctx.getImageData(0, 0, ciw, cih);

		const STEP = 2;
		const gridW = Math.ceil(diw / STEP) + 1;
		const gridH = Math.ceil(dih / STEP) + 1;

		const mapGridX = new Float32Array(gridW * gridH);
		const mapGridY = new Float32Array(gridW * gridH);

		for (let gy = 0; gy < gridH; gy++) {
			let riy = Math.min(gy * STEP, dih - 1);
			for (let gx = 0; gx < gridW; gx++) {
				let rix = Math.min(gx * STEP, diw - 1);
				let gIdx = gy * gridW + gx;

				var rsCrd = MatrixUtil.linearTransform(rix, riy, ri2rs);
				var gxCrd, gyCrd;

				if (rootInverseFunc) {
					var gCrd = rootInverseFunc(rsCrd);
					if (!gCrd) {
						mapGridX[gIdx] = -1;
						mapGridY[gIdx] = -1;
						continue;
					}
					gxCrd = gCrd.x;
					gyCrd = gCrd.y;
				} else {
					var gCrdLin = MatrixUtil.linearTransform(
						rsCrd.x,
						rsCrd.y,
						rootInverseMat
					);
					gxCrd = gCrdLin.x;
					gyCrd = gCrdLin.y;
				}

				var csx, csy;
				if (layerTransformFunc) {
					var csCrd = layerTransformFunc({ x: gxCrd, y: gyCrd });
					if (!csCrd) {
						mapGridX[gIdx] = -1;
						mapGridY[gIdx] = -1;
						continue;
					}
					csx = csCrd.x;
					csy = csCrd.y;
				} else {
					var csCrdLin = MatrixUtil.linearTransform(gxCrd, gyCrd, crs);
					csx = csCrdLin.x;
					csy = csCrdLin.y;
				}

				var ciCrd = MatrixUtil.linearTransform(csx, csy, cs2ci);
				mapGridX[gIdx] = ciCrd.x;
				mapGridY[gIdx] = ciCrd.y;
			}
		}

		// Worker部分をPromiseで包んで返す
		return new Promise((resolve) => {
			this.#workerCallbacks.set(currentJobId, (dstBuffer) => {
				if (imgElem.dataset.transformJobId === currentJobId) {
					const dstData = new ImageData(
						new Uint8ClampedArray(dstBuffer),
						diw,
						dih
					);
					sctx.putImageData(dstData, 0, 0);
					imgElem.setAttribute("src", sc.toDataURL("image/png"));
					// 退避していた位置・サイズ情報があれば、画像更新と同時に適用する
					if (imgElem._nextLutLayout) {
						const layout = imgElem._nextLutLayout;
						imgElem.style.left = layout.left + "px";
						imgElem.style.top = layout.top + "px";
						imgElem.width = layout.width;
						imgElem.height = layout.height;
						imgElem.style.width = layout.width + "px";
						imgElem.style.height = layout.height + "px";

						if (layout.transform) {
							imgElem.style.transform = layout.transform;
							imgElem.style.webkitTransform = layout.transform;
							imgElem.style.transformOrigin = "0 0";
							imgElem.style.webkitTransformOrigin = "0 0";
						} else {
							imgElem.style.transform = "";
							imgElem.style.webkitTransform = "";
						}
						delete imgElem._nextLutLayout;
					}
				}
				resolve(); // 処理が終わったら解決
			});

			this.#worker.postMessage(
				{
					jobId: currentJobId,
					srcBuffer: srcData.data.buffer,
					mapGridXBuffer: mapGridX.buffer,
					mapGridYBuffer: mapGridY.buffer,
					ciw,
					cih,
					diw,
					dih,
					STEP,
					gridW,
					gridH,
				},
				[srcData.data.buffer, mapGridX.buffer, mapGridY.buffer]
			);
		});
	}

	// 補助関数群
	#setImgViewport(target, href_fragment) {
		var imgBox = href_fragment.split(/\s*,\s*|\s/);
		var iScaleX = target.width / Number(imgBox[2]);
		var iScaleY = target.height / Number(imgBox[3]);
		var clipX = parseFloat(target.style.left) - iScaleX * Number(imgBox[0]);
		var clipY = parseFloat(target.style.top) - iScaleY * Number(imgBox[1]);
		var clipWidth = target.naturalWidth * iScaleX;
		var clipHeight = target.naturalHeight * iScaleY;
		target.style.left = clipX + "px";
		target.style.top = clipY + "px";
		target.width = clipWidth;
		target.height = clipHeight;
		target.style.width = clipWidth + "px";
		target.style.height = clipHeight + "px";
		target.style.clip = `rect(${Number(imgBox[1]) * iScaleY}px,${(Number(imgBox[0]) + Number(imgBox[2])) * iScaleX}px,${(Number(imgBox[1]) + Number(imgBox[3])) * iScaleY}px,${Number(imgBox[0]) * iScaleX}px)`;
	}

	#isHrefChanged(htmlSrc, svgHref) {
		if (htmlSrc == svgHref) return false;
		if (htmlSrc.indexOf(svgHref) == 0) {
			var difS = htmlSrc.substring(svgHref.length);
			// たぶん、unixTimeが追加されているだけだと考える  
			if (difS.indexOf("unixTime=") > 0 && difS.length < 24) return false;
		}
		return true;
	}

	// To be obsoluted
	buildPixelatedImages4Edge(mapCanvas) {
		// pixelatedimgに対する、MS Edgeの問題に、無理やりなパッチを試みてみます・・・ 2018.9.3
		// see http://dachou.daa.jp/tanaka_parsonal/pixelart-topics/
		// and https://www.wizforest.com/tech/bigdot/

		// debug: https://developer.mozilla.org/ja/docs/Web/API/MutationObserver
		var imgs = mapCanvas.getElementsByTagName("img");
		if (imgs.length > 0) {
			for (var i = 0; i < imgs.length; i++) {
				if (imgs[i].dataset.pixelated) {
					var parentDiv = imgs[i].parentNode;
					imgs[i].style.visibility = "hidden";
					var canvas = document.createElement("canvas");
					canvas.dataset.pixelate4Edge = "true";
					canvas.width = imgs[i].width;
					canvas.height = imgs[i].height;
					canvas.style.position = "absolute";
					canvas.style.top = imgs[i].style.top;
					canvas.style.left = imgs[i].style.left;
					parentDiv.insertBefore(canvas, imgs[i]);
					var ctx = canvas.getContext("2d");
					ctx.imageSmoothingEnabled = false;
					ctx.msImageSmoothingEnabled = false;
					var cimg = new Image();
					cimg.src = imgs[i].src;
					ctx.drawImage(cimg, 0, 0, canvas.width, canvas.height);
				}
			}
		}
	}

	getSpanTextElement(
		x,
		y,
		cdx,
		cdy,
		text,
		id,
		opacity,
		transform,
		style,
		areaHeight,
		nonScaling
	) {
		// この関数はメインクラスからImgRendererに移した2025/10/09
		// 2014.7.22
		var img = document.createElement("span");  // spanで良い？ divだと挙動がおかしくなるので・・
		if (opacity) img.style.opacity = opacity;
		if (style.fill) img.style.color = style.fill;

		var fontS =
			style["font-size"] && nonScaling
				? Number(style["font-size"])
				: nonScaling
					? 16
					: areaHeight;
		const txtHeight = this.#getTextHeight(text, fontS);

		img.style.fontSize = fontS + "px";
		img.innerHTML = text;
		img.style.left = x + cdx + "px";
		img.style.top = y + cdy - txtHeight + "px"; // 2025/9/26 topに統一(filterで不具合が生じるため)  
		img.style.position = "absolute";
		img.id = id;
		img.setAttribute("title", "");
		return img;
	}

	// テキストの高さを計算する関数群
	// 2025/10/16
	// font familyはデフォルトだけ、this.#fontSizesにキャッシュ貯める
	#fontSizes = { height: { 0: 0 } }; // キーを文字列として初期化
	#MAX_FONTSIZECACHE = 64; // キャッシュ上限を定義

	/**
	 * テキストの高さを計算するメイン関数
	 * @param {string} htmlContent - テキスト内容（<br>を含む可能性あり）
	 * @param {number} fontSize - 文字サイズ（数値）
	 * @returns {number} - 最終的な高さ
	 */
	#getTextHeight(htmlContent, fontSize) {
		const txtHeight = this.#getFontHeight(fontSize);
		const brs = this.#countBr(htmlContent);
		return txtHeight * (brs + 1);
	}

	/**
	 * 指定されたサイズの高さを取得または計算します。
	 * @param {number} fontSize - 文字サイズ
	 * @returns {number} - 対応する高さ
	 */
	#getFontHeight(fontSize) {
		const sizeStr = String(fontSize); // キーを文字列化
		let txtHeight = this.#fontSizes.height[sizeStr];
		if (txtHeight === undefined || txtHeight === null) {
			// 補間・外挿の計算中に sizeStr が 0 以外で txtHeight が 0 になる可能性は低いが、
			// 念のため、0の場合は再計算を試みるロジックも組み込む場合はこの if 文を調整する
			// サイズ上限のチェックと格納
			const currentLength = Object.keys(this.#fontSizes.height).length;
			if (currentLength < this.#MAX_FONTSIZECACHE) {
				const txtSize = this.#measureTextSize("TEXT", fontSize + "px");
				txtHeight = txtSize.height;
				this.#fontSizes.height[sizeStr] = txtHeight;
			} else {
				// サイズ上限を超えた場合、推定
				txtHeight = this.#textSizeLinearInterpolate(fontSize);
			}
		}
		return txtHeight;
	}

	/**
	 * 線形補間または外挿により高さを推定します。
	 * @param {number} size - 求めたい文字サイズ
	 * @returns {number} - 推定された高さ
	 */
	#textSizeLinearInterpolate(size) {
		// キャッシュされたソート済み配列が存在しない場合のみ作成
		if (
			!this.#fontSizes.fsArray ||
			this.#fontSizes.fsArray.length !==
				Object.keys(this.#fontSizes.height).length
		) {
			this.#fontSizes.fsArray = Object.keys(this.#fontSizes.height)
				.map((key) => parseFloat(key))  // キーを数値に変換
				.filter((key) => key !== 0) // 0:0 の初期値を除外するほうが安定しやすい
				.sort((a, b) => a - b); // 昇順ソート
		}
		const dataPoints = this.#fontSizes.fsArray;
		if (dataPoints.length < 2) {
			// データが2点未満の場合（0:0だけの場合など）
			const refSize = dataPoints[0] || 1; // 参照サイズを0以外にする
			const refHeight = this.#fontSizes.height[String(refSize)] || 1;
			return refHeight * (size / refSize); // 比例計算で代替
		}
		// ソートされたサイズを基に、x1とx2を特定
		let x1 = null, // size未満で最大の点
			x2 = null; // sizeより大きく最小の点
		for (let i = 0; i < dataPoints.length; i++) {
			const currentX = dataPoints[i];
			if (currentX < size) x1 = currentX;
			else if (currentX > size) {
				x2 = currentX;
				break; // x2が見つかったら終了
			}
		}
		// x1, x2に対応するy1, y2を取得
		let x_min, y_min, x_max, y_max;
		if (x1 !== null && x2 !== null) {
			// 補間 (Interpolation): x1 < size < x2 の場合
			x_min = x1;
			x_max = x2;
		} else if (x1 === null && x2 !== null) {
			// 外挿 (Extrapolation) - 最小値より小さい場合 (size < x_min)
			// 最小の2点を使用
			x_min = dataPoints[0];
			x_max = dataPoints[1];
		} else if (x1 !== null && x2 === null) {
			// 外挿 (Extrapolation) - 最大値より大きい場合 (size > x_max)
			// 最大の2点を使用
			const len = dataPoints.length;
			x_min = dataPoints[len - 2];
			x_max = dataPoints[len - 1];
		} else return 0;

		// y_min, y_max を取得
		y_min = this.#fontSizes.height[String(x_min)];
		y_max = this.#fontSizes.height[String(x_max)];
		// 線形補間/外挿の計算
		return y_min + (y_max - y_min) * ((size - x_min) / (x_max - x_min));
	}

	#measureTextSize(htmlContent, fontSize, fontFamily = "sans-serif") {
		// 一時的な要素を作成
		const tempElement = document.createElement("span");
		tempElement.style.visibility = "hidden";
		tempElement.style.position = "absolute";
		tempElement.style.whiteSpace = "pre-wrap"; // 改行を考慮するために設定
		tempElement.style.fontSize = fontSize;
		tempElement.style.fontFamily = fontFamily;
		tempElement.innerHTML = htmlContent;

		// DOMに追加
		document.body.appendChild(tempElement);
		// サイズを取得
		const rect = tempElement.getBoundingClientRect();
		// DOMから削除
		document.body.removeChild(tempElement);
		return { width: rect.width, height: rect.height };
	}

	#countBr(str) {
		const matches = str.match(/<br>/gi); // iフラグを追加して大文字小文字を区別しない
		return matches ? matches.length : 0;
	}
}

export { ImgRenderer };
