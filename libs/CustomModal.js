class CustomModal{
	
	constructor(mapTicker){
		this.mapTicker = mapTicker;
		console.log("const:CustomModal: this.mapTicker",this.mapTicker);
	}
	
	mapTicker;
	
	// アプリ側で利用できるモーダルフレームワーク
	// メッセージ(のhtmlソースもしくはDOM)及び、複数個のボタン、コールバック(押したボタンのインデックス入り)が使える
	// DOMをmessageHTMLに使っても良いことに 2019/7/9
	setCustomModal( messageHTML , buttonMessages , callback,callbackParam){ // added 2017/1/25
		console.log("setCustomModal :",buttonMessages, Array.isArray(buttonMessages) );
		var cm = this.mapTicker.initModal( "customModal" );
		for (var i = cm.childNodes.length-1; i>=0; i--) {
			cm.removeChild(cm.childNodes[i]);
		}
		if ( buttonMessages ){
			if (Array.isArray(buttonMessages)){
			} else {
				var bm = buttonMessages;
				buttonMessages = new Array();
				buttonMessages[0] = bm;
			}
		} else {
			buttonMessages = ["OK"];
		}
		
		console.log("setCustomModal :",buttonMessages);
		
		var message = document.createElement("div");
		if ( typeof messageHTML == "object" && messageHTML.nodeType == 1 ){
			message.appendChild(messageHTML);
		} else {
			message.innerHTML = messageHTML;
		}
		cm.appendChild(message);
		
		for ( var i = 0 ; i < buttonMessages.length ; i++ ){
			var btn = document.createElement("input");
			btn.setAttribute("type","button");
			btn.id= "customModalBtn_"+i;
			btn.setAttribute("value",buttonMessages[i]);
			cm.appendChild(btn);
		}
		var clickFunc = (function (e) {
			return function cmf(e){
				if ( e.target.id.indexOf("customModalBtn_")>=0){
					this.mapTicker.initModal();
					if ( callback ){
						callback ( Number(e.target.id.substring(15)),callbackParam);
					}
					cm.removeEventListener("click", clickFunc , false);
				}
			}.bind(this)
		}.bind(this))()
		
		cm.addEventListener("click", clickFunc,false);
		
	}
}

export{ CustomModal };