'use strict';

const Treegram = require("@datagica/treegram");

class ParseEntities {
  constructor(opts) {

    if (typeof opts === 'undefined') {
      opts = {};
    }

    this.croppingLength = (typeof opts.croppingLength === "number") ? opts.croppingLength : 0;
    this.debug = (typeof opts.debug === "boolean") ? opts.debug : false;
    this.fields = (typeof opts.fields !== "undefined") ? opts.fields : ['label', 'aliases'];
    this.overlapping = (typeof opts.overlapping === "boolean") ? opts.overlapping : false;
    this.aliaser = (typeof opts.aliaser === "function") ? opts.aliaser : undefined;
    this.minMatchingKeywords = (typeof opts.minMatchingKeywords === "number") ? opts.minMatchingKeywords : 0;
    this.autoacceptIfNoKeywords = (typeof opts.autoacceptIfNoKeywords === 'boolean') ? opts.autoacceptIfNoKeywords : false;

    this.delimitersPattern = undefined;
    if (Array.isArray(opts.delimiters) && opts.delimiters.length > 0) {
      const pattern = `(?:${opts.delimiters.join('|')})`;
      this.delimitersPattern = new RegExp(pattern);
    }

    this.db = new Treegram({
      debug: this.debug,
      fields: this.fields,
      overlapping: this.overlapping,
      spellings: opts.spellings,
      maxLength: opts.maxLength,
      data: opts.data
    });
  }

  countCategories(results) {
    if (!Array.isArray(results)) {
      return 0;
    }
    return Object.keys(results.reduce((m, i) => {
      m[i.value.category] = 1;
      return m;
    }, {})).length;
  }

  /**
   * Count occurrences of keywords in a text
   */
  countKeywords(keywords, text) {
    //console.log("countKeywords: "+JSON.stringify(keywords));
    if (typeof keywords === "undefined") {
      return undefined; // not just 0
    }
    if (!Array.isArray(keywords)) {
      // if we are using a language map
      keywords = Object.keys(Object.keys(keywords).reduce((redux, lang) => {
        keywords[lang].map(word => { redux[word] = true; })
        return redux;
      }, {}));
    }
    const stats = keywords.reduce((stats, keyword) => {
      const pattern = new RegExp(keyword, "gi");
      const count = (text.match(pattern) || []).length;
      stats.count[keyword] = count;
      stats.sum += count;
      /*
      console.log(JSON.stringify({
        keyword: keyword,
        count: count,
        sum: stats.sum
      }))
      */
      return stats;
    }, {
      count: {},
      sum: 0
    });
    return stats.sum;
  }

  find(text) {
    return this.db.find(text);
  }

  parse(input, opts) {

    if (typeof opts === 'undefined') {
      opts = {};
    }

    //console.log("there! input is: "+input)
    let text = "";
    if (typeof input === 'string') {
      text = input;
    } else if (typeof input.text === 'string') {
      text = input.text;
    } else {
      throw new Error(`input is not text but ${typeof input}`)
    }
    const blocks = (typeof this.delimitersPattern !== 'undefined')
      ? text.split(this.delimitersPattern) : [text];
    const croppingLength = (blocks.length > 0) ? this.croppingLength : 0;

    const autoacceptIfNoKeywords = (typeof opts.autoacceptIfNoKeywords === 'boolean')
      ? opts.autoacceptIfNoKeywords : this.autoacceptIfNoKeywords;

    const minMatchingKeywords = (typeof opts.minMatchingKeywords === "number")
      ? opts.minMatchingKeywords : this.minMatchingKeywords;

    //console.log("text: "+text);
    return blocks.reduce((prom, block) => {

      return prom.then(previousResult => {

        const blockText = (croppingLength) ? block.slice(0, croppingLength) : block;

        //console.log("querying the engine");
        return this.find(blockText).then(currentResult => {
          //console.log("got response:", JSON.stringify(currentResult));

          // only keep results with more than N matching words in the full text
          if (minMatchingKeywords > 0) {

            currentResult = currentResult.filter(proposal => {
              const proposalHasKeywords = Array.isArray(proposal.value.keywords) && (proposal.value.keywords.length > 0);
              if (!proposalHasKeywords && autoacceptIfNoKeywords) {
                  return true;
              }
              const nbOccurrences = (proposalHasKeywords) ? this.countKeywords(proposal.value.keywords, blockText) : 0;
              return nbOccurrences >= minMatchingKeywords;
            });
          }

          // NOTE yes we are re-computing the previous score. We could find a
          // better algorithm.
          const previousResultScore = this.countCategories(previousResult);
          const currentResultScore = this.countCategories(currentResult);

          return Promise.resolve(
            (currentResultScore >= previousResultScore) ? currentResult : previousResult
          )
        })
      })
    }, Promise.resolve([]));
  }
}

ParseEntities.aliaser = Treegram.aliaser
module.exports = ParseEntities
module.exports.default = ParseEntities
module.exports.ParseEntities = ParseEntities
