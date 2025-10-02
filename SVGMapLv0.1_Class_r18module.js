//
// Description:
//  Web Mapping Framework based on SVG
//  SVG Map Level0.1 Implementation
//  evolved from SVG Map Level0
//
// Programmed by Satoru Takagi
//
// Contributors:
//  kusariya
//  MCsamurai034
//
// License: (MPL v2)
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// History:
// 2012/04/16 : Start coding
// 2012/04/17 : Dynamic Loading using AJAX
// 2012/04/20 : 単階層のTiling and Layering実装完了
// 多階層の実装を開始
// 2012/04/20 : DOM基本関数でDOMトラバーサを実装し、image文の解釈を実施
// 2012/04/20 : svgImagesの配列化に着手
// 2012/04/23 : コンテナ⇒インポートSVG　構造への対応
// 2012/04/24 : 多階層対応のため、グローバル変数除去＆再帰処理
// まだ不完全か(完全に不要なsvgdomを消去し切れていない・・)
// 2012/04/24 : 子SVG、親SVGでCRS matrixが異なるものに対応
// 2012/04/24 : rootのみだがvisible(Min/Max)Zoomに対応(実際にはroot以外でもrootと同じgcstfなら正しく動く)　～～⇒要改善です
// 2012/05/08 : IE8(winXP),IE9(win7)対応
// 2012/05/09 : スマホ(Android,iPad等)対応(とりあえず)
// 2012/06/12 : window resizeに対応
// 2012/10/04 : POI機能(０次元Vector)の実装を開始(defs->image(id) , use(ref(svg)))タイプ
// 2012/11/02 : ちょっと間が空いたが、POI基本機能実装完了　（IEでも動作）（ToDo:APIでPOIを導入する機能）
// 2012/11/02 : visible(Min/Max)Zoomをroot以外でも正式に対応(したはず)
// 2012/12/06 : jsを分離, viewBoxのパースバグフィックス
// 2012/12/06 : metadataの機構を改良？ svg-propertyにスキーマ、poi(use)のcontentにデータを入れる(いずれもcsv)
// 2012/12/07 : 中心座標を出すUIを追加
// 2012/12/19 : Mobile Firefoxでそれなりに動くようになった
// 2013/01/08 : レイヤー制御関数(ルートコンテナにある<animation>||<iframe>をレイヤーと認識する "title"属性を名称に)
// 2013/01/10 : レイヤー制御機能(switch動作含) class="class名 switch"でそのclassの中でswitchする (初期状態では、いずれか1こ以外はvisibility="hidden"に)
// 2013/01/11 : スマホでもPOIを触れるようにする機能(照準にPOIをあわせてTickerをタップする)
// 2013/01/25 : Rev.10 : 動的なレイヤーのサポート
// 2013/02/20 : 右クリックドラッグでズーム、スマホではマルチタッチズームに対応
// 2013/06/18 : safari blackout対策
// 2013/06/21 : Rev.11 : ズーム時のLevelOfDetail遷移時、未ロード段階でのホワイトアウトを抑制(上等なimgロード処理がかなりできた。が、タイムアウト処理(一部ルーチン用意)、消されるべきコンテンツが上に載ってしまっていて？読み込み中のコンテンツが隠されてしまう、スムース遷移表示をしたいなどの課題が未解決。かなりヘビーな改造で　影響大きい感じなので、リビジョンをひとつ上げることにした)
// 2013/06/25 : タイムアウト処理、LOD遷移時の隠される問題他、r11のバグ・不具合を修正(rev.11)
// 2013/06/27 : ようやくバグを消したかな
// 2013/07/17 : Rev.12 : POIの入力機能の実装に着手　おそらくこれがLv0としてしてはラストのリビジョン（次版は一部ベクタ対応でlv02?）
// 2013/07/31 : だいたいできたかなぁ～～
// 2013/08/01 : バグ(遅延消去)対応。　html:img:id=svg:idに起因するバグは、そろそろ解消しないとまずそう
// 2013/08/02 : r11レベルのIE8互換
// ===== Level 0.1に移行(Level0.0 Rev12を継承) =====
// 2013/08/08 : 1st test impl. 基本ロジックの実験を開始 rev1
// 2013/08/21 : Pathの実装については、ほぼ安定・・・　IE9,FFでも動作
// 2013/08/22 : ERR404等ファイル取得失敗時の例外処理
// 2013/08/29 : Fragmen identifier
// 2013/09/02 : Anchor
// 2013/09/05 : Rev.2 Smooth zoom & wheel action
// 2013/09/12 : Rev.3 Path塗りつぶし, canvasより下にclickable obj(POI)があると使えないことへの対応, 未使用canvasのパージ(少し高効率化)
// 2013/12/05 : Rev.4 Path 要素のHITTEST : コンテナSVGのインポート部分('animation')で class="clickable"が宣言された文書（とそれが参照するすべての下位文書）のPathがクリック検索対象となる
// 2013/12/11 : とりあえずIE11で丸めが起きないようにした
// 2013/12/25 : Rev.5 タイリングを想定して、DOMを再帰的に編集する機能と、その編集をズームパン時にも持続させる機能(編集する機能自身は、ユーザ関数として任意実装（サンプル参照）)
// 2014/01/31 : imageのhrefをDOM操作したときに、表示に反映される。　onload->addEventに変更。
// 2014/02/07-: Rev.6: 開発を開始。svg2.0のiframe,postpone,globalview,zoom-media-queryのドラフトに対応させたい！
// 2014/02/10 : globalView, iframeを（とりあえずの）解釈するようにした。ただし、postponeがデフォルトで変更不可
// 2014/04/10 : add polygon,polyline,rect ( by converting to path! )
// 2014/04/18 : add path-arc, circle   and  debug "style" attr parser
// 2014/04/24 : animation,iframeのhrefを動的に書き換えたとき、動的な読み込みと表示の変化が起きるようにした。
// 2014/04/25 : Rev.6.5: イベントリスナからon*を除去、多くの主要部をclick->mousedownに変更, IE(11)のAJAX APIのResponseTextで最近起こるようになった挙動に対策
// 2014/04/30 : ellipse
// 2014/05/27 : Rev.7: ルートのSVGのanimationをレイヤとみなし、そのレイヤ単位でcanvas2dを統合し、性能向上を図っている。ただし、ベクタ図形とビットイメージ（タイルやビットイメージPOI）との上下関係は崩れます(summarizeCanvas = true)
// 2014/06/05 : span -> div, debug(htmlへのdiv追加前にloadSVGしているのがおかしい)
// 2014/06/05 : Rev7のbugfix 該当するdivが確実に生成される前に統合canvasが設置される可能性があった(editable layerで露呈する)
// 2014/06/06 : Rev.8: クロージャ化(モジュール化) leaflet.js等に差し込めるようにする準備。 これにより、このバージョンからアプリの作り方が変更、svgMap.*で関数を呼び出す必要がある。
// 2014/06/10 : setGeoCenter、setGeoViewPortのちらつき防止処理
// 2014/06/19 : 一段に限って、imageのtransform="matrix(..)"を実装
// 2014/07/25 : text element ( x,y,font-size,fill,ref(svg,x,y)) (not support rotate multiple x,y)
// 2014/07/31 : zooming,pannning anim : transform3d
// 2014/08/06 : SVGImages[]のsvg文書内で、htmlのimg,divとの関係を作るためにつけていたidを、"iid"属性に変更 大規模変更なのでバグ入ったかも・・
// 2014/09/01 : container.svgのlayer classの特性に"batch"を追加 これを指定すると同じクラス名のレイヤーを一括ON/OFFできるUI(項目)が追加
// 2014/09/08 : レイヤーUI用select要素が multipleの場合に対応。さらにjqueryui のmultiselectを用いている場合にも対応。
// 2014/11/06 : 重なったクリッカブルオブジェクトに対し特別な処理を提供する(衝突判定(RDC?))機能の構築開始
// 2014/11/14 : RDCライブラリ完成・・が、以下の実装ではUIが直感的でないのでこれは不使用(ライブラリは残置)
// 2014/11/19 : 重複するPOIの選択UI実装(RDC使用せず、指定したアイコンのみに対する重複で判別)
// 2014/12/03 : レイヤ選択UI改良　機能を持たない単なるレイヤグループ(class名が共通)も含めoptgroupでまとめ表示
// 2014/12/15 : フレームワークの拡張：override, getObject, callFunction
// 2014/12/15 : PoiTargetSelection: closeボタン、候補にレイヤー名記述　追加
// 2015/02/12 : 画面上に要素がない状態でもレイヤーが存在している動的コンテンツにおいて、不用意にonLoad()が動くのを止めた
// 2015/02/12-: Rev.10: META name="refresh"   content="in sec."
// 2015/03/23 : stroke-dasharray (besides non-scaling-stroke)
// 2015/03/25 : marker subset (arrow) and canvs related debug
// 2015/03/31 : marker
// 2015/05/26 : 非同期な動的コンテンツのためにユーティリティ関数（画面更新）を拡張
// 2015/07/08 : Rev.11: image要素でビットイメージが参照されているときに、そのspatial media fragmentを解釈しクリップする
// 2015/09/11 : 動的コンテンツで、スクリプトがエスケープされていなくても動作するようにした
// 2016/05/16 : Fix Safari crash
// 2016/08/10 : Fix CORS contents bug.. konnoさんのコードに手を付けたので、サイドエフェクトが懸念される・・ 8.10のコメントのところ
// 2016/10/03 : Rev.12:UIモジュール化リファクタリング開始： Authoring tools除去
// 2016/10/04 : レイヤーツール除去開始
// 2016/10/06 : getSwLayersとcheckLayerSwitchの問題点解消、getRootLayersProps()追加(layer UI分離準備工事)
// 2016/10/11 : レイヤーツール分離
// 2016/10/14 : レイヤー固有UIハンドラ svgImagesProps.controller [URL(html||png||jpg)]
// 2016/10/26 : 操作状況などのcookie保存復帰機能(resume)
// 2016/11/29 : Rev.13:(GIS Extension)開発開始。 パーサがSVGMapコンテンツからgeoJSON(ライクな)データ構造を出力できる機能をまず持たせたい。次にそれを使って、地理空間情報処理関数をサービスする(別建ての)フレームワークを提供できるようにしたい。
// 2016/12/16 : GIS Extension基本構造完成。GeoJSON生成
// 2016/12/21 : Rev.14:(Authoring Tools)開発開始。まずはRev11で切り出したPOI Editorを外部フレームワークとして移植。
// 2016/12/27 : ポリゴン・ポリライン・Pathオーサリングのためのヒットテスト実装
// 2017/01/17 : defs下の<g>に2Dベクタグラフィックス要素群があるものをuseできる機能と、その場合にuse側にmetadataがあってもmetadataをヒットテストで取得できる機能を実装
// 2017/01/18 : path A, circle ellipseなどでVE non scaling効くようにした
// 2017/01/25 : カスタムなモーダルダイアログAPI、POI&2D ObjのProp表示機能をフレームワーク化(setShowPoiProperty)し、レイヤ固有表示(しなくても良い)機能も実装可能とした。
// 2017/02/17 : 野良XMLではIDは機能しない(単なるid attrにすぎない)？。そのためgetElementByIdも機能しない。そこで、querySelectorを使用した代替物を構築。要注意なのは、単なるattrなので、idが重複していようがお構いなしになる・・
// 2017/03/08 : URLフラグメントで、表示領域、表示レイヤ(レイヤタイトルによる)、非表示レイヤ(同)を指定可能に
//              表示非表示レイヤはカンマ区切りで複数指定可能,またレイヤ名にハッシュをつけて文字列を入れると、そのレイヤーのsvgコンテナのlocation.hashにそれが追加される(その際"="は"%3D",&は"%26"でエンコード必要)
//              ex:http://svg2.mbsrv.net/devinfo/devkddi/lvl0.1/developing/SVGMapper_r14.html#visibleLayer=csv textArea#hello%3D2%26good%3Dday&hiddenLayer=csv layer#hellox%3D2x%26goodx%3Ddayx&svgView(viewBox(global,135,35,1,1))
// 2017/03/16 : イベントを精密化 zoomPanMapはviewPort変化時のみ、 screenRefreshedを新設しこちらはvp変化しなかったとき　これでrefreshScreen()に纏わる無限ループリスクを抑制した。
// 2017/08/14 : centerSightを用いたオブジェクト選択機能を拡張し、POIもベクタもtickerに複数出現・選択可にする　ただしうcheckTicker()での二重パースの課題あり
// 2017/08/15 : iOS safariでgeolocationAPIがなぜか動かないので・・パッチ
// 2017/08/16 : URLフラグメントのvisibleLayer,hiddenLayerに、ワイルドカード"*"を指定可能に
// 2017/08/17 : 動的レイヤーのF/Wの大BUGを改修(svgMapの内部関数が露出していた・・・)
// 2017/08/22 : Property表示パネルにタイトル表示可能に
// 2017/08/?? : ページのhashが変更された場合、それに追従する。
// 2017/08/?? : svgImagesProps[].metaSchema, .script.transform,getCanvaSize,geoViewBox,location
// 2017/08/?? : レイヤーリストUIのサイズが収まるようにする
// 2017/09/29 : ルートにあるレイヤー限定だが、anim要素にdata-nocache（常に更新）属性での処理追加
// 2018/01/18 : checkTicker()での二重パース防止処理　これでようやくまともな路線に復帰したと思う　そろそろrev15正規リリース近いか？
// 2018/01/18 : from rev14 update: 2017/08/21 : defaultShowPoiPropertyをリッチなUIへ変更
// 2018/01/18 : from rev14 update: 2017/08/25 : Bug Fixed. ZoomUp/ZoomDownボタンが未定義の際、エラーで停止しない様変更
// 2018/01/18 : from rev14 update: 2017/08/25 : updateCenterPosをユーザが書き換えることができるよう変更
// 2018/01/18 : from rev14 update: 2017/08/29 : smoothZoomInterval,smoothZoomTransitionTimeを設定できるよう変更,getVerticalScreenScaleを外部よりcallできるよう公開
// 2018/01/17 : add parseEscapedCsvLine(),gpsCallback(),getTickerMetadata(),checkSmartphone(),reLoadLayer()
// 2018/01/29 : from rev14 update: レイヤーのパスを指定する際ドメインなしのフルパスで指定できるよう変更
// 2018/01/29 : from rev14 update: data-controllerをルートコンテナのレイヤー要素から指定できるよう機能追加
// 2018/02/02 : オブジェクトクリック機能のリファクタリング：testClickの機能とgetObjectAtPointをrev15で大幅拡張したtestTickerに統合 testClick, POItargetSelectionはこれにより不要となったので廃止、これに伴いPOI(img要素)に設置していた testClick EventListenerを全撤去
// 2018/02/05 : Rev15 Release クリーンナップ
// 2018/02/23 : <text>の改善
// 2018/02/26 : captureGISgeometriesでビットイメージタイル"Coverage"も取得可能とした　ただし、captureGISgeometriesOptionで設定した場合
// 2018/03/02 : useではなく直接imageで設置したnonScaling bitImageもPOIとして扱うようにした　結構大きい影響のある改修
// 2018/04/06 : Edge対応ほぼ完了したかな これに伴いuaProp新設　今後isIE,verIE,isSPをこれに統合したうえで、IE10以下のサポートを完全に切る予定
// 2018/06/01 : script実行ルーチンのデバッグ
// 2018/06/15 : script実行ルーチンのデバッグ
// 2018/06/19 : script実行ルーチンのデバッグ
// 2018/08/01 : TreatRectAsPolygonFlag
// 2018/09/04 : ビットイメージ(image要素)にstyle.imageRendering pixelated実装 ヒートマップなどを最小ファイルサイズ構築するためのもの(一応Edgeも対応*4Edge　今後このルーチンはEdge対応次第で廃止する)
// 2019/03/12 : authoring tools editing 判別小修整、imageRendering->image-rendering 修正
// 2019/04/16 : getHitPoint なるべく端を使わないように改良
// 2019/05/17 : captureGisGeometries()のCoverageのtransform対応
// 2019/10/20 : ビットイメージのDataURL有効化
// 2019/11/14 : refreshScreen()の排他制御導入
// 2019/11/14 : ビットイメージにもキャッシュ不使用オプション有効化
// 2019/11/14 : editableレイヤーでも、レイヤ非表示にしたら、DOMを消去することに仕様変更
// 2019/12/26 : refreshScreen()の効率化 主にcaptureGisGeometries()->vectorGISの高性能化を図るため
// 2020/01/30 : ラスターGISの高速化等を行うため、bitimageについてもproxy経由で取得させる機能を実装(svgMap.setProxyURLFactory)
// 2020/02/13 : ERR404やGETに時間がかかり過ぎたときのエラーアウト処理を強化(LayerUIも)
// 2020/03/26 : Rev16 データがLatLngで表示がメルカトルの表示モードを実装
// 2020/05/20 : DevicePixelRatioをレイヤーごとに設定できる機能を実装（PWAでオフラインモード時、DLしていないズームレンジで白紙表示になるのを抑制する目的を持っている）
// 2020/06/09 : svgImagesProps[layerID].preRenderControllerFunction, preRenderSuperControllerFunction, svgMap.setPreRenderController() そのレイヤーの描画前(svgの<script>要素のonzoom,onscroll関数と同じタイミング)に同期的に呼び出す関数(eval撤去準備工事) (なお、preRenderControllerFunctionは、レイヤ固有UIのscriptで予約関数名preRenderFunctionを定義するだけでも設置される
// 2020/08/14 : データのほうがメルカトル図法のモノを扱えるようにした。dynamicWebTile_pureMercator.svg参照
// 2020/08/14 :↑で準備できたのでメルカトル図法のビットイメージをPlateCareeに（その逆も）することを可能にしてみたい実装を開始
// 2020/08/19 : child2canvasもしくはchild2rootが非線形の(.transform,.inverseがある)場合、そのimgae要素のビットイメージを非線形変換する機能を発動させる。というのが基本路線だね。これにはcanvasへの読み込みとピクセルアクセスが多分必要なので、proxy経由でのimage取得が必要かな。
// 2020/10/23 : 3/26からのメルカトル図法サポート機能を汎化し、ユーザがscriptやdata-controllerで任意の図法を関数定義可能な機能を実装。これでMaps4WebWSで宣言していた機能要件を満たすことができた。
// 2021/01/26 : Rev16本流に載せる　効率化＆いくつか検証もできたため ～　16.xはこれにて終了　16とする
// 2021/04/02 : Rev17 cookie->localStorage, now loading の抑制, root documentをlocalStorageの設定をベースにした編集後のものを投入可能に　など, レイヤ構成編集用のツールを別フレームワークで用意(こちらはレイヤ編集用ページ別建てか？)
// 2021/06/14 : getLoadErrorStatistics() timeout等のロードエラーの統計
// 2021/08/10 : image要素 data-mercator-tile="true"サポート
// 2021/09/06 : image要素 style:filterサポート (なお、このスタイルの継承はしない・・)
// 2021/09/16 : ラスターGISを高速化するときなどに使う、ベクタデータの描画をスキップする機構(captureGISgeometriesOption(,, SkipVectorRenderingFlg ))
// 2021/10/29 : Angularや他FWのCSSが与えるimg要素のwidth,maxWidth等のstyleをオーバーライドし表示崩れを防止
// 2021/11/04 : ビットイメージの任意図法対応機能() imageTransformを改良：transformがあるimage要素に対応
// 2022/03/04- : rev18 svgコンテンツのscript要素の処理をレイヤ固有UIのwebAppに統合
// 2022/04/12 : image:crossorigin(値は見てない), svgMap.getCORSURL()  from rev17branch
// 2022/04/12 : line Hittesterの改善 (use isPointInStroke) from rev17branch
// 2022/05/16 : customHitTester from rev17
// 2022/05/30 : pixelated, opacity,filterのDOM操作を反映させる from rev17
// 2022/09/22 : customHitTesterに、isMapCenterHitTestで(伸縮スクロール時自動発生する)中心ヒットテストなのかどうかを送信できるようにした from rev17
// 2022/09/26 : 指定したレイヤーに対して共通クエリパラメータを付与する仕組み(commonQuery)を設置(コンテンツ取得用tokenの設定などで使用できる) from rev17
// 2022/10/31 : Shift + drag zoom実装 from rev17
// 2022/12/05 : PCでもタッチ対応 from rev17
// 2022/05/24- ESM&class化 作業中・・
// 2023/02/15 : 線のヒットテスト改善し、getHitPoint廃止(PathRenderer)
// 2023/04/07 : ビットイメージアイコンを中心としたパフォーマンスチューニング
// 2023/04/21 : ベクトルグラフィックスのパフォーマンスチューニング(XML属性キャッシュ)
// 2023/05/24 : mapcanvasを囲むmapCanvasWrapperをつくりイベント検出に使い、右クリック下ドラッグによるズームアウトの操作性を改善(サイドエフェクトを少し注意しておく)
// 2023/06/22 : wheelイベント(含タッチパッドのジェスチャ)によるズーム処理を改良
// 2023/11/27 : captureGISgeometriesOption : add captureAlsoAsBitImage
// 2023/11/27 : svgImageProps.isClickableをbooelanではなくobjectに。ハイライトのカスタマイズを可能に
// 2023/12/28 : SVGMap*Class*.jsはクラス定義を、SVGMap*module.jsは、SvgMapインスタンスの生成を行うコード(ほぼ空)に分離。
// 2024/02/06 : LayerSpecificWebAppHandlerのLayerUIからの分離に対応。
// 2024/08/06 : コンテナ差分ファイル指定機能：(#customLayers=customLayer0.json
//
// Issues:
// 2022/03/17 getVectorObjectsAtPointの作法が良くない
// 2021/10/14 ルートsvgのレイヤ構成をDOMで直接操作した場合、LayerUIが起動/終了しない（下の問題の根源）mutation監視に相当するものが必要（トラバースしているので監視できるのではと思う）
// 2021/10/13 FIXED setRootLayersPropsを単体で呼んだだけだと、LayerUIが起動/終了しない。(updateLayerListUI～updateLayerListUIint～updateLayerTable必要)これは本質的にまずい。
// 2021/09/13 captureGISgeo. "ロードできてないイメージは外す"(これで検索して出る場所)のロジックが雑、動的レイヤー取りこぼす可能性がある。読み込み完了(zoomPanMap ev)時点で確認する形が好ましいと思う。
// 2020/09/11 ビットイメージとベクターの混合レイヤーで、上下関係がDOM編集によっておかしくなることがある～digitalTyphoonレイヤーに風向を追加したとき、風速イメージのimage要素を消去して再追加する処理をすると（モデルを変えるときにそういう処理が入る）、最初は下にイメージが表示されるが、差異追加後上に来てしまう。　この辺昔imageはなるべく上にくるようにした記憶もあるので、いろいろ怪しい感じがする。
// 2018/09/07 .scriptが　そのレイヤーが消えても残ったまま　setintervalとかしていると動き続けるなど、メモリリークしていると思う　やはりevalはもうやめた方が良いと思う・・
// 2018/6/21 SvgImagesProps　もしくは　rootLayersProps?にそのレイヤのデータの特性(POI,Coverage,Line etc)があると便利かも
// 2018/6/21 もはやXHRでsvgを取得するとき、XMLとして取得しないほうが良いと思われる(独自の編集後にwell formed XMLとして扱っているので)
// 2018/3/9 メタデータのないPOIが単にクリッカブルになる。またvectorPOIはclickableクラスを設定しないとクリッカブルでないなどちょっとキレイでない。
// 2018/3/5 FIXED Vector2DのcircleがcaptureGISで正しい値が取れてない？
// 2018/3/5 visibility hiddenのVector2Dがヒットテストにかかってしまうらしい？imageも要確認
// (probably FIXED) 2016/06 Firefoxでヒープが爆発する？(最新48.0ではそんなことはないかも？　たぶんfixed？)
// 2016/12 ほとんどすべてのケースでtransformが使えない実装です (transform matrix(ref))とか特殊なものとCRSのみ
// 2016/12 FIXED EdgeでOpacityが機能してない(たぶんIE専用Opacity処理が影響してると思う・・・)
// (probably FIXED) 2016/12 Resumeのレイヤ選択レジュームが遅い回線で動かない(非同期の問題か)
// (probably FIXED) 2016/12 初回ロード時のhtml DOMクリーンナップができていない
// 2017/01 FIXED? Authoring Tools Ext.で編集中にResumeが動かない
// 2017/01 FIXED? レイヤーがOffになっているときに、レイヤ特化UIが出たまま(これは本体の問題ではないかも)
// 2017/02 FIXED? getElementByIdNoNSの問題が再び。　plane XMLとなっている文書では、IEもgetElementById使えない。.querySelector('[id="hoge"]'));は使えるので・・・対策したが、そもそもXML:IDの機能(重複しないID)を満たした機能を提供していない
// 2017/08 FIXED? ズームアップボタンを連打すると拡大アニメが崩れる？(Firefox 54.01 only? グラフィックスバッファのオーバーフローか?)
// 2017/08 FIXED centerSightのオブジェクト検索(の特に2D Vector)がスクロール＆レンダリング後必ず動くようになった。(checkTickerが起動)これは全ドキュメントのパース処理を伴い、レンダリングとダブっていて重い・非効率と思う・・　あらかじめhitPointを指定してレンダリングとオブジェクト検索を一回のループで実現できないだろうか？
// 2017/09 FIXED LandSlideのベクトルが表示された状態で、最初のパース後透明度が設定されてない　もしくは二重書き？　Active Faultでも同じだった　二重書きの様子が濃厚
// 2017/08/29 FIXED ERR404が発生すると、その後レイヤーのON/OFFしても伸縮スクロールしない限り表示がされないなど　動きがおかしく
//
// ToDo:
// 地図画面クリックのカスタマイズ機構（ビットイメージのある部分をクリックしたらそれに紐付いたデータを表示したいとか）→checkTicker()に仕掛けられるような
// 各要素のdisplay,visibilityがcss style属性で指定しても効かない
// 動的レイヤーで重ね順が破綻する(see http://svg2.mbsrv.net/devinfo/devkddi/lvl0/locally/nowcastHR/)
// IE < 11実装の除去
// POIや2Dベクタをクリックしたとき、レイヤ文書に対して、イベントを飛ばしてあげると良いと思う
//
// devNote:
// http://svg2.mbsrv.net/devinfo/devkddi/lvl0.1/airPort_r4.html#svgView(viewBox(global,135,35,1,1))
// isPointInPath plolygonのばあいはそのまま、lineの場合は、このルーチンで生成したpathHitPoitnに小さなポリゴン(rect)を生成し、そこだけで、hittestする　これならばHTMLDOMへの影響が無いので、改修範囲が広範囲にならないかと思う。
// testClickedは何のためのもの？ 2018.2.2 のtestClickの廃止とともにこの変数及びセッター関数も廃止した
//
// 重複が疑われる関数  (getSymbolProps, getImageProps)
// rootContainerでvector2Dが入ると破綻する 2014.7.25
//
// ToDo : LineとかPolygonとか（文字とか^^;）？
// ToDo : 注記表示[htmlかcanvasか?]、メタデータ検索
// ToDo : IE以外でcanvas外でドラッグズーム動作とまる挙動
//

"use strict"; // 2022/05/06 Strictに移行します

import { SvgMapLayerUI } from "./SVGMapLv0.1_LayerUI_r6module.js";
import { SvgMapAuthoringTool } from "./SVGMapLv0.1_Authoring_r8_module.js";
import { SvgMapCustomLayersManager } from "./SVGMapLv0.1_CustomLayersManager_r3module.js";
import { SvgMapCesiumWrapper } from "./3D_extension/SVGMapLv0.1_CesiumWrapper_r4module.js";

// coreJsの部品群
import { LayerSpecificWebAppHandler } from "./libs/LayerSpecificWebAppHandler.js";
import { MatrixUtil, Mercator } from "./libs/TransformLib.js";
import { ZoomPanManager } from "./libs/ZoomPanManager.js";
import { UAtester } from "./libs/UAtester.js";
import { GeometryCapture, SVGMapGISgeometry } from "./libs/GeometryCapture.js";
import { SvgMapElementType } from "./libs/SvgMapElementType.js";
import { BuiltinIcons } from "./libs/BuiltinIcons.js";
import { TernarySimultaneousEquationsSolution } from "./libs/TernarySimultaneousEquationsSolution.js";
import { UtilFuncs } from "./libs/UtilFuncs.js";

import { MapTicker } from "./libs/MapTicker.js";
import { CustomModal } from "./libs/CustomModal.js";
import { ResumeManager } from "./libs/ResumeManager.js";
import { ProxyManager } from "./libs/ProxyManager.js";
import { LinkedDocOp } from "./libs/LinkedDocOp.js";
import { PathRenderer } from "./libs/PathRenderer.js";
import { SvgStyle } from "./libs/SvgStyle.js";
import { LayerManager } from "./libs/LayerManager.js";
import { GPS } from "./libs/GPS.js";
import { ImgRenderer } from "./libs/ImgRenderer.js";
import { EssentialUIs } from "./libs/EssentialUIs.js";
import { MapViewerProps } from "./libs/MapViewerProps.js";
import { ResourceLoadingObserver } from "./libs/ResourceLoadingObserver.js";

import { SvgImageProps } from "./libs/SvgImageProps.js";

class SvgMap {
	#commonDevicePixelRatio = 1.0; // zoom計算時のみに用いる たとえば２にするとzoom値が本来の２分の１になる(2014/07/16)
	#layerDevicePixelRatio = []; // 2020/5/13 レイヤーIDの連想配列 レイヤーごとの値(commonDevicePixelRatioにさらに掛け算で効く)

	#summarizeCanvas = true; // added 2014.5.27 レイヤ単位でcanvas2dを統合

	#loadingTransitionTimeout = 7000; // LODの読み込み遷移中のホワイトアウト防止処理や。XMLロード処理のタイムアウト[msec]（この時間を超えたらbitImageもSVGdoc(2020/2/13)もスキップする

	#mapx = 138;
	#mapy = 37;

	// 以下の6メンバーは#mapViewerPropsオブジェクトとして再構成
	//#mapCanvas; // 地図キャンバスとなる、おおもとのdiv要素
	//#mapCanvasSize={}; // そのサイズ (このメンバーはconst扱いにするべきです)
	//#rootViewBox; // aspectを加味し実際に開いているルートSVGのviewBox
	//#rootCrs; // ルートSVGのCRS ( geo->rootのsvg ) 2020/3/17 matrixだけでなく関数(当初はメルカトル変換)(transform(geo->mercatorRoot),inverse(その逆))になるケースがある
	//#root2Geo; //上の逆 ( rootのsvg - > geo ) 2020/3/17 transform関数が入るケースがある
	//#uaProps;
	#mapViewerProps;

	// https://teratail.com/questions/279165　でconst化するのが良いかも⇒これもmapViewerPropsに統合予定
	#svgImages = {}; // svg文書群(XML) arrayのハッシュキーはimageId("root"以外は"i"+連番)
	#svgImagesProps = {}; // 同svg文書群の .Path,.CRS,.script,.editable,.editing,.isClickable,.parentDocId,.childImages,.controller,.metaSchema

	#ticker; // Ticker文字のdiv要素
	#tickerTable; // 同 table要素

	// SVGMap.jsの拡張クラスのインスタンス
	#svgMapLayerUI;
	#layerSpecificWebAppHandler;
	#svgMapAuthoringTool;
	#svgMapCustomLayersManager;
	#svgMapCesiumWrapper;

	// SVGMap.js内部クラスのインスタンス
	#matUtil;
	#zoomPanManager;
	#geometryCapturer;
	#mapTicker;
	#customModal;
	#resumeManager;
	#proxyManager;
	#linkedDocOp;
	#pathRenderer;
	#svgStyle;
	#layerManager;
	#gps;
	#imgRenderer;
	#essentialUIs;
	#resourceLoadingObserver;

	constructor() {
		this.#mapViewerProps = new MapViewerProps();
		var that = this;
		console.log("init");
		UtilFuncs.addEvent(
			window,
			"load",
			function () {
				that.#initLoad();
			}.bind(this),
		);
		UtilFuncs.addEvent(
			window,
			"hashchange",
			function () {
				// that.#resumeManager.resumeFirstTime = true; // 2024/5/2 ハッシュの変化でresumeの挙動を変えるのはおかしいと思われるのでコメントアウト
				that.#refreshScreen();
				if (typeof this.#updateLayerListUIint == "function") {
					// レイヤリストUIが不整合起こす場合がある(レイヤをon/of指示するケース)。さらにそれに連動してUI自動起動も起きない
					setTimeout(
						function () {
							this.#updateLayerListUIint();
						}.bind(this),
						300,
					);
				}
			}.bind(this),
		);

		this.#matUtil = new MatrixUtil();
		this.#proxyManager = new ProxyManager();
		this.#svgMapAuthoringTool = new SvgMapAuthoringTool(
			this,
			this.#mapViewerProps,
		);
		this.#layerSpecificWebAppHandler = new LayerSpecificWebAppHandler(
			this,
			this.#svgMapAuthoringTool,
			this.#getLayerStatus,
		);
		this.#svgMapLayerUI = new SvgMapLayerUI(
			this,
			this.#layerSpecificWebAppHandler,
		);
		this.#layerSpecificWebAppHandler.setLayerUIobject(this.#svgMapLayerUI);

		this.#svgMapCustomLayersManager = new SvgMapCustomLayersManager(
			this,
			this.#svgMapLayerUI.getLayersCustomizer,
		);
		this.#resourceLoadingObserver = new ResourceLoadingObserver(
			this.#mapViewerProps,
			this.#svgImagesProps,
			this.#svgImages,
			this.#refreshScreen,
			this.#viewBoxChanged,
		);

		this.#layerManager = new LayerManager(
			this.#svgImagesProps,
			this.#svgImages,
			this.#resourceLoadingObserver.loadingImgs,
			this.#refreshScreen,
		);
		this.#mapTicker = new MapTicker(
			this,
			this.#matUtil,
			this.#layerManager.isEditingLayer,
			this.#layerManager.getLayerName,
			this.#resourceLoadingObserver.setLoadCompleted,
			this.#svgMapAuthoringTool,
		); // 照準があるときは、Ticker機能をONにする 2013/1/11
		this.#customModal = new CustomModal(this.#mapTicker);

		this.#svgMapCesiumWrapper = new SvgMapCesiumWrapper(this);
		this.#geometryCapturer = new GeometryCapture(this, UtilFuncs.getImageURL);
		this.#pathRenderer = new PathRenderer(
			this.#geometryCapturer,
			this.#matUtil,
			this.#mapTicker,
			this.#mapViewerProps,
		);
		this.#imgRenderer = new ImgRenderer(
			this,
			this.#resourceLoadingObserver.loadingImgs,
			this.#proxyManager,
			this.#loadingTransitionTimeout,
			this.#mapViewerProps,
			this.#matUtil,
			this.#resourceLoadingObserver.checkLoadCompleted,
			this.#loadErrorStatistics,
		);
		this.#resourceLoadingObserver.init(
			this.#imgRenderer,
			this.#mapTicker,
			this.#geometryCapturer,
		); //resourceLoadingObserverの第二初期化・・
		this.#resumeManager = new ResumeManager(
			this,
			this.#svgMapCustomLayersManager,
			function (documentElement, symbols) {
				this.#parseSVG(
					documentElement,
					"root",
					this.#mapViewerProps.mapCanvas,
					false,
					symbols,
					null,
					null,
					true,
				);
			}.bind(this),
		);
		this.#linkedDocOp = new LinkedDocOp(this);
		this.#svgStyle = new SvgStyle(UtilFuncs.getNonScalingOffset);
	}

	async #initLoad() {
		// load時に"一回だけ"呼ばれる 2024/8/6 async化

		if (this.#mapViewerProps.hasUaProps()) {
			console.log("Already initialized. Exit...");
		}

		this.#zoomPanManager = new ZoomPanManager(
			this.#mapTicker.hideTicker,
			this.#resourceLoadingObserver.checkLoadCompleted,
			this.#mapTicker.getObjectAtPoint,
			this.#getIntValue,
			this.#getRootSvg2Canvas,
			this.#mapViewerProps,
			this,
		);
		this.#essentialUIs = new EssentialUIs(
			this,
			this.#mapViewerProps,
			this.#zoomPanManager,
			this.#mapTicker,
			this.#matUtil,
			this.#hideAllTileImgs,
			this.#getRootSvg2Canvas,
		);

		var rootSVGpath = this.#essentialUIs.initMapCanvas();
		if (!rootSVGpath) {
			return;
		}

		//	console.log("AppName:",navigator.appName,"  UAname:",navigator.userAgent);
		//	if ( navigator.appName == 'Microsoft Internet Explorer' && window.createPopup )
		this.#mapViewerProps.uaProps = new UAtester();

		//this.#mapViewerProps.mapCanvas.title = ""; // titleにあると表示されてしまうので消す
		//	console.log(mapCanvas);
		this.#mapViewerProps.setMapCanvasSize(UtilFuncs.getCanvasSize());

		if (!this.#mapViewerProps.hasMapCanvasSize()) {
			console.log("retry init....", this.#mapViewerProps.mapCanvasSize);
			this.#mapViewerProps.uaProps = null;
			setTimeout(
				function () {
					this.#initLoad();
				}.bind(this),
				50,
			);
			return; // どうもwindow.openで作ったときに時々失敗するので、少し(30ms)ディレイさせ再挑戦する
		}

		this.#gps = new GPS(this);

		this.#mapViewerProps.setRootViewBox(
			UtilFuncs.getBBox(
				0,
				0,
				this.#mapViewerProps.mapCanvasSize.width,
				this.#mapViewerProps.mapCanvasSize.height,
			),
		);

		// この辺の初期化は、上記initMapCanvasも含め、#essentialUIs.init()で一発設定したほうが良いと思われる
		this.#essentialUIs.setMapCanvasCSS(this.#mapViewerProps.mapCanvas); // mapCanvasに必要なCSSの設定 2012/12
		this.#essentialUIs.setPointerEvents();
		this.#essentialUIs.setCenterUI(); // 画面中心の緯緯度を表示するUIのセットアップ
		this.#essentialUIs.initNavigationUIs(this.#mapViewerProps.uaProps.isSP);
		this.#resumeManager.setInitialCustomLayers(
			await this.#essentialUIs.prepareInitialCustomLayers(),
			rootSVGpath,
		); // 2024/8/6 カスタムレイヤー設定読み込み

		this.#loadSVG(rootSVGpath, "root", this.#mapViewerProps.mapCanvas);
	}

	#setLayerDivProps(id, parentElem, parentSvgDocId) {
		// parseSVGから切り出した関数 2017.9.29
		if (parentSvgDocId) {
			if (parentSvgDocId == "root") {
				// 現在対象としているsvgImagesPropsではなく子供のpropsに書き込んでいる点に注意！
				this.#svgImagesProps[id].rootLayer = id;
				parentElem.setAttribute("class", "rootLayer:" + id);
				//				console.log("parentElem:",parentElem);
				if (parentElem.getAttribute("data-nocache")) {
					// ルートレイヤに対するnoCacheしか見ないことにする 2017.9.29
					this.#svgImagesProps[id].noCache = true;
				}
			} else {
				this.#svgImagesProps[id].rootLayer =
					this.#svgImagesProps[parentSvgDocId].rootLayer;
				parentElem.setAttribute(
					"class",
					"rootLayer:" + this.#svgImagesProps[parentSvgDocId].rootLayer,
				);
			}
		}
	}

	// loadSVG(this)[XHR] -(非同期)-> handleResult[buildDOM] -> dynamicLoad[updateMap] -> parseSVG[parseXML & set/chgImage2Canvas] -> (if Necessary) ( (if Unloaded child) loadSVG(child)-(非同期)->... || (if already loaded child) parseSVG(child)... )
	// なお、起動時はloadSVGからだが、伸縮,スクロール,レイヤON/OFFなどでの読み込み表示処理の起点はdynamicLoadから(rootの文書は起動時に読み込み済みで変わらないため)
	/**
	 *
	 * @param {String} path
	 * @param {String} id
	 * @param {Document} parentElem
	 * @param {*} parentSvgDocId -- 不明
	 */
	#loadSVG(path, id, parentElem, parentSvgDocId) {
		//	console.log("called loadSVG  id:",id, " path:",path);
		if (!this.#svgImages[id]) {
			//		console.log("call loadSVG  create svgImagesProps id:",id);
			this.#svgImagesProps[id] = new SvgImageProps(); //  2014.5.27 ⇒ 2024.10.1 SvgImageProps classをようやく造ることにした・・

			// 2014.5.27 canvas統合用に、rootLayerPropに、"root"のレイヤーのidを子孫のレイヤーに追加
			// 2017.9.29 nocache処理のため、こちらに移動
			this.#setLayerDivProps(id, parentElem, parentSvgDocId);
			var that = this;
			//		var httpObj = createXMLHttpRequest( function(){ return handleResult(id , path , parentElem , this); } );
			var httpObj = this.#createXMLHttpRequest(
				function () {
					that.#handleResult(id, path, parentElem, this, parentSvgDocId);
				},
				function () {
					that.#handleErrorResult(id, path, this, true);
				},
			);

			if (httpObj) {
				//			console.log(" path:" + path);
				this.#resourceLoadingObserver.loadingImgs[id] = true;

				// 強制的にキャッシュを除去するオプションを実装 2017.9.29
				// rootLayersProps[thisDoc's rootLayer=].noCacheがtrueの場合に発動する
				var rPath = path;
				if (
					this.#svgImagesProps[id].rootLayer &&
					this.#svgImagesProps[this.#svgImagesProps[id].rootLayer].noCache
				) {
					rPath = UtilFuncs.getNoCacheRequest(rPath);
				}

				// 今後、ファイルのヘッダーにcommonQueryを埋め込むかもしれないためsvgImagesProps[id].commonQueryを設定しておきます
				const tempComQuery =
					this.#svgImagesProps[id].commonQuery ||
					this.#svgImagesProps[this.#svgImagesProps[id].rootLayer]?.commonQuery; // ?. : オプショナルチェーンという書き方でアクセス元がNullでも途中でエラーとならない書き方
				if (tempComQuery != undefined) {
					// 認証キーなどに用いるレイヤー(もしくはフレームワーク全体)共通クエリストリング
					rPath = UtilFuncs.addCommonQueryAtQueryString(rPath, tempComQuery);
					this.#svgImagesProps[id].commonQuery = tempComQuery; //Rootのプロパティ
				}

				rPath = this.#proxyManager.getAccessInfo(rPath);
				httpObj.open("GET", UtilFuncs.getSvgReq(rPath), true);

				if (this.#mapViewerProps.uaProps.MS && httpObj.ontimeout) {
					// MS(IEだけ？)のXHRはopen後にtimeoutを設定しないとエラーになる
					httpObj.timeout = this.#loadingTransitionTimeout;
				}
				httpObj.send(null);
			}
			//		console.log("make XHR : ", id);
		} else {
			// 過去にロードしていて、svgImagesに残っている場合(editableレイヤー)はそれを使う(handleResultを飛ばしてdynamicLoadする) 2013/7/2x
			delete this.#resourceLoadingObserver.loadingImgs[id];
			this.#setLayerDivProps(id, parentElem, parentSvgDocId); // 2017.10.04
			this.#dynamicLoad(id, parentElem);
		}
	}

	/**
	 * @function ERR404時や、timeout時に行う処理
	 *
	 * @param {String} docId
	 * @param {String} docPath
	 * @param {Response} httpRes
	 * @param {Boolean} isTimeout
	 * @returns {undefined}
	 */
	#handleErrorResult(docId, docPath, httpRes, isTimeout) {
		// ERR404時や、timeout時に行う処理(2020/2/13 timeout処理を追加)
		delete this.#resourceLoadingObserver.loadingImgs[docId]; // debug 2013.8.22
		console.log(
			"File get failed: Err:",
			httpRes.status,
			" Path:",
			docPath,
			" id:",
			docId,
		);
		if (this.#svgImagesProps[docId]) {
			// 2020/2/13 removeUnusedDocs() により恐らく以下の処理は不要 じゃなかった(2021/2/17)
			this.#svgImagesProps[docId].loadError = true; // 2021/2/17
		}
		if (isTimeout) {
			++this.#loadErrorStatistics.timeoutSvgDocCount;
		} else {
			++this.#loadErrorStatistics.otherSvgDocCount;
		}
		this.#resourceLoadingObserver.checkLoadCompleted();
		return;
	}

	/**
	 * @function
	 * @name handleResult
	 *
	 * @param {String} docId
	 * @param {String} docPath
	 * @param {Document} parentElem
	 * @param {Response} httpRes
	 * @param {String} parentSvgDocId
	 * @returns {undefined}
	 */
	#handleResult(docId, docPath, parentElem, httpRes, parentSvgDocId) {
		//	console.log("httpRes:id,res:",docId,httpRes);
		if (httpRes.readyState == 4) {
			if (!this.#svgImagesProps[docId]) {
				// 読み込み途中でそのタイルが不要になるケースがある(高速にスクロールすると、removeUnused..で消される) 2020/1/24
				console.log(
					"NO svgImagesProps[docId] : docId:",
					docId,
					"  skip processing",
				);
				delete this.#resourceLoadingObserver.loadingImgs[docId];
				this.#resourceLoadingObserver.checkLoadCompleted();
				return;
			}
			if (
				httpRes.status == 403 ||
				httpRes.status == 404 ||
				httpRes.status == 500 ||
				httpRes.status == 503
			) {
				this.#handleErrorResult(docId, docPath, httpRes);
				return; // 2021/2/17 ERR404強化
			}
			if (httpRes.responseText.indexOf("http://www.w3.org/2000/svg") >= 0) {
				// 2014.1.23 path以外もいろいろIEでは不具合が出るため、すべて対象に
				var resTxt = httpRes.responseText.replace(
					'xmlns="http://www.w3.org/2000/svg"',
					'xmlns="http://www.w3.org/"',
				); // ネームスペースを変えるだけにとどめてもOKの模様

				// 2017.2.21 data-controller-srcを探し、あれば.controller設定＆除去
				if (resTxt.match(/data-controller-src([\s\S]*)"/)) {
					resTxt = UtilFuncs.getControllerSrc(
						resTxt,
						this.#svgImagesProps[docId],
					);
				}
				if (resTxt.match(/<script>([\s\S]*)<\/script>/)) {
					// 2022/3/4
					resTxt = UtilFuncs.getSvgScript(resTxt, this.#svgImagesProps[docId]);
				}

				//				resTxt = resTxt.replace(/.*<!DOCTYPE html>.*</,'<'); // 2014.4.25 IE11 で怪しい挙動 <script>があると勝手にDOCTYPE htmlをつけているかんじがするぞ！！！
				this.#svgImages[docId] = new DOMParser().parseFromString(
					resTxt,
					"application/xml",
				);
			} else {
				// このケースはなくすべき
				this.#svgImages[docId] = new DOMParser().parseFromString(
					httpRes.responseText,
					"application/xml",
				);
			}

			if (this.#svgImages[docId].getElementsByTagName("svg").length < 1) {
				// エラー文書・・ added 2021/08/04
				console.warn("DOCUMENT ERROR.. skip");
				delete this.#svgImages[docId];
				this.#handleErrorResult(docId, docPath, httpRes);
				return;
			}
			this.#svgImages[docId].getElementById =
				UtilFuncs.getElementByIdUsingQuerySelector; // added 2017.2.3
			this.#svgImagesProps[docId].Path = docPath;
			this.#svgImagesProps[docId].CRS = this.#getCrs(
				this.#svgImages[docId],
				docId,
			);
			this.#svgImagesProps[docId].refresh = UtilFuncs.getRefresh(
				this.#svgImages[docId],
			);

			// 2023/4/18 ベクタ描画性能向上策
			this.#svgImagesProps[docId].styleMap = new WeakMap();
			this.#svgImagesProps[docId].altdMap = new WeakMap();
			var mutationObs = new MutationObserver(
				function (mutations) {
					// 2023/4/19 MutationObserverで、キャッシュ不整合の解消を実施
					mutations.forEach(
						function (mutation) {
							if (mutation.type == "attributes") {
								//							console.log("Detect attr change, delete parsed cache for : ",mutation.target);
								this.#svgImagesProps[docId].styleMap.delete(mutation.target);
								this.#svgImagesProps[docId].altdMap.delete(mutation.target);
							}
						}.bind(this),
					);
				}.bind(this),
			);
			mutationObs.observe(this.#svgImages[docId].documentElement, {
				subtree: true,
				childList: true,
				attributes: true,
				characterData: true,
			});
			this.#svgImagesProps[docId].domMutationObserver = mutationObs; // delete 直前にsvgImagesProps[docId].domMutationObserver を.disconnect();したほうが良いのかも？

			this.#updateMetaSchema(docId); // added 2017.8.10  2018.2.26 関数化
			this.#svgImagesProps[docId].isSVG2 =
				this.#svgImagesProps[docId].CRS.isSVG2; // ちょっとむりやり 2014.2.10
			this.#svgImagesProps[docId].parentDocId = parentSvgDocId; // 親の文書IDを格納

			if (
				this.#svgImagesProps[parentSvgDocId] &&
				this.#svgImagesProps[parentSvgDocId].childImages[docId] ==
					SvgMapElementType.CLICKABLE
			) {
				this.#svgImagesProps[docId].isClickable = { value: true }; // 2023/11/27 boolean->obj
			}

			this.#setController(
				this.#svgImages[docId],
				docPath,
				this.#svgImagesProps[docId],
			); // 2016.10.14
			// ルートコンテナSVGのロード時専用の処理です・・・ 以下は基本的に起動直後一回しか通らないでしょう
			if (docId == "root") {
				this.#mapViewerProps.rootCrs = this.#svgImagesProps[docId].CRS;
				this.#mapViewerProps.root2Geo = this.#matUtil.getInverseMatrix(
					this.#mapViewerProps.rootCrs,
				);
				var viewBox = this.#getViewBox(this.#svgImages["root"]);
				this.#mapViewerProps.setRootViewBox(
					UtilFuncs.getrootViewBoxFromRootSVG(
						viewBox,
						this.#mapViewerProps.mapCanvasSize,
						this.#essentialUIs.ignoreMapAspect,
					),
				);
			} else {
				if (this.#layerManager.isEditableLayer(docId)) {
					this.#svgImagesProps[docId].editable = true;
				}
			}
			this.#dynamicLoad(docId, parentElem);
		}
	}
	/*
	}}
	*/

	#existNodes = new Object(); // 存在するノードのidをハッシュキーとしたテーブル

	/**
	 *
	 * @param {Number} docId
	 * @param {Object} parentElem   多分XMLDocumentだと思っています
	 */
	#dynamicLoad(docId, parentElem) {
		// アップデートループのルート：ほとんど機能がなくなっている感じがする・・
		if (!docId && !parentElem) {
			docId = "root";
			parentElem = this.#mapViewerProps.mapCanvas;
		}
		var svgDoc = this.#svgImages[docId];
		svgDoc.documentElement.setAttribute("about", docId);

		parentElem.setAttribute("property", this.#svgImagesProps[docId].metaSchema); // added 2012/12
		var symbols = UtilFuncs.getSymbols(svgDoc); // シンボルの登録を事前に行う(2013.7.30)
		if (docId == "root") {
			this.#resourceLoadingObserver.usedImages = {};
			this.#mapTicker.pathHitTester.setCentralVectorObjectsGetter(); // 2018.1.18 checkTicker()の二重パースの非効率を抑制する処理を投入
			if (!this.#layerManager.setRootLayersPropsPostprocessed.processed) {
				// 2021/10/14 updateLayerListUIint()必須し忘れ対策
				if (typeof this.#updateLayerListUIint == "function") {
					this.#updateLayerListUIint();
				}
				this.#layerManager.setRootLayersPropsPostprocessed.processed = true;
			}
			//		console.log("called root dynamicLoad");

			if (this.#summarizeCanvas) {
				this.#resetSummarizedCanvas();
			}
			this.#mapTicker.hideTicker();
			this.#essentialUIs.updateCenterPos();
			this.#essentialUIs.setGeoViewBox(
				this.#matUtil.getTransformedBox(
					this.#mapViewerProps.rootViewBox,
					this.#mapViewerProps.root2Geo,
				),
			);
			if (!this.#mapTicker.pathHitTester.enable) {
				this.#existNodes = new Object();
				this.#mapTicker.poiHitTester.clear();
			}
			this.#resumeManager.checkResume(svgDoc.documentElement, symbols); // 2016/12/08 bug fix 2016/12/13 more bug fix

			this.#clearLoadErrorStatistics();
		}
		if (this.#layerManager.setRootLayersPropsPostprocessed.execHint[docId]) {
			this.#svgImagesProps[docId]._execHint =
				this.#layerManager.setRootLayersPropsPostprocessed.execHint[docId];
			delete this.#layerManager.setRootLayersPropsPostprocessed.execHint[docId];
		}
		this.#parseSVG(
			svgDoc.documentElement,
			docId,
			parentElem,
			false,
			symbols,
			null,
			null,
		);
		delete this.#resourceLoadingObserver.loadingImgs[docId];

		if (docId == "root") {
			if (typeof this.#setLayerUI == "function") {
				this.#setLayerUI({
					// updateLayerListUITiming : "setRootLayersProps", // 2021/10/29 ->2024/2/7 obsoluted
					// getLayerStatus : this.#getLayerStatus, // 2022/03/11 =>LayerSpecificWebAppHandlerに移動したので不要 2024/2/5
				}); // add 2013/1 moved from  handleResult 2014/08
				this.#layerSpecificWebAppHandler.initLayerSpecificUI();
				//this.#layerSpecificWebAppHandler.startLayerLoadingMonitor();
				this.#setLayerUI = null; // added 2016/10/13 最初にロードされた直後のみ呼び出すようにした（たぶんこれでＯＫ？）
			}
			this.#checkDeletedNodes(this.#mapViewerProps.mapCanvas);
			if (
				this.#mapTicker.isEnabled() &&
				!this.#mapTicker.pathHitTester.enable &&
				!this.#geometryCapturer.GISgeometriesCaptureFlag
			) {
				// スマホなどでクリックしやすくするためのティッカー ただし単なるpathHitTestのときは無限ループが起きるのでパスする 2017.7.31 pathHitTest.enableチェックせずとも無限ループは起きなくなったはず 2018.1.18 GISgeometriesCapture中はtickerの表示は不要なので高速化のため外す2019.12.26
				this.#mapTicker.checkTicker(); // ここで呼び出しただけでは、ロード中のレイヤのオブジェクトは拾えないので、スクロール・伸縮などで新たに出現するオブジェクトはTicker表示されない(ちょっとスクロールするとかしないと表示されない) バグに近いです
			}
		}
		if (!this.#mapTicker.pathHitTester.enable) {
			// 2017.8.18 debug pathHitTestのときは"画面の描画完了"確認もやってはまずい・・ geojsonの獲得に関しても同様と思うが、こちらはscreenrefreshedイベントを起点に処理しているのでできない・・ pathHitTestとgeojson取得でロジックが違うのが気になる・・・
			this.#resourceLoadingObserver.checkLoadCompleted(); // 読み込みがすべて完了したらtoBeDelのデータを消去する
		}
	}

	#handleScript(docId, zoom, child2root) {
		this.#svgImagesProps[docId].script.location = UtilFuncs.getSvgLocation(
			this.#svgImagesProps[docId].Path,
		); // added 2017.9.5 ハッシュが書き換わる可能性を加味
		this.#svgImagesProps[docId].script.scale = zoom * child2root.scale;
		this.#svgImagesProps[docId].script.actualViewBox =
			this.#matUtil.getTransformedBox(
				this.#mapViewerProps.rootViewBox,
				this.#matUtil.getInverseMatrix(child2root),
			); // *ViewBoxは間違い・viewportが正しい・・互換のために残す・・・
		this.#svgImagesProps[docId].script.geoViewBox =
			this.#essentialUIs.geoViewBox;
		this.#svgImagesProps[docId].script.viewport =
			this.#svgImagesProps[docId].script.actualViewBox; // debug 2014.08.06
		this.#svgImagesProps[docId].script.geoViewport =
			this.#essentialUIs.geoViewBox; // debug
		var vc = this.#viewBoxChanged(docId);
		this.#svgImagesProps[docId].script.handleScriptCf(); // ここで、上記の値をグローバル変数にセットしているので、追加したらhandleScriptCfにも追加が必要です！ 2017.8.17
		if (vc == "zoom" || this.#svgImagesProps[docId].script.initialLoad) {
			// zooming
			this.#svgImagesProps[docId].script.initialLoad = false;
			if (this.#svgImagesProps[docId].script.onzoom) {
				this.#svgImagesProps[docId].script.onzoom();
			}
		} else if (vc == "scroll") {
			// scrollもzoomもしてないonrefreshscreenみたいなものがあるのではないかと思うが・・・ 2017.3.16
			if (this.#svgImagesProps[docId].script.onscroll) {
				this.#svgImagesProps[docId].script.onscroll();
			}
		}
		if (
			this.#svgImagesProps[docId].refresh.timeout > 0 &&
			this.#svgImagesProps[docId].refresh.loadScript == true
		) {
			this.#svgImagesProps[docId].refresh.loadScript = false;
			this.#svgImagesProps[docId].script.onload();
		}
	}

	#preRenderSuperControllerFunction = null;

	#handlePreRenderControllerScript(docId, zoom, child2root, isSuperController) {
		// 2020/6/8  svg要素内のscriptをevalで実行するのをやめる前準備
		var svgDocStatus = this.#getLayerStatus(docId, zoom, child2root);
		if (isSuperController) {
			this.#preRenderSuperControllerFunction(svgDocStatus);
		} else {
			try {
				// 2020/09/11 preRenderFunctionがエラーアウトすると NOW LOADING:: delay and retry refreshScreenの無限ループに入るのを防止
				this.#svgImagesProps[docId].preRenderControllerFunction(svgDocStatus);
			} catch (e) {
				console.error(
					"Error in handlePreRenderControllerScript: docId:",
					docId,
					"  Exception:",
					e,
				);
			}
		}
	}

	#getLayerStatus(docId, zoom, child2root) {
		// 2022/03/11 開発中 この関数をLayerUIに渡すことで、.scriptの初期化処理(onloadFunc)を機能させることをもくろむ
		if (!zoom || !child2root) {
			var crs = this.#svgImagesProps[docId].CRS;
			child2root = this.#matUtil.getConversionMatrixViaGCS(
				crs,
				this.#mapViewerProps.rootCrs,
			);
			var s2c = this.#getRootSvg2Canvas(
				this.#mapViewerProps.rootViewBox,
				this.#mapViewerProps.mapCanvasSize,
			);
			zoom = this.#getZoom(s2c, docId)[0];
		}
		var vc = this.#viewBoxChanged("prc_" + docId); // この関数(viewBoxChanged)は、あまりにも出来が悪い処理に思う・・
		var svgDocStatus = {
			// この辺の値は後々整理が必要
			docId: docId,
			location: UtilFuncs.getSvgLocation(this.#svgImagesProps[docId].Path),
			scale: zoom * child2root.scale,
			rootScale: zoom,
			c2rScale: child2root.scale,
			actualViewBox: this.#matUtil.getTransformedBox(
				this.#mapViewerProps.rootViewBox,
				this.#matUtil.getInverseMatrix(child2root),
			),
			geoViewBox: this.#essentialUIs.geoViewBox,
			viewChanged: vc,
		};
		return svgDocStatus;
	}

	#prevRootViewBox = {}; // ワンステップ前のrootViewBoxが設定される。

	#viewBoxChanged = function (docId) {
		//  2020/6/8 修正 ただ、この関数、あまり筋が良いとは言えないので改修すべき・・
		if (!docId) {
			docId = "allMaps";
		}
		var ans;
		if (
			!this.#prevRootViewBox[docId] ||
			this.#prevRootViewBox[docId].width !=
				this.#mapViewerProps.rootViewBox.width ||
			this.#prevRootViewBox[docId].height !=
				this.#mapViewerProps.rootViewBox.height
		) {
			ans = "zoom";
		} else if (
			this.#prevRootViewBox[docId].x != this.#mapViewerProps.rootViewBox.x ||
			this.#prevRootViewBox[docId].y != this.#mapViewerProps.rootViewBox.y
		) {
			ans = "scroll";
		} else {
			ans = false;
		}
		if (this.#prevRootViewBox[docId]) {
			//		console.log( "comp:" , prevRootViewBox[docId].width != rootViewBox.width , prevRootViewBox[docId].height != rootViewBox.height);
		}
		this.#prevRootViewBox[docId] = {
			x: this.#mapViewerProps.rootViewBox.x,
			y: this.#mapViewerProps.rootViewBox.y,
			width: this.#mapViewerProps.rootViewBox.width,
			height: this.#mapViewerProps.rootViewBox.height,
		};
		return ans;
	}.bind(this);

	#updateMetaSchema(docId) {
		var metaSchema = UtilFuncs.getMetaSchema(this.#svgImages[docId]);
		if (metaSchema) {
			this.#svgImagesProps[docId].metaSchema = metaSchema;
		} else {
			this.#svgImagesProps[docId].metaSchema = "";
		}
	}

	/**
	 * Container.svgを解析し、リストを作成する関数。
	 *
	 * @param {SVGElement} svgElem 解析するSVG要素
	 * @param {String} docId ドキュメントID
	 * @param {HTMLElement} parentElem 親HTML要素
	 * @param {Boolean} eraseAll すべての要素を消去するかどうか
	 * @param {Object} symbols シンボルの配列
	 * @param {Object} inCanvas キャンバス情報
	 * @param {Object} pStyle 親要素のスタイル
	 * @param {Boolean} dontChildResLoading 子リソースの読み込みを行わないかどうか
	 * @returns {HTMLElement} 解析された最後の要素
	 */
	#parseSVG(
		svgElem,
		docId,
		parentElem,
		eraseAll,
		symbols,
		inCanvas,
		pStyle,
		dontChildResLoading,
	) {
		//	console.log( "parseSVG:", svgImages[docId] );
		// Symbols: poi シンボルの配列 bug改修(2012/12)
		// inCanvas: svgmap lv0.1用:連続するline,polygonはひとつのcanvasに描くことでリソースを抑制する、そのための統合キャンバス

		//	console.log("called parseSVG  id:",docId, "  Recursive?:",pStyle,"  dontRender?:",dontChildResLoading);

		var docPath = this.#svgImagesProps[docId].Path;

		var clickable = this.#svgImagesProps[docId].isClickable;

		if (svgElem.nodeName == "svg") {
			this.#updateMetaSchema(docId); // 2018.2.28 metaSchemaがDOM操作で変更されることがある・・・
			this.#resourceLoadingObserver.usedImages[docId] = true; // 2019.5.22 メモリリーク防止用　今描画されてるドキュメントのID表を作る
			inCanvas = {};
		}

		var beforeElem = null;
		var s2c = this.#getRootSvg2Canvas(
			this.#mapViewerProps.rootViewBox,
			this.#mapViewerProps.mapCanvasSize,
		); // ルートSVG⇒画面変換マトリクス
		const [zoom, docDPR] = this.#getZoom(s2c, docId); // ルートSVGの、画面に対するズーム率 (docIdはレイヤーごとにdevicePixelRatioを変化させるための(副次的な)もの)
		//	console.log("S2C.a:" + s2c.a + " S2C.d:" + s2c.d);
		//	console.log(parentElem);
		// svgElemはsvg文書のルート要素 , docPathはこのSVG文書のパス eraseAll==trueで対応要素を無条件消去
		// beforeElem SVGのimage並び順をhtmlのimgの並び順に一致させるためのhtmlにおける直前要素へのポインタ

		//	var svgNodes = svgDoc.documentElement.childNodes;
		//	console.log(docPath);
		var svgNodes = svgElem.childNodes;
		var crs = this.#svgImagesProps[docId].CRS;
		if (this.#svgImagesProps[docId].CRS.unresolved) {
			// 2022/03/17
			//		console.log("Retry unresolved CRS resolution.");
			this.#svgImagesProps[docId].CRS = this.#getCrs(
				this.#svgImages[docId],
				docId,
			);
			if (this.#svgImagesProps[docId].CRS.unresolved) {
				console.warn("docId:", docId, "'s CRS is not resolved skip.");
				return;
			}
		}
		this.#svgImagesProps[docId].isSVG2 = this.#svgImagesProps[docId].CRS.isSVG2; // ちょっとむりやり 2014.2.10
		var isSVG2 = this.#svgImagesProps[docId].isSVG2;
		var child2root = this.#matUtil.getConversionMatrixViaGCS(
			crs,
			this.#mapViewerProps.rootCrs,
		);
		this.#svgImagesProps[docId].scale = zoom * child2root.scale; // この値、多くのケースで必要だと思う 2020.5.18
		this.#svgImagesProps[docId].geoViewBox = this.#essentialUIs.geoViewBox; // この値、多くのケースで必要だと思う 2022/3/4
		// console.log("docId:",docId,"  scale:",svgImagesProps[docId].scale);

		var child2canvas = this.#matUtil.matMul(child2root, s2c); // 子SVG⇒画面座標へのダイレクト変換行列 2013.8.8
		var nextStyleUpdate = false; // 次要素スタイルを新たに設定する必要の有無
		if (svgElem.nodeName == "svg") {
			/**
			if (svgImagesProps[docId].script ){ // added 2013/01 for dynamic layer's convinience
	//			console.log("svgElem:",svgElem.nodeName); // debug 下と同じ問題、ルートの要素を通過するときのみ呼ばないとまずいでしょ 2017.3.9
				handleScript( docId , zoom , child2root );
			}
			**/
			if (
				typeof this.#svgImagesProps[docId].preRenderControllerFunction ==
				"function"
			) {
				// 2020/6/8  svg要素内のscriptをevalで実行するのをやめる前準備
				this.#handlePreRenderControllerScript(docId, zoom, child2root);
			}
			if (typeof this.#preRenderSuperControllerFunction == "function") {
				this.#handlePreRenderControllerScript(docId, zoom, child2root, true);
			}
		}

		if (this.#geometryCapturer.GISgeometriesCaptureFlag) {
			this.#geometryCapturer.prepareDocGeometries(docId);
		}

		var docDir = UtilFuncs.getDocDir(docPath); // 文書のディレクトリを取得

		for (var i = 0; i < svgNodes.length; i++) {
			//		console.log("node:" + i + "/" + svgNodes.length + " : " +svgNodes[i].nodeName);
			var svgNode = svgNodes[i];

			var onViewport = false;
			if (svgNode.nodeType != 1) {
				continue;
			}

			var useHref = "";

			var childCategory = SvgMapElementType.NONE;
			var childSubCategory = SvgMapElementType.NONE;
			switch (svgNode.nodeName) {
				case "animation": // animation|iframe要素の場合
					if (!isSVG2) {
						childCategory = SvgMapElementType.EMBEDSVG;
					}
					break;
				case "iframe":
					if (isSVG2) {
						childCategory = SvgMapElementType.EMBEDSVG;
						childSubCategory = SvgMapElementType.SVG2EMBED;
					}
					break;
				case "image":
					if (UtilFuncs.getNonScalingOffset(svgNode).nonScaling) {
						// 2018.3.2 imageでもnonScalingのものをPOIとする。getNonScalingOffsetをstyleパース時と都合二回呼んでるのがね。最初に読んでstyleのほうに受け渡したほうがキレイかと・・
						childCategory = SvgMapElementType.POI;
						childSubCategory = SvgMapElementType.DIRECTPOI;
					} else {
						childCategory = SvgMapElementType.BITIMAGE;
					}
					break;
				case "use": // use要素の場合 2012/10
					useHref = svgNode.getAttribute("xlink:href"); // グループタイプのシンボルを拡張 2017.1.17
					if (!useHref) {
						useHref = svgNode.getAttribute("href");
					}
					if (symbols[useHref]) {
						if (symbols[useHref].type == "group") {
							// 2DベクタのシンボルはgetGraphicsGroupSymbolでGROUP扱いしている
							childCategory = SvgMapElementType.GROUP;
							childSubCategory = SvgMapElementType.SYMBOL;
						} else {
							childCategory = SvgMapElementType.POI;
							childSubCategory = SvgMapElementType.USEDPOI;
						}
					} else {
						// リンク切れ
					}
					//			console.log("group:",childCategory,childSubCategory);
					break;
				case "path":
					childSubCategory = SvgMapElementType.PATH;
					childCategory = SvgMapElementType.VECTOR2D;
					break;
				case "polyline":
					childSubCategory = SvgMapElementType.POLYLINE;
					childCategory = SvgMapElementType.VECTOR2D;
					break;
				case "polygon":
					childSubCategory = SvgMapElementType.POLYGON;
					childCategory = SvgMapElementType.VECTOR2D;
					break;
				case "rect":
					childSubCategory = SvgMapElementType.RECT;
					childCategory = SvgMapElementType.VECTOR2D;
					break;
				case "circle":
					childSubCategory = SvgMapElementType.CIRCLE;
					childCategory = SvgMapElementType.VECTOR2D;
					break;
				case "ellipse":
					childSubCategory = SvgMapElementType.ELLIPSE;
					childCategory = SvgMapElementType.VECTOR2D;
					break;
				case "g":
					childCategory = SvgMapElementType.GROUP;
					break;
				case "a":
					childCategory = SvgMapElementType.GROUP;
					childSubCategory = SvgMapElementType.HYPERLINK;
					break;
				case "text":
					childCategory = SvgMapElementType.TEXT;
			}

			var GISgeometry = null;
			if (
				!this.#mapTicker.pathHitTester.enable &&
				this.#geometryCapturer.GISgeometriesCaptureFlag
			) {
				GISgeometry = SVGMapGISgeometry.createSVGMapGISgeometry(
					childCategory,
					childSubCategory,
					svgNode,
					this.#geometryCapturer.GISgeometriesCaptureOptions,
				);
				//				GISgeometry = SVGMapGISgeometry.createSVGMapGISgeometry( childCategory, childSubCategory , svgNode , this.#geometryCapturer.GISgeometriesCaptureOptions );
			}

			if (
				(!this.#mapTicker.pathHitTester.enable &&
					(childCategory == SvgMapElementType.POI ||
						childCategory == SvgMapElementType.BITIMAGE ||
						childCategory == SvgMapElementType.EMBEDSVG ||
						childCategory == SvgMapElementType.TEXT)) ||
				(this.#mapTicker.pathHitTester.enable &&
					childCategory == SvgMapElementType.EMBEDSVG)
			) {
				// image||animation,iframe||use(add201210)要素の場合
				// Point||Coverage的要素のパース。ただし hittest時はsvgの埋め込みのパースのみ(その他のヒットテストはhtml表示のonClickなどのイベントで処理している)
				var imageId = svgNode.getAttribute("iid");
				// 読み込んだSVG Image,(iframe|Animation),use要素に共通　通し番のIDを付ける
				if (!imageId || imageId.indexOf("i") != 0) {
					// idの無い要素にidを付ける (元々idが付いていると破綻するかも・・)2013/1 (とりあえず的な対応を実施・・後程もっと良い対策をしたい) .. idの代わりに"iid"を使うようにしてベターな対策を打った 2014.8
					imageId = "i" + this.#imageSeqNumber;
					svgNode.setAttribute("iid", imageId);
					//				console.log("Add imageId:"+imageId , svgImages[docId].getElementById(imageId),svgImages[docId]);
					++this.#imageSeqNumber;
				}

				//			console.log("id:" + imageId);

				var imgElem;
				this.#existNodes[imageId] = true;
				imgElem = this.#isLoadedImage(imageId); //imageIdをもとに HTMLの要素(span or img)を探索し読み込み済みの画像もしくは文書かどうか確認
				//			console.log("isLoadedImage:",imageId,imgElem);

				var ip = UtilFuncs.getImageProps(
					svgNode,
					childCategory,
					pStyle,
					childSubCategory,
					GISgeometry,
				); // x,y,w,h,href等読み込み
				var imageRect = this.#matUtil.transformRect(ip, child2root); // root座標系における、図形のbbox
				//			console.log("imageRect:",imageRect,  "  Elem:",svgNode,"  child2root:",child2root, "  geomProps:",ip,"  crs,rootCrs:",crs, rootCrs );
				if (ip.nonScaling) {
					imageRect.nonScaling = true;
				}
				if (
					imageRect.width == 0 &&
					imageRect.height == 0 &&
					(childCategory == SvgMapElementType.EMBEDSVG ||
						childCategory == SvgMapElementType.BITIMAGE)
				) {
					console.warn(
						"This embedding element don't have width/height property. Never renders... imageId:",
						imageId,
						svgNode,
					);
				}

				if (ip.commonQuery) {
					if (docId != "root") {
						// commonQueryを保存するのはroot以外が対象
						this.#svgImagesProps[
							this.#svgImagesProps[docId].rootLayer
						].commonQuery = ip.commonQuery;
					}
				}

				if (dontChildResLoading) {
					// svgImagesProps,svgImagesなどだけを生成し空回りさせる(resume用)
					continue;
				}
				if (
					!eraseAll &&
					UtilFuncs.isIntersect(imageRect, this.#mapViewerProps.rootViewBox) &&
					UtilFuncs.inZoomRange(ip, zoom, imageRect.c2rScale) &&
					UtilFuncs.isVisible(ip)
				) {
					// ロードすべきイメージの場合

					var elmTransform = null;
					var xd, yd;
					if (ip.transform) {
						// 2014.6.18 transform属性があるときの座標計算処理
						var cm = this.#matUtil.matMul(ip.transform, child2canvas);
						var p0 = this.#matUtil.transform(ip.x, ip.y, cm);
						if (!cm.a) {
							// added 2020/3/26 for non linear projection
							// 方法論：そのイメージローカルなリニアな変換行列を3基準点から構築して対応する
							var p1 = this.#matUtil.transform(ip.x + ip.width, ip.y, cm);
							var p2 = this.#matUtil.transform(
								ip.x + ip.width,
								ip.y + ip.height,
								cm,
							);
							var tMat =
								TernarySimultaneousEquationsSolution.getLinearTransformMatrix(
									ip.x,
									ip.y,
									ip.x + ip.width,
									ip.y,
									ip.x + ip.width,
									ip.y + ip.height,
									p0.x,
									p0.y,
									p1.x,
									p1.y,
									p2.x,
									p2.y,
								);
							cm = tMat;
						}
						var det2 = Math.sqrt(Math.abs(cm.a * cm.d - cm.b * cm.c));

						xd = { p0: 0, span: ip.width * det2 };
						yd = { p0: 0, span: ip.height * det2 };
						xd.p0 = p0.x;
						yd.p0 = p0.y;
						elmTransform = {
							a: cm.a / det2,
							b: cm.b / det2,
							c: cm.c / det2,
							d: cm.d / det2,
							e: 0,
							f: 0,
						};
					} else {
						// ないとき
						var imgBox = this.#matUtil.getTransformedBox(imageRect, s2c); // canvas座標系における bbox(transformが無い場合はこれが使える)
						if (
							childCategory == SvgMapElementType.POI &&
							childSubCategory == SvgMapElementType.USEDPOI
						) {
							// ICON表示
							var symb = symbols[ip.href];
							if (symb.d) {
								// ベクタ図形のシンボル... toDo 2015.3.31
							} else {
								ip.href = symb.path;
								imgBox.x += docDPR * symb.offsetX;
								imgBox.y += docDPR * symb.offsetY;
								imgBox.width = docDPR * symb.width; // もともとゼロだったので・・ (scaling POIの改造未着手2015.7)
								imgBox.height = docDPR * symb.height;
							}
						} else if (ip.nonScaling) {
							// 2015.7.3 POIではなくてnonScaling図形の場合
							imgBox.width = docDPR * ip.width;
							imgBox.height = docDPR * ip.height;
							if (ip.cdx || ip.cdy) {
								imgBox.x += docDPR * ip.cdx;
								imgBox.y += docDPR * ip.cdy;
							}
						}
						// グリッディング (タイルの継ぎ目消し)
						xd = this.#getIntValue(imgBox.x, imgBox.width);
						yd = this.#getIntValue(imgBox.y, imgBox.height);
					}

					if (!imgElem) {
						// ロードされていないとき
						// svgのimageのx,y,w,hをsvg座標⇒Canvas座標に変換
						var img;
						if (
							childCategory == SvgMapElementType.POI ||
							childCategory == SvgMapElementType.BITIMAGE
						) {
							// image,use要素の場合
							var imageURL = UtilFuncs.getImageURL(ip.href, docDir);
							var isNoCache =
								childCategory == SvgMapElementType.BITIMAGE &&
								this.#svgImagesProps[docId].rootLayer &&
								this.#svgImagesProps[this.#svgImagesProps[docId].rootLayer]
									.noCache;
							img = this.#imgRenderer.getImgElement(
								xd.p0,
								yd.p0,
								xd.span,
								yd.span,
								imageURL,
								imageId,
								ip.opacity,
								childCategory,
								ip.metadata,
								ip.title,
								elmTransform,
								ip.href_fragment,
								ip.pixelated,
								ip.imageFilter,
								isNoCache,
								ip.crossorigin,
								{ docId: docId, svgNode: svgNode },
								ip.commonQuery ||
									this.#svgImagesProps[this.#svgImagesProps[docId].rootLayer]
										?.commonQuery,
							);
						} else if (childCategory == SvgMapElementType.TEXT) {
							// text要素の場合(2014.7.22)
							var cStyle = this.#svgStyle.getStyle(
								svgNode,
								pStyle,
								null,
								this.#svgImagesProps[docId].styleMap,
							);
							img = this.#getSpanTextElement(
								xd.p0,
								yd.p0,
								ip.cdx,
								ip.cdy,
								ip.text,
								imageId,
								ip.opacity,
								elmTransform,
								cStyle,
								yd.span,
								ip.nonScaling,
							);
						} else {
							// animation|iframe要素の場合
							img = document.createElement("div");
							if (docId == "root") {
								if (svgNode.getAttribute("data-nocache")) {
									// 2017.9.29
									img.setAttribute("data-nocache", "true");
								}
								img.setAttribute("data-layerNode", "true"); // 2016.12.8
							}
							img.id = imageId;
							if (ip.opacity) {
								if (!this.#mapViewerProps.uaProps.MS) {
									// if ( !isIE)からチェンジ (Edge対策)
									img.style.opacity = ip.opacity;
									//								img.setAttribute("style" , "Filter: Alpha(Opacity=" + ip.opacity * 100 + ");opacity:" + ip.opacity + ";"); // IEではこれでは設定できない
								} else {
									if (this.#mapViewerProps.uaProps.verIE > 8) {
										img.setAttribute(
											"style",
											"Filter: Alpha(Opacity=" +
												ip.opacity * 100 +
												");opacity:" +
												ip.opacity +
												";",
										); // IE8以前ではこれでは設定できない？
									}
									img.style.filter = "alpha(opacity=" + ip.opacity * 100 + ")"; // IEではこれだけでは効かない
									img.style.position = "absolute";
									img.style.top = 0;
									img.style.left = 0;
								}
							}
							if (ip.imageFilter) {
								img.style.filter = ip.imageFilter;
							}
							if (!this.#svgImagesProps[docId].childImages) {
								this.#svgImagesProps[docId].childImages = new Array();
							}
							if (
								this.#svgImagesProps[docId].isClickable ||
								(ip.elemClass && ip.elemClass.indexOf("clickable") >= 0)
							) {
								this.#svgImagesProps[docId].childImages[imageId] =
									SvgMapElementType.CLICKABLE;
							} else {
								this.#svgImagesProps[docId].childImages[imageId] =
									SvgMapElementType.EXIST;
							}
						}

						if (
							childCategory == SvgMapElementType.POI &&
							this.#geometryCapturer.GISgeometriesCaptureOptions
								.SkipVectorRendering
						) {
							// POIもベクタとして描画しない
						} else {
							// 作成した要素を実際に追加する
							if (beforeElem) {
								// SVGのデータ順序の通りにhtmlのimg要素を設置する処理
								// 一つ前のもののあとに入れる
								parentElem.insertBefore(img, beforeElem.nextSibling);
							} else {
								if (parentElem.hasChildNodes()) {
									// 子要素がある場合は最初のspan要素の直前に挿入する？
									var childSpans = parentElem.getElementsByTagName("div");
									if (childSpans) {
										parentElem.insertBefore(img, childSpans.item(0));
									} else {
										parentElem.insertBefore(img, parentElem.lastChild);
									}
								} else {
									parentElem.appendChild(img);
								}
							}
							beforeElem = img;
						}
						if (
							childCategory != SvgMapElementType.POI &&
							childCategory != SvgMapElementType.BITIMAGE &&
							childCategory != SvgMapElementType.TEXT
						) {
							// animation|iframe要素の場合、子svg文書を読み込む( htmlへの親要素埋め込み後に移動した 2014.6.5)
							var childSVGPath = UtilFuncs.getImageURL(ip.href, docDir); // 2016.10.14 関数化＆統合化
							this.#loadSVG(childSVGPath, imageId, img, docId);

							//  この部分の処理は、setLayerDivProps 関数に切り出しloadSVG側に移設 2017.9.29 (noCache処理のため)
						}

						if (this.#mapViewerProps.uaProps.isIE) {
							// IEではw,hの書き込みに失敗する場合がある。その対策。　imgエレメントのDOM登録タイミングによる？
							if (
								this.#mapViewerProps.uaProps.verIE < 9 &&
								(childCategory == SvgMapElementType.POI ||
									childCategory == SvgMapElementType.BITIMAGE)
							) {
								img.src = img.getAttribute("href");
							}
							img.width = xd.span;
							img.height = yd.span;
							img.style.width = xd.span + "px";
							img.style.height = yd.span + "px";
						}
					} else {
						// ロードされているとき
						if (
							childCategory == SvgMapElementType.POI ||
							childCategory == SvgMapElementType.BITIMAGE
						) {
							// image,use要素の場合
							// x,y,w,hを書き換える
							//this.#setImgElement(imgElem , xd.p0 , yd.p0, xd.span , yd.span , UtilFuncs.getImageURL(ip.href,docDir), elmTransform , 0, 0, false, ip.nonScaling, ip.href_fragment , imageId , ip.crossorigin, {docId:docId,svgNode:svgNode} ); // 2015.7.8 本来ip.cdxyは入れるべきだと思うが、どこかでダブルカウントされるバグがある
							this.#imgRenderer.setImgElement(
								imgElem,
								xd.p0,
								yd.p0,
								xd.span,
								yd.span,
								UtilFuncs.getImageURL(ip.href, docDir),
								elmTransform,
								0,
								0,
								false,
								ip.nonScaling,
								ip.href_fragment,
								ip.pixelated,
								ip.imageFilter,
								imageId,
								ip.opacity,
								ip.crossorigin,
								{ docId: docId, svgNode: svgNode },
							); // 2015.7.8 本来ip.cdxyは入れるべきだと思うが、どこかでダブルカウントされるバグがある
						} else if (childCategory == SvgMapElementType.TEXT) {
							// 2014.7.22
							//this.#setImgElement(imgElem , xd.p0 , yd.p0 , 0 , yd.span , "" , elmTransform , ip.cdx , ip.cdy , true , ip.nonScaling , null , imageId , null, {docId:docId,svgNode:svgNode} );
							this.#imgRenderer.setImgElement(
								imgElem,
								xd.p0,
								yd.p0,
								0,
								yd.span,
								"",
								elmTransform,
								ip.cdx,
								ip.cdy,
								true,
								ip.nonScaling,
								null,
								ip.pixelated,
								ip.imageFilter,
								imageId,
								ip.opacity,
								null,
								{ docId: docId, svgNode: svgNode },
							);
						} else {
							// animation|iframe要素の場合(svgTile/Layer)
							this.#hashAlignment(ip, docDir, imageId, svgNode);
							this.#parseSVGwhenLoadCompleted(
								this.#svgImages,
								imageId,
								imgElem,
								0,
							);
							// documentElemの生成(読み込み)が完了してないとエラーになる。生成を待つ必要があるため
						}
						beforeElem = imgElem;
					}

					if (childCategory == SvgMapElementType.POI) {
						// 2018.3.2 変更はないが、use使わないがnonScalingのもの(DIRECTPOI)も追加
						this.#mapTicker.poiHitTester.setPoiBBox(
							imageId,
							xd.p0,
							yd.p0,
							xd.span,
							yd.span,
						);
					}
					onViewport = true;
				} else {
					// ロードすべきでないイメージの場合
					if (imgElem) {
						// ロードされているとき
						// 消す
						this.#resourceLoadingObserver.requestRemoveTransition(
							imgElem,
							parentElem,
						); //遅延消去処理 2013.6
						if (childCategory == SvgMapElementType.EMBEDSVG) {
							// animation|iframe要素の場合
							this.#hashAlignment(ip, docDir, imageId, svgNode); // 2024/10/18 hashの処理は消去する直前にも行うと直前の設定を確実に保存できて良いのではと思う
							this.#removeChildDocs(imageId);
						}
					}
				}
			} else if (childCategory == SvgMapElementType.GROUP) {
				// g要素の場合は、子要素を再帰パースする シンボルは波及させる。(ただしスタイル、リンクを波及)
				// ただ、構造は何も作らない(すなわち無いのと同じ。属性の継承なども無視) 2012/12
				// VECTOR2Dができたので、スタイルとvisibleMin/MaxZoomを・・
				if (
					svgNode.hasChildNodes() ||
					childSubCategory == SvgMapElementType.SYMBOL
				) {
					var hasHyperLink = false;
					if (childSubCategory == SvgMapElementType.HYPERLINK) {
						hasHyperLink = true;
					}

					var cStyle = this.#svgStyle.getStyle(
						svgNode,
						pStyle,
						hasHyperLink,
						this.#svgImagesProps[docId].styleMap,
					);

					if (childSubCategory == SvgMapElementType.SYMBOL) {
						// 2017.1.17 group use : beforeElemがどうなるのか要確認
						cStyle.usedParent = svgNode;
						svgNode = symbols[useHref].node;
					}
					beforeElem = this.#parseSVG(
						svgNode,
						docId,
						parentElem,
						false,
						symbols,
						inCanvas,
						cStyle,
						dontChildResLoading,
					);
				}
			} else if (childCategory == SvgMapElementType.VECTOR2D) {
				//			console.log("VECTOR2D",svgNode,pStyle);
				if (dontChildResLoading) {
					// svgImagesProps,svgImagesなどだけを生成し空回りさせる(resume用)
					continue;
				}
				// canvas (inCanvas)を用意する (これ以下のブロック　例えばgetCanvas()とかを作るべきですな)
				if (!inCanvas.context) {
					// 統合キャンバス(inCanvas)を新規作成する
					if (!this.#summarizeCanvas) {
						// 2014.5.26以前の既存モード
						// このモードはだいぶ昔に消滅
					} else {
						// summarizeCanvas=true rootLayer毎のcanvasとりまとめ高速化/省メモリモード 2014.5.27
						var inCanvasElement = document.getElementById(
							this.#svgImagesProps[docId].rootLayer + "_canvas",
						);
						if (!inCanvasElement) {
							inCanvasElement = document.createElement("canvas");
							inCanvasElement.style.position = "absolute";
							inCanvasElement.style.left = "0px";
							inCanvasElement.style.top = "0px";
							inCanvasElement.width = this.#mapViewerProps.mapCanvasSize.width;
							inCanvasElement.height =
								this.#mapViewerProps.mapCanvasSize.height;
							inCanvasElement.id =
								this.#svgImagesProps[docId].rootLayer + "_canvas";
							document
								.getElementById(this.#svgImagesProps[docId].rootLayer)
								.appendChild(inCanvasElement); //前後関係をもう少し改善できると思う 2015.3.24 rootLayerのdivが生成されていない状況で、appendしてerrが出ることがある　非同期処理によるものかもしれない。（要継続観察）
							inCanvasElement.setAttribute("hasdrawing", "false");
						} else {
							// inCanvas.styleの初期化系はresetSummarizedCanvasに移動
						}
						inCanvas.element = inCanvasElement;
						inCanvas.context2d = inCanvasElement.getContext("2d");
					}
				} else {
					// 生成済みのcanvasを使用する
				}

				var cStyle = this.#svgStyle.getStyle(
					svgNode,
					pStyle,
					null,
					this.#svgImagesProps[docId].styleMap,
				);
				cStyle.docDPR = docDPR;
				//			console.log("thisObj's style:",cStyle, "   parent's style:",pStyle);
				if (GISgeometry) {
					GISgeometry.determineType(cStyle);
				}
				if (
					this.#geometryCapturer.GISgeometriesCaptureOptions.SkipVectorRendering
				) {
					// 2021.9.16
					inCanvas.context = this.#geometryCapturer.dummy2DContextBuilder();
				} else {
					inCanvas.context = inCanvas.context2d; // canvas2dコンテキスト取得
				}
				inCanvas.altdMap = this.#svgImagesProps[docId].altdMap;
				if (
					UtilFuncs.inZoomRange(cStyle, zoom, child2root.scale) &&
					(!cStyle.display || cStyle.display != "none") &&
					(!cStyle.visibility || cStyle.visibility != "hidden")
				) {
					var bbox = null;
					if (childSubCategory == SvgMapElementType.PATH) {
						bbox = this.#pathRenderer.setSVGpathPoints(
							svgNode,
							inCanvas,
							child2canvas,
							clickable,
							null,
							cStyle,
							GISgeometry,
						);
					} else if (childSubCategory == SvgMapElementType.RECT) {
						bbox = this.#pathRenderer.setSVGrectPoints(
							svgNode,
							inCanvas,
							child2canvas,
							clickable,
							cStyle,
							GISgeometry,
						);
					} else if (
						childSubCategory == SvgMapElementType.CIRCLE ||
						childSubCategory == SvgMapElementType.ELLIPSE
					) {
						bbox = this.#pathRenderer.setSVGcirclePoints(
							svgNode,
							inCanvas,
							child2canvas,
							clickable,
							childSubCategory,
							cStyle,
							GISgeometry,
						);
					} else if (
						childSubCategory == SvgMapElementType.POLYLINE ||
						childSubCategory == SvgMapElementType.POLYGON
					) {
						bbox = this.#pathRenderer.setSVGpolyPoints(
							svgNode,
							inCanvas,
							child2canvas,
							clickable,
							childSubCategory,
							cStyle,
							GISgeometry,
						);
					} else {
						// これら以外 -- 未実装　～　だいぶなくなったけれど
						//					bbox = setSVGvectorPoints(svgNode , canContext , childSubCategory , child2canvas , cStyle );
					}

					if (bbox) {
						if (cStyle["marker-end"]) {
							// 決め打ちArrow..
							var markPath = "M-20,-5 L0,0 L-20,5";
							var markerId = /\s*url\((#.*)\)/.exec(cStyle["marker-end"]);
							if (markerId && symbols[markerId[1]] && symbols[markerId[1]].d) {
								markPath = symbols[markerId[1]].d;
							}
							var markMat = {
								a: bbox.endCos,
								b: bbox.endSin,
								c: -bbox.endSin,
								d: bbox.endCos,
								e: bbox.endX,
								f: bbox.endY,
							};
							inCanvas.context.setLineDash([]);
							this.#pathRenderer.setSVGpathPoints(
								svgNode,
								inCanvas,
								markMat,
								clickable,
								markPath,
								cStyle,
							);
						}
						if (
							(this.#mapTicker.pathHitTester.enable ||
								this.#mapTicker.pathHitTester.centralGetter) &&
							bbox.hitted
						) {
							this.#mapTicker.pathHitTester.setHittedObjects(
								svgNode,
								bbox,
								cStyle.usedParent,
							);
						}
						if (
							UtilFuncs.isIntersect(bbox, this.#mapViewerProps.mapCanvasSize)
						) {
							inCanvas.element.setAttribute("hasdrawing", "true");
							onViewport = true;
						}
					}
				}
			}

			if (GISgeometry && onViewport) {
				// ひとまずviewportにあるオブジェクトだけを収集する機能を検証2016.12.7
				this.#geometryCapturer.addGeometry(docId, GISgeometry, imgElem, docDir);
			}
		}
		return beforeElem;
	}

	#hashAlignment(ip, docDir, imageId, svgNode) {
		// 2024/10/18 関数化
		var childSVGPath = UtilFuncs.getImageURL(ip.href, docDir);
		if (
			this.#svgImagesProps[imageId] &&
			this.#svgImagesProps[imageId].Path &&
			this.#svgImagesProps[imageId].Path != childSVGPath
		) {
			const pch = UtilFuncs.urlChanged(
				this.#svgImagesProps[imageId].Path,
				childSVGPath,
			);
			const appHash = this.#svgImagesProps[imageId].clearHashChangedFlag();
			console.log("change SVG's path:", pch, appHash);
			if (pch.hash && appHash) {
				// WebAppレイヤーがハッシュを変更した場合はそれを優先する
				if (appHash === true) {
					// ハッシュが消えた場合
					svgNode.setAttribute(
						"xlink:href",
						UtilFuncs.getPathWithoutHash(ip.href),
					);
				} else {
					svgNode.setAttribute(
						"xlink:href",
						UtilFuncs.getPathWithoutHash(ip.href) + appHash,
					);
				}
			} else {
				// そうでない場合(コンテナ側のxlink:hrefを変えた場合はそれを優先する
				this.#svgImagesProps[imageId].Path = childSVGPath;
			}

			//			console.log("change SVG's path. this has issues....");
			//			this.#svgImagesProps[imageId].Path = childSVGPath; // added 2017.9.5 : ハッシュが更新されることがあり、それを更新する必要があると思われる・・・　ISSUE:　ただ完全にURLが刷新されるケース(hrefがsetattributeされる)もあり、今のルーチンはそれを検出し再ロードできないのではないか？　⇒　2024.10.02 これで解消できた？
		}
	}

	// svgの読み込みが完了したらparseSVGするしょり
	// documentElemの生成(読み込み)が完了してないとエラーになる。生成を待つ必要があるため 2013.8.21
	#parseSVGwhenLoadCompleted(svgImages, imageId, imgElem, ct) {
		if (
			this.#svgImagesProps[imageId] &&
			this.#svgImagesProps[imageId].loadError
		) {
			// 2021/2/17 ERR404強化
			return;
		}
		if (this.#svgImages[imageId] && this.#svgImagesProps[imageId]) {
			this.#resourceLoadingObserver.loadingImgs[imageId] = true;
			var symbols = UtilFuncs.getSymbols(this.#svgImages[imageId]);
			this.#parseSVG(
				this.#svgImages[imageId].documentElement,
				imageId,
				imgElem,
				false,
				symbols,
				null,
				null,
			);
			delete this.#resourceLoadingObserver.loadingImgs[imageId];
		} else {
			if (ct < 20) {
				++ct;
				setTimeout(
					function (svgImages, imageId, imgElem, ct) {
						this.#parseSVGwhenLoadCompleted(svgImages, imageId, imgElem, ct);
					}.bind(this),
					50,
					svgImages,
					imageId,
					imgElem,
					ct,
				);
			} else {
				console.log("FAIL: document load : imageId:", imageId);
			}
		}
	}

	// SVG文書にはなくなってしまったノードを消去する・・
	// これも効率が悪い気がする・・ 2013/1/25
	// 何となく納得いかない・・　ロード前にチェックされているのでは？
	// #existNodes = new Object(); // 存在するノードのidをハッシュキーとしたテーブル
	#checkDeletedNodes(parentNode) {
		var toBeDelNodes = new Array();
		for (var i = parentNode.childNodes.length - 1; i >= 0; i--) {
			var oneNode = parentNode.childNodes.item(i);
			if (oneNode.nodeType == 1) {
				if (
					(oneNode.nodeName == "IMG" || oneNode.nodeName == "SPAN") &&
					oneNode.id &&
					oneNode.id.indexOf("toBeDel") == -1
				) {
					// 2018.2.23 text(はspanに入ってる)もimg同様にする
					if (!this.#existNodes[oneNode.id]) {
						// img||text要素に対してのみ
						toBeDelNodes.push(oneNode);
					}
				}

				if (
					oneNode.id &&
					oneNode.id.indexOf("toBeDel") == -1 &&
					oneNode.hasChildNodes()
				) {
					this.#checkDeletedNodes(oneNode);
				}
			}
		}
		for (var i = 0; i < toBeDelNodes.length; i++) {
			// debug 2013.8.21
			this.#resourceLoadingObserver.requestRemoveTransition(
				toBeDelNodes[i],
				parentNode,
			);
		}
	}

	#resetSummarizedCanvas() {
		var cv = this.#mapViewerProps.mapCanvas.getElementsByTagName("canvas");
		for (var i = cv.length - 1; i >= 0; i--) {
			var ocv = cv.item(i);
			if (!ocv.dataset.pixelate4Edge) {
				ocv.setAttribute("hasdrawing", "false");
				ocv.style.left = "0px";
				ocv.style.top = "0px";
				ocv.width = this.#mapViewerProps.mapCanvasSize.width;
				ocv.height = this.#mapViewerProps.mapCanvasSize.height;
				ocv.getContext("2d").clearRect(0, 0, ocv.width, ocv.height);
			}
		}
	}

	// ルートSVG⇒画面キャンバスの変換マトリクス
	#getRootSvg2Canvas = function (rootViewBox, mapCanvasSize_) {
		if (!rootViewBox) {
			rootViewBox = this.#mapViewerProps.rootViewBox;
			mapCanvasSize_ = this.#mapViewerProps.mapCanvasSize;
		}
		var s2cA, s2cD, s2cE, s2cF;

		s2cA = mapCanvasSize_.width / rootViewBox.width;
		s2cD = mapCanvasSize_.height / rootViewBox.height;

		s2cE = -s2cA * rootViewBox.x;
		s2cF = -s2cD * rootViewBox.y;

		return {
			a: s2cA,
			b: 0,
			c: 0,
			d: s2cD,
			e: s2cE,
			f: s2cF,
		};
	}.bind(this);

	#imageSeqNumber = 0; // SVGのimage要素に通し番でidを振っておく

	#isLoadedImage(id) {
		// HTMLのimg要素をサーチして、該当idがあるかどうかを確認する。(これが非効率な部分かも・・)
		var elem = document.getElementById(id);
		if (elem) {
			return elem;
		} else {
			return false;
		}
	}

	// "丸め"による隙間ができるのを抑止する
	#getIntValue(p0, span0) {
		// y側でも使えます
		var p1 = Math.floor(p0);
		var p2 = Math.floor(p0 + span0);
		return {
			p0: p1,
			span: p2 - p1 + 0.02, // この整数化処理をしても継ぎ目が見える時がたまにあるのは、多分devicePixelRatioが整数でない為? そこで、spabにごくわずかな値をプラスする。(0.005とかだと効かず、0.01だとごくたまに。0.02だとほぼなくなる様子。) 2023/05/26
		};
	}

	#getSpanTextElement(
		x,
		y,
		cdx,
		cdy,
		text,
		id,
		opacity,
		transform,
		style,
		areaHeight,
		nonScaling,
	) {
		// この関数はImgRendererに移すべき
		// 2014.7.22
		var img = document.createElement("span"); // spanで良い？ divだと挙動がおかしくなるので・・
		if (opacity) {
			//		img.setAttribute("style" , "Filter: Alpha(Opacity=" + opacity * 100 + ");opacity:" + opacity + ";");
			img.style.opacity = opacity;
		}
		if (style.fill) {
			img.style.color = style.fill;
		}
		var fontS = 0;
		if (style["font-size"] && nonScaling) {
			fontS = Number(style["font-size"]);
		} else if (nonScaling) {
			fontS = 16; // default size but not set..?
			// do nothing?
		} else {
			fontS = areaHeight;
		}
		img.style.fontSize = fontS + "px";

		img.innerHTML = text;
		img.style.left = x + cdx + "px";
		img.style.top = y + cdy - fontS + "px"; // 2025/9/26 topに統一(filterで不具合が生じるため)
		img.style.position = "absolute";
		//	img.width = width;
		//	img.height = height;
		img.id = id;
		img.setAttribute("title", "");
		return img;
	}

	#hideAllTileImgs = function () {
		// 2014.6.10 setGeoCenter,setGeoViewPortのちらつき改善
		var mapImgs = this.#mapViewerProps.mapCanvas.getElementsByTagName("img");
		for (var i = mapImgs.length - 1; i >= 0; i--) {
			//		mapImgs[i].style.display="none"; // this.#imgRenderer.setImgElement()もしくは、this.#imgRenderer.#handleLoadSuccess()で戻している)
			mapImgs[i].style.visibility = "hidden"; // hideAllTileImgs()用だったが、読み込み途中でスクロールすると豆腐が出現するバグになっていたので、それはvisibilityでの制御に変更
		}
	}.bind(this);

	#getCrs(svgDoc, docId) {
		var isSVG2 = false;
		var crs = null;
		var globalView = UtilFuncs.getElementByIdNoNS(svgDoc, "globe");
		try {
			var genericCRS = {
				// 2022/03/17 CRSの関数がlayerUI、もしくはその中のscriptで定義されているケースに対応した　遅延実行処理
				unresolved: true,
				isSVG2: false,
			};
			if (globalView && globalView.nodeName == "view") {
				var gv = globalView.getAttribute("viewBox").split(/\s*,\s*|\s/);
				crs = new Array(6);
				crs[0] = gv[2] / 360.0;
				crs[1] = 0;
				crs[2] = 0;
				crs[3] = -gv[3] / 180.0;
				crs[4] = Number(gv[0]) + 180.0 * crs[0];
				crs[5] = Number(gv[1]) - 90.0 * crs[3];
				isSVG2 = true;
				genericCRS = {
					a: crs[0],
					b: crs[1],
					c: crs[2],
					d: crs[3],
					e: crs[4],
					f: crs[5],
					isSVG2: isSVG2,
				};
			} else {
				var gcsElem = svgDoc.getElementsByTagName("globalCoordinateSystem")[0];
				if (gcsElem) {
					var tf = gcsElem.getAttribute("transform");
					if (tf) {
						genericCRS.transformFunctionName = tf;
						if (tf.indexOf("matrix") >= 0) {
							genericCRS = UtilFuncs.parseTransformMatrix(tf);
							if (genericCRS) {
								genericCRS.isSVG2 = isSVG2;
							}
						} else if (tf.toLowerCase() == "mercator") {
							// 2020/3/24 add mercator special word support
							console.log("isMercator");
							genericCRS = new Mercator();
							genericCRS.isSVG2 = false;
						} else if (tf.indexOf("controller.") == 0) {
							// この機能は動かしたことはない。未完成 2021/1/26
							var cntlWin =
								this.#svgImagesProps[this.#svgImagesProps[docId].rootLayer]
									.controllerWindow;
							if (cntlWin) {
								// 地図コンテンツ(のルートレイヤ)に紐づいたcontroller windowに(接頭詞の後に)同前の関数があればそれを設定する
								var tfName = tf.substring(11);
								if (cntlWin[tfName]) {
									genericCRS = cntlWin[tfName];
									if (!genericCRS.isSVG2) {
										genericCRS.isSVG2 = false;
									}
								}
							}
						} else if (
							this.#svgImagesProps[docId].script &&
							this.#svgImagesProps[docId].script.transformFunction
						) {
							// script要素の中のtransformFunction(layerUIのarrangeHtmlEmbedScriptが設定してる(この遅延処理に対応 2022/03/17)
							// 地図コンテンツのscript要素中にtransform属性値と同前の関数があればそれを設定する
							var tFunc = this.#svgImagesProps[docId].script.transformFunction;
							console.log("set transformFunction:", tFunc);
							if (tFunc) {
								genericCRS = tFunc();
								if (!genericCRS.isSVG2) {
									genericCRS.isSVG2 = false;
								}
							}
						}
					}
				}
			}
			if (genericCRS.unresolved) {
				console.warn(
					"This document don't have CRS. Never renders. docId:",
					docId,
				);
			}
			return genericCRS;
		} catch (e) {
			// CRSがない文書にとりあえず応じる 2014.5.27
			return {
				a: 1,
				b: 0,
				c: 0,
				d: 1, // ここも同様 2020/10/13
				e: 0,
				f: 0,
				isSVG2: false,
			};
		}
	}

	#setController(svgDoc, docPath, svgImageProps) {
		var cntPath = svgDoc.documentElement.getAttribute("data-controller");
		if (svgImageProps.controller && svgImageProps.controller.src) {
			// data-controller-srcに直接ソースが書かれているケース
			if (cntPath) {
				// しかもdata-controllerにも書かれていたらそれをhashが書かれているとみなす
				var ctrSrc = svgImageProps.controller.src;
				svgImageProps.controller = new String(cntPath); // 旧版との互換を取るための裏技的な・・(stringを構造化したのだが旧版対応のアプリはこの変数をstringとして処理しているケースがある為)
				svgImageProps.controller.url = cntPath;
				svgImageProps.controller.src = ctrSrc;
			}
		} else {
			if (cntPath) {
				var scurl = UtilFuncs.getImageURL(
					cntPath,
					UtilFuncs.getDocDir(docPath),
				);
				svgImageProps.controller = new String(scurl);
				svgImageProps.controller.url = scurl;
			} else {
				//ルートコンテナの該当レイヤ要素にdata-controllerが指定されていた場合、該当のレイヤーにコントローラを設定する
				//コントローラの強さは右記の通り：レイヤーの最上位コンテナ > ルートコンテナ
				if (svgImageProps["parentDocId"] == "root") {
					cntPath = this.#layerManager
						.getLayer(svgImageProps["rootLayer"])
						.getAttribute("data-controller");
					if (!(cntPath === null || cntPath === undefined || cntPath === "")) {
						var scurl = UtilFuncs.getImageURL(
							cntPath,
							UtilFuncs.getDocDir(docPath),
						);
						svgImageProps.controller = new String(scurl);
						svgImageProps.controller.url = scurl;
					}
				}
			}
		}
	}

	/**
	 * @description 指定したSVG文書のviewBoxを取得
	 *
	 * @param {XMLDocument} svgDoc  svg文書
	 * @returns {Object} ViewBox(x,y,width,height)sを含むオブジェクトを返す
	 */
	#getViewBox(svgDoc) {
		var va = svgDoc.documentElement.getAttribute("viewBox");
		if (va) {
			if (va.indexOf("#") == 0) {
				return va.substring(1);
			} else if (va.trim().indexOf("global") == 0) {
				// 2020/3/25 global,x,y,w,hで、global coords(経度緯度)でviewBoxを指定できる機能
				var vb = UtilFuncs.trim(va).split(/[\s,]+/);
				var globalVB = {
					x: Number(vb[1]), // longitude(w)
					y: Number(vb[2]), // latitude(s)
					width: Number(vb[3]),
					height: Number(vb[4]),
				};
				var rVB = this.#matUtil.getTransformedBox(
					globalVB,
					this.#mapViewerProps.rootCrs,
				);
				console.log("getViewBox:global,root:", globalVB, rVB, vb);
				return rVB;
			} else {
				var vb = UtilFuncs.trim(va).split(/[\s,]+/);
				return {
					x: Number(vb[0]),
					y: Number(vb[1]),
					width: Number(vb[2]),
					height: Number(vb[3]),
				};
			}
		} else {
			return null;
		}
	}

	// まだrootSVGにのみ対応している・・
	#getZoom(s2c, docId) {
		// 2020/5/13 docId(というよりレイヤーID)によって、演算パラメータを変化させる機能を実装
		var layerId = this.#svgImagesProps[docId].rootLayer;
		let docDPR;
		if (this.#layerDevicePixelRatio[layerId] != undefined) {
			docDPR = this.#layerDevicePixelRatio[layerId];
		} else {
			docDPR = this.#commonDevicePixelRatio;
		}
		const zoom = (Math.abs(s2c.a) + Math.abs(s2c.d)) / (2.0 * docDPR);
		return [zoom, docDPR];

		// 本当は、 Math.sqrt(Math.abs(s2c.a * s2c.d - s2c.b * s2c.c ) )
		//		return ( Math.sqrt(Math.abs(s2c.a * s2c.d - s2c.b * s2c.c ) ) );
		//		return ( ( Math.abs(s2c.a) + Math.abs(s2c.d) ) / ( 2.0 * commonDevicePixelRatio ) );
	}

	/**
	 *
	 * @param {Number} dpr
	 * @param {String} layerId
	 *
	 *
	 * TODO: デフォルト引数としてdpr=1, layerId="root"を設定するのがベター？
	 */
	#setDevicePixelRatio(dpr, layerId) {
		// 2020/5/13 layerId毎に指定するlayerDevicePixelRatio設定＆クリア機能を追加
		if (layerId) {
			if (dpr > 0) {
				this.#layerDevicePixelRatio[layerId] = dpr;
			} else if (!dpr) {
				delete this.#layerDevicePixelRatio[layerId];
			}
		} else {
			if (dpr > 0) {
				this.#commonDevicePixelRatio = dpr;
			} else if (!dpr) {
				this.#commonDevicePixelRatio = 1;
				this.#layerDevicePixelRatio = [];
			}
		}
	}

	/**
	 *
	 * @param {String} docId
	 * @returns {Object|Number} 縦横の比率
	 */
	#getDevicePixelRatio(docId) {
		if (!docId) {
			return {
				commonDevicePixelRatio: this.#commonDevicePixelRatio,
				layerDevicePixelRatio: this.#layerDevicePixelRatio,
			};
		} else {
			var layerId = this.#svgImagesProps[docId].rootLayer;
			if (this.#layerDevicePixelRatio[layerId] != undefined) {
				return this.#layerDevicePixelRatio[layerId];
			} else {
				return this.#commonDevicePixelRatio;
			}
		}
	}

	// HTTP通信用、共通関数
	#createXMLHttpRequest(cbFunc, timeoutFunc) {
		var XMLhttpObject = null;
		try {
			XMLhttpObject = new XMLHttpRequest();
		} catch (e) {
			alert("Too old browsers: not supported");
		}
		if (XMLhttpObject) XMLhttpObject.onreadystatechange = cbFunc;
		//	XMLhttpObject.withCredentials = true; // 認証情報をCORS時に入れる(ちょっと無条件は気になるが・・ CORSがワイルドカードだとアクセス失敗するので一旦禁止) 2016.8.23
		if (timeoutFunc) {
			// 2020/2/13 timeout処理機能を追加
			if (!this.#mapViewerProps.uaProps.MS) {
				// 2020/2/17 IEはエラーになるためopen後に実行する
				XMLhttpObject.timeout = this.#loadingTransitionTimeout;
			}
			XMLhttpObject.ontimeout = timeoutFunc;
		}
		return XMLhttpObject;
	}

	// 指定したimageIdのSVG文書のchildを全消去する
	#removeChildDocs(imageId) {
		//	if ( svgImages[imageId] && !svgImagesProps[imageId].editable){} // 仕様変更 2019/3/20 editableレイヤーでも、DOMを消去することにした
		if (this.#svgImages[imageId]) {
			var anims = this.#layerManager.getLayers(imageId);
			for (var i = 0; i < anims.length; i++) {
				this.#removeChildDocs(anims[i].getAttribute("iid"));
			}
			if (this.#svgImagesProps[imageId].domMutationObserver) {
				this.#svgImagesProps[imageId].domMutationObserver.disconnect();
			}
			delete this.#svgImages[imageId];
			delete this.#svgImagesProps[imageId];
		} else if (
			this.#svgImagesProps[imageId] &&
			this.#svgImagesProps[imageId].loadError
		) {
			if (this.#svgImagesProps[imageId].domMutationObserver) {
				this.#svgImagesProps[imageId].domMutationObserver.disconnect();
			}
			delete this.#svgImagesProps[imageId];
		}
	}

	#loadErrorStatistics = {};
	#clearLoadErrorStatistics() {
		this.#loadErrorStatistics = {
			timeoutBitImagesCount: 0,
			timeoutSvgDocCount: 0,

			otherBitImagesCount: 0,
			otherSvgDocCount: 0,
		};
	}
	#getLoadErrorStatistics() {
		return this.#loadErrorStatistics;
	}

	/**
	 * 指定されたHTML画像要素に対応するSVG要素を取得します。
	 *
	 * @param {HTMLImageElement} htmlImg HTML画像要素
	 * @returns {Object} 対応するSVG要素とドキュメントIDを含むオブジェクト
	 */
	// html文書中のimg要素(POI)を入力すると、対応するSVG文書の文書番号とその要素(use)が出力される。対応するuse要素を持つsvg文書事態を取得したい場合は.ownerDocumentする。
	// idからhtml文書のimg要素を取得するには、Document.gelElementById(id)
	#getSvgTarget(htmlImg) {
		var svgDocId = htmlImg.parentNode.getAttribute("id");
		if (svgDocId == "mapcanvas") {
			// 2015.11.14 debug (root docにPOIがある場合、htmlとsvg不一致する 関数化したほうが良いかも)
			svgDocId = "root";
		}
		var ans = UtilFuncs.getElementByImgIdNoNS(
			this.#svgImages[svgDocId],
			htmlImg.getAttribute("id"),
		);
		return {
			element: ans,
			docId: svgDocId,
		};
	}

	#retryingRefreshScreen = false;
	/**
	 * @param {Boolean} noRetry
	 * @param {} parentCaller 未使用？
	 * @param {Boolean} isRetryCall
	 * @param {Boolean} withinContext
	 * @returns {}
	 */
	#refreshScreen = function (
		noRetry,
		parentCaller,
		isRetryCall,
		withinContext,
	) {
		// MutationObserverとの不整合を回避するため、refreshScreenはマイクロタスクに積む
		// https://zenn.dev/canalun/articles/js_async_and_company_summary
		// https://developer.mozilla.org/ja/docs/Web/API/queueMicrotask
		if (withinContext) {
			return this.#refreshScreenSync(
				noRetry,
				parentCaller,
				isRetryCall,
				withinContext,
			);
		} else {
			queueMicrotask(
				function () {
					this.#refreshScreenSync(noRetry, parentCaller, isRetryCall);
				}.bind(this),
			);
		}
	}.bind(this);

	/**
	 * スクロール・パンを伴わずに画面の表示を更新(内部のSVGMapDOMとシンクロ)する処理
	 * @param {Boolean} noRetry
	 * @param {} parentCaller 未使用？
	 * @param {Boolean} isRetryCall リトライ用のフラグっぽい
	 * @returns {undefined}
	 */
	#refreshScreenSync = function (noRetry, parentCaller, isRetryCall) {
		// スクロール・パンを伴わずに画面の表示を更新(内部のSVGMapDOMとシンクロ)する処理
		// SVGMapコンテンツ全体のDOMトラバースが起きるため基本的に重い処理
		// SVGMapLv0.1.jsは画面の更新は定期的に行われ"ない" 実際は末尾のdynamicLoad()でそれが起きる
		//
		// この関数は、データのロードが起きる可能性があるため、非同期処理になっている。
		// viewBoxは変化しないので、タイルコンテンツの非同期読み込みはないものの、
		// 直前に外部リソースを読み込むDOM編集が起きたケースが非同期になる。
		// 一方、他の非同期読み込みが進んでいるときに動作することは好ましくないので・・

		// ペンディングされている間に、更に新たなrefreshScreenが来た場合は、原理的に不要(caputureGISgeomも含め)のはずなので無視する。
		// console.log("rootViewBox:", this.#mapViewerProps.rootViewBox);
		if (this.#retryingRefreshScreen && !isRetryCall) {
			console.log("Is refreshScreen retry queue:: SKIP this Call");
			return;
		}

		var rsCaller;
		/**
		console.log(
			"called refreshScreen",
			this.#resourceLoadingObserver.getLoadCompleted() ? "" : " : now loading"
		);
		**/
		if (this.#resourceLoadingObserver.getLoadCompleted() == false) {
			// loadCompletedしてないときに実行すると破綻するのを回避 2019/11/14
			if (!noRetry) {
				//				console.log( "NOW LOADING:: delay and retry refreshScreen" );
				var that = this;
				setTimeout(
					function () {
						that.#refreshScreen(noRetry, rsCaller, true);
					}.bind(this),
					10,
				); // 何度でもリトライし必ず実行することにする・・(問題起きるかも？)
				this.#retryingRefreshScreen = true;
			} else {
				//				console.log( "NOW LOADING:: SKIP refreshScreen" );
			}
			return;
		} else {
			this.#retryingRefreshScreen = false;
		}
		this.#resourceLoadingObserver.setLoadCompleted(false); // 2016.11.24 debug この関数が呼ばれるときは少なくとも(描画に変化がなくとも) loadCompletedをfalseにしてスタートさせないと、あらゆるケースでの描画完了を検知できない
		this.#dynamicLoad("root", this.#mapViewerProps.mapCanvas); // 以前はrefreshScreenのためにこの関数を生で呼んでいたが、上のいろんな処理が加わったので、それは廃止している（はず）
	}.bind(this);

	#setLayerUI;
	#updateLayerListUIint;

	/**
	 * @function
	 * @name #reLoadLayer
	 * @description 指定したレイヤー(ルートコンテナのレイヤー)をリロードする
	 *
	 * @param {String} layerID_Numb_Title
	 */
	#reLoadLayer(layerID_Numb_Title) {
		// 指定したレイヤー(ルートコンテナのレイヤー)をリロードする 2017.10.3
		// この関数は必ずリロードが起こることは保証できない。
		// なお、確実にリロードさせるには、ルートコンテナの該当レイヤ要素にdata-nocache="true"を
		// 設定する必要がある
		console.log("called reLoadLayer : ", layerID_Numb_Title);
		this.#layerManager.setRootLayersProps(layerID_Numb_Title, false, false);
		this.#refreshScreen(); // これはロードが発生しないはずなので同期で呼び出してしまう

		this.#layerManager.setRootLayersProps(layerID_Numb_Title, true, false);
		this.#refreshScreen(); // これは非同期動作のハズ
	}

	// 公開メソッド
	/**
	 *
	 * @param  {number} lat
	 * @param  {number} lng
	 * @param  {Object} crs
	 * @returns {{ x: number, y: number }}
	 */
	Geo2SVG(...params) {
		return this.#matUtil.Geo2SVG(...params);
	}
	/**
	 *
	 * @param  {SVGElement} poi
	 * @returns {void}
	 */
	POIviewSelection(...params) {
		return this.#mapTicker.POIviewSelection(...params);
	}
	/**
	 *
	 * @param  {number} svgX
	 * @param  {number} svgY
	 * @param  {Object} crs
	 * @param  {Object} inv
	 * @returns {{ lng: number, lat: number }}
	 */
	SVG2Geo(...params) {
		return this.#matUtil.SVG2Geo(...params);
	}
	/**
	 * @param {Element} elm
	 * @param {string} listener "click", "keydown"のようなイベントの種類を指定
	 * @param {Function} fn コールバック関数
	 * @returns {void}
	 */
	addEvent() {
		return UtilFuncs.addEvent;
	}
	/**
	callFunction : function ( fname ,p1,p2,p3,p4,p5){
//		console.log("call callFunc:",fname , p1,p2,p3,p4,p5);
		eval( "var vFunc = " + fname); // "
//		vFunc();
		var ans = vFunc.call(null,p1,p2,p3,p4,p5);
//		eval( fname  ).bind(null,p1,p2,p3,p4,p5);
		return ( ans );
	},
	**/
	//get basicPermanentLink(){return this.#resumeManager.getBasicPermanentLink()},
	/**
	 *
	 * @param  {} cbFunc
	 * @param  {} param1
	 * @param  {} param2
	 * @param  {} param3
	 * @param  {} param4
	 * @param  {} param5
	 * @param  {} param6
	 * @param  {} param7
	 * @returns { false | void } `GISgeometriesCaptureFlag`がすでに設定されている場合に false を返す
	 */
	captureGISgeometries(...params) {
		return this.#geometryCapturer.captureGISgeometries(...params);
	}
	captureGISgeometriesOption = function (
		BitImageGeometriesCaptureFlg,
		TreatRectAsPolygonFlg,
		SkipVectorRenderingFlg,
		captureAlsoAsBitImage,
	) {
		// 2018.2.26
		// TBD : ロードできてないイメージは外すかどうか, onViewportのもののみにするかどうか のオプションもね
		if (typeof BitImageGeometriesCaptureFlg == "object") {
			// 第一オプションをオブジェクトにした場合は、ここで全部を設定できるようにする
			for (var pn in BitImageGeometriesCaptureFlg) {
				if (
					typeof BitImageGeometriesCaptureFlg[pn] == "boolean" &&
					typeof this.#geometryCapturer.GISgeometriesCaptureOptions[pn] ==
						"boolean"
				) {
					this.#geometryCapturer.GISgeometriesCaptureOptions[pn] =
						BitImageGeometriesCaptureFlg[pn];
				}
			}
		} else {
			// バックワードコンパチのため・・・
			if (
				BitImageGeometriesCaptureFlg === true ||
				BitImageGeometriesCaptureFlg === false
			) {
				this.#geometryCapturer.GISgeometriesCaptureOptions.BitImageGeometriesCaptureFlag =
					BitImageGeometriesCaptureFlg; // ビットイメージをキャプチャするかどうか
			}
			if (TreatRectAsPolygonFlg === true || TreatRectAsPolygonFlg === false) {
				this.#geometryCapturer.GISgeometriesCaptureOptions.TreatRectAsPolygonFlag =
					TreatRectAsPolygonFlg; // rect要素をPoint扱いにするかPolygon扱いにするか
			}
			if (SkipVectorRenderingFlg === true || SkipVectorRenderingFlg === false) {
				this.#geometryCapturer.GISgeometriesCaptureOptions.SkipVectorRendering =
					SkipVectorRenderingFlg;
			}
			if (typeof captureAlsoAsBitImage == "boolean") {
				this.#geometryCapturer.GISgeometriesCaptureOptions.captureAlsoAsBitImage =
					captureAlsoAsBitImage;
			}
		}
	}.bind(this);
	/**
	 * ただこれは`isSP`を代入しているところが見つかっていないので、使われていなさそう
	 * @param  {boolean} isSP
	 * @returns {boolean}
	 */
	checkSmartphone(...params) {
		return this.#mapViewerProps.uaProps.isSP;
	}
	/**
	 * そもそもこのメソッドは使われていない
	 * @param  {} func
	 * @param  {} docHash
	 * @param  {} param1
	 * @param  {} param2
	 * @param  {} param3
	 * @param  {} param4
	 * @param  {} param5
	 * @returns {any} funcによって型が変わるため、anyとするしかない（現状このメソッドは未使用）
	 */
	childDocOp(...params) {
		return this.#linkedDocOp.childDocOp(...params);
	}
	/**
	 *
	 * @param  {string} docId
	 * @param  {HTMLElement} parentElem
	 * @returns {void}
	 */
	dynamicLoad(...params) {
		return this.#dynamicLoad(...params);
	}
	/**
	 *
	 * @param  {string} str
	 * @returns {string}
	 */
	escape(...params) {
		return UtilFuncs.escape(...params);
	}
	/**
	 *
	 * @param  {number} lat
	 * @param  {number} lng
	 * @returns {{ x: number, y: number }}
	 */
	geo2Screen(...params) {
		return this.#essentialUIs.geo2Screen(...params);
	}
	/**
	 *
	 * @param  {boolean} copyLinkTextToClipboard
	 * @returns {URL} パーマリンクを表すURLオブジェクト
	 */
	getBasicPermanentLink(...params) {
		return this.#resumeManager.getBasicPermanentLink(...params);
	}
	/**
	 *
	 * @param  {number} x
	 * @param  {number} y
	 * @param  {number} width
	 * @param  {number} height
	 * @returns {{x: number, y: number, width: number, height: number}} バウンディングボックスを表すオブジェクト
	 */
	getBBox(...params) {
		return UtilFuncs.getBBox(...params);
	}
	/**
	 *
	 * @returns {{x: number, y: number, width: number, height: number}}
	 */
	getCanvasSize(...params) {
		return UtilFuncs.getCanvasSize(...params);
	}
	/**
	 *
	 * @returns {{ lng: number, lat: number }}
	 */
	getCentralGeoCoorinates(...params) {
		return this.#essentialUIs.getCentralGeoCoorinates(...params);
	}
	/**
	 * 
	 * @param  {Object} fromCrs 
	 * @param  {Object} toCrs
	 * @returns {{ transform: conversionFunc, inverse: inverseFunc, scale: scale }}
			}
	 */
	getConversionMatrixViaGCS(...params) {
		return this.#matUtil.getConversionMatrixViaGCS(...params);
	}
	/**
	 * TODO
	 * @param  {string} originalURL
	 * @param  {boolean} alsoCrossoriginParam
	 * @returns {{ url: originalURL, crossorigin: false }}
	 */
	getCORSURL(...params) {
		return this.#proxyManager.getCORSURL(...params);
	}
	/**
	 * TODO
	 * @param  {Node} XMLNode
	 * @param  {string} searchId
	 * @returns {Element|null}
	 */
	getElementByImageId(...params) {
		return UtilFuncs.getElementByImgIdNoNS(...params);
	}
	/**
	 *
	 * @returns {{x: number, y: number, width: number, height: number, cx: number, cy: number}}
	 */
	getGeoViewBox() {
		return this.#essentialUIs.getGeoViewBox();
	}
	/**
	 *
	 * @param  {string} docPath
	 * @returns {string|null}
	 */
	getHashByDocPath(...params) {
		return this.#layerManager.getHashByDocPath(...params);
	}
	/**
	 *
	 * @param  {Element} SvgNode
	 * @returns {{href: string, target: string}|null}
	 */
	getHyperLink(...params) {
		return UtilFuncs.getHyperLink(...params);
	}
	/**
	 *
	 * @param  {Object} matrix
	 * @returns {Object|null} 複数パターンの行列を返す
	 */
	getInverseMatrix(...params) {
		return this.#matUtil.getInverseMatrix(...params);
	}
	/**
	 *
	 * @param  {string|number} layerID_Numb_Title
	 * @returns {Element|null}
	 */
	getLayer(...params) {
		return this.#layerManager.getLayer(...params);
	}
	/**
	 *
	 * @param  {Element|string} layerKey title,url,もしくはrootの要素
	 * @returns {string|null} レイヤーのimageIdを返す
	 */
	getLayerId(...params) {
		return this.#layerManager.getLayerId(...params);
	}
	/**
	 *
	 * @param  {string}  [id="root"]
	 * @returns {HTMLCollection}
	 */
	getLayers(...params) {
		return this.#layerManager.getLayers(...params);
	}
	/**
	 * @param {number} x1i - 変換前の1点目のx座標
	 * @param {number} y1i - 変換前の1点目のy座標
	 * @param {number} x2i - 変換前の2点目のx座標
	 * @param {number} y2i - 変換前の2点目のy座標
	 * @param {number} x3i - 変換前の3点目のx座標
	 * @param {number} y3i - 変換前の3点目のy座標
	 * @param {number} x1o - 変換後の1点目のx座標
	 * @param {number} y1o - 変換後の1点目のy座標
	 * @param {number} x2o - 変換後の2点目のx座標
	 * @param {number} y2o - 変換後の2点目のy座標
	 * @param {number} x3o - 変換後の3点目のx座標
	 * @param {number} y3o - 変換後の3点目のy座標
	 * @returns {{a: number, b: number, c: number, d: number, e: number, f: number} | null}
	 */
	getLinearTransformMatrix(...params) {
		return TernarySimultaneousEquationsSolution.getLinearTransformMatrix(
			...params,
		);
	}
	/**
	 *
	 * @returns {{timeoutBitImagesCount?: number, timeoutSvgDocCount?: number, otherBitImagesCount?: number, otherSvgDocCount?: number}}
	 * 		現在のエラー統計を格納したオブジェクト。`#clearLoadErrorStatistics()`未実行の場合は空オブジェクトを返す
	 */
	getLoadErrorStatistics(...params) {
		return this.#getLoadErrorStatistics(...params);
	}
	/**
	 *
	 * @returns {HTMLElement} mapCanvasは`addEvent`の引数になったり`getElementsByTagName`メソッドが使えたりするため、HTMLElementと推測される
	 */
	getMapCanvas() {
		return this.#mapViewerProps.mapCanvas;
	}
	/**
	 * キャンバスのサイズを表すオブジェクト
	 * @typedef {Object} mapCanvasSize
	 * @property {number} x - x座標
	 * @property {number} y - y座標
	 * @property {number} width - 幅
	 * @property {number} height - 高さ
	 */
	/**
	 *
	 * @returns {mapCanvasSize}　キャンバスサイズのオブジェクト（詳しくは上記）
	 */
	getMapCanvasSize() {
		return this.#mapViewerProps.mapCanvasSize;
	}
	/**
	 *
	 * @param {MouseEvent|TouchEvent} evt
	 * @returns {{ x: number, y: number }}
	 */
	getMouseXY(...params) {
		return this.#zoomPanManager.getMouseXY(...params);
	}
	/**
	 *
	 * @param  { SVGElement } svgPoiNode
	 * @returns {{ x: number, y: number, nonScaling: boolean}}
	 */
	getNonScalingOffset(...params) {
		return UtilFuncs.getNonScalingOffset(...params);
	}

	/**
	getObject : function ( oname ){
		return ( eval ( oname ) );
	},
	**/
	/**
	 *
	 * @param {Document} svgPoiNode
	 * @returns {{x:number, y:number, nonScaling:boolean}} x,y,nonScalingを含む座標オブジェクト
	 */
	getPoiPos(...params) {
		return UtilFuncs.getNonScalingOffset(...params);
	}
	/**
	 *
	 * @description 描画中のレイヤーを一時保存する関数
	 * @returns {Boolean} 描画中のレイヤーを一時保存する場合はtrue
	 */
	getResume() {
		return this.#resumeManager.getResume();
	}
	/**
	 * @description  コンテナsvgに設定されているCRSの逆変換行列( svg座標から地理座標へ変換する行列 )を取得
	 * @returns
	 */
	getRoot2Geo() {
		return this.#mapViewerProps.root2Geo;
	}
	/**
	 *
	 * @description rootに設定されているCRS(Coordinate Reference System)を取得する関数
	 * @returns {Mercator|Object} Objectの場合はa,b,c,d,e,f,isSVG属性を持つオブジェクト
	 *    TODO: 一本化するのが正しいのでは？
	 */
	getRootCrs() {
		return this.#mapViewerProps.rootCrs;
	}
	/**
	 *
	 * @param  {undefined} params - 不要 TODO:削除すること
	 * @returns {Object} 登録されているレイヤーの一覧(Container.svgと同義)
	 */
	getRootLayersProps(...params) {
		return this.#layerManager.getRootLayersProps(...params);
	}
	/**
	 *
	 * @description rootのViewBoxを取得する関数
	 * @returns {Object} x,y,width,heightの属性を持つオブジェクト
	 */
	getRootViewBox() {
		return this.#mapViewerProps.rootViewBox;
	}
	/**
	 * レイヤーIDをキーとしたレイヤーのリストを取得します。
	 *
	 * @returns {Object} svgオブジェクト
	 */
	getSvgImages() {
		return this.#svgImages;
	}
	/**
	 * レイヤーIDをキーとしたレイヤーのプロパティオブジェクトを取得します。
	 *
	 * @returns {Object} プロパティオブジェクト
	 */
	getSvgImagesProps() {
		return this.#svgImagesProps;
	}
	/**
	 * SVGMapの個別UI(LayerSpecificUI)を取得します。
	 *
	 * @returns {SvgMapLayerUI} SVGマップのレイヤーUIオブジェクト
	 */
	getSvgMapLayerUI() {
		return this.#svgMapLayerUI;
	}
	/**
	 * 指定されたHTML画像要素に対応するSVG要素を取得します。
	 *
	 * @param {HTMLImageElement} htmlImg HTML画像要素
	 * @returns {Object} 対応するSVG要素とドキュメントIDを含むオブジェクト
	 */
	getSvgTarget(...params) {
		return this.#getSvgTarget(...params);
	}
	/**
	 * 指定されたレイヤーIDに対応するSWレイヤーを取得します。
	 *
	 * @param {string} cat レイヤーに付与されたクラス名
	 * @returns {Array} 引数のクラス名が設定されたレイヤーリスト
	 */
	getSwLayers(...params) {
		return this.#layerManager.getSwLayers(...params);
	}
	/**
	 * 指定されたSVGドキュメントからシンボルを取得します。
	 *
	 * @param {Document} svgDoc SVGドキュメント
	 * @returns {Array} シンボルオブジェクト
	 */
	getSymbols(...params) {
		return UtilFuncs.getSymbols(...params);
	}

	/**
	 *
	 * @param  {undefined} params // 引数なし
	 * @returns {undefined} //返り値なし
	 */
	getTickerMetadata(...params) {
		return this.#mapTicker.getTickerMetadata(...params);
	}

	/**
	 * @description ViewBoxを変換する関数
	 * @param {Object} inBox 変換前のViewBox
	 * @param {GenericMatrix} matrix 変換行列
	 * @returns {Object|null} 変換後のViewBox（座標と縦横のサイズ）
	 */
	getTransformedBox(...params) {
		return this.#matUtil.getTransformedBox(...params);
	}
	/**
	 * @description UserAgentの情報を取得する関数
	 * @returns {Object} {isIE: Boolean, isSP: Boolean, uaProp:Object}
	 */
	getUaProp() {
		return {
			isIE: this.#mapViewerProps.uaProps.isIE,
			isSP: this.#mapViewerProps.uaProps.isSP,
			uaProp: this.#mapViewerProps.uaProps,
		};
	}

	/**
	 *
	 * @param  {Number} params // 画面上のpx
	 * @returns {Number}       // 水平距離(km)
	 */
	getVerticalScreenScale(...params) {
		return this.#essentialUIs.getVerticalScreenScale(...params);
	}

	/**
	 *
	 * @param  {XMLDocument} params
	 * @returns {Object} ViewBox(x,y,width,height)sを含むオブジェクトを返す
	 */
	getViewBox(...params) {
		return this.#getViewBox(...params);
	}

	/**
	 *
	 * @param  {undefine} params //引数なし
	 * @returns {undefined} // 戻り値なし
	 */
	gps(...params) {
		return this.#gps.gps(...params);
	}

	/**
	 * @function
	 * @name gpsCallback
	 * @description 位置情報取得に成功した後のコールバック関数をセットする関数
	 * @param  {Function} params
	 * @returns {undefined}
	 */
	gpsCallback(...params) {
		return this.#gps.gpsSuccess(...params);
	}

	/**
	 * @function
	 *
	 * @param {String} docId
	 * @param {String} docPath
	 * @param {Document} parentElem
	 * @param {Response} httpRes
	 * @param {String} parentSvgDocId
	 * @returns {undefined}
	 */
	handleResult(...params) {
		return this.#handleResult(...params);
	}

	/**
	 * @description 通常レイヤーごとにViewBoxを指定できますが、rootSVGのviewBoxを参照するフラグ
	 *
	 */
	ignoreMapAspect() {
		this.#essentialUIs.ignoreMapAspect = true;
	}

	/**
	 * 初期化関数であり、load時に"一回だけ"呼ばれる
	 *
	 * @param  {undefined} params  // 引数ない
	 * @returns {undefined}        // 戻り値もない
	 */
	initLoad(...params) {
		return this.#initLoad(...params);
	}

	/**
	 *
	 * @param {Object} rect1 x,y,width,height,nonScalingをキーに持つオブジェクト
	 * @param {Object} rect2 x,y,width,height,nonScalingをキーに持つオブジェクト
	 * @description nonScalingオプションがTrueの場合はwidth,heightを0として扱います
	 * @returns {Boolean}
	 */
	isIntersect(...params) {
		return UtilFuncs.isIntersect(...params);
	}

	/**
	 * @function 子文書に対して、同じ処理(func)を再帰実行する関数
	 *
	 * @param {Function} func
	 * @param {String} docHash svgDocId?
	 * @param {Object} param1
	 * @param {Object} param2
	 * @param {Object} param3
	 * @param {Object} param4
	 * @param {Object} param5
	 */
	linkedDocOp(...params) {
		return this.#linkedDocOp.linkedDocOp(...params);
	}

	/**
	 *
	 * @param {String} path
	 * @param {String} id
	 * @param {Document} parentElem
	 * @param {*} parentSvgDocId -- 不明
	 * @returns {undefined}
	 */
	loadSVG(...params) {
		return this.#loadSVG(...params);
	}

	/**
	 * @function 2つの行列の積を計算する関数
	 *
	 * @param {GenericMatrix} m1
	 * @param {GenericMatrix} m2
	 * @returns {Object} // GenericMatrixで返すの方がよいのでは？
	 */
	matMul(...params) {
		return this.#matUtil.matMul(...params);
	}

	/**
	 * @function 小数点以下の桁数をそろえる
	 *
	 * @param {Number} number
	 * @param {Number} digits デフォルト7桁
	 * @returns {Number}
	 */
	numberFormat(...params) {
		return UtilFuncs.numberFormat(...params);
	}
	/**
	override : function ( mname , mval ){
//		console.log("override " + mname );
		eval( mname + " = mval; "); // もっと良い方法はないのでしょうか？
//		console.log("override " + mname + " : " , this[mname] , showPoiProperty , this.showPoiProperty , this);
	},
	**/

	/**
	 *
	 * @param  {String} csv
	 * @returns {Array}
	 */
	parseEscapedCsvLine(...params) {
		return this.#mapTicker.showPoiProperty.parseEscapedCsvLine(...params);
	}

	/**
	 * @param {Boolean} noRetry
	 * @param {} parentCaller 未使用？
	 * @param {Boolean} isRetryCall
	 * @param {Boolean} withinContext
	 * @returns {undefined}
	 */
	refreshScreen(...params) {
		return this.#refreshScreen(...params);
	}

	/**
	 *
	 * @param {Function} layerUIinitFunc
	 * @param {Function} layerUIupdateFunc
	 *
	 */
	registLayerUiSetter(layerUIinitFunc, layerUIupdateFunc) {
		console.log("registLayerUiSetter:", layerUIinitFunc, layerUIupdateFunc);
		this.#setLayerUI = layerUIinitFunc;
		this.#updateLayerListUIint = layerUIupdateFunc;
		/**
		this.#updateLayerListUIint = function(){
			this.#layerSpecificWebAppHandler.syncLayerSpecificUi(); // 非表示のレイヤーについて、レイヤーwebAppを終了させる
			layerUIupdateFunc();
			this.#layerSpecificWebAppHandler.checkLayerListAndRegistLayerUI();
		}.bind(this);
		**/
	}

	/**
	 * @function
	 * @description 指定したレイヤー(ルートコンテナのレイヤー)をリロードする
	 *
	 * @param {String} layerID_Numb_Title
	 * @returns {undefined}
	 */
	reLoadLayer(...params) {
		return this.#reLoadLayer(...params);
	}

	/**
	 *
	 * @param  {Object} params DOM Event
	 * @returns {undefined}
	 */
	resumeToggle(...params) {
		return this.#resumeManager.resumeToggle(...params);
	}

	/**
	 *
	 * @param {Number} screenX
	 * @param {Number} screenY
	 * @returns {Object|null} lat/lngのキーを含むhashを戻す
	 */
	screen2Geo(...params) {
		return this.#essentialUIs.screen2Geo(...params);
	}

	/**
	 *
	 * @param {String|Document} messageHTML
	 * @param {Array} buttonMessages // どういう中身かまでわかっていない
	 * @param {Function} callback
	 * @param {Object} callbackParam
	 * @returns {undefined}
	 */
	setCustomModal(...params) {
		return this.#customModal.setCustomModal(...params);
	}

	/**
	 * デフォルトのヒット時のハイライトスタイルを上書きする
	 * @param {Object} style .stroke.(color,widthIncrement), .fill.(color,lineWidth)
	 * @returns {undefined}
	 */
	setDefaultHilightStyle(...params) {
		this.#pathRenderer.setDefaultHilightStyle(...params);
	}

	/**
	 *
	 * @param {Number} dpr
	 * @param {String} layerId
	 * @returns {undefined}
	 */
	setDevicePixelRatio(...params) {
		return this.#setDevicePixelRatio(...params);
	}

	/**
	 *
	 * @param  {Null|String} params
	 * @returns {Object|Number}
	 */
	getDevicePixelRatio(...params) {
		return this.#getDevicePixelRatio(...params);
	}

	/**
	 * @param {Number} lat 必須
	 * @param {Number} lng 必須
	 * @param {Number} radius [lat-side-deg]オプション(今の縮尺のまま移動) ( setGeoViewPort(lat,lng,h,w) という関数もあります )

	 * @returns {undefined}
	 */
	setGeoCenter(...params) {
		return this.#essentialUIs.setGeoCenter(...params);
	}

	/**
	 *
	 * @param {Number} lat
	 * @param {Number} lng
	 * @param {Number} latSpan //緯度方向の範囲？単位はdegree？
	 * @param {Number} lngSpan //軽度方向の範囲？単位はdegree？
	 * @param {Boolean} norefresh //画面更新を実施するかのフラグ
	 * @returns {Boolean}
	 */
	setGeoViewPort(...params) {
		return this.#essentialUIs.setGeoViewPort(...params);
	}

	/**
	 *
	 * @param {String} layerID_Numb_Title
	 * @param {*} visible //型が不明(Boolean or String)
	 * @returns {undefined} //戻り値なし
	 */
	setLayerVisibility(...params) {
		return this.#layerManager.setLayerVisibility(...params);
	}

	/**
	 *
	 * @param {Object} mc 多分Objectだけど、MapViewerPropsの中で操作されてない
	 */
	setMapCanvas(mc) {
		this.#mapViewerProps.mapCanvas = mc;
	}

	/**
	 *
	 * @param  {Object} mc MapCanvas向けのstyle設定
	 * @returns {undefined}
	 */
	setMapCanvasCSS(...params) {
		return this.#essentialUIs.setMapCanvasCSS(...params);
	}

	/**
	 *
	 * @param {Object} mcs x,y,width,height属性を含むMapCanvasSize
	 */
	setMapCanvasSize(mcs) {
		this.#mapViewerProps.setMapCanvasSize(mcs);
	}

	/**
	 *
	 * @param {String} layerId docIDとの違いが分からず。こっちがiX:Xは数字なのかもしれない
	 * @param {Function} pcf レンダリングする前に実行したい関数をセットする（一般ユーザのユースケースが分からず）
	 */
	setPreRenderController(layerId, pcf) {
		// SVGMapLv0.1_PWAで使用
		if (typeof pcf == "function") {
			if (layerId) {
				this.#svgImagesProps[layerId].preRenderControllerFunction = pcf;
			} else {
				this.#preRenderSuperControllerFunction = pcf;
			}
		} else {
			if (layerId) {
				delete this.#svgImagesProps[layerId].preRenderControllerFunction;
			} else {
				this.#preRenderSuperControllerFunction = null;
			}
		}
	}
	/**
	 *
	 * @param {Function} documentURLviaProxyFunction
	 * @param {Function} imageURLviaProxyFunction
	 * @param {Boolean} imageCrossOriginAnonymous
	 * @param {Function} imageURLviaProxyFunctionForNonlinearTransformation
	 * @param {Boolean} imageCrossOriginAnonymousForNonlinearTransformation
	 * @returns {undefined}
	 */
	setProxyURLFactory(...params) {
		return this.#proxyManager.setProxyURLFactory(...params);
	}
	setResume(stat) {
		this.#resumeManager.setResume(stat);
	}

	/**
	 *
	 * @param {String} layerID_Numb_Title
	 * @param {*} visible //Booleanなのかvisible/hiddenというStringが入るのかわからない
	 * @param {Boolean} editing
	 * @param {String} hashOption //queryStringとしてURLに付与されるようです。
	 * @param {Boolean} removeLayer //子要素を削除するオプション
	 * @returns {undefined}
	 */
	setRootLayersProps(...params) {
		return this.#layerManager.setRootLayersProps(...params);
	}

	/**
	 *
	 * @param {Object} rvb  ViewBox:画面中心座標と縦横の範囲と推測
	 */
	setRootViewBox(rvb) {
		this.#mapViewerProps.setRootViewBox(rvb);
	}

	/**
	 * 特定のレイヤー・svg文書(いずれもIDで指定)もしくは、全体に対して別のプロパティ表示関数を指定する。
	 * @param  {Function} func
	 * @param  {String} docId svg文書ID i*:*は数字
	 * @returns {undefined}
	 */
	setShowPoiProperty(...params) {
		return this.#mapTicker.showPoiProperty.setShowPoiProperty(...params);
	}

	/**
	 * アクティブなレイヤーに設定されているShowPoiProperyのバックアップを全て取得する
	 * @returns {void} 戻り値なし
	 */
	backupShowPoiProperty() {
		this.#mapTicker.showPoiProperty.backupShowPoiProperty();
	}

	/**
	 * アクティブなレイヤーのShowPoiProperyをバックアップから復元する
	 * @returns {void} 戻り値なし
	 */
	restoreShowPoiProperty() {
		this.#mapTicker.showPoiProperty.restoreShowPoiProperty();
	}

	/**
	 * ズームイン／アウト後のタイル読み込み開始タイマー
	 * @param  {String} zoomInterval // msec
	 * @returns
	 */
	setSmoothZoomInterval(...params) {
		return this.#zoomPanManager.setSmoothZoomInterval(...params);
	}

	/**
	 *
	 * @param  {String} zoomTransitionTime ズームイン／アウト時の遷移時間(たぶん msec)
	 * @returns {undefined}
	 */
	setSmoothZoomTransitionTime(...params) {
		return this.#zoomPanManager.setSmoothZoomTransitionTime(...params);
	}

	/**
	 *
	 * @param {Boolean} val //Canvasの描画？を高速化するフラグ？らしい
	 */
	setSummarizeCanvas(val) {
		this.#summarizeCanvas = val;
	}

	/**
	 *
	 * @param  {Function} func
	 * @returns {undefined}
	 */
	setUpdateCenterPos(...params) {
		return this.#essentialUIs.setUpdateCenterPos(...params);
	}

	/**
	 *
	 * @param {Number} ratio ズーム倍率
	 */
	setZoomRatio(ratio) {
		this.#zoomPanManager.setZoomRatio(ratio);
	}

	/**
	 *
	 * @param {String} htm UIなどを含むHTMLをStringにて受け渡します
	 * @param {Number} maxW
	 * @param {Number} maxH
	 * @returns {Document} UIのDocumentObjectが返却
	 */
	showModal(...params) {
		return this.#mapTicker.showPoiProperty.showModal(...params);
	}

	/**
	 * @param  {String} hyperLink URL
	 * @returns {undefined}
	 */
	showPage(...params) {
		return this.#mapTicker.showPage(...params);
	}

	/**
	 * @param  {Object} target DOMのような気がする
	 * @returns {undefined}
	 */
	showUseProperty(...params) {
		return this.#mapTicker.showUseProperty(...params);
	}

	/**
	 * @param {Number} x 座標
	 * @param {Number} y 座標
	 * @param {Object} mat 2x2の変換行列
	 * @param {Boolean} calcSize （用途不明）
	 * @param {Object} nonScaling 2x1の行列（用途不明）
	 * @returns
	 */
	transform(...params) {
		return this.#matUtil.transform(...params);
	}
	/**
	 *
	 * @param  {undefined} params 引数なし
	 * @returns {undefined}
	 */
	updateLayerListUI = function () {
		console.log("updateLayerListUI called  this:", this);
		if (typeof this.#updateLayerListUIint == "function") {
			this.#updateLayerListUIint();
		}
	}.bind(this);
	/**
	 *
	 * @param  {undefined} params 引数なし
	 * @returns {undefined}
	 */
	zoomdown(...params) {
		return this.#zoomPanManager.zoomdown(...params);
	}
	/**
	 *
	 * @param  {undefined} params 引数なし
	 * @returns {undefined}
	 */
	zoomup(...params) {
		return this.#zoomPanManager.zoomup(...params);
	}
}

export { SvgMap };
