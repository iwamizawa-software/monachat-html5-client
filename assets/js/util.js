var request = require('request');

var $ = require('jquery');


var Util = function()
    {
        this.is_url = is_url;
        this.upload_image = upload_image;
        this.upload_file = upload_file;
    };

module.exports = new Util();


function create_text_el(line, r, g, b)
    {
        var text_el = document.createElement('TEXT');
        $(text_el).text(line);
        
        if(r != undefined && g != undefined && b != undefined)
            {
                $(text_el).css('color', 'rgb('+r+', '+g+', '+b+')');
            }
        
        return text_el;
}

function is_url(line)
    {
        //var regex = new RegExp('#\b(([\w-]+://?|www[.])[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|/)))');
        var regex = new RegExp('^https?:\/\/|^www\\.', 'i');
        
        if(regex.test(line)) { return true;  }
        else                 { return false; }
    }

function upload_image(path)
    {
        var file = fs.readFileSync(path, 'base64');
        
        $.ajax
            ({
                method : 'POST',
                url    : 'https://api.imgur.com/3/image',
                headers: { 'Authorization': 'Client-ID 321a474bd566cbf' },
                data   : { 'image': file, 'type': 'base64' },
                
                success: function(res) { session.comment(res.data.link); },
                error  : function(err) { alert('error', err); }
            });
    }

function upload_file(path)
    {
        var file = fs.createReadStream(path);
        
        console.log('Uploading', path, '...');
        
        var text_el = create_text_el('Uploading ' + path + '...');
        log([log_time_el(), text_el]);
        
        request.post
            (
                {
                    url: 'https://anonfile.com/api/upload',
                    formData: { 'file': file }
                },
                
                function(err, res, data)
                    {
                        if(err) { console.log('Error:', err); return; }
                        
                        var json = JSON.parse(data);
                        session.comment(json.data.file.url.short);
                    }
            );
    }