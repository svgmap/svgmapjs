// Description:
// LayerManager Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { UtilFuncs } from "./UtilFuncs.js";

class LayerManager {
	constructor(svgImagesProps, svgImages, loadingImgs, refreshScreen) {
		this.#svgImagesProps = svgImagesProps;
		this.#svgImages = svgImages;
		this.#loadingImgs = loadingImgs;
		this.#refreshScreen = refreshScreen;
	}

	#svgImagesProps;
	#svgImages;
	#loadingImgs;
	#refreshScreen;

	// レイヤーのID,title,番号,href(URI)のいずれかで、ルートコンテナSVGDOMにおけるレイヤーの(svg:animation or svg:iframe)要素を取得する
	// getLayersと似ているが、getLayersのほうは任意のsvg文書(オプションなしではroot container)に対して、内包されるレイヤーのリストを返却。こちらはrootコンテナに対して検索キーに基づいてレイヤーを返却する
	/**
	 *
	 * @param {String} layerID_Numb_Title
	 * @returns
	 */
	getLayer(layerID_Numb_Title) {
		var layer = null;
		var isSVG2 = this.#svgImagesProps["root"].isSVG2;
		if (isNaN(layerID_Numb_Title)) {
			// 文字列(ハッシュ)の場合
			layer = UtilFuncs.getElementByImgIdNoNS(
				this.#svgImages["root"],
				layerID_Numb_Title
			); // ID(レイヤーのハッシュキー)で検索
			if (!layer) {
				// タイトルで検索
				var layers = this.getLayers();
				for (var i = 0; i < layers.length; i++) {
					if (layers[i].getAttribute("title") == layerID_Numb_Title) {
						layer = layers[i];
						break;
					} else if (
						isSVG2 &&
						layers[i].getAttribute("src") == layerID_Numb_Title
					) {
						layer = layers[i];
						break;
					} else if (
						layers[i].getAttribute("xlink:href") == layerID_Numb_Title
					) {
						layer = layers[i];
						break;
					}
				}
			}
		} else {
			// 数字（レイヤ番号）の場合
			if (isSVG2) {
				layer =
					this.#svgImages["root"].getElementsByTagName("iframe")[
						layerID_Numb_Title
					];
			} else {
				layer =
					this.#svgImages["root"].getElementsByTagName("animation")[
						layerID_Numb_Title
					];
			}
		}
		return layer;
	}

	// ルートコンテナにおける"レイヤ"概念のレイヤidを検索する
	// 検索に用いることができるのは、getLayerと同じtitle,url,もしくはルートレイヤの要素
	getLayerId(layerKey) {
		var ans = null;
		if (layerKey.getAttribute) {
			//		ans = layerElement.getAttribute("iid"); // これバグ？？
			ans = layerKey.getAttribute("iid");
		} else {
			var layer = this.getLayer(layerKey);
			if (layer) {
				ans = layer.getAttribute("iid");
			}
		}
		return ans;
	}

	isEditingLayer = function (layer) {
		// パラメータがある場合
		// 指定したレイヤーが編集中のレイヤーかどうか
		// input:ルートコンテナのレイヤーに該当する要素
		// パラメータがない場合
		// 編集中のレイヤーがある場合はそのレイヤーのsvg:anim or svg:iframe要素を返却する

		if (layer) {
			var layerId = layer.getAttribute("iid");
			if (
				this.#svgImagesProps[layerId] &&
				this.#svgImagesProps[layerId].editing
			) {
				return true;
			} else {
				return false;
			}
		} else {
			for (var key in this.#svgImagesProps) {
				if (this.#svgImagesProps[key].editing == true) {
					var rootdoc = this.#svgImages["root"].documentElement;
					return UtilFuncs.getElementByImgIdNoNS(this.#svgImages["root"], key);
				}
			}
			return null;
		}
	}.bind(this);

	/**
	isClickableLayer( layerId ){
		var ans = false;
		return ( ans );
	}
	
	// レイヤーのID,title,番号のいずれかでレイヤーの表示状態を変化する (この関数は使われていない)
	switchLayer( layerID_Numb_Title ,  visibility ){
		var layer = this.getLayer( layerID_Numb_Title );
		if ( layer ){
			if ( visibility == true || visibility == "visible"){
				layer.setAttribute("visibility" , "visible");
			} else {
				layer.setAttribute("visibility" , "hidden");
			}
			this.#refreshScreen();
			return ( true );
		} else {
			return ( false );
		}
	}
	
	**/

	isEditableLayer(layer) {
		// ルートSVG文書の各要素が編集可能かどうかを返却する
		// もしくは、SVGLayerのid(hash key)で、そのidのレイヤーが編集可能かどうかを返却する
		if (typeof layer == "string") {
			// hash key
			var layers = this.#getEditableLayers();
			for (var i = 0; i < layers.length; i++) {
				if (layers[i].getAttribute("iid") == layer) {
					return true;
				}
			}
			return false;
		} else {
			// svg element
			if (
				layer.getAttribute("class") &&
				layer.getAttribute("class").indexOf("editable") >= 0
			) {
				return true;
			} else {
				return false;
			}
		}
	}

	#getEditableLayers() {
		// 編集可能レイヤーの全リストを構築する。
		var eLayers = new Array();
		var layers = this.getLayers();
		for (var i = 0; i < layers.length; i++) {
			if (this.isEditableLayer(layers[i])) {
				eLayers.push(layers[i]);
				//			console.log("editable:",layers[i]);
			}
		}
		return eLayers;
	}

	#removeLayerCatName(layerClass, kwd1, kwd2, kwd3, kwd4, kwd5) {
		if (kwd1 && layerClass.indexOf(kwd1) != -1) {
			layerClass.splice(layerClass.indexOf(kwd1), 1);
		}
		if (kwd2 && layerClass.indexOf(kwd2) != -1) {
			layerClass.splice(layerClass.indexOf(kwd2), 1);
		}
		if (kwd3 && layerClass.indexOf(kwd3) != -1) {
			layerClass.splice(layerClass.indexOf(kwd3), 1);
		}
		if (kwd4 && layerClass.indexOf(kwd4) != -1) {
			layerClass.splice(layerClass.indexOf(kwd4), 1);
		}
		if (kwd5 && layerClass.indexOf(kwd5) != -1) {
			layerClass.splice(layerClass.indexOf(kwd5), 1);
		}
		return layerClass;
	}

	/**
	 * 指定されたレイヤーIDに対応するSWレイヤーを取得します。
	 *
	 * @param {string} cat レイヤーに付与されたクラス名
	 * @returns {Array} 引数のクラス名が設定されたレイヤーリスト
	 */
	getSwLayers(cat) {
		// swLayers[クラス名]に、クラス名ごとのレイヤー(のSVG要素)の全リストを構築する
		// catがある場合は、catの名称を持つもののリストのみを構築する
		//
		// 2016.10.6 switch , batchは、本来グループに対して与えられる特性なのだが、どこかのレイヤーの中で宣言されていて他では宣言されていないるような場合、おかしなことが起きる。それを防ぐため、どこか一つだけで宣言されていればその特性がグループ全体に与えられたように返却することにした。アーキテクチャがまずいと思う・・・
		var swLayers = new Array();
		var hasCatClasses = new Array();
		var layers = this.getLayers();
		for (var i = 0; i < layers.length; i++) {
			if (layers[i].getAttribute("class")) {
				var layerClass = layers[i].getAttribute("class").split(" ");

				var hasCat;
				if (cat) {
					if (layerClass.indexOf(cat) == -1) {
						hasCat = false;
					} else {
						hasCat = true;
					}
				} else {
					hasCat = true;
				}

				layerClass = this.#removeLayerCatName(
					layerClass,
					"switch",
					"batch",
					"editable",
					"clickable"
				);

				for (var j = 0; j < layerClass.length; j++) {
					if (!swLayers[layerClass[j]]) {
						swLayers[layerClass[j]] = new Array();
					}

					if (hasCat) {
						hasCatClasses[layerClass[j]] = true;
					}

					swLayers[layerClass[j]].push(layers[i]);
				}
			}
		}

		if (cat) {
			for (var i in swLayers) {
				if (!hasCatClasses[i]) {
					delete swLayers[i];
				}
			}
		}

		return swLayers;
	}

	#checkLayerSwitch(selectedLayer) {
		// 選択したレイヤーの表示非表示が切り替えられるかどうか、切り替えられるとしてその代わりに選択を外すレイヤーあればそのリスト(array)を返す。(なければ単にtrue)
		// 2016.10.6 getSwLayers()と同じ改修 どこかのレイヤーでそのグループにswitchがつけられていた時にswitchとして動かす
		var selectedLayerClass;
		if (selectedLayer.getAttribute("class")) {
			selectedLayerClass = selectedLayer.getAttribute("class").split(" ");

			selectedLayerClass = this.#removeLayerCatName(
				selectedLayerClass,
				"batch",
				"editable",
				"clickable",
				"switch"
			);
		} else {
			// classが設定されていないレイヤーはＯＫを返す
			return true;
		}

		var swLayers = this.getSwLayers("switch"); // switch 属性のレイヤーグループ名を検索
		var layerIsSwitch = false;
		for (var i in swLayers) {
			if (selectedLayerClass.indexOf(i) != -1) {
				layerIsSwitch = true;
				break;
			}
		}

		if (layerIsSwitch) {
			if (
				selectedLayer.getAttribute("visibility") == "hidden" ||
				selectedLayer.getAttribute("display") == "none"
			) {
				// 表示されていないものを表示させる

				// 代わりに非表示にすべきレイヤーのリストを生成する
				// スイッチ型レイヤーリストを得る
				var swLayers = this.getSwLayers(); // これは多分不必要・・2016.10
				var invisibleLayers = new Array();

				for (var i = 0; i < selectedLayerClass.length; i++) {
					var sl = swLayers[selectedLayerClass[i]];
					for (var j = 0; j < sl.length; j++) {
						if (sl[j] != selectedLayer) {
							invisibleLayers.push(sl[j]);
						}
					}
				}

				swLayers = null;

				return invisibleLayers;
			} else {
				// スイッチ型の場合、表示されているものを選ぶことはできないということにして、ＮＧを返す
				return false;
			}
		} else {
			// スイッチ型レイヤーでないときもＯＫを返す
			return true;
		}
	}

	// ルートのコンテナにある、animation|iframeを"Layers"と定義
	// オプションなしの場合、ルートSVGコンテナのレイヤーに該当する要素をリストアップし、返却する
	// オプションアリの場合、そのidを持つコンテナのレイヤー該当要素群を返却
	getLayers(id) {
		if (!id) {
			id = "root";
		}

		var layers;
		if (this.#svgImagesProps[id].isSVG2) {
			// 文書の形式を判別してからレイヤーの判断を実施
			layers = this.#svgImages[id].getElementsByTagName("iframe");
		} else {
			layers = this.#svgImages[id].getElementsByTagName("animation");
		}

		return layers;
	}

	// ルートコンテナの(animetion||iframeで構成される)レイヤー情報を取得する。
	// Arrayが返却、並び順はsvgのルートコンテナと同じ（最初のレイヤーが一番下。selectメニュー創るときはひっくり返して使うこと）
	// 名称、表示非常時状態、レイヤーグループ、グループのフィーチャ(バッチ||スイッチ||ふつう)、編集可、編集中、対応SVGドキュメント、っ個別ユーザインターフェース、個別凡例
	//
	// Supported Props.
	// id : id for svgImages, svgImagesProps, html-dom(id), svg-dom(iid)
	// url : url for svg docs
	// href : href for svg docs
	// title : layer name on title attr.
	// visible : currently visible?
	// editable : it is markked as editable layer
	// editing : currently editing
	// groupName : belonging group name ( assigned by class prop )
	// groupFeature (switch||batch||) : group's special feature, switch:choose one,  batch:visible all/invisible all opt ( assigned by class prop )
	getRootLayersProps() {
		var switchGroups = this.getSwLayers("switch");
		var batchGroups = this.getSwLayers("batch");

		var layers = this.getLayers();
		var layersProps = new Array();
		for (var i = 0; i < layers.length; i++) {
			layersProps[i] = new Object();
			layersProps[i].id = layers[i].getAttribute("iid");
			layersProps[i].number = i;
			if (
				this.#svgImagesProps[layersProps[i].id] &&
				this.#svgImages[layersProps[i].id] &&
				!this.#loadingImgs[layersProps[i].id]
			) {
				layersProps[i].hasDocument = true;
			} else {
				layersProps[i].hasDocument = false;
			}
			layersProps[i].href = layers[i].getAttribute("xlink:href"); // (docPathがないので・・)これは.urlとは違う(ISSUE 2016.10.26)
			layersProps[i].svgImageProps = this.#svgImagesProps[layersProps[i].id];

			layersProps[i].title = this.getLayerName(layers[i]);

			var visible = true;
			if (
				layers[i].getAttribute("visibility") == "hidden" ||
				layers[i].getAttribute("display") == "none"
			) {
				visible = false;
			}
			layersProps[i].visible = visible;

			layersProps[i].editable = this.isEditableLayer(layers[i]);
			layersProps[i].editing = false;
			if (layersProps[i].editable) {
				layersProps[i].editing = this.isEditingLayer(layers[i]);
			}
			var layerGroupName = "";
			if (layers[i].getAttribute("class")) {
				var layerGroupNames = this.#removeLayerCatName(
					layers[i].getAttribute("class").split(" "),
					"switch",
					"batch",
					"editable",
					"clickable"
				);
				if (layerGroupNames.length > 0) {
					layerGroupName = layerGroupNames[0];
				}
			}
			// グループ名を最初の一個だけ採っている・・・これも問題
			layersProps[i].groupName = layerGroupName;

			// switch || batch || null
			// switchのほうがbatchより優先されるようにするかな・・・　これも問題
			layersProps[i].groupFeature = "";
			if (layerGroupName) {
				if (switchGroups[layerGroupName]) {
					layersProps[i].groupFeature = "switch";
				} else if (batchGroups[layerGroupName]) {
					layersProps[i].groupFeature = "batch";
				}
			}
		}
		// ID引き用
		for (var i = 0; i < layersProps.length; i++) {
			layersProps[layersProps[i].id] = layersProps[i];
		}
		return layersProps;
	}

	// ルートコンテナの(animetion||iframeで構成される)レイヤー情報を設定する。
	// レイヤー番号(root svg container内での順番)、レイヤーID(svg文書のiid = htmlのid = selectのvalue)、タイトル名(不確実-同じ名前があるかもしれない。最初に当たったものを選択)
	// 変化があるとtrueが返却される。ない・もしくは不合理の場合はfalseが返却される
	// この時classで設定されているレイヤーグループの特性(switch)に基づいた制御がかかる
	setRootLayersPropsPostprocessed = false; // add 2021/10/14 updateLayerListUIint();必須し忘れ問題への対策フラグ
	/**
	 *
	 * @param {String} layerID_Numb_Title
	 * @param {*} visible //Booleanなのかvisible/hiddenというStringが入るのかわからない
	 * @param {Boolean} editing
	 * @param {String} hashOption //queryStringとしてURLに付与されるようです。
	 * @param {Boolean} removeLayer //子要素を削除するオプション
	 * @returns
	 */
	setRootLayersProps(
		layerID_Numb_Title,
		visible,
		editing,
		hashOption,
		removeLayer
	) {
		this.setRootLayersPropsPostprocessed = false;
		var layer = this.getLayer(layerID_Numb_Title);
		if (!layer) {
			return false;
		}
		if (removeLayer) {
			// 2021/2/4 レイヤを完全消去するオプション
			layer.parentElement.removeChild(layer);
		}
		var layerId = layer.getAttribute("iid");
		var rootLayersProps = this.getRootLayersProps();
		var lp = rootLayersProps[layerId];

		if (visible == null) {
			visible = lp.visible;
		}
		if (editing == null) {
			editing = lp.editing;
		}

		// ありえないパターンを除外
		if (!hashOption && lp.visible == visible && lp.editing == editing) {
			// 変化なし ただしhashOptionある場合を除く
			return false;
		} else if (!lp.editable && editing) {
			// 編集不可能で編集中はありえない :: editableは無くても破たんしないと思う・・
			return false;
		} else if (!visible && editing) {
			// 非表示で編集中はありえない
			return false;
		}

		if (lp.groupFeature == "switch" && visible && !lp.visible) {
			// switchグループは一つしかvisibleにできないのでグループ内の他のレイヤーがvisibleならinvisibleにする
			var ans = this.#checkLayerSwitch(layer);
			if (ans instanceof Boolean && ans == false) {
				// なにもしない
			} else {
				if (ans instanceof Array) {
					for (var i = 0; i < ans.length; i++) {
						ans[i].setAttribute("visibility", "hidden");
					}
				}
			}
		}

		if (editing && lp.editing != editing) {
			// 一つしか編集中にできないので、他の編集中があればdisableにする
			for (var i = 0; i < rootLayersProps.length; i++) {
				if (this.#svgImagesProps[rootLayersProps[i].id]) {
					if (this.#svgImagesProps[rootLayersProps[i].id].editing == true) {
						this.#svgImagesProps[rootLayersProps[i].id].editing == false;
					}
				}
			}
		}

		if (lp.visible != visible) {
			if (visible) {
				layer.setAttribute("visibility", "visible");
			} else {
				layer.setAttribute("visibility", "hidden");
			}
		}

		if (hashOption) {
			var svg2 = false;
			var url = layer.getAttribute("xlink:href");
			if (!url) {
				svg2 = true;
				url = layer.getAttribute("src");
			}
			if (url.indexOf("#") > 0) {
				url = url.substring(0, url.indexOf("#")) + hashOption;
			} else {
				url = url + hashOption;
			}
			console.log("add hashOption to url:", url, " : ", hashOption);

			if (svg2) {
				layer.setAttribute("src", url);
			} else {
				layer.setAttribute("xlink:href", url);
			}
		}

		if (lp.editing != editing) {
			this.#svgImagesProps[layerId].editing = editing; // 編集中のレイヤがあるとレジューム直後エラーが出る・・ 2016/12/27
		}

		return true;
	}

	// setRootLayersPropsの簡単版　ただし、layerListUIのアップデートも行ってくれる
	/**
	 *
	 * @param {String} layerID_Numb_Title
	 * @param {*} visible //型が不明(Boolean or String)
	 */
	setLayerVisibility(layerID_Numb_Title, visible) {
		this.setRootLayersProps(layerID_Numb_Title, visible, false);
		/** refreshScreen側で実行するように改修 2021/10/14
		if ( typeof updateLayerListUIint == "function" ){
			updateLayerListUIint();
		}
		**/
		this.#refreshScreen();
	}

	getLayerName(layer) {
		var ans = "";
		if (layer.getAttribute("title")) {
			ans = layer.getAttribute("title");
		} else {
			ans = layer.getAttribute("xlink:href");
			if (!optText) {
				// optTextは存在しないと思う・・・ 2022/05/24
				ans = layer.getAttribute("src");
			}
		}
		return ans;
	}

	getLayerHash(layerName) {
		// root containerにおけるレイヤ名もしくはURIからハッシュキーを得る
		var ans = null;
		var layer = this.getLayer(layerName);
		if (layer) {
			ans = layer.getAttribute("iid");
		}
		return ans;
	}

	// ターゲットのレイヤーのハッシュをPath名から探し出す
	getHashByDocPath(docPath) {
		var ans = null;
		for (var i in this.#svgImagesProps) {
			if (this.#svgImagesProps[i].Path == null) {
				//			console.log("pass");
			} else if (this.#svgImagesProps[i].Path.indexOf(docPath) >= 0) {
				ans = i;
				//			console.log("found!");
				break;
			}
		}
		return ans;
	}
}
export { LayerManager };
