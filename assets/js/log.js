// log module
// depends on user
var util = require('./util.js');


function Log(area)
    {
        this.area     = area;
        
        this.log      = log;
        this.format   = format;
        this.save_log = save_log;
    }

module.exports = Log;


function log(el_arr)
    {
        console.log('log', el_arr);
        
        /*************************************************************
        * Change div padding so that every element height is the same
        *************************************************************/
        var padding = 4;
        /*
        for(var i = 0; i < el_arr.length; i++)
            {
                var el = el_arr[i];
                
                if(el.nodeType == 'TEXT' || el.nodeType == 'A')
                    {
                        if(el.textContent.match(jp_regex))
                            {
                                //padding = 2;
                                break;
                            }
                    }
            }
        */
        
        /*********************
        * Create div element
        *********************/
        var div = document.createElement('DIV');
        $(div).attr('class', 'log_div')
            .css('padding-top', padding);
        
        
        for(var i = 0; i < el_arr.length; i++)
            {
                var el = el_arr[i];
                
                /********************************
                * Change default color to black
                ********************************/
                if($(el).css('color') == 'rgb(100, 100, 100)')
                    {
                        $(el).css('color', 'rgb(0, 0, 0)');
                    }
                
                $(div).append(el_arr[i]);
            }
        
        
        this.area.append(div);
        this.area[0].scrollTop = this.area[0].scrollHeight;
    }

function format(type, args)
    {
        if(session.room() == 'main') { return; }
        
        console.log(type, args);
        
        var time    = new Date().toLocaleTimeString();
        var time_el = util.create_text_el('['+time+'] ');
        
        
        if(type == 'enter')
            {
                var id = args[0];
                var {name, character, stat, trip, ihash, r, g, b} = user[id];

                
                var user_el = util.create_text_el
                    (
                        '--> '
                        + name             + ' '
                        + '(' + id + ') '
                        + ihash.substr(-6) + ' '
                        + stat             + ' '
                        + character        + ' ',
                        
                        r, g, b
                    );
                
                
                var info_el = util.create_text_el('has logged in.');

                
                this.log([time_el, user_el, info_el]);
            }
        else if(type == 'exit')
            {
                var id = args[0];
                var {name, character, stat, trip, ihash, r, g, b} = user[id];

                var user_el = util.create_text_el
                    (
                        '<-- '
                        + name             + ' '
                        + '(' + id + ') '
                        + ihash.substr(-6) + ' ',
                        
                        r, g, b
                    );
                
                var info_el = util.create_text_el('has exited the room.')

                
                this.log([time_el, user_el, info_el]);
            }
        else if(type == 'room')
            {
                var room = args[0];
                
                
                var first_dashed_line_el  = util.create_dashed_line_el(73);
                var second_dashed_line_el = util.create_dashed_line_el(73);                
                
                
                var line = 'ROOM '+ room;
                var room_el = util.create_text_el(line);
                    
                
                var nbsp_el = util.create_nbsp_el(31);
                
                
                this.log([first_dashed_line_el]);
                this.log([nbsp_el, room_el]);
                this.log([second_dashed_line_el]);
            }
        else if(type == 'stat')
            {
                var id = args[0];
                var {name, character, stat, trip, ihash, r, g, b} = user[id];

                var user_el = util.create_text_el
                    (
                        name               + ' '
                        + '(' + id + ') '
                        + ihash.substr(-6) + ' ',
                        
                        r, g, b
                    );

                console.log(user_el);
                
                var info_el = util.create_text_el('changed status to ' + stat);

                
                this.log([time_el, user_el, info_el]);
            }
        else if(type == 'ig')
            {
                /** Unimplemented **/
            }
        else if(type == 'com')
            {
                var [id, cmt] = args;
                var {name, trip, ihash, r, g, b} = user[id];
                
                
                /************
                * User data
                ************/
                var user_el = util.create_text_el
                    (
                        name + ' '
                        + ihash.substr(-6) + ': ',
                        
                        r, g, b
                    );
                
                
                $(user_el).attr('class', 'log_cmt_user');

                
                /***************
                * Comment data
                ***************/
                var cmt_el;
                
                if(util.is_url(cmt))
                    {
                        /********************************************
                        * Request headers to check if it's an image
                        ********************************************/
                        $.ajax({ type: 'HEAD', async: true, url: cmt })
                            .done( function(msg, data, jqXHR)
                                {
                                    var type = jqXHR.getResponseHeader('content-type');
                                    var size = jqXHR.getResponseHeader('content-length');
                                    
                                    /************************************************
                                    * If it's an image smaller than 20mb, render it
                                    ************************************************/
                                    if(type.match('image') && size/1024 < 20000)
                                        {
                                            cmt_el     = util.create_a_el(cmt);
                                            var img_el = util.create_img_el(cmt);
                                            
                                            this.log([time_el, user_el, cmt_el]);
                                            log_newline();
                                            this.log([img_el]);
                                            log_newline();
                                        }
                                    else
                                        {
                                            cmt_el = util.create_a_el(cmt);
                                            this.log([time_el, user_el, cmt_el]);
                                        }
                                });
                    }
                else
                    {
                        cmt_el = util.create_text_el(cmt);
                        this.log([time_el, user_el, cmt_el]);
                    }
            }
        else if(type == 'triplist')
            {
                var data = args.shift();
                var id   = args.shift();
                
                var dashed_line = util.create_dashed_line_el(72);
                
                var line = 'Trips found for ' + data + ' (id ' + id + '):';
                var info_el = util.create_text_el(line);
                
                this.log([info_el]);

                for(var i = 0; i < args.length; i++)
                    {
                        var nbsp_el = util.create_nbsp_el(4);
                        
                        var res_el = util.create_text_el(args[i]);
                        
                        this.log([nbsp_el, res_el]);
                    }

                
                log_newline();
            }
        else if(type == 'error')
            {
                var [error] = args;
                
                var error_el = util.create_text_el
                    (
                        'Error: ' + error,
                        
                        255, 0, 0
                    );
                
                this.log([time_el, error_el]);
            }
        else
            {
                var text_el = util.create_text_el('Command not recognized: '+args[0]);
                
                this.log(text_el);
            }
    }
function log_newline(n)
    {
        var newline_el = util.create_nbsp_el(144);
        
        for(var i = 0; i < n; i++) { this.log([newline_el]); }
    }
function save_log()
    {
        var text = '';
        
        var date = new Date().toLocaleString().replace(/\/|:/g, '-');
        
        
        /*******************************************************
        * Add the text of all div elements with a \r\n newline 
        *******************************************************/
        var children = this.area.children();
        
        for(var i = 0; i < children.length; i++)
            {
                text += $(children[i]).text();
                text += '\r\n';
            }
        
        /***************************************
        * Create log folder if there isn't one
        ***************************************/
        try        { fs.readdirSync('log'); }
        catch(err) { fs.mkdirSync('log');   }
        
        
        fs.writeFileSync('log/'+date+'.txt', text);
    }