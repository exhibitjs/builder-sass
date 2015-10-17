import sass from 'node-sass';
import path from 'path';

let render;
const scssExt = /\.scss$/;

const defaults = {
  include: '**/*.scss',
};

const permittedOptions = [
  'indentType', 'indentWidth', 'linefeed', 'outputStyle',
  'precision', 'sourceComments',
];

export default function (options) {
  options = Object.assign({}, defaults, options);
  let sassOptions;

  return function *exhibitSass(job) {
    const {
      matches, file, contents, base,
      importFirst,
      util: {Promise, SourceError, _},
    } = job;

    // skip irrelevant files
    if (!matches(options.include)) return contents;

    // block partials
    if (path.basename(file).charAt(0) === '_') return null;

    // establish the output filename
    const outputFile = file.replace(scssExt, '.css');

    // exit fast if the source is empty
    // (necessitated by https://github.com/sass/node-sass/issues/924)
    const source = contents.toString();
    if (!source) return {[outputFile]: ''};

    // keep memos of how imports get resolved, in case we need this info to
    // report an error from a partial
    const rememberedImportContents = {};
    const resolvedImportPaths = {
      stdin: file,
    };

    // establish options for node-sass
    const config = {
      data: source,

      importer: (url, prev, done) => {
        // make a list of possible file paths
        const importingFile = (prev === 'stdin' ? file : prev);
        const resolvedURL = path.normalize(path.join(path.dirname(importingFile), url));
        const projectRootURL = path.normalize(path.join(base, url));

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
            paths.push(resolvedURL);
            paths.push(underscoredURL);
            paths.push(projectRootURL);
            paths.push(underscoredProjectRootURL);
          }
          else {
            paths.push(projectRootURL);
            paths.push(resolvedURL + '.scss');
            paths.push(underscoredURL + '.scss');
            paths.push(projectRootURL + '.scss');
            paths.push(underscoredProjectRootURL + '.scss');
            paths.push(resolvedURL);
          }

          return paths;
        })();

        // try them all in turn
        importFirst(possiblePaths, ['scss', 'css']).then(result => {
          rememberedImportContents[url] = result.contents;
          resolvedImportPaths[url] = result.file;
          done({contents: result.contents.toString(), file: result.file});
        }).catch(() => {
          // send an error **to Sass**, which will send us back a new error
          // including file/line details.
          done(new Error(
            `exhibit-sass: Could not import "${url}" from ${path.dirname(importingFile)}`
          ));
        });
        return;
      },
    };

    // add any user config
    if (!sassOptions) sassOptions = _.pick(options, permittedOptions);
    Object.assign(config, sassOptions);

    // make a promise-returning sass-rendering function
    if (!render) render = Promise.promisify(sass.render);

    // compile!
    try {
      const {css} = yield render(config);

      return {
        [outputFile]: css,
        // [`${outputFile}.map`]: result.map, // TODO
      };
    }
    catch (error) {
      throw new SourceError({
        message: error.message.split('\n')[0],
        path: resolvedImportPaths[error.file] || `unknown(${error.file})`,
        contents: (error.file === 'stdin' ? source : rememberedImportContents[error.file]),
        line: error.line,
        column: error.column,
      });
    }
  };
}
