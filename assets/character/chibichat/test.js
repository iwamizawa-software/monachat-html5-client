var fs = require('fs');
var child = require('child_process');

var folder = fs.readdirSync('.');

var n = 0;

for(var i = 0; i < folder.length; i++)
  {
    console.log(n);
    child.spawn('magick', [folder[i], '-transparent', 'black', n+'_transparent.png']);
    n++;
  }

//console.log(child);