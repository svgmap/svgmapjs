//SVGMapCustomLayersManager_r3module.htmlの拡張機能
// Others - Container　のボタンを実装している
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//

addEventListener("load", function () {
	document
		.getElementById("saveContainerSvg")
		.addEventListener("click", saveCurrentContainerSvg);
});

async function saveCurrentContainerSvg() {
	// getRootContainer()は、現在のviewPortまではまだ反映できてない。　オプション付けてでも反映できると良い。
	var contSrc = await window.svgMapCustomLayersManagerApp.getRootContainer();
	console.log(contSrc);
	var blob = new Blob([contSrc], { type: "image/svg+xml" });

	var dla = document.getElementById("downloadAnchor");
	dla.href = window.URL.createObjectURL(blob);
	dla.setAttribute("download", "container.svg");
	dla.click();
}

// Others - Upload　のボタンを実装している
var uploaderWorkDir = "";
addEventListener("load", function () {
	document
		.getElementById("uploadCurrentCustomLayers")
		.addEventListener("click", uploadCurrentCustomLayers);
});

async function uploadCurrentCustomLayers() {
	console.log("uploadCurrentCustomLayers");
	var sc = window.svgMapCustomLayersManagerApp.svgMapCustomLayersManagerClient;
	var vb;
	if (document.getElementById("withViewBox").checked) {
		vb = await sc.getGeoViewBox();
	}
	console.log(sc, vb);
	var layerSet = await sc.loadCustomLayerSettings();
	console.log(layerSet);
	var currentKey = layerSet.currentSettingKey;
	if (!currentKey) {
		alert(
			"現在の地図表示としてカスタムレイヤーが選択されていません。選択してから操作してください",
		);
	} else {
		var currentLayerset = layerSet.customLayersSettings[currentKey];
		currentLayerset.metadata.rootContainerHref = layerSet.rootContainerHref;
		currentLayerset.metadata.settingRevision = layerSet.settingRevision;
		if (vb) {
			currentLayerset.metadata.viewBox = vb;
		}
		console.log("currentLayerset:", currentLayerset);
		uploadJsonToServer(currentLayerset);
	}
}

async function uploadJsonToServer(settingObj) {
	try {
		var jsonStr = JSON.stringify(settingObj);
		var dataTitle = settingObj.metadata.title;
		var ans = await sendData(jsonStr, dataTitle, "json");
		alert("SUCCESS upload : ", dataTitle);
	} catch (err) {
		alert("FAIL : ", err);
		console.log(err);
	}
}

function sendData(dataBody, dataTitle, dataType, forceFileNameToTitle) {
	// dataType(str): svg, json, geojson, csv
	var data = {
		svgmapdata: dataBody,
		title: dataTitle,
		//		filename: fileName,
	};
	console.log("sendData:", data);
	if (forceFileNameToTitle) {
		data.filename = fileName;
	}
	if (dataType) {
		data.type = dataType;
	}
	return new Promise(function (okCallback, ngCallback) {
		var XHR = new XMLHttpRequest();
		var FD = new FormData();

		for (name in data) {
			FD.append(name, data[name]);
		}
		XHR.addEventListener("load", function (event) {
			//console.log("post success:",event,this.responseText);
			if (okCallback) {
				okCallback("load");
			}
		});
		XHR.addEventListener("error", function (event) {
			console.log("Oups! Something goes wrong.");
			if (ngCallback) {
				ngCallback("error");
			}
		});
		XHR.open("POST", uploaderWorkDir + "fileManage.php");
		XHR.send(FD);
	});
}
