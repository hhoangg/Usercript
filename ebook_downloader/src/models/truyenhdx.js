import { BaseModel } from './base';
import { downloadButton } from '../modules/download-button';

import '../styles/truyenhdx-download-button.css';

export class HdxTruyen extends BaseModel {
  makeBtnDownload = downloadButton;

  init() {
    this.btnDownload.position = 'afterbegin';
    this.credits =
      '<p>Truyện được tải từ <a href="' +
      this.referrer +
      '">TruyenHdx</a></p><p>Userscript được viết bởi: <a href="https://azhoang.github.io/">azHoang</a></p>';

    this.ebookTitle = this.pageName.split('-')[0].trim();
    this.ebookCover = document.querySelector('.book3dcenter > .book3d > img').dataset.src;
    this.ebookDesc = document.querySelector('#gioi_thieu .gioi_thieu').textContent.trim();
    this.ebookType = this.pageName.split('-').slice(-1);
    this.ebookAuthor = this.pageName.split('-')[1].trim();
    this.endChapter = Number(
      document
        .querySelector('#newchap .listchap li')
        .textContent.trim()
        .match(/Chương( ?\d+ ?)/gm)[0]
        .match(/\d+/)[0]
    );
    this.ebookId = this.pathname.split('/').slice(-2)[0];
    // this.ebookStatus = document.querySelector('#thong_tin .text-success').textContent.trim();
  }

  getAreaBtn() {
    return document.querySelector('.book3dcenter');
    // return document.querySelector('#truyen_button');
  }

  getNextChapUrl(chap) {
    const next = [...chap.querySelectorAll('.next-chap')].slice(-1)[0].querySelector('a');
    if (next) {
      return next.getAttribute('href');
    }
    return null;
  }

  getContentOnChap(chap) {
    return chap.querySelector('.container.cpt.truyen .reading').innerHTML.trim();
  }

  getChapterId(url) {
    console.log(url);
    return url.split('/').slice(-2)[0];
  }

  getTitleOnChap(chap) {
    return chap.querySelector('.container.cpt.truyen .text-center:nth-child(2)').textContent.trim();
  }

  getFirstChapUrl() {
    const elementFirstChap = document.querySelector('#dsc .listchap li a');
    const indexFirstChap = Number(elementFirstChap.textContent
      .trim()
      .match(/Chương( ?\d+ ?)/gm)[0]
      .match(/\d+/)[0]);
    if(indexFirstChap === 0){
      this.endChapter += 1;
    }
    console.log(this.endChapter);
    return elementFirstChap.getAttribute('href');
  }
}
