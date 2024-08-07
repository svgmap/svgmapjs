// Description:
// SVGMap Custom Layers Manager Client Module for >rev18esm of SVGMap Lv0.1 framework
// Programmed by Satoru Takagi
//  Programmed by Satoru Takagi
//  
//  Copyright (C) 2021- by Satoru Takagi @ KDDI CORPORATION
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
// 2022/07/19- SVGMapウィンド側と、カスタムレイヤマネージャアプリ側のライブラリを切り分け

import { InterWindowMessaging } from './InterWindowMessaging.js';

class SvgMapCustomLayersManagerClient{
	
	#iwmsg;
	
	constructor(){
		// 受付コマンドなし（送信のみ）のウィンド間メッセージング設定
		this.#iwmsg = new InterWindowMessaging({}, window.opener, true);
	}
	
	async getDetailedLayersPropertySet(){
		return (await this.#iwmsg.callRemoteFunc(this.getDetailedLayersPropertySet.name,[]));
	}
	
	async getDetailedOriginalLayersPropertySet(){
		return (await this.#iwmsg.callRemoteFunc(this.getDetailedOriginalLayersPropertySet.name,[]));
	}
	
	async setCustomLayerSettingIndex(key){
		return (await this.#iwmsg.callRemoteFunc(this.setCustomLayerSettingIndex.name,[key]));
	}
	
	async applyCustomLayers(customLayersObject, baseLayersPropertySet){
		return (await this.#iwmsg.callRemoteFunc(this.applyCustomLayers.name,[customLayersObject, baseLayersPropertySet]));
	}
	
	async getRootContainerXML(){
		return (await this.#iwmsg.callRemoteFunc(this.getRootContainerXML.name,[]));
	}
	
	async registCustomLayer(customLayerObject, applyImmediately, customLayerMetadata){
		return (await this.#iwmsg.callRemoteFunc(this.registCustomLayer.name,[customLayerObject, applyImmediately, customLayerMetadata]));
	}
	
	async loadCustomLayerSettings(){
		return (await this.#iwmsg.callRemoteFunc(this.loadCustomLayerSettings.name,[]));
	}
	
	async storeCustomLayerSettings(settings){
		return (await this.#iwmsg.callRemoteFunc(this.storeCustomLayerSettings.name,[settings]));
	}
	
	async deleteAllCustomLayerSettings(){
		return (await this.#iwmsg.callRemoteFunc(this.deleteAllCustomLayerSettings.name,[]));
	}
	
	async deleteAllCustomViewBoxSettings(){
		return (await this.#iwmsg.callRemoteFunc(this.deleteAllCustomViewBoxSettings.name,[]));
	}
	
	async buildCustomGeoViewboxSettingObject(key, title, geoViewBoxX, geoViewBoxY, geoViewBoxWidth, geoViewBoxHeight){
		return (await this.#iwmsg.callRemoteFunc(this.buildCustomGeoViewboxSettingObject.name,[key, title, geoViewBoxX, geoViewBoxY, geoViewBoxWidth, geoViewBoxHeight]));
	}
	
	async loadCustomGeoViewboxes(){
		return (await this.#iwmsg.callRemoteFunc(this.loadCustomGeoViewboxes.name,[]));
	}
	
	async storeCustomGeoViewboxes(customViewBoxes){
		return (await this.#iwmsg.callRemoteFunc(this.storeCustomGeoViewboxes.name,[customViewBoxes]));
	}
	
	async applyCustomLayersSettingsToCurrentMapView(lpEdit){
		return (await this.#iwmsg.callRemoteFunc(this.applyCustomLayersSettingsToCurrentMapView.name,[lpEdit]));
	}
	
	async deleteCustomLayerSetting(customSettingKey){
		return (await this.#iwmsg.callRemoteFunc(this.deleteCustomLayerSetting.name,[customSettingKey]));
	}
	
	async buildCustomLayersSetting( editedLayersProperty, originalLayersProperty){
		// 内部処理で実行できるけど面倒なのでライブラリにパスする・・
		return (await this.#iwmsg.callRemoteFunc(this.buildCustomLayersSetting.name,[editedLayersProperty, originalLayersProperty]));
	}
	
	async mergeSettings(lset){
		// 内部処理で実行できるけど面倒なのでライブラリにパスする・・
		return (await this.#iwmsg.callRemoteFunc(this.mergeSettings.name,[lset]));
	}
	
	async getGeoViewBox(){
		return (await this.#iwmsg.callRemoteFunc(this.getGeoViewBox.name,[]));
	}
	
	async setGeoViewPort(lat, lng, latSpan , lngSpan , norefresh){
		return (await this.#iwmsg.callRemoteFunc(this.setGeoViewPort.name,[lat, lng, latSpan , lngSpan , norefresh]));
	}
	
	async getResume(){
		return (await this.#iwmsg.callRemoteFunc(this.getResume.name,[]));
	}
	
	async setResume(stat){
		return (await this.#iwmsg.callRemoteFunc(this.setResume.name,[stat]));
	}
	
	async refreshScreen(){
		return (await this.#iwmsg.callRemoteFunc(this.refreshScreen.name,[]));
	}
	
}

export{SvgMapCustomLayersManagerClient}