var {shell} = require('electron');
var request = require('request');

var $ = require('jquery');


var Util = function()
    {
        this.create_newline_el = create_newline_el;
        this.create_nbsp_el = create_nbsp_el;
        this.create_text_el = create_text_el;
        this.create_dashed_line_el = create_dashed_line_el;
        this.create_a_el = create_a_el;
        this.create_img_el = create_img_el;
        this.is_url = is_url;
        this.upload_image = upload_image;
        this.upload_file = upload_file;
    }

module.exports = new Util();


function create_newline_el(n)
    {
        var newline_el = document.createElement('BR');
        $(newline_el).css('height', '100')
            .attr('class', 'log_nbsp_el');
        
        return newline_el;
    }

function create_nbsp_el(n)
    {
        var nbsp_el = document.createElement('NBSP');
        nbsp_el.innerHTML = '&nbsp'.repeat(n);
        
        return nbsp_el;
    }

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

function create_dashed_line_el(n)
    {
        var dashed_line = '-'.repeat(n);
        
        var dashed_line_el = document.createElement('TEXT');
        $(dashed_line_el).text(dashed_line);
        
        
        return dashed_line_el;
    }

function create_a_el(url)
    {
        var a_el = document.createElement('A');
        
        $(a_el).text(url)
            .attr('href', url)
            .css('user-select', 'none')
            .on('click', function(e)
                {
                    e.preventDefault();
                    
                    shell.openExternal(url);
                });

        return a_el;
    }

function create_img_el(url)
    {
        var img_el = document.createElement('IMG');
        $(img_el).attr('src', url)
            .attr('href', url)
            .on('click', function(e)
                {
                    e.preventDefault();
                    
                    shell.openExternal(url);
                });;

        img_el.onload = function()
            {
                var width  = this.width;
                var height7 = this.height;
                console.log(width, height);
                while(width > 500)
                    {
                        width  = parseInt(width/2);
                        height = parseInt(height/2);
                    }

                this.width  = width;
                this.height = height;
            }


        return img_el;
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