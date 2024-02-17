// LoadingManager seems to be broken when you attempt to load multiple
// resources multiple times, only first onLoad is called.
// So roll our own.
export class OurLoadingManager {
  loader_: any;
  files_: Set<unknown>;
  onLoad: () => void;
  constructor(loader: any) {
    this.loader_ = loader;
    this.files_ = new Set();
    this.onLoad = () => {};
  }

  load(file: unknown, cb: (arg0: any) => void) {
    this.files_.add(file);

    this.loader_.load(file, (result: any) => {
      this.files_.delete(file);
      cb(result);

      if (this.files_.size == 0) {
        this.onLoad();
      }
    });
  }
};
