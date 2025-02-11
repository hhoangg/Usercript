export const selectByXpath = (xpath) => {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};

export function createElementFromHTML(htmlString) {
  var template = document.createElement('template');
  htmlString = htmlString.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = htmlString;
  return template.content;
}
