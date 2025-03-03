//SVGMapCustomLayersManager_r3module.htmlの拡張機能
// Others - Container　のボタンを実装している

onload = function () {
	document
		.getElementById("saveContainerSvg")
		.addEventListener("click", saveCurrentContainerSvg);
};

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
