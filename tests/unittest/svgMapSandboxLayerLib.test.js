import { jest } from "@jest/globals";

let messageHandlers = {};
let mockMessagingInstance = {
	callRemoteFunc: jest.fn(),
};

// ***************************************
// svgMapSandboxLayerLib.js ではCDNからの読み込みを想定しているため、テスト環境ではモジュールとしてインポートする必要がある。
// InterWindowMessaging をモック
jest.unstable_mockModule("../../InterWindowMessaging.js", () => {
	return {
		InterWindowMessaging: jest.fn().mockImplementation((handlers) => {
			messageHandlers = handlers;
			return mockMessagingInstance;
		}),
	};
});

// SVGMapVectorFileRenderer と KMLParser のモック
jest.unstable_mockModule("../../libs/SVGMapVectorFileRenderer.js", () => {
	return {
		SVGMapVectorFileRenderer: jest.fn().mockImplementation(() => {
			return {
				drawGeoJson: jest.fn(),
				drawKml: jest.fn(),
			};
		}),
	};
});

jest.unstable_mockModule("../../libs/KMLParser.js", () => {
	return {
		KMLParser: {
			kmlToGeoJson: jest.fn().mockReturnValue({ type: "FeatureCollection", features: [] }),
		},
	};
});
// ***************************************

describe("svgMapSandboxLayerLib", () => {
	let sandboxLib;

	beforeAll(async () => {
		// グローバル変数のセットアップ
		window.layerID = "test-layer-id";
		window.svgImageProps = {};

		// モック適用後にモジュールをロード
		sandboxLib = await import("../../svgMapSandboxLayerLib.js");

		// DOMContentLoadedを発火させて initSandboxLayer を呼び出す
		window.dispatchEvent(new Event("DOMContentLoaded"));

		// メッセージハンドラ経由で初期SVGを設定し、内部の setSvgImage / assignSlawaIds を動かす
		const svgXml = `<svg id="root-svg"><g id="static-g"><path id="static-path"/></g></svg>`;
		messageHandlers.setInitialSvgImage({
			layerID: "test-layer-id",
			svgImageXml: svgXml,
			svgImagePropsJSONtext: JSON.stringify({ geoViewBox: { x: 0, y: 0 } })
		});
	});

	describe("SandboxSvgMap インターフェース (Task 1)", () => {
		it("getSvgImagesが実装されており、window.layerIDとwindow.svgImageのペアを返すこと", () => {
			expect(typeof window.svgMap.getSvgImages).toBe("function");
			const images = window.svgMap.getSvgImages();
			expect(images).toEqual({ "test-layer-id": window.svgImage });
		});

		it("getSvgImagesPropsが実装されており、window.layerIDとwindow.svgImagePropsのペアを返すこと", () => {
			expect(typeof window.svgMap.getSvgImagesProps).toBe("function");
			const props = window.svgMap.getSvgImagesProps();
			expect(props).toEqual({ "test-layer-id": window.svgImageProps });
		});
	});

	describe("静的DOMへの自動付番機能 (Task 2)", () => {
		it("初期化されたDOMのすべての要素に data-slawa-id が付番されていること", () => {
			const root = window.svgImage.documentElement;
			const g = window.svgImage.getElementById("static-g");
			const path = window.svgImage.getElementById("static-path");
			
			expect(root.getAttribute("data-slawa-id")).toBeDefined();
			expect(root.getAttribute("data-slawa-id")).toMatch(/^slawa-id-\d+$/);
			
			expect(g.getAttribute("data-slawa-id")).toBeDefined();
			expect(g.getAttribute("data-slawa-id")).toMatch(/^slawa-id-\d+$/);
			
			expect(path.getAttribute("data-slawa-id")).toBeDefined();
			expect(path.getAttribute("data-slawa-id")).toMatch(/^slawa-id-\d+$/);
		});
	});

	describe("自動同期機能 (Task 5)", () => {
		it("DOM変更後に refreshScreen を呼び出した際、applySvgDiff が親へ通知されること", async () => {
			mockMessagingInstance.callRemoteFunc.mockClear();

			// 新しい要素をDOMに追加
			const newPath = window.svgImage.createElement("path");
			newPath.setAttribute("id", "new-path");
			const root = window.svgImage.documentElement;
			root.appendChild(newPath);

			// refreshScreenを呼び出し
			await window.svgMap.refreshScreen();

			// applySvgDiff が親に呼ばれること
			expect(mockMessagingInstance.callRemoteFunc).toHaveBeenCalledWith(
				"applySvgDiff",
				expect.any(Array)
			);
		});
	});

	describe("SandboxSvgMapGIS クラスと window.svgMapGIStool (Task 3)", () => {
		it("window.svgMapGIStoolが公開されており、必要なAPIを持つこと", () => {
			expect(window.svgMapGIStool).toBeDefined();
			expect(typeof window.svgMapGIStool.drawGeoJson).toBe("function");
			expect(typeof window.svgMapGIStool.drawKml).toBe("function");
			expect(typeof window.svgMapGIStool.kml2GeoJson).toBe("function");
		});

		it("drawGeoJson/drawKmlを実行した際、引数の targetSvgDocId にかかわらず window.layerID に固定して実行されること", () => {
			// Mockの振る舞いを確認
			const rendererInstance = window.svgMapGIStool.renderer;
			expect(rendererInstance).toBeDefined();
			
			const geojson = { type: "FeatureCollection", features: [] };
			window.svgMapGIStool.drawGeoJson(geojson, "wrong-layer-id", "red", 2);
			expect(rendererInstance.drawGeoJson).toHaveBeenCalledWith(
				geojson,
				"test-layer-id", // 強制固定されること
				"red",
				2,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined
			);
		});
	});
});
