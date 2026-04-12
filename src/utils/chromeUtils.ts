export const openOptionsPage = () => {
  if (typeof chrome.runtime.openOptionsPage === 'function') {
    chrome.runtime.openOptionsPage()
  } else {
    window.open(chrome.runtime.getURL('options.html'))
  }
}
