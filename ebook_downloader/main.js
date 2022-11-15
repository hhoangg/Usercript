import { Ztruyen } from './src/models/ztruyen';
import { HdxTruyen } from './src/models/truyenhdx';

(function () {
  'use strict';
  const hostMappingEbook = {
    'ztruyen.vn': Ztruyen,
    'truyenhdx.com': HdxTruyen,
  };
  if (!hostMappingEbook[window.location.host]) {
    alert('We not support this Ebook site. plz contact https://azhoang.github.io/');
    return window.open('https://azhoang.github.io/');
  }
  const ebookModel = new hostMappingEbook[window.location.host]();
  if (!ebookModel.run) throw new Error('"run" funtion not defined.');
  ebookModel.run();
})();
