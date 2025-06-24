class PromiseLike {
  static resolve(result) {
    // 通过类调用的静态方法
    if (result instanceof PromiseLike) {
      return result;
    }
    return new PromiseLike((res) => {
      res(result);
    });
  }

  static reject(result) {
    // 通过类调用的静态方法
    if (result instanceof PromiseLike) {
      return result;
    }
    return new PromiseLike((_res, rej) => {
      rej(result);
    });
  }

  constructor(executor) {
    this.state = "pending";
    this.value = undefined;
    this.reason = undefined;

    // 构造函数里面添加两个数组存储成功和失败的回调
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      // 只有在 pending 状态时才能改变状态
      if (this.state === "pending") {
        this.state = "fulfilled";
        this.value = value;
        this.onFulfilledCallbacks.forEach((callback) => {
          callback();
        });
        console.log("状态变为:", this.state, "结果:", this.value);
      } else {
        console.log("状态已锁定，无法从", this.state, "变为 fulfilled");
      }
    };

    const reject = (reason) => {
      // 只有在 pending 状态时才能改变状态
      if (this.state === "pending") {
        this.state = "rejected";
        this.reason = reason;
        this.onRejectedCallbacks.forEach((callback) => {
          callback();
        });
        console.log(this.reason);
        console.log("状态变为:", this.state, "结果:", this.reason);
      } else {
        console.log("状态已锁定，无法从", this.state, "变为 rejected");
      }
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      console.error(`Uncaught (in promise)`, `${this.reason}`);
    }
  }

  // 首先需要传入函数,然后看情况执行这个函数
  // 其次返回一个promise<result>,result是函数执行的结果
  // TODO:then实现链式调用
  then(onFulfilled, onRejected) {
    // 不同state做出不同行为
    // 避免产生副作用一般会暂存onFul和onRej
    // 回调执行过程中报错则reject

    // 确保onFulfilled和onRejected是函数
    const realOnFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value; // 值穿透

    const realOnRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          }; // 错误穿透
    if (this.state === "fulfilled") {
      return new PromiseLike((resolve, reject) => {
        try {
          resolve(realOnFulfilled(this.value));
        } catch (error) {
          reject(error);
        }
      });
    } else if (this.state === "rejected") {
      return new PromiseLike((_resolve, reject) => {
        try {
          reject(realOnRejected(this.reason));
        } catch (error) {
          reject(error);
        }
      });
    } else {
      this.onFulfilledCallbacks.push(() => {
        try {
          realOnFulfilled(this.value);
        } catch (error) {}
      });
      this.onRejectedCallbacks.push(() => {
        try {
          realOnRejected(this.value);
        } catch (error) {}
      });
    }
  }
}
const promise_like2 = new PromiseLike((res, rej) => {
  setTimeout(() => {
    // res(123);
    rej(321);
  }, 2000);
});
promise_like2.then(
  (res) => {
    console.log("then=>", res);
  },
  (reason) => {
    console.log(reason);
  }
);
// .then((res) => {
//   console.log("then=>", 456);
// });
// console.log(promise_lik2);
// promise_lik2.then((res) => {
//   console.log("then=>", 456);
// })
console.log(promise_like2);
