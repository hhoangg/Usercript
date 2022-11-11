import { Ztruyen } from "./src/models/ztruyen";

(function () {
  'use strict';
  const ebookModel = new Ztruyen();
  if(!ebookModel.run) throw new Error('"run" funtion not defined.')
  ebookModel.run();
})();
