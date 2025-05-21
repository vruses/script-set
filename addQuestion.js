// ==UserScript==
// @name        一键加入所有试题
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://zujuan.xkw.com/*
// @grant       none
// @grant       GM_registerMenuCommand
// @grant       GM.registerMenuCommand
// @version     1.0
// @description 5/20/2025, 1:48:05 PM
// ==/UserScript==

(() => {
  GM_registerMenuCommand("一键加入", function () {
    try {
      addAllQues();
    } catch (error) {
      console.log("该页面没有添加试题");
    }
  });
  function addAllQues() {
    for (let item of document.querySelectorAll('a[data-btn-type="quesAdd"]')) {
      console.log(item);
      item.click();
    }
  }
})();
