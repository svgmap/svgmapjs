// このライブラリは現在のところ使われていません
import { UtilFuncs } from "./libs/UtilFuncs.js";
import { MatrixUtil } from "./libs/TransformLib.js";

class SVGMapSerializer {
	constructor(mapTicker, getDocumentId, getMetaSchema, svgImagesProps) {
		this.#mapTicker = mapTicker;
		this.#getDocumentId = getDocumentId;
		this.#getMetaSchema = getMetaSchema;
		this.#svgImagesProps = svgImagesProps;
	}

	#mapTicker;
	#getDocumentId;
	#getMetaSchema;
	#svgImagesProps;

	#showSerialize(poi) {
		// 使われていない 2018.3.2確認
		var sse = this.#mapTicker.initModal("txtArea");
		var body = document.getElementById("txtAreaBody");
		body.innerHTML = UtilFuncs.escape(
			this.svgPoi2csv(poi.ownerDocument.documentElement)
		);
		document.getElementById("txtArea").addEventListener(
			"click",
			function (e) {
				switch (e.target.id) {
					case "txtAreaCSV": // 値設定決定用
						body.innerHTML = UtilFuncs.escape(
							this.svgPoi2csv(poi.ownerDocument.documentElement)
						);
						break;
					case "txtAreaSVGMap": // 値設定決定用
						body.innerHTML = UtilFuncs.escape(
							'<?xml version="1.0" encoding="UTF-8"?>\n' +
								this.xml2Str(poi.ownerDocument.documentElement)
						);
						break;
					case "txtAreaClose": // 値設定決定用
						this.#mapTicker.initModal();
						break;
				}
			},
			false
		);
	}

	xml2Str(xmlNode) {
		// 使われていない
		try {
			// Gecko- and Webkit-based browsers (Firefox, Chrome), Opera.
			return new XMLSerializer().serializeToString(xmlNode);
		} catch (e) {
			try {
				// Internet Explorer.
				return xmlNode.xml;
			} catch (e) {
				//Other browsers without XML Serializer
				alert("Xmlserializer not supported");
			}
		}
		return false;
	}

	svgPoi2csv(svgDocElement) {
		// 使われていないshowSerializeからしか呼ばれていないので使われていない(2018.3.2確認)
		var ans = "";
		var docId = this.#getDocumentId(svgDocElement);
		var schema = this.#getMetaSchema(svgDocElement.ownerDocument);
		var crs = this.#svgImagesProps[docId].CRS;
		ans += "latitude,longitude,iconClass,iconTitle," + schema + "\n";
		var pois = svgDocElement.getElementsByTagName("use");
		for (var i = 0; i < pois.length; i++) {
			var poiProp = this.#getImageProps(pois[i], SvgMapElementType.POI);
			var geoPos = MatrixUtil.SVG2Geo(poiProp.x, poiProp.y, crs);
			ans +=
				UtilFuncs.numberFormat(geoPos.lat) +
				"," +
				UtilFuncs.numberFormat(geoPos.lng) +
				"," +
				poiProp.href +
				"," +
				poiProp.title +
				"," +
				poiProp.metadata +
				"\n";
		}
		return ans;
	}
}

export { SVGMapSerializer };
