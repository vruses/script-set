// ==UserScript==
// @name        修改订单数据
// @namespace   vurses
// @license     Mit
// @author      layenh
// @match       https://fxg.jinritemai.com/ffa/fxg-bill/settlement-detail-bill*
// @grant       none
// @version     1.0
// @run-at      document-start
// @description 修改订单数据
// ==/UserScript==

(() => {
  const dataType = {
    // 结算月份
    billTime: "",
    // 总笔数
    sumSettledCount: "",
    // 总金额
    sumShopNetEarning: "",
    // 收入金额
    sumSettledIncomeAmount: "",
    // 支出金额
    sumSettledOutcomeAmount: "",
  };
  const dataList = [dataType, dataType];

  // 封装本地存储
  const storage = {
    set(key, value) {
      try {
        const data = JSON.stringify(value);
        localStorage.setItem(key, data);
      } catch (e) {
        console.error("Storage Set Error:", e);
      }
    },

    get(key, defaultValue = null) {
      try {
        const data = localStorage.getItem(key);
        return data !== null ? JSON.parse(data) : defaultValue;
      } catch (e) {
        console.error("Storage Get Error:", e);
        return defaultValue;
      }
    },
  };
  async function tableMounted() {
    return await new Promise((res) => {
      setTimeout(res, 100);
    })
      .then(() => {
        // 等待表格数据加载
        document
          .querySelector('[id*="X-TABLE-fxg-bill"][id*="month"]')
          .querySelectorAll("[data-row-key]")[1]
          .querySelector("td");
      })
      .catch(() => {
        console.log("月汇总表格加载中。。。");
        return tableMounted();
      });
  }
  // 查询table并获取数据
  function queryData(target) {
    // 获取包含非表头行的数据的元素
    let dataEl = target.querySelectorAll("[data-row-key]");
    let dataList = [];
    for (const el of dataEl) {
      const [
        billTime,
        sumSettledCount,
        sumShopNetEarning,
        sumSettledIncomeAmount,
        sumSettledOutcomeAmount,
        // 去掉首尾非数据的表列
      ] = Array.from(el.children)
        .slice(1, -1)
        .map((value) => {
          return value.textContent;
        });
      const data = {
        billTime,
        sumSettledCount,
        sumShopNetEarning,
        sumSettledIncomeAmount,
        sumSettledOutcomeAmount,
      };
      dataList.push(data);
    }
    return dataList;
  }
  function setData(target, data) {
    const rows = target.querySelectorAll("[data-row-key]");
    const keys = [
      "billTime",
      "sumSettledCount",
      "sumShopNetEarning",
      "sumSettledIncomeAmount",
      "sumSettledOutcomeAmount",
    ];
    // 行
    data.forEach((item, index) => {
      if (index >= rows.length) return;
      const cells = Array.from(rows[index].children).slice(1, -1);
      // 列
      keys.forEach((key, i) => {
        if (cells[i]) cells[i].textContent = item[key];
      });
    });
  }

  async function main() {
    // 等待月汇总表格加载完成
    await tableMounted();
    // 获取table元素
    const table = document.querySelector(
      '[id*="X-TABLE-fxg-bill"][id*="month"]'
    );
    // 获取本地数据
    const data = storage.get("monthBill", []);
    // 改写table元素，如果需要的话
    console.log(data);
    if (data.length) setData(table, data);
    //table元素可写
    table.contentEditable = "true";
    table.addEventListener("input", function () {
      // 获取数据
      const data = queryData(this);
      // 本地存储数据
      storage.set("monthBill", data);
    });
  }
  main();
})();
