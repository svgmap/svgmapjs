class GPS{
	#gpsif=null; // 2017.8.15 for iOS safari issues? 
	#svgMapObj;

	constructor(svgMapObj){
		this.#svgMapObj = svgMapObj;
		// TODO:UAtesterから取得するのが筋な気がする
		var uaProps = this.#svgMapObj.getUaProp();
		var gpsb = document.getElementById("gpsButton");
		if (gpsb) {
			if ( navigator.geolocation){
	//			alert( "I can use GPS!");
				//* move to initNavigationUIs() gpsb.styling
				// for safari issue hack
				// なぜかiOS SafariはsvgMapが動いているとgeolocationAPIがまともに動かないので、別window(iframe)でgoelocationさせるHackを実装 2017.6
				if ( uaProps.isSP && navigator.userAgent.indexOf("Safari") > 0 && navigator.userAgent.indexOf("Chrome") < 0){
//				if ( true ){
					this.#gpsif = document.createElement("iframe");
					this.#gpsif.setAttribute("id","safari4iframe");
					document.documentElement.appendChild(this.#gpsif);
					console.log( "contentWindow:",this.#gpsif.contentWindow.document );
					var ifd = this.#gpsif.contentWindow.document.documentElement;
					var script = this.#gpsif.contentWindow.document.createElement("script");
					this.#gpsif.style.display="none";
					script.innerHTML='function gps(){navigator.geolocation.getCurrentPosition( gpsSuccess );}function gpsSuccess(position){console.log("gps",position);window.parent.svgMap.gpsCallback(position)}';
					ifd.appendChild(script);
				}
				
			} else {
				gpsb.style.display="none";
	//			alert( "I can NOT use GPS..");
			}
			/** move to initNavigationUIs()
			gpsb.style.cursor = "pointer";
			**/
		}
	}

	gps(){
		if ( this.#gpsif ){
			this.#gpsif.contentWindow.gps();
		} else {
			navigator.geolocation.getCurrentPosition( this.gpsSuccess );
		}
	}

	gpsSuccess=function(position){
	//	alert("lat:" + position.coords.latitude + " lng:" + position.coords.longitude + " acc:" + position.coords.accuracy);
	//	console.log("Callback from iframe lat:" + position.coords.latitude + " lng:" + position.coords.longitude + " acc:" + position.coords.accuracy,"  this:",this);
		console.log("gpsSuccess:",position);
		this.#svgMapObj.setGeoCenter( position.coords.latitude , position.coords.longitude , position.coords.accuracy * 10 / 100000  );

	}.bind(this);


	
}
export{ GPS };