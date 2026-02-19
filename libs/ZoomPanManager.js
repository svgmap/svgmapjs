// Description:
// ZoomPanManager Class for SVGMap.js
// SVGMap.jsのzoom/panに関する機能を制御するモジュール
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// 2022/08/16 SVGMap.jsから切り出し
// 2025/12/26 smoothZoomにPan機能を拡張
// 2026/02/02 カーソル位置中心ズーム機能

class ZoomPanManager {
	#panning = false;
	#mouseX0;
	#mouseY0; // マウスの初期値
	#mouseX0_dummy;
	#mouseY0_dummy; // ホイールズームモードにおける初期カーソル位置

	// import Func
	#hideTicker;
	#checkLoadCompleted;
	#getObjectAtPoint;
	#getIntValue;
	#getRootSvg2Canvas;

	// import Obj
	//#mapCanvas;
	//#uaProps;
	#mapViewerProps;
	#svgMapObj;

	#cursorCenterZooming = false;

	constructor(
		hideTickerFunc,
		checkLoadCompletedFunc,
		getObjectAtPointFunc,
		getIntValueFunc,
		getRootSvg2CanvasFunc,
		mapViewerProps,
		svgMapObj,
	) {
		// Set Func
		this.#hideTicker = hideTickerFunc;
		this.#checkLoadCompleted = checkLoadCompletedFunc;
		this.#getObjectAtPoint = getObjectAtPointFunc;
		this.#getIntValue = getIntValueFunc;
		this.#getRootSvg2Canvas = getRootSvg2CanvasFunc;
		// Link Obj
		this.#svgMapObj = svgMapObj;
		this.#mapViewerProps = mapViewerProps;
		//this.#uaProps = uaPropsObj;
		//this.#mapCanvas = this.#svgMapObj.getMapCanvas();
	}

	#printTouchEvt(evt) {
		if (evt.touches.length > 1) {
			this.#putCmt(
				evt.touches.length +
					" : " +
					evt.touches[0].pageX +
					"," +
					evt.touches[0].pageY +
					" : " +
					evt.touches[1].pageX +
					"," +
					evt.touches[1].pageY,
			);
			//				zoomingTransitionFactor = 1;
		}
	}

	#putCmt(cmt) {
		var posCmt = document.getElementById("posCmt");
		posCmt.innerHTML = cmt;
	}

	#initialTouchDisance = 0;
	#getTouchDistance(evt) {
		var xd = evt.touches[0].pageX - evt.touches[1].pageX;
		var yd = evt.touches[0].pageY - evt.touches[1].pageY;
		return Math.sqrt(xd * xd + yd * yd);
	}

	getMouseXY = function (evt) {
		var mx, my;
		if (!this.#mapViewerProps.uaProps.isIE) {
			if (evt.type.indexOf("touch") >= 0) {
				if (evt.touches.length > 1) {
					mx = (evt.touches[0].pageX + evt.touches[1].pageX) / 2;
					my = (evt.touches[0].pageY + evt.touches[1].pageY) / 2;
				} else if (evt.changedTouches.length > 1) {
					mx = (evt.changedTouches[0].pageX + evt.changedTouches[1].pageX) / 2;
					my = (evt.changedTouches[0].pageY + evt.changedTouches[1].pageY) / 2;
				} else if (evt.touches.length > 0) {
					mx = evt.touches[0].pageX;
					my = evt.touches[0].pageY;
				} else if (evt.changedTouches.length > 0) {
					mx = evt.changedTouches[0].pageX;
					my = evt.changedTouches[0].pageY;
				}
			} else {
				mx = evt.clientX;
				my = evt.clientY;
			}
		} else {
			mx = event.clientX;
			my = event.clientY;
		}
		var ans = {
			x: mx,
			y: my,
		};
		if (evt.dummyClientX) {
			// ホイールズームイベント時のマウスポインタ位置
			ans.dummyX = evt.dummyClientX;
			ans.dummyY = evt.dummyClientY;
		}
		return ans;
	}.bind(this);

	startPan = function (evt) {
		// console.log("startPan:", evt);
		this.#prevX = 0;
		this.#prevY = 0;
		if (evt && evt.button && evt.button == 2) {
			this.#zoomingTransitionFactor = 1; // ズーム
		} else {
			this.#zoomingTransitionFactor = -1; // パン
		}
		var shiftZoom = false;
		if (evt && evt.shiftKey && this.#zoomingTransitionFactor == -1) {
			console.log("SHIFT-ZOOM MODE");
			shiftZoom = true;
		}
		var mxy = this.getMouseXY(evt);
		if (mxy.dummyX) {
			this.#mouseX0_dummy = mxy.dummyX;
			this.#mouseY0_dummy = mxy.dummyY;
			this.#mouseX0 = 0;
			this.#mouseY0 = 0;
		} else {
			this.#mouseX0_dummy = 0;
			this.#mouseY0_dummy = 0;
			this.#mouseX0 = mxy.x;
			this.#mouseY0 = mxy.y;
		}

		this.#initialTouchDisance = 0;
		if (
			!this.#mapViewerProps.uaProps.isIE &&
			evt.type.indexOf("touch") >= 0 &&
			evt.touches.length > 1
		) {
			this.#zoomingTransitionFactor = 1; // スマホのときのピンチでのズーム
			this.#initialTouchDisance = this.#getTouchDistance(evt);
		}
		this.#difX = 0;
		this.#difY = 0;

		this.#hideTicker();

		this.#panning = true;

		//	var mouseGeoPos = this.#screen2Geo( this.#mouseX0 , this.#mouseY0 );
		//	console.log("mouse:"+mouseX0+","+mouseY0+" : geo["+mouseGeoPos.lat+","+mouseGeoPos.lng+"]");
		//	var that=this;
		if (shiftZoom == true) {
			if (typeof requestAnimationFrame == "function") {
				this.#timerID = requestAnimationFrame(this.#shiftZoomingAnim); // not use string param ( eval )
			} else {
				this.#timerID = setTimeout(
					this.#shiftZoomingAnim,
					this.#smoothZoomInterval,
				); // not use string param ( eval )
			}
		} else {
			if (typeof requestAnimationFrame == "function") {
				this.#timerID = requestAnimationFrame(this.#panningAnim); // not use string param ( eval )
			} else {
				this.#timerID = setTimeout(this.#panningAnim, this.#smoothZoomInterval); // not use string param ( eval )
			}
		}

		if (this.#mapViewerProps.uaProps.isIE) {
			return true; // IEの場合は、特にその効果がなくて、しかも上にあるFormのUIが触れなくなる？
		} else {
			return false; // これは画像上のドラッグ動作処理を抑制するらしい
		}
	}.bind(this);

	#timerID;

	endPan = function () {
		clearTimeout(this.#timerID);

		if (this.#panning) {
			this.#panning = false;
			if (this.#shiftZoomingBox && this.#shiftZoomingBox.style.display == "") {
				// 2022/10/31 add shiftZoomMode
				this.#shiftZoomingBox.style.display = "none";
				var sx = Math.min(this.#mouseX0 + this.#difX, this.#mouseX0);
				var sy = Math.max(this.#mouseY0 + this.#difY, this.#mouseY0);
				var gxy0 = this.#svgMapObj.screen2Geo(sx, sy);
				sx = Math.max(this.#mouseX0 + this.#difX, this.#mouseX0);
				sy = Math.min(this.#mouseY0 + this.#difY, this.#mouseY0);
				var gxy1 = this.#svgMapObj.screen2Geo(sx, sy);
				//console.log("do Shift Zoom :", gxy0, gxy1, " :: " , gxy0.lat, gxy0.lng, gxy1.lat - gxy0.lat , gxy1.lng - gxy0.lng);
				this.#checkLoadCompleted(true); // 読み込み中にズームパンしたときはテンポラリの画像を強制撤去する20130801
				this.#svgMapObj.setGeoViewPort(
					gxy0.lat,
					gxy0.lng,
					gxy1.lat - gxy0.lat,
					gxy1.lng - gxy0.lng,
				);
			} else if (this.#difX != 0 || this.#difY != 0) {
				// 変化分があるときはpan/zoom処理
				this.#mapViewerProps.mapCanvas.style.top = "0px";
				this.#mapViewerProps.mapCanvas.style.left = "0px";
				this.#setCssTransform(this.#mapViewerProps.mapCanvas, {
					a: 1,
					b: 0,
					c: 0,
					d: 1,
					e: 0,
					f: 0,
				});
				//			console.log("Call checkLoadCompl : endPan");
				this.#checkLoadCompleted(true); // 読み込み中にズームパンしたときはテンポラリの画像を強制撤去する20130801

				if (this.#zoomingTransitionFactor != -1) {
					// zoom
					var zoomCenterXY = null;
					if (this.#cursorCenterZooming) {
						if (this.#mouseX0_dummy) {
							zoomCenterXY = {
								x: this.#mouseX0_dummy,
								y: this.#mouseY0_dummy,
							};
						} else {
							zoomCenterXY = {
								x: this.#mouseX0,
								y: this.#mouseY0,
							};
						}
					}
					this.zoom(1 / this.#zoomingTransitionFactor, zoomCenterXY);
					this.#zoomingTransitionFactor = -1;
				} else {
					// pan
					this.pan(this.#difX, this.#difY); // 2025/12/25 関数化
					/**
					this.#tempolaryZoomPanImages(1, this.#difX, this.#difY);
					var s2c = this.#getRootSvg2Canvas();
					var rootViewBox = this.#svgMapObj.getRootViewBox();
					rootViewBox.x -= this.#difX / s2c.a;
					rootViewBox.y -= this.#difY / s2c.d;
					this.#svgMapObj.setRootViewBox(rootViewBox);
					this.#svgMapObj.refreshScreen();
					**/
				}
			} else {
				//			console.log("endPan,getObjectAtPoint",mouseX0, mouseY0);
				this.#getObjectAtPoint(this.#mouseX0, this.#mouseY0);
			}
		}
	}.bind(this);

	#difX;
	#difY;
	#prevX;
	#prevY;
	#zoomingTransitionFactor = -1; // ズームモードで>0 ズーム遷移中のズーム率
	wheelZooming = false; // 2023/6/22 whee処理中フラグ(EssentialUIから設定される)

	showPanning = function (evt) {
		// ここではズームパンアニメーション自体を行うことはしていない(difX,Y,zTFなどの変化をさせているだけ)
		//console.log("showPanning:",evt);
		if (this.#panning) {
			if (this.wheelZooming && evt.type != "wheelDummy") {
				return false;
			}
			//		console.log("button:",evt.button,event.button);

			if (!this.#mapViewerProps.uaProps.isIE) {
				if (evt.type.indexOf("touch") >= 0) {
					//				this.#printTouchEvt(evt);
					this.#difX = evt.touches[0].pageX - this.#mouseX0;
					this.#difY = evt.touches[0].pageY - this.#mouseY0;
					if (this.#zoomingTransitionFactor != -1) {
						this.#zoomingTransitionFactor =
							this.#getTouchDistance(evt) / this.#initialTouchDisance;
					}
				} else {
					//				console.log("showPanning evt:",evt.buttons);
					if (evt.buttons == 0) {
						// 2017/4/10
						this.endPan();
					} else {
						this.#difX = evt.clientX - this.#mouseX0;
						this.#difY = evt.clientY - this.#mouseY0;
					}
				}
			} else {
				//				console.log("showPanning event:",event.buttons);
				if (event.buttons == 0) {
					// 2017/4/10
					this.endPan();
				} else {
					this.#difX = event.clientX - this.#mouseX0;
					this.#difY = event.clientY - this.#mouseY0;
				}
			}

			if (this.#zoomingTransitionFactor > 0) {
				if (this.#initialTouchDisance == 0) {
					this.#zoomingTransitionFactor =
						Math.exp(
							this.#difY / (this.#mapViewerProps.mapCanvasSize.height / 2),
						) / Math.exp(0);
				}
				if (this.#zoomingTransitionFactor < 0.1) {
					this.#zoomingTransitionFactor = 0.1;
				}
			}

			// リミッターかけてみたけど意味ないかな・・
			if (
				Math.abs(this.#prevX - this.#difX) > 200 ||
				Math.abs(this.#prevY - this.#difY) > 200
			) {
				this.endPan();
			} else {
				this.#prevX = this.#difX;
				this.#prevY = this.#difY;
			}
		}
		return false;
	}.bind(this);

	#shiftZoomingBox;
	#shiftZoomingAnim = function () {
		if (this.#panning) {
			if (!this.#shiftZoomingBox) {
				this.#shiftZoomingBox = document.createElement("span");
				this.#shiftZoomingBox.id = "shiftZoomingBox";
				this.#shiftZoomingBox.style.position = "absolute";
				this.#shiftZoomingBox.style.opacity = "0.5";
				this.#shiftZoomingBox.style.backgroundColor = "gray";
				document
					.getElementById("centerSight")
					.insertAdjacentElement("afterend", this.#shiftZoomingBox);
			}

			this.#shiftZoomingBox.style.display = "";
			var x0 = Math.min(this.#mouseX0 + this.#difX, this.#mouseX0);
			var y0 = Math.min(this.#mouseY0 + this.#difY, this.#mouseY0);
			this.#shiftZoomingBox.style.top = y0 + "px";
			this.#shiftZoomingBox.style.left = x0 + "px";
			this.#shiftZoomingBox.style.width = Math.abs(this.#difX) + "px";
			this.#shiftZoomingBox.style.height = Math.abs(this.#difY) + "px";

			if (typeof requestAnimationFrame == "function") {
				this.#timerID = requestAnimationFrame(this.#shiftZoomingAnim);
			} else {
				this.#timerID = setTimeout(
					this.#shiftZoomingAnim,
					this.#smoothZoomInterval,
				);
			}
		}
	}.bind(this);

	#panningAnim = function () {
		// ズームパンアニメーションの実体はこちら requestAnimationFrame(setTimeout)で定期的に呼ばれる
		//	console.log("call panAnim    panningFlg:",panning);
		if (this.#panning) {
			if (this.#zoomingTransitionFactor != -1) {
				// ズーム
				var dx = 0,
					dy = 0;
				if (this.#cursorCenterZooming) {
					var canSize = this.#svgMapObj.getCanvasSize();
					var mx, my;
					if (this.#mouseX0_dummy) {
						mx = this.#mouseX0_dummy;
						my = this.#mouseY0_dummy;
					} else {
						mx = this.#mouseX0;
						my = this.#mouseY0;
					}
					var mcx = mx - canSize.x - canSize.width / 2;
					var mcy = my - canSize.y - canSize.height / 2;

					// console.log("panningAnim:",this.#mouseX0,this.#mouseY0,this.#zoomingTransitionFactor, " dmy:", this.#mouseX0_dummy, this.#mouseY0_dummy, " difXY:",this.#difX,this.#difY);
					dx = mcx * (1 - this.#zoomingTransitionFactor);
					dy = mcy * (1 - this.#zoomingTransitionFactor);
				}
				this.#shiftMap(dx, dy, this.#zoomingTransitionFactor);
			} else {
				// パン
				this.#shiftMap(this.#difX, this.#difY, this.#zoomingTransitionFactor);
			}
			//		console.log( difX , difY );
			//			var that = this;
			if (typeof requestAnimationFrame == "function") {
				//				this.#timerID = requestAnimationFrame( function(){that.#panningAnim()}.bind(this) );
				this.#timerID = requestAnimationFrame(this.#panningAnim);
			} else {
				//				this.#timerID = setTimeout( function(){this.#panningAnim()}.bind(this) , this.#smoothZoomInterval );
				this.#timerID = setTimeout(this.#panningAnim, this.#smoothZoomInterval);
			}
		}
		return false;
	}.bind(this);

	#setCssTransform(elem, tMat) {
		var tVal;
		if (this.#mapViewerProps.uaProps.verIE > 9) {
			tVal =
				"matrix(" +
				tMat.a +
				"," +
				tMat.b +
				"," +
				tMat.c +
				"," +
				tMat.d +
				"," +
				tMat.e +
				"," +
				tMat.f +
				")";
			//		tVal = "matrix3d(" + tMat.a + "," + tMat.b + ",0,0," + tMat.c + "," + tMat.d +",0,0,0,0,1,0," + tMat.e + "," + tMat.f + ",0,1)"; // 2019/12/24 Chrome(blinkのバグ？)でまともに動かなくなっているので・・・matrixに戻す
		} else {
			tVal =
				"matrix(" +
				tMat.a +
				"," +
				tMat.b +
				"," +
				tMat.c +
				"," +
				tMat.d +
				"," +
				tMat.e +
				"," +
				tMat.f +
				")";
		}
		//	var tVal = "scale(" + tMat.a + "," + tMat.d +")";
		elem.style.transform = tVal;
		elem.style.webkitTransform = tVal;
		elem.style.MozTransform = tVal;
		elem.style.msTransform = tVal;
		elem.style.OTransform = tVal;
	}

	#shiftMap(x, y, zoomF) {
		// zoomF ==-1の場合はパン
		if (this.#mapViewerProps.uaProps.verIE > 8) {
			var tr;
			if (zoomF != -1) {
				tr = { a: zoomF, b: 0, c: 0, d: zoomF, e: x, f: y };
				//			console.log( tr );
			} else {
				tr = { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
			}
			this.#setCssTransform(this.#mapViewerProps.mapCanvas, tr);
		} else {
			this.#mapViewerProps.mapCanvas.style.top = y + "px";
			this.#mapViewerProps.mapCanvas.style.left = x + "px";
		}
	}

	zoom = function (pow, centerXY) {
		// console.log("zoomFinal:",pow,centerXY);
		var rootViewBox = this.#svgMapObj.getRootViewBox();
		var svgRootCenterX = rootViewBox.x + 0.5 * rootViewBox.width;
		var svgRootCenterY = rootViewBox.y + 0.5 * rootViewBox.height;

		rootViewBox.width = rootViewBox.width * pow;
		rootViewBox.height = rootViewBox.height * pow;

		rootViewBox.x = svgRootCenterX - rootViewBox.width / 2;
		rootViewBox.y = svgRootCenterY - rootViewBox.height / 2;

		var dx = 0,
			dy = 0;
		if (centerXY) {
			var s2c = this.#getRootSvg2Canvas();
			var canSize = this.#svgMapObj.getCanvasSize();
			var mcx = centerXY.x - canSize.x - canSize.width / 2; // 伸縮の中心座標
			var mcy = centerXY.y - canSize.y - canSize.height / 2;
			dx = mcx * (1 - pow); // 拡大後の中心座標からのシフト量(画面座標)
			dy = mcy * (1 - pow);
			rootViewBox.x += dx / (s2c.a * pow); // 同rootSVG座標
			rootViewBox.y += dy / (s2c.d * pow);
		}

		this.#svgMapObj.setRootViewBox(rootViewBox);

		this.#tempolaryZoomPanImages(1 / pow, -dx / pow, -dy / pow);
		this.#svgMapObj.refreshScreen();

		//getLayers();
	}.bind(this);

	pan = function (dx, dy) {
		// pan
		this.#tempolaryZoomPanImages(1, dx, dy);
		var s2c = this.#getRootSvg2Canvas();
		var rootViewBox = this.#svgMapObj.getRootViewBox();
		rootViewBox.x -= dx / s2c.a;
		rootViewBox.y -= dy / s2c.d;
		this.#svgMapObj.setRootViewBox(rootViewBox);
		this.#svgMapObj.refreshScreen();
	};

	#smoothZoomTransitionTime = 300;

	#additionalZoom = 0;

	#smoothZoomInterval = 20;
	#smoothZooming = false; // false|"zoom"|"pan"

	//ズームイン／アウト時の遷移時間
	setSmoothZoomTransitionTime = function (zoomTransitionTime) {
		if (Number(zoomTransitionTime) > 0) {
			this.#smoothZoomTransitionTime = Number(zoomTransitionTime);
		} else {
			this.#smoothZoomTransitionTime = 300;
		}
	}.bind(this);

	//ズームイン／アウト後のタイル読み込み開始タイマー(ms)
	setSmoothZoomInterval = function (zoomInterval) {
		if (Number(zoomInterval) > 0) {
			this.#smoothZoomInterval = Number(zoomInterval);
		} else {
			this.#smoothZoomInterval = 20;
		}
	}.bind(this);

	#smoothZoom(zoomFactor, startDate, doFinish, startZoom) {
		// 2013.9.4 外部呼び出し時は、zoomFactorだけでOK
		// 2025/12/25 パン機能も付与（zoomFactorが[x,y]の二次元配列になっているときに発動）
		// console.log("called smoothZoom:",zoomFactor,startDate,doFinish,startZoom);

		let zoomPanMode;
		if (Array.isArray(zoomFactor)) {
			// パンモード(無理やりｗ)
			zoomPanMode = "pan";
			if (!startZoom) {
				startZoom = [0, 0];
			}
		} else {
			zoomPanMode = "zoom";
			if (!startZoom) {
				startZoom = 1;
			}
		}
		if (!startDate) {
			if (this.#zoomingTransitionFactor != -1 || this.#smoothZooming) {
				if (this.#smoothZooming && this.#smoothZooming != zoomPanMode) {
					// 異種モードの連呼は無視する
					console.warn(
						"Now performing different type of smooth zoom/pan action. Exit.",
					);
					return;
				}
				// まだズーム中の場合、一つだけ追加する（関数連呼）
				this.#additionalZoom = zoomFactor;
				// console.log( "more Zoom", this.#additionalZoom);
				return;
			}
			this.#smoothZooming = zoomPanMode;
			startDate = new Date();
		}

		var elapsedTime = new Date() - startDate;

		var that = this;
		if (!doFinish) {
			//		console.log( "time: elapsed",elapsedTime , "  limit:" ,smoothZoomTime);
			if (elapsedTime < this.#smoothZoomTransitionTime) {
				if (zoomPanMode == "pan") {
					this.#zoomingTransitionFactor = -1;
					var etr = elapsedTime / this.#smoothZoomTransitionTime;
					this.#difX = startZoom[0] + (zoomFactor[0] - startZoom[0]) * etr;
					this.#difY = startZoom[1] + (zoomFactor[1] - startZoom[1]) * etr;
				} else {
					this.#difX = 0;
					this.#difY = 0;
					this.#zoomingTransitionFactor =
						1 / startZoom +
						(1 / zoomFactor - 1 / startZoom) *
							(elapsedTime / this.#smoothZoomTransitionTime);
				}

				this.#shiftMap(this.#difX, this.#difY, this.#zoomingTransitionFactor);
				if (typeof requestAnimationFrame == "function") {
					requestAnimationFrame(
						function () {
							that.#smoothZoom(zoomFactor, startDate, false, startZoom);
						}.bind(this),
					);
				} else {
					setTimeout(
						function (zoomFactor, startDate, doFinish, startZoom) {
							this.#smoothZoom(zoomFactor, startDate, doFinish, startZoom);
						}.bind(this),
						this.#smoothZoomInterval,
						zoomFactor,
						startDate,
						false,
						startZoom,
					);
				}
			} else {
				//			console.log("to end zoom", 1/ zoomFactor);
				if (zoomPanMode == "pan") {
					this.#shiftMap(zoomFactor[0], zoomFactor[1], -1);
				} else {
					this.#shiftMap(0, 0, 1 / zoomFactor);
				}
				if (typeof requestAnimationFrame == "function") {
					requestAnimationFrame(
						function () {
							that.#smoothZoom(zoomFactor, startDate, true, startZoom);
						}.bind(this),
					);
				} else {
					setTimeout(
						function (zoomFactor, startDate, doFinish, startZoom) {
							this.#smoothZoom(zoomFactor, startDate, doFinish, startZoom);
						}.bind(this),
						this.#smoothZoomInterval,
						zoomFactor,
						startDate,
						true,
						startZoom,
					); //フィニッシュ処理へ
				}
			}
		} else {
			// フィニッシュ処理
			if (this.#additionalZoom != 0) {
				// 関数連打ケースはフィニッシュ延期
				//			console.log("do additional Zoom2: ", zoomFactor * additionalZoom, " zf:",zoomFactor," az:",additionalZoom);
				let azf;
				if (zoomPanMode == "pan") {
					// スクロール 2025/12/26
					azf = [
						zoomFactor[0] + this.#additionalZoom[0],
						zoomFactor[1] + this.#additionalZoom[1],
					];
				} else {
					azf = zoomFactor * this.#additionalZoom;
				}
				if (typeof requestAnimationFrame == "function") {
					requestAnimationFrame(function () {
						that.#smoothZoom(azf, new Date(), false, zoomFactor);
					});
				} else {
					setTimeout(
						function (zoomFactor, startDate, doFinish, startZoom) {
							this.#smoothZoom(zoomFactor, startDate, doFinish, startZoom);
						}.bind(this),
						this.#smoothZoomInterval,
						azf,
						new Date(),
						false,
						zoomFactor,
					);
				}
				this.#additionalZoom = 0;
			} else {
				//			console.log("Finish zoom");
				this.#mapViewerProps.mapCanvas.style.top = "0px";
				this.#mapViewerProps.mapCanvas.style.left = "0px";
				this.#setCssTransform(this.#mapViewerProps.mapCanvas, {
					a: 1,
					b: 0,
					c: 0,
					d: 1,
					e: 0,
					f: 0,
				});
				this.#zoomingTransitionFactor = -1;
				this.#smoothZooming = false;
				this.#checkLoadCompleted(true); // 読み込み中にズームパンしたときはテンポラリの画像を強制撤去する20130801
				if (zoomPanMode == "pan") {
					this.pan(zoomFactor[0], zoomFactor[1]);
				} else {
					this.zoom(zoomFactor);
				}
			}
		}
	}

	// ズームパン操作を完了した後、dynamicLoadを掛ける前にzoom/pan後のイメージを一瞬だけ表示しちらつきを抑止する機能
	// このルーチンが、canvasのことを考慮していないので画像が乱れていた
	// textへの処理が抜けていたのを追加 2025/09/29
	#tempolaryZoomPanImages(zoomFactor, sftX, sftY) {
		// zoom後のpanということで考えてください。
		//		var mapElements = this.#mapViewerProps.mapCanvas.getElementsByTagName("img");
		var mapElements =
			this.#mapViewerProps.mapCanvas.querySelectorAll("img, span"); // 2025/09/29
		var mapCanvasSize = this.#mapViewerProps.mapCanvasSize;

		if (this.#mapViewerProps.uaProps.IE) {
			// 下の再利用処理はIE11でかなりのボトルネック化している・・・
			for (var i = mapElements.length - 1; i >= 0; i--) {
				mapElements.item(i).parentNode.removeChild(mapElements.item(i)); // 何の工夫もせず単に全部消す。これが一番早い感じで表示もまずまず・・・
			}
		} else {
			// リフロー多発を抑制 2023/4/3
			// https://ui.appleple.blog/entry-109.html
			var xds = [];
			var yds = [];
			for (var i = mapElements.length - 1; i >= 0; i--) {
				const el = mapElements.item(i);
				var il = Number(el.style.left.replace("px", ""));
				var it = Number(el.style.top.replace("px", ""));
				var iw = Number(el.width);
				var ih = Number(el.height);
				xds[i] = this.#getIntValue(
					(il - mapCanvasSize.width * 0.5) * zoomFactor +
						mapCanvasSize.width * 0.5 +
						sftX,
					iw * zoomFactor,
				);
				yds[i] = this.#getIntValue(
					(it - mapCanvasSize.height * 0.5) * zoomFactor +
						mapCanvasSize.height * 0.5 +
						sftY,
					ih * zoomFactor,
				);
			}
			for (var i = mapElements.length - 1; i >= 0; i--) {
				const el = mapElements.item(i);
				var xd = xds[i];
				var yd = yds[i];
				var imgRect = new Object();
				imgRect.x = xd.p0;
				imgRect.y = yd.p0;
				imgRect.width = xd.span;
				imgRect.height = yd.span;

				// Simply rewrite image position
				el.style.left = xd.p0 + "px";
				el.style.top = yd.p0 + "px";

				if (el.tagName === "IMG") {
					// 2025/09/29
					el.width = xd.span;
					el.height = yd.span;
					el.style.width = xd.span + "px";
					el.style.height = yd.span + "px";
				}
			}
		}
		// canvas用の処理
		mapElements = this.#mapViewerProps.mapCanvas.getElementsByTagName("canvas");
		for (var i = mapElements.length - 1; i >= 0; i--) {
			const el = mapElements.item(i);
			var il = 0; // 今後 canvasのサイズをコンテンツ依存にする場合には注意してね
			var it = 0;
			var iw = Number(el.width);
			var ih = Number(el.height);

			var xd = this.#getIntValue(
				(il - mapCanvasSize.width * 0.5) * zoomFactor +
					mapCanvasSize.width * 0.5 +
					sftX,
				iw * zoomFactor,
			);
			var yd = this.#getIntValue(
				(it - mapCanvasSize.height * 0.5) * zoomFactor +
					mapCanvasSize.height * 0.5 +
					sftY,
				ih * zoomFactor,
			);
			el.style.left = xd.p0 + "px";
			el.style.top = yd.p0 + "px";

			el.width = xd.span;
			el.height = yd.span;
		}
	}

	#zoomRatio = 1.7320508;
	/**
	 *
	 * @param {Number} ratio ズーム倍率
	 */
	setZoomRatio(ratio) {
		this.#zoomRatio = ratio;
	}
	zoomup = function (ratio) {
		//	zoom( 1.0/zoomRatio );
		if (!ratio) {
			ratio = this.#zoomRatio;
		}
		this.#smoothZoom(1.0 / ratio);
	}.bind(this);

	zoomdown = function (ratio) {
		//	zoom( zoomRatio );
		if (!ratio) {
			ratio = this.#zoomRatio;
		}
		this.#smoothZoom(ratio);
	}.bind(this);

	panMap = function (x, y, options) {
		// 指定された量だけ地図のパンをスムースに行う(added 2025/12/26)
		if (
			options?.unit == "%" ||
			options?.unit == "percent" ||
			options?.unit == "ratio"
		) {
			var percent = 1 / 100;
			if (options.unit == "ratio") {
				percent = 1;
			}
			const canvasSize = this.#svgMapObj.getCanvasSize();
			x = -canvasSize.width * x * percent;
			y = -canvasSize.height * y * percent;
		} else if (options?.unit == "canvas") {
			const canvasSize = this.#svgMapObj.getCanvasSize();
			x = canvasSize.width / 2 - x;
			y = canvasSize.height / 2 - y;
		} else {
			x = -x;
			y = -y;
		}
		this.#smoothZoom([Math.floor(x), Math.floor(y)]);
	};

	setCursorCenterZooming(enable) {
		if (enable == true) {
			this.#cursorCenterZooming = true;
		} else if (enable == false) {
			this.#cursorCenterZooming = false;
		}
		return this.#cursorCenterZooming;
	}
}

export { ZoomPanManager };
