// 2024/10/01 : 連想配列svgImagesProps{}の要素の値SvgImagePropsを無名関数によるオブジェクトではなく、クラス定義をすることにします。
class SvgImageProps{
	// TBD: ここに、svgImagePropsで使われるメンバーを書いておきましょう。基本的にsvgImagePropsはwebAppレイヤーからはreadOnlyなのでgetterで制御するべきかと思います。 Proxy(https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Proxy)を使えば呼び元ごとの読み書き権限制御できそう
	
	#hashChangedByAppLayer=false; // #hashは#からスタートする文字列
	clearHashChangedFlag(){
		const ans = this.#hashChangedByAppLayer;
		this.#hashChangedByAppLayer = false;
		return ( ans);
	};
	get hash(){
		return (new URL(this.Path, location).hash);
	};
	set hash(val){
		if ( !val || val == ""){ // hashを消した場合・・
			this.#hashChangedByAppLayer = true;
			this.Path = new URL(this.Path, location).pathname;
		} else {
			if ( !val.startsWith("#")){
				console.warn("hash should be startd with #");
				return;
			} else if ( val == "#"){
				console.warn("At least one string of characters in addition to the # is required.");
				return;
			}
			this.#hashChangedByAppLayer = val;
			this.Path = new URL(this.Path, location).pathname + val;
		}
	};
}

export {SvgImageProps}