// getProviderViewModels() for cesiumWindow4.js
// Programmed by Satoru Takagi
// ベースマップ・地形のセットを初期化する部分がご茶ついているので切り分けました
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
//
class CesiumProviderViewModels {
	terrainSources;
	imagerySources;
	defaultTerrianIndex;
	defaultImageryIndex;

	constructor(cesiumObj, tokens) {
		if (!cesiumObj) {
			console.warn("NO Cesium exit.");
			return;
		}
		this.#Cesium = cesiumObj;
		this.#initSources(tokens);
	}

	#Cesium; // window.Cesiumを入れる

	#initSources(tokens) {
		var ionKey, bingKey;
		if (tokens) {
			if (tokens.ion) {
				ionKey = tokens.ion;
			}
			if (tokens.bing) {
				bingKey = tokens.bing;
			}
		}

		// select imgSrc https://groups.google.com/forum/#!topic/cesium-dev/QniSlJ0IKGg
		var imagerySources = this.#Cesium.createDefaultImageryProviderViewModels();
		if (!ionKey) {
			imagerySources = this.#noIonMapBox(imagerySources);
		}
		var terrainSources = this.#Cesium.createDefaultTerrainProviderViewModels();
		if (!ionKey) {
			terrainSources = this.#noIonMapBox(terrainSources);
		}

		/** This Provider is about to obsolute...
		var terrainProvider = new Cesium.CesiumTerrainProvider({
		    url : '//assets.agi.com/stk-terrain/world'
		});
		**/

		var GSIterrainProvider1 = new this.#Cesium.JapanGSITerrainProvider();

		var GSIterrainProvider2 = new this.#Cesium.JapanGSITerrainProvider({
			heightPower: 2.0,
			usePngData: false,
		});

		var GSIImageProvider1 = new this.#Cesium.JapanGSIImageryProvider({
			layerLists: [
				{
					id: "seamlessphoto",
					zoom: "2-18",
					ext: "jpg",
				},
				"std",
			],
		});

		imagerySources.push(
			new this.#Cesium.ProviderViewModel({
				name: "地理院 シームレスオルソ画像",
				category: "国土地理院",
				iconUrl: "./Ellipsoid.png",
				tooltip: "GSI Map Image Tile Seamless Ortho",
				creationFunction: function () {
					return GSIImageProvider1;
				},
			})
		);

		var GSIImageProvider2 = new this.#Cesium.JapanGSIImageryProvider({
			layerLists: ["std"],
		});

		imagerySources.push(
			new this.#Cesium.ProviderViewModel({
				name: "地理院 標準地図",
				category: "国土地理院",
				iconUrl: "./Ellipsoid.png",
				tooltip: "GSI Map Image Tile StdMap",
				creationFunction: function () {
					return GSIImageProvider2;
				},
			})
		);

		var GSIImageProvider3 = new this.#Cesium.JapanGSIImageryProvider({
			layerLists: ["relief", "std"],
		});

		imagerySources.push(
			new this.#Cesium.ProviderViewModel({
				name: "地理院 色別標高図",
				category: "国土地理院",
				iconUrl: "./Ellipsoid.png",
				tooltip: "GSI Map Image Tile relief",
				creationFunction: function () {
					return GSIImageProvider3;
				},
			})
		);

		if (bingKey) {
			const bing1 = new this.#Cesium.BingMapsImageryProvider({
				url: "https://dev.virtualearth.net",
				key: bingKey,
				mapStyle: this.#Cesium.BingMapsStyle.AERIAL_WITH_LABELS,
			});

			imagerySources.push(
				new this.#Cesium.ProviderViewModel({
					name: "BingMap AERIAL LAVEL",
					category: "BingMap",
					iconUrl: "./Ellipsoid.png",
					tooltip: "BingMap AERIAL LAVEL",
					creationFunction: function () {
						return bing1;
					},
				})
			);

			const bing2 = new this.#Cesium.BingMapsImageryProvider({
				url: "https://dev.virtualearth.net",
				key: bingKey,
				mapStyle: this.#Cesium.BingMapsStyle.AERIAL,
			});

			imagerySources.push(
				new this.#Cesium.ProviderViewModel({
					name: "BingMap AERIAL",
					category: "BingMap",
					iconUrl: "./Ellipsoid.png",
					tooltip: "BingMap AERIAL",
					creationFunction: function () {
						return bing2;
					},
				})
			);

			const bing3 = new this.#Cesium.BingMapsImageryProvider({
				url: "https://dev.virtualearth.net",
				key: bingKey,
				mapStyle: this.#Cesium.BingMapsStyle.ROAD,
			});

			imagerySources.push(
				new this.#Cesium.ProviderViewModel({
					name: "BingMap ROAD",
					category: "BingMap",
					iconUrl: "./Ellipsoid.png",
					tooltip: "BingMap AERIAL",
					creationFunction: function () {
						return bing3;
					},
				})
			);

			const bing4 = new this.#Cesium.BingMapsImageryProvider({
				url: "https://dev.virtualearth.net",
				key: bingKey,
				mapStyle: this.#Cesium.BingMapsStyle.CANVAS_GRAY,
			});

			imagerySources.push(
				new this.#Cesium.ProviderViewModel({
					name: "BingMap CANVAS_GRAY",
					category: "BingMap",
					iconUrl: "./Ellipsoid.png",
					tooltip: "BingMap AERIAL",
					creationFunction: function () {
						return bing4;
					},
				})
			);
		}

		// https://groups.google.com/forum/#!topic/cesium-dev/2UYkQyA7amU
		// terrainSources.push(terrainProvider); さすがにこれじゃない
		// terrainSources.push(terrainProvider2);

		terrainSources.push(
			new this.#Cesium.ProviderViewModel({
				name: "国土地理院DEM",
				category: "国土地理院",
				iconUrl: "./Ellipsoid.png",
				tooltip: "WGS84 standard ellipsoid, also known as EPSG:4326",
				creationFunction: function () {
					return GSIterrainProvider1;
				},
			})
		);
		terrainSources.push(
			new this.#Cesium.ProviderViewModel({
				name: "国土地理院scale2 DEM",
				category: "国土地理院",
				iconUrl: "./Ellipsoid.png",
				tooltip: "WGS84 standard ellipsoid, also known as EPSG:4326",
				creationFunction: function () {
					return GSIterrainProvider2;
				},
			})
		);

		if (ionKey) {
			this.#Cesium.Ion.defaultAccessToken = ionKey; // nullだとどうなるのだろう…nullにしたいがw
		}

		var defaultTerrianIndex = 0,
			defaultImageryIndex = 0;
		for (var i = 0; i < terrainSources.length; i++) {
			if (terrainSources[i].name.indexOf("World") >= 0) {
				defaultTerrianIndex = i;
				break;
			}
			if (terrainSources[i].name.indexOf("国土地理院DEM") >= 0) {
				defaultTerrianIndex = i;
			}
		}
		for (var i = 0; i < imagerySources.length; i++) {
			if (imagerySources[i].name.indexOf("BingMap AERIAL LAVEL") >= 0) {
				defaultImageryIndex = i;
				break;
			}
			if (imagerySources[i].name.indexOf("ESRI World Imagery") >= 0) {
				defaultImageryIndex = i;
			}
		}

		(this.terrainSources = terrainSources),
			(this.imagerySources = imagerySources),
			(this.defaultTerrianIndex = defaultTerrianIndex),
			(this.defaultImageryIndex = defaultImageryIndex);
	}

	#noIonMapBox(sources) {
		var ans = [];
		for (var msrc of sources) {
			if (msrc._category == "Cesium ion" || msrc.name.indexOf("Mapbox") >= 0) {
			} else {
				ans.push(msrc);
			}
		}
		return ans;
	}
}

export { CesiumProviderViewModels };
