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
          // 保证访问值得一致性
          callback(this.value);
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
        console.log(this.reason);
        console.log("状态变为:", this.state, "结果:", this.reason);
      } else {
        console.log("状态已锁定，无法从", this.state, "变为 rejected");
      }
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      console.error(`Uncaught (in promise)`,`${this.reason}`);
    }
  }

  then(onFulfilled,onRejected) {
    // 可能传入非函数
    // 不同state做出不同行为
    if (this.state === "fulfilled") {
      onFulfilled(this.value);
    } else if (this.state === "rejected") {
      onRejected(this.reason);
    } else {
      this.onFulfilledCallbacks.push(executor);
      this.onRejectedCallbacks.push(executor);
    }
  }
}
const promise_lik2 = new PromiseLike((res, rej) => {
  setTimeout(() => {
    res(123);
    rej(321);
  }, 2000);
}).then(res=>{
  console.log('then=>',res)
});
console.log(promise_lik2);