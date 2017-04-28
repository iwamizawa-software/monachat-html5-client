// monachat.js

var Monachat = require('./js/monachat.jsm');
var $        = require('jquery');
var xmldoc   = require('xmldoc');


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
var text_input;
var room_data;

var main_button_table;


/*******************
* Global variables
*******************/
var canvas = document.createElement('CANVAS');
var ctx    = canvas.getContext('2d');

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
        var [a, b]     = [0, 700];
        var [min, max] = [50, 1000];
        
        return parseInt((((b-a)*(x-min))/(max-min)) + a);
    }

function y_scale(y)
    {
        y = 400; /** disabled **/
        
        var [a, b]     = [0, 500];
        var [min, max] = [220, 850];
        
        return parseInt((((b-a)*(y-min))/(max-min)) + a);
    }

function log(text)
    {
        log_textarea.text( log_textarea.text() + text+'\n' )
            //.attr('scrollTop', log_textarea.attr('scrollHeight')+1);
        
        log_textarea[0].scrollTop = log_textarea[0].scrollHeight;
    }

function format_log(type, args)
    {
        if(session.room() == 'main') { return; }
        
        
        var time = new Date().toLocaleTimeString();
        
        if(type == 'enter')
            {
                var id = args[0];
                var {name, character, stat, trip, ihash, r, g, b} = user[id];
                
                var line = '['+time+'] -> '
                    + name      + ' '
                    + ihash     + ' '
                    + character + ' '
                    + stat      + ' '
                    + 'has logged in';

                log(line);
            }
        else if(type == 'exit')
            {
                var id = args[0];
                var {name, character, stat, trip, ihash, r, g, b} = user[id];
                
                var line = '['+time+'] <- '
                    + name      + ' '
                    + ihash     + ' '
                    + character + ' '
                    + stat      + ' '
                    + 'has exited the room';

                log(line);
            }
        else if(type == 'room')
            {
                var room = args[0];
                
                var dashed_line = '-'.repeat(72);
                var line = '\n'
                    + dashed_line
                    + '\n'
                    + ' '.repeat(30) + 'ROOM '+ room
                    + '\n'
                    + dashed_line;
                    
                log(line);
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
                
                var line = '['+time+'] '+name+' '+ihash.substr(-6) + ': ' + cmt;
                
                log(line);
            }
    }

function clear_screen()
    {
        if(session.room() == 'main')
            {
                $('.main_button_table').remove();
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
        
        /**************************
        * Add all room with users
        **************************/
        for(var i = 0; i < sorted_rooms.length; i++)
            {
                var [n, c] = [ sorted_rooms[i], main[ sorted_rooms[i] ] ];
                
                if(c > 0)
                    {
                        var n = sorted_rooms[i];
                        var button = document.createElement('button');
                        
                        $(button).attr('id', 'main_room_button_'+n )
                            .attr('class', 'main_room_button')
                            .text( 'Room ' + n + ': ' + c)
                            .on('click', function(){ console.log('room:', n); change_room(sorted_rooms[i]) });
                        
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
    
function change_room(room)
    {
        if(room == 'main')
            {
                /**********************************
                * Clear room and room button list
                **********************************/
                main = {};
                
                clear_screen();
                
                room_view.hide();
                main_view.show();
            }
        else
            {
                main_view.hide();
                room_view.show();
            }
        
        
        session.room(room);
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
                        
                        append_div(id);
                        
                        console.log('enter', xml.attr);
                        
                        if(id != session.id()) { format_log('enter', [id]); }
                    }
                else if(xml.name == 'EXIT')
                    {
                        var id = xml.attr.id;
                        
                        console.log('exit', xml.attr);
                        
                        if(id != session.id()) { format_log('exit', [id]); }
                        
                        if(id == session.id())
                            {
                                clear_screen();
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
        
        if(com[0] == 'name')           { session.name(com[1]);                }
        else if(com[0] == 'character') { session.character(com[1]);           }
        else if(com[0] == 'stat')      { session.stat(com[1]);                }
        else if(com[0] == 'trip')      { session.trip(com[1]);                }
        else if(com[0] == 'r')         { session.r(com[1]);                   }
        else if(com[0] == 'g')         { session.g(com[1]);                   }
        else if(com[0] == 'b')         { session.b(com[1]);                   }
        else if(com[0] == 'rgb')       { session.rgb(com[1], com[2], com[3]); }
        else if(com[0] == 'x')         { session.x(com[1]);                   }
        else if(com[0] == 'y')         { session.y(com[1]);                   }
        else if(com[0] == 'scl')       { session.scl();                       }
        else if(com[0] == 'reenter')   { session.reenter();                   }
        else if(com[0] == 'server')    { /** unimplemented **/                }
        else if(com[0] == 'site')      { session.site(com[1])                 }
        else if(com[0] == 'timeout')   { session.timeout(com[1])              }
        
        else if(com[0] == 'room')
            {
                change_room(com[1]);
                
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
    
    log_button   = $('#log_button');
    log_textarea = $('#log_textarea');
    
    text_input   = $('#text_input');
    
    room_data    = $('#room_data');
    
    
    /*******************************
    * Toggle log textarea on click
    *******************************/
    log_button.on('click', function()
        {
            log_textarea.toggle();
        });

    log_textarea.attr('edditable', false);
    
    
    /**************************
    * Input bar keydown event
    **************************/
    text_input.on('keydown', function(e)
        {
            if(e.key == 'Enter')
                {
                    var text = text_input.val();
                    
                    if(text[0] == '/') { handle_command(text.substr(1)); }
                    else               { session.comment(text);          }
                    
                    text_input.val('');
                }
        });
}