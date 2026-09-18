// Description:
// ベクトルファイルを表示するモジュール
//
// History:
// 2026/02/24: SVGMapLv0.1_GIS_r4.js の該当メソッド群をモジュール化
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//

import { KMLParser } from "./KMLParser.js";

class SVGMapVectorFileRenderer {
	#svgMap;

	// geoJsonのpropertyに以下の予約語が入っていたらスタイルと見做す(mapboxのgeojson拡張Simplestyleをベース)
	// See https://github.com/mapbox/simplestyle-spec
	// この実装では、opacity追加、"marker-size"の実装をどうしようか考え中です・・
	static #styleDict = {
		title: 0,
		description: 1,
		"marker-size": 2,
		"marker-symbol": 3,
		"marker-color": 4,
		stroke: 5,
		"stroke-width": 6,
		fill: 7,
		opacity: 8,
	};

	constructor(svgMapObject) {
		this.#svgMap = svgMapObject;
	}

	// ==========================================================
	// 公開メソッド
	// ==========================================================

	/**
	 * KMLを描画する (GeoJSONに変換してから内部でdrawGeoJsonを呼び出す)
	 * 従来のKML専用レンダラから、KMLParser->drawGeoJsonに変更 2026/02/24
	 */
	drawKml(
		kmlDoc,
		targetSvgDocId,
		strokeColor,
		strokeWidth,
		fillColor,
		POIiconId,
		poiTitle,
		metadata,
		parentElm,
		styleData
	) {
		console.log(
			"SVGMapVectorFileRenderer: drawKml called. Converting to GeoJSON..."
		);

		// KMLParserを使ってKML DOMをGeoJSON(FeatureCollection)に変換
		const geojson = KMLParser.kmlToGeoJson(kmlDoc);

		// 変換したGeoJSONを描画処理に回す
		this.drawGeoJson(
			geojson,
			targetSvgDocId,
			strokeColor,
			strokeWidth,
			fillColor,
			POIiconId,
			poiTitle,
			metadata,
			parentElm,
			styleData,
			{ multiGeometryGrouping: true } // 元の挙動に合わせるためのオプション
		);
	}

	/**
	 * GeoJSONを描画する (元のSvgMapGISから移植)
	 */
	drawGeoJson(
		geojson,
		targetSvgDocId,
		strokeColor,
		strokeWidth,
		fillColor,
		POIiconId,
		poiTitle,
		parentMetadata,
		parentElm,
		metaDictionary,
		options
	) {
		if (!options) {
			options = {};
		}

		var svgImages = this.#svgMap.getSvgImages();
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
		var svgImage = svgImages[targetSvgDocId];
		var svgImagesProp = svgImagesProps[targetSvgDocId];
		var crs = svgImagesProp.CRS;

		var metadata = {};
		if (parentMetadata) {
			for (var mkey in parentMetadata) {
				metadata[mkey] = parentMetadata[mkey];
			}
		}
		if (geojson.metadata) {
			metadata = geojson.metadata;
		}
		if (geojson.properties) {
			for (var mkey in geojson.properties) {
				metadata[mkey] = geojson.properties[mkey];
			}
		}

		if (!geojson.type && geojson.length > 0) {
			for (var i = 0; i < geojson.length; i++) {
				this.drawGeoJson(
					geojson[i],
					targetSvgDocId,
					strokeColor,
					strokeWidth,
					fillColor,
					POIiconId,
					poiTitle,
					metadata,
					parentElm,
					metaDictionary,
					options
				);
			}
		} else if (geojson.type == "FeatureCollection") {
			var features = geojson.features;
			for (var i = 0; i < features.length; i++) {
				this.drawGeoJson(
					features[i],
					targetSvgDocId,
					strokeColor,
					strokeWidth,
					fillColor,
					POIiconId,
					poiTitle,
					metadata,
					parentElm,
					metaDictionary,
					options
				);
			}
		} else if (geojson.type == "Feature") {
			this.drawGeoJson(
				geojson.geometry,
				targetSvgDocId,
				strokeColor,
				strokeWidth,
				fillColor,
				POIiconId,
				poiTitle,
				metadata,
				parentElm,
				metaDictionary,
				options
			);
		} else if (geojson.type == "GeometryCollection") {
			var geoms = geojson.geometries;
			for (var i = 0; i < geoms.length; i++) {
				this.drawGeoJson(
					geoms[i],
					targetSvgDocId,
					strokeColor,
					strokeWidth,
					fillColor,
					POIiconId,
					poiTitle,
					metadata,
					parentElm,
					metaDictionary,
					options
				);
			}
		} else if (geojson.type == "MultiPolygon") {
			if (geojson.coordinates.length > 0) {
				var colletionParent = parentElm;
				if (options.multiGeometryGrouping) {
					colletionParent = this.#getMultiGeometryGroup(
						parentElm,
						svgImage,
						geojson.type,
						metadata,
						metaDictionary
					);
				}
				for (var i = 0; i < geojson.coordinates.length; i++) {
					this.#putPolygon(
						geojson.coordinates[i],
						svgImage,
						crs,
						fillColor,
						metadata,
						colletionParent,
						metaDictionary,
						options
					);
				}
			}
		} else if (geojson.type == "Polygon") {
			this.#putPolygon(
				geojson.coordinates,
				svgImage,
				crs,
				fillColor,
				metadata,
				parentElm,
				metaDictionary,
				options
			);
		} else if (geojson.type == "MultiLineString") {
			if (geojson.coordinates.length > 0) {
				var colletionParent = parentElm;
				if (options.multiGeometryGrouping) {
					colletionParent = this.#getMultiGeometryGroup(
						parentElm,
						svgImage,
						geojson.type,
						metadata,
						metaDictionary
					);
				}
				for (var i = 0; i < geojson.coordinates.length; i++) {
					this.#putLineString(
						geojson.coordinates[i],
						svgImage,
						crs,
						strokeColor,
						strokeWidth,
						metadata,
						colletionParent,
						metaDictionary,
						options
					);
				}
			}
		} else if (geojson.type == "LineString") {
			this.#putLineString(
				geojson.coordinates,
				svgImage,
				crs,
				strokeColor,
				strokeWidth,
				metadata,
				parentElm,
				metaDictionary,
				options
			);
		} else if (geojson.type == "MultiPoint") {
			if (geojson.coordinates.length > 0) {
				var colletionParent = parentElm;
				if (options.multiGeometryGrouping) {
					colletionParent = this.#getMultiGeometryGroup(
						parentElm,
						svgImage,
						geojson.type,
						metadata,
						metaDictionary
					);
				}
				for (var i = 0; i < geojson.coordinates.length; i++) {
					this.#putPoint(
						geojson.coordinates[i],
						svgImage,
						crs,
						POIiconId,
						poiTitle,
						metadata,
						colletionParent,
						metaDictionary,
						options
					);
				}
			}
		} else if (geojson.type == "Point") {
			this.#putPoint(
				geojson.coordinates,
				svgImage,
				crs,
				POIiconId,
				poiTitle,
				metadata,
				parentElm,
				metaDictionary,
				options
			);
		}
	}

	// ==========================================================
	// プライベートメソッド (描画用ヘルパー)
	// ==========================================================

	#putPoint(
		coordinates,
		svgImage,
		crs,
		POIiconId,
		poiTitle,
		metadata,
		parentElm,
		metaDictionary
	) {
		var metastyle = this.#getSvgMapSimpleMeta(metadata, metaDictionary);
		var metaString = this.#array2string(metastyle.normalized);
		if (!metaString && metastyle.styles.description) {
			metaString = metastyle.styles.description;
		}

		if (!POIiconId) POIiconId = "p0";
		if (metastyle.styles["marker-symbol"])
			POIiconId = metastyle.styles["marker-symbol"];

		var fill, stroke;
		var opacity = 1;
		var strokeWidth = 0;
		if (metastyle.styles.opacity) opacity = Number(metastyle.styles.opacity);
		if (metastyle.styles.fill) fill = metastyle.styles.fill;
		if (metastyle.styles["marker-color"])
			fill = metastyle.styles["marker-color"];
		if (metastyle.styles.stroke) {
			stroke = metastyle.styles.stroke;
			strokeWidth = 1;
		}
		if (metastyle.styles["stroke-width"])
			strokeWidth = metastyle.styles["stroke-width"];

		if (metastyle.styles.title != null && metastyle.styles.title != undefined) {
			poiTitle = metastyle.styles.title + "";
		} else if (metadata.title) {
			poiTitle = metadata.title + "";
		}

		var poie = svgImage.createElement("use");
		var svgc = this.#getSVGcoord(coordinates, crs);
		if (!svgc) return null;

		poie.setAttribute("x", "0");
		poie.setAttribute("y", "0");
		poie.setAttribute("transform", "ref(svg," + svgc.x + "," + svgc.y + ")");
		poie.setAttribute("xlink:href", "#" + POIiconId);

		if (poiTitle) poie.setAttribute("xlink:title", poiTitle);
		if (metaString) poie.setAttribute("content", metaString);
		if (fill) poie.setAttribute("fill", fill);

		if (strokeWidth > 0) {
			poie.setAttribute("stroke", stroke);
			poie.setAttribute("stroke-width", strokeWidth);
			poie.setAttribute("vector-effect", "non-scaling-stroke");
		} else {
			poie.setAttribute("stroke", "none");
		}
		if (opacity < 1) poie.setAttribute("opacity", opacity);

		if (parentElm) {
			parentElm.appendChild(poie);
		} else {
			svgImage.documentElement.appendChild(poie);
		}
		return poie;
	}

	#putLineString(
		coordinates,
		svgImage,
		crs,
		strokeColor,
		strokeWidth,
		metadata,
		parentElm,
		metaDictionary
	) {
		var metastyle = this.#getSvgMapSimpleMeta(metadata, metaDictionary);
		var metaString = this.#array2string(metastyle.normalized);
		if (!metaString && metastyle.styles.description) {
			metaString = metastyle.styles.description;
		}

		if (!strokeColor) strokeColor = "blue";
		if (!strokeWidth) strokeWidth = 3;

		var opacity = 1;
		if (metastyle.styles.opacity) opacity = Number(metastyle.styles.opacity);
		if (metastyle.styles.stroke) strokeColor = metastyle.styles.stroke;
		if (metastyle.styles["stroke-width"])
			strokeWidth = metastyle.styles["stroke-width"];

		var title;
		if (metastyle.styles.title) title = metastyle.styles.title;

		var pe = svgImage.createElement("path");
		var pathD = this.#getPathD(coordinates, crs);

		pe.setAttribute("d", pathD);
		pe.setAttribute("fill", "none");
		pe.setAttribute("stroke", strokeColor);
		pe.setAttribute("stroke-width", strokeWidth);
		pe.setAttribute("vector-effect", "non-scaling-stroke");

		if (opacity < 1) pe.setAttribute("opacity", opacity);
		if (title) pe.setAttribute("xlink:title", title);
		if (metaString) pe.setAttribute("content", metaString);

		if (parentElm) {
			parentElm.appendChild(pe);
		} else {
			svgImage.documentElement.appendChild(pe);
		}
		return pe;
	}

	#putPolygon(
		coordinates,
		svgImage,
		crs,
		fillColor,
		metadata,
		parentElm,
		metaDictionary
	) {
		var metastyle = this.#getSvgMapSimpleMeta(metadata, metaDictionary);
		var metaString = this.#array2string(metastyle.normalized);
		if (!metaString && metastyle.styles.description) {
			metaString = metastyle.styles.description;
		}
		if (coordinates.length == 0) return;

		var strokeColor = "none";
		var strokeWidth = 0;
		if (!fillColor) fillColor = "orange";

		if (metastyle.styles.fill) fillColor = metastyle.styles.fill;
		if (metastyle.styles.stroke) {
			strokeWidth = 1;
			strokeColor = metastyle.styles.stroke;
		}
		if (metastyle.styles["stroke-width"])
			strokeWidth = metastyle.styles["stroke-width"];

		var opacity = 1;
		if (metastyle.styles.opacity) opacity = Number(metastyle.styles.opacity);

		var title;
		if (metastyle.styles.title) title = metastyle.styles.title;

		var pe = svgImage.createElement("path");
		var pathD = "";
		for (var i = 0; i < coordinates.length; i++) {
			pathD += this.#getPathD(coordinates[i], crs) + "z ";
		}

		pe.setAttribute("d", pathD);
		pe.setAttribute("fill", fillColor);
		pe.setAttribute("fill-rule", "evenodd");

		if (strokeWidth > 0) {
			pe.setAttribute("stroke", strokeColor);
			pe.setAttribute("stroke-width", strokeWidth);
			pe.setAttribute("vector-effect", "non-scaling-stroke");
		} else {
			pe.setAttribute("stroke", "none");
		}

		if (opacity < 1) pe.setAttribute("opacity", opacity);
		if (title) pe.setAttribute("xlink:title", title);
		if (metaString) pe.setAttribute("content", metaString);

		if (parentElm) {
			parentElm.appendChild(pe);
		} else {
			svgImage.documentElement.appendChild(pe);
		}
		return pe;
	}

	#getMultiGeometryGroup(parentElm, svgImage, type, metadata, metaDictionary) {
		var grp = svgImage.createElement("g");
		if (!type) type = "multiGeometry";
		grp.setAttribute("data-multiGeometry", type);

		if (metadata && metaDictionary) {
			var metastyle = this.#getSvgMapSimpleMeta(metadata, metaDictionary);
			var metaString = this.#array2string(metastyle.normalized);
			if (!metaString && metastyle.styles.description) {
				metaString = metastyle.styles.description;
			}
			if (metaString) {
				grp.setAttribute("content", metaString);
			}
		}

		if (parentElm) {
			parentElm.appendChild(grp);
		} else {
			svgImage.documentElement.appendChild(grp);
		}
		return grp;
	}

	#getPathD(geoCoords, crs) {
		if (geoCoords.length == 0) return " ";
		var ans = "M";
		var svgc = this.#getSVGcoord(geoCoords[0], crs);
		if (svgc) {
			ans += svgc.x + "," + svgc.y + " L";
			for (var i = 1; i < geoCoords.length; i++) {
				svgc = this.#getSVGcoord(geoCoords[i], crs);
				if (svgc) ans += svgc.x + "," + svgc.y + " ";
			}
		} else {
			ans = " ";
		}
		return ans;
	}

	#getSVGcoord(geoCoord, crs) {
		if (geoCoord.length > 1) {
			return {
				x: geoCoord[0] * crs.a + geoCoord[1] * crs.c + crs.e,
				y: geoCoord[0] * crs.b + geoCoord[1] * crs.d + crs.f,
			};
		} else {
			return null;
		}
	}

	#getSvgMapSimpleMeta(metadata, metaDictionary) {
		var others = {};
		var hitMeta = [];
		var style = {};
		if (Array.isArray(metadata)) {
			hitMeta = metadata;
		} else {
			if (metaDictionary) {
				if (!metaDictionary.hashMap) {
					this.#buildMetaDictHash(metaDictionary);
				}
				hitMeta = new Array(metaDictionary.length);
				for (var key in metadata) {
					var idx = metaDictionary.hashMap[key];
					if (idx != undefined) {
						hitMeta[idx] = metadata[key];
					} else {
						if (SVGMapVectorFileRenderer.#styleDict[key] != undefined) {
							style[key] = metadata[key];
						} else {
							others[key] = metadata[key];
						}
					}
				}
			} else {
				var keys = Object.keys(metadata);
				keys.sort();
				for (var key of keys) {
					if (SVGMapVectorFileRenderer.#styleDict[key] != undefined) {
						style[key] = metadata[key];
					} else {
						hitMeta.push(metadata[key]);
					}
				}
			}
		}
		return {
			normalized: hitMeta,
			others: others,
			styles: style,
		};
	}

	#buildMetaDictHash(metaDictionary) {
		metaDictionary.hashMap = {};
		for (var i = 0; i < metaDictionary.length; i++) {
			metaDictionary.hashMap[metaDictionary[i]] = i;
		}
	}

	#array2string(arr) {
		var ans;
		if (arr.length == 0) return null;
		for (var i = 0; i < arr.length; i++) {
			var s = "";
			if (arr[i] != null && arr[i] != undefined) {
				s = arr[i].toString();
			}
			if (s.indexOf(",") >= 0) {
				s = s.replaceAll(",", "&#x2c;");
			}
			if (i == 0) {
				ans = s;
			} else {
				ans += "," + s;
			}
		}
		return ans;
	}
}

export { SVGMapVectorFileRenderer };
