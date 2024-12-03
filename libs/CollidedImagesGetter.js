class CollidedImagesGetter {
	constructor(visiblePOIs) {
		this.#visiblePOIs = visiblePOIs;
	}

	#visiblePOIs;

	isCollided1(POIelemId) {
		// こちらはもっと以前から使われていないが、アルゴリズム的に有用かもしれないので残置(たぶんGISに移動するのが良い) 2018.2.1
		// RDS法を用いて重なっているものすべてを取り出す
		var collidedPOIs = this.#getCollidedImgs(this.#visiblePOIs);
		var cGroup;
		ccheckLoop: for (var i = 0; i < collidedPOIs.length; i++) {
			var grp = collidedPOIs[i];
			for (var j = 0; j < grp.length; j++) {
				if (grp[j].id == POIelemId) {
					cGroup = grp;
					break ccheckLoop;
				}
			}
		}
		if (cGroup.length == 1) {
			return false;
		} else {
			return cGroup;
		}
	}

	#getCollidedImgs(imgs) {
		//RecursiveDimensionalClustering法によって(BBOXが)衝突している(重なっている)imgをリストアップする 2014.11.13
		var boundaries = new Array();
		for (var i in imgs) {
			boundaries.push({ id: i, position: imgs[i].x, open: true, obj: imgs[i] });
			boundaries.push({
				id: i,
				position: imgs[i].x + imgs[i].width,
				open: false,
			});
		}

		return this.#dimensionalClustering(boundaries, 0);
	}

	isCollided(POIelemId) {
		// この機能はtestClickのcheckTickerへの吸収使われなくなったが、有用かもしれないので残置 2018.2.1
		// とりあえず選ばれたアイコンにだけ重なっているものを取り出す
		try {
			// 2016.6.15 isCollided関数がからの状態のoverwrappedPOIsを返すことがある？
			var targetPOI = this.#visiblePOIs[POIelemId];
			var overwrappedPOIs = new Array();
			for (var i in this.#visiblePOIs) {
				if (i != POIelemId) {
					if (
						targetPOI.x + targetPOI.width < this.#visiblePOIs[i].x ||
						targetPOI.x > this.#visiblePOIs[i].x + this.#visiblePOIs[i].width ||
						targetPOI.y + targetPOI.height < this.#visiblePOIs[i].y ||
						targetPOI.y > this.#visiblePOIs[i].y + this.#visiblePOIs[i].height
					) {
						// none
					} else {
						this.#visiblePOIs[i].id = i;
						overwrappedPOIs.push(this.#visiblePOIs[i]);
					}
				}
			}
			if (overwrappedPOIs.length == 0) {
				return false;
			} else {
				targetPOI.id = POIelemId;
				overwrappedPOIs.push(targetPOI);
				return overwrappedPOIs;
			}
		} catch (e) {
			console.log("ERROR", e);
			return false;
		}
	}

	#dimensionalClustering(boundaries, lvl) {
		// RDC法の本体 2014.11.13
		// based on http://lab.polygonal.de/?p=120
		++lvl;
		boundaries.sort(function (a, b) {
			var x = Number(a.position);
			var y = Number(b.position);
			if (x > y) return 1;
			if (x < y) return -1;
			return 0;
		});

		var group = new Array();
		var groupCollection = new Array();
		var count = 0;

		for (var i = 0; i < boundaries.length; i++) {
			var bound = boundaries[i];

			if (bound.open) {
				count++;
				group.push(bound);
			} else {
				count--;
				if (count == 0) {
					groupCollection.push(group);
					group = new Array();
				}
			}
		}

		if (lvl < 4) {
			for (var j = 0; j < groupCollection.length; j++) {
				group = groupCollection[j];
				if (group.length > 1) {
					var boundaries = new Array();
					for (var i = 0; i < group.length; i++) {
						if (lvl % 2 == 0) {
							boundaries.push({
								id: group[i].id,
								position: group[i].obj.x,
								open: true,
								obj: group[i].obj,
							});
							boundaries.push({
								id: group[i].id,
								position: group[i].obj.x + group[i].obj.width,
								open: false,
							});
						} else {
							boundaries.push({
								id: group[i].id,
								position: group[i].obj.y,
								open: true,
								obj: group[i].obj,
							});
							boundaries.push({
								id: group[i].id,
								position: group[i].obj.y + group[i].obj.height,
								open: false,
							});
						}
					}
					subGC = this.#dimensionalClustering(boundaries, lvl);
					if (subGC.length > 1) {
						groupCollection[j] = subGC[0];
						for (var i = 1; i < subGC.length; i++) {
							groupCollection.push(subGC[i]);
						}
					}
				}
			}
		}
		return groupCollection;
	}
}

export { CollidedImagesGetter };
