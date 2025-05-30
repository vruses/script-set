// ==UserScript==
// @name        话本爬书
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://www.ihuaben.com/book/*
// @grant       GM_registerMenuCommand
// @grant       GM.registerMenuCommand
// @grant       unsafeWindow
// @version     1.0
// @description 爬取话本小说的小说
// ==/UserScript==

let bookName;
let authorName;
let bookId;
let chapterNumber;
let baseUrl;
unsafeWindow.addEventListener("load", () => {
  try {
    bookName = chapterInfo.bookName;
    authorName = chapterInfo.authorName;
    bookId = chapterInfo.bookId;
    chapterNumber = JSON.parse(
      document.querySelector(".text-muted.number").textContent
    );
    baseUrl = `https://www.ihuaben.com/list/${bookId}.html?sortType=0`;
  } catch (error) {
    alert("小说信息获取失败！");
    console.log(error);
  }
});

GM_registerMenuCommand("一键下载", async function () {
  try {
    // 使用示例
    let textToSave = await main(bookName, authorName, chapterNumber, baseUrl);
    saveTextAsFile(textToSave, bookName);
  } catch (error) {
    console.log("该页面没有章节可下载！");
    alert("该页面没有章节可下载！");
  }
});

// 下载小说文件
function saveTextAsFile(text, filename) {
  // 创建一个Blob对象
  const blob = new Blob([text], { type: "text/plain" });

  // 创建一个下载链接
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = filename || "download.txt";

  // 触发点击事件
  downloadLink.click();

  // 释放URL对象
  URL.revokeObjectURL(downloadLink.href);
}
// 获取所有的的章节分页dom
async function getAllChaptersDom(chapterNumber, baseUrl) {
  // 分页数
  let pageNumber = Math.ceil(chapterNumber / 40);
  let domList = [];
  for (let num = 1; num <= pageNumber; num++) {
    domList.push(
      fetch(baseUrl + `&page=${num}`, { withCredentials: true })
        .then((res) => res.text())
        .then((htmlString) => {
          // 解析为 HTML DOM
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, "text/html");
          return doc;
        })
        .catch((err) => {
          alert("获取章节分页出现错误！");
          console.error("解析失败:", err);
        })
    );
  }
  return Promise.all(domList);
}
// 遍历所有章节分页dom获取所有章节对象，对象包括章节标题，链接
function getChaptersList(chaptersDom) {
  let list = [];
  for (const chapterDom of chaptersDom) {
    for (const item of chapterDom.querySelectorAll(".chapterTitle")) {
      const chapter = {
        href: item.querySelector("a").href,
        title: item.querySelector("a").title,
      };
      list.push(chapter);
    }
  }
  return list;
}
// 通过章节对象获取章节正文dom
async function fetchChapterEl(href) {
  return fetch(href, { withCredentials: true })
    .then((res) => res.text())
    .then((htmlString) => {
      // 解析为 HTML DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      return doc;
    })
    .catch((error) => {
      console.error("解析失败:", error);
      alert("获取章节正文出现错误！");
    });
}
// 通过章节正文dom获取单个章节正文
function getNestedTextContent(element, title) {
  let result = "\n" + title + "\n\n";
  try {
    for (const child of element.querySelector("#contentsource").children) {
      // 获取 textContent 并换行
      const text = child.textContent.trim();
      if (text) result += text + "\n";
    }
  } catch (error) {
    console.error("解析失败:", error);
    alert("章节获取失败：" + title);
    result += "此章节获取失败！\n";
  }
  return result;
}

//主函数
async function main(bookName, authorName, chapterNumber, baseUrl) {
  // 小说正文
  let bookUrl = baseUrl.replace("list", "book");
  let novelContent = `
书名：${bookName}
作者：${authorName}
链接：${bookUrl}
`;
  // 章节目录所在的分页，有多个分页
  let chaptersDom = await getAllChaptersDom(chapterNumber, baseUrl);
  // 多个分页整合的章节列表
  let chaptersList = getChaptersList(chaptersDom);
  for (const chapter of chaptersList) {
    // 给每个章节下载添加延时，避免服务器压力过大
    chapter.text = await new Promise((resolve) =>
      setTimeout(() => resolve(fetchChapterEl(chapter.href)), 10)
    );
  }
  // 等待所有章节正文获取完成
  chaptersList = await Promise.all(
    chaptersList.map(async (chapter) => {
      const text = await chapter.text;
      return { ...chapter, text };
    })
  );
  // 解析章节正文
  for (const chapter of chaptersList) {
    novelContent += getNestedTextContent(chapter.text, chapter.title);
  }
  return novelContent;
}
