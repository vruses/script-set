class PromiseLike {
  static resolve(result) {
    // 如果是通过构造函数调用,同时状态只能由pending变为res或rej
    if (this instanceof PromiseLike && this.PromiseState === "pending") {
      // console.log(this.constructor);
      // console.log("reslove: " + result);
      this.PromiseState = "fulfilled";
      this.PromiseResult = result;
      console.log(this.PromiseState);
    } else {
      // 通过类调用
      if (result instanceof PromiseLike) {
        return result;
      }
      return new PromiseLike((res) => {
        res(result);
      });
    }
  }
  static reject(result) {
    if (this instanceof PromiseLike && this.PromiseState === "pending") {
      // console.log("reject:" + this.PromiseState);

      // console.log("reject:" + result);
      this.PromiseState = "rejected";
      this.PromiseResult = result;
      console.log(this.PromiseState);
    } else {
      if (result instanceof PromiseLike) {
        return result;
      }
      return new PromiseLike((_res, rej) => {
        rej(result);
      });
    }

    // console.error((new Error('123').name = "Uncaught (in promise)"));
  }
  constructor(func) {
    this.PromiseState = "pending";
    this.PromiseResult = undefined;
    func(
      this.constructor.resolve.bind(this),
      this.constructor.reject.bind(this)
    );
  }
  then(func) {
    switch (this.PromiseState) {
      case "pending":
        return this;
      case "fulfilled":
        func(this.PromiseResult);
        return PromiseLike.resolve(this.PromiseResult);
      case "rejected":
        return PromiseLike.reject(this.PromiseResult);
    }
  }
}
// const promise_like = new PromiseLike((res, rej) => {
//   res({ foo: 123 });
// });
const promise_lik2 = new PromiseLike((res, rej) => {
  setTimeout(() => {
    res(123);
    rej(321);
  }, 2000);
});
// console.log(promise_lik2);
// const foo = PromiseLike.resolve(PromiseLike.resolve(123));
