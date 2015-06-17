import sass from 'node-sass';
import {basename, normalize, join, dirname} from 'path';

let render;
const scssExt = /\.scss$/;

export default function () {

  return function exhibitSass(path, contents) {
    const {Promise, SourceError} = this;

    if (!render) render = Promise.promisify(sass.render);

    // pass non-sass files straight through
    if (!scssExt.test(path)) return true;

    // skip SCSS partials
    if (basename(path).charAt(0) === '_') return null;


    // SITUATION: this is an SCSS entry file that we need to process.


    // establish the output path
    const cssFilename = path.replace(scssExt, '.css');
    const source = contents.toString();

    // quick exit if the source is empty (in fact necessitated by https://github.com/sass/node-sass/issues/924)
    if (!source) return {path: cssFilename, contents: ''};

    // for erroring from partials, remember how imports get resolved
    const rememberedImportContents = {};
    // let actualPrev = path;

    const prevLookup = {
      stdin: path,
    };

    // establish options for node-sass
    const sassOptions = {
      data: source,

      importer: (url, prev, done) => {
        // make a list of possible file paths
        // const importingFile = (prev === 'stdin' ? path : join(dirname(path), prev));
        const importingFile = prevLookup[prev];

        // console.log(`\nexhibit-sass import\n  init: ${path}\n  prev: ${prev}\n  file: ${importingFile}\n  impt: ${url}`);

        const resolvedURL = normalize(join(dirname(importingFile), url));
        const projectRootURL = normalize(join(this.base, url));

        // console.log('IMPORTER IN SASS', 'url:', url, '... prev:', prev, '... resolved:', resolvedURL);
        // ALSO need to do the project root URL underscored... and generally rewrite this shite

        const possiblePaths = [];

        const urlParts = resolvedURL.split('/');
        urlParts.push('_' + urlParts.pop());
        const underscoredURL = urlParts.join('/');

        const urlParts2 = projectRootURL.split('/');
        urlParts2.push('_' + urlParts2.pop());
        const underscoredProjectRootURL = urlParts2.join('/');


        if (scssExt.test(resolvedURL)) {
          // global.todo();
          possiblePaths.push(resolvedURL);
          possiblePaths.push(underscoredURL);
          possiblePaths.push(projectRootURL);
          possiblePaths.push(underscoredProjectRootURL);
        }
        else {
          possiblePaths.push(resolvedURL + '.scss');
          possiblePaths.push(underscoredURL + '.scss');
          possiblePaths.push(projectRootURL + '.scss');
          possiblePaths.push(underscoredProjectRootURL + '.scss');
          possiblePaths.push(resolvedURL);
        }

        // console.log('\nexhibit-sass possiblePaths\n  ' + possiblePaths.join('\n  '));


        // try them all in turn (later, `this.import` will take an array and do this for us - also checking *all* the possibilities in the local project before resorting to load paths, which will make it faster as it won't have to check disk locations all the time)
        this.import(possiblePaths).then(result => {
          // console.log(`exhibit-sass imported!\n  from (real): ${result.path}`);
          prevLookup[url] = result.path;
          rememberedImportContents[url] = result.contents;
          done({contents: result.contents.toString()});
        }).catch(error => {
          // console.log('exhibit-sass ERROR! when importing ' + url, error, error.stack);

          done(new Error(
            `exhibit-sass: Could not find file to satisfy import: "${url}"; tried the ` +
            `following: ${possiblePaths.join(', ')}`
          ));
        });
        return;
      },
    };


    return render(sassOptions)
      .catch(err => {
        console.dir(err);

        throw new SourceError({
          message: err.message,
          path: (err.file === 'stdin' ? path : err.file),
          text: (err.file === 'stdin' ? source : rememberedImportContents[err.file]),
          line: err.line,
          column: err.column,
        });
      })
      .then(result => {
        const results = {};
        results[cssFilename] = result.css;

        // todo: add source map

        return results;
      });
  };
}
