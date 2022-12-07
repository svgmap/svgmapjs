import { UtilFuncs } from './UtilFuncs.js';
import { SvgMapElementType } from './SvgMapElementType.js';

class PathRenderer{
	
	#geometryCapturer
	#matUtil;
	#mapTicker;
	#mapViewerProps;
	
	constructor(geometryCapturer, matUtil, mapTicker, mapViewerProps){
		console.log("new PathRenderer");
		this.#geometryCapturer = geometryCapturer;
		this.#matUtil = matUtil;
		this.#mapTicker = mapTicker;
		this.#mapViewerProps = mapViewerProps;
	}
	
	setSVGcirclePoints( pathNode ,  context , child2canvas , clickable , category , vectorEffectOffset , GISgeometry ){
		var cx = Number(pathNode.getAttribute("cx"));
		var cy = Number(pathNode.getAttribute("cy"));
		
		var rx, ry;
		
		if ( category == SvgMapElementType.CIRCLE ){
			rx = Number(pathNode.getAttribute("r"));
			ry = rx;
		} else {
			rx = Number(pathNode.getAttribute("rx"));
			ry = Number(pathNode.getAttribute("ry"));
		}
		
		if ( GISgeometry ){
			GISgeometry.setPoint(cx,cy);
		}
		
		var repld = "M"+ (cx - rx) + "," + cy + "A" + rx + "," + ry + " 0 0 1 " + (cx + rx ) + "," + cy + "A" + rx + "," + ry + " 0 0 1 " + (cx - rx ) + "," + cy +"z";
		
		var ret = this.setSVGpathPoints( pathNode ,  context , child2canvas , clickable , repld , vectorEffectOffset , GISgeometry );
		if ( vectorEffectOffset ){ // non scaling circle support 2018.3.6
			ret.y -= ry;
			ret.height = ry * 2;
		} else {
			var csize = transform( rx , ry , child2canvas , true );
			ret.y -= csize.y;
			ret.height = csize.y * 2;
		}
		return ( ret );
	}

	setSVGrectPoints( pathNode ,  context , child2canvas , clickable , vectorEffectOffset , GISgeometry ){
		var rx = Number(pathNode.getAttribute("x"));
		var ry = Number(pathNode.getAttribute("y"));
		var rw = Number(pathNode.getAttribute("width"));
		var rh = Number(pathNode.getAttribute("height"));
		
		if ( GISgeometry && !this.#geometryCapturer.GISgeometriesCaptureOptions.TreatRectAsPolygonFlag ){
			GISgeometry.setPoint( (rx + rw / 2.0) , (ry + rh / 2.0) );
		}
		
		var repld = "M"+ rx + "," + ry + "L" + (rx+rw) + "," + ry + " " + (rx+rw) + "," + (ry+rh) + " " + rx + "," + (ry+rh) +"z";
		
		var ret = this.setSVGpathPoints( pathNode ,  context , child2canvas , clickable , repld , vectorEffectOffset , GISgeometry );
		return ( ret );
	}

	setSVGpolyPoints( pathNode ,  context , child2canvas , clickable , nodeType , vectorEffectOffset , GISgeometry ){
		var pp = pathNode.getAttribute("points");
		if (pp){
			var points = (pp.replace(/,/g," ")).split(" ");
			if ( points.length > 3 ){
				var repld="M";
				
				for (var i = 0 ; i < (points.length/2) ; i++){
					repld += points[i*2] + "," + points[i*2+1];
					if ( i==0){
						repld+="L";
					} else {
						repld+=" ";
					}
				}
				
				if ( nodeType == SvgMapElementType.POLYGON ){
					repld+="Z";
				}
				
				var ret = this.setSVGpathPoints( pathNode ,  context , child2canvas , clickable , repld , vectorEffectOffset , GISgeometry );
				return ( ret );
			}
		}
	}

	setSVGpathPoints( pathNode ,  context , child2canvas , clickable , repld , vectorEffectOffset , GISgeometry ){
		// this routine is based on canvg.js's path parser
		if ( GISgeometry ){
			if ( vectorEffectOffset ){ // vectorEffectOffsetがあったら、それは全体で一個のPoint化
				GISgeometry.setPoint( vectorEffectOffset.x,vectorEffectOffset.y ); // bug fix 2018.3.5
				if ( this.#geometryCapturer.GISgeometriesCaptureOptions.SkipVectorRendering ){
					return({});
				}
			} else if ( !GISgeometry.svgXY ){
				GISgeometry.makePath();
			}
		}
		
		var canvasNonFillFlag = false;
		if ( context.fillStyle=="rgba(0, 0, 0, 0)"){
			canvasNonFillFlag = true;
		}
		var canvasNonStrokeFlag = false;
		if ( context.strokeStyle=="rgba(0, 0, 0, 0)"){
			canvasNonStrokeFlag = true;
		}
		
		var minx = 60000, maxx = -60000 , miny = 60000 , maxy = -60000;
		// 指定されたcanvas 2d contextに対して、svgのpathNodeを座標変換(child2canvas)して出力する
		var d;
		if ( repld ) {
			d = repld;
		} else {
			d = pathNode.getAttribute("d"); // from canvg
		}
		d = d.replace(/,/gm,' '); // get rid of all commas
		d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
		d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
		d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm,'$1 $2'); // separate commands from points
		d = d.replace(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from points
		d = d.replace(/([0-9])([+\-])/gm,'$1 $2'); // separate digits when no comma
		d = d.replace(/(\.[0-9]*)(\.)/gm,'$1 $2'); // separate digits when no comma
		d = d.replace(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm,'$1 $3 $4 '); // shorthand elliptical arc path syntax
		d = UtilFuncs.trim(UtilFuncs.compressSpaces(d)).split(' '); // compress multiple spaces
		
		var prevCommand="M";
		var prevCont = false;
		var sx = 0, sy = 0;
		var mx = 0 , my = 0;
		var startX = 0, startY = 0; // mx,myと似たようなものだがtransformかけてない・・・ 2016/12/1 debug
		var prevX = 0 , prevY = 0;
		context.beginPath();
		var i = 0;
		var command = d[i];
		var cp;
		var closed = false;
		
		var hitPoint = new Object(); // pathのhitPoint(線のためのhitTestエリア)を追加してみる(2013/11/28)
		
		function getHitPoint( hp , cp , isEdgePoint, that){ // 2019/4/16 なるべく端を設定しないように改良中　今後は選択したら選択した線を明示する機能が必要だね
			// この関数がsetSVGpathPoints内にあるのは非効率なのでは？ 2022/05/24
			// hp: ひとつ前のステップで決めたヒットポイント
			// なるべく端点は使いたくない(というより端点だったら、次の点との間の中点を使う)
			if ( hp.prevX){
				if (hp.isEdgePoint!=false && (isEdgePoint || hp.prevIsEdgePoint )){// hpが設定済みだけれど、hpに端点が設定されいた・・
					var tmpx = (hp.prevX + cp.x)/2;
					var tmpy = (hp.prevY + cp.y)/2;
					if (tmpx > 35  && tmpx < that.#mapViewerProps.mapCanvasSize.width -35 && tmpy > 35 && tmpy <  that.#mapViewerProps.mapCanvasSize.height - 35){
						hp.x = tmpx;
						hp.y = tmpy;
						hp.isNearEdgePoint=true;
					}
				}
			}
			
			if (cp.x > 35  && cp.x < that.#mapViewerProps.mapCanvasSize.width -35 && cp.y > 35 && cp.y <  that.#mapViewerProps.mapCanvasSize.height - 35){
				if ( !hp.x ){ // まだ未設定の場合は端点でもなんでもひとまず設定しておく
					hp.x = cp.x;
					hp.y = cp.y;
					hp.isEdgePoint=isEdgePoint;
					hp.isNearEdgePoint =false;
				} else if ( !isEdgePoint && (hp.isEdgePoint|| hp.isNearEdgePoint) ){ // 設定済みの場合、端点で無くて、hpが端点だったときはそれを設定する。
					hp.x = cp.x;
					hp.y = cp.y;
					hp.isEdgePoint=false;
					hp.isNearEdgePoint =false;
				}
			}
			hp.prevX = cp.x;
			hp.prevY = cp.y;
			hp.prevIsEdgePoint = isEdgePoint;
			return ( hp );
		}
		
		while ( i < d.length ){
			if ( cp ){
				prevX = cp.x;
				prevY = cp.y;
			}
			switch (command){
			case "M":
				++i;
				sx = Number(d[i]);
				++i;
				sy = Number(d[i]);
				startX = sx;
				startY = sy;
				cp = this.#matUtil.transform( sx , sy , child2canvas , false , vectorEffectOffset );
				mx = cp.x;
				my = cp.y;
	//			hitPoint = getHitPoint(hitPoint, cp , true );
				context.moveTo(cp.x,cp.y);
				if ( GISgeometry && !vectorEffectOffset ){
					GISgeometry.startSubPath(sx,sy);
				}
				command ="L"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
				break;
			case "m":
				++i;
				sx += Number(d[i]);
				++i;
				sy += Number(d[i]);
				startX = sx;
				startY = sy;
				cp = this.#matUtil.transform( sx , sy , child2canvas , false , vectorEffectOffset );
				mx = cp.x;
				my = cp.y;
	//			hitPoint = getHitPoint(hitPoint, cp , true );
				context.moveTo(cp.x,cp.y);
				if ( GISgeometry && !vectorEffectOffset ){
					GISgeometry.startSubPath(sx,sy);
				}
				command ="l"; // 次のコマンドが省略されたときのバグ対策 2016.12.5
				break;
			case "L":
				++i;
				sx = Number(d[i]);
				++i;
				sy = Number(d[i]);
	//			console.log("L",sx,sy);
				cp = this.#matUtil.transform( sx , sy , child2canvas , false , vectorEffectOffset );
	//			hitPoint = getHitPoint(hitPoint, cp);
				context.lineTo(cp.x,cp.y);
				if ( GISgeometry && !vectorEffectOffset ){
					GISgeometry.addSubPathPoint(sx,sy);
				}
				break;
			case "l":
				++i;
				sx += Number(d[i]);
				++i;
				sy += Number(d[i]);
				cp = this.#matUtil.transform( sx , sy , child2canvas , false , vectorEffectOffset );
	//			hitPoint = getHitPoint(hitPoint, cp);
				context.lineTo(cp.x,cp.y);
				if ( GISgeometry && !vectorEffectOffset ){
					GISgeometry.addSubPathPoint(sx,sy);
				}
				break;
			case "A": // non scaling が効いていない・・のをたぶん解消 2017.1.18
				var curr = this.#matUtil.transform(Number(sx) , Number(sy)); // これはmatrixないので無変換..
				++i;
				var rx = Number(d[i]);
				++i;
				var ry = Number(d[i]);
				++i;
				var xAxisRotation = Number(d[i]);
				++i;
				var largeArcFlag = Number(d[i]);
				++i;
				var sweepFlag = Number(d[i]);
				++i;
				sx = Number(d[i]);
				++i;
				sy = Number(d[i]);
				
				cp = this.#matUtil.transform( sx , sy );
				var point = function(x,y) { return { x : x , y : y } } // これはなぜあるのだろう・・・ 2022/05/24
				// Conversion from endpoint to center parameterization
				// http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
				// x1', y1' (in user coords)
				var currp = this.#matUtil.transform(
					Math.cos(xAxisRotation) * (curr.x - cp.x) / 2.0 + Math.sin(xAxisRotation) * (curr.y - cp.y) / 2.0,
					-Math.sin(xAxisRotation) * (curr.x - cp.x) / 2.0 + Math.cos(xAxisRotation) * (curr.y - cp.y) / 2.0
				); // これも無変換だ・・
				// adjust radii
				
				var l = Math.pow(currp.x,2)/Math.pow(rx,2)+Math.pow(currp.y,2)/Math.pow(ry,2);
				if (l > 1) {
					rx *= Math.sqrt(l);
					ry *= Math.sqrt(l);
				}
				// cx', cy'
				var s = (largeArcFlag == sweepFlag ? -1 : 1) * Math.sqrt(
					((Math.pow(rx,2)*Math.pow(ry,2))-(Math.pow(rx,2)*Math.pow(currp.y,2))-(Math.pow(ry,2)*Math.pow(currp.x,2))) /
					(Math.pow(rx,2)*Math.pow(currp.y,2)+Math.pow(ry,2)*Math.pow(currp.x,2))
				);
				if (isNaN(s)) s = 0;
				var cpp = this.#matUtil.transform(s * rx * currp.y / ry, s * -ry * currp.x / rx); // これも無変換・・・
				
				// cx, cy
				var centp = this.#matUtil.transform(
					(curr.x + cp.x) / 2.0 + Math.cos(xAxisRotation) * cpp.x - Math.sin(xAxisRotation) * cpp.y,
					(curr.y + cp.y) / 2.0 + Math.sin(xAxisRotation) * cpp.x + Math.cos(xAxisRotation) * cpp.y
				); // これも無変換・・・
				
				// vector magnitude
				var m = function(v) { return Math.sqrt(Math.pow(v[0],2) + Math.pow(v[1],2)); }
				// ratio between two vectors
				var r = function(u, v) { return (u[0]*v[0]+u[1]*v[1]) / (m(u)*m(v)) }
				// angle between two vectors
				var a = function(u, v) { return (u[0]*v[1] < u[1]*v[0] ? -1 : 1) * Math.acos(r(u,v)); }
				// initial angle
				var a1 = a([1,0], [(currp.x-cpp.x)/rx,(currp.y-cpp.y)/ry]);
				// angle delta
				var u = [(currp.x-cpp.x)/rx,(currp.y-cpp.y)/ry];
				var v = [(-currp.x-cpp.x)/rx,(-currp.y-cpp.y)/ry];
				var ad = a(u, v);
				if (r(u,v) <= -1) ad = Math.PI;
				if (r(u,v) >= 1) ad = 0;
				
				var r = rx > ry ? rx : ry;
				var ssx = rx > ry ? 1 : rx / ry;
				var ssy = rx > ry ? ry / rx : 1;
				
				var tc = this.#matUtil.transform( centp.x , centp.y , child2canvas , false , vectorEffectOffset ); // こっちはvectoreffect効いている
				var tsc;
				if ( vectorEffectOffset ){ // 2017.1.17 non scaling 対応
					tsc = this.#matUtil.transform( ssx , ssy);
				} else {
					tsc = this.#matUtil.transform( ssx , ssy , child2canvas , true); // スケール計算 これがVE fixed size効いていない
				}
				
				context.translate(tc.x, tc.y);
				context.rotate(xAxisRotation);
				context.scale(tsc.x, tsc.y);
				context.arc(0, 0, r, a1, a1 + ad, 1 - sweepFlag);
				context.scale(1/tsc.x, 1/tsc.y);
				context.rotate(-xAxisRotation);
				context.translate(-tc.x, -tc.y);
				cp = this.#matUtil.transform( sx , sy , child2canvas , false , vectorEffectOffset);
				break;
			case "Z":
			case "z":
				context.closePath();
	//			hitPoint = getHitPoint(hitPoint, cp);
				closed = true;
				sx = startX; // debug 2016.12.1
				sy = startY;
				if ( GISgeometry && !vectorEffectOffset ){
					GISgeometry.addSubPathPoint(sx,sy);
				}
				break;
			default:
	//			hitPoint = getHitPoint(hitPoint, cp);
				prevCont = true;
				break;
			}
			if ( cp ){
				if ( cp.x < minx ){
					minx = cp.x;
				}
				if ( cp.x > maxx ){
					maxx = cp.x;
				}
				if ( cp.y < miny ){
					miny = cp.y;
				}
				if ( cp.y > maxy ){
					maxy = cp.y;
				}
				if ( clickable ){
					// console.log("clk:",i,d.length-1);
					hitPoint = getHitPoint(hitPoint, cp , (i==2 || i == (d.length-1)) , this); // これは要るのでしょうか？ 2022/05/24
				}
			}
			
			
			if ( !prevCont ){
				prevCommand = command;
				++i;
				command = d[i];
			} else {
				command = prevCommand;
				prevCont = false;
				--i;
			}
			
		}
		if ( !closed ){
	//		context.closePath(); // BUGだった？
		}
		if ( !canvasNonFillFlag ){
			context.fill();
		}
		if ( !canvasNonStrokeFlag ){
			context.stroke();
		}
		var hitted=false;
		
		if ( clickable && !canvasNonFillFlag && ( this.#mapTicker.pathHitTester.enable || this.#mapTicker.pathHitTester.centralGetter ) ){ // ヒットテスト要求時の面の場合　且つ　面検索
			if( context.isPointInPath(this.#mapTicker.pathHitTester.x,this.#mapTicker.pathHitTester.y) || context.isPointInStroke(this.#mapTicker.pathHitTester.x,this.#mapTicker.pathHitTester.y) ){ // テストしヒットしてたら目立たせる isPointInStrokeも実施してみる
				hitted = true;
				var pathWidth = context.lineWidth;
				context.lineWidth = 6;
				var pathStyle = context.fillStyle;
				context.fillStyle = 'rgb(255,00,00)';
				context.fill();
				context.stroke();
				context.fillStyle = pathStyle;
				context.lineWidth = pathWidth;
			}
		}
		
		if ( clickable && canvasNonFillFlag && hitPoint.x && !this.#mapTicker.pathHitTester.pointPrevent ){ 
			var tmpLineWidth = context.lineWidth;
			var tmpStrokeStyle = context.strokeStyle;
			if ( context.lineWidth < 6 ){ // 細すぎる線はヒットテスト用のダミー太線を隠して配置する 6pxは決め打値
				context.lineWidth = 6;
				context.strokeStyle = 'rgba(0,0,0,0)'; // hittestにalphaは関係ないので隠せる
				context.stroke();
			}
			
			if (this.#mapTicker.pathHitTester.enable || this.#mapTicker.pathHitTester.centralGetter ){ // ヒットテスト要求時の線検索
				if(  context.isPointInStroke(this.#mapTicker.pathHitTester.x,this.#mapTicker.pathHitTester.y)  ){ // テストしヒットしてたら目立たせる isPointInStrokeに変更し線上なら」どこでもヒット可能にしてみる
					hitted = true;
					this.#mapTicker.pathHitTester.pointPrevent = true;
					context.lineWidth = tmpLineWidth+6;
					context.strokeStyle = 'rgba(255,0,0,1)';
					this.#mapTicker.pathHitTester.pointPrevent = false;
					context.stroke();
				}
			}
			// 線の場合　疑似ヒットポイントを設置(旧版との互換維持のため) ToDo消せるようにもしようね 2022/4/12
			context.beginPath();
			context.strokeStyle = 'rgba(255,00,00,0.8)';
			context.lineWidth = 3;
			context.arc(hitPoint.x,hitPoint.y,2,0,2*Math.PI,true);
			context.stroke();
			
			context.lineWidth = tmpLineWidth;
			context.strokeStyle = tmpStrokeStyle;
			
		}
		
		var endX,endY,endCos=0,endSin=0;
		
		if ( closed ){
			endX = mx;
			endY = my;
		} else {
			endX = cp.x;
			endY = cp.y;
		}
		
		var vabs = Math.sqrt((endX - prevX) * (endX - prevX) + (endY - prevY) * (endY - prevY));
		if ( vabs ){
			endCos = (endX - prevX) / vabs;
			endSin = (endY - prevY) / vabs;
		}
		
		return {
			hitted: hitted,
			x: minx,
			y: miny,
			width: maxx - minx,
			height: maxy - miny,
			endX: endX,
			endY: endY,
			endCos: endCos,
			endSin: endSin
		}
		
	}

	
}

export { PathRenderer };