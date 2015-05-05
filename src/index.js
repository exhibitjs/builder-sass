/*
  TODO:
    remove `knownEntries` and replace with `dependencies`, which is a hash of `importee:entries`.

        - `importee` can be resolved partial or entry filename.
        - `entries` is an array of file objects, all of which will have non-underscored filenames.
        - the entries might not all be *direct* importers of that importee; some might import another file that subsequently imports that importee.

    on every call of the custom importer, once you've resolved the imported filename and got some contents for it, add the original entry (`file`) to the list of entries (after *removing* an existing copy of the same file, if any).
 */

'use strict';

import sass from 'node-sass';
import path from 'path';
import inPlace from 'in-place';

let render;
const scssExt = /\.scss$/;

export default function () {

  const knownEntries = {};

  return function exhibitSass(files) {
    const plugin = this;
    const Promise = plugin.Promise;
    const _ = plugin._;

    if (!render) {
      render = Promise.promisify(sass.render);
    }

    // establish the real array of files we want to work on.
    let partialsFound = false;
    inPlace.filter(files, file => {
      if (path.basename(file.filename).charAt(0) === '_') {
        // it's a partial - skip it, but note we've found it
        partialsFound = true;
        return false;
      }

      // it's an entry - update in the index
      if (file.type === 'delete') {
        delete knownEntries[file.filename]; // whether or not it's there
      }
      else {
        knownEntries[file.filename] = file; // whether update/create
      }

      return true;
    });

    // for now: just add all the entries
    if (partialsFound) {
      Object.keys(knownEntries).forEach(entryFilename => {
        files.push(knownEntries[entryFilename]);
      });
    }

    // and dedupe.
    files = _.uniq(files, 'filename');
    console.log('SCSS FILES TO RENDER:', files);

    return Promise.map(files, (file) => {
      if (file.type === 'delete' || !scssExt.test(file.filename)) {
        return file;
      }

      const cssFilename = file.filename.replace(scssExt, '.css');
      const dirname = path.dirname(file.filename);
      const source = file.contents.toString();

      if (!source) {
        // workaround for https://github.com/sass/node-sass/issues/924
        return {
          filename: cssFilename,
          contents: '',
        };
      }

      const sassOptions = {
        data: source,

        importer: (url, prev, done) => {
          const resolvedURL = path.normalize(path.join(dirname, url));
          const possiblePaths = [];

          const urlParts = resolvedURL.split('/');
          urlParts.push('_' + urlParts.pop());
          const underscoredURL = urlParts.join('/');

          if (scssExt.test(resolvedURL)) {
            global.todo();
            possiblePaths.push(resolvedURL);
            possiblePaths.push(underscoredURL);
          }
          else {
            possiblePaths.push(resolvedURL + '.scss');
            possiblePaths.push(underscoredURL + '.scss');
            possiblePaths.push(resolvedURL);
          }

          Promise.reduce(possiblePaths, (ref, filename) => {
            if (ref) return ref;
            return plugin.readAll(filename);
          }, false).then(contents => {
            if (!contents) {
              done(new Error('Could not find file to satisfy import: "' + url + '"; tried the following in all load paths: ' + possiblePaths.join(', ')));
            }
            else done({contents: contents.toString()});
          });
        },
      };

      return render(sassOptions)
        .then(result => {
          console.log('YOOO');
          return {
            filename: cssFilename,
            contents: result.css,
          };
        })
        .catch(err => {
          console.log(Object.keys(err));
          console.dir(err);

          plugin.emit('error', err);

          return {
            filename: cssFilename,
            contents: null,
          };
        });
    });
  };
}
