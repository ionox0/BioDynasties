export const utils = (function() {
  return {
    DictIntersection: function(dictA: { [x: string]: any; }, dictB: any) {
      const intersection: {[k: string]: any} = {};
      for (let k in dictB) {
        if (k in dictA) {
          intersection[k] = dictA[k];
        }
      }
      return intersection
    },

    DictDifference: function(dictA: any, dictB: any) {
      const diff = {...dictA};
      for (let k in dictB) {
        delete diff[k];
      }
      return diff;
    }
  };
})();
