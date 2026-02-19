// Description:
// GlobalMessageDisplay Class for SVGMap.js
// Programmed by Satoru Takagi
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

class GlobalMessageDisplay {
	static #GlobalMessageprefix = "gMsg_";
	static #maxGlobalMessages = 5;
	static #globalMessageID = "globalMessage";

	constructor() {}

	// ローバルエリアにID="globalMesasge" span要素がある場合、そこに(調停付きで)レイヤー固有UIframeからメッセージを出せるフレームワーク 2019/12/02
	#putGlobalMessage(message, layerId) {
		//console.log("caller:",putGlobalMessage.caller); // layerIdはいらないんだよね
		//console.log("this:",this); // layerIdはいらないんだよね
		var gs = document.getElementById(GlobalMessageDisplay.#globalMessageID);
		if (!gs) {
			console.log(
				'NO id="' + GlobalMessageDisplay.#globalMessageID + '" element skip',
			);
			return false;
		}
		var tbl = gs.getElementsByTagName("table")[0];
		if (!tbl) {
			console.log("init globalMesasge area");
			tbl = document.createElement("table");
			tbl.style.border = "0px";
			tbl.style.padding = "0px";
			tbl.style.margin = "0px";
			gs.appendChild(tbl);
		}

		var gmc = gs.children;
		var msgCell = document.getElementById(
			GlobalMessageDisplay.#GlobalMessageprefix + layerId,
		);
		if (!msgCell) {
			if (gmc.length >= GlobalMessageDisplay.#maxGlobalMessages) {
				console.log("can not append global message due to limit");
				return false;
			} else {
				msgCell = document.createElement("td");
				var tr = document.createElement("tr");
				tr.id = GlobalMessageDisplay.#GlobalMessageprefix + layerId;
				tr.appendChild(msgCell);
				gs.appendChild(tr);
			}
		}
		console.log(msgCell, message);
		msgCell.innerText = message;
		return true;
	}

	putGlobalMessageForLayer(layerID) {
		return function (message) {
			this.#putGlobalMessage(message, layerID);
		}.bind(this);
	}

	//layerUIが消滅したもののglobalMessageを消す
	clearGlobalMessage(layerId) {
		console.log("clearGlobalMessage:", layerId);
		//	var svgLayers = svgMap.getSvgImagesProps()["root"]; // この機に、全チェックしたほうが良いのかなぁ・・
		var gs = document.getElementById(GlobalMessageDisplay.#globalMessageID);
		console.log("globalMessage:", gs);
		if (!gs) {
			console.log('NO id="globalMesasge" element skip');
			return;
		}
		var gmc = document.getElementById(
			GlobalMessageDisplay.#GlobalMessageprefix + layerId,
		);
		console.log("globalMessageCell:", gmc);
		if (gmc) {
			console.log("Remove GlobalMessage for layer:", layerId);
			gmc.parentNode.removeChild(gmc);
		}
	}
}

export { GlobalMessageDisplay };
