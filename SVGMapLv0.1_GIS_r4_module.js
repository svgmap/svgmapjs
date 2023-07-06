// 
// Description:
// SVGMap GIS Module for >rev13 of SVGMap Lv0.1 framework
// Programmed by Satoru Takagi
// 
//  Programmed by Satoru Takagi
//  
//  Copyright (C) 2016-2021 by Satoru Takagi @ KDDI CORPORATION
//  
// Contributors:
//  jakkyfc
//
// License: (GPL v3)
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 3 as
//  published by the Free Software Foundation.
//  
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//  
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
// 
// History:
// 2016.12.02 コアにGeoJSONパース機能実装、それを用いたPolygon内のPoitns包含チェック初期実装
// 2016.12.07 JSTS implementation
// 2016.12.16 Totally Asynchronus Proecssing　ほぼ満足する機能が入ったと思われる。＞初期リリースとする
// 2017.06.12 Geojsonの並びが逆(基本フレームワークも)だったのを修正のうえ、こちらも修正(getSVGcoord)、drawGeoJson(geoJson->SVG変換の上描画)の完成度を高め公開関数へ
// 2018.01.04 Geojsonファイル内にプロパティが含まれている場合、埋め込むよう実装
// 2018/06/21 Rev2 : ラスターGIS＝ビットイメージのimageをcanvasに読み込み、bitImage(画像処理)を用いたGIS機能～～　Web上で公開されている主題情報の多くがラスターなので・・
// 2018/08/01 Add pointOnly option / get(Included/Excluded)Points
// 2018.12.26 KMLを直接レンダリングする機能を実装
// 2019/05/17 getInRangePoints(): Coverageがtransform付きのものをサポート
// 2019/12/26 効率向上のためのオプション追加(getIncludedPointsのpreCapturedGeometry)
// 2020/01/14 buildDifference()
// 2020/01/30 ラスターGISの高速化に着手：getImagePixData 自ドメイン経由のビットイメージの場合、画面に表示しているimgリソースをそのまま画像処理用として利用する。　これをより有効にするため、コアモジュールもbitimageをproxy経由で取得させる機能を実装している(svgMap.setProxyURLFactory)
// 2020/02/14 ラスターGISの高速化・大分完成 残るはcrossorigin anonymousをどうするか
// 2020/02/17 ラスターGISの高速化。多分これで完成しました (naturalWidth/Height, crossorigin拡張 on BaseFW)
// 2020/07/08 ラスターGIS: Polyline実装
// 2020/07/10 ラスターGIS: Plygon実装  - これでRev3の重要機能完成
// 2020/07/15 ラスターGIS(Polygon)結果のビットイメージ可視化用関数　＆　コード整理
// 2020/07/27 Rev3 : ラスターGIS: 非対角成分あるラスターカバレッジでもPolyline,Polygonサポート
// 2021/04/13 drawGeoJson: geoJsonのスタイリング仕様(mapbox)をサポート
// 2021/10/27 ラスターGISの画像キャッシュの明示的なOn/Offを可能に
// 2022/03/xx geoJsonのレンダラのバグ修正・高速化
// 2022/04/xx Proxy処理をリファクタリング(メインのFW側および切り出したcorsProxy.js側で処理するように)
// 2022/10/21 ラスターGIS: filterをサポート
// 2023/05/11 getBufferedPolygon
//
// ISSUES:
//
// --- これらはFixedとなったかな？
// !!!!! On going ISSUE 使い続けているとUncaught TypeError: Cannot read property 'points' of undefined at getInRangePointsS2 (SVGMapLv0.1_GIS_r2.js:110x)？？ R15のテストで、避難所と土石流危険渓流とRasterGISで、連続検索実行でテスト可能になってる
// 
// 今行っているところ、L1361 同一||CORS設定ドメインからの取得
// setImageProxyで設定したドメインのURLもしくは・・・って感じが良いと思う
// --- 

// 
// ACTIONS:
// ・ポリゴン包含、ポリラインクロス等の基本関数(jtsのような) done
// ・ポイント（マウスポインタ―）と、ポイント、ポリライン、ポリゴンヒットテスト（既存のクリッカブルオブジェクト同等動作）：　ただし、ポイント、ポリラインはバッファが必要なので後回しか？ done
// ・ラインと、ライン、ポリゴンのヒットテスト done
// ・ポリゴンと、ポイント、ライン、ポリゴンのヒットテスト done
// ・カラーピッカーになりえるもの done
// ・ベクタプロパティの利用 done
// ・オートパイロット機能のフレームワーク化(vectorGisLayer/rasterGisLayerの実装の改善と取り込み)
// ・svgMap.setProxyURLFactoryを個々で統合的に設定するようにした方が良いと思う
//
// ・入力：
// 　・マウスポインタ―ベースの対話的に生成されたオブジェクトと指定したレイヤー
// 　　⇒　マウスポインタ―によるポイント、ライン、ポリゴンの生成ＵＩ
// 　　⇒　結果的にインタラクティブなオーサリングシステム
// 　・指定したレイヤー１と、指定したレイヤー２（および　指定したSVG文書１とSVG文書２）
// ・出力：対象レイヤーのスタイル変更、新規レイヤー生成

class SvgMapGIS {
	
	#svgMap;
	#jsts;
	
	#featureReader;
	#featureWriter;
	#getFeature;
	#getGeoJson;
	
//	console.log("Hello this is svgMapGIStool");
	constructor(svgMapObject, jstsObject){
		this.#jsts = jstsObject;
		this.#svgMap = svgMapObject;
		if ( this.#jsts ){ // using jsts (JTS javascript edition) https://bjornharrtell.github.io/jsts/
	//		console.log("This apps has jsts (JavaScript Topology Suites)");
			this.#featureReader = new this.#jsts.io.GeoJSONReader();
			this.#featureWriter = new this.#jsts.io.GeoJSONWriter();
			this.#getFeature = function( geojs ){
				if ( geojs.type=="MultiLineString"){
					for ( var i = geojs.coordinates.length-1 ; i >= 0 ; i-- ){
						if ( geojs.coordinates[i].length <2 ){
							geojs.coordinates.splice(i,1);
						}
					}
				} else if ( geojs.type=="Polygon"){
					for ( var i = geojs.coordinates.length-1 ; i >= 0 ; i-- ){
						if ( geojs.coordinates[i].length <3 ){
							geojs.coordinates.splice(i,1);
						}
					}
				}
				return (this.#featureReader.read(geojs));
			}.bind(this)
			this.#getGeoJson = function( feature ){
				return (this.#featureWriter.write(feature));
			}.bind(this);
		}
		//console.log("init svgmapgis",this.#jsts,this.#getGeoJson);
	//	console.log(featureReader, featureWriter, getFeature, getGeoJson);
		
		// http://stackoverflow.com/questions/22521982/js-check-if-point-inside-a-polygon
	}
	
	#inside(point, vs) {
	    // ray-casting algorithm based on
	    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

	    var x = point[0], y = point[1];

	    var inside = false;
	    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
	        var xi = vs[i][0], yi = vs[i][1];
	        var xj = vs[j][0], yj = vs[j][1];

	        var intersect = ((yi > y) != (yj > y))
	            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
	        if (intersect) inside = !inside;
	    }
		
	    return inside;
	};
	
	// サブパス(ドーナツ)がある場合がある"ポリゴン"に対する内包判定
	#insidePolygon( point , polygon ){
		var ans = this.#inside ( point , polygon[0] );
		
		if ( ans && polygon.length > 1 ){
			for ( var i = 1 ; i < polygon.length ; i++ ){
				if ( this.#inside( point , polygon[i] ) ){
					ans = false;
					break;
				}
			}
		}
		
//		console.log( ans );
		return ( ans );
	}
	
	
	//http://kone.vis.ne.jp/diary/diaryb09.html
	
	
	// 線分abと、線分cdが交錯しているかどうかの判定。
	// http://qiita.com/ykob/items/ab7f30c43a0ed52d16f2
	#isIentersected(ax, ay, bx, by, cx, cy, dx, dy) {
		var ta = (cx - dx) * (ay - cy) + (cy - dy) * (cx - ax);
		var tb = (cx - dx) * (by - cy) + (cy - dy) * (cx - bx);
		var tc = (ax - bx) * (cy - ay) + (ay - by) * (ax - cx);
		var td = (ax - bx) * (dy - ay) + (ay - by) * (ax - dx);
		return tc * td < 0 && ta * tb < 0;
	};
	
	// https://github.com/bjornharrtell/jsts
	// http://stackoverflow.com/questions/27683931/mongodb-geospatial-intersection-of-two-polygon
	// http://qiita.com/amay077/items/7a99df1c0da881cc47f6
	// https://github.com/mapbox/lineclip
	// https://github.com/mapbox/concaveman
	// https://github.com/mapbox/geojson-extent
	// https://github.com/mapbox/linematch
	// clip https://github.com/mapbox/lineclip
	
	// Javascript Clipper
	// https://sourceforge.net/projects/jsclipper/

	// weiler-athertonアルゴリズム 
	// https://github.com/morganherlocker/weiler-atherton
	
	
	// 画面中の、指定したレイヤのポリゴンに包含されている指定したレイヤのPOIを検索する
	// poiID : POIのレイヤID（その子供の文書も対象）、polyID: ポリゴンのレイヤID
	#getIncludedPoints(poiID, polyID, cbFunc, param , progrssCallback , inverse , pointOnly ,getIncludedPolygonAttr , preCapturedGeometry){
	// 2019.12.26 : preCapturedGeometry あらかじめ別に取得済みのgeom.を流用したいときに指定 : 今後同様オプションをcaptureGISgeometries実行しているロジックに入れていくだろう
		var superParam = {
			pointsDocTreeID: poiID,
			polygonsDocTreeID: polyID,
			cbFunc: cbFunc,
			param: param,
			progrssCallback: progrssCallback,
			inverse: inverse,
			pointOnly : pointOnly,
			getIncludedPolygonAttr : getIncludedPolygonAttr
		}
		var pointsDocTreeID = poiID;
		var polygonsDocTreeID = polyID;
		console.log( "called getIncludedPoints:", pointsDocTreeID, polygonsDocTreeID);
//		svgMap.captureGISgeometries(getIncludedPointsS2 , superParam );
		if ( ! preCapturedGeometry ){
			this.#svgMap.captureGISgeometries(this.#getIncludedPointsS2a , superParam ); // まずはGIS Geomを取得し、それから包含判定を行う(非同期)
		} else {
			console.log("getIncludedPoints: USE preCapturedGeometry");
			this.#getIncludedPointsS2a(preCapturedGeometry,superParam); // あらかじめキャプチャしてあるgeometryがある場合は飛ばす
		}
	}
	
	#getExcludedPoints(poiID, polyID, cbFunc, param , progrssCallback , pointOnly ){
		this.#getIncludedPoints(poiID, polyID, cbFunc, param , progrssCallback , true , pointOnly );
	}
	
	
	// PolygonやMultiLineStringの中心(実際はbboxの中心)をPointと見做すための処理
	#getCenterPoint( coordinates ){
		var minX=60000,minY=60000,maxX=-60000,maxY=-60000;
		for ( var i = 0 ; i < coordinates.length ; i++ ){
			for ( var j = 0 ; j < coordinates[i].length ; j++ ){
				if (coordinates[i][j][0] < minX ){
					minX = coordinates[i][j][0];
				}
				if ( coordinates[i][j][0] > maxX ){
					maxX = coordinates[i][j][0];
				}
				if (coordinates[i][j][1] < minY ){
					minY = coordinates[i][j][1];
				}
				if ( coordinates[i][j][1] > maxY ){
					maxY = coordinates[i][j][1];
				}
			}
		}
		var cx = (minX + maxX )/ 2;
		var cy = (minY + maxY )/ 2;
		return [cx,cy];
	}
	
	#getIncludedPointsS2( geom , superParam ){
		
		// extract from superParams
		var pointsDocTreeID = superParam.pointsDocTreeID;
		var polygonsDocTreeID = superParam.polygonsDocTreeID;
		var cbFunc = superParam.cbFunc;
		var param = superParam.param;
		var progrssCallback = superParam.progrssCallback;
		var inverse = superParam.inverse;
		
		console.log("Searched geom:",geom);
		if ( inverse && inverse == true ){
		} else {
			inverse = false;
		}
		
		var cdi = this.#getChildDocsId(pointsDocTreeID,polygonsDocTreeID)
		var pointsDocTreeIDs = cdi.childrenId1;
		var polygonsDocTreeIDs = cdi.childrenId2;
		var totalPoiCount = 0;
		var ansPois = new Array();
		for ( var poiDocC = 0 ; poiDocC < pointsDocTreeIDs.length ; poiDocC++ ){
		
	//		console.log("searchedGeom:",geom, "   inverse?:",inverse);
			if ( geom[pointsDocTreeIDs[poiDocC]]  ){
				var inclPi = [];
				
				var poiDoc = geom[pointsDocTreeIDs[poiDocC]];
				
				console.log("poi:",poiDoc);
				
				totalPoiCount +=  poiDoc.length;
				for ( var pic = 0 ; pic < poiDoc.length ; pic++ ){
					var point;
					if ( poiDoc[pic].type === "Point" ){
						point = poiDoc[pic].coordinates;
					} else if (poiDoc[pic].type === "Polygon" || poiDoc[pic].type === "MultiLineString"){
						console.log(poiDoc[pic]);
						point = this.#getCenterPoint(poiDoc[pic].coordinates);
					} else {
						continue;
					}
						
					loop: for ( var polDocC = 0 ; polDocC < polygonsDocTreeIDs.length ; polDocC++ ){
						
						if ( geom[polygonsDocTreeIDs[polDocC]] ){
							var polDoc = geom[polygonsDocTreeIDs[polDocC]];
							
							console.log("pol:",polDoc);
							
							for ( var plc = 0 ; plc < polDoc.length ; plc ++ ){
								if ( polDoc[plc].type != "Polygon" ){
									continue;
								}
								polygon = polDoc[plc].coordinates;
								if ( !inverse ){ // 内包判定
									if (  this.#insidePolygon( point , polygon ) ){
										// 一個でも内包してたらそれで内包判断完了
										ansPois.push(poiDoc[pic]);
										break loop;
									}
								} else { // 非内包判定
									if (  this.#insidePolygon( point , polygon ) ){
										break loop; // 一個でも内包してたらそれでアウト
									} else if ( plc == polDoc.length - 1 ){
										// 最後まで検索できていて内包してなければOK
										ansPois.push(poiDoc[pic]);
									}
								}
							}
						}
					}
				}
			}
		}
		cbFunc(ansPois , totalPoiCount , param ); // 検索したPOIを全部Arrayとして返す。一個パラメータを渡せる
	}
	
	// 非同期での包含判定のための前処理　包含判定に必要な全組み合わせを構築する (指定したレイヤのPOI全部 × 指定したレイヤのポリゴン全部 の組み合わせをArrayに投入)
	// 重くなることがあるので、非同期処理版を作る・・・
	#getIncludedPointsS2a( geom , superParam ){
		console.log("getIncludedPointsS2a called : ",geom);
//		var cdi = getChildDocsId(superParam.pointsDocTreeID, superParam.polygonsDocTreeID)
		var pointsDocTreeIDs = this.#getChildDocsId(superParam.pointsDocTreeID);
		superParam.pointsDocTreeIDs = pointsDocTreeIDs;
		var polygonsDocTreeIDs = this.#getChildDocsId(superParam.polygonsDocTreeID);
		superParam.polygonsDocTreeIDs = polygonsDocTreeIDs;
		var totalPoiCount = 0;
		var ansPois = new Array();
		
		var compArray = [];
		for ( var poiDocC = 0 ; poiDocC < pointsDocTreeIDs.length ; poiDocC++ ){
			if ( geom[pointsDocTreeIDs[poiDocC]]  ){
				var poiDoc = geom[pointsDocTreeIDs[poiDocC]];
				totalPoiCount +=  poiDoc.length;
				for ( var pic = 0 ; pic < poiDoc.length ; pic++ ){
					for ( var polDocC = 0 ; polDocC < polygonsDocTreeIDs.length ; polDocC++ ){ // Loop:seki point
						if ( geom[polygonsDocTreeIDs[polDocC]] ){
							var polDoc = geom[polygonsDocTreeIDs[polDocC]];
//							console.log("polDoc:",polDoc);
							for ( var plc = 0 ; plc < polDoc.length ; plc ++ ){
								compArray.push([poiDocC,pic,polDocC,plc]);
							}
						}
					}
				}
			}
		}
		superParam.totalPoiCount = totalPoiCount;
		
		// console.log("call getIncludedPointsS3 :" , compArray);
		this.#getIncludedPointsS3( geom, superParam , compArray); // 組み合わせが構築出来たら実際の包含判定に進む(非同期)
	}
	
	// 非同期処理での包含判定演算の実体
	// すべての組み合わせに対して実施
	#getIncludedPointsS3( geom , superParam , compArray , counter , startTime , ansPois ){
		
		
		if ( ! counter ){
			startTime = new Date().getTime();
			ansPois = [];
			counter = 0;
		}
		while ( counter < compArray.length && this.#halt == false){
			
//			console.log("counter:",counter);
			//
			var poiDocC = compArray[counter][0];
			
			var poiDoc = geom[superParam.pointsDocTreeIDs[poiDocC]];
			
			
			//
			var pic = compArray[counter][1];
			
			var point;
			if ( poiDoc[pic].type === "Point" ){
				point = poiDoc[pic].coordinates;
			} else if (!superParam.pointOnly && ( poiDoc[pic].type === "Polygon" || poiDoc[pic].type === "MultiLineString" ) ){
//				console.log(poiDoc[pic]);
				point = this.#getCenterPoint(poiDoc[pic].coordinates);
			} else {
				counter = this.#skipPOIcounter(compArray, counter) ;  // picを一個増加させる・スキップさせる処理
				// これはまずいのではないか？　結局nullのpointで、下を回してしまうような気がする。
				// ので以下の処理を入れてみたが・・・バグ出るかも 2016.12.28
				++ counter;
				continue;
			}
			
			//
			var polDocC = compArray[counter][2];
			
			var polDoc = geom[superParam.polygonsDocTreeIDs[polDocC]];
			
			//
			var plc = compArray[counter][3];
			
			if ( polDoc[plc].type != "Polygon" ){
				// 2016/12/28 debug 結構残念なバグ・・
				if ( superParam.inverse && plc == polDoc.length - 1 ){
					ansPois.push(poiDoc[pic]);
				}
				++ counter;
				continue;
			}
			var polygon = polDoc[plc].coordinates;
			if ( !superParam.inverse ){ // 内包判定
				if (  this.#insidePolygon( point , polygon ) ){
					// 一個でも内包してたらそれで内包判断完了 ⇒こうするかどうかは今後選択にすべき(複数のポリゴンに内包されてて、そのポリゴンはどんな属性なのかを知りたいケースがある)2019/12/19
					if ( superParam.getIncludedPolygonAttr ){ // 2019/12/19
//						console.log("polygon:",polDoc[plc],"  point:",poiDoc[pic]);
						poiDoc[pic].includedPolygonAttr = polDoc[plc].src.getAttribute("content");
					}
					ansPois.push(poiDoc[pic]);
//					console.log("PUSH");
					counter = this.#skipPOIcounter(compArray, counter);
				}
			} else { // 非内包判定
				if (  this.#insidePolygon( point , polygon ) ){
					counter = this.#skipPOIcounter(compArray, counter); // 一個でも内包してたらそれでアウト picを一個増加させる
				} else if ( plc == polDoc.length - 1 ){
					// 最後まで検索できていて内包してなければOK
					console.log("PUSH");
					ansPois.push(poiDoc[pic]);
				}
			}
			//
			
//			console.log("step:",counter,"  comp end");
			
			var currentTime =  new Date().getTime();
			++ counter;
			if ( currentTime - startTime > 500 ){ // 0.5秒以上たったらちょっと(20ms)休憩
				console.log( "call laze compu",counter, compArray.length , Math.ceil(counter /  compArray.length));
				if ( superParam.progrssCallback ){
					superParam.progrssCallback( Math.ceil(1000 * counter /  compArray.length) / 10 );
				}
				startTime = new Date().getTime();
				setTimeout(getIncludedPointsS3.bind(this), 20 , geom, superParam, compArray , counter , startTime , ansPois);
				break;
			}
		}
		this.#halt = false;
		if ( counter == compArray.length ) {
			if ( superParam.progrssCallback ){
				superParam.progrssCallback( 100 );
			}
			console.log("Completed!",ansPois );
			
			superParam.cbFunc(ansPois , superParam.totalPoiCount , superParam.param );
			
		}
	}
	
	// getIncludedPointsS3における、そのPOIに対する評価のためのcompArrayカウンター分をスキップするカウンター値生成
	#skipPOIcounter(compArray, counter){
//		console.log("called:skipPOIcounter:",counter);
		var ansCounter = counter;
		var currentPoiC = compArray[counter][1]; // [1]がPOIの値？じゃないよ・・・
		var currentPoiDC = compArray[counter][0]; // [0]でPOIのドキュメントの値も評価しないとダメ DEBUG 2019/12/20
		var poiC = currentPoiC;
		var poiDC = currentPoiDC;
		while ( (poiC == currentPoiC && poiDC == currentPoiDC ) ){
			++ansCounter;
			if ( ansCounter == compArray.length ){
//				console.log("BREAK.....");
				break;
			}
			poiC = compArray[ansCounter][1];
			poiDC = compArray[ansCounter][0];
		}
		return ( ansCounter -1);
	}
	
	// 下の、buildIntersectionをラップし、"difference" | "union" | "symDifference"　を実行する関数
	#buildDifference( sourceId1, sourceId2, targetId , strokeColor, strokeWidth, fillColor, progrssCallback, addSourceMetadata, getResultAsGeoJsonCallback,getResultAsGeoJsonCallbackParam){
		return (this.#buildIntersection( sourceId1, sourceId2, targetId , strokeColor, strokeWidth, fillColor, progrssCallback, addSourceMetadata, getResultAsGeoJsonCallback,getResultAsGeoJsonCallbackParam, "difference"));
	}
	/**
	#buildUnion( sourceId1, sourceId2, targetId , strokeColor, strokeWidth, fillColor, progrssCallback, getResultAsGeoJsonCallback,getResultAsGeoJsonCallbackParam){
		return (buildIntersection( sourceId1, sourceId2, targetId , strokeColor, strokeWidth, fillColor, progrssCallback, null, getResultAsGeoJsonCallback,getResultAsGeoJsonCallbackParam, "union"));
	}
	#buildSymDifference( sourceId1, sourceId2, targetId , strokeColor, strokeWidth, fillColor, progrssCallback, getResultAsGeoJsonCallback,getResultAsGeoJsonCallbackParam){
		return (buildIntersection( sourceId1, sourceId2, targetId , strokeColor, strokeWidth, fillColor, progrssCallback, null, getResultAsGeoJsonCallback,getResultAsGeoJsonCallbackParam, "symDifference"));
	}
	**/
	// sourceLayer1,2のintersectionをtargetLayerに生成する。(getResultAsGeoJsonCallbackがあればそちらにもgeojsonを出力する)
	//
	// 2020/1/10 processMode: "intersection" | "difference" | "union" | "symDifference"
	// 今のところ、intersectionだけ処理が違うので注意
	
	#buildIntersection( sourceId1, sourceId2, targetId , strokeColor, strokeWidth, fillColor, progrssCallback, addSourceMetadata, getResultAsGeoJsonCallback,getResultAsGeoJsonCallbackParam, processMode){
		this.#halt = false;
		if (!processMode){
			processMode="intersection";
		}
		
		var svgImages = this.#svgMap.getSvgImages();
		var svgImage = svgImages[targetId];
		var resultGroup = svgImage.getElementById("resultGroup");
		if ( !resultGroup ){
			resultGroup = svgImage.createElement("g");
			resultGroup.setAttribute("id","resultGroup");
			svgImage.documentElement.appendChild(resultGroup);
		}
		
		var params = {
			sourceId1: sourceId1,
			sourceId2: sourceId2,
			targetId: targetId,
			strokeColor: strokeColor,
			strokeWidth: strokeWidth,
			fillColor: fillColor,
			progrssCallback: progrssCallback,
			addMetadata: addSourceMetadata, // source1,2のメタデータをintersectionのfeatureに付与する 2020/1/8
			getResultAsGeoJsonCallback: getResultAsGeoJsonCallback, // 2020/1/8
			getResultAsGeoJsonCallbackParam: getResultAsGeoJsonCallbackParam,
			processMode:processMode,
			resultGroup:resultGroup
		}
		
		if ( progrssCallback ){
			progrssCallback( 0 );
		}
		
		this.#svgMap.captureGISgeometriesOption(false,true); // 2020/1/8 rectもpolygonとみなす
		if ( params.processMode == "intersection" ){
			if ((!params.addMetadata) ){// addMetadataしないintersectionだけこっちで処理する・・・今後整理が必要　TBD
				this.#svgMap.captureGISgeometries(this.#buildIntersectionS2, params ); 
//				svgMap.captureGISgeometries(buildIntersectionS2a, params ); // jstsに丸投げするパターン(処理は２倍ほど高速だが・・重くなった時に進捗が取れない) 2020/1/9
			} else {
				this.#svgMap.captureGISgeometries(this.#buildIntersectionS2, params ); 
			}
		} else if ( params.processMode == "difference" ){
			this.#svgMap.captureGISgeometries(this.#buildDifferenceS2, params );
		} else { 
			// NOP
		}
		return ( resultGroup );
	}
	
	#countPoints( sourceLayerIDs , geom ){
		var points=0;
		for ( var i = 0 ; i < sourceLayerIDs.length ; i++ ){
			var geoms1 = geom[sourceLayerIDs[i]];
///			console.log(geoms1);
			if ( geoms1 && geoms1.length > 0 ){
				for ( var k = 0 ; k < geoms1.length ; k++ ){
					var geom1 = geoms1[k].coordinates;
					if ( geom1[0].length ){
						for ( var j = 0 ; j < geom1.length ; j++ ){
							points += geom1[j].length;
						}
					} else {
						points += geom1.length;
					}
				}
			}
		}
		console.log(points);
		return ( points );
	}
	
	#getChildDocsIdObs( layerId1 , layerId2 ){
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
		var childrenId1 =[];
		var childrenId2 =[];
		
		for ( var docId in svgImagesProps ){
			if ( layerId1 === svgImagesProps[docId].rootLayer ){
				childrenId1.push( docId );
			} else if ( layerId2 === svgImagesProps[docId].rootLayer ){
				childrenId2.push( docId );
			}
		}
		
		return {
			childrenId1: childrenId1,
			childrenId2: childrenId2
		}
	}
	
	#getChildDocsId( TdocId ){
		// TdocIdがレイヤーIDだった場合はそのレイヤーに属するものをすべて
		// 単なる文書Idだった場合はその文書と子孫文書すべて
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
		var childrenId =[];
		
		var hasChildren=false;
		/**
		for ( var docId in svgImagesProps ){
			if ( TdocId === svgImagesProps[docId].rootLayer ){
				childrenId.push( docId );
				hasChildren = true;
			}
		}
		**/
		if ( !hasChildren ){
			childrenId = [TdocId];
//			console.log( svgImagesProps[TdocId] );
			this.#digChild( svgImagesProps[TdocId] , childrenId , svgImagesProps );
		}
//		console.log("getChildDocsId searchId:",TdocId,"  ans childrenId:",childrenId);
		return (childrenId);
	}
	
	
	#digChild( svgImagesProp , ans , svgImagesProps ){
//		console.log(svgImagesProp);
		if ( svgImagesProp ){
			for ( var docId in svgImagesProp.childImages ){
	//			console.log(docId, svgImagesProps);
				ans.push(docId);
				this.#digChild( svgImagesProps[docId], ans , svgImagesProps);
			}
		}
	}
	
	#buildDifferenceS2=function( geom, params , loop1Count , loop2Count, fa1, fa2, ansFeatures , ansFeature ,ansFeatureMetadata ){ // 2020/1/10 非同期処理のために、かなりトリッキーですよ
		var startTime =  new Date().getTime();
//		console.log( "called buildDifferenceS2:",geom, params );
		var j = 0;
		if ( !ansFeatures ){
			loop1Count = 0;
			loop2Count = 0;
			var svgImages = this.#svgMap.getSvgImages();
			var svgImagesProps = this.#svgMap.getSvgImagesProps();
			var src1IDs = this.#getChildDocsId( params.sourceId1);
			var src2IDs = this.#getChildDocsId( params.sourceId2);
			
			// Array.prototype.push.apply(array1, array2);
			// var array = array1.concat(array2);
			fa1=[];
			for ( var i = 0 ; i < src1IDs.length ; i++ ){
				if ( geom[src1IDs[i]] ){
					fa1 = fa1.concat(geom[src1IDs[i]]);
				}
			}
			fa2=[];
			for ( var i = 0 ; i < src2IDs.length ; i++ ){
				if ( geom[src2IDs[i]] ){
					fa2 = fa2.concat(geom[src2IDs[i]]);
				}
			}
			ansFeatures=[];
		} else {
			j = loop2Count;
		}
//		console.log("buffered srcgem1:",fa1,"  srcgem2:",fa2);
		
		var pm =new this.#jsts.geom.PrecisionModel(1000000);
		
		loop1: for (var i = loop1Count ; i < fa1.length ; i++){
			if ( j == 0 ){
				console.log("Seed feartureA:",fa1[i]);
				var featureA = this.#getFeature(fa1[i]);
				try{
					featureA = this.#jsts.simplify.DouglasPeuckerSimplifier.simplify(featureA,0.00001);
					featureA = this.#jsts.precision.GeometryPrecisionReducer.reduce(featureA,pm);
				} catch (e){
					continue;
				}
				ansFeature = featureA;
				if ( params.addMetadata ){
					ansFeatureMetadata = fa1[i].src.getAttribute("content");
				}
			}
			for ( j = loop2Count ; j < fa2.length ; j++){
				var featureB = this.#getFeature(fa2[j]);
				try{
					featureB = this.#jsts.simplify.DouglasPeuckerSimplifier.simplify(featureB,0.00001);
					featureB = this.#jsts.precision.GeometryPrecisionReducer.reduce(featureB,pm);
					var difFeature = ansFeature.difference(featureB);
					if ( difFeature ){
						ansFeature = this.#jsts.simplify.DouglasPeuckerSimplifier.simplify(difFeature,0.00001);
						ansFeature = this.#jsts.precision.GeometryPrecisionReducer.reduce(ansFeature,pm);
					}
				}catch(e){
					continue;
				}
				
				// 時間がかかり過ぎたら一旦停止して再開させる再起呼び出し・(ここがトリッキーなポイント)
				var difTime =  new Date().getTime() - startTime;
				if ( difTime > 300){
					if ( params.progrssCallback ){
						params.progrssCallback(  Math.ceil((i*fa2.length + j) / (fa2.length * fa1.length) * 1000)/10 );
					}
					var nextCount2 = j+1;
					var nextCount1 = i;
					if ( nextCount2 == fa2.length ){
						// たまたま内側ループ完了タイミングだった
						if ( ansFeature ){
							ansFeatures.push(this.#getGeoJson(ansFeature));
//							console.log(ansFeature);
						}
						nextCount1 = i+1;
						nextCount2 = 0;
						if ( nextCount1 == fa1.length ){
							// たまたま・・完了のタイミングだった
							break loop1;
						}
					}
					if ( this.#halt == true ){
						break loop1;
					}
//					wait and call buildDifferenceS2 and exit
					setTimeout(this.#buildDifferenceS2.bind(this), 20 , geom, params , nextCount1 , nextCount2, fa1, fa2, ansFeatures , ansFeature, ansFeatureMetadata);
					return;
				}
				
			}
			j = 0;
			loop2Count = 0;
			if ( ansFeature ){
				try{
					var ansGeoJs=this.#getGeoJson(ansFeature);
					if ( this.#geomHasCoordinates(ansGeoJs)){
						if ( params.addMetadata ){
	//						console.log("Add metada",ansFeatureMetadata);
							ansGeoJs.metadata=ansFeatureMetadata;
						}
						ansFeatures.push(ansGeoJs);
	//					console.log(ansFeature);
					}
				} catch (e){
					console.warn("Could not build geoJson skip :", ansFeature);
				}
			}
		}
		
		this.#halt = false;
		
		if ( params.progrssCallback ){
			params.progrssCallback(  100 );
		}
		var geoJsonIntersections = {};
		geoJsonIntersections.type="GeometryCollection";
		geoJsonIntersections.geometries = ansFeatures;
		console.log("ans geojson:",geoJsonIntersections);
		this.#drawGeoJson(geoJsonIntersections, params.targetId, params.strokeColor, params.strokeWidth, params.fillColor,"p0","poi",null,params.resultGroup);
		this.#svgMap.refreshScreen();
		
	}.bind(this);
	
	
	#buildIntersectionS2a( geom, params ){
		// 2020/1/9 jstsの性能に頼って、全geomをcollectionにしたうえで放り込んで一気に処理してみる
		// やはり大エリアではリソースを使い切ってしまうし、進捗表示もできないので厳しいかも・・
		// またメタデータ同一の物（というより、同一のオブジェクトの部分とみなせるもの）だけをcollectionに投入する必要がある（が、今はそれを行ってない。全部入れている）
		// simplifyは(この方法でなくS2でも)行うべきと思われるが・・
		console.log( "called buildIntersectionS2a:",geom, params );
		
		var svgImages = this.#svgMap.getSvgImages();
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
		var src1IDs = this.#getChildDocsId( params.sourceId1);
		var src2IDs = this.#getChildDocsId( params.sourceId2);
		
		// Array.prototype.push.apply(array1, array2);
		// var array = array1.concat(array2);
		var fa1=[];
		for ( var i = 0 ; i < src1IDs.length ; i++ ){
			if ( geom[src1IDs[i]] ){
				fa1 = fa1.concat(geom[src1IDs[i]]);
			}
		}
		var fa2=[];
		for ( var i = 0 ; i < src2IDs.length ; i++ ){
			if ( geom[src2IDs[i]] ){
				fa2 = fa2.concat(geom[src2IDs[i]]);
			}
		}
		console.log("buffered srcgem1:",fa1,"  srcgem2:",fa2);
		
		var jstsFeature1 = this.#getFeature(buildGeoJsonGeometryCollectionFromGeometryArray(fa1));
		var jstsFeature2 = this.#getFeature(buildGeoJsonGeometryCollectionFromGeometryArray(fa2));
		var gpr = this.#jsts.precision.GeometryPrecisionReducer;
//		jstsFeature1 = jstsFeature1.buffer(0);
//		jstsFeature2 = jstsFeature2.buffer(0);
		jstsFeature1=this.#jsts.simplify.DouglasPeuckerSimplifier.simplify(jstsFeature1,0.00001);
		jstsFeature2=this.#jsts.simplify.DouglasPeuckerSimplifier.simplify(jstsFeature2,0.00001);
		console.log("buffered jstsFeature1:",jstsFeature1,"  jstsFeature2:",jstsFeature2);
		jstsFeature1 = gpr.reduce(jstsFeature1,new this.#jsts.geom.PrecisionModel(1000000));
		jstsFeature2 = gpr.reduce(jstsFeature2,new this.#jsts.geom.PrecisionModel(1000000));
		console.log("GeometryPrecisionReducer:",gpr);
		var isf;
		switch (params.processMode){
		case "intersection":
			isf = jstsFeature1.intersection(jstsFeature2);
//			isf = jstsFeature1.intersection(jstsFeature2);
			break;
		case "difference":
			isf = jstsFeature1.difference(jstsFeature2);
			break;
		case "union":
			isf = jstsFeature1.union(jstsFeature2);
			break;
		case "symDifference":
			isf = jstsFeature1.symDifference(jstsFeature2);
			break;
		default: // その他の文字列の場合は、jstsのintersectionを使う・・(一応S2のintersectionと使い分けができるけどね・・・)
			isf = jstsFeature1.intersection(jstsFeature2);
			break;
		}
			
		var isg=this.#getGeoJson(isf);
//		var isg= getGeoJson(jstsFeature1);
		console.log("intersection:",isg);
		
		if ( params.getResultAsGeoJsonCallback ){ // 2020/1/8
			if ( params.getResultAsGeoJsonCallbackParam ){
				params.getResultAsGeoJsonCallback(isg, params.getResultAsGeoJsonCallbackParam);
			} else {
				params.getResultAsGeoJsonCallback(isg );
			}
		}
		if ( params.strokeColor || params.strokeWidth || params.fillColor){
			this.#drawGeoJson(isg, params.targetId, params.strokeColor, params.strokeWidth, params.fillColor,"p0","poi",null,params.resultGroup);
			this.#svgMap.refreshScreen();
		}
	}
	
	#buildGeoJsonFeatureCollectionFromGeometryArray( geometryArray ){ // not used
		var fc = {};
		fc.type="FeatureCollection";
		fc.features=[];
		
		for ( var i = 0 ; i < geometryArray.length ; i++ ){
			var feature = {};
			feature.type="Feature";
			feature.geometry=geometryArray[i];
			fc.features.push(feature);
		}
		return ( fc );
	}
	
	#buildGeoJsonGeometryCollectionFromGeometryArray( geometryArray ){
		
		var gc = {};
		gc.type="GeometryCollection";
		gc.geometries=geometryArray;
		
		return ( gc );
	}
	
	#buildIntersectionS2 = function( geom, params ){
		console.log( "called buildIntersectionS2:",geom, params );
		var svgImages = this.#svgMap.getSvgImages();
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
//		var source1IDs = [], source2IDs = [];
		// sourceId1,2がルートレイヤーである子レイヤーをsource1,2IDsに蓄積する
		
//		var childrenID = getChildDocsId( params.sourceId1 , params.sourceId2 );
		var source1IDs = this.#getChildDocsId( params.sourceId1);
		var source2IDs = this.#getChildDocsId( params.sourceId2);
		
		/**
		for ( var docId in geom ){
//			console.log("layerId:",docId , " rootLayer:",svgImagesProps[docId].rootLayer);
			if ( params.sourceId1 === svgImagesProps[docId].rootLayer ){
				source1IDs.push(docId);
			} else if ( params.sourceId2 === svgImagesProps[docId].rootLayer ){
				source2IDs.push(docId);
			}
		}
		**/
		
		console.log("source1IDs:",source1IDs,"\nsource2IDs:",source2IDs);
		
		var targetDoc = svgImages[params.targetId];
		
		var intersections=[];
		
		var src1IDs, src2IDs;
		
		var source1Points = this.#countPoints(source1IDs , geom);
		var source2Points = this.#countPoints(source2IDs , geom);
		
		if ( source1Points < source2Points ){
			src1IDs = source1IDs;
			src2IDs = source2IDs;
		} else {
			src1IDs = source2IDs;
			src2IDs = source1IDs;
		}
		
		console.log("src1IDs:",src1IDs,"\src2IDs:",src2IDs);
		
		
		var src1Features=[];
		for ( var i = 0 ; i < src1IDs.length ; i++ ){
			var src1docID = src1IDs[i];
			var geoms1 = geom[src1docID];
//			console.log(geoms1);
			if ( geoms1 && geoms1.length>0 ){
				for ( var k = 0 ; k < geoms1.length ; k++ ){
					var geom1 = geoms1[k];
					if ( geom1 ){
						var feature1 = this.#getFeature(geom1);
						feature1=this.#jsts.simplify.DouglasPeuckerSimplifier.simplify(feature1,0.00001);
						src1Features.push({feature:feature1,docId:src1docID,geomIndex:k}); // mod 2020/1/8 for addMetadata
					}
				}
			}
		}
		console.log("src1Features:",src1Features);
		
		
		var compArray = [];
		for ( var j = 0 ; j < src2IDs.length ; j++ ){
			var geoms2 = geom[src2IDs[j]];
			if ( geoms2 && geoms2.length>0 ){
				for ( var l = 0 ; l < geoms2.length ; l++ ){
					var geom2 = geoms2[l];
					if ( geom2 ){
						for ( var m = 0 ; m < src1Features.length ; m++ ){
							compArray.push([j,l,m]);
						}
					}
				}
			}
		}
//		console.log(compArray);
		
		this.#buildIntersectionS3(src2IDs,src1Features, compArray,geom, params);
		
	}.bind(this);
	
	#halt = false;
	#haltComputing(){
		console.log("HALT...");
		this.#halt = true;
	}
	
	#geomHasCoordinates(geom){ // 2020/1/28 polygonでからのものが入ってしまうのを修正し関数化
		var hasCrds = false;
		if ( geom.coordinates.length > 0 ){
			hasCrds = true;
			if ( geom.type=="Polygon" ){
				var polCrds = 0;
				for ( var i = 0 ; i < geom.coordinates.length ; i++){
					polCrds += geom.coordinates[i].length;
				}
				if ( polCrds == 0 ){
					hasCrds = false;
				}
			}
		}
		return ( hasCrds);
	}
	
	// intersectionが重すぎる処理なので・・・
	#buildIntersectionS3(src2IDs,src1Features, compArray,geom, params, counter , startTime , feature2, intersections){
//		console.log("called buildIntersectionS3:",counter);
		// 再帰処理用内部変数の初期化
		if ( ! counter ){
			startTime = new Date().getTime();
			intersections = [];
			counter = 0;
		}
		while ( counter < compArray.length && this.#halt == false){
			var j = compArray[counter][0]; // src2IDs[j]が src2のdocID
			var l = compArray[counter][1]; // geomIndexが、src2のgeomIndex
			var m = compArray[counter][2]; // src1Featuresのindex
			
			var geoms2 = geom[src2IDs[j]];
			if ( m == 0 ){
				var geom2 = geoms2[l];
				feature2 = this.#getFeature(geom2);
				feature2=this.#jsts.simplify.DouglasPeuckerSimplifier.simplify(feature2,0.00001);
			}
			var featureA = src1Features[m].feature;
			try{
				var isf = featureA.intersection(feature2);
				if ( isf ){
					var isGeom = this.#getGeoJson(isf);
					if ( this.#geomHasCoordinates(isGeom) ){
						if ( params.addMetadata ){ // 2020/1/8
							var docIdA = src1Features[m].docId;
							var geomIndexA = src1Features[m].geomIndex;
							var meta1 = (geom[docIdA])[geomIndexA].src.getAttribute("content"); // 重ければ一括前処理で効率化できる
							var meta2 = geoms2[l].src.getAttribute("content"); // 同上
							isGeom.metadata=meta1+","+meta2;
						}
						intersections.push(isGeom);
					}
				}
			}catch (e){
				console.log(e);
			}
			var currentTime =  new Date().getTime();
			++ counter;
			if ( currentTime - startTime > 500 ){ // 0.3秒以上たったらちょっと(30ms)休憩
//				console.log( "call laze compu",counter, compArray.length , Math.ceil(counter /  compArray.length));
				if ( params.progrssCallback ){
					params.progrssCallback( Math.ceil(1000 * counter /  compArray.length) / 10 );
				}
				startTime = new Date().getTime();
				setTimeout(this.#buildIntersectionS3.bind(this), 30 , src2IDs,src1Features, compArray,geom, params, counter , startTime , feature2, intersections);
				break;
			}
		}
		this.#halt = false;
		if ( counter == compArray.length ) {
			if ( params.progrssCallback ){
				params.progrssCallback( 100 );
			}
			var geoJsonIntersections = {};
			geoJsonIntersections.type="GeometryCollection";
			geoJsonIntersections.geometries = intersections;
			console.log("svgmapGIS:geoJsonIntersections",geoJsonIntersections);
			if ( params.getResultAsGeoJsonCallback ){ // 2020/1/8
				if ( params.getResultAsGeoJsonCallbackParam ){
					params.getResultAsGeoJsonCallback(geoJsonIntersections, getResultAsGeoJsonCallbackParam);
				} else {
					params.getResultAsGeoJsonCallback(geoJsonIntersections );
				}
			}
			if ( params.strokeColor || params.strokeWidth || params.fillColor){
				this.#drawGeoJson(geoJsonIntersections, params.targetId, params.strokeColor, params.strokeWidth, params.fillColor,"p0","poi",null,params.resultGroup);
				this.#svgMap.refreshScreen();
			}
		}
	}
	
	// imageタグのビットイメージ(coverage)によるGIS
	// 2018/6/8 S.Takagi
	// rangeData: [hueRangemin,hueRangemax] or [[hueRange1min,hueRange1max],[...]] or {hue:[[range1min,range1max],[...]],satulation:[[range1min,range1max],[...]],value:[[range1min,range1max],[...]],alpha:[[range1min,range1max],[...]],outOfBoundsColor:{r:R,g:G,b:B}}
	// poiID_or_pointsには、POINTジオメトリが入ってるレイヤIDもしくは、直接POINTジオメトリの配列を入れる
	
	// 関数コールの流れ : getInRangePoints -> getInRangeGeometriesOnCoverage -> getInRangePointsS2 -> *0 getImagePixData -> computeInRangePoints (DO Actual Computing) (if completed : Exit) -> *0
	
	#getInRangePolygonParts(poiID_or_points, coverID, rangeData, cbFunc, param , progrssCallback , preCapturedGeometry , computingOptions ){
		// 出力データ形式: cbFuncの第一引数に以下の形のデータが返却される
		// [{coordinates[geoX,geoY],inRange,color}]
		
		if ( ! computingOptions ){ computingOptions={};}
		computingOptions.targetVectorType = 2;
		this.#getInRangeGeometriesOnCoverage(poiID_or_points, coverID, rangeData, cbFunc, param , progrssCallback , preCapturedGeometry , computingOptions);
	}
	#getInRangeLineParts(poiID_or_points, coverID, rangeData, cbFunc, param , progrssCallback , preCapturedGeometry , computingOptions ){
		// 出力データ形式: cbFuncの第一引数に以下の形のデータが返却される
		// [{extent,width,height,pixSize,rasterData,hasIntersection,hasInRange,hasOutOfRange,inRangeCounts,outOfRangeCounts},...]
		// extent:{x,y,width,height} (in geoCrds)
		// rasterData: [y][x]{color:{r,g,b,a},inRange}   if noData:{}
		
		if ( ! computingOptions ){ computingOptions={};}
		computingOptions.targetVectorType = 1;
		this.#getInRangeGeometriesOnCoverage(poiID_or_points, coverID, rangeData, cbFunc, param , progrssCallback , preCapturedGeometry , computingOptions);
	}
	#getInRangePoints(poiID_or_points, coverID, rangeData, cbFunc, param , progrssCallback , preCapturedGeometry , computingOptions ){
		if ( ! computingOptions ){ computingOptions={};}
		computingOptions.targetVectorType = 0;
		this.#getInRangeGeometriesOnCoverage(poiID_or_points, coverID, rangeData, cbFunc, param , progrssCallback , preCapturedGeometry , computingOptions);
	}
	
	#getInRangeGeometriesOnCoverage(poiID_or_points, coverID, rangeData, cbFunc, param , progrssCallback , preCapturedGeometry, computingOptions ){		// 必要な検索パラメータ(superParam)を整形した後、SVGMap.jsからviewportのgeometryisを取得してgetInRangePointsS2に投げる
		// computingOptions:
		//   targetVectorType : (0:point,1:polyline(multiLineString),2:polygon) (この値を入れて関数を生で呼べば上の3つの関数包含している)
		//   splitByCoverage : true/false <=内部的なものにしたいね・・
		
		if ( computingOptions == undefined ){ computingOptions={};}
		if ( computingOptions.targetVectorType == undefined ){ computingOptions.targetVectorType = 0;}
		if ( computingOptions.overlappingCoverage && (computingOptions.overlappingCoverage).toLowerCase() == "or" ){
			computingOptions.splitByCoverage = true;
			computingOptions.overlappingCoverage="or";
		}
		
		
		this.#halt = false;
		var superParam = {
			coverageDocTreeID: coverID,
			cbFunc: cbFunc,
			param: param,
			progrssCallback: progrssCallback,
			range: this.#getRangeParam(rangeData),
			targetType: computingOptions.targetVectorType, // 2020/7/2  0:point, 1:line , ...
			computingOptions:computingOptions, // 2020/7/2  0:point, 1:line , ...
			pixDataBuffer: [], // 2020/7/10 取得したピクセルデータを保持することにする
		}
		if ( Array.isArray(poiID_or_points)){
			superParam.points= poiID_or_points;
			console.log( "called getInRangePoints: poi.len,cover:", poiID_or_points.length, coverID,"  range:", superParam.range);
		} else {
			superParam.pointsDocTreeID= poiID_or_points;
			console.log( "called getInRangePoints: poi,cover:", poiID_or_points, coverID,"  range:", superParam.range);
		}
		
		this.#svgMap.captureGISgeometriesOption(true); // カバレッジが必要
		if ( ! preCapturedGeometry ){
			// captureGISgeometriesはviewportにあるオブジェクトのみ取ってくる仕様
			this.#svgMap.captureGISgeometries(this.#getInRangePointsS2 , superParam );
		} else {
			console.log("getInRangePoints: USE preCapturedGeometry");
			this.#getInRangePointsS2(preCapturedGeometry, superParam);
		}
	}
	
	#getRangeParam(rangeData){
//		console.log("getRangeParam:",rangeData);
		// デフォルトは透明でないもの
		var nRange={
			hue:        [[0,360]],
			satulation: [[10,100]],
			value:      [[10,100]],
			alpha:      [[10,100]],
//			outOfBoundsColor: {r:0,g:0,b:0} // https://stackoverflow.com/questions/22384423/canvas-corrupts-rgb-when-alpha-0 この問題があるのでalpha=0のとき、RGBは必ず0,0,0になってしまうためすごく問題。もったいないがこの設定はデフォルトでは使わないことにした 2020/7/7
		}
		
		if ( rangeData){
			if ( rangeData.hue ){
				nRange.hue = this.#getRangeVal(rangeData.hue );
				if ( rangeData.satulation ){
					nRange.satulation = this.#getRangeVal(rangeData.satulation );
				}
				if ( rangeData.value ){
					nRange.value = this.#getRangeVal(rangeData.value );
				}
				if ( rangeData.alpha ){
					nRange.alpha = this.#getRangeVal(rangeData.alpha );
				}
				if ( rangeData.outOfBoundsColor ){
					nRange.outOfBoundsColor = rangeData.outOfBoundsColor;
				}
			} else if ( rangeData.length && rangeData.length > 0){
				nRange.hue =  this.#getRangeVal(rangeData);
			}
		}
		return ( nRange);
	}
	
	#getRangeVal( rangeVal ){
		var nRangeVal=[];
		if ( rangeVal[0][0] != undefined){
			nRangeVal = rangeVal;
		} else {
			nRangeVal[0] = rangeVal;
		}
		console.log("rangeVal:",rangeVal,"  normalized nRangeVal:",nRangeVal);
		return (nRangeVal);
	}
	
	#getTargetGeomsBbox( poiGeoms ){
		var xmin=1e30;
		var xmax=-1e30;
		var ymin=1e30;
		var ymax=-1e30;
		var poiGeoms;
		for ( var i = 0 ; i < poiGeoms.length ; i++ ){
			if ( (poiGeoms[i].type).toLowerCase()=="point"  ){ // Point
				if ( poiGeoms[i].coordinates[0] > xmax ){
					xmax = poiGeoms[i].coordinates[0];
				}
				if ( poiGeoms[i].coordinates[0] < xmin ){
					xmin = poiGeoms[i].coordinates[0];
				}
				
				if ( poiGeoms[i].coordinates[1] > ymax ){
					ymax = poiGeoms[i].coordinates[1];
				}
				if ( poiGeoms[i].coordinates[1] < ymin ){
					ymin = poiGeoms[i].coordinates[1];
				}
			} else {  // MultiLineString, Polygon
				//console.log("not point");
				for ( var j = 0 ; j < (poiGeoms[i].coordinates).length ; j++ ){
					for ( var k = 0 ; k < ((poiGeoms[i].coordinates)[j]).length ; k++ ){
						var vertex = ((poiGeoms[i].coordinates)[j])[k];
						//console.log("vertex:",vertex);
						if ( vertex[0] > xmax ){
							xmax = vertex[0];
						}
						if ( vertex[0] < xmin ){
							xmin = vertex[0];
						}
						
						if (vertex[1] > ymax ){
							ymax = vertex[1];
						}
						if ( vertex[1] < ymin ){
							ymin = vertex[1];
						}
					}
				}
			}
		}
		
		return {
			xmin  : xmin,
			ymin  : ymin,
			xmax  : xmax,
			ymax  : ymax,
			x     : xmin,
			y     : ymin,
			width : xmax-xmin,
			height: ymax-ymin
		}
	}
	
	#getInRangePointsS2=function( geom , superParam ){
		// 
//		var geoViewBox = svgMap.getGeoViewBox();
		var targetGeoms = [];
		var targetCoverages = [];
		// ここでcanvasに入れたimageとpoisで、いろいろやる感じ
		if ( ! geom ){
			console.log("processing conflict?? exit");
		}
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
//		console.log("getInRangePointsS2  geom:",geom, "  superParam:",superParam,"  svgImagesProps:",svgImagesProps);
		if ( superParam.points ){
			targetGeoms = superParam.points;
		}
		for ( var layerId in geom ){
			if ( superParam.pointsDocTreeID && svgImagesProps[layerId].rootLayer == superParam.pointsDocTreeID ){
				for ( var i = 0 ; i < geom[layerId].length ; i++ ){
					if ( superParam.computingOptions.targetVectorType == 0 ){
						if ( geom[layerId][i].type =="Point" ){
							targetGeoms.push( geom[layerId][i] );
						}
					} else if ( superParam.computingOptions.targetVectorType == 1 ){
						if ( geom[layerId][i].type =="MultiLineString" ){ // LineStringもあるような気がするが・・
							targetGeoms.push( geom[layerId][i] );
						}
					} else if ( superParam.computingOptions.targetVectorType == 2 ){
						if ( geom[layerId][i].type =="Polygon" ){ 
							targetGeoms.push( geom[layerId][i] );
						}
					} 
				}
			} else if ( svgImagesProps[layerId].rootLayer == superParam.coverageDocTreeID ){
				for ( var i = 0 ; i < geom[layerId].length ; i++ ){
					if ( geom[layerId][i].type =="Coverage" ){
						targetCoverages.push( geom[layerId][i] );
					}
				}
			}
		}
		
		// viewportにある対象オブジェクトが取れているはず
		console.log("targetCoverages:",targetCoverages,"  targetGeoms.length:",targetGeoms.length);
		superParam.targetGeomsBbox = this.#getTargetGeomsBbox(targetGeoms);
		console.log("targetGeomsBbox:",superParam.targetGeomsBbox);
		superParam.targetGeoms = targetGeoms;
		superParam.targetCoverages = targetCoverages;
		superParam.coverageIndex = this.#getNextIntersectedCoverage(superParam.targetCoverages, superParam.targetGeomsBbox, -1);
		superParam.ans = [];
		
		if ( superParam.progrssCallback ){
			superParam.progrssCallback(0);
		}
		
		// getImagePixData経由で再帰実行されるcomputeInRangePointsを呼び出し処理を進める
		var targetCoverage = superParam.targetCoverages[superParam.coverageIndex];
		this.#fileGetOverhead = 0;
		this.#computingOverhead = 0;
		this.#overheadPrevTimeInt = Date.now();
		console.log("getImagePixData B:",targetCoverage,"   superParam.coverageIndex:",superParam.coverageIndex);
		if ( targetCoverage && targetCoverage.href ){
			var targetCoverageURL = targetCoverage.href;
			//console.log("getImagePixData:",getImagePixData);
			this.#getImagePixData(targetCoverageURL, this.#computeInRangePoints, superParam, targetCoverage.src.getAttribute("iid"), targetCoverage.src.getAttribute("style"));
		} else {
			this.#halt = false;
			superParam.cbFunc(superParam.ans, superParam.param);
		}
	}.bind(this)
	
	// getInRangePointsS2の性能の統計用
	#fileGetOverhead;
	#computingOverhead;
	#overheadPrevTimeInt;
	
	// そのターゲットのジオメトリと、カバレッジが交差してるかどうかを判別して返答する
	// この時、geoExtent,geo2svgをtargetCoverageに追加してる（トリッキー）
	#getNextIntersectedCoverage(targetCoverages, targetGeomsBbox, currentIndex){
		var cindex = currentIndex+1;
		var intersects = false;
		while ( intersects == false ){
			var targetCov = targetCoverages[cindex];
			if ( cindex == targetCoverages.length ){
				return ( cindex);
			} else {
//				var cLatMin, cLatMax, cLngMin, cLngMax;
				if ( targetCov.geoExtent ){
//					console.log("geoExtent再利用");
				} else {
					this.#setGeoExtent(targetCov);
				}
				/**
				cLatMin = targetCov.geoExtent[0];
				cLatMax = targetCov.geoExtent[1];
				cLngMin = targetCov.geoExtent[2];
				cLngMax = targetCov.geoExtent[3];
				**/
				if ( targetCov.geoExtent[0] <= targetGeomsBbox.ymax && 
					targetGeomsBbox.ymin <= targetCov.geoExtent[1] && 
					targetCov.geoExtent[2] <= targetGeomsBbox.xmax && 
					targetGeomsBbox.xmin <= targetCov.geoExtent[3] ){
					intersects = true;
				} else {
					intersects = false;
					++ cindex;
				}
			}
		}
		return ( cindex );
	}
	
	#setGeoExtent(targetCoverage){
		// そのカバレッジについて、地理的領域を計算し設定する。 transformがある場合はgeo2svgも設定する
		var cLatMin, cLatMax, cLngMin, cLngMax;
		if ( targetCoverage.coordinates[0].lat ){ // SVGMap.jsの機能として、captureGisGeometriesで取得したcoverageがtransformを持っていない(緯度経度に対して回転してない)場合、coordinates.lat,.lngがある。
			// lng:x lat:y
			cLatMin = Math.min( targetCoverage.coordinates[0].lat , targetCoverage.coordinates[1].lat);
			cLatMax = Math.max( targetCoverage.coordinates[0].lat , targetCoverage.coordinates[1].lat);
			cLngMin = Math.min( targetCoverage.coordinates[0].lng , targetCoverage.coordinates[1].lng);
			cLngMax = Math.max( targetCoverage.coordinates[0].lng , targetCoverage.coordinates[1].lng);
			targetCoverage.geoExtent=[cLatMin,cLatMax,cLngMin,cLngMax]; // ここで、普通にはない .geoExtentを追加している
		} else { // 一方transformがある場合、coordinates.x,.yとなっていて、そこにはローカルsvg座標の2点が入っている
		//					console.log("非対角transform処理:");
			var s2g = targetCoverage.transform;
			var p0 = targetCoverage.coordinates[0];
			var p1 = targetCoverage.coordinates[1];
			var gp0 = this.#svgMap.transform(p0.x ,p0.y , s2g);
			var gp1 = this.#svgMap.transform(p1.x ,p1.y , s2g);
			cLatMin = Math.min( gp0.y , gp1.y);
			cLatMax = Math.max( gp0.y , gp1.y);
			cLngMin = Math.min( gp0.x , gp1.x);
			cLngMax = Math.max( gp0.x , gp1.x);
			targetCoverage.geoExtent=[cLatMin,cLatMax,cLngMin,cLngMax]; // ここで、普通にはない .geoExtentを追加している
			targetCoverage.geo2svg=this.#svgMap.getInverseMatrix(s2g); // ここで、普通にはない .geo2svgを追加している
		}
	}
	
	#computeInRangePoints=function( pixData , pixWidth , pixHeight , superParam ){
		// ひとつのimageデータ(カバレッジのビットイメージ)に対して、演算対象ベクトルデータ(全部)との演算を行う
		superParam.pixDataBuffer[superParam.coverageIndex] = pixData; // superParamがある間pixDaraを保持することにした (2020/7/10
		var now = Date.now();
		this.#fileGetOverhead += now - this.#overheadPrevTimeInt;
		this.#overheadPrevTimeInt = now;
		// console.log("computeInRangePoints: coverageData:",pixData.length , pixWidth, pixHeight,"  targetGeoms:",superParam.targetGeoms);
		// var extent = superParam.targetCoverages[superParam.coverageIndex].coordinates;
		
		for ( var i = 0 ; i < superParam.targetGeoms.length ; i++ ){
			var geomCrd = superParam.targetGeoms[i].coordinates;
			
			
			if ( superParam.computingOptions.targetVectorType == 1 ){ // ポリラインフィーチャーとカバレッジのGIS
				for ( var j = 0 ; j < geomCrd.length ; j++){ // multiPolyLineなので・・
					this.#computeInRangeLineParts(pixData , pixWidth , pixHeight, geomCrd[j], superParam);
				}
				
			} else if ( superParam.computingOptions.targetVectorType == 2 ){ // ポリゴンフィーチャーとカバレッジのGIS
				for ( var j = 0 ; j < geomCrd.length ; j++){ // same as
					this.#computeInRangePolygonParts(pixData , pixWidth , pixHeight, geomCrd[j], superParam);
				}
			} else if (superParam.computingOptions.targetVectorType == 0){ // ポイントフィーチャーとカバレッジのGIS
				// 以下、poly*と同様に別関数にするかもしれない
				var extent= this.#getCoverageExtent(superParam.targetCoverages[superParam.coverageIndex]);
	//			console.log("cover:",extent.latMin,extent.latMax,extent.lngMin,extent.lngMax,"  poi:",geomCrd[1],geomCrd[0]);
				if ( extent.lngMin <= geomCrd[0] && extent.lngMax > geomCrd[0] && extent.latMin <= geomCrd[1] && extent.latMax > geomCrd[1] ){ //そのポイントがビットイメージの座標範囲内なら・・
					
					var canXY = this.#latLng2coverageImageXY(pixWidth , pixHeight, geomCrd[0], geomCrd[1], superParam.targetCoverages[superParam.coverageIndex],extent);
					var addr = ( canXY.x + canXY.y * pixWidth ) * 4;
					var R = pixData[ addr ];
					var G = pixData[ addr + 1 ];
					var B = pixData[ addr + 2 ];
					var A = pixData[ addr + 3 ];
					if ( this.#judgeVal(100*A/255,superParam.range.alpha)){
						var hsv = this.#rgb2hsv( R , G , B );
	//					console.log(canXY,hsv,A);
	//					console.log("Judge:",superParam.range.hue);
						if ( this.#judgeVal(hsv.h,superParam.range.hue,true) &&  this.#judgeVal(hsv.s,superParam.range.satulation) &&  this.#judgeVal(hsv.v,superParam.range.value)){
							hsv.a = A;
							hsv.r = R;
							hsv.g = G;
							hsv.b = B;
							superParam.targetGeoms[i].hsv = hsv;
							superParam.ans.push(superParam.targetGeoms[i]);
						}
					}
				}
			}
		}
		
		
		// for next coverage computation
		
//		superParam.coverageIndex = superParam.coverageIndex + 1;
		superParam.coverageIndex = this.#getNextIntersectedCoverage(superParam.targetCoverages, superParam.targetGeomsBbox, superParam.coverageIndex);

		if ( superParam.progrssCallback ){
			superParam.progrssCallback( Math.ceil(100 * (superParam.coverageIndex/superParam.targetCoverages.length)) );
		}
		
		if ( this.#halt == true || superParam.coverageIndex == superParam.targetCoverages.length ){
			// complete computation
			this.#halt = false;
			console.log("Processing overhead[ms]: fileFetch:",this.#fileGetOverhead,"  computing:", this.#computingOverhead, "   comp.Ratio[%]:", Math.floor(10000*this.#computingOverhead / (this.#computingOverhead+this.#fileGetOverhead))/100 );
			if ( superParam.computingOptions.splitByCoverage == true ){
				if ( superParam.computingOptions.targetVectorType == 2 ){
					this.#doPolygonOrComputing( superParam );
				} else if (  superParam.computingOptions.targetVectorType == 1){
					this.#doPolylineOrComputing( superParam );
				} else {
					this.#doPointOrComputing( superParam );
				}
			} else {
				superParam.cbFunc(superParam.ans, superParam.param);
			}
		} else {
			// compute next coverage
			var targetCoverage = superParam.targetCoverages[superParam.coverageIndex];
			now = Date.now();
			this.#computingOverhead += now - this.#overheadPrevTimeInt;
			this.#overheadPrevTimeInt = now;
			if ( targetCoverage && targetCoverage.href ){
				var targetCoverageURL = targetCoverage.href;
				// getImagePixData経由で再帰実行されるcomputeInRangePointsを呼び出し処理を進める
				this.#getImagePixData(targetCoverageURL, this.#computeInRangePoints, superParam, targetCoverage.src.getAttribute("iid"), targetCoverage.src.getAttribute("style"));
			} else {
				// これは異常終了のケース？
				this.#halt = false;
				superParam.cbFunc(superParam.ans, superParam.param);
			}
		}
	}.bind(this)
	
	#normalizeHue( hue ){
		var ans = hue % 360;
		if ( ans < 0 ){
			ans += 360;
		}
		return ( ans );
	}
	
	#judgeVal( val, rangeVal , isHue ){
//		console.log("judgeVal:",val,rangeVal);
		if ( !rangeVal ){
			return ( true );
		}
		
		for ( var i = 0 ; i < rangeVal.length ; i++ ){
			
			if ( isHue ){
				if(rangeVal[i][0] <=0 && rangeVal[i][1]>=360){ // hue全域指定の場合はtrue
					return ( true );
				}
				var hmin = this.#normalizeHue(rangeVal[i][0]);
				var hmax = this.#normalizeHue(rangeVal[i][1]);
				
//				console.log( "hueRange:min:",hmin," max:",hmax,"  val:",val);
				if( hmin > hmax ){ // 360を跨いでる場合
					if (( hmin <= val && val <= 360 )||( 0 <= val && val <= hmax )){
						return( true );
					}
				} else if( hmin <= val && val <= hmax) {
					return ( true );
				}
			} else {
				if ( rangeVal[i][0] <= val && val <= rangeVal[i][1] ){
					return ( true );
				}
			}
		}
		return ( false );
	}
	
	// 2020/1/23 ブラウザネイティブのキャッシュが効いてない？？　Imageのためのキャッシュ(FIFO)を構築 
	// オートパイロットで特に高速化したと思う。
	#imageCacheMaxSize=100; // FIFOキャッシュの数
	#imageCache = [];
	#imageCacheQueue=[];
	#imageCacheEnabled=false;
	#addImageCache(hashKey,img){
		this.#imageCache[hashKey] = img;
		this.#imageCacheQueue.push(hashKey);
		if (this.#imageCacheQueue.length == this.#imageCacheMaxSize){
			var delImageHash = this.#imageCacheQueue.shift();
			delete this.#imageCache[delImageHash];
		}
	}
	#enableImageCache(){
		this.#imageCacheEnabled=true;
		this.#imageCache = [];
		this.#imageCacheQueue=[];
	}
	#disableImageCache(){
		this.#imageCacheEnabled=false;
		this.#imageCache = [];
		this.#imageCacheQueue=[];
	}
	#getImagePixData(imageUrl, callbackFunc, callbackFuncParams, imageIID, imageStyle){
		// 2020.1.30 自ドメイン経由のビットイメージの場合、画面に表示しているimgリソースをそのまま画像処理用として利用する。　これをより有効にするため、コアモジュールもbitimageをproxy経由で取得させる機能を実装している(svgMap.setProxyURLFactory)
//		console.log("getImagePixData: url,iid,iid's elem: ",imageUrl,imageIID,document.getElementById(imageIID));
		var imageURLobj = this.#getImageURL(imageUrl,true);
//		console.log("getImagePixData imageURLobj:",imageURLobj);
		var imageURL_int = imageURLobj.url;
		if ( this.#imageCacheEnabled && this.#imageCache[imageURL_int]){
//			console.log("Hit imageCache");
			this.#returnImageRanderedCanvas(this.#imageCache[imageURL_int],callbackFunc, callbackFuncParams, imageStyle)
		} else {
			var documentImage = document.getElementById(imageIID);
			var imgSrcURL = documentImage.getAttribute("src");
			if ( imgSrcURL.indexOf("http")!=0 || this.#getImageURL(imgSrcURL)==imgSrcURL){
				//console.log("use image element's image :", documentImage); 
				this.#returnImageRanderedCanvas(documentImage,callbackFunc, callbackFuncParams, imageStyle);
				if ( this.#imageCacheEnabled ){
					this.#addImageCache(imageURL_int, documentImage);
				}
			} else {
				
				var img = new Image();
				if ( imageURLobj.crossorigin ){
					img.crossOrigin = "anonymous";
				}
				// console.log("Fetch image : ", imageUrl);
				img.src = imageURL_int;
				img.onload = function() {
					this.#returnImageRanderedCanvas(img,callbackFunc, callbackFuncParams, imageStyle);
					if ( this.#imageCacheEnabled ){
						this.#addImageCache(imageURL_int, img);
					}
				}.bind(this)
			}
		}
	}
	
	#returnImageRanderedCanvas(img,callbackFunc, callbackFuncParams,imageStyle){
		var canvas = document.createElement("canvas");
//		canvas.width  = img.width;
		canvas.width  = img.naturalWidth;
//		canvas.height = img.height;
		canvas.height = img.naturalHeight;
		//console.log(img);
		var cContext = canvas.getContext('2d');
		cContext.mozImageSmoothingEnabled = false;
		cContext.webkitImageSmoothingEnabled = false;
		cContext.msImageSmoothingEnabled = false;
		cContext.imageSmoothingEnabled = false;
		this.#applyFilter(cContext, imageStyle); // 2022/10/21 imgにfilterをかけているケースに対応
		cContext.drawImage(img, 0, 0);
		var pixData = cContext.getImageData(0, 0, canvas.width, canvas.height).data;
//		console.log("pixData:",pixData);
		callbackFunc(pixData, canvas.width, canvas.height, callbackFuncParams);
	}
	
	#applyFilter(cContext, styleStr) {
		// 2022/10/21 imgにfilterをかけているケースに対応
		if (styleStr) {
			var ans = styleStr.match(/filter:([^;]+);/);
			if (ans) {
				console.log("applyFilter:", ans);
				cContext.filter = ans[1].trim();
			}
		}
	}
	
	
	// 線(ポリライン)とビットイメージ間のGIS 2020/7/3
	#computeInRangeLineParts( pixData , pixWidth , pixHeight, geomCrd, superParam ){
		var targetCoverage = superParam.targetCoverages[superParam.coverageIndex];
		//console.log("computeInRangeLineParts: geomCrd:",geomCrd,"  targetCoverage:",targetCoverage);
		var cExt = this.#getCoverageExtent(targetCoverage);
		var lExt = this.#getLineExtent(geomCrd);
		//console.log("isIntersect:",svgMap.isIntersect(lExt,cExt),"  lExt:",lExt,"  cExt:",cExt);
		if ( this.#svgMap.isIntersect(lExt,cExt)){ // ポリラインとカバレッジが被っていたら演算する
			// console.log("isIntersect : cExt:",cExt,"  lExt:",lExt);
			
			var cline = this.#clipLine(geomCrd,cExt); // ポリラインをカバレンジの領域でクリッピングする(これは地理座標)
//			console.log("clipLine:",cline, "   orig:",geomCrd);
			var pixSize = this.#getPixSize(pixWidth , pixHeight,cExt);
			
			for ( var i = 0 ; i < cline.length-1 ; i++ ){ // ポリラインを線分に分けて演算する
				if ( cline[i+1].clippedEdge != true ){ // これはクリッピングルーチンの癖でこうなってます
					var startP = cline[i];
					var endP = cline[i+1];
					
					// 線分の始点終点の(カバレッジの)ピクセル座標を得る （ここからピクセル座標）
					var startXY = this.#latLng2coverageImageXY(pixWidth , pixHeight, startP.x, startP.y, targetCoverage,cExt);
					var endXY = this.#latLng2coverageImageXY(pixWidth , pixHeight, endP.x, endP.y, targetCoverage,cExt);
					
					// その座標間にピクセル化した直線の座標列を算出する
					var pixs = this.#getStraightLineCoordinates([startXY.x,startXY.y],[endXY.x,endXY.y]);
					// console.log("pixs:",pixs);
					
					// それぞれのピクセルの値を読み出し評価する
					for ( var j = 0 ; j < pixs.length ; j++ ){
						var comPix = this.#computePixCoverage(pixs[j][0],pixs[j][1],pixWidth,pixHeight,pixData,superParam.range);
						var geoPos = this.#coverageImageXY2LatLng(pixWidth , pixHeight, pixs[j][0],pixs[j][1] ,targetCoverage,cExt);
						if ( comPix.inBounds){
							if ( superParam.computingOptions.splitByCoverage == true ){
								if ( !superParam.ans[superParam.coverageIndex] ){
									// console.log("add ans index:",superParam.coverageIndex,"  extent:",cExt);
									superParam.ans[superParam.coverageIndex] = [];
									superParam.ans[superParam.coverageIndex]["extent"]=cExt;
									superParam.ans[superParam.coverageIndex]["pixSize"]=pixSize;
								}
								superParam.ans[superParam.coverageIndex].push({coordinates:[geoPos.longitude,geoPos.latitude],color:comPix.color,inRange:comPix.inRange});
								
							} else {
								superParam.ans.push({coordinates:[geoPos.longitude,geoPos.latitude],color:comPix.color,inRange:comPix.inRange});
							}
						} // カバレッジ域外の場合は無視
					}
					
				}
			}
		}
	}
	
	// ポリゴンとビットイメージ間のGIS 2020/7/9-
	#computeInRangePolygonParts( pixData , pixWidth , pixHeight, geomCrd, superParam ){
		var targetCoverage = superParam.targetCoverages[superParam.coverageIndex];
		//console.log("computeInRangePolygonParts: geomCrd:",geomCrd,"  targetCoverage:",targetCoverage);
		var cExt = this.#getCoverageExtent(targetCoverage);
		var lExt = this.#getLineExtent(geomCrd); // これはポリゴンでも同じものが使える
		//console.log("isIntersect:",svgMap.isIntersect(lExt,cExt),"  lExt:",lExt,"  cExt:",cExt);
		if ( this.#svgMap.isIntersect(lExt,cExt)){ // ポリゴンとカバレッジが被っていたら演算する
			// console.log("isIntersect : cExt:",cExt,"  lExt:",lExt);
			
			// var cline = clipLine(geomCrd,cExt); // ポリライン(ポリゴンでも使用可能)をカバレッジの領域でクリッピングする(これは地理座標)
			// スキャンラインを取得する(まずは上のクリッピングを使わないで力技をやってみよう)
			var pixSize = this.#getPixSize(pixWidth , pixHeight,cExt);
			
			var canvasCrds=[]; // ここからピクセル座標
			for ( var i = 0 ; i < geomCrd.length ; i++ ){
				var canXY = this.#latLng2coverageImageRawXY(pixWidth , pixHeight, geomCrd[i][0], geomCrd[i][1], targetCoverage,cExt);
				canvasCrds.push([canXY.x,canXY.y]);
			}
			// console.log("canvasCrds:",canvasCrds);
			var slines = this.#polygonFilling(canvasCrds); // スキャンラインポリゴンフィル関数
			//console.log("scanLines:",slines);
			
			var sc = 0;
			var rasterData;
			if ( !superParam.ans[superParam.coverageIndex] ){
				rasterData = new Array(pixHeight);
				for ( var py = 0 ; py < pixHeight ; py++ ){
					rasterData[py]=new Array(pixWidth).fill({});
				}
				superParam.ans[superParam.coverageIndex] = {};
				if ( targetCoverage.transform ){
					superParam.ans[superParam.coverageIndex].transform = targetCoverage.transform;
					superParam.ans[superParam.coverageIndex].coordinates = targetCoverage.coordinates;
				}
				superParam.ans[superParam.coverageIndex].extent = cExt;
				superParam.ans[superParam.coverageIndex].width = pixWidth;
				superParam.ans[superParam.coverageIndex].height = pixHeight;
				superParam.ans[superParam.coverageIndex].pixSize = pixSize;
				superParam.ans[superParam.coverageIndex].rasterData = rasterData;
				superParam.ans[superParam.coverageIndex].hasIntersection = false; // そのタイル内に、ポリゴンが被っている
				superParam.ans[superParam.coverageIndex].hasInRange = false; // そのタイルにポリゴンが被っており、なおかつレンジ内がある
				superParam.ans[superParam.coverageIndex].hasOutOfRange = false;// そのタイルにポリゴンが被っており、なおかつレンジ外がある
				superParam.ans[superParam.coverageIndex].inRangeCounts = 0;
				superParam.ans[superParam.coverageIndex].outOfRangeCounts = 0;
			}
			rasterData = superParam.ans[superParam.coverageIndex].rasterData; // 実際の演算結果のsuperParam.ans[].rasterDataへの紐づけ
			var hasIntersection = false;
			var hasInRange = false;
			var hasOutOfRange = false;
			var inRangeCounts = 0;
			var outOfRangeCounts = 0;
			for ( var py = pixHeight -1 ; py >= 0 ; py--){ // scan lineがymaxから始まるため
				var row = rasterData[py]; // 各rowごとの演算結果を紐づけ
				while ( sc < slines.length && slines[sc][1] >= py ){ // slinesのyが該当するものまで回していく
					if( slines[sc][1] == py ){
						var pxs = slines[sc][0];
						var px1 = Math.max(0,pxs[0]);
						var px2 = Math.min(pixWidth-1,pxs[1]);
						for ( var px = px1 ; px <= px2 ; px++){
							var comPix = this.#computePixCoverage(px,py,pixWidth,pixHeight,pixData,superParam.range);
//							var geoPos = coverageImageXY2LatLng(pixWidth , pixHeight, px,py ,targetCoverage,cExt);
							if ( comPix.inBounds){
								row[px]=comPix; // これが演算結果の代入部
								hasIntersection = true;
								if ( comPix.inRange ){
									hasInRange = true;
									++ inRangeCounts;
								} else {
									hasOutOfRange = true;
									++ outOfRangeCounts;
								}
							} // カバレッジ域外の場合は無視
						}
					}
					++sc;
				}
			}
			
			if ( hasInRange ){
				superParam.ans[superParam.coverageIndex].hasInRange = true;
			}
			if ( hasOutOfRange ){
				superParam.ans[superParam.coverageIndex].hasOutOfRange = true;
			}
			if ( hasIntersection ){
				superParam.ans[superParam.coverageIndex].hasIntersection = true;
			}
			
			superParam.ans[superParam.coverageIndex].inRangeCounts = inRangeCounts;
			superParam.ans[superParam.coverageIndex].outOfRangeCounts = outOfRangeCounts;
		}
	}
	
	#computePixCoverage(px,py,pixWidth,pixHeight,pixData,range){
		// return value:
		// .inBounds: そのカバレッジの領域内の場合true
		// .color:    実際の色の値(カバレッジ領域外ではnull)
		// .inRange:  rangeで指定した条件に合致の場合true
//		console.log("px:",px," py:",py,"  pixWidth:",pixWidth,"  pixHeight:",pixHeight);
		if ( px < 0 || py < 0 || px >= pixWidth || py >= pixHeight ){
			return ( {color:null,inRange:false , inBounds: false } );
		}
		var addr = ( px + py * pixWidth ) * 4;
		var R = pixData[ addr ];
		var G = pixData[ addr + 1 ];
		var B = pixData[ addr + 2 ];
		var A = pixData[ addr + 3 ];
		if ( range.outOfBoundsColor && R == range.outOfBoundsColor.r && G == range.outOfBoundsColor.g && B == range.outOfBoundsColor.b ){
//			console.log("outOfBounds: Color RGB:",R,G,B);
			return ( {color:null,inRange:false , inBounds: false } );
		}
		var hsv = this.#rgb2hsv( R , G , B );
		hsv.a = A;
		hsv.r = R;
		hsv.g = G;
		hsv.b = B;
//		console.log("RGBA:",R,G,B,A,"  range:",range,"  addr:",addr );
		if ( this.#judgeVal(100*A/255,range.alpha)){
//					console.log(px,py,hsv,A);
//					console.log("Judge:",range.hue);
			if ( this.#judgeVal(hsv.h,range.hue,true) && this.#judgeVal(hsv.s,range.satulation) && this.#judgeVal(hsv.v,range.value)){
					// console.log("inRange:", hsv.h,hsv.s,hsv.v,R,G,B,A);
					return ( {color:hsv, inRange:true , inBounds: true } );
			}
		}
		// console.log("outOfRange:", hsv.h,hsv.s,hsv.v,R,G,B,A,"  range:",range);
		return ( {color:hsv, inRange:false , inBounds: true } );
	}
	
	
	#clipLine(geomCrd,cExt){
		// build poyline for ClipPolygon()
		var poly= [];
		for ( var i = 0 ; i < geomCrd.length ; i++ ){
			var point={x:geomCrd[i][0],y:geomCrd[i][1],clippedEdge:false};
			if ( i == 0 ){
				point.clippedEdge = true;
			}
			poly.push(point);
		}
		//console.log("poly:",poly,"   cExt:",cExt);
		var cpoly = this.#ClipPolygon(poly,cExt);
		return ( cpoly );
	}

	
	
	#getLineExtent(coords){
		var xmin=1e30,ymin=1e30,xmax=-1e30,ymax=-1e30;
		for ( var i = 0 ; i < coords.length ; i++ ){
			var crd = coords[i];
			if ( crd[0] > xmax ){
				xmax = crd[0];
			}
			if ( crd[0] < xmin ){
				xmin = crd[0];
			}
			if ( crd[1] > ymax ){
				ymax = crd[1];
			} 
			if ( crd[1] < ymin ){
				ymin = crd[1];
			}
		}
		//console.log("coords:",coords,"   getLineExtent: xmin,xmax,ymin,ymax: ",xmin,xmax,ymin,ymax);
		return {
			x:xmin,
			y:ymin,
			width:xmax-xmin,
			height:ymax-ymin
		}
	}
	
	#getCoverageExtent(coverage){
		var latMin = coverage.geoExtent[0];
		var latMax = coverage.geoExtent[1];
		var lngMin = coverage.geoExtent[2];
		var lngMax = coverage.geoExtent[3];
		return {
			latMin : latMin,
			latMax : latMax,
			lngMin : lngMin,
			lngMax : lngMax,
			x : lngMin,
			y : latMin,
			width : lngMax-lngMin,
			height : latMax-latMin
		}
	}
	
	#isIntersect(rect1 , rect2){
		// rect* : x,y,width,height
		return (this.#svgMap.isIntersect(rect1 , rect2));
	}

	#getPixSize(pixWidth , pixHeight,cExt){
		var xs = cExt.width / pixWidth;
		var ys = cExt.height / pixHeight;
//		console.log("getPixSize:",(xs + ys)/2);
		return ( (xs + ys)/2 ); // かなりいい加減・・
	}
	
	// 地理座標からビットイメージカバレッジのピクセル座標を算出する
	// cExtは冗長～不要
	#latLng2coverageImageXY(pixWidth , pixHeight, lng,lat,targetCoverage,cExt){
		let pixel = this.#latLng2coverageImageRawXY(pixWidth , pixHeight, lng,lat,targetCoverage,cExt);
		return { x: Math.floor(pixel.x), y: Math.floor(pixel.y) };
	}

	// 地理座標からビットイメージカバレッジのピクセル座標(小数点)を算出する
	#latLng2coverageImageRawXY(pixWidth, pixHeight, lng, lat, targetCoverage, cExt) {
		var px, py;
		if (!targetCoverage.geo2svg) {
			if (!cExt) {
				cExt = this.#getCoverageExtent(targetCoverage);
			}
			px = pixWidth * (lng - cExt.lngMin) / (cExt.lngMax - cExt.lngMin);
			py = pixHeight - pixHeight * (lat - cExt.latMin) / (cExt.latMax - cExt.latMin);
			//			console.log("lat:",lat," lng:",lng,"  cExt:",cExt,"    px:",px,"  py:",py);
		} else {
			var g2s = targetCoverage.geo2svg;
			var cov_sp0 = targetCoverage.coordinates[0]; //カバレッジのsvg原点座標(transformかける前)
			var cov_sp1 = targetCoverage.coordinates[1]; //同対角座標
			var poi_svgPos = this.#svgMap.transform(lng, lat, g2s); // カバレッジのsvgコンテンツの座標系上でのポイントの座標
			var cov_sw = cov_sp1.x - cov_sp0.x;
			var cov_sh = cov_sp1.y - cov_sp0.y;
			px = pixWidth * (poi_svgPos.x - cov_sp0.x) / cov_sw;
			py = pixHeight * (poi_svgPos.y - cov_sp0.y) / cov_sh;
			//					console.log(g2s,cov_sp0,cov_sp1,poi_svgPos,cov_sw,cov_sh,pixWidth,pixHeight);
			//					console.log("非対角transform PX,PY算出:px,py:",px,py);
		}
		var ans = { x: px, y: py };
		if (px < 0 || py < 0 || px >= pixWidth || py >= pixHeight) {
			ans.outOfRange = true;
		}
		return (ans);
	}
	
	// latLng2coverageImageXYの逆変換関数～非対角成分ありも確認作業済 2020/7/21
	// cExtは冗長～不要
	#coverageImageXY2LatLng(pixWidth , pixHeight, px,py,targetCoverage,cExt){
		var lat,lng;
		
		if ( !targetCoverage.geo2svg){
			if ( !cExt){
				cExt = this.#getCoverageExtent(targetCoverage);
			}
			lng = cExt.lngMin + (px+0.5) * (cExt.lngMax - cExt.lngMin) / pixWidth;
			lat = cExt.latMin + (pixHeight -py -0.5) * (cExt.latMax - cExt.latMin) / pixHeight;
//			console.log("lat:",lat," lng:",lng,"  cExt:",cExt,"    px:",px,"  py:",py);
		} else {
			var s2g = targetCoverage.transform;
			
			var cov_sp0 = targetCoverage.coordinates[0]; //カバレッジのsvg原点座標(transformかける前)
			var cov_sp1 = targetCoverage.coordinates[1]; //同対角座標
			var cov_sw = cov_sp1.x - cov_sp0.x;
			var cov_sh = cov_sp1.y - cov_sp0.y;
			
			var poi_svgPosX = (px * cov_sw / pixWidth) + cov_sp0.x;
			var poi_svgPosY = (py * cov_sh / pixHeight) + cov_sp0.y;
			
			var geoPos = this.#svgMap.transform(poi_svgPosX, poi_svgPosY, s2g);
			lng = geoPos.x;
			lat = geoPos.y;
		}
		
		var ans = {latitude:lat,longitude:lng};
		return ( ans );
	}
	
	
	// ClipPolygon関数 ported from SVGMapTools's ClipPolygonDouble.java  ポリゴンやポリラインをrectでクリッピングする
	#ClipPolygon( poly , rect ){
		// poly: [{x,y,clippedEdge},..]
		// rect:to clip rectangle(.x,y,width,height)
		
		var lastClipped , clipped ; // poly class
		var currentEdge; // Edge class
		var lastp , thisp; // Point class
		var thisCE; //Is current point Clipped Edge?
		
		lastClipped = poly;
		lastClipped = clipSide(lastClipped, Edge(rect.x,rect.y,rect.x,rect.y+rect.height));
		lastClipped = clipSide(lastClipped, Edge(rect.x,rect.y+rect.height,rect.x+rect.width,rect.y+rect.height));
		lastClipped = clipSide(lastClipped, Edge(rect.x+rect.width,rect.y+rect.height,rect.x+rect.width,rect.y));
		lastClipped = clipSide(lastClipped, Edge(rect.x+rect.width,rect.y,rect.x,rect.y));
		return lastClipped;
		
		function clipSide( p,  e){ // p:poly, e:edge
			var intersect; // poly
			if (p.length == 0){
				return p; //nothing to do
			}
			currentEdge = e;
			clipped = [];
//			clipped.clipped=p.clipped;
//			console.log("p:poly:",p);
			lastp = [p[p.length-1].x,p[p.length-1].y];
			for (var i = 0; i < p.length; i++){
				thisp = [p[i].x,p[i].y];
				thisCE = p[i].clippedEdge;
				if (e.inside(thisp) && e.inside(lastp)){ // 前の点も今の点も入っていたら今の点を追加
					clipped.push({x:thisp[0],y:thisp[1],clippedEdge:thisCE});
				} else if (!e.inside(thisp) && e.inside(lastp)){ // 前の点だけ入っていたら交点を追加
					intersect = e.intersect(thisp,lastp);
					clipped.push({x:intersect[0],y:intersect[1], clippedEdge:thisCE}); // その点のClipEdgeフラグ継承
				} else if (!e.inside(thisp) && !e.inside(lastp)){ // 共に入って無い場合何も追加しない
					/*nothing */
				} else if (e.inside(thisp) && !e.inside(lastp)){ // 今の点だけ入っていたら・・
					intersect = e.intersect(lastp,thisp); // 交点を追加して、今の点を更に追加
					clipped.push({x:intersect[0],y:intersect[1], clippedEdge:true}); // しかもそれはクリップされたエッジの終点
					clipped.push({x:thisp[0],y:thisp[1],clippedEdge:thisCE});
//					clipped.clipped=true;
				}
				lastp = thisp;
			}
			currentEdge = null;  //so that paint won't draw currentEdge now we've 
			//left the loop
			return clipped;
		}
		
		function  Edge(x1, y1, x2, y2){
			var a = y2 - y1;
			var b = x1 - x2;
			var c = -a*x1 - b*y1;
			
			function inside(p){
				if ( a>0 || (a==0 && b<0)){
					return (a*p[0] + b*p[1] + c > 0);
				} else {
					return (a*p[0] + b*p[1] + c > 0);
				}
			}
			
			function intersect(p1, p2){
				var d = p2[1] - p1[1];
				var e = p1[0] - p2[0];
				var f = -d*p1[0] - e*p1[1];
				var denom = e*a - b*d;
				var x = ((b*f - e*c)/denom);
				var y = ((d*c - a*f)/denom);
				return ([x,y]);
			}
			return {
				inside:inside,
				intersect:intersect
			}
		}
	}
	
	
	// 線を指定して、そのビットイメージのRGB値を得るみたいなものを作っていきたいので、まずは単純な直線描画ライブラリを・・
	#getStraightLineCoordinates (startCoordinates, endCoordinates) {
		var coordinatesArray = new Array();
		// Translate coordinates
		var x1 = startCoordinates[0];
		var y1 = startCoordinates[1];
		var x2 = endCoordinates[0];
		var y2 = endCoordinates[1];
		// Define differences and error check
		var dx = Math.abs(x2 - x1);
		var dy = Math.abs(y2 - y1);
		var sx = (x1 < x2) ? 1 : -1;
		var sy = (y1 < y2) ? 1 : -1;
		var err = dx - dy;
		// Set first coordinates
		coordinatesArray.push([ x1,y1]);
		// Main loop
		while (!((x1 == x2) && (y1 == y2))) {
			var e2 = err << 1;
			if (e2 > -dy) {
				err -= dy;
				x1 += sx;
			}
			if (e2 < dx) {
				err += dx;
				y1 += sy;
			}
			// Set coordinates
			coordinatesArray.push([ x1,y1]);
		}
		// Return the result
		return coordinatesArray;
	}
	

	// スキャンラインアルゴリズムによるポリゴンフィルライブラリ
	// https://gist.github.com/arcollector/a7a1492689dee2e947ec
	#polygonFilling(points, pixWidth, pixHeight) {
		/**
		 * スキャンラインアルゴリズムによるポリゴンフィルライブラリ
		 * by jakkyfc 2021/06
		 *
		 *　@Parameters
		 * -------------------------
		 * 	points		: Array
		 * 					[[x,y],[x,y],...]
		 *  pixWidth	: int
		 * 	pixHeight	: int
		 * 
		 * @Returns
		 * -------------------------
		 *	scanLine : Array
		 *		[[[x1,x2],y], [[x1,x2],y],...]　Yは降順
		 * 
		**/
		let minY = Math.floor(points[0][1]);
		let maxY = Math.floor(points[0][1]);
		let samePixelFlag = true;
		let diffValueFlag = false;
		let lines = [];
		let scanLine = [];
		//generate line
		for (let i = 1; i < points.length; i++) {
			lines.push(new Line(points[i - 1], points[i]));

			// 極小ポリゴン検出
			// 同一ピクセルの確認
			if (samePixelFlag && (Math.floor(points[0][0]) != Math.floor(points[i][0]) || Math.floor(points[0][1]) != Math.floor(points[i][1]))) { //画像に変換した際は同一ピクセル
				samePixelFlag = false;
			}
			// 全頂点が1点でないことの確認
			if (!diffValueFlag && (points[0][0] != points[i][0]) && (points[0][1] != points[i][1])) {//座標が異なる＝点（ポイント）でない
				diffValueFlag = true;
			}
		}
		if (diffValueFlag && samePixelFlag) {
			//極小ポリゴンの場合はスキャンライン使用せず処理抜けます
			return [[[Math.floor(points[0][0]), Math.floor(points[0][0])], Math.floor(points[0][1])]];
		}

		// find min and max
		for (let i = 0; i < points.length; i++) {
			let temp = Math.floor(points[i][1]);
			if (temp < minY)
				minY = temp;
			else if (temp > maxY)
				maxY = temp;
		}
		if (minY < 0) minY = 0; //Y軸方向のクリッピング
		// end find

		//draw fill line
		for (let y = minY; y <= maxY + 1; y++) {
			let meetPointAtOrigLine = getMeetPoint(y);
			let meetPointAtCenterLine = getMeetPoint(y + 0.5);  //Half pixel shift scan lineのためyに+0.5する

			//TODO:ここ汚いのでリファクタリングの余地あり
			//本当はビット演算で処理しようと思ったが64ビット=64pxを超過する可能性があったのでそっちのほうは断念
			//本来は結合すべき
			for (let i = 1; i < meetPointAtOrigLine.length; i += 2) {
				if (Math.abs(meetPointAtOrigLine[i - 1] - meetPointAtOrigLine[i]) > 0.0001) { // 2点間の距離が極小の場合は面積なしとして扱う
					//console.log("OrigPixel : ", meetPointAtOrigLine[i - 1], y, meetPointAtOrigLine[i]);
					if (meetPointAtOrigLine[i] > 0) {   //終点がマイナスのエリアは除外=クロッピング
						if (meetPointAtOrigLine[i - 1] < 0) {   //始点がマイナスの場合は0で置き換え=クロッピング
							if (y > 0) scanLine.unshift([[0, Math.floor(meetPointAtOrigLine[i])], y - 1]); //yがマイナスをとる場合は除外
							scanLine.unshift([[0, Math.floor(meetPointAtOrigLine[i])], y]);
						} else {
							if (y > 0) scanLine.unshift([[Math.floor(meetPointAtOrigLine[i - 1]), Math.floor(meetPointAtOrigLine[i])], y - 1]);//yがマイナスをとる場合は除外
							scanLine.unshift([[Math.floor(meetPointAtOrigLine[i - 1]), Math.floor(meetPointAtOrigLine[i])], y]);
						}
					}
				}
			}
			for (let i = 1; i < meetPointAtCenterLine.length; i += 2) {
				if (Math.abs(meetPointAtCenterLine[i - 1] - meetPointAtCenterLine[i]) > 0.0001) { // 2点間の距離が極小の場合は面積なしとして扱う
					if (meetPointAtCenterLine[i] > 0) {   //終点がマイナスのエリアは除外=クロッピング
						if (meetPointAtCenterLine[i - 1] < 0) {   //始点がマイナスの場合は0で置き換え=クロッピング
							scanLine.unshift([[0, Math.floor(meetPointAtCenterLine[i])], y]);
						} else {
							scanLine.unshift([[Math.floor(meetPointAtCenterLine[i - 1]), Math.floor(meetPointAtCenterLine[i])], y]);
						}
					}
				}
			}
		}
		//end fill line
		return scanLine;

		function getMeetPoint(y) {
			/**
			 * 交差ポイントの取得
			 * 
			 * @param
			 *  y: float  スキャンラインのy軸値
			 * 
			 * @returns
			 *  meet: array Y軸と交差しているXの値
			 * 
			 **/
			let meet = [];
			for (let i = 0; i < lines.length; i++) {
				let l = lines[i];
				if (l.isValidY(y)) {
					meet.push(l.getX(y));
				}
			}
			//sort
			for (let i = 0; i < meet.length; i++) {
				for (let j = i + 1; j < meet.length; j++) {
					if (meet[i] > meet[j]) {
						let temp = meet[i];
						meet[i] = meet[j];
						meet[j] = temp;
					}
				}
			}
			return meet;
		}

		function Line(start, end) {
			/**
			* 辺を管理するクラス
			* 
			* @Parameters
			* ------------------------------------
			* start : array
			*  [x, y]
			* 
			* end : array
			*  [x, y]
			* 
			* 
			**/
			this.x0 = start[0];
			this.x1 = end[0];
			this.y0 = start[1];
			this.y1 = end[1];
			this.m = (this.y1 - this.y0) / (this.x1 - this.x0);

			this.getX = function (y) {
				if (!this.isValidY(y))
					throw new RangeError();

				return 1 / this.m * (y - this.y0) + this.x0;
			}

			this.isValidY = function (y) {
				if (y >= this.y0 && y < this.y1) {  //辺と交差
					return true;
				}
				if (y >= this.y1 && y < this.y0) {  //辺と交差
					return true;
				}

				return false;
			}
		};
	}
	
	
	
	// ポリゴンxビットイメージで出力された結果のOR演算機能 2020/7/10
	// ポリゴンの特性を使って演算量を少なくする処理が入った特別処理になっている。
	// あるタイルのピクセルのinRangeがfalseでも、別のタイルで同じ場所がtrueだったらそのデータを除去する処理
	#doPolygonOrComputing( superParam ){
		var dsrc = superParam.ans;
		
		dc=0;
		dc2=0;
		for ( var i = 0 ; i < dsrc.length ; i++ ){
			if ( ! dsrc[i] ){
				continue;
			}
			var cAns = dsrc[i];
			if ( cAns.hasIntersection && cAns.hasOutOfRange ){ // 全部inRangeならスルーできる
				var cExtent = cAns.extent;
				var inersectedTiles =[]; // そのタイルと重なっているタイルを探す
				for ( var j = 0 ; j < dsrc.length ; j++ ){
					if ( i!=j && dsrc[j] && this.#isIntersect(cExtent, dsrc[j].extent )){ // 自身は対象外だね
						inersectedTiles.push({index:j, tile:dsrc[j]});
					}
				}
				
//				console.log("inersectedTiles:",inersectedTiles);
				
				for ( var py = 0 ; py < cAns.height ; py++ ){
					for ( var px = 0 ; px < cAns.width ; px++ ){
						// データがあり、inRangeがfalseのものが評価対象
						if ( cAns.rasterData[py][px].color && cAns.rasterData[py][px].inRange == false ){ 
							var pLng = cAns.extent.lngMin + px * (cAns.extent.width / cAns.width );
							var pLat = cAns.extent.latMax - py * (cAns.extent.height / cAns.height);
							
							for ( var k = 0 ; k < inersectedTiles.length ; k++ ){
								var iTile = inersectedTiles[k].tile;
								iPx = Math.floor( iTile.width * (pLng - iTile.extent.lngMin) / iTile.extent.width);
								iPy = Math.floor( iTile.height * (iTile.extent.latMax - pLat) / iTile.extent.height);
								
//								if ( dc < 100 ){console.log(iPx,iPy,iTile.rasterData[iPy][iPx])}
								
								if ( iPx>=0 && iPy>=0 && iPx < iTile.width && iPy < iTile.height ){
									if (iTile.rasterData[iPy][iPx].color ){
										if (iTile.rasterData[iPy][iPx].inRange == true ){
		//									cAns.rasterData[py][px].inRange = true; // 本当のtrueとは言いづらいので、別の名前にするか、空にした方が良いかも。
											cAns.rasterData[py][px] ={};
											--cAns.outOfRangeCounts;
											++dc;
											break;
										}
									} else { // ジャギーによりポリゴンの縁の部分のデータがないケースがある
										var comPix = this.#computePixCoverage(iPx,iPy,iTile.width,iTile.height,superParam.pixDataBuffer[inersectedTiles[k].index],superParam.range);
										if ( comPix.inRange == true ){
											cAns.rasterData[py][px] ={};
											--cAns.outOfRangeCounts;
											++dc;
											++dc2;
											break;
										}
									}
								}
							}
						}
					}
				}
				
				if ( cAns.outOfRangeCounts < 0 ){ // 引きすぎ
					cAns.outOfRangeCounts = 0;
				}
				
				if ( cAns.outOfRangeCounts == 0 ){
					cAns.hasOutOfRange = false;
				}
				
			} else {
				// pass
			}
		}
		console.log("Number of points inranged by OR processing : ",dc,"   by backup Processing:",dc2);
		superParam.cbFunc(superParam.ans, superParam.param);
	}
	
	#doPointOrComputing( superParam ){
		// 工事中 未実装です
		superParam.cbFunc(superParam.ans, superParam.param);
	}
	
	
	// 他のカバレッジで包含判定が出ているものを外す処理 2020/7/8
	// 少しヒューリスティックなところがある・・・(ピクセルの分解能分)
	#doPolylineOrComputing( superParam ){
		var dsrc = superParam.ans;
		
		// このsuperParam.ans配列 作り方に若干無理があるのでemptyがあるためそれを消す
		// 加えて、それぞれの中に、inRangeでないポイントがあるかどうかを確認する
		for ( var i = dsrc.length -1 ; i >=0 ; i-- ){
			if ( !dsrc[i] ){
				dsrc.splice(i,1);
			} else {
				var hasOutOfRange = false;
				for ( var j = 0 ; j < dsrc[i].length ; j++ ){
					if ( dsrc[i][j].inRange == false ){
						hasOutOfRange = true;
						break;
					}
				}
				dsrc[i].hasOutOfRange=hasOutOfRange;
			}
		}
		var ans;
		console.log("doPolylineOrComputing dsrc:",dsrc);
		for ( var i = 0 ; i < dsrc.length ; i++ ){
			var cAns = dsrc[i];
			if ( cAns.hasOutOfRange ){ // 全部inRangeならスルーできる
				var cExtent = cAns.extent;
				var inersectedTiles =[]; // そのタイルと重なっているタイルを探す
				for ( var j = 0 ; j < dsrc.length ; j++ ){
					if ( i!=j && this.#isIntersect(cExtent, dsrc[j].extent )){ // 自身は対象外だね
						inersectedTiles.push(dsrc[j]);
					}
				}
				// console.log("cAns:",cAns,"  inersectedTiles:",inersectedTiles);
				for ( var j = 0 ; j < cAns.length ; j++ ){ // 個々のポイントについて評価する
					var tPoi=cAns[j];
					if ( tPoi.inRange==false ){ // inRangeでないポイントがあったらinersectedTilesのポイントの中の近いものでinRangeのものがあるかどうか探す
						var mPois=[];
						for ( var k = 0 ; k < inersectedTiles.length ; k++ ){
							var minDif = 1e30;
							var mPoi=null;
							//console.log("inersectedTiles[k].extent",inersectedTiles[k].extent,"  tPoi:",tPoi);
							if (inersectedTiles[k].extent.lngMin <= tPoi.coordinates[0] && inersectedTiles[k].extent.lngMax > tPoi.coordinates[0] && inersectedTiles[k].extent.latMin <= tPoi.coordinates[1] && inersectedTiles[k].extent.latMax > tPoi.coordinates[1]){ // 対象とする地点が、その隣接タイルの中に入っている場合のみ演算対象とする
								// console.log("doComp:");
								for ( var l = 0 ; l < inersectedTiles[k].length ; l++){
									var rPoi = inersectedTiles[k][l];
									var dif = (tPoi.coordinates[0] - rPoi.coordinates[0])*(tPoi.coordinates[0] - rPoi.coordinates[0])+(tPoi.coordinates[1] - rPoi.coordinates[1])*(tPoi.coordinates[1] - rPoi.coordinates[1]);
									if (dif < minDif ){ // 対象地点と最も近い隣接タイル中の地点を選別する ISSUE これだけだと消し過ぎる可能が否定しきれない（タイルレベルでは入っているが、たまたまタイル中にある全然離れたライン上のポイントで判別してる可能性） スレッショルドをピクセル解像度程度にするべきじゃないか。
										minDif = dif;
										// rPoi.dif = dif;
										mPoi = rPoi;
									}
								}
							}
							if ( mPoi && minDif < (cAns.pixSize + inersectedTiles[k].pixSize)*(cAns.pixSize + inersectedTiles[k].pixSize)){ // 上の課題に対応するため、ここで minDif < pixRes^2 (ピクセル程度しか離れてない) 的な条件で絞る
								mPois.push(mPoi);
							}
						}
						// console.log("tPoi:",tPoi,"  mPois:",mPois,"  minDif:",minDif);
						for ( var k = 0; k < mPois.length ; k++ ){
							var mPoi = mPois[k];
							if ( mPoi && mPoi.inRange==true){
								// 他のカバレッジで包含判定が出ているピクセルだと判定
//								console.log("OR: tgt:",tPoi,"   ref:",mPoi,"   minDif:",minDif);
								tPoi.inRange = "mayTrue"; // ひとまず消さずにフラグを変える・・
							}
						}
					}
				}
				
				//console.log("hasOOR:",i, " cExtent:",cExtent, "  inersectedTiles:",inersectedTiles);
			} else {
				//console.log("PASS  :",i);
			}
		}
		
		var ans = [];
		var dc=0;
		// 処理完了！　きれいにする
		for ( var i = 0 ; i < dsrc.length ; i++ ){
			for ( var j = 0 ; j < dsrc[i].length ; j++ ){
				var tPoi = dsrc[i][j];
				if ( tPoi.inRange == "mayTrue"){
					++ dc;
					// pass
//					tPoi.inRange=false;
//					ans.push(tPoi);
				} else {
					ans.push(tPoi);
				}
			}
		}
		superParam.ans=ans;
		console.log("Number of points deleted by OR processing : ",dc);
		superParam.cbFunc(superParam.ans, superParam.param);
	}
	
	
	
	// canvasで画像処理などをさせるときはCORSが設定されてないと基本的にはNGなので、それが無理な場合はProxyを経由させる
	#intProxyInfo={};
	#setImageProxy( pxUrl , directURLls , useAnonProxy){ // to be obsoluted 2022/4/6 ( svgMap.jsのsetProxyURLFactoryとcorsProxy.jsに統合化済み )
		this.#intProxyInfo={};
		if ( !pxUrl ){
			return;
		}
		this.#intProxyInfo.proxyUrl = pxUrl;
		if ( directURLls ){
			this.#intProxyInfo.directURLlist = directURLls;
		} else {
			this.#intProxyInfo.directURLlist = [];
		}
		if ( pxUrl.indexOf("http")==0){
			var pxDomain = pxUrl.substring(0,pxUrl.indexOf("/",8));
			this.#intProxyInfo.directURLlist.push(pxDomain);
		}
		
		if ( useAnonProxy ){
			this.#intProxyInfo.anonProxy = true;
		} else {
			this.#intProxyInfo.anonProxy = false;
		}
	}
	
	#getImageURL(imageUrl, alsoAnonymousInfo){
		// ローカル（同一ドメイン）コンテンツもしくはそれと見做せる(directURLlistにあるもの)もの以外をproxy経由のURLに変換する
		// proxyの仕様は、 encodeURIComponent(imageUrl)でオリジナルのURLをエンコードしたものをURL末尾(もしくはクエリパート)につけたGETリクエストを受け付けるタイプ
		if ( this.#intProxyInfo.proxyUrl){ // この分岐部は廃止予定(⇒svgMap.getCORSURL)
			if ( this.#intProxyInfo.proxyUrl && imageUrl.indexOf("http") == 0){
				if (this.#isDirectURL(imageUrl)){
					// Do nothing (Direct Connection)
				} else {
					imageUrl = this.#intProxyInfo.proxyUrl + encodeURIComponent(imageUrl);
	//				console.log("via proxy url:",imageUrl);
				}
			} else {
				// Do nothing..
			}
			if ( alsoAnonymousInfo ){
				return {
					url:imageUrl,
					anonymous:this.#intProxyInfo.anonProxy
				}
			} else {
				return (imageUrl);
			}
		} else {
			return (this.#svgMap.getCORSURL(imageUrl,alsoAnonymousInfo));
		}
	}
	
	#isDirectURL(url){
		// urlに、directURLlistが含まれていたら、true　含まれていなかったらfalse
		var ans = false;
		for ( var i = 0 ; i < this.#intProxyInfo.directURLlist.length ; i++ ){
			if ( url.indexOf(this.#intProxyInfo.directURLlist[i])>=0){
				ans = true;
				break;
			}
		}
		return ( ans );
	}
	
	// rgb2hsv and hsv2rgb : from https://www.petitmonte.com/javascript/rgb_hsv_convert.html
	// RGB色空間からHSV色空間へ変換する 
	//  r(red)  : 赤色 0-255の値
	//  g(green): 緑色 0-255の値
	//  b(blue) : 青色 0-255の値 
	#rgb2hsv(r, g, b){   
		var max = Math.max(r, g, b);
		var min = Math.min(r, g, b);   
		var hsv = {'h':0,
		's':0,
		'v':max}; // V(明度)   
		if (max != min) {
			// H(色相)  
			if (max == r) hsv.h = 60 * (g - b) / (max-min);
			if (max == g) hsv.h = 60 * (b - r) / (max-min) + 120;
			if (max == b) hsv.h = 60 * (r - g) / (max-min) + 240;
			// S(彩度)
			hsv.s = (max - min) / max;
		}   
		if (hsv.h < 0){
			hsv.h = hsv.h + 360;
		}
		hsv.h =  Math.round(hsv.h);
		hsv.s =  Math.round(hsv.s * 100);
		hsv.v =  Math.round((hsv.v / 255) * 100);     
		return hsv;   
	}
	// HSV(HSB)色空間からRGB色空間へ変換する 
	//  h(hue)       : 色相/色合い   0-360度の値
	//  s(saturation): 彩度/鮮やかさ 0-100%の値
	//  v(Value)     : 明度/明るさ   0-100%の値 
	//  ※v は b(Brightness)と同様 
	#hsv2rgb(h, s, v){
		var max = v;
		var min = max - ((s / 255) * max);
		var rgb = {'r':0,'g':0,'b':0};  
		if (h == 360){
			h = 0;
		}
		s = s / 100;   
		v = v / 100;   
		if (s == 0){
			rgb.r = v * 255;
			rgb.g = v * 255;
			rgb.b = v * 255;
			return rgb;
		}
		var dh = Math.floor(h / 60);
		var p = v * (1 - s);
		var q = v * (1 - s * (h / 60 - dh));
		var t = v * (1 - s * (1 - (h / 60 - dh)));
		switch (dh){
			case 0 : rgb.r = v; rgb.g = t; rgb.b = p;  break;
			case 1 : rgb.r = q; rgb.g = v; rgb.b = p;  break;
			case 2 : rgb.r = p; rgb.g = v; rgb.b = t;  break;
			case 3 : rgb.r = p; rgb.g = q; rgb.b = v;  break;
			case 4 : rgb.r = t; rgb.g = p; rgb.b = v;  break;
			case 5 : rgb.r = v; rgb.g = p; rgb.b = q;  break
		}   
		rgb.r =  Math.round(rgb.r * 255);
		rgb.g =  Math.round(rgb.g * 255);
		rgb.b =  Math.round(rgb.b * 255);
		return rgb; 
	} 	
	
	#getColorString(r,g,b){
		var color ="#"+this.#zeroPadding(r.toString(16),2)+this.#zeroPadding(g.toString(16),2)+this.#zeroPadding(b.toString(16),2);
		return ( color );
	}
	#zeroPadding(num,length){
	    return ('0000000000' + num).slice(-length);
	}
	
	// geoJsonレンダラ系
	#drawGeoJson( geojson , targetSvgDocId, strokeColor, strokeWidth, fillColor, POIiconId, poiTitle, metadata, parentElm,metaDictionary){
//		console.log("called svgMapGisTool drawGeoJson");
		var svgImages = this.#svgMap.getSvgImages();
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
		var svgImage = svgImages[targetSvgDocId];
		var svgImagesProp = svgImagesProps[targetSvgDocId];
		var crs = svgImagesProp.CRS;
		
		if ( geojson.metadata){ // 2020/1/8
			metadata=geojson.metadata;
//			console.log("Set metadata on drawGeoJson:",metadata)
		} // ISSUE 2020.1.14 本来のgeojsonでは、 properties type:Featureオブジェクト下の "properties"プロパティに{KV,..}としてメタデータを入れる仕様　これをサポートするべき
		
		if (geojson.properties){ // 拡張メタデータ機構：標準geojsonはFeature下のみ許されるがどこでもOKに、下層はそれを継承上書き（デフォ属性可に）
			if (!metadata){
				metadata={};
			}
			for ( var mkey in geojson.properties){
				metadata[mkey]=geojson.properties[mkey];
			}
		}
		if (!metadata){
			metadata={};
		}
		
		if ( !geojson.type && geojson.length >0 ){ // これはおそらく本来はエラーだが
			for ( var i = 0 ; i < geojson.length ; i++ ){
				this.#drawGeoJson( geojson[i] , targetSvgDocId, strokeColor, strokeWidth, fillColor, POIiconId, poiTitle, metadata, parentElm,metaDictionary);
			}
		} else if ( geojson.type == "FeatureCollection" ){
			var features = geojson.features;
			for ( var i = 0 ; i < features.length ; i++ ){
				this.#drawGeoJson( features[i] , targetSvgDocId, strokeColor, strokeWidth, fillColor, POIiconId, poiTitle, metadata, parentElm,metaDictionary);
			}
		} else if ( geojson.type == "Feature" ){
			var geom = geojson.geometry;
			/**
			if(geojson.properties){
				metadata = "";
				postMeta = Object.keys(geojson.properties).map(function(key){return geojson.properties[key]});
				for(var i=0; i<postMeta.length; i++){
					metadata = metadata + postMeta[i];
					if(i != postMeta.length - 1){
						metadata = metadata + ",";
					}
				}
			}
			**/
			this.#drawGeoJson( geom , targetSvgDocId, strokeColor, strokeWidth, fillColor, POIiconId, poiTitle, metadata, parentElm,metaDictionary);
		} else if ( geojson.type == "GeometryCollection" ){
			var geoms = geojson.geometries;
			for ( var i = 0 ; i < geoms.length ; i++ ){
				this.#drawGeoJson( geoms[i] , targetSvgDocId, strokeColor, strokeWidth, fillColor, POIiconId, poiTitle, metadata, parentElm,metaDictionary);
			}
		} else if ( geojson.type == "MultiPolygon" ){
			// これは、pathのサブパスのほうが良いと思うが・・
			if ( geojson.coordinates.length >0){
				for ( var i = 0 ; i < geojson.coordinates.length ; i++ ){
					this.#putPolygon(geojson.coordinates[i], svgImage, crs, fillColor, metadata, parentElm,metaDictionary);
				}
			}
		} else if ( geojson.type == "Polygon" ){
			this.#putPolygon(geojson.coordinates, svgImage, crs, fillColor, metadata, parentElm,metaDictionary);
		} else if ( geojson.type == "MultiLineString" ){
			// これは、pathのサブパスのほうが良いと思うが・・
			if ( geojson.coordinates.length >0){			
				for ( var i = 0 ; i < geojson.coordinates.length ; i++ ){
					this.#putLineString(geojson.coordinates[i], svgImage, crs, strokeColor, strokeWidth, metadata, parentElm,metaDictionary);
				}
			}
		} else if ( geojson.type == "LineString" ){
			this.#putLineString(geojson.coordinates, svgImage, crs, strokeColor, strokeWidth, metadata, parentElm,metaDictionary);
			
		} else if ( geojson.type == "MultiPoint" ){
			// グループで囲んで一括でmetadataつけたほうが良いと思うが・・
			if ( geojson.coordinates.length >0){
				for ( var i = 0 ; i < geojson.coordinates.length ; i++ ){
					this.#putPoint(geojson.coordinates[i], svgImage, crs, POIiconId, poiTitle, metadata, parentElm,metaDictionary);
				}
			}
		} else if ( geojson.type == "Point" ){
			this.#putPoint(geojson.coordinates, svgImage, crs, POIiconId, poiTitle, metadata, parentElm,metaDictionary);
		}
		
	}
	

	/*
		Styleは実装
		Point     : title = name, metadata = descrptionとして格納
		LineString: metadata = name, descriptionとして格納
	*/

	#drawKml( kml , targetSvgDocId, strokeColor, strokeWidth, fillColor, POIiconId, poiTitle, metadata, parentElm,styleData){
		console.log("kml draw method.");
		var svgImages = this.#svgMap.getSvgImages();
		var svgImagesProps = this.#svgMap.getSvgImagesProps();
		var svgImage = svgImages[targetSvgDocId];
		var svgImagesProp = svgImagesProps[targetSvgDocId];
		var crs = svgImagesProp.CRS;
		//フォルダについて文法解釈
		var folders = kml.querySelectorAll('Folder');
		console.log(folders);
		if(folders.length > 0){
			var fld = Array.prototype.slice.call(folders,0); 
			//NodeListのループ
			//Firefox/Chrome 
			//folders.forEach(folder => {
			//case IE Edge
			//Array.prototype.forEach.call(folders, (folder) => {
			//case IE11
			//fld.forEach(function(folder,index){
			fld.forEach(function(folder,index){
				var kmlName = this.#getNameFromKML(folder);
				var kmlDescription = this.#getDescriptionFromKML(folder);
				//console.log('FOLDER',folder);
				drawKml( folder, targetSvgDocId, strokeColor, strokeWidth, fillColor, POIiconId, kmlName, kmlDescription, parentElm,styleData);
			});
		}else{
			//Placemarkについて文法解釈
			var placemarkAll = kml.querySelectorAll('Placemark');
			//console.log(placemarkAll);
			var plm = Array.prototype.slice.call(placemarkAll,0);
			let arr_metadata = [];
			plm.forEach(function(placemark,index){
				var kmlName = this.#getNameFromKML(placemark);
				var kmlDescription = this.#getDescriptionFromKML(placemark);
				if(kmlName === null && kmlDescription === null){
					kmlName = poiTitle;
					kmlDescription = metadata;
				}
				var kmlGeometory  = this.#getGeometryFromKML(placemark);
				var kmlCoordinate = this.#getCordinamteFromKML(placemark);

				if( kmlGeometory == "point" ){
					this.#putPoint(kmlCoordinate, svgImage, crs, POIiconId, kmlName, [kmlDescription], parentElm);
				}else if(kmlGeometory == "linestring"){
					arr_metadata.push(kmlName);
					arr_metadata.push(kmlDescription);
					putLineString(kmlCoordinate, svgImage, crs, strokeColor, strokeWidth, arr_metadata, parentElm);
				}else if( kmlGeometory == "linearring"){
					arr_metadata.push(kmlName);
					arr_metadata.push(kmlDescription);
					putLineString(kmlCoordinate, svgImage, crs, strokeColor, strokeWidth, arr_metadata, parentElm);
				}else if( kmlGeometory == "polygon"){
				}else if( kmlGeometory == "multigeometry"){
				
				}
			});
		}
	}

	#getNameFromKML(item){
		var nameTag = item.querySelector('name');
		if(nameTag){
			return nameTag.textContent.trim();
		}else{
			return null;
		}
	}

	#getDescriptionFromKML(item){
		var nameTag = item.querySelector('description');
		if(nameTag){
			return nameTag.textContent.trim();
		}else{
			return null;
		}
	}


	#getGeometryFromKML(item){
		if(item.querySelector('Placemark')){
			return 'placemark';
		}else if(item.querySelector('Polygon')){
			return "polygon";
		}else if(item.querySelector('Point')){
			return "point";
		}else if(item.querySelector('LineString')){
			return "linestring";
		}else if(item.querySelector('LinearRing')){
			return "linearring";
		}else if(item.querySelector('MultiGeometry')){
			return "multigeometry";
		}
	}


	#getCordinamteFromKML(item){
		var geoArray = []
		var coordinates = item.querySelector('coordinates').textContent.trim().replace(/\n/g," ").replace(/\t/g," ").split(" ");
		for (var i = 0; i < coordinates.length; i++){
			coordinate = coordinates[i].trim().split(",");
			geoArray.push([coordinate[0],coordinate[1]]);
		}
		return geoArray;
	}
	
	#putPoint(coordinates, svgImage, crs, POIiconId, poiTitle, metadata, parentElm,metaDictionary){
		var metastyle = this.#getSvgMapSimpleMeta(metadata,metaDictionary);
		// console.log("putPoint: style:",metastyle.styles,"  metadata:",metadata,"  metaDictionary:",metaDictionary);
		var metaString = this.#array2string(metastyle.normalized);
		if ( ! metaString && metastyle.styles.description ){
			metaString = metastyle.styles.description
		}
		if ( ! POIiconId ){
			POIiconId = "p0"; // 適当だ・・
		}
		if ( metastyle.styles["marker-symbol"] ){
			POIiconId = metastyle.styles["marker-symbol"];
		}
		var fill,stroke;
		var opacity=1;
		var strokeWidth = 0;
		if ( metastyle.styles.opacity ){
			opacity = Number(metastyle.styles.opacity);
		}
		if ( metastyle.styles.fill ){
			fill = metastyle.styles.fill;
		}
		if ( metastyle.styles["marker-color"] ){
			fill = metastyle.styles["marker-color"];
		}
		if ( metastyle.styles.stroke ){
			stroke = metastyle.styles.stroke;
			strokeWidth = 1;
		}
		if ( metastyle.styles["stroke-width"] ){
			strokeWidth = metastyle.styles["stroke-width"];
		}
		
		if ( metastyle.styles.title !=null && metastyle.styles.title !=undefined  ){
			poiTitle = metastyle.styles.title+"";
		} else {
			if ( metadata.title ){
				poiTitle = metadata.title+"";
			}
		}
		
		var poie = svgImage.createElement("use");
		var svgc = this.#getSVGcoord(coordinates,crs);
		if ( ! svgc ){
			return ( null );
		}
		poie.setAttribute( "x" , "0" );
		poie.setAttribute( "y" , "0" );
		poie.setAttribute( "transform" , "ref(svg," + svgc.x + "," + svgc.y + ")" );
		poie.setAttribute( "xlink:href" , "#" + POIiconId );
		if ( poiTitle ){
			poie.setAttribute( "xlink:title", poiTitle);
		}
		if ( metaString ){
			poie.setAttribute( "content", metaString);
		}
		if ( fill ){
			poie.setAttribute( "fill", fill);
		}
		if ( strokeWidth > 0 ){
			poie.setAttribute("stroke",stroke);
			poie.setAttribute("stroke-width",strokeWidth);
			poie.setAttribute("vector-effect","non-scaling-stroke");
		} else {
			poie.setAttribute("stroke","none");
		}
		if ( opacity <1){
			poie.setAttribute("opacity",opacity);
		}
		//console.log(poie);
		if ( parentElm ){
			parentElm.appendChild( poie );
		} else {
			svgImage.documentElement.appendChild( poie );
		}
		return ( poie );
	}
	
	#putLineString(coordinates, svgImage, crs, strokeColor, strokeWidth, metadata, parentElm,metaDictionary){
		var metastyle = this.#getSvgMapSimpleMeta(metadata,metaDictionary);
		var metaString = this.#array2string(metastyle.normalized);
		if ( ! metaString && metastyle.styles.description ){
			metaString = metastyle.styles.description
		}
		if ( !strokeColor ){
			strokeColor = "blue";
		}
		if ( !strokeWidth ){
			strokeWidth = 3;
		}
		var opacity=1;
		if ( metastyle.styles.opacity ){
			opacity = Number(metastyle.styles.opacity);
		}
		
		if ( metastyle.styles.stroke ){
			strokeColor = metastyle.styles.stroke;
		}
		if ( metastyle.styles["stroke-width"] ){
			strokeWidth = metastyle.styles["stroke-width"];
		}
		var title;
		if ( metastyle.styles.title ){
			title = metastyle.styles.title;
		}
		
		var pe = svgImage.createElement("path");
		var pathD = this.#getPathD( coordinates , crs );
		pe.setAttribute("d",pathD);
		pe.setAttribute("fill","none");
		pe.setAttribute("stroke",strokeColor);
		pe.setAttribute("stroke-width",strokeWidth);
		pe.setAttribute("vector-effect","non-scaling-stroke");
		if ( opacity <1){
			pe.setAttribute("opacity",opacity);
		}
		if ( title ){
			pe.setAttribute( "xlink:title", title);
		}
		if ( metaString ){
			pe.setAttribute( "content", metaString);
		}
		if ( parentElm ){
			parentElm.appendChild( pe );
		} else {
			svgImage.documentElement.appendChild( pe );
		}
//		console.log("putLineString:",pe);
		return (pe);
	}
	
	#putPolygon(coordinates, svgImage, crs, fillColor, metadata, parentElm,metaDictionary){
		var metastyle = this.#getSvgMapSimpleMeta(metadata,metaDictionary);
		var metaString = this.#array2string(metastyle.normalized);
		if ( ! metaString && metastyle.styles.description ){
			metaString = metastyle.styles.description
		}
		if ( coordinates.length ==0){
			return;
		}
		var strokeColor = "none";
		var strokeWidth = 0;
		if ( !fillColor ){
			fillColor = "orange";
		}
		
		if ( metastyle.styles.fill){
			fillColor = metastyle.styles.fill;
		}
		
		if ( metastyle.styles.stroke ){
			strokeWidth = 1;
			strokeColor = metastyle.styles.stroke;
		}
		
		if ( metastyle.styles["stroke-width"] ){
			strokeWidth = metastyle.styles["stroke-width"];
		}
		
		var opacity=1;
		if ( metastyle.styles.opacity ){
			opacity = Number(metastyle.styles.opacity);
		}
		
		var title;
		if ( metastyle.styles.title ){
			title = metastyle.styles.title;
		}
		
		
		
		var pe = svgImage.createElement("path");
		
		var pathD="";
		for ( var i = 0 ; i < coordinates.length ; i++ ){
			pathD += this.#getPathD( coordinates[i] , crs )+"z ";
		}
		
		pe.setAttribute("d",pathD);
		pe.setAttribute("fill",fillColor);
		pe.setAttribute("fill-rule", "evenodd");
		if ( strokeWidth > 0 ){
			pe.setAttribute("stroke",strokeColor);
			pe.setAttribute("stroke-width",strokeWidth);
			pe.setAttribute("vector-effect","non-scaling-stroke");
		} else {
			pe.setAttribute("stroke","none");
		}
		if ( opacity <1){
			pe.setAttribute("opacity",opacity);
		}
		if ( title ){
			pe.setAttribute( "xlink:title", title);
		}
		if ( metaString ){
			pe.setAttribute( "content", metaString);
		}
		if ( parentElm ){
			parentElm.appendChild( pe );
		} else {
			svgImage.documentElement.appendChild( pe );
		}
		return ( pe);
	}
	
	#getPathD( geoCoords , crs ){
		if ( geoCoords.length ==0){
			return(" ");
		}
		var ans ="M";
		var svgc = this.#getSVGcoord(geoCoords[0],crs);
		if ( svgc ){
			ans += svgc.x + "," + svgc.y + " L";
			for ( var i = 1 ; i < geoCoords.length ; i++ ){
				svgc = this.#getSVGcoord(geoCoords[i],crs);
				if ( svgc ){
					ans += svgc.x + "," + svgc.y + " ";
				}
			}
		} else {
			ans = " ";
		}
		return ( ans );
	}
	
	#getSVGcoord( geoCoord , crs ){
		// DEBUG 2017.6.12 geojsonの座標並びが逆だった 正しくは経度,緯度並び
		if ( geoCoord.length >1 ){
			return{ 
				x: geoCoord[0] * crs.a + geoCoord[1] * crs.c + crs.e ,
				y: geoCoord[0] * crs.b + geoCoord[1] * crs.d + crs.f
			}
		} else {
			return (null);
		}
	}
	
	// geoJsonのpropertyに以下の予約語が入っていたらスタイルと見做す(mapboxのgeojson拡張Simplestyleをベース)
	// See https://github.com/mapbox/simplestyle-spec
	// この実装では、opacity追加、"marker-size"の実装をどうしようか考え中です・・
	static #styleDict ={"title":0,"description":1,"marker-size":2,"marker-symbol":3,"marker-color":4,"stroke":5,"stroke-width":6,"fill":7,"opacity":8};
	
	#getSvgMapSimpleMeta(metadata,metaDictionary){
		var others={};
		var hitMeta=[];
		var style={};
		if ( metadata.length ){
			hitMeta = metadata;
		} else {
			if (metaDictionary){
				if ( !metaDictionary.hashMap){
					this.#buildMetaDictHash(metaDictionary);
				}
				hitMeta = new Array(metaDictionary.length);
				for ( var key in metadata){
					var idx = metaDictionary.hashMap[key];
					if ( idx !=undefined ){
						// hit
						hitMeta[idx]=metadata[key];
					} else {
						if ( SvgMapGIS.#styleDict[key] != undefined ){
							style[key] = metadata[key];
						} else {
							// ユーザメタデータにもスタイルにもヒットしない
							others[key] = metadata[key];
						}
					}
				}
			} else {
				// Prop Name(Key)順にソートしてならべるのが良いかと・・
//				console.log("sort by prop name");
				var keys = Object.keys(metadata);
				keys.sort();
				for(var key of keys) {
					if ( SvgMapGIS.#styleDict[key] != undefined ){
						style[key]=metadata[key];
					} else {
						hitMeta.push(metadata[key]);
					}
				}
			}
		}
		var ans = {
			normalized: hitMeta,
			others:others,
			styles:style
		};
		
//		console.log("getSvgMapSimpleMeta:",ans);
		return ans;
	}
	
	#buildMetaDictHash( metaDictionary ){ // metaDictionary indexOf不使用化 2022/03/01
		metaDictionary.hashMap={};
		for (  var i = 0 ; i < metaDictionary.length ; i++){
			metaDictionary.hashMap[metaDictionary[i]]=i;
		}
	}
	
	#array2string(arr){
		var ans;
		if ( arr.length == 0 ){
			return(null);
		}
		for ( var i = 0 ; i < arr.length ; i++ ){
			var s = "";
			if ( arr[i]!=null && arr[i]!=undefined  ){
				s=arr[i].toString();
			}
			if ( s.indexOf(",")>=0){
				s = s.replaceAll(",","&#x2c;");
			}
			if (i==0){
				ans = s;
			} else {
				ans += "," + s;
			}
		}
		return ( ans );
	}
	
	#testCapture( geom ){
		console.log("called testCapture");
		console.log("captured Geometry is:" , geom);
	}
	
	#testCapGISgeom(){
//		console.log("testCapGISgeom:",testCapture);
		this.#svgMap.captureGISgeometries(testCapture);
	}
	
	#captureGeometries( cbFunc , opt ){
		this.#svgMap.captureGISgeometries( cbFunc , opt );
	}
	
	#latLng2GeoJsonPoint(lat , lng ){
		return {
			type:"Point",
			coordinates:[ lng , lat]
		}
	}
	
	
	
	// ビットイメージカバレッジ×ポリゴンGIS(getInRangePolygonParts)の結果を直接可視化する
	#renderImages(sourceDataArray, parentElment, crs, renderingOptions){
		for ( var tc = 0 ; tc < sourceDataArray.length ; tc++ ){
			var tile = sourceDataArray[tc];
			if ( !tile ){ continue;}
			var tileImageUri = this.#getImage(tile,renderingOptions);
			var rct = (parentElment.ownerDocument).createElement("image");
			if ( !tile.transform ){ // 回転成分がない
				rct.setAttribute("x",Math.min(tile.extent.x * crs.a, (tile.extent.x+tile.extent.width) * crs.a));
				rct.setAttribute("y",Math.min(tile.extent.y * crs.d, (tile.extent.y+tile.extent.height) * crs.d));
				rct.setAttribute("width",Math.abs((tile.extent.width) * crs.a));
				rct.setAttribute("height",Math.abs((tile.extent.height) * crs.d));
			} else {
				console.log("has transform meshdata");
				var tMat = this.#svgMap.matMul(tile.transform, crs);
				rct.setAttribute("x",tile.coordinates[0].x);
				rct.setAttribute("y",tile.coordinates[0].y);
				rct.setAttribute("width",tile.coordinates[1].x - tile.coordinates[0].x);
				rct.setAttribute("height",tile.coordinates[1].y - tile.coordinates[0].y);
				rct.setAttribute("transform","matrix(" + tMat.a + "," + tMat.b + "," + tMat.c + "," + tMat.d + "," + tMat.e + "," + tMat.f + ")");
			}
			rct.setAttribute("xlink:href",tileImageUri);
			rct.setAttribute("style","image-rendering:pixelated");
			parentElment.appendChild(rct);
		}
		
	}
	
	// メッシュデータからビットイメージを生成
	// ビットイメージカバレッジ×ポリゴンGIS(getInRangePolygonParts)の結果をビットイメージ化することを第一の目的にしている
	// sourceData: 
	// width, height メッシュのピクセル数
	// rasterData[py][px]
	//   color
	//     r,g,b,a
	//   inRange boolean
	//
	// renderingOptions:
	//   drawOutOfRange : レンジ内ではなくレンジ外を描画する
	//   fillColor : 上記条件のピクセルを指定した色で描画する
	//   useCoverageColor : 上記条件のピクセルをカバレッジの色で描画する
	//   
	//
	#getImage(sourceData, renderingOptions ){
		var width = sourceData.width;
		var height = sourceData.height;
		var extent = sourceData.extent;
		
		var fillColor = [255,0,0,255];
		
		if( !renderingOptions ){
			renderingOptions ={};
		} else if ( renderingOptions.fillColor && renderingOptions.fillColor.length >= 3){
			fillColor=renderingOptions.fillColor;
			if ( renderingOptions.fillColor.length == 3 ){
				fillColor.push(255);
			}
		}
		
		
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		
		var context = canvas.getContext('2d');
		var imageData = context.getImageData(0, 0, width, height);
		var pixels = imageData.data; 
//		console.log("width,height,rasterData:",width,height,sourceData.rasterData);
		for ( var py = 0 ; py < height ; ++py ){
			for ( var px = 0 ; px < width ; ++px ){
				var base = (py * width + px) * 4;
//				console.log("px,py",px,py);
				var color = sourceData.rasterData[py][px].color;
				var inRange = sourceData.rasterData[py][px].inRange;
//				console.log("px,py",px,py," color,inRange:",color,inRange," sourceData.rasterData:",sourceData.rasterData[py][px]);
				if ( color ){
					if (inRange ){
						if ( !renderingOptions.drawOutOfRange){
							if ( renderingOptions.useCoverageColor ){
								pixels[base + 0] = color.r;  // Red
								pixels[base + 1] = color.g;  // Green
								pixels[base + 2] = color.b;  // Blue
								pixels[base + 3] = 255;  // Alpha
							} else {
								pixels[base + 0] = fillColor[0];  // Red
								pixels[base + 1] = fillColor[1];  // Green
								pixels[base + 2] = fillColor[2];  // Blue
								pixels[base + 3] = fillColor[3];  // Alpha
							}
						}
					} else {
						if ( renderingOptions.drawOutOfRange){
							if ( renderingOptions.useCoverageColor ){
								pixels[base + 0] = color.r;  // Red
								pixels[base + 1] = color.g;  // Green
								pixels[base + 2] = color.b;  // Blue
								pixels[base + 3] = 255;  // Alpha
							} else {
								pixels[base + 0] = fillColor[0];  // Red
								pixels[base + 1] = fillColor[1];  // Green
								pixels[base + 2] = fillColor[2];  // Blue
								pixels[base + 3] = fillColor[3];  // Alpha
							}
						}
					}
				}
			}
		}
		context.putImageData(imageData, 0, 0);
		var uri = canvas.toDataURL('image/png');
		return ( uri );
	}
	
	#getBufferedPolygon(geom,bufferLength){
		// jstsを用いて経度緯度系のgeometryのバッファ計算を行う
		// geom : 経度緯度系のgeomerty(line,polygon,polylineなんでも)
		// bufferLength : バッファ長[m]
		//
		// xx領域が十分狭いことを前提として、経度緯度系geometryの重心を基にした1次の変換によるメートル系への平面直角座標変換を行い、バッファ計算後、緯度座標に戻す
		var ct = this.#getCentroid(geom);
		var cost = Math.cos(ct[1] * Math.PI/180 );
		//console.log("centroid:",ct, " cos:",cost);
		var tf = [
		111111.11 * cost,
		0,
		0,
		111111.11,
		0,
		0
		];
		var ngm = {
			type:geom.type,
			coordinates:geom.coordinates
		}
		ngm = this.#transformGeometry(ngm,tf,true);
		console.log(ngm, this);
		var f = this.#getFeature(ngm);
		f = f.buffer(bufferLength);
		var bufGeom = this.#getGeoJson(f);
		var rtf = [
		1/(111111.11 * cost),
		0,
		0,
		1/111111.11,
		0,
		0
		];
		this.#transformGeometry(bufGeom,rtf);
		if ( geom.src){
			bufGeom.src = geom.src;
		}
		return ( bufGeom );
	}
	#getCentroid(geom){
		function opf(){
			var count=0;
			var sumX=0;
			var sumY=0;
			function set(crd){
				sumX+=crd[0];
				sumY+=crd[1];
				++count;
				//console.log(sumX,sumY,count);
			}
			function getResult(){
				//console.log(sumX,sumY,count);
				if ( count >0){
					return ( [sumX / count, sumY / count]);
				} else {
					return null;
				}
			}
			return{
				getResult,
				set
			}
		}
		var op = opf();
		this.#parseCoordinates(geom.coordinates, op);
		//console.log(op.getResult());
		return ( op.getResult() );
	}
	#transformGeometry(geom,transform, doDeepCopy){
		var transformOp;
		if ( doDeepCopy ){
			geom = structuredClone(geom);
		}
		if (typeof(transform)=="function"){
			transformOp = function(){
				function set(crd){
					return(transform(crd));
				}
				return{set}
			}
		} else {
			transformOp = function(){
				function set(crd){
					var ansX = crd[0]*transform[0] + crd[1]*transform[2] + transform[4]
					var ansY = crd[0]*transform[1] + crd[1]*transform[3] + transform[5]
					return [ansX,ansY];
				}
				return{set}
			}
		}
		var op = transformOp();
		//console.log(op);
		this.#parseCoordinates(geom.coordinates, op);
		return ( geom );
	}
	#parseCoordinates(cd, operator){
		//console.log(operator);
		if ( typeof(cd[0])=="number" && cd.length == 2){
			var ocd = operator.set(cd);
			if ( ocd ){
				cd[0]=ocd[0];
				cd[1]=ocd[1];
			}
		} else {
			for ( var scd of cd ){
				this.#parseCoordinates(scd, operator)
			}
		}
	}
	
	
	buildDifference(...params){ return (this.#buildDifference(...params))};
	buildIntersection(...params){ return (this.#buildIntersection(...params))};
	captureGeometries(...params){ return (this.#captureGeometries(...params))};
	coverageImageXY2LatLng(...params){ return (this.#coverageImageXY2LatLng(...params))};
	drawGeoJson(...params){ return (this.#drawGeoJson(...params))};
	drawKml(...params){ return (this.#drawKml(...params))};
	disableImageCache(...params){ return (this.#disableImageCache(...params))};
	enableImageCache(...params){ return (this.#enableImageCache(...params))};
	getBufferedPolygon(...params){ return (this.#getBufferedPolygon(...params))};
	getExcludedPoints(...params){ return (this.#getExcludedPoints(...params))};
	getColorString(...params){ return (this.#getColorString(...params))};
	getImage(...params){ return (this.#getImage(...params))};
	getIncludedPoints(...params){ return (this.#getIncludedPoints(...params))};
	getInRangeGeometriesOnCoverage(...params){ return (this.#getInRangeGeometriesOnCoverage(...params))};
	getInRangeLineParts(...params){ return (this.#getInRangeLineParts(...params))};
	getInRangePoints(...params){ return (this.#getInRangePoints(...params))};
	getInRangePolygonParts(...params){ return (this.#getInRangePolygonParts(...params))};
	haltComputing(...params){ return (this.#haltComputing(...params))};
	imageUrlEncoder(...params){ return (this.#getImageURL(...params))};
	latLng2coverageImageXY(...params){ return (this.#latLng2coverageImageXY(...params))};
	latLng2GeoJsonPoint(...params){ return (this.#latLng2GeoJsonPoint(...params))};
	renderImages(...params){ return (this.#renderImages(...params))};
	setImageProxy(...params){ return (this.#setImageProxy(...params))};
	testCapGISgeom(...params){ return (this.#testCapGISgeom(...params))};
	hsv2rgb(...params){ return (this.#hsv2rgb(...params))};
	rgb2hsv(...params){ return (this.#rgb2hsv(...params))};
}

export { SvgMapGIS };