class ProxyManager{
	#contentProxyParams = { // プロキシ経由でコンテンツを取得するための設定オブジェクト
		getUrlViaProxy: null, // プロキシ経由URL生成関数(svg用)
		getUrlViaImageProxy: null, // 同上(image用)
		crossOriginAnonymous: false,
		getNonlinearTransformationProxyUrl: null, // 2021/1/27 ビットイメージの非線形変換を行うときだけプロキシを使う設定
		crossOriginAnonymousNonlinearTF: false,
	}
	
	getAccessInfo(rPath){
		var pxPath ;
		if ( typeof this.#contentProxyParams.getUrlViaProxy == "function" ){ // original 2014.2.25 by konno (たぶん)サイドエフェクトが小さいここに移動 s.takagi 2016.8.10
			pxPath = this.#contentProxyParams.getUrlViaProxy(rPath);
		} else {
			pxPath = rPath;
		}
		return ( pxPath );
	}
	
	getImageAccessInfo(href, needsNonLinearTF, crossoriginProp){
		var crossOriginFlag = false;
		var hasNonLinearImageTransformation = false;
		if ( crossoriginProp!=null ){
			crossOriginFlag = true;
		}
		if ( typeof this.#contentProxyParams.getUrlViaImageProxy == "function" ){ // 2020.1.30 image用のproxyが使えるようにする
			href = this.#contentProxyParams.getUrlViaImageProxy(href);
			if ( this.#contentProxyParams.crossOriginAnonymous ){
				// img.crossOrigin="anonymous";
				crossOriginFlag = true;
			}
		} else if ( typeof(this.#contentProxyParams.getNonlinearTransformationProxyUrl)=="function" && needsNonLinearTF){
			href = this.#contentProxyParams.getNonlinearTransformationProxyUrl(href);
			hasNonLinearImageTransformation = true;
			if ( this.#contentProxyParams.crossOriginAnonymousNonlinearTF ){
				// img.crossOrigin="anonymous";
				crossOriginFlag = true;
			}
		}
		//console.log("proxyManager:",href,crossOriginFlag,hasNonLinearImageTransformation);
		return {
			href,
			crossOriginFlag,
			hasNonLinearImageTransformation
		}
	}
	
	/**
	 * 
	 * @param {function} documentURLviaProxyFunction 
	 * @param {function} imageURLviaProxyFunction 
	 * @param {function} imageCrossOriginAnonymous 
	 * @param {function} imageURLviaProxyFunctionForNonlinearTransformation 
	 * @param {boolean} imageCrossOriginAnonymousForNonlinearTransformation 
	 */
	setProxyURLFactory( documentURLviaProxyFunction , imageURLviaProxyFunction , imageCrossOriginAnonymous , imageURLviaProxyFunctionForNonlinearTransformation , imageCrossOriginAnonymousForNonlinearTransformation){
		// 2020/1/30 proxyURL生成のsetterを設けるとともに、ビットイメージに対するproxyも設定できるように
		// 2021/1/27 ビットイメージの非線形変換のためだけに用いるプロキシを別設定可能にした。 APIの仕様がイケてない・・
		// 第一引数(documentURLviaProxyFunction)は使われていないと思われるので廃止したい
		if ( typeof ( documentURLviaProxyFunction ) == "function" ){
			this.#contentProxyParams.getUrlViaProxy = documentURLviaProxyFunction;
		} else if ( documentURLviaProxyFunction === null ){
			this.#contentProxyParams.getUrlViaProxy = null;
		}
		
		if ( typeof ( imageURLviaProxyFunction ) == "function" ){
			this.#contentProxyParams.getUrlViaImageProxy = imageURLviaProxyFunction;
		} else if(imageURLviaProxyFunction === null ){
			this.#contentProxyParams.getUrlViaImageProxy = null;
		}
		
		if ( imageCrossOriginAnonymous == true ){
			this.#contentProxyParams.crossOriginAnonymous = true;
		} else if ( imageCrossOriginAnonymous == false ) {
			this.#contentProxyParams.crossOriginAnonymous = false;
		}
		
		if ( typeof ( imageURLviaProxyFunctionForNonlinearTransformation ) == "function" ){
			this.#contentProxyParams.getNonlinearTransformationProxyUrl = imageURLviaProxyFunctionForNonlinearTransformation;
		} else if(imageURLviaProxyFunctionForNonlinearTransformation===null){ // undefinedのときは何もしないようにした方が良いかもということで 2021/1/27
			this.#contentProxyParams.getNonlinearTransformationProxyUrl = null;
		}
		
		if ( imageCrossOriginAnonymousForNonlinearTransformation == true ){
			this.#contentProxyParams.crossOriginAnonymousNonlinearTF = true;
		} else if ( imageCrossOriginAnonymousForNonlinearTransformation == false ) {
			this.#contentProxyParams.crossOriginAnonymousNonlinearTF = false;
		}
		
		console.log("called setProxyURLFactory: contentProxyParams:",this.#contentProxyParams,"    input params:",documentURLviaProxyFunction , imageURLviaProxyFunction , imageCrossOriginAnonymous , imageURLviaProxyFunctionForNonlinearTransformation , imageCrossOriginAnonymousForNonlinearTransformation);
	}

	getCORSURL(originalURL, alsoCrossoriginParam){
		//console.log("getCORSURL:",originalURL," pxPrm:",this.#contentProxyParams);
		if ( alsoCrossoriginParam ){ // SVGMap.jsとcrossorigin設定も同期させる場合にはその情報も得る（かわりobjectになる）
			if ( typeof (this.#contentProxyParams.getNonlinearTransformationProxyUrl )=="function"){
				return {
					url: this.#contentProxyParams.getNonlinearTransformationProxyUrl(originalURL),
					crossorigin: this.#contentProxyParams.crossOriginAnonymousNonlinearTF 
				}
			} else {
				return { 
					url: originalURL,
					crossorigin: false
				}
			}
		} else {
			if ( typeof (this.#contentProxyParams.getNonlinearTransformationProxyUrl )=="function"){
				return ( this.#contentProxyParams.getNonlinearTransformationProxyUrl(originalURL));
			//} else if ( typeof (this.#contentProxyParams.getUrlViaImageProxy)=="function"){
			//	return ( this.#contentProxyParams.getUrlViaImageProxy(originalURL));
			} else {
				return ( originalURL );
			}
		}
	}
	
}

export{ ProxyManager };