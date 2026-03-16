// 3D Visualize Window for SVGMap Contents using CESIUM
//
// Assitant for SVGMapLv0.1_CesiumWrapper_r3.js
//
// Programmed by Satoru Takagi @ KDDI CORPORATION
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// Rev.1 : 2018/02/10 2D vector view
// Rev.2 : 2018/02/28 Raster and POI bar graph impl.
//         2018/04/05 Add getHeights Func
//         2022/04/xx Proxy機構を整理。
//         2022/05/19 背景図・地形プロバイダの追加＆初期化を別ソース化・ion分離、bin有効化・整理(getProviderViewModels.js)
// Rev.3 : 2022/05/20 SVGMap.jsの統一化されたProxy機構を利用可能に
// Rev.4 : 2022/08/10- 開発中 ESM化、SVGMap Window, Cesium3D Viewer Window連携をmessagingに切り替え

// ISSUES:
// 地理院のテレインでは、sampleTerrainMostDetailedが動かなくなった(Cesiumがまた仕様変更した感じ)
// 一方でCesium標準テレインで、sampleTerrainを使うと　たとえばレベル15指定すると動かない

//var testData="ddd";

import { CesiumProviderViewModels } from "./getProviderViewModels_module.js";
import { InterWindowMessaging } from "../InterWindowMessaging.js";

class CesiumWindow {
	constructor(cesiumObj, svgMapOpenerWindow, accessTokens, options) {
		this.#initCesiumWindow(
			cesiumObj,
			svgMapOpenerWindow,
			accessTokens,
			options,
		);
	}

	#reldir2imageUrl; // このSVGMapコンテンツのルートコンテナのあるディレクトリへ相対パス　（なので、本来は呼び元から提供すべきだが・・）

	#viewer;
	#scene;

	#iwmsg;
	#Cesium;

	#initCesiumWindow(cesiumObj, svgMapOpenerWindow, accessTokens, options) {
		// 初期化関数
		// 引数：accessTokens: 特定の地図サービスを使う場合のアクセストークンの連想配列
		// "bing"と "ion"が使える

		if (!svgMapOpenerWindow || !cesiumObj) {
			console.warn(
				"NO window.opener(svgMapOpenerWindow) or cesiumObject exit.",
			);
			return;
		}

		this.#iwmsg = new InterWindowMessaging(
			{
				viewGeoJson: this.#viewGeoJson,
			},
			svgMapOpenerWindow,
			true,
		);

		this.#getReldir2imageUrl();

		this.#Cesium = cesiumObj;

		console.log("initCesiumWindow ");

		var srcs = new CesiumProviderViewModels(cesiumObj, accessTokens, options);

		console.log(
			"imagerySources:",
			srcs.imagerySources,
			" terrainSources:",
			srcs.terrainSources,
			" accessTokens:",
			accessTokens,
		);
		this.#viewer = new Cesium.Viewer("cesiumContainer", {
			imageryProviderViewModels: srcs.imagerySources,
			terrainProviderViewModels: srcs.terrainSources,
			//		imageryProvider: false,
			//		baseLayerPicker: false,
			timeline: false,
			animation: false,
			selectedImageryProviderViewModel:
				srcs.imagerySources[srcs.defaultImageryIndex],
			selectedTerrainProviderViewModel:
				srcs.terrainSources[srcs.defaultTerrianIndex],
		});

		if (!accessTokens || !accessTokens.ion) {
			this.#viewer._cesiumWidget._creditContainer.style.display = "none";
		}

		//	console.log( "Resource.fetchText?:", Cesium.Resource.fetchText);

		/**
		// set basic terrain https://cesiumjs.org/tutorials/Terrain-Tutorial/
	//	this.#viewer.terrainProvider = terrainProvider;
		this.#viewer.terrainProvider = terrainProvider2;
		// see also https://groups.google.com/forum/#!topic/cesium-dev/2UYkQyA7amU
		**/

		this.#scene = this.#viewer.scene;
		console.log("onLoad :    scene:", this.#scene);
	}

	async #getCORSresolvedURL(path) {
		var url = await this.#iwmsg.callRemoteFunc("getCORSURL", [path]);
		return url;
	}

	async #getReldir2imageUrl() {
		if (this.#reldir2imageUrl) {
			return this.#reldir2imageUrl;
		} else {
			var ans = await this.#iwmsg.callRemoteFunc("reldir2imageUrl", []);
			this.#reldir2imageUrl = ans;
			console.log(" get reldir2imageUrl:", this.#reldir2imageUrl);
			return ans;
		}
	}

	#flyToRectangle(west, south, east, north, showViewport) {
		// https://gis.stackexchange.com/questions/157781/how-to-control-the-zoom-amount-in-cesium-camera-flyto

		var dy = (north - south) * 1.0; // pitch による視線のずれ分だけずらす・・
		var dw = (east - west) * 0.2;
		var dh = (north - south) * 0.2;

		var rectangle = Cesium.Rectangle.fromDegrees(
			west + dw,
			south + dh - dy,
			east - dw,
			north - dh - dy,
		);
		var rectangleV = Cesium.Rectangle.fromDegrees(west, south, east, north);
		this.#viewer.camera.flyTo({
			destination: rectangle,
			orientation: {
				heading: Cesium.Math.toRadians(0.0),
				pitch: Cesium.Math.toRadians(-40.0),
				roll: 0.0,
			},
		});

		if (showViewport) {
			//		this.#setGroundRect(rectangleV);
			//		this.#setRect(rectangleV);
			this.#setRectOfHeight((west + east) / 2, (north + south) / 2, rectangleV);
			//		this.#testGroundPrimitive();
		}

		/**
		console.log("flyToRectangle scene:",this.#scene,"   scene.camera:",this.#scene.camera);
	    this.#scene.camera.flyToRectangle({
	        destination : Cesium.Rectangle.fromDegrees(west, south, east, north)
	    });
		**/
	}

	#setGroundRect(rectangleV) {
		console.log("setGroundRect:");
		// https://stackoverflow.com/questions/29911691/cesium-how-to-drape-a-polygon-or-line-onto-terrain-surface
		// うまくつくれない？
		// https://cesiumjs.org/tutorials/Geometry-and-Appearances/ これ見ても作れてるはずなんだが・・
		// https://stackoverflow.com/questions/34727726/what-is-difference-between-entity-and-primitive-in-cesiumjs
		// https://cesiumjs.org/Cesium/Build/Documentation/GroundPrimitive.html
		var rectangleInstance = new Cesium.GeometryInstance({
			geometry: new Cesium.RectangleGeometry({
				rectangle: rectangleV,
			}),
			id: "rectangle",
			attributes: {
				color: new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5),
			},
		});
		this.#scene.primitives.removeAll();
		this.#scene.primitives.add(
			new Cesium.GroundPrimitive({
				geometryInstance: rectangleInstance,
			}),
		);
	}

	#testGroundPrimitive() {
		// これも同じ・・・
		var rectangleInstance = new Cesium.GeometryInstance({
			geometry: new Cesium.RectangleGeometry({
				rectangle: Cesium.Rectangle.fromDegrees(135.0, 35.0, 3.0, 3.0),
			}),
			id: "rectangle",
			attributes: {
				color: new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5),
			},
		});
		console.log(
			"testGroundPrimitive:",
			this.#scene,
			this.#scene.primitives,
			rectangleInstance,
		);
		this.#scene.primitives.add(
			new Cesium.GroundPrimitive({
				geometryInstance: rectangleInstance,
			}),
		);
	}

	#setRect(rectangleV, height) {
		hv = 0;
		if (height) {
			hv = height;
		}
		this.#viewer.entities.add({
			rectangle: {
				coordinates: rectangleV,
				fill: false,
				outline: true,
				outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
				height: hv,
			},
		});
	}

	#setBox(lng, lat, title, boxSize, boxTall, terrainHeight) {
		if (!boxSize) {
			boxSize = 100;
		}
		/**
		if ( ! boxTall ){
			boxTall = 500;
		}
		**/

		if (!terrainHeight) {
			terrainHeight = 0;
		}

		var boxZpos = boxTall * 0.5 + terrainHeight;

		//	console.log("Called setBox:lng,lat,title,boxSize, boxTall , terrainHeight:",lng,lat,title,boxSize, boxTall , terrainHeight);
		var redBox = this.#viewer.entities.add({
			name: title,
			position: Cesium.Cartesian3.fromDegrees(lng, lat, boxZpos),
			box: {
				dimensions: new Cesium.Cartesian3(boxSize, boxSize, boxTall),
				material: Cesium.Color.RED.withAlpha(0.35),
				outline: true,
				outlineColor: Cesium.Color.BLACK.withAlpha(0.35),
			},
		});
	}

	// posArray should be [[lng0,lat0],[lng1,lat1],.....]
	// positions of callBackFunc ( positions ) may be positions[0].height,positions[1].height, ...
	#getHeights(posArray, callBackFunc, progressFunc) {
		var positions = [];
		for (var i = 0; i < posArray.length; i++) {
			var pos = Cesium.Cartographic.fromDegrees(posArray[i][0], posArray[i][1]);
			positions.push(pos);
		}
		console.log(
			"called getHeights,sampleTerrainMostDetailed:",
			positions,
			"  viewer.terrainProvider:",
			this.#viewer.terrainProvider.availability,
		);
		//	Cesium.sampleTerrain(this.#viewer.terrainProvider, 9, positions).then(callBackFunc);
		//	Cesium.sampleTerrainMostDetailed(this.#viewer.terrainProvider, positions).then(callBackFunc);

		var stC = new SampleTerrainWrapper(
			this.#viewer.terrainProvider,
			positions,
			callBackFunc,
			progressFunc,
		);
		/**
		var stC = this.#sampleTerrainWrapperC();
		stC.sampleTerrainWrapper(this.#viewer.terrainProvider, positions, callBackFunc,progressFunc);
		**/
	}

	#setRectOfHeight(lng, lat, rect) {
		// これを使って中心点の高さを取り出し、それに合わせる
		// https://stackoverflow.com/questions/28291013/get-ground-altitude-cesiumjs
		// https://groups.google.com/forum/#!topic/cesium-dev/imIpoZHvKrM
		// https://cesiumjs.org/Cesium/Build/Documentation/sampleTerrain.html
		console.log(
			"setRectOfHeight:",
			lng,
			lat,
			"  viewer.terrainProvider:",
			this.#viewer.terrainProvider,
			"   when",
			Cesium.when,
			"   Cesium:",
			Cesium,
		);
		this.#viewer.terrainProvider.readyPromise.then(function () {
			console.log("readyPromise");
		});

		var pointOfInterest = Cesium.Cartographic.fromDegrees(
			lng,
			lat,
			5000,
			new Cesium.Cartographic(),
		);
		console.log("terrainProvider", this.#viewer.terrainProvider);
		if (this.#viewer.terrainProvider.availability) {
			console.log("availability", this.#viewer.terrainProvider.availability);
			console.log(
				"availability.computeMaximumLevelAtPosition : ",
				this.#viewer.terrainProvider.availability.computeMaximumLevelAtPosition(
					pointOfInterest,
				),
			);
		}
		//,this.#viewer.terrainProvider.availability.computeMaximumLevelAtPosition(pointOfInterest));
		//	var samPromise = Cesium.sampleTerrainMostDetailed(this.#viewer.terrainProvider, [ pointOfInterest ]);
		var samPromise = Cesium.sampleTerrain(this.#viewer.terrainProvider, 10, [
			pointOfInterest,
		]);
		console.log("samPromise:sampleTerrain:", samPromise);
		samPromise.then(function (samples) {
			console.log(
				"Height in meters is: " + samples[0].height,
				"   rect:",
				rect,
			);
			this.#setRect(rect, samples[0].height);
		});

		//	Cesium.sampleTerrain(this.#viewer.terrainProvider, 9, [ pointOfInterest ])
		/**
		Cesium.sampleTerrainMostDetailed(this.#viewer.terrainProvider, [ pointOfInterest ])
		.then(function(samples) {
			console.log('Height in meters is: ' + samples[0].height, "   rect:",rect);
			this.#setRect(rect,samples[0].height);
		});
		**/
	}

	#getGeoJsonTemplate() {
		var geoJSinstanceTmpl = {
			type: "FeatureCollection",
			features: [],
		};
		return geoJSinstanceTmpl;
	}

	// POIのスタイルを変えるには。。
	//		markerSymbol: 'golf'　とか・・
	//		"marker-symbol": "art-gallery", とか。。
	// https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20simplestyle.html&label=Showcases
	// マーカーを変えるには、これが参考になる・・
	// https://cesiumjs.org/Cesium/Apps/SampleData/simplestyles.geojson
	// geojsonにこのように記載すればそれが反映されると思う

	#pColor = [
		"blue",
		"red",
		"green",
		"purple",
		"yellow",
		"aqua",
		"maroon",
		"olive",
		"lime",
		"navy",
		"fuchsia",
		"teal",
		"white",
		"black",
	];
	#pLvl = [
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"G",
		"H",
		"I",
		"J",
		"K",
		"L",
		"M",
		"N",
	];
	#strokeRatio = 500; // Cesium画面の何分の一の幅で「線」を表現するか
	#relBarTickness = 4.0; // 「線」の幅の何倍の大きさで、バーグラフの太さを表現するか
	#relBarFullRange = 25.0; // バーグラフの太さの何倍を正規化値のフルレンジにするか

	#viewGeoJson = async function (geojsInp, rect) {
		console.log("viewGeoJson:  jsGeom", geojsInp, "  rect:", rect);
		//	console.log( this.#viewer, this.#viewer.dataSources);

		if (this.#viewer && this.#viewer.dataSources) {
			// countinue
		} else {
			console.log("wait instansiation..");
			setTimeout(
				function () {
					this.#viewGeoJson(geojsInp, rect);
				}.bind(this),
				200,
			);
		}

		var js = geojsInp;

		var geoJSinstance = this.#getGeoJsonTemplate();

		// いろいろ消去する。
		this.#clearCoverageImageries();
		this.#viewer.entities.removeAll();

		var sw = (rect.width * 111111) / this.#strokeRatio; // 線幅(sw)はメートル次元を持つらしい。決め打ちのストローク幅 画面の大きさのstrokeRatio分の一の幅にするという意味ですね。
		// Cesiumの線幅定義がいつの間にか変化しえらく太く描画される・・よくわからなくなってきた・・・2018/7/25

		var layerNumb = {};
		var layerCount = 0;
		for (var subLayerId in js) {
			var mainValueMin, mainValueMax;

			if (js[subLayerId].layerProps) {
				mainValueMin =
					js[js[subLayerId].layerProps.svgImageProps.rootLayer].mainValueMin;
				mainValueMax =
					js[js[subLayerId].layerProps.svgImageProps.rootLayer].mainValueMax;
			}

			var geoms = js[subLayerId].geometry;
			var layerId = "root";
			var layerName = "root";
			var layerProps = js[subLayerId].layerProps;
			if (layerProps) {
				layerId = layerProps.id; // 異なるレイヤ(サブレイヤとかタイルではなくルートのレイヤ)ごとに色を変える。 2018.2.16
				layerName = layerProps.title;
			}

			var colorNumber = -1;
			if (!geoms) {
				continue;
			}
			if (geoms.length > 0) {
				// 色をレイヤごとに変化させる機能
				if (layerNumb[layerId] !== undefined) {
					colorNumber = layerNumb[layerId];
				} else {
					layerNumb[layerId] = layerCount;
					++layerCount;
					if (layerCount > 13) {
						layerCount = 0;
					}
				}
				colorNumber = layerNumb[layerId];
			}

			if (geoms.length > 0) {
				for (var i = 0; i < geoms.length; i++) {
					if (geoms[i].type !== "Coverage") {
						var pTitle = i + ":" + layerName;
						//				console.log(geoms[i].src.getAttribute("xlink:title"));
						if (geoms[i].src && geoms[i].src.title) {
							pTitle = geoms[i].src.title + "/" + layerName;
						}
						var feature = new Object();
						feature.type = "Feature";
						feature.properties = {
							title: pTitle,
							"marker-symbol": pTitle.substring(0, 1),
							"marker-color": this.#pColor[colorNumber],
						};
						feature.geometry = geoms[i];
						if (geoms[i].mainValue != undefined && geoms[i].type == "Point") {
							var normalizedValue =
								(geoms[i].mainValue - mainValueMin) /
								(mainValueMax - mainValueMin);
							//						console.log("calling setBox: geom:",geoms[i],"   mainVal(N):", normalizedValue, "   mainVal:",geoms[i].mainValue,"   min,max:",mainValueMin,mainValueMax);
							this.#setBox(
								geoms[i].coordinates[0],
								geoms[i].coordinates[1],
								pTitle,
								sw * this.#relBarTickness,
								sw *
									(normalizedValue + 0.01) *
									this.#relBarTickness *
									this.#relBarFullRange,
							); // 0.01は0になると柱が消えちゃうので、1%程度サバ読み
						} else {
							geoJSinstance.features.push(feature);
						}
					} else {
						// ビットイメージはcesium内蔵のgeojson描画ではない専用実装で描画する
						if (
							layerProps.groupName != "basemap" &&
							layerProps.groupName != "背景地図"
						) {
							// この部分　ちょっと決めうち気味・・
							await this.#setCoverage2Imagery(geoms[i]);
						} else {
							//						console.log("Skip basemap:",geoms[i].href);
						}
					}
				}
			}
		}

		console.log("geojs:", geoJSinstance, "   rect:", rect, "   sw:", sw);

		if (rect) {
			this.#addGeoJsonObj(geoJSinstance, true, sw);
		} else {
			this.#addGeoJsonObj(geoJSinstance, true);
		}

		if (rect) {
			// x:geoViewBox.x , y:geoViewBox.y , width:geoViewBox.width, height:geoViewBox.height, cx: geoViewBox.x + 0.5*geoViewBox.width, cy:geoViewBox.y + 0.5*geoViewBox.height

			this.#flyToRectangle(
				rect.x,
				rect.y,
				rect.x + rect.width,
				rect.y + rect.height,
				true,
			);
			//		this.#flyToRectangle(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height , false );
		}
	}.bind(this);

	#coverageImageries = [];

	async #setCoverage2Imagery(geom) {
		//	console.log("Coverage is rendered by special inplemantaion  :", geom.coordinates[0].lng , geom.coordinates[0].lat, geom.coordinates[1].lng , geom.coordinates[1].lat, geom.href);

		var imageUrl = geom.href;
		imageUrl = await this.#getCORSresolvedURL(imageUrl);
		console.log("orig:", geom.href, "  imageUrl:", imageUrl);
		if (imageUrl.startsWith("https://") || imageUrl.startsWith("http://")) {
		} else if (imageUrl.startsWith("/")) {
			// imageUrl = imageUrl;
		} else {
			imageUrl = (await this.#getReldir2imageUrl()) + imageUrl;
		}
		console.log("CORSimageUrl:", imageUrl);

		//	console.log("geom rect:",geom.coordinates[0].lng , geom.coordinates[0].lat, geom.coordinates[1].lng , geom.coordinates[1].lat);
		var coverageImagery = this.#viewer.imageryLayers.addImageryProvider(
			new Cesium.SingleTileImageryProvider({
				//		url : "test-signal2.jpg",
				url: imageUrl,
				rectangle: Cesium.Rectangle.fromDegrees(
					geom.coordinates[0].lng,
					geom.coordinates[0].lat,
					geom.coordinates[1].lng,
					geom.coordinates[1].lat,
				),
			}),
		);

		coverageImagery.alpha = 0.5;
		this.#coverageImageries.push(coverageImagery);
	}

	#clearCoverageImageries() {
		for (var i = 0; i < this.#coverageImageries.length; i++) {
			console.log("should be removed:", this.#coverageImageries[i]);
			this.#viewer.imageryLayers.remove(this.#coverageImageries[i], true);
		}
		this.#coverageImageries = [];
	}

	#clampToGround = true;

	//	var fillColor = Cesium.Color.PINK.withAlpha(0.5);

	#addGeoJsonObj(geoJSinstance, doClear, swidth) {
		var sw = 20;
		if (swidth) {
			sw = swidth;
		}
		console.log(
			"called addGeoJsonObj : coverageImageries",
			this.#coverageImageries,
		);
		if (doClear) {
			this.#viewer.dataSources.removeAll();
		}
		console.log("geoJson:", JSON.stringify(geoJSinstance));
		this.#viewer.dataSources.add(
			Cesium.GeoJsonDataSource.load(geoJSinstance, {
				stroke: Cesium.Color.HOTPINK.withAlpha(0.6),
				fill: Cesium.Color.PINK.withAlpha(0.35),
				strokeWidth: sw / 4, // 2018.7.25 cesiumのstrokeWidth定義が変化した？　えらく太くなるので４分の１にしてみる・・・nonScalingになった？
				markerSymbol: "?",
				clampToGround: this.#clampToGround,
			}),
		);
	}

	#sampleTerrainWrapperC() {
		var sampleTerrainWrapperCBF;
		var sampleTerrainWrapperProgressF;
		var sampleTerrainWrapperTerrainProvider;
		var subCount = 10;
		var answerPositions;
		var completedCount;
		var inputPositions;

		function sampleTerrainWrapper(
			terrainProvider,
			positions,
			callBackFunc,
			progressFunc,
		) {
			answerPositions = [];
			completedCount = 0;
			inputPositions = positions;
			sampleTerrainWrapperTerrainProvider = terrainProvider;
			sampleTerrainWrapperCBF = callBackFunc;
			sampleTerrainWrapperProgressF = progressFunc;
			sampleSubTerrain();
		}

		function sampleSubTerrain() {
			// どうも大量に問い合わせをするとスロットルリクエストタイプの地理院地形データで問い合わせをあきらめられてしまうので、１０件づつ問い合わせを徐々にするようにしてみる
			console.log("called sampleSubTerrain:", completedCount);
			var subPositions = inputPositions.slice(
				completedCount,
				completedCount + subCount,
			);
			Cesium.sampleTerrainMostDetailed(
				sampleTerrainWrapperTerrainProvider,
				subPositions,
			).then(
				//		Cesium.sampleTerrain(sampleTerrainWrapperTerrainProvider,9, subPositions).then(
				function (resolvedSubPositions) {
					console.log("sampleTerrainMostDetailed SUB:", resolvedSubPositions);
					completedCount += subCount;
					answerPositions = answerPositions.concat(resolvedSubPositions);
					console.log(completedCount, inputPositions.length);
					if (completedCount < inputPositions.length) {
						sampleTerrainWrapperProgressF(
							completedCount / inputPositions.length,
						);
						sampleSubTerrain();
					} else {
						sampleTerrainWrapperCBF(answerPositions);
					}
				},
			);
		}

		return {
			sampleTerrainWrapper: sampleTerrainWrapper,
		};
	}
}

class SampleTerrainWrapper {
	constructor(terrainProvider, positions, callBackFunc, progressFunc) {
		this.#sampleTerrainWrapper(
			terrainProvider,
			positions,
			callBackFunc,
			progressFunc,
		);
	}

	#sampleTerrainWrapperCBF;
	#sampleTerrainWrapperProgressF;
	#sampleTerrainWrapperTerrainProvider;
	#subCount = 10;
	#answerPositions;
	#completedCount;
	#inputPositions;

	#sampleTerrainWrapper(
		terrainProvider,
		positions,
		callBackFunc,
		progressFunc,
	) {
		this.#answerPositions = [];
		this.#completedCount = 0;
		this.#inputPositions = positions;
		this.#sampleTerrainWrapperTerrainProvider = terrainProvider;
		this.#sampleTerrainWrapperCBF = callBackFunc;
		this.#sampleTerrainWrapperProgressF = progressFunc;
		this.#sampleSubTerrain();
	}

	#sampleSubTerrain = function () {
		// どうも大量に問い合わせをするとスロットルリクエストタイプの地理院地形データで問い合わせをあきらめられてしまうので、１０件づつ問い合わせを徐々にするようにしてみる
		console.log("called sampleSubTerrain:", this.#completedCount);
		var subPositions = this.#inputPositions.slice(
			this.#completedCount,
			this.#completedCount + this.#subCount,
		);
		Cesium.sampleTerrainMostDetailed(
			this.#sampleTerrainWrapperTerrainProvider,
			subPositions,
		).then(
			//		Cesium.sampleTerrain(this.#sampleTerrainWrapperTerrainProvider,9, subPositions).then(
			function (resolvedSubPositions) {
				console.log("sampleTerrainMostDetailed SUB:", resolvedSubPositions);
				this.#completedCount += this.#subCount;
				this.#answerPositions =
					this.#answerPositions.concat(resolvedSubPositions);
				console.log(this.#completedCount, this.#inputPositions.length);
				if (this.#completedCount < this.#inputPositions.length) {
					this.#sampleTerrainWrapperProgressF(
						this.#completedCount / this.#inputPositions.length,
					);
					this.#sampleSubTerrain();
				} else {
					this.#sampleTerrainWrapperCBF(this.#answerPositions);
				}
			},
		);
	}.bind(this);
}

export { CesiumWindow };
