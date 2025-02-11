import { BaseModel } from './base';
import { downloadButton } from '../modules/download-button';

import '../styles/truyenhdx-download-button.css';

export class MeTruyenChu extends BaseModel {
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
