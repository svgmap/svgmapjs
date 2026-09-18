// Description:
// KMLをGeoJSONに変換するパーサー
// SVGMapLv0.1_GIS_r4.js 内の検証済みKML解析ロジックをベースに出力先をスタイル付きgeoJSONに変更しモジュール化
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//

class KMLParser {
	static kmlToGeoJson(xmlDoc) {
		const features = [];
		// ルートから再帰的にパースを開始
		this._parseKmlRecursive(xmlDoc, null, null, features);

		// スキーマ（プロパティのキー一覧）を抽出
		const schemaKeys = new Set(["title", "name", "description"]);
		features.forEach((f) => {
			Object.keys(f.properties).forEach((k) => schemaKeys.add(k));
		});

		return {
			type: "FeatureCollection",
			features: features,
			schema: Array.from(schemaKeys),
		};
	}

	/**
	 * オリジナルの drawKml をベースにした再帰的パース処理
	 */
	static _parseKmlRecursive(node, parentTitle, parentMeta, features) {
		// DocumentやFolderの下の階層を探索する
		// 補足: オリジナルの querySelectorAll("Folder") を再帰内で使うと、
		// 孫フォルダまで重複して拾うリスクがあるため、直下の子要素(children)だけを安全に見ていきます。
		const folders = Array.from(node.children || []).filter(
			(n) => n.tagName === "Folder" || n.tagName === "Document"
		);

		if (folders.length > 0) {
			// フォルダについて文法解釈
			folders.forEach((folder) => {
				const kmlName = this._getNameFromKML(folder) || parentTitle;
				const kmlDescription =
					this._getDescriptionFromKML(folder) || parentMeta;

				// フォルダの中へ再帰
				this._parseKmlRecursive(folder, kmlName, kmlDescription, features);
			});
		} else {
			// Placemarkについて文法解釈
			const placemarkAll = node.querySelectorAll("Placemark");
			const plm = Array.prototype.slice.call(placemarkAll, 0);

			plm.forEach((placemark) => {
				let kmlName = this._getNameFromKML(placemark);
				let kmlDescription = this._getDescriptionFromKML(placemark);

				// 名前と説明がなければ親フォルダのものを継承
				if (kmlName === null && kmlDescription === null) {
					kmlName = parentTitle;
					kmlDescription = parentMeta;
				}

				const kmlGeometryType = this._getGeometryFromKML(placemark);
				const kmlCoordinates = this._getCoordinateFromKML(placemark);

				// 別スレッドのパーサーからスタイル抽出機能だけ合流
				const styleProps = this._extractStyle(placemark);
				const properties = {
					title: kmlName,
					name: kmlName,
					description: kmlDescription,
					...styleProps,
				};

				let geoJsonGeometry = null;

				// オリジナルの幾何判定に基づくGeoJSONマッピング
				if (kmlGeometryType === "point") {
					geoJsonGeometry = { type: "Point", coordinates: kmlCoordinates[0] };
				} else if (
					kmlGeometryType === "linestring" ||
					kmlGeometryType === "linearring"
				) {
					geoJsonGeometry = { type: "LineString", coordinates: kmlCoordinates };
				} else if (kmlGeometryType === "polygon") {
					// Polygonの場合は配列の次元を一つ深くする (GeoJSONの仕様)
					geoJsonGeometry = { type: "Polygon", coordinates: [kmlCoordinates] };
				}

				if (geoJsonGeometry) {
					features.push({
						type: "Feature",
						properties: properties,
						geometry: geoJsonGeometry,
					});
				}
			});
		}
	}

	// --- 以下、オリジナルの検証済みヘルパー関数群 ---

	static _getNameFromKML(item) {
		const nameTag = item.querySelector("name");
		return nameTag ? nameTag.textContent.trim() : null;
	}

	static _getDescriptionFromKML(item) {
		const descTag = item.querySelector("description");
		return descTag ? descTag.textContent.trim() : null;
	}

	static _getGeometryFromKML(item) {
		// オリジナル通りの判定ロジック
		if (item.querySelector("Placemark") && item.children.length === 1) {
			// 簡易判定
			return "placemark";
		} else if (item.querySelector("Polygon")) {
			return "polygon";
		} else if (item.querySelector("Point")) {
			return "point";
		} else if (item.querySelector("LineString")) {
			return "linestring";
		} else if (item.querySelector("LinearRing")) {
			return "linearring";
		} else if (item.querySelector("MultiGeometry")) {
			return "multigeometry";
		}
		return null;
	}

	static _getCoordinateFromKML(item) {
		const geoArray = [];
		const coordNode = item.querySelector("coordinates");
		if (!coordNode) return geoArray;

		// オリジナルの改行・タブの除去ロジック
		const coordinates = coordNode.textContent
			.trim()
			.replace(/\n/g, " ")
			.replace(/\t/g, " ")
			.split(" ");

		for (let i = 0; i < coordinates.length; i++) {
			const text = coordinates[i].trim();
			if (!text) continue; // 連続するスペース対策

			const coordinate = text.split(",");
			// SVGのpath属性(d="...")ではなくGeoJSONに出力するため、数値(Number)に変換します
			geoArray.push([parseFloat(coordinate[0]), parseFloat(coordinate[1])]);
		}
		return geoArray;
	}

	// スタイル抽出処理
	static _extractStyle(pm) {
		const style = {};
		const styleTag = pm.getElementsByTagName("Style")[0];
		if (!styleTag) return style;

		const lineStyle = styleTag.getElementsByTagName("LineStyle")[0];
		if (lineStyle) {
			const kmlColor = lineStyle.getElementsByTagName("color")[0]?.textContent;
			if (kmlColor) style["stroke"] = this._parseKmlColor(kmlColor).color;
			const width = lineStyle.getElementsByTagName("width")[0]?.textContent;
			if (width) style["stroke-width"] = parseFloat(width);
		}

		const polyStyle = styleTag.getElementsByTagName("PolyStyle")[0];
		if (polyStyle) {
			const kmlColor = polyStyle.getElementsByTagName("color")[0]?.textContent;
			if (kmlColor) style["fill"] = this._parseKmlColor(kmlColor).color;
		}

		return style;
	}

	static _parseKmlColor(kmlColor) {
		if (!kmlColor || kmlColor.length !== 8)
			return { color: "#000000", opacity: 1 };
		const a = kmlColor.substring(0, 2),
			b = kmlColor.substring(2, 4);
		const g = kmlColor.substring(4, 6),
			r = kmlColor.substring(6, 8);
		return { color: `#${r}${g}${b}`, opacity: parseInt(a, 16) / 255 };
	}
}

export { KMLParser };
