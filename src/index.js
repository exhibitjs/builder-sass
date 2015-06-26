import sass from 'node-sass';
import {basename, normalize, join, dirname} from 'path';

let render;
const scssExt = /\.scss$/;

export default function () {

  return function exhibitSass(path, contents) {
    const {Promise, SourceError} = this;

    if (!render) render = Promise.promisify(sass.render);

    // pass non-SCSS files straight through
    if (!scssExt.test(path)) return contents;

    // block SCSS partials
    if (basename(path).charAt(0) === '_') return null;


    // establish the output path
    const cssPath = path.replace(scssExt, '.css');
    const source = contents.toString();

    // quick exit if the source is empty
    // (necessitated by https://github.com/sass/node-sass/issues/924)
    if (!source) {
      const results = {};
      results[cssPath] = '';
      return results;
    }

    // for erroring from partials, remember how imports get resolved
    const rememberedImportContents = {};
    // let actualPrev = path;

    const resolvedImportPaths = {
      stdin: path,
    };

    // establish options for node-sass
    const sassOptions = {
      data: source,

      importer: (url, prev, done) => {
        // make a list of possible file paths
        // console.log('URL', url, 'PREV', prev);

        const importingFile = (prev === 'stdin' ? path : prev);
        // const importingFile = prevLookup[prev];

        // console.log(`\nexhibit-sass import\n  init: ${path}\n  prev: ${prev}\n  file: ${importingFile}\n  impt: ${url}`);

        const resolvedURL = normalize(join(dirname(importingFile), url));
        const projectRootURL = normalize(join(this.base, url));

        const possiblePaths = (() => {
          // rewrite this it's shite
          const paths = [];

          const urlParts = resolvedURL.split('/');
          urlParts.push('_' + urlParts.pop());
          const underscoredURL = urlParts.join('/');

          const urlParts2 = projectRootURL.split('/');
          urlParts2.push('_' + urlParts2.pop());
          const underscoredProjectRootURL = urlParts2.join('/');


          if (scssExt.test(resolvedURL)) {
            // global.todo();
            paths.push(resolvedURL);
            paths.push(underscoredURL);
            paths.push(projectRootURL);
            paths.push(underscoredProjectRootURL);
          }
          else {
            paths.push(resolvedURL + '.scss');
            paths.push(underscoredURL + '.scss');
            paths.push(projectRootURL + '.scss');
            paths.push(underscoredProjectRootURL + '.scss');
            paths.push(resolvedURL);
          }

          return paths;
        })();

        // try them all in turn (later, `this.import` will take an array and do this for us - also checking *all* the possibilities in the local project before resorting to load paths, which will make it faster as it won't have to check disk locations all the time)
        this.import(possiblePaths).then(result => {
          // console.log(`exhibit-sass imported!\n  from (real): ${result.path}`);
          // prevLookup[url] = result.path;
          rememberedImportContents[url] = result.contents;
          resolvedImportPaths[url] = result.path;
          done({contents: result.contents.toString(), file: result.path});
        }).catch(error => {
          // console.log('exhibit-sass ERROR! when importing ' + url, error, error.stack);

          // this is sending an error to Sass, which will send us a new error back including file/line details.
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
        throw new SourceError({
          message: err.message.split('\n')[0],
          path: resolvedImportPaths[err.file] || `unknown(${err.file})`,
          contents: (err.file === 'stdin' ? source : rememberedImportContents[err.file]),
          line: err.line,
          column: err.column,
        });
      })
      .then(result => {
        const results = {};
        results[cssPath] = result.css;

        // todo: add source map

        return results;
      });
  };
}
