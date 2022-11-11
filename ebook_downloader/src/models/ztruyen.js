import { BaseModel } from './base';
import { downloadButton, buttonLoaded } from '../modules/download-button';

import '../styles/ztruyen-download-button.css';
import { selectByXpath } from '../utils';

export class Ztruyen extends BaseModel {
  makeBtnDownload = downloadButton;

  init() {
    const ebookInfo = document.querySelector('.story-box-top');
    this.btnDownload.position = 'beforeend';
    this.credits =
      '<p>Truyện được tải từ <a href="' +
      this.referrer +
      '">ZTruyen</a></p><p>Userscript được viết bởi: <a href="https://azhoang.github.io/">azHoang</a></p>';

    this.ebookTitle = this.pageName.split('-')[0].trim();
    this.ebookCover = ebookInfo.querySelector('.container > .row > img').getAttribute('src');
    // remove site ads and get content description
    document.querySelector('.detail-story .content-story > p').remove();
    this.ebookDesc = document.querySelector('.detail-story .content-story').textContent.trim();
    this.ebookType = [...this.selectValueByAttr('Thể loại').querySelectorAll('a')].map((item) =>
      item.textContent.trim(),
    );
    this.ebookAuthor = this.selectValueByAttr('Tác giả').textContent.trim();
    this.endChapter = Number(this.selectValueByAttr('Số chương').textContent.trim().replace(/\W/g, ''));
  }

  selectValueByAttr(attrName) {
    return selectByXpath(`//body/main//*/table/tbody/tr/td[text()='${attrName}']/../th`);
  }

  getAreaBtn() {
    return document.querySelector('body > main > div > div > div > div > div.text-gray-1.mt-3');
  }

  getNextChapUrl(chap) {
    const [, next] = chap.querySelectorAll('.button-chapter a');
    if (next) {
      return `${location.href}/${next.getAttribute('href')}`;
    }
    return null;
  }

  getContentOnChap(chap) {
    return [...chap.querySelectorAll('.content-block')].map((item) => item.outerHTML).join('\n');
  }

  getTitleOnChap(chap) {
    return chap.querySelector('.title-chapter').textContent.trim();
  }

  getFirstChapUrl() {
    return selectByXpath("//body/main//button[text()='Đọc truyện']/../../a").getAttribute('href');
  }
}
