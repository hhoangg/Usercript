// ==UserScript==
// @name            User script Ebook downloader
// @namespace       http://tampermonkey.net/
// @version         1.0.0
// @description     Download ebook from many sources (EPUB format).
// @author          hhoangg
// @match           http://*/*
// @grant           GM_xmlhttpRequest
// @source          https://github.com/hhoangg/Userscript
// @license         MIT
// @icon            https://i.imgur.com/73RzbvF.png
// @homepage        https://openuserjs.org/scripts/va4ok
// @include         https://truyenyy.vip/truyen/*/
// @include         https://ztruyen.vn/truyen/*
// @run-at          document-end
// @inject-into     auto
// @description:vi  Tải sách từ nhiều nguồn định dạng EPUB.
// @require         https://unpkg.com/jszip@3.1.5/dist/jszip.min.js
// @require         https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js
// @require         https://unpkg.com/ejs@3.1.8/ejs.min.js
// @require         https://unpkg.com/jepub@2.1.4/dist/jepub.min.js
// @require         https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js?v=a834d46
// @require         https://raw.githubusercontent.com/adamhalasz/uniqid/master/UMD/uniqid.min.js
// @require         https://unpkg.com/animejs@3.2.1/lib/anime.min.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js
// @require         https://unpkg.com/dexie@3.2.2/dist/dexie.min.js
// ==/UserScript==

// src/utils.js
const selectByXpath = (xpath) => {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};

function createElementFromHTML(htmlString) {
  var template = document.createElement('template');
  htmlString = htmlString.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = htmlString;
  return template.content;
}

// src/models/base.js
class BaseModel {
  constructor(payload = {}) {
    Object.keys(payload).forEach((key) => {
      this[key] = payload[key];
    });
  }
  // default props btn download
  btnDownload = {
    position: 'afterbegin',
    id: uniqid('btn-download-'),
    text: 'Download',
    actionTarget: '.azh-btn-download',
    className: {
      progress: '.azh-download-progress',
      text: '.azh-download-text',
      completed: '.azh-download-completed',
    },
  };
  // check list method overwrite
  _METHOD_OVERWRITE = ['init', 'getNextChapUrl', 'getContentOnChap', 'getTitleOnChap', 'getFirstChapUrl'];

  jepub = new jEpub();
  // state
  delayPerChap = 100;
  pageName = document.title;
  pathname = location.pathname;
  chapTitle = '';
  endDownload = false;
  ebookTitle = '';
  ebookAuthor = '';
  ebookCover = '';
  ebookDesc = '';
  ebookType = [];
  host = location.host;
  referrer = location.protocol + '//' + this.host + this.pathname;
  ebookFilename = this.pathname.slice(8, -1) + '.epub';
  credits = '';
  endChapter = 0;
  $btnDownload;
  $btnText;
  $btnProgress;

  getAreaBtn() {
    return document.body;
  }
  makeBtnDownload() {
    const button = document.createElement('button');
    button.innerText = this.btnDownload.text;
    button.id = this.btnDownload.id;
    return button;
  }
  addBtnToArea() {
    const area = this.getAreaBtn();
    const btn = this.makeBtnDownload();
    btn.id = uniqid('azh-download-button-');
    area.insertAdjacentHTML(this.btnDownload.position, btn.outerHTML);
    return document.querySelector(`#${btn.id} ${this.btnDownload.actionTarget || ''}`);
  }
  _addChap(chapterData = { content: '', title: '' }) {
    this.jepub.add(chapterData.title, chapterData.content);
  }
  async _getChap(url) {
    if (url) {
      return new Promise((rs, onerror) => {
        GM.xmlHttpRequest({
          method: 'GET',
          url,
          onload: (res) => {
            return rs(res.response.match(/<main.*?>([\s\S]*)<\/main>/)[1]);
          },
          onerror,
        });
      });
    }

    return null;
  }
  _updateBtnProgress(percent) {
    if (!this.$btnProgress) this.$btnProgress = this.$btnDownload.querySelector(this.btnDownload.className.progress);
    this.$btnProgress.style.width = `${percent}%`;
  }
  _updateBtnText(str) {
    if (!this.$btnText) this.$btnText = this.$btnDownload.querySelector(this.btnDownload.className.text);
    this.$btnText.textContent = str;
  }
  // _reDownload(url){
  //   window.open(url)
  // }
  async _genEbook() {
    await this.jepub
      .generate('blob', (metadata) => {
        this._updateBtnText('compressing ' + metadata.percent.toFixed(2) + '%');
      })
      .then((epubZipContent) => {
        saveAs(epubZipContent, this.ebookFilename);
      })
      .catch(function (err) {
        console.error(err);
      });
  }
  _onDownload = async () => {
    let currentChap;
    for (let chapterIndex = 1; chapterIndex <= this.endChapter; chapterIndex++) {
      let chapUrl = this.getFirstChapUrl();
      if (chapterIndex !== 1 && currentChap) {
        chapUrl = this.getNextChapUrl(currentChap);
      }
      let dataChap = await this._getChap(chapUrl);
      currentChap = createElementFromHTML(dataChap);
      const chapContent = this.getContentOnChap(currentChap);
      const chapTitle = this.getTitleOnChap(currentChap);
      this._addChap({
        content: chapContent,
        title: chapTitle,
      });
      const percent = (chapterIndex / this.endChapter) * 100;
      this._updateBtnText(`${percent.toFixed(2)}%`);
      this._updateBtnProgress(percent);
      await new Promise((rs) => setTimeout(rs, this.delayPerChap));
    }
    this._updateBtnText('Completed');
    this.$btnDownload.classList.add(this.btnDownload.className.completed.replace('.', ''));
    this.$btnDownload.removeEventListener('click', this._onDownload);
    await this._genEbook();
  };

  // internal function
  raiseMissingMethod(methodName = '') {
    throw new Error(`Method ${methodName} not found, plz make this method on your model.`);
  }

  _importCover() {
    if (!this.ebookCover) return;
    return new Promise((rs, rj) => {
      GM.xmlHttpRequest({
        method: 'GET',
        url: this.ebookCover,
        responseType: 'arraybuffer',
        onload: (response) => {
          try {
            this.jepub.cover(response.response);
            return rs(this.jepub);
          } catch (err) {
            return rj(err);
          }
        },
        onerror: rj,
      });
    });
  }
  // main function
  async run() {
    // raise and stop function when missing method
    for (const method of this._METHOD_OVERWRITE) {
      if (!this[method]) {
        throw this.raiseMissingMethod(method);
      }
    }
    this.init();

    this.jepub
      .init({
        title: this.ebookTitle,
        author: this.ebookAuthor,
        publisher: this.host,
        description: this.ebookDesc,
        tags: this.ebookType,
      })
      .uuid(this.referrer)
      .notes(this.credits);
    await this._importCover();

    this.$btnDownload = this.addBtnToArea();
    this.$btnDownload.addEventListener('click', this._onDownload);
  }
}

// src/components/download-button.js
const downloadButtonHTML = `
<div class="azh-btn-download">
  <div class="azh-download-progress"></div>
  <div class="azh-download-text">Download</div>
</div>`;

// src/modules/download-button.js
function downloadButton() {
  const button = document.createElement('div');
  button.classList.add('azh-theme-dark');
  button.insertAdjacentHTML('afterbegin', downloadButtonHTML);
  return button;
}

// src/models/ztruyen.js
class Ztruyen extends BaseModel {
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

// main.js
(function () {
  'use strict';
  const ebookModel = new Ztruyen();
  if(!ebookModel.run) throw new Error('"run" funtion not defined.')
  ebookModel.run();
})();

// CSS injection
(function(){
  const $style = document.createElement('style');

  $style.innerHTML = `/* src/styles/download-button.css */
.azh-theme-dark {
  --primary: #d8baf0;
  --success: #baf0c6;
  --bg: #2c3436;
  --bg-progress: #71777d;
}
/* Button */
.azh-btn-download {
  background: var(--bg);
  width: 200px;
  position: relative;
  color: var(--primary);
  cursor: pointer;
  text-align: center;
  text-transform: capitalize;
  border-radius: 7px;
  font-weight: 600;
  overflow: hidden;
  border: none;
  text-decoration: none;
}
.azh-btn-download[disabled] {
  cursor: not-allowed;
}
.azh-download-text {
  padding: 15px;
}
.azh-download-progress {
  height: 100%;
  background-color: var(--bg-progress);
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0.4;
}
/* Button Complete */
.azh-download-completed {
  color: var(--success);
  /* border-color: var(--success); */
  /* cursor: not-allowed; */
}

/* src/styles/ztruyen-download-button.css */
.azh-theme-dark {
  --primary: #d8baf0;
  --success: #baf0c6;
  --bg: #2c3436;
  --bg-progress: #71777d;
  display: inline-flex;
}
/* Button */
.azh-btn-download {
  color: #ffc008;
  border-radius: 20px;
  padding: 8.5px 50px;
  margin-left: 0.5rem;
  width: auto;
}

.azh-btn-download:hover{
  background-color: #71777d;
}

.azh-btn-download[disabled] {
  cursor: not-allowed;
}
.azh-download-text {
  padding: unset;
}
.azh-download-progress {
  background: linear-gradient(90deg, rgba(44, 52, 54, 1) 0%, rgba(9, 121, 70, 1) 49%, rgba(0, 255, 151, 1) 100%);
}
/* Button Complete */
.azh-download-completed {
  color: var(--success);
}
`;

  document.body.appendChild($style);
})();