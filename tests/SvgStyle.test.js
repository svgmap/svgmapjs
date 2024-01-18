import {SvgStyle} from "../libs/SvgStyle";

describe("unittest for SvgStyle",()=>{
    
    describe("target SvgStyle class",()=>{
        let style, result;
        beforeEach(() => {
            result = null;
            style = new SvgStyle();
        });
          
        it("Nodeのスタイルが一部欠落している場合のgetStyle関数の挙動",()=>{
            //create node
            let node = document.createElement("svg");
            node.setAttribute("visibleMaxZoom","100");
            node.setAttribute("visibleMinZoom","-100");
            node.setAttribute("transform","(100,0,0,-100,0,0)");
            const defalutStyleList = {"minZoom":"-1000","maxZoom":"1000","nonScalingOffset":"none","usedParent":"usedParent"}
            result = style.getStyle(node, defalutStyleList, true, null);
            expect(result).toEqual({"minZoom":"-1000","maxZoom":"1000","nonScalingOffset":"none","usedParent":"usedParent"});
        });
        it("デフォルトとNode共にスタイルが設定されている場合のgetStyle関数の挙動",()=>{
            //create node
            let node = document.createElement("svg");
            const defalutStyleList = {"minZoom":"-1000","maxZoom":"1000","nonScalingOffset":"none","usedParent":"usedParent"}
            result = style.getStyle(node, defalutStyleList, true, null);
            expect(result).toEqual({"minZoom":"-1000","maxZoom":"1000","nonScalingOffset":"none","usedParent":"usedParent"});
        });
        it("getNodeStyle enable", ()=>{
            //create node
            let node = document.createElement("svg");
            node.setAttribute("xlink:href","http://localhost");
            node.setAttribute("visibleMaxZoom","100");
            node.setAttribute("visibleMinZoom","-100");
            node.setAttribute("transform","(100,0,0,-100,0,0)");
            result = style.getNodeStyle(node, true); // どういうこと？
            expect(result).toEqual({"fill": null, "hasUpdate": true, "hyperLink": "http://localhost", "maxZoom": 1, "minZoom": -1, "target": null});
        });
        it("getNodeStyle disable", ()=>{
            //create node
            let node = document.createElement("svg");
            node.setAttribute("xlink:href","http://localhost");
            node.setAttribute("visibleMaxZoom","100");
            node.setAttribute("visibleMinZoom","-100");
            result = style.getNodeStyle(node, true);
            expect(result).toEqual({"fill": null, "hasUpdate": true, "hyperLink": "http://localhost", "maxZoom": 1, "minZoom": -1, "target": null});
        });

        it("setCanvasStyle", ()=>{
            // この関数を何用なのか不明
            //create node
            let node = document.createElement("svg");
            node.setAttribute("xlink:href","http://localhost");
            node.setAttribute("visibleMaxZoom","100");
            node.setAttribute("visibleMinZoom","-100");
            const style = {"stroke":"none","fill":"","stroke-width":"","stroke-dasharray":"","stroke-linejoin":"","stroke-linecap":"","opacity":"","fill-opacity":"", "vector-effect":""}
            result = SvgStyle.setCanvasStyle(style, node);
            expect(node).toEqual();
            expect(result).toEqual();
        });
    });
});
