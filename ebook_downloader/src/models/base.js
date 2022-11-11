import { createElementFromHTML } from '../utils';
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
