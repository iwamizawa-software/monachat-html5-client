// monachat.js

var {shell} = require('electron');

var Monachat = require('./js/monachat.jsm');
var $        = require('jquery');
var xmldoc   = require('xmldoc');
var jsonfile = require('jsonfile');


/****************
* Global hashes
****************/
var user = {};
var room = {};
var main = {};


/***********************************
* Placeholders for global elements
***********************************/
var session;

var log_textarea;
var room_data;

var log_button;
var data_button;
var users_button;
var stat_button;
var config_button;
var back_button;
var reenter_button;
var relogin_button;
var proxy_button;

var text_input;

var users_dropdown;

var main_button_table;


/*******************
* Global variables
*******************/
var canvas = document.createElement('CANVAS');
var ctx    = canvas.getContext('2d');

var trip_list;
var prev_input   = [];
var prev_input_n = 0;

var jp_regex = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;

canvas.width  = 128;
canvas.height = 128;


function User(xml)
    {
        this.name      = xml.attr.name  || 'nanashi';
        this.character = xml.attr.type  || 'mona';
        this.stat      = xml.attr.stat  || 'normal';
        this.trip      = xml.attr.trip  || '';
        this.ihash     = xml.attr.ihash || 'no_ihash';
        this.r         = xml.attr.r     || 100;
        this.g         = xml.attr.g     || 100;
        this.b         = xml.attr.b     || 100;
        this.x         = xml.attr.x     || 0;
        this.y         = xml.attr.y     || 400;
        this.scl       = xml.attr.scl   || 100;
    }


function x_scale(x)
    {
        if     (x <  30) { return x_scale(30);  }
        else if(x > 690) { return x_scale(690); }
        else if(isNaN(parseFloat(x))) { return x_scale(30); }
        else
            {
                var [a, b]     = [30, 690];
                var [min, max] = [60, 770];
                
                return parseInt((((b-a)*(x-min))/(max-min)) + a);
            }
    }

function y_scale(y)
    {
        y = 400; /** disabled **/
        
        var [a, b]     = [0, 500];
        var [min, max] = [220, 850];
        
        return parseInt((((b-a)*(y-min))/(max-min)) + a);
    }

function log(el_arr)
    {
        console.log('log', el_arr);
        
        /*************************************************************
        * Change div padding so that every element height is the same
        *************************************************************/
        var padding = 4;
        
        for(var i = 0; i < el_arr.length; i++)
            {
                var el = el_arr[i];
                
                if(el.nodeType == 'TEXT' || el.nodeType == 'A')
                    {
                        if(el.textContent.match(jp_regex))
                            {
                                padding = 2;
                                break;
                            }
                    }
            }
        
        
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
        
        
        log_textarea.append(div);
        log_textarea[0].scrollTop = log_textarea[0].scrollHeight;
    }

function log_newline(n)
    {
        var newline_el = create_nbsp_el(144);
        
        for(var i = 0; i < n; i++) { log([newline_el]); }
    }

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

function create_text_el(line)
    {
        var text_el = document.createElement('TEXT');
        $(text_el).text(line);
        
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
                var height = this.height;
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

function format_log(type, args)
    {
        if(session.room() == 'main') { return; }
        
        console.log(type, args);
        
        var time    = new Date().toLocaleTimeString();
        
        var time_el = document.createElement('TEXT');
        $(time_el).text('['+time+'] ' );
        
        
        if(type == 'enter')
            {
                var id = args[0];
                var {name, character, stat, trip, ihash, r, g, b} = user[id];
                
                var line = '['+time+'] -> '
                    + name      + ' '
                    + '(' + id + ') '
                    + ihash.substr(-6) + ' '
                    + stat      + ' '
                    + character + ' ';

                
                var user_el = create_text_el(line);
                $(user_el).attr('color', 'rgb('+r+' '+g+' '+b+')');
                
                
                var info_el = create_text_el('has logged in.')
                $(info_el).attr('color', 'rgb('+r+' '+g+' '+b+')');

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'exit')
            {
                var id = args[0];
                var {name, character, stat, trip, ihash, r, g, b} = user[id];
                
                var line = '['+time+'] <- '
                    + name      + ' '
                    + '(' + id + ') '
                    + ihash.substr(-6) + ' '
                    + stat      + ' '
                    + character + ' ';
                    'has exited the room';

                
                var user_el = create_text_el(line);
                $(user_el).attr('font-color', 'rgb('+r+' '+g+' '+b+')');

                
                var info_el = create_text_el('has exited the room.')
                $(info_el).attr('color', 'rgb('+r+' '+g+' '+b+')');

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'room')
            {
                var room = args[0];
                
                
                var first_dashed_line_el  = create_dashed_line_el(73);
                var second_dashed_line_el = create_dashed_line_el(73);                
                
                
                var line = 'ROOM '+ room;
                var room_el = create_text_el(line);
                    
                
                var nbsp_el = create_nbsp_el(31);
                
                
                log([first_dashed_line_el]);
                log([nbsp_el, room_el]);
                log([second_dashed_line_el]);
            }
        else if(type == 'set')
            {
                /** Unimplemented **/
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
                var line = name+' '+ihash.substr(-6) + ': ';
                
                var user_el = create_text_el(line);
                $(user_el).attr('class', 'log_cmt_user')
                    .css('color', 'rgb('+r+', '+g+', '+b+')');

                
                /***************
                * Comment data
                ***************/
                var cmt_el;
                
                if(is_url(cmt))
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
                                            cmt_el = create_a_el(cmt);
                                            var img_el = create_img_el(cmt);
                                            
                                            log([time_el, user_el, cmt_el]);
                                            log_newline();
                                            log([img_el]);
                                            log_newline();
                                        }
                                    else
                                        {
                                            cmt_el = create_a_el(cmt);
                                            log([time_el, user_el, cmt_el]);
                                        }
                                });
                    }
                else
                    {
                        cmt_el = create_text_el(cmt);
                        log([time_el, user_el, cmt_el]);
                    }
            }
        else if(type == 'triplist')
            {
                var data = args.shift();
                var id   = args.shift();
                
                var dashed_line = create_dashed_line_el(72);
                
                var line = 'Trips found for ' + data + ' (id ' + id + '):';
                var info_el = create_text_el(line);
                
                log([info_el]);

                for(var i = 0; i < args.length; i++)
                    {
                        var nbsp_el = create_nbsp_el(4);
                        
                        line = args[i];
                        var res_el = create_text_el(line);
                        
                        log([nbsp_el, res_el]);
                    }

                
                log_newline();
            }
        else if(type == 'error')
            {
                var [error] = args;
                
                var error_el = create_text_el('Error: '+error);
                $(error_el).css('color', 'red');
                
                log([time_el, error_el]);
            }
        else
            {
                var text_el = create_text_el('Command not recognized: '+args[0]);
                
                log(text_el);
            }
    }

function is_url(line)
    {
        //var regex = new RegExp('#\b(([\w-]+://?|www[.])[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|/)))');
        var regex = new RegExp('http', 'i');
        
        if(regex.test(line)) { return true;  }
        else                 { return false; }
    }

function clear_screen()
    {
        if(session.room() == 'main')
            {
                $('.main_room_button').remove();
                $('#main_title').remove();
            }
        else
            {
                $('.user_div').remove();
            }
    }

function refresh_main()
    {
        var sorted_rooms = [];
        
        /*****************************
        * Sort list of rooms in main
        *****************************/
        for(var key in main) { sorted_rooms.push(key); }
        sorted_rooms = sorted_rooms.sort( function(a, b) { return a-b } );
        
        
        clear_screen();
        
        
        var total_users = 0;
        var room_n      = 0;
        for(var key in main)
            {
                console.log(main[key]);
                total_users += main[key];
                if(main[key] != 0) { room_n++; }
            }

        var text = document.createElement('TEXT');
        $(text).text('Monachat ('+room_n+' rooms, '+total_users+' users)')
            .attr('id', 'main_title')
            .css('position', 'absolute')
            .css('left', 100)
            .css('top', 30);

        main_view.append(text);

        
        /**************************
        * Add all room with users
        **************************/
        for(let i = 0; i < sorted_rooms.length; i++)
            {
                let [n, c] = [ sorted_rooms[i], main[ sorted_rooms[i] ] ];
                
                if(c > 0)
                    {
                        n = sorted_rooms[i];
                        var button = document.createElement('button');
                        
                        $(button).attr('id', 'main_room_button_'+n )
                            .attr('class', 'main_room_button')
                            .text( 'Room ' + n + ': ' + c)
                            .on('click', function()
                                {
                                    format_log('room', [sorted_rooms[i]]);
                                    change_room(sorted_rooms[i]);
                                });
                        
                        main_button_table.append(button);
                    }
            }
    }

function append_div(id)
    {
        /********************************
        * Create character image object
        ********************************/
        var img = new Image();
        
        img.onload = function()
            {
                var [width, height] = [img.width, img.height];
                
                ctx.drawImage(img, 0, 0);
                var data = ctx.getImageData(0, 0, width, height);
                
                
                if(user[id].r != 100 || user[id].g != 100 || user[id].b != 100)
                    {
                        for(var i = 0; i < data.data.length; i += 4)
                            {
                                var r = data.data[i];
                                var g = data.data[i+1];
                                var b = data.data[i+2]
                        
                        
                                /***********************
                                * Replace white pixels
                                ***********************/
                                if(r == 255 && g == 255 && b == 255)
                                    {
                                        data.data[i]   = user[id].r;
                                        data.data[i+1] = user[id].g;
                                        data.data[i+2] = user[id].b;
                                    }
                            }
                    }

                
                /******************************************************
                * Convert canvas data to img and set it as img source
                ******************************************************/
                ctx.putImageData(data, 0, 0);
                
                img.onload = '';
                img.src    = canvas.toDataURL();
                
                ctx.clearRect(0, 0, height, width);
        
                                
                $(img).attr('id', 'user_div_'+id+'_img')
                    .attr('class', 'user_div_img')
                    .attr('draggable', false)
                    .attr('width', img.width)
                    .attr('height', img.height)
                    .css('transform', 'rotatey('+ (user[id].scl == -100 ? 180 : 0) +'deg)');
            

                /*******************************
                * Create user container object
                *******************************/
                var div = document.createElement('div');
                
                $(div).attr('id', 'user_div_'+id)
                    .attr('class', 'user_div')
                    .attr('draggable', false)
                    .css('left', x_scale(user[id].x || 0  ))
                    .css('top',  y_scale(user[id].y || 400));
                
                
                /*******************************
                * Create user data text object
                *******************************/
                var user_data = document.createElement('text');
                
                $(user_data).attr('class', 'user_div_data');
                
                user_data.innerHTML = '<br>' + (user[id].name || 'nanashi')
                    + '<br>' + user[id].ihash.substr(-6);
        
                if(user[id].trip) { user_data.innerHTML = user_data.innerHTML + '<br>' + user[id].trip; }
                
                
                /*************************
                * Append it to room_view
                *************************/
                $(div).append(img)
                    .append(user_data);
                
                $('#room_view').append(div);
            }
        
        img.src = './character/'+user[id].character+'.png';
    }

function move_div(id)
    {
        var div = $('#user_div_'+id);
        var img = $('#user_div_'+id+'_img');
        
        /**********************************************************
        * Move user div to scaled x and y and rotate if neccesary
        **********************************************************/
        div.css('left', x_scale(user[id].x));
        div.css('top', y_scale(user[id].y));
        
        img.css('transform', 'rotatey('+ (user[id].scl == -100 ? 180 : 0) +'deg)');
    }

function remove_div(id)
    {
        var div = $('#user_div_'+id);
        
        /****************************
        * Remove user container div
        ****************************/
        div.remove();
    }

function show_users_dropdown()
    {
        var keys_n = 0;
        
        users_dropdown.children().remove();
        
        for(let id in room)
            {
                var {name, ihash} = user[id];
                
                var a = document.createElement('A');
                
                $(a).text(name + ' (' + id + ') ' + ihash.substr(-6))
                    .attr('id', 'users_dropdown_el')
                    .on('click', () => alert(id));
                
                users_dropdown.append(a);
                
                $(a).append('<br>');
                
                keys_n++;
            }
        
        users_dropdown.css('top', 300-keys_n*15);
        
        users_dropdown.toggle();
    }
    
function change_room(room)
    {
        if(room == 'main')
            {
                /**********************************
                * Clear room and room button list
                **********************************/
                
                clear_screen();
                
                room_view.hide();
                main_view.show();
            }
        else
            {
                main = {};
                main_view.hide();
                room_view.show();
            }
        
        
        session.room(room);
    }

function add_trip(id)
    {
        var {name, ihash} = user[id];
        
        if(trip_list[ihash] == undefined)
            {
                trip_list[ihash] = [name];
            }
        else
            {
                if(!trip_list[ihash].includes(name))
                    {
                        trip_list[ihash].push(name);
                    }
            }
    }

function write_trip_list()
    {
        var n = 0;
        for(var key in trip_list) { n++; }
        
        if(n)
            {
                jsonfile.writeFileSync('trip.json', trip_list);
            }
    }

function search_trip(type, data)
    {
        if(type == 'id')
            {
                var id = data;
                if(user[id] == undefined)
                    {
                        format_log('error', ['User with id ' + id + 'doesnt exist.']);
                        return;
                    }
                
                var ihash = user[id].ihash;
                if(trip_list[ihash] == undefined)
                    {
                        format_log('error', ['No trips stored for this trip.']);
                        return;
                    }

                console.log(trip_list[ihash]);
                format_log('triplist', [ihash, id].concat(trip_list[ihash]));
            }
        else if(type == 'trip')
            {
                var ihash = data;
                if(trip_list[ihash] == undefined)
                    {
                        format_log('error', ['No trips stored for this trip.']);
                        return;
                    }
                
                format_log('triplist', [ihash, 'unknown'].concat(trip_list[ihash]));
            }
        else if(type == 'name')
            {
                var name = data;
                var match = [name, 'unknown'];
                
                for(var key in trip_list)
                    {
                        var trip = key;
                        
                        for(var i = 0; i < trip_list[key].length; i++)
                            {
                                if(trip_list[key][i] == name)
                                    {
                                        match.push(key);
                                        break;
                                    }
                            }
                    }
                
                if(data.length == 2)
                    {
                        format_log('error', 'No user with name ' + name + ' found.');
                    }
                else
                    {
                        format_log('triplist', match);
                    }
            }
    }

function tinyurl(long_url)
    {
        var url = 'http://tinyurl.com/api-create.php?url=' + long_url;
        
        $.get(url, function(short_url)
            {
                session.comment(short_url);
            });
    }

function signal_handler(msg)
    {
        console.log(msg);
        
        /************************
        * Discard first message
        ************************/
        if(msg.match(/^\+/))
            {
                return;
            }
        else
            {
                var xml = new xmldoc.XmlDocument(msg);
                
                
                if(xml.name == 'CONNECT')
                    {
                        var id = xml.attr.id;
                        
                        console.log('connected', id);
                        
                        session.id(id);
                    }
                else if(xml.name == 'UINFO')
                    {
                        console.log('uinfo', xml.attr);
                    }
                else if(xml.name == 'COUNT')
                    {
                        /************************************
                        * COUNT is void of children in main
                        ************************************/
                        if(xml.children[0] == undefined)
                            {
                                var [n, c] = [xml.attr.n, xml.attr.c];
                                
                                console.log('room count', xml);
                                console.log('c:', c, 'n:', n);
                                
                                room_data.text( 'Room: '+n+' Users: '+c );
                            }
                        else
                            {
                                console.log('main count', xml);
                                
                                /*******************************
                                * Refresh and update main_view
                                *******************************/
                                for(var i = 0; i < xml.children.length; i++)
                                    {
                                        var child = xml.children[i];
                                        var [n, c] = [child.attr.n, child.attr.c];
                                        
                                        main[n] = c;
                                        refresh_main();
                                        
                                        console.log('main child', child.attr);
                                    }
                            }
                    }
                else if(xml.name == 'ROOM')
                    {
                        console.log('room', xml);
                        
                        for(var i = 0; i < xml.children.length; i++)
                            {
                                var child = xml.children[i];
                                var id    = child.attr.id;
                                
                                /**********************************************************
                                * Add user to both user and room list and share reference
                                **********************************************************/
                                user[id] = new User(child);
                                room[id] = user[id];
                                add_trip(id);
                                
                                /************************
                                * Add user to room_view
                                ************************/
                                append_div(id);
                                
                                console.log('child', child.attr);
                            }
                    }
                else if(xml.name == 'ENTER')
                    {
                        var id = xml.attr.id;
                        
                        user[id] = new User(xml);
                        room[id] = user[id];
                        add_trip(id);
                        
                        append_div(id);
                        
                        console.log('enter', xml.attr);
                        
                        if(id != session.id()) { format_log('enter', [id]); }
                    }
                else if(xml.name == 'EXIT')
                    {
                        var id = xml.attr.id;
                        
                        console.log('exit', xml.attr);
                        
                        if(room[id] != undefined) { room[id] = undefined; }
                        
                        if(id != session.id()) { format_log('exit', [id]); }
                        
                        if(id == session.id())
                            {
                                clear_screen();
                                write_trip_list();
                            }
                        else
                            {
                                remove_div(id);
                            }
                    }
                else if(xml.name == 'SET')
                    {
                        var id = xml.attr.id;
                        
                        /***********************
                        * It moves three times
                        ***********************/
                        
                        console.log('set', xml.attr);
                        format_log('set', [xml.attr]);
                        
                        if(xml.attr.x != undefined)
                            {
                                user[id].x = xml.attr.x;
                                move_div(id);
                            }
                        if(xml.attr.y != undefined)
                            {
                                user[id].y = xml.attr.y;
                                move_div(id);
                            }
                        if(xml.attr.scl != undefined)
                            {
                                user[id].scl = xml.attr.scl;
                                move_div(id);
                            }
                    }
                else if(xml.name == 'IG')
                    {
                        console.log('Ignore', xml.attr);
                    }
                else if(xml.name == 'COM')
                    {
                        var [id, cmt] = [xml.attr.id, xml.attr.cmt];
                        
                        console.log('Comment:', cmt);
                        format_log('com', [id, cmt]);
                    }
                else
                    {
                        console.log('Unknown message');
                        console.log('msg:',msg);
                        console.log('xml',xml);
                        log('Unknown message');
                    }
            }
    }

function handle_command(com)
    {
        com = com.split(' ');
        
        console.log('com', com);
        
        if(com[0] == 'name')            { session.name(com[1]);                }
        else if(com[0] == 'character')  { session.character(com[1]);           }
        else if(com[0] == 'stat')       { session.stat(com[1]);                }
        else if(com[0] == 'trip')       { session.trip(com[1]);                }
        else if(com[0] == 'r')          { session.r(com[1]);                   }
        else if(com[0] == 'g')          { session.g(com[1]);                   }
        else if(com[0] == 'b')          { session.b(com[1]);                   }
        else if(com[0] == 'rgb')        { session.rgb(com[1], com[2], com[3]); }
        else if(com[0] == 'x')          { session.x(com[1]);                   }
        else if(com[0] == 'y')          { session.y(com[1]);                   }
        else if(com[0] == 'scl')        { session.scl();                       }
        else if(com[0] == 'reenter')    { session.reenter();                   }
        else if(com[0] == 'site')       { session.site(com[1])                 }
        else if(com[0] == 'timeout')    { session.timeout(com[1])              }
        else if(com[0] == 'searchid')   { search_trip('id', com[1]);           }
        else if(com[0] == 'searchtrip') { search_trip('trip', com[1]);         }
        else if(com[0] == 'searchname') { search_trip('name', com[1]);         }
        
        else if(com[0] == 'server')
            {
                var res = session.server(com[1]);
                
                if(!res)
                    {
                        format_log('error', 'Server name not valid.');
                    }
                else
                    {
                        clear_screen();
                    }
                
            }
        else if(com[0] == 'default')
            {
                clear_screen();
                session.set_default();
            }
        else if(com[0] == 'invisible')
            {
                clear_screen();
                session.invisible();
            }
        else if(com[0] == 'nanashi')
            {
                clear_screen();
                session.nanashi();
            }
        else if(com[0] == 'copy')
            {
                if(user[com[1]] == undefined)
                    {
                        format_log('error', 'User with id ' + id + 'doesnt exist.');
                    }
                else
                    {
                        clear_screen();
                        session.copy(user[com[1]]);
                    }
            }
        else if(com[0] == 'random')
            {
                clear_screen();
                session.random(com[1]);
            }
        else if(com[0] == 'room')
            {
                change_room(com[1]);
                
                //session.client.pause();
                //session.client.resume();
                
                format_log('room', [com[1]]);
            }
        else if(com[0] == 'proxy')
            {
                clear_screen();
                session.proxy();
            }
        else if(com[0] == 'relogin')
            {
                clear_screen();
                session.relogin();
            }
        else if(com[0] == 'tinyurl')
            {
                tinyurl(com[1]);
            }
        else
            {
                format_log('error', ['Command '+com[0]+' not recognized.']);
            }
    }


window.onload = function()
{
    session = new Monachat(signal_handler);
    session.connect();
    
    
    /**********************
    * Set global elements
    **********************/
    main_view = $('#main_view');
    room_view = $('#room_view');
    
    main_button_table = $('#main_button_table');
    
    log_button    = $('#log_button');
    data_button   = $('#data_button');
    users_button  = $('#users_button');
    stat_button   = $('#stat_button');
    config_button = $('#config_button');
    back_button   = $('#back_button');
    reenter_button = $('#reenter_button');
    relogin_button = $('#relogin_button');
    proxy_button   = $('#proxy_button');
    
    log_textarea = $('#log_textarea');
    
    text_input   = $('.text_input');
    
    users_dropdown = $('#users_dropdown');
    
    room_data    = $('#room_data');
    
    
    trip_list = jsonfile.readFileSync('trip.json');
    
    
    //main_view.append(text_input);
    
    
    /*******************************
    * Toggle log textarea on click
    *******************************/
    log_button.on('click', function()
        {
            log_textarea.toggle();
        });

    reenter_button.on('click', function()
        {
            session.reenter();
        });
    relogin_button.on('click', function()
        {
            clear_screen();
            session.relogin();
        });
        
    back_button.on('click', function()
        {
            change_room('main');
        });
    
    users_button.on('click', function()
        {
            show_users_dropdown();
        });
        
    proxy_button.on('click', function()
        {
            clear_screen();
            
            session.proxy();
        });
    

    log_textarea.attr('edditable', false);
    
    
    /**************************
    * Input bar keydown event
    **************************/
    text_input.on('keydown', function(e)
        {
            if(e.key == 'Enter' && e.target.value != '')
                {
                    var text = e.target.value;
                    
                    if(text[0] == '/') { handle_command(text.substr(1)); }
                    else               { session.comment(text);          }
                    
                    e.target.value = '';
                    
                    prev_input.push(text);
                    prev_input_n = 0;
                }
            else if(e.key == 'ArrowUp')
                {
                    if(prev_input.length != 0 && prev_input_n < prev_input.length)
                        {
                            prev_input_n++;
                            
                            text_input.val( prev_input[prev_input.length - prev_input_n] );
                        }
                }
            else if(e.key == 'ArrowDown')
                {
                    if(prev_input.length != 0 && prev_input_n > 0)
                        {
                            prev_input_n--;
                            
                            text_input.val( prev_input[prev_input.length - prev_input_n] );
                        }
                }
        });
}