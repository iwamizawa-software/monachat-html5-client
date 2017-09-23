// encode files to images

module.exports = new function()
    {
        return {
            encode: function(url)
                {
                    var buffer = fs.readFileSync(url, {encoding: 'base64'});
                    //fs.writeFileSync('test.png', buffer);
                    console.log(buffer);
                    
                    return;
                    
                    var size = Math.ceil( Math.sqrt( buffer.length ) );
                    
                    var canvas = document.createElement('canvas');
                    var ctx    = canvas.getContext('2d');
                    var data   = ctx.getImageData(0, 0, size, size);
                    
                    console.log(buffer, buffer.length, size, canvas, ctx);
                    
                    
                    data.data = buffer;
                    
                    for(var px = 0; px < buffer.length; px ++)
                        {
                            data.data[px] = buffer[px];
                        }
                    
                    ctx.putImageData(data, 0, 0);
                    
                    console.log(buffer.length, data.data.length);
                    
                    
                    $(canvas).width(size)
                        .height(size)
                        .css('border', '1px solid black');
                    
                    log([canvas]);
                },
            
            decode: function(url)
                {
                    var buffer = fs.readFileSync(url);
                }
        };
    }