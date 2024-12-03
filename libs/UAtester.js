// UAtester: ブラウザが何かを判別するクラス
// Programmed by Satoru Takagi
//
// 2022/08/17 coreから切り出し
// uaProp isIE,verIE,isSPなどをまとめる
// IE系のメンバーは既に意味はなくなっている（IEサポートは終了済み）後ほど整理・・

class UAtester {
	verIE = 100;
	isIE = false;
	isSP;

	uaProp;
	// 以下はuaPropの値を直接・・
	name;
	MS;
	IE;
	Edge;
	Blink;
	smartPhone;
	old;

	constructor() {
		this.isSP = this.#checkSmartphone();
		this.uaProp = this.#checkBrowserName();
		this.#checkIE();
	}

	#checkSmartphone() {
		// Mobile Firefox & Firefox OS 2012/12
		if (
			navigator.userAgent.indexOf("iPhone") > 0 ||
			navigator.userAgent.indexOf("iPad") > 0 ||
			navigator.userAgent.indexOf("iPod") > 0 ||
			navigator.userAgent.indexOf("Android") > 0 ||
			(navigator.userAgent.indexOf("Mobile") > 0 &&
				navigator.userAgent.indexOf("Gecko") > 0)
		) {
			return true;
		} else {
			return false;
		}
	}

	#checkBrowserName() {
		var name;
		var MS = false;
		var IE = false;
		var Blink = false;
		var Edge = false;
		var old = false;
		var smartPhone = this.#checkSmartphone();
		if (navigator.userAgent.indexOf("Trident") >= 0) {
			name = "IE";
			MS = true;
			IE = true;
		} else if (navigator.userAgent.indexOf("MSIE") >= 0) {
			name = "IE";
			MS = true;
			IE = true;
			old = true;
		} else if (navigator.userAgent.indexOf("Edge") >= 0) {
			name = "Edge";
			MS = true;
			Edge = true;
		} else if (navigator.userAgent.indexOf("Firefox") >= 0) {
			name = "Firefox";
		} else if (navigator.userAgent.indexOf("Opera") >= 0) {
			name = "Opera";
			Blink = true;
		} else if (
			navigator.userAgent.indexOf("Safari") >= 0 &&
			navigator.userAgent.indexOf("Chrome") < 0
		) {
			// これも要注意・・
			name = "Safari";
		} else if (navigator.userAgent.indexOf("Chrome") >= 0) {
			// ChromeはEdgeにも文字列含まれてるので要注意・・
			name = "Chrome";
			Blink = true;
		}

		this.name = name;
		this.MS = MS;
		this.IE = IE;
		this.Edge = Edge;
		this.Blink = Blink;
		this.smartPhone = smartPhone;
		this.old = old;

		return {
			name: name,
			MS: MS,
			IE: IE,
			Edge: Edge,
			Blink: Blink,
			smartPhone: smartPhone,
			old: old,
		};
	}

	#checkIE() {
		if (
			navigator.appName == "Microsoft Internet Explorer" ||
			navigator.userAgent.indexOf("Trident") >= 0
		) {
			//2013.12
			this.isIE = true;
			var apv = navigator.appVersion.toLowerCase();
			console.log("checkIE:", apv);
			if (apv.indexOf("msie") > -1) {
				this.verIE = parseInt(apv.replace(/.*msie[ ]/, "").match(/^[0-9]+/));
			} else {
				this.verIE = parseInt(apv.match(/(msie\s|rv:)([\d\.]+)/)[2]);
				//		isIE = false; // test
			}
		}
	}
}

export { UAtester };
