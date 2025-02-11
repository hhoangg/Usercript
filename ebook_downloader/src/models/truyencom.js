import { BaseModel } from './base';
import { downloadButton } from '../modules/download-button';

import '../styles/truyenhdx-download-button.css';

export class TruyenCom extends BaseModel {
  makeBtnDownload = downloadButton;

  init() {
    this.btnDownload.position = 'afterbegin';
    this.credits =
      '<p>Truyện được tải từ <a href="' +
      this.referrer +
      '">TruyenCom</a></p><p>Userscript được viết bởi: <a href="https://azhoang.github.io/">azHoang</a></p>';

    this.ebookTitle = this.pageName.split('-')[0].trim();
    this.ebookCover = document.querySelector('img[itemprop="image"]').getAttribute('src');
    this.ebookDesc = document.querySelector('div[itemprop="description"]').textContent.trim();
    this.ebookType = [...document.querySelectorAll('a[itemprop="genre"]')]
      .map((genre) => genre.textContent.trim())
      .join(', ');
    this.ebookAuthor = document.querySelector('a[itemprop="author"]').textContent.trim();
    this.endChapter = Number(
      document
        .querySelector('.l-chapters li')
        .textContent.trim()
        .match(/Chương( ?\d+ ?)/gm)[0]
        .match(/\d+/)[0]
    );
    this.ebookId = this.pathname.split('/').slice(-2)[0];
    // this.ebookStatus = document.querySelector('#thong_tin .text-success').textContent.trim();
  }

  getAreaBtn() {
    return document.querySelector('.info');
    // return document.querySelector('#truyen_button');
  }

  getNextChapUrl(chap) {
    const next = chap.querySelector('#next_chap');
    if (next) {
      return next.getAttribute('href');
    }
    return null;
  }

  getContentOnChap(chap) {
    return chap.querySelector('#chapter-c').innerHTML.trim();
  }

  getChapterId(url) {
    console.log(url);
    return url.split('/').slice(-1)[0];
  }

  getTitleOnChap(chap) {
    return chap.querySelector('.chapter-title').textContent.trim();
  }

  getFirstChapUrl() {
    const elementFirstChap = document.querySelectorAll('ul.list-chapter')[0].firstElementChild.querySelector('a');
    const indexFirstChap = Number(
      elementFirstChap.textContent
        .trim()
        .match(/Chương( ?\d+ ?)/gm)[0]
        .match(/\d+/)[0]
    );
    if (indexFirstChap === 0) {
      this.endChapter += 1;
    }
    console.log(this.endChapter);
    return elementFirstChap.getAttribute('href');
  }
}
