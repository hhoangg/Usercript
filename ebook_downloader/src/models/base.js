import { createElementFromHTML } from '../utils';
import { storageKey } from '../constant';
import { azhDb } from '../../lib/azhDb/azhDb';
export class BaseModel {
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
      await this._setCoverBlob(coverBlob);
    }
    this.$btnDownload = this.addBtnToArea();
    this.$btnDownload.addEventListener('click', this._onDownload);
  }
}
