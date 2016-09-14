'use strict';

const Treegram = require("@datagica/treegram");

class ParseEntities {
  constructor(opts) {

    if (typeof opts === 'undefined') {
      opts = {};
    }

    this.debug = (typeof opts.debug === "boolean")
      ? opts.debug : false;

    this.fields = (typeof opts.fields !== "undefined")
      ? opts.fields : ['label', 'aliases'];

    this.overlapping = (typeof opts.overlapping === "boolean")
      ? opts.overlapping : false;

    this.aliaser = (typeof opts.aliaser === "function")
      ? opts.aliaser : undefined;

    this.minMatchingKeywords = (typeof opts.minMatchingKeywords === "number")
      ? opts.minMatchingKeywords : 0;

    this.autoacceptIfNoKeywords = (typeof opts.autoacceptIfNoKeywords === 'boolean')
      ? opts.autoacceptIfNoKeywords : false;

    this.db = new Treegram({
      debug:       this.debug,
      fields:      this.fields,
      overlapping: this.overlapping,
      spellings:   opts.spellings,
      maxLength:   opts.maxLength,
      data:        opts.data
    });
  }

  countCategories(results) {
    return Array.isArray(results) ? Object.keys(results.reduce((m, i) => {
      m[i.value.category] = 1;
      return m;
    }, {})).length : 0;
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
      return Promise.reject(new Error(`input is not text but ${typeof input}`))
    }

    const autoacceptIfNoKeywords = (typeof opts.autoacceptIfNoKeywords === 'boolean')
      ? opts.autoacceptIfNoKeywords : this.autoacceptIfNoKeywords;

    const minMatchingKeywords = (typeof opts.minMatchingKeywords === "number")
      ? opts.minMatchingKeywords : this.minMatchingKeywords;

    //console.log("querying the engine");
    return this.find(text).then(result => {
      //console.log("got response:", JSON.stringify(currentResult));

      // only keep results with more than N matching words in the full text
      if (minMatchingKeywords <= 0) return Promise.resolve(result)

      return Promise.resolve(currentResult.filter(proposal => {
        const proposalHasKeywords = Array.isArray(proposal.value.keywords) && (proposal.value.keywords.length > 0);
        if (!proposalHasKeywords && autoacceptIfNoKeywords) return true;
        const nbOccurrences = (proposalHasKeywords) ? this.countKeywords(proposal.value.keywords, text) : 0;
        return nbOccurrences >= minMatchingKeywords;
      }))
    })
  }
}

ParseEntities.aliaser = Treegram.aliaser
module.exports = ParseEntities
module.exports.default = ParseEntities
module.exports.ParseEntities = ParseEntities
