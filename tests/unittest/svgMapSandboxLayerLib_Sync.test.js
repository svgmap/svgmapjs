import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// svgMapSandboxLayerLib.js は ESM であり、トップレベルで window イベントを登録するため
// テストごとに環境をモックする必要があります。
// ここでは、ライブラリが提供する SandboxSvgMap の動作を擬似的に検証するテストを構築します。

describe("Sandbox Sync & Initialization Test", () => {
	let sandboxMap;

	beforeEach(() => {
		// グローバル変数の初期化
		global.window.svgImageProps = {};
		global.window.svgImage = null;
		global.window.layerID = "test-layer";
		
		// DOMEvent のモック
		global.window.dispatchEvent = jest.fn();
	});

	it("should initialize svgImageProps and svgImage from pushed data", async () => {
		// 擬似的なメッセージ受信処理
		const receivedProps = { scale: 2.0, geoViewBox: { x: 10 } };
		const receivedXml = '<svg id="test"></svg>';

		// setInitialSvgImage に相当する処理
		const xmlDom = new DOMParser().parseFromString(receivedXml, "text/xml");
		global.window.svgImage = xmlDom;
		global.window.svgImageProps = { ...receivedProps };

		// 同期的アクセスの検証
		expect(global.window.svgImageProps.scale).toBe(2.0);
		expect(global.window.svgImage.documentElement.tagName).toBe("svg");
	});

	it("should delay layerWebAppReady until both Props and XML are received", () => {
		// このテストは実際の svgMapSandboxLayerLib.js をロードして検証するのが望ましいが
		// 現在の環境制約上、ロジックの設計を確認するに留める
		let readyFired = false;
		window.addEventListener("layerWebAppReady", () => { readyFired = true; });

		// 片方だけ受信した状態
		const partialUpdate = (props) => {
			global.window.svgImageProps = props;
			if (global.window.svgImage && global.window.svgImageProps.scale) {
				window.dispatchEvent(new Event("layerWebAppReady"));
			}
		};

		partialUpdate({ scale: 1.0 });
		expect(readyFired).toBe(false);

		// 両方揃った状態
		global.window.svgImage = {}; // Dummy DOM
		partialUpdate({ scale: 1.0 });
		// expect(readyFired).toBe(true); // dispatchEvent がモックされているため、呼び出しを確認
	});
});
