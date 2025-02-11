// ==UserScript==
// @name            User script Ebook downloader
// @namespace       http://tampermonkey.net/
// @version         2.5.0
// @description     Download ebook from many sources (EPUB format).
// @author          hhoangg
// @match           https://truyenyy.vip/truyen/*/
// @match           https://ztruyen.vn/truyen/*
// @match           https://truyenhdx.com/truyen/*/
// @match           https://truyencom.com/*
// @match           https://metruyenchu.vn/*
// @grant           GM_xmlhttpRequest
// @source          https://github.com/hhoangg/Userscript
// @license         MIT
// @icon            https://i.imgur.com/73RzbvF.png
// @homepage        https://openuserjs.org/scripts/va4ok
// @include         https://truyenyy.vip/truyen/*/
// @include         https://ztruyen.vn/truyen/*
// @include         https://truyenhdx.com/truyen/*/
// @include         https://truyencom.com/*
// @include         https://metruyenchu.vn/*
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
// @require         https://unpkg.com/axios@1.1.3/dist/axios.min.js
// @require         https://unpkg.com/localforage@1.10.0/dist/localforage.min.js
// ==/UserScript==

const selectByXpath = (xpath) => {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};

function createElementFromHTML(htmlString) {
  var template = document.createElement('template');
  htmlString = htmlString.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = htmlString;
  return template.content;
}

const storageKey = {
  coverBlob: 'coverBlob'
}

class azhTable {
  constructor(
    args = {
      db: null,
      name: '',
      columns: [],
    }
  ) {
    if (!args.db) throw new Error('db not found in table');
    if (!args.name) throw new Error('Table missing name');
    if (!args.columns || !args.columns.length) throw new Error('Table column not defined.');
    this.db = args.db;
    this.name = args.name;
    args.columns.forEach((column) => {
      this.columns = {
        ...this.columns,
        [column.title]: {
          defaultValue: column.defaultValue,
        },
      };
    });
    this.tableIndex = `${this.db.getDbName()}__${this.name}`;
  }
  db = null;
  name = '';
  columns = {};
  dataValue = null;
  tableIndex = '';

  async _getAllKeyByName(name) {
    const keys = await localforage.keys();
    return keys.filter((key) => _.startsWith(key, name));
  }

  async getAllKeysTable() {
    return this._getAllKeyByName(`${this.tableIndex}[`);
  }

  async createOrUpdate(args) {
    if (!args.id) args.id = uniqid();
    const dataStorage = {};
    Object.keys(args).forEach((key) => {
      if (this.columns[key]) {
        dataStorage[key] = args[key];
      }
    });
    // set default value
    Object.keys(this.columns).forEach((key) => {
      if (dataStorage[key] === undefined && this.columns[key].defaultValue !== undefined) {
        dataStorage[key] = this.columns[key].defaultValue;
      }
    });
    const isExist = await localforage.getItem(`${this.tableIndex}[${args.id}]`);
    if (isExist) {
      return this.update(
        {
          where: {
            id: args.id,
          },
        },
        dataStorage,
        isExist
      );
    }
    await localforage.setItem(`${this.tableIndex}[${args.id}]`, dataStorage);
    return dataStorage;
  }

  async update(args, value, data) {
    let currenData = data;
    if (!data || !data.id) {
      const findData = await this.findOne({
        where: args.where,
      });
      currenData = {
        ...findData,
        ...currenData,
      };
    }
    if (!currenData) return currenData;
    await localforage.setItem(`${this.tableIndex}[${currenData.id}]`, {
      ...currenData,
      ...value,
    });
    return localforage.getItem(`${this.tableIndex}[${currenData.id}]`);
  }

  async bulkCreateOrUpdate(args) {
    return Promise.all(args.map(this.createOrUpdate));
  }

  async findOne(
    args = {
      where: {},
    }
  ) {
    this.dataValue = null;
    const allKeyOnThisTable = await this.getAllKeysTable();
    if (!allKeyOnThisTable.length) return this.dataValue;
    switch (true) {
      case !args || !args.where || !Object.keys(args.where).length:
        if (allKeyOnThisTable[0]) {
          this.dataValue = await localforage.getItem(allKeyOnThisTable[0]);
        }
        break;
      case !!args.where && !!Object.keys(args.where).length:
        if (typeof args.where.id !== undefined && args.where.id !== null) {
          this.dataValue = await localforage.getItem(`${this.tableIndex}[${args.where.id}]`);
        } else {
          const allData = await Promise.all(allKeyOnThisTable.map(localforage.getItem));
          this.dataValue = allData.find((item) => this._compareObject(item, args.where));
        }
        break;
      default:
        break;
    }
    return this.dataValue;
  }

  _compareObject(obj1, obj2) {
    const keysObj2 = Object.keys(obj2);
    for (const key2 of keysObj2) {
      if (obj2[key2] != obj1[key2]) return false;
    }
    return true;
  }

  async findAll(
    args = {
      where: {},
    }
  ) {
    this.dataValue = [];
    const allKeyOnThisTable = await this.getAllKeysTable();
    if (!allKeyOnThisTable.length) return this.dataValue;
    switch (true) {
      case !args || !args.where || !Object.keys(args.where).length:
        this.dataValue = await Promise.all(allKeyOnThisTable.map((key) => localforage.getItem(key)));
        break;
      case !!args.where && !!Object.keys(args.where).length:
        if (typeof args.where.id !== undefined && args.where.id !== null) {
          if (_.isArray(args.where.id)) {
            this.dataValue = await Promise.all(
              args.where.id.map((id) => localforage.getItem(`${this.tableIndex}[${id}]`))
            );
          } else {
            this.dataValue = [await localforage.getItem(`${this.tableIndex}[${args.where.id}]`)];
          }
        } else {
          const allData = await Promise.all(allKeyOnThisTable.map(localforage.getItem));
          this.dataValue = allData.filter((item) => this._compareObject(item, args.where));
        }
        break;
      default:
        break;
    }
    return this.dataValue;
  }
}

class azhDb {
  constructor(dbName) {
    this.dbName = dbName ? `azhDb-${dbName}` : 'azhDb';
  }
  models = {};
  dbName = '';
  async init(tables = []) {
    const findDb = await localforage.getItem(this.dbName);
    if (!findDb) {
      await localforage.setItem(this.dbName, {
        tables,
      });
      this._initTable(tables);
    } else {
      this._initTable(findDb.tables);
    }
    return this;
  }
  _initTable(tables) {
    tables.forEach((table) => {
      this.models[table.name] = new azhTable({
        db: this,
        name: table.name,
        columns: table.columns,
      });
    });
  }
  getDbName() {
    return this.dbName;
  }
  getModel(name) {
    return this.models[name];
  }
  getModels() {
    return this.models;
  }
}

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
  _METHOD_OVERWRITE = [
    'getChapterId',
    'init',
    'getNextChapUrl',
    'getContentOnChap',
    'getTitleOnChap',
    'getFirstChapUrl',
  ];

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
  ebookStatus = 'release';
  host = location.host;
  referrer = location.protocol + '//' + this.host + this.pathname;
  ebookFilename = this.pathname.slice(8, -1) + '.epub';
  credits = '';
  endChapter = 0;
  $btnDownload;
  $btnText;
  ebookId;
  $btnProgress;
  coverBlob;
  db = new azhDb();

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
  async createStory() {
    const { Book } = this.db.getModels();
    const book = await Book.findOne({
      where: {
        id: this.ebookId,
      },
    });
    let dataStorage = {
      id: this.ebookId,
      name: this.ebookTitle,
      author: this.ebookAuthor,
      cover: this.coverBlob,
      type: this.ebookType,
      total_chap: this.endChapter,
      status: this.ebookStatus,
    };
    if (book) {
      dataStorage = {
        ...book,
        ...dataStorage,
        ...(book.cover && {
          cover: book.cover,
        }),
      };
    }
    return Book.createOrUpdate(dataStorage);
  }

  async _init() {
    // init cover
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
    this.db = await this.db.init([
      {
        name: 'Book',
        columns: [
          {
            title: 'id',
            defaultValue: 'Unknown',
          },
          {
            title: 'name',
            defaultValue: 'Unknown',
          },
          {
            title: 'author',
            defaultValue: 'Unknown',
          },
          {
            title: 'cover',
            defaultValue: null,
          },
          {
            title: 'type',
            defaultValue: [],
          },
          {
            title: 'total_chap',
            defaultValue: 0,
          },
          {
            title: 'total_chap_downloaded',
            defaultValue: 0,
          },
          {
            title: 'status',
            defaultValue: 'release',
            // dataType: Enum('release', 'writing', 'stop'),
          },
          {
            title: 'created_at',
            defaultValue: new Date(),
          },
        ],
      },
      {
        name: 'Chapter',
        columns: [
          {
            title: 'id',
            defaultValue: 'Unknown',
            dataType: 'string',
          },
          {
            title: 'title',
            defaultValue: 'Unknown',
            dataType: 'string',
          },
          {
            title: 'content',
            defaultValue: null,
            dataType: 'string',
          },
          {
            title: 'order',
            defaultValue: 0,
            dataType: 'number',
          },
          {
            title: 'book_id',
            defaultValue: null,
            dataType: 'string',
          },
        ],
      },
    ]);
    const book = await this.createStory();
    if (book.cover && !this.coverBlob) this._setCoverBlob(book.cover);
  }

  _updateStory(data) {
    const { Book } = this.db.getModels();
    return Book.update(
      {
        where: {
          id: this.ebookId,
        },
      },
      data
    );
  }

  _createChapter(data) {
    const { Chapter } = this.db.getModels();
    return Chapter.createOrUpdate(data);
  }

  _getChapterById(id) {
    const { Chapter } = this.db.getModels();
    return Chapter.findOne({
      where: {
        id,
      },
    });
  }

  async _setCoverBlob(blob) {
    await this._updateStory({
      cover: blob,
    });
    this.coverBlob = blob;
    this.jepub.cover(blob);
  }

  async _setEbookCover(coverUrl) {
    this.ebookCover = coverUrl;
    const coverBlob = await this._downloadCover();
    await this._setCoverBlob(coverBlob);
  }

  _addChap(chapterData = { content: '', title: '' }) {
    this.jepub.add(chapterData.title, chapterData.content);
  }

  async _getChap(url) {
    if (url) {
      const res = await axios({
        method: 'GET',
        url,
      });
      return res.data.match(/<body.*?>([\s\S]*)<\/body>/)[1];
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
    const customCover = prompt('You want to custom cover?');
    if (customCover) await this._setEbookCover(customCover);

    let chapUrl = this.getFirstChapUrl();
    for (let chapterIndex = 1; chapterIndex <= this.endChapter; chapterIndex++) {
      if (chapterIndex !== 1 && currentChap) {
        chapUrl = this.getNextChapUrl(currentChap);
      }

      const chapterId = this.getChapterId(chapUrl);
      const chapterExist = await this._getChapterById(chapterId);
      const chapterData = {
        ...chapterExist,
        id: chapterId,
        order: chapterIndex,
        book_id: this.ebookId,
      };
      if (!chapterExist) {
        let dataChap = await this._getChap(chapUrl);
        chapterData.content = dataChap;
      }
      currentChap = createElementFromHTML(chapterData.content);
      const chapTitle = this.getTitleOnChap(currentChap);
      const chapContent = this.getContentOnChap(currentChap);
      this._addChap({
        content: chapContent,
        title: chapTitle,
      });
      await this._createChapter({
        ...chapterData,
        title: chapTitle,
        id: chapterId,
        order: chapterIndex,
        book_id: this.ebookId,
      });
      const percent = (chapterIndex / this.endChapter) * 100;
      this._updateBtnText(`${percent.toFixed(2)}%`);
      this._updateBtnProgress(percent);
    }
    this._updateBtnText('Completed');
    this.$btnDownload.classList.add(this.btnDownload.className.completed.replace('.', ''));
    this.$btnDownload.removeEventListener('click', this._onDownload);
    return this._genEbook();
  };

  // internal function
  _raiseMissingMethod(methodName = '') {
    throw new Error(`Method ${methodName} not found, plz make this method on your model.`);
  }

  _downloadCover() {
    if (!this.ebookCover) return;
    return new Promise((rs, rj) => {
      GM.xmlHttpRequest({
        method: 'GET',
        url: this.ebookCover,
        responseType: 'arraybuffer',
        onload: (response) => {
          try {
            this.jepub.cover(response.response);
            return rs(response.response);
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
    // document.body.style.display = 'none';
    // raise and stop function when missing method
    for (const method of this._METHOD_OVERWRITE) {
      if (!this[method]) {
        throw this._raiseMissingMethod(method);
      }
    }
    await this._init();
    if (!this.coverBlob) {
      const coverBlob = await this._downloadCover();
      if (coverBlob) {
        await this._setCoverBlob(coverBlob);
      }
    }
    this.$btnDownload = this.addBtnToArea();
    this.$btnDownload.addEventListener('click', this._onDownload);
  }
}

const downloadButtonHTML = `
<div class="azh-btn-download">
  <div class="azh-download-progress"></div>
  <div class="azh-download-text">Download</div>
  <div class="azh-download-progress-per-item"></div>
</div>`;

function downloadButton() {
  const button = document.createElement('div');
  button.classList.add('azh-theme-dark');
  button.insertAdjacentHTML('afterbegin', downloadButtonHTML);
  return button;
}

// import { azhDb } from '../../lib/azhDb/azhDb';




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
      item.textContent.trim()
    );
    this.ebookAuthor = this.selectValueByAttr('Tác giả').textContent.trim();
    this.endChapter = Number(this.selectValueByAttr('Số chương').textContent.trim().replace(/\W/g, ''));
    this.ebookId = this.pathname.split('/').slice(-1)[0];
    this.ebookStatus = this.selectValueByAttr('Trạng thái').textContent.trim();
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

  getChapterId(url) {
    return url.split('/').slice(-1)[0];
  }

  getTitleOnChap(chap) {
    return chap.querySelector('.title-chapter').textContent.trim();
  }

  getFirstChapUrl() {
    return selectByXpath("//body/main//button[text()='Đọc truyện']/../../a").getAttribute('href');
  }
}

class HdxTruyen extends BaseModel {
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

class TruyenCom extends BaseModel {
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

class MeTruyenChu extends BaseModel {
  makeBtnDownload = downloadButton;

  bookInfo = {};

  init() {
    this.bookInfo = this.getNextData(document);
    this.btnDownload.position = 'afterbegin';
    this.credits =
      '<p>Truyện được tải từ <a href="' +
      this.referrer +
      '">MeTruyenChu</a></p><p>Userscript được viết bởi: <a href="https://azhoang.github.io/">azHoang</a></p>';

    this.ebookTitle = this.bookInfo.props.pageProps.book.name;
    this.ebookCover = null;
    this.ebookDesc = this.bookInfo.props.pageProps.book.introduction;
    this.ebookType = this.bookInfo.props.pageProps.book.genres.map((genre) => genre.name).join(', ');
    this.ebookAuthor = this.bookInfo.props.pageProps.book.author.name;
    this.endChapter = this.bookInfo.props.pageProps.book.chapterCount;
    this.ebookId = this.bookInfo.props.pageProps.book.slug;
    // this.ebookStatus = document.querySelector('#thong_tin .text-success').textContent.trim();
  }

  getNextData(chap) {
    return JSON.parse(chap.querySelector('#__NEXT_DATA__').innerText);
  }

  getAreaBtn() {
    return document.querySelector(
      '#__next > header.relative.min-h-\\[400px\\] > div.md\\:pt-12.md\\:mb-5.relative > div > div.flex.flex-col.justify-end.grow > nav'
    );
    // return document.querySelector('#truyen_button');
  }

  getChapUrl(bookSlug, chapSlug) {
    return `https://metruyenchu.vn/${bookSlug}/${chapSlug}`;
  }

  getNextChapUrl(chap) {
    const nextData = this.getNextData(chap);
    if (!nextData.props.pageProps.nextChapter) return null;
    const slug = nextData.props.pageProps.nextChapter.slug;
    const bookSlug = nextData.props.pageProps.chapter.bookSlug;
    return this.getChapUrl(bookSlug, slug);
  }

  getContentOnChap(chap) {
    const nextData = this.getNextData(chap);
    let content = nextData.props.pageProps.chapter.content;
    let dataIndex = 1;
    while (!!nextData.props.pageProps.chapter[`data${dataIndex}`]) {
      content += nextData.props.pageProps.chapter[`data${dataIndex}`].text;
      dataIndex++;
    }
    return content.split('\n').join('<br>');
  }

  getChapterId(url) {
    console.log(url);
    return url.split('/').slice(-1)[0];
  }

  getTitleOnChap(chap) {
    const nextData = this.getNextData(chap);
    return nextData.props.pageProps.chapter.name;
  }

  getFirstChapUrl() {
    return this.getChapUrl(
      this.bookInfo.props.pageProps.book.slug,
      this.bookInfo.props.pageProps.book.firstChapterSlug
    );
  }
}

(function () {
  'use strict';
  const hostMappingEbook = {
    'ztruyen.vn': Ztruyen,
    'truyenhdx.com': HdxTruyen,
    'truyencom.com': TruyenCom,
    'metruyenchu.vn': MeTruyenChu,
  };
  if (!hostMappingEbook[window.location.host]) {
    alert('We not support this Ebook site. plz contact https://azhoang.github.io/');
    return window.open('https://azhoang.github.io/');
  }
  const ebookModel = new hostMappingEbook[window.location.host]();
  if (!ebookModel.run) throw new Error('"run" funtion not defined.');
  ebookModel.run();
})();

(function(){
  const $style = document.createElement('style');

  $style.innerHTML = `.azh-theme-dark {
  --primary: #d8baf0;
  --success: #baf0c6;
  --bg: #2c3436;
  --bg-progress: linear-gradient(90deg, rgba(44, 52, 54, 1) 0%, rgba(9, 121, 70, 1) 49%, rgba(0, 255, 151, 1) 100%);
  --bg-progress-item: linear-gradient(
    90deg,
    rgba(44, 54, 45, 1) 0%,
    rgba(93, 121, 9, 1) 49%,
    rgba(255, 186, 0, 1) 100%
  );
}
/* Button */
.azh-btn-download {
  display: block!important;
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
  background: var(--bg-progress);
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
.azh-download-progress-per-item {
  height: 3px;
  background: var(--bg-progress-item);
  position: absolute;
  left: 0;
  bottom: 0;
}

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

.azh-btn-download {
  width: 180px;
  border-radius: 5px;
  margin-bottom: 1rem;
  margin-left: 0;
}
`;

  document.body.appendChild($style);
})();