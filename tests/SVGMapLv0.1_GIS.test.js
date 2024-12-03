import {SvgMapGIS} from "../SVGMapLv0.1_GIS_r4_module";
import {mock_svgmapObj, mock_mapViewerProps} from "../resources/mockParamerters";
import {expect, jest} from "@jest/globals";

import * as io from 'jsts/org/locationtech/jts/io.js';
import * as geom from 'jsts/org/locationtech/jts/geom.js';
import * as precision from 'jsts/org/locationtech/jts/precision.js';
import * as simplify from 'jsts/org/locationtech/jts/simplify.js';
import * as fs from "node:fs/promises";

describe("unittest for SvgMapGIS",()=>{
    describe("target KML",()=>{
        let svgmapgis, mock_jsts;
        let kml
        beforeAll(()=>{
            let svgDocument = document.createElement("use");
            //jest.spyOn(svgImage, createElement).mockImplementation(() => svgDocument);

            mock_jsts = {
                io: io,
                geom: geom,
                simplify: simplify,
                precision:precision,
            }
            svgmapgis = new SvgMapGIS(mock_svgmapObj,mock_jsts);
        });

        it("drawKmlの動作確認(Points)",async ()=>{
            const str_kml = await fs.readFile("./resources/kml/point.kml", "UTF-8");
            let parser = new DOMParser();
            kml = parser.parseFromString(str_kml, 'text/xml');
            let targetId = "i5";
            svgmapgis.drawKml(kml, targetId);
        });

        it("drawKmlの動作確認(documents)",async ()=>{
            const str_kml = await fs.readFile("./resources/kml/document.kml", "UTF-8");
            let parser = new DOMParser();
            kml = parser.parseFromString(str_kml, 'text/xml');
            let targetId = "i5";
            svgmapgis.drawKml(kml, targetId);
        });
        
        it("drawKmlの動作確認(folders)",async ()=>{
            const str_kml = await fs.readFile("./resources/kml/folder.kml", "UTF-8");
            let parser = new DOMParser();
            kml = parser.parseFromString(str_kml, 'text/xml');
            let targetId = "i5";
            svgmapgis.drawKml(kml, targetId);
        });

        it("drawKmlの動作確認(Properties)",async ()=>{
            const str_kml = await fs.readFile("./resources/kml/properties.kml", "UTF-8");
            let parser = new DOMParser();
            kml = parser.parseFromString(str_kml, 'text/xml');
            let targetId = "i5";
            let result = svgmapgis.drawKml(kml, targetId);
            expect(result).toBe(undefined);
        });

        it("drawKmlの動作確認(lineString)",async ()=>{
            const str_kml = await fs.readFile("./resources/kml/linestring.kml", "UTF-8");
            let parser = new DOMParser();
            kml = parser.parseFromString(str_kml, 'text/xml');
            let targetId = "i5";
            let result = svgmapgis.drawKml(kml, targetId);
            expect(result).toBe(undefined);
        });
        
        it("drawKmlの動作確認(polygon)",async ()=>{
            const str_kml = await fs.readFile("./resources/kml/polygon.kml", "UTF-8");
            let parser = new DOMParser();
            kml = parser.parseFromString(str_kml, 'text/xml');
            let targetId = "i5";
            let result = svgmapgis.drawKml(kml, targetId);
            expect(result).toBe(undefined);
        });
        
        it("drawKmlの動作確認(style)",async ()=>{
            const str_kml = await fs.readFile("./resources/kml/style.kml", "UTF-8");
            let parser = new DOMParser();
            kml = parser.parseFromString(str_kml, 'text/xml');
            let targetId = "i5";
            let result = svgmapgis.drawKml(kml, targetId);
            expect(result).toBe(undefined);
        });
    });
});
