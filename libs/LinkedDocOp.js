import { SvgMapElementType } from "./SvgMapElementType.js";

class LinkedDocOp {
	#svgMapObject;
	#svgImagesProps;
	#svgImages;

	constructor(svgMapObject) {
		this.#svgMapObject = svgMapObject;
		this.#svgImagesProps = svgMapObject.getSvgImagesProps();
		this.#svgImages = svgMapObject.getSvgImages();
	}

	// linkedDocOp: 子文書に対して、同じ処理(func)を再帰実行する関数 (2013/12/25)
	// 引数：
	//   func    : 再帰実行をさせたいユーザ関数
	//   docHash : 再帰実行のルートになる文書のハッシュ
	//   param?  : ユーザ関数に渡したいパラメータ(max 5個・・)
	// linledDocOpに渡すユーザ関数は、以下の仕様を持っていなければならない
	// 第一引数：処理対象SVG文書
	// 第二引数：その文書プロパティ群
	// 第三引数以降：任意引数(max5個)
	// issue 任意引数の数を可変長にしたいね(現在は最大５個にしてる)（要勉強）
	/**
	 *
	 * @function 子文書に対して、同じ処理(func)を再帰実行する関数
	 *
	 * @param {Function} func
	 * @param {String} docHash svgDocId?
	 * @param {Object} param1
	 * @param {Object} param2
	 * @param {Object} param3
	 * @param {Object} param4
	 * @param {Object} param5
	 */
	linkedDocOp(func, docHash, param1, param2, param3, param4, param5) {
		var targetDoc = this.#svgImages[docHash];
		var targetDocProps = this.#svgImagesProps[docHash];
		if (targetDoc) {
			func(targetDoc, targetDocProps, param1, param2, param3, param4, param5);
			// child Docs再帰処理
			var childDocs = targetDocProps.childImages;
			for (var i in childDocs) {
				if (
					childDocs[i] == SvgMapElementType.CLICKABLE ||
					childDocs[i] == SvgMapElementType.EXIST
				) {
					// existなのに実存しない？(unloadしているのにexistのままだな)
					this.linkedDocOp(func, i, param1, param2, param3, param4, param5);
				}
			}
		}
	}

	// linkedDocOpの直系の子供のみ適用版(自身も適用しない)
	childDocOp(func, docHash, param1, param2, param3, param4, param5) {
		var targetDoc = this.#svgImages[docHash];
		var targetDocProps = this.#svgImagesProps[docHash];

		if (targetDoc) {
			//		func(targetDoc , targetDocProps , param1, param2 , param3 , param4 , param5 );

			// child Docs再帰処理
			var childDocs = targetDocProps.childImages;
			for (var i in childDocs) {
				if (
					childDocs[i] == SvgMapElementType.CLICKABLE ||
					childDocs[i] == SvgMapElementType.EXIST
				) {
					// existなのに実存しない？(unloadしているのにexistのままだな)

					var targetChildDoc = this.#svgImages[i];
					var targetChildDocProps = this.#svgImagesProps[i];

					func(
						targetChildDoc,
						targetChildDocProps,
						param1,
						param2,
						param3,
						param4,
						param5
					);
				}
			}
		}
	}

	// =================================================================
	// タイリングされ複数文書に分割されたデータ全体に対して同じ処理を与えるルーチンのサンプルです。(2013.12.24)
	contColorSet() {
		var param = Number(document.getElementById("contValue").value);
		if (param) {
			this.contColorSetContinuous(param); // サンプルその２のほうを使っています
			//		contColorSetOnce( param ); // こちらを選ぶとサンプルその１を使います。
		}
	}

	// サンプルその１
	// 伸縮スクロールしても設定した処理が波及しない版(比較的単純)
	// 指定したmごとに、等高線の色を赤＆太くする
	contColorSetOnce(param) {
		// コンターのレイヤー(のルート文書のハッシュ)を取り出す
		var targetHash = this.#svgMapObject.getHashByDocPath("vectorContainer.svg");

		// その文書の子孫文書(タイル)全部に対して、指定した文書処理(ここではcontourMarker)を実施する
		// linkedDocOpがそのためのユーティリティ関数です
		this.linkedDocOp(this.contourMarker, targetHash, param);
		this.#svgMapObject.refreshScreen(); // 再描画を実行(dynamicLoad("root",mapCanvas)です）
	}

	// サンプルその２
	// 伸縮スクロールしても設定した処理が波及する版(イベントリスナが絡んで結構複雑ですよ)
	// 指定したmごとに、等高線の色を赤＆太くする
	// ズームパンが実行されると、"zoomPanMap" イベントが発行される。それをキャプチャして伸縮スクロール時に処理を実行させる。
	contColorSetContinuous(interval) {
		var csMode;
		if (document.getElementById("contButton").innerHTML == "contourSearch[m]") {
			document.getElementById("contButton").innerHTML = "disableSearch";
			document.getElementById("contValue").disabled = "true";
			csMode = false;
		} else {
			document.getElementById("contButton").innerHTML = "contourSearch[m]";
			document.getElementById("contValue").disabled = "";
			csMode = true;
		}

		if (csMode) {
			document.removeEventListener("zoomPanMap", this.eDom, false);
			csMode = false;
			this.eDom = this.editDOM(interval, true);
			this.eDom();
		} else {
			this.eDom = this.editDOM(Number(interval), false);

			// 最初の処理実施(これはズームパンと関係なく、すぐに処理を反映させるため)
			this.eDom();
			// ズームパン処理が完了したところで、指定処理を実施し、再描画を実施する。
			document.addEventListener("zoomPanMap", this.eDom, false);
			csMode = true;
		}
	}

	eDom; // editDOMクロージャ用のグローバル変数
	editDOM(interval, clear) {
		// DOM編集処理の内容(関数化すると良い) クロージャになります！
		return function () {
			// コンターのレイヤー(のルート文書のハッシュ)を取り出す
			var targetHash = this.#svgMapObject.getHashByDocPath(
				"vectorContainer.svg"
			);
			// その文書の子孫文書(タイル)全部に対して、指定した文書処理(ここではcontourMarker)を実施する
			// linkedDocOpがそのためのユーティリティ関数です
			this.linkedDocOp(contourMarker, targetHash, interval, clear);
			this.#svgMapObject.refreshScreen();
		};
	}

	// linkedDocOpに渡す関数のサンプル（１，２共用です）：第一引数に処理対象SVG文書、第二引数にその文書プロパティ群（ここまでが固定）、第三引数以降に任意引数(複数)が与えられる
	contourMarker(layerDoc, layerProps, interval, clear) {
		// すべてのPathを選択して
		var contourPaths = layerDoc.getElementsByTagName("path");

		for (var i = 0; i < contourPaths.length; i++) {
			var onePath = contourPaths[i];
			// 標高を検索して
			var alt = Number(onePath.getAttribute("lm:標高"));
			// 標高/intervalの剰余が0だったら色と太さを変える(ただしclearフラグが無いとき)
			if (alt && alt % interval == 0) {
				if (!clear) {
					onePath.setAttribute("stroke", "red");
					onePath.setAttribute("stroke-width", "2");
				} else {
					// clearフラグがあるときは設定を解除する
					onePath.removeAttribute("stroke");
					onePath.removeAttribute("stroke-width");
				}
			}
		}
	}
}

export { LinkedDocOp };
