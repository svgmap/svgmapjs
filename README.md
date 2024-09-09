# svgMapLv0.2
Modular SVGMap.js

This repository will contain the modularized SVGMap.js, which is intended to replace SVGMapLv0.1 in the future.

Development has started since 2022/05 as SVGMapLv0.1_r18module.js. A practical release has not been reached so far.


## to use module

```
<script type="text/javascript" src="https://unpkg.com/jsts@1.6.1/dist/jsts.min.js"></script>
<script type="module">
  import { svgMap } from 'https://cdn.jsdelivr.net/gh/svgmap/svgmapjs@latest/SVGMapLv0.1_r18module.js';
  window.svgMap=svgMap
</script>
```

[detailed information](https://www.svgmap.org/wiki/index.php?title=%E8%A7%A3%E8%AA%AC%E6%9B%B8#rev18_.28ECMA_Script_Module.E7.89.88.29.E3.81.AE.E4.BE.8B)


## development
### testing

#### install nodejs & npm

```sudo apt install npm```

```sudo npm install -g n```

#### switch nodejs (LTS: Long Term Support)

```sudo n lts```

#### excute unittest

```npm test```
