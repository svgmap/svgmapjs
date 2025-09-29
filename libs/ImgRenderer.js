// Description:
// ImgRenderer Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { UtilFuncs } from "./UtilFuncs.js";
import { SvgMapElementType } from "./SvgMapElementType.js";

class ImgRenderer {
	#svgMapObj;
	#loadingImgs;
	#proxyManager;
	//#rootCrs;
	#loadingTransitionTimeout;
	//#mapCanvasSize;
	#svgImagesProps;
	#matUtil;
	#checkLoadCompleted;
	#loadErrorStatistics;
	//#uaProps;
	#mapViewerProps;

	constructor(
		svgMapObj,
		loadingImgs,
		proxyManager,
		loadingTransitionTimeout,
		mapViewerProps,
		matUtil,
		checkLoadCompletedFunc,
		loadErrorStatistics,
	) {
		this.#svgMapObj = svgMapObj;
		this.#loadingImgs = loadingImgs;
		this.#proxyManager = proxyManager;
		this.#loadingTransitionTimeout = loadingTransitionTimeout;
		this.#mapViewerProps = mapViewerProps;
		this.#matUtil = matUtil;
		this.#checkLoadCompleted = checkLoadCompletedFunc; // これは予備元でbind済み
		this.#loadErrorStatistics = loadErrorStatistics;

		this.#svgImagesProps = this.#svgMapObj.getSvgImagesProps();
	}

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
		commonQuery,
	) {
		var img = document.createElement("img");

		if (pixelated) {
			// Disable anti-alias http://dachou.daa.jp/tanaka_parsonal/pixelart-topics/  Edgeが・・・
			img.style.imageRendering = "pixelated";
			//		img.style.imageRendering="crisp-edges";
			img.style.imageRendering = "-moz-crisp-edges";
			img.style.msInterpolationMode = "nearest-neighbor";
			img.style.imageRendering = "optimize-contrast";
			img.dataset.pixelated = "true";
		}

		if (href_fragment) {
			// 2015.7.3 spatial fragment
			img.setAttribute("href_fragment", href_fragment);
		}

		if (nocache) {
			// ビットイメージにもnocacheを反映させてみる 2019.3.18
			href = UtilFuncs.getNoCacheRequest(href);
		}

		if (commonQuery) {
			// 認証キーなどに用いるレイヤー(もしくはフレームワーク共通)クエリストリング設置
			href = UtilFuncs.addCommonQueryAtQueryString(href, commonQuery);
		}

		var imgAinf = this.#proxyManager.getImageAccessInfo(
			href,
			this.#needsNonLinearImageTransformation(
				this.#svgImagesProps[svgimageInfo.docId].CRS,
				svgimageInfo.svgNode,
			),
			crossoriginProp,
		);
		this.#setLoadingImagePostProcessing(
			img,
			imgAinf.href,
			id,
			false,
			svgimageInfo,
			imgAinf.crossOriginFlag,
			imgAinf.hasNonLinearImageTransformation,
		);

		if (opacity) {
			//		img.setAttribute("style" , "Filter: Alpha(Opacity=" + opacity * 100 + ");opacity:" + opacity + ";"); // 2021/11/15
			//		img.style.filter="Alpha(Opacity=" + opacity * 100 + ")";
			img.style.opacity = opacity;
		}
		if (imageFilter) {
			//		console.log("imageFilter:",imageFilter);
			img.style.filter += imageFilter;
		}
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
			// ま、とりあえず 2014.6.18
			img.style.transform =
				"matrix(" +
				transform.a +
				"," +
				transform.b +
				"," +
				transform.c +
				"," +
				transform.d +
				"," +
				transform.e +
				"," +
				transform.f +
				")";
			img.style.transformOrigin = "0 0";
			img.style.webkitTransform =
				"matrix(" +
				transform.a +
				"," +
				transform.b +
				"," +
				transform.c +
				"," +
				transform.d +
				"," +
				transform.e +
				"," +
				transform.f +
				")";
			img.style.webkitTransformOrigin = "0 0";
		}

		if (category == SvgMapElementType.POI) {
			// POI (set Event Handler)
			img.style.zIndex = "10"; // POIがcanvasより下だとクリックできない問題への対策(POIの重ね順が間違ったことになる場当たり対策だが・・ 2013.9.12) 　ヒットテストを独自実装したので、2018.3.2コメント マウスオーバー時のticker表示がないがクリックできるようにはなりました

			//		addEvent(img,"mousedown",testClick); // このイベントハンドラは廃止(かなり大きな変更) 2018.2.2

			img.style.cursor = "pointer";
			img.setAttribute("content", meta);
			if (title) {
				img.setAttribute("title", title);
			} else {
				img.setAttribute("title", imgAinf.href);
			}
		} else {
			img.setAttribute("title", "");
			//		img.setAttribute("alt", "" );
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
		svgimageInfo,
	) {
		if (!cdx) {
			cdx = 0;
		}
		if (!cdy) {
			cdy = 0;
		}

		img.style.left = cdx + x + "px";
		if (txtFlg) {
			if (!txtNonScaling) {
				img.style.fontSize = height + "px";
			}
			var fontS = parseInt(img.style.fontSize);
			img.style.top = y + cdy - fontS + "px"; // 2025/9/26 topに統一(filterで不具合が生じるため)
		} else {
			img.style.top = cdy + y + "px";
		}
		//	img.style.position = "absolute";
		if (!txtFlg) {
			img.width = width;
			img.height = height;
			img.style.width = width + "px";
			img.style.height = height + "px";
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
			img.style.imageRendering = "";
			img.style.msInterpolationMode = "";
			img.style.imageRendering = "";
			img.dataset.pixelated = "true";
		}
		if (opacity) {
			img.style.opacity = opacity;
		} else {
			img.style.opacity = "";
		}
		if (imageFilter) {
			img.style.filter = imageFilter;
		} else {
			img.style.filter = "";
		}

		var imgAinf = this.#proxyManager.getImageAccessInfo(
			href,
			this.#needsNonLinearImageTransformation(
				this.#svgImagesProps[svgimageInfo.docId].CRS,
				svgimageInfo.svgNode,
			),
			crossoriginProp,
		);

		var imgSrc = img.getAttribute("data-preTransformedHref");
		if (!imgSrc) {
			imgSrc = img.getAttribute("src");
		}
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
				imgAinf.hasNonLinearImageTransformation,
			);
		}
		if (transform) {
			// ま、とりあえず 2014.6.18
			img.style.transform =
				"matrix(" +
				transform.a +
				"," +
				transform.b +
				"," +
				transform.c +
				"," +
				transform.d +
				"," +
				transform.e +
				"," +
				transform.f +
				")";
			img.style.transformOrigin = "0 0";
			img.style.webkitTransform =
				"matrix(" +
				transform.a +
				"," +
				transform.b +
				"," +
				transform.c +
				"," +
				transform.d +
				"," +
				transform.e +
				"," +
				transform.f +
				")";
			img.style.webkitTransformOrigin = "0 0";
		}
		//	img.style.display =""; // hideAllTileImgs()用だったが、読み込み途中でスクロールと化すると豆腐が出現するバグになっていたので、それはvisibilityでの制御に変更
		img.style.visibility = ""; // debug

		if (href_fragment) {
			// added 2015.7.8
			this.#setImgViewport(img, href_fragment);
		}
	}

	#setLoadingImagePostProcessing(
		img,
		href,
		id,
		forceSrcIE,
		svgimageInfo,
		crossOriginFlag,
		hasNonLinearImageTransformation,
	) {
		var timeout = this.#loadingTransitionTimeout;
		var that = this;
		if (hasNonLinearImageTransformation == true) {
			timeout = this.#loadingTransitionTimeout * 3; // 2022/3/26 NonLinearImageTransformationのあるimgはtimeoutを3倍に延ばす・・(場当たりだね)
		}
		if (this.#mapViewerProps.uaProps.verIE > 8) {
			img.addEventListener("load", this.#handleLoadSuccess); // for Safari
			img.addEventListener("error", this.#timeoutLoadingImg); // 2016.10.28 for ERR403,404 imgs (especially for sloppy tiled maps design)
			img.src = href;
			if (crossOriginFlag) {
				// crossOrigin属性はsrc書き換えと同タイミングとする。2021.6.9 crossOrigin特性だけ変更するケースはない(Imageのproxy設定と一体)という想定でいる・・
				img.crossOrigin = "anonymous";
			} else {
				img.crossOrigin = null; // 2021/09/16 debug   Note: crossOrigin anonymousを設定していると、CORSがついていないhttp respがそもそも読み込めなくなるので、普通のimgは設定されるとまずい
			}
		} else {
			// for IE  to be obsoluted..
			img.attachEvent("onload", this.#handleLoadSuccess);
			if (crossOriginFlag) {
				// これは意味あるのか？
				img.crossOrigin = "anonymous";
			} else {
				img.crossOrigin = null; // 2021/09/16 debug
			}
			if (forceSrcIE) {
				img.src = href;
			} else {
				img.setAttribute("href", href); // IE8のバグの対策のため・・hrefはDOM追加後につけるんです
			}
			img.style.filter = "inherit"; // 同上 (http://www.jacklmoore.com/notes/ie-opacity-inheritance/)
		}
		setTimeout(this.#timeoutLoadingImg, timeout, img);
		this.#loadingImgs[id] = svgimageInfo; // // 2021/1/26 loadingImgsには画像の場合booleanではなくsvgimageInfoを入れ、ビットイメージ非線形変換を容易にした
	}

	#handleLoadSuccess = function (obj) {
		// (bitImage)画像の読み込み完了処理
		var target = obj.target || obj.srcElement;

		target.removeEventListener("load", this.#handleLoadSuccess);

		var href = target.src;

		if (target.getAttribute("href_fragment")) {
			// 2015.7.3 spatial fragment
			var href_fragment = target.getAttribute("href_fragment");
			this.#setImgViewport(target, href_fragment);
			target.removeAttribute("href_fragment"); // もう不要なので削除する（大丈夫？）2015.7.8
		}

		target.style.display = "";
		target.style.visibility = "";
		var svgimageInfo = this.#loadingImgs[target.id]; // 2021/1/26 loadingImgsには画像の場合booleanではなくcrs等を入れるようにした。
		delete this.#loadingImgs[target.id];
		this.#imageTransform(target, svgimageInfo);
		this.#checkLoadCompleted();
	}.bind(this);

	#needsNonLinearImageTransformation(crs, imageElem) {
		// その画像が非線形変換が必要なものかどうかを判別する 2021/08/10関数化
		//console.log(crs,imageElem);
		if (!crs.transform && !this.#mapViewerProps.rootCrs.transform) {
			return false;
		} else {
			if (
				imageElem.getAttribute("data-mercator-tile") == "true" &&
				!crs.transform &&
				this.#mapViewerProps.rootCrs.mercator
			) {
				// ビットイメージの各image要素にdata-mercatorTileがtrueで設定され、しかもrootのCRSにmercator属性があったら不要とする特殊処理 2021/08/10
				return false;
			}
			var tfv = imageElem.getAttribute("transform");
			if (tfv && tfv.indexOf("ref") == 0) {
				// ビットイメージのtransformがref(svg..)の場合は不要とする特殊処理 2023/6/29
				return false;
			}
			return true;
		}
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
			if (timeout) {
				++this.#loadErrorStatistics.timeoutBitImagesCount;
			}
			delete this.#loadingImgs[target.id];
			this.#checkLoadCompleted();
		}
	}.bind(this);

	#imageTransform(imgElem, svgimageInfo) {
		// ビットイメージタイルの内部について、任意の図法変換を加える機構 2020/08- まだまだ現在開発中だからいろいろ怪しい状態です2020/09/18
		// 2021/01/26 実用ユースケースが出てきたので、ブラッシュアップし、本流に載せることにする
		if (!svgimageInfo) {
			//console.log("NO image Element...");
			return;
		}
		var imageElem = svgimageInfo.svgNode;

		var tf = imageElem.getAttribute("transform");
		if (tf && tf.indexOf("ref") == 0) {
			// transform ref属性が付いている場合はスキップする(TBD)
			return;
		}
		var tfm = UtilFuncs.parseTransformMatrix(tf);
		//console.log(svgimageInfo.docId,this.#svgImagesProps[svgimageInfo.docId],imgElem);
		var crs = this.#svgImagesProps[svgimageInfo.docId].CRS; // 長い過程を経て、直接取れるようにした・・
		if (this.#needsNonLinearImageTransformation(crs, imageElem) == false) {
			// 2021/08/10
			return;
		}
		var sc = document.getElementById("imageTransformCanvas");
		if (!sc) {
			sc = document.createElement("canvas");
			sc.id = "imageTransformCanvas";
		}

		var ciw = imgElem.naturalWidth;
		var cih = imgElem.naturalHeight;

		var sctx = sc.getContext("2d");
		sc.width = ciw;
		sc.height = cih;
		sctx.drawImage(imgElem, 0, 0);

		var srcData = sctx.getImageData(0, 0, ciw, cih);
		var dstData = sctx.createImageData(ciw, cih);

		// ソースのイメージローカルsvg座標系におけるソース画像の座標(transform前)
		var csix = Number(imageElem.getAttribute("x"));
		var csiy = Number(imageElem.getAttribute("y"));
		var csiw = Number(imageElem.getAttribute("width"));
		var csih = Number(imageElem.getAttribute("height"));

		var ci2cs = {
			// ソース画像系->ソースSVG系変換行列
			a: csiw / ciw,
			b: 0,
			c: 0,
			d: csih / cih,
			e: csix,
			f: csiy,
		};
		if (tfm) {
			// x',y' = m2(m1(x,y)) : matMul( m1 , m2 )
			ci2cs = this.#matUtil.matMul(ci2cs, tfm);
		}

		var cs2ci = this.#matUtil.getInverseMatrix(ci2cs); // ソースSVG系->ソース画像系変換行列

		var rs2cs = this.#matUtil.getConversionMatrixViaGCS(
			this.#mapViewerProps.rootCrs,
			crs,
		); // ルートSVG->ソース(個々のコンテンツ)SVG変換
		var cs2rs = this.#matUtil.getConversionMatrixViaGCS(
			crs,
			this.#mapViewerProps.rootCrs,
		); // ソース(個々のコンテンツ)SVG->ルートSVG変換

		var cib = this.#matUtil.transformRect(
			{ x: 0, y: 0, width: ciw, height: cih },
			ci2cs,
		); // ソースSVGにおける画像領域

		/**
		if ( !rs2cs.transform ){
			// 非線形変換関数がないのでピクセル変換は不要
			return;
		}
		**/
		if (imgElem.getAttribute("data-preTransformedHref")) {
			console.log("Already Transformed image");
			return;
		}

		var rib = this.#matUtil.transformRect(cib, cs2rs); // ルートSVG座標系における該当イメージの領域

		//var rib=transformRect({x:csix,y:csiy,width:csiw,height:csih},cs2rs); //ルートSVG座標系における該当イメージの領域 "image bounds on root"
		// var cib=transformRect(rib,rs2cs); // 今のところ使ってない・・
		// ルート(画面表示)系上のビットイメージも、ひとまずソースと同一サイズで作ることにする

		var ri2rs = {
			// ルートSVG系上のイメージ画像系->ルートSVG
			a: rib.width / ciw,
			b: 0,
			c: 0,
			d: rib.height / cih,
			e: rib.x,
			f: rib.y,
		};

		// ピクセルごとに座標変換実行　重すぎれば離散的なアンカーを選んで線形補間するというのもありだが、今は全ピクセル変換
		var prevRowHasData = [];
		var prow = ciw * 4;
		for (var riy = 0; riy < cih; riy++) {
			var prevColHasData = false;
			for (var rix = 0; rix < ciw; rix++) {
				// ルートSVGにおける画像の座標
				var daddr = (rix + riy * ciw) * 4;

				var rsxy = this.#matUtil.transform(rix, riy, ri2rs); // ルートのSVG系の座標
				var csxy = this.#matUtil.transform(rsxy.x, rsxy.y, rs2cs); // コンテンツSVG系の座標 (この変換が非線形になることがある)
				var cixy;
				if (csxy) {
					cixy = this.#matUtil.transform(csxy.x, csxy.y, cs2ci); // コンテンツSVGにおける画像の座標
				}

				if (
					cixy &&
					cixy.x >= 0 &&
					cixy.x < ciw &&
					cixy.y >= 0 &&
					cixy.y < cih
				) {
					var saddr = (Math.floor(cixy.x) + Math.floor(cixy.y) * ciw) * 4;
					dstData.data[daddr] = srcData.data[saddr]; // r
					dstData.data[daddr + 1] = srcData.data[saddr + 1]; // g
					dstData.data[daddr + 2] = srcData.data[saddr + 2]; // b
					dstData.data[daddr + 3] = srcData.data[saddr + 3]; // a
					prevColHasData = true;
					prevRowHasData[rix] = true;
				} else {
					if (prevColHasData) {
						// prevColHasData
						// サブピクセルオーダーの継ぎ目を消す処理(X方向)
						// x方向ひとつ前のピクセルに値があればその値をコピーする
						// キャンバスの完全に隅にある継ぎ目は消えない。これも気にするなら1ピクセル大きいキャンバス作れば良いと思うね。
						dstData.data[daddr] = dstData.data[daddr - 4]; // r
						dstData.data[daddr + 1] = dstData.data[daddr - 4 + 1]; // g
						dstData.data[daddr + 2] = dstData.data[daddr - 4 + 2]; // b
						dstData.data[daddr + 3] = dstData.data[daddr - 4 + 3]; // a
					} else if (prevRowHasData[rix]) {
						// サブピクセルオーダーの継ぎ目を消す処理(Y方向)
						// y方向ひとつ前のピクセルに値があればその値をコピーする
						dstData.data[daddr] = dstData.data[daddr - prow]; // r
						dstData.data[daddr + 1] = dstData.data[daddr - prow + 1]; // g
						dstData.data[daddr + 2] = dstData.data[daddr - prow + 2]; // b
						dstData.data[daddr + 3] = dstData.data[daddr - prow + 3]; // a
					}
					prevColHasData = false;
					prevRowHasData[rix] = false;
				}
			}
		}
		sctx.putImageData(dstData, 0, 0);
		var iuri = sc.toDataURL("image/png");
		imgElem.setAttribute(
			"data-preTransformedHref",
			imgElem.getAttribute("src"),
		);
		imgElem.setAttribute("src", iuri);
	}

	// 以下基本staticな関数

	// ビットイメージのspatial fragmentに応じて、img要素の処理を実装 2015.7.3実装,2015.7.8 改修
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
		target.style.clip =
			"rect(" +
			Number(imgBox[1]) * iScaleY +
			"px," +
			(Number(imgBox[0]) + Number(imgBox[2])) * iScaleX +
			"px," +
			(Number(imgBox[1]) + Number(imgBox[3])) * iScaleY +
			"px," +
			Number(imgBox[0]) * iScaleX +
			"px)";
	}

	#isHrefChanged(htmlSrc, svgHref) {
		var ans = true;
		if (htmlSrc == svgHref) {
			return false;
		}

		if (htmlSrc.indexOf(svgHref) == 0) {
			var difS = htmlSrc.substring(svgHref.length);
			if (difS.indexOf("unixTime=") > 0 && difS.length < 24) {
				// たぶん、unixTimeが追加されているだけだと考える
				ans = false;
			}
		} else {
			// case -1 , >0
			// ans = true
		}
		return ans;
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
					console.log(
						"should be pixelated img : ",
						imgs[i].id,
						"  style:",
						imgs[i].style.top,
						imgs[i].style.left,
					);
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
}
export { ImgRenderer };
