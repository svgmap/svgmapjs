class CorsProxy {
	arr = new Array();
	#proxyUrl = "";
	#anonProxy = false;
	#directURLlist = [];
	#noEncode = true;
	#setImageProxy(pxUrl, directURLls, useAnonProxy, requireEncoding) {
		if (requireEncoding) {
			this.#noEncode = false;
		}
		this.#proxyUrl = pxUrl;
		if (directURLls) {
			this.#directURLlist = directURLls;
		} else {
			this.#directURLlist = [];
		}
		if (pxUrl.indexOf("http") == 0) {
			var pxDomain = pxUrl.substring(0, pxUrl.indexOf("/", 8));
			this.#directURLlist.push(pxDomain);
		}

		if (useAnonProxy) {
			this.#anonProxy = true;
		} else {
			this.#anonProxy = false;
		}
	}

	#isDirectURL(url) {
		// urlに、this.#directURLlistが含まれていたら、true　含まれていなかったらfalse
		var ans = false;
		for (var i = 0; i < this.#directURLlist.length; i++) {
			if (url.indexOf(this.#directURLlist[i]) >= 0) {
				ans = true;
				break;
			}
		}
		return ans;
	}

	#getImageURL(imageUrl) {
		// ローカル（同一ドメイン）コンテンツもしくはそれと見做せる(this.#directURLlistにあるもの)もの以外をproxy経由のURLに変換する
		// proxyの仕様は、 encodeURIComponent(imageUrl)でオリジナルのURLをエンコードしたものをURL末尾(もしくはクエリパート)につけたGETリクエストを受け付けるタイプ
		//console.log(this);
		if (this.#proxyUrl && imageUrl.indexOf("http") == 0) {
			if (this.#isDirectURL(imageUrl)) {
				// Do nothing (Direct Connection)
			} else {
				if (this.#noEncode) {
					imageUrl = this.#proxyUrl + imageUrl;
				} else {
					imageUrl = this.#proxyUrl + encodeURIComponent(imageUrl);
				}
				//				console.log("via proxy url:",imageUrl);
			}
		} else {
			// Do nothing..
		}
		return imageUrl;
	}

	// 公開用メソッド
	setService(pxUrl, directURLls, useAnonProxy, requireEncoding) {
		this.#setImageProxy(pxUrl, directURLls, useAnonProxy, requireEncoding);
	}
	getURL(imageUrl) {
		return this.#getImageURL(imageUrl);
	}

	getURLfunction() {
		// アロー関数で返せばいいのか・・
		// https://chaika.hatenablog.com/entry/2017/03/31/083000
		// ES6アロー関数　thisは呼出し元のthisが保証される
		/**
		return (  (imageUrl)=>{
			return(this.#getImageURL(imageUrl));
		});
		**/
		// もしくはES5.bind(this)する
		return function (imageUrl) {
			return this.#getImageURL(imageUrl);
		}.bind(this);
	}
}
export { CorsProxy };
