var sass = require('node-sass');

var options = {
  data: 'body { p { color: blue; } }'
};

console.log(options);

sass.render(options, function (err, result) {
  // this is never called
  console.log('result', result);
});



// var result = sass.renderSync(options);
// // result.css is correct
