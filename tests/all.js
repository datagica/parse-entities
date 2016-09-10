const chai = require('chai');
chai.use(require('chai-fuzzy'));
const expect = chai.expect;

const ParseEntities = require("../lib/parse-entities");

describe('@datagica/parse-entities', () => {

  describe('calling ParseEntities directly', () => {

    it('should return an empty list by default', (done) => {
      new ParseEntities()
        .parse(`Yesterday we watch the movie good bye lenin. #popcorn`)
        .then(results => {
          expect(results).to.be.like([]);
          done();
        })
    })

    it('should work on basic example', (done) => {
      new ParseEntities({
      data: [
        {
          label: 'The East',
          type: 'Movie'
        },
        {
          label: 'Good Bye Lenin!',
          type: 'Movie'
        },
        {
          label: 'Lenin',
          type: 'Person'
        }
      ]
    }).parse(`Yesterday we watch the movie good bye lenin. #popcorn`)
      .then(results => {
        //console.log(JSON.stringify(results, null, 2))

        expect(results).to.be.like([
          {
            "ngram":"good bye lenin",
            "value":{
              "label":"Good Bye Lenin!",
              "type":"Movie"
            },
            "score":1,
            "position":{
              "index": 5,
              "begin": 29,
              "end": 43
            }
          }
        ]);

        done();

      })

    })


    it('should work on custom fields', (done) => {
      new ParseEntities({
        fields: 'title',
        data: [
          {
            title: 'The East',
            type: 'Movie'
          },
          {
            title: 'Good Bye Lenin!',
            type: 'Movie'
          },
          {
            title: 'Lenin',
            type: 'Person'
          }
        ]
      }).parse(`Yesterday we watch the movie good bye lenin. #popcorn`)
        .then(results => {
          // console.log(JSON.stringify(results, null, 2))
          expect(results).to.be.like([
            {
              "ngram":"good bye lenin",
              "value":{
                "title":"Good Bye Lenin!",
                "type":"Movie"
              },
              "score":1,
              "position":{
                "index": 5,
                "begin": 29,
                "end": 43
              }
            }
          ]);

          done();

        })

      })

      it('should work on a ridiculously large n-gram arity', (done) => {
        new ParseEntities({
          // debug: true,
          fields: 'data',
          maxLength: 27,
          data: [
            {
              data: 'this is a small 5gram'
            },
            {
              data: `this is a very large ngram, likely to make it
              crash on other named entity-extraction libraries`
            },
          ]
        }).parse(`this is a very large ngram, likely to make it
          crash on other named entity-extraction libraries`)
          .then(results => {
            // console.log(JSON.stringify(results, null, 2))
            expect(results).to.be.like([
              {
                "ngram":"this is a very large ngram  likely to make it           crash on other named entity-extraction libraries",
                "value":{
                  "data":"this is a very large ngram, likely to make it\n              crash on other named entity-extraction libraries"
                },
                "score":1,
                "position":{
                  "index": 0,
                  "begin":0,
                  "end":104
                }
              }
            ]);

            done();

          })

        })

        it('should work on a single words with hyphen', (done) => {
          new ParseEntities({
            fields: 'name',
            maxLength: 1,
            data: [
              {
                name: 'marc-olivier'
              },
              {
                name: 'abd-al-qadir'
              }
            ]
          }).parse(`participants: marc-olivier abd-al-qadir`)
            .then(results => {
              // console.log(JSON.stringify(results, null, 2))
              expect(results).to.be.like([{
                "ngram": "marc-olivier",
                "value": {
                  "name": "marc-olivier"
                },
                "score": 1,
                "position": {
                  "index": 2,
                  "begin": 14,
                  "end": 26
                }
              }, {
                "ngram": "abd-al-qadir",
                "value": {
                  "name": "abd-al-qadir"
                },
                "score": 1,
                "position": {
                  "index": 3,
                  "begin": 27,
                  "end": 39
                }
              }]);

              done();

            })

          })
  })
})
