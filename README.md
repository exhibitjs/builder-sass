> # sass
>
> **Exhibit.js builder plugin**
>
> Compiles SCSS files with [node-sass](https://github.com/sass/node-sass).
>
> ```sh
> $ npm install -D exhibit-builder-sass
> ```
>
> [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][depstat-image]][depstat-url] [![devDependency Status][devdepstat-image]][devdepstat-url] [![peerDependency Status][peerdepstat-image]][peerdepstat-url]

## Usage

```js
  .use('sass', options)
```

- Non-SCSS files are passed straight through
- As usual with Sass, underscored filenames (e.g. `styles/_foo.scss`) are considered partials and are not compiled (but may be imported)


## Options

The following node-sass options may be set (see node-sass docs for definitions):

- [`indentType`](https://github.com/sass/node-sass#indenttype--v300)
- [`indentWidth`](https://github.com/sass/node-sass#indentwidth--v300)
- [`linefeed`](https://github.com/sass/node-sass#linefeed--v300)
- [`outputStyle`](https://github.com/sass/node-sass#outputstyle)
- [`precision`](https://github.com/sass/node-sass#precision)
- [`sourceComments`](https://github.com/sass/node-sass#sourcecomments)

#### Additional options

> **`include`** (string/array/function) — default: `'**/*.scss'`

Which files to process. Follows Exhibit’s [glob convention](https://github.com/exhibitjs/exhibit/blob/master/docs/glob-convention.md).


---

## License

MIT


<!-- badge URLs -->
[npm-url]: https://npmjs.org/package/exhibit-builder-sass
[npm-image]: https://img.shields.io/npm/v/exhibit-builder-sass.svg?style=flat-square

[travis-url]: http://travis-ci.org/exhibitjs/exhibit-builder-sass
[travis-image]: https://img.shields.io/travis/exhibitjs/exhibit-builder-sass.svg?style=flat-square

[depstat-url]: https://david-dm.org/exhibitjs/exhibit-builder-sass
[depstat-image]: https://img.shields.io/david/exhibitjs/exhibit-builder-sass.svg?style=flat-square
