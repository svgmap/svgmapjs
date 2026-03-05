SVGMap is a web mapping framework based on SVG. It has loosely coupled and decentralized web mapping capabilities that conventional mapping frameworks do not have, as well as an advanced tiling mechanism that goes beyond ordinary vector tiles, making it possible to implement large-scale WebGIS.

The standardization activities are being undertaken at W3C.

* [HomePage](https://svgmap.org/)

* [API Docs](https://www.svgmap.org/wiki/index.php?title=%E8%A7%A3%E8%AA%AC%E6%9B%B8)

* [demo](https://svgmap.org/devinfo/devkddi/lvl0.1/demos/demo0.html)
* [demo(github pages)](https://svgmap.github.io/svgMapDemo/) [(source)](https://github.com/svgmap/svgMapDemo)

# Modular SVGMap.js

This repository contains a modularized SVGMap.js, which replaces SVGMapLv0.1.

Development has started in May 2022 as SVGMapLv0.1_r18module.js, and this version became mainstream in August 2024.


## to use module

```
<script type="text/javascript" src="https://unpkg.com/jsts@1.6.1/dist/jsts.min.js"></script>
<script type="module">
  import { svgMap } from 'https://cdn.jsdelivr.net/gh/svgmap/svgmapjs@latest/SVGMapLv0.1_r18module.js';
  window.svgMap=svgMap
</script></nowiki>
```

[detailed information](https://www.svgmap.org/wiki/index.php?title=%E8%A7%A3%E8%AA%AC%E6%9B%B8#rev18_.28ECMA_Script_Module.E7.89.88.29.E3.81.AE.E4.BE.8B)


## development

### branch
Contributions (pull request) will only be accepted for the `dev*` branch.

### code formatter
```prettier --use-tabs "$F"```

### testing

#### install nodejs & npm

```sudo apt install npm```

```sudo npm install -g n```

#### switch nodejs (LTS: Long Term Support)

```sudo n lts```

#### install node_modules

```npm install```

#### install playwright

WSL2(Ubuntu24.04)で動作確認済み
※Ubuntu22.04ではSafari(WebKit)がインストールできないので注意

```npx playwright install```
```sudo npx playwright install-deps```

#### optional) install playwright for VSCode

こちらはオプション(必須ではない)

VSCode -> Extensions -> Playwright Test for VSCode

#### excute unittest

```npm test```

#### code format (TBD)
```prettier --use-tabs``` 

#### excute E2E test

```npm run e2e```

## License

This project is now licensed under the MPL-2.0 License.

**License Update:**

On 2025-04-07, the license was changed from GPLv3 to MPLv2 by contributor agreement, to allow for broader use, including commercial applications. See [LICENSE](LICENSE) or [MPL 2.0](https://www.mozilla.org/en-US/MPL/2.0/) for details.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/svgmap/svgmapjs)
