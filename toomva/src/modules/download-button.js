import { downloadButtonHTML } from '../components/download-button';
import '../styles/download-button.css';

export function downloadButton() {
  const button = document.createElement('div');
  button.classList.add('azh-theme-dark');
  button.insertAdjacentHTML('afterbegin', downloadButtonHTML);
  return button;
}
