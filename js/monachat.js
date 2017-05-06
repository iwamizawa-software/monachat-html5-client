// monachat.js

const {app}          = require('electron').remote;
const {Menu, dialog} = require('electron').remote;
const {shell}        = require('electron');
const {clipboard}    = require('electron');

const fs             = require('fs');

const $        = require('jquery');
const xmldoc   = require('xmldoc');
const jsonfile = require('jsonfile');
const notifier = require('node-notifier');
const spectrum = require('spectrum-colorpicker');

const Monachat = require('./js/monachat.jsm');
const util     = require('./js/util.js');

const win    = require('electron').remote.getCurrentWindow();


/************
* Constants
************/
const ARGV           = require('electron').remote.getGlobal('argv');
const JP_REGEX       = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;
const BLACK_TRIP_SYM = '\u2666';
const WHITE_TRIP_SYM = '\u2662';

const BRANCH         = 'dev';

const DEFAULT_STAT   =
    [
        '通常',
        '退席中',
        '取り込み中',
        'ﾏﾀｰﾘ',
        '殺伐',
        '祭り',
        'ﾜｼｮｰｲ',
        'ﾏﾝｾｰ',
        'ﾊｧﾊｧ',
        'ﾊﾗﾍﾀｰ',
        'ﾊﾗｲﾊﾟｰｲ',
        'ｳﾏｰ',
        'ﾏｽﾞｰ',
        'ｱﾂｰ',
        'ｻﾑｰ',
        'ﾈﾑｰ',
        'ﾓｳﾀﾞﾒﾎﾟ'
    ];


/****************
* Global hashes
****************/
var user        = {};
var room        = {};
var main        = {};

var room_button = {};
var main_button = {};

var data_menu   = {};

var muted       = {};
var stalk       = {};
var repeat      = {};

var config     = {};
var login_data = {};

var ignoring = {};


/***********************************
* Placeholders for global elements
***********************************/
var session;

var log_textarea;

var text_input;

var users_dropdown;
var stat_dropdown;

var room_data_menu;
var config_menu;

var loader;

var main_title;
var main_button_table;
var main_data;


/***************
* Global flags
***************/
var POPUP_ENABLED = true;
var POPUP_ALL     = false;


/*******************
* Global variables
*******************/
var canvas = document.createElement('CANVAS');
var ctx    = canvas.getContext('2d');

var trip_list;
var prev_input   = [];
var prev_input_n = 0;


canvas.width  = 128;
canvas.height = 128;


function User(xml)
    {
        var user = xml.attr;
        
        var full_color = user.r > 100 || user.g > 100 || user.b > 100 ? 1 : 0;
        
        this.name      = user.name  || 'nanashi';
        this.character = user.type  || 'mona';
        this.stat      = user.stat  || '通常';
        this.trip      = user.trip  || '';
        this.ihash     = user.ihash || 'no_ihash';
        this.r         = rgb_scale(user.r || 100);
        this.g         = rgb_scale(user.g || 100);
        this.b         = rgb_scale(user.b || 100);
        this.x         = user.x     || 0;
        this.y         = user.y     || 400;
        this.scl       = user.scl   || 100;
    }


function x_scale(x)
    {
        if     (x <  30)              { return x_scale(30);  }
        else if(x > 690)              { return x_scale(690); }
        else if(isNaN(parseFloat(x))) { return x_scale(30);  }
        else
            {
                var [a, b]     = [30, 690];
                var [min, max] = [60, 740];
                
                return parseInt((((b-a)*(x-min))/(max-min)) + a);
            }
    }

function reverse_x_scale(x)
    {
        var [a, b]     = [60, 740];
        var [min, max] = [30, 690];
        
        return parseInt((((b-a)*(x-min))/(max-min)) + a);
    }

function y_scale(y)
    {
        y = 440; /** disabled **/
        
        var [a, b]     = [0, 500];
        var [min, max] = [220, 850];
        
        return parseInt((((b-a)*(y-min))/(max-min)) + a);
    }

function rgb_scale(c)
    {
        var [a, b] 　　　= [0, 255];
        var [min, max] = [0, 100];
        
        return parseInt((((b-a)*(c-min))/(max-min)) + a);
    }

function log(el_arr)
    {
        //console.log('log', el_arr);
        
        /*********************
        * Create div element
        *********************/
        var div = document.createElement('DIV');
        $(div).attr('class', 'log_div')
            .css('padding-top', 4);
        
        
        for(var i = 0; i < el_arr.length; i++)
            {
                var el = el_arr[i];
                
                /********************************
                * Change default color to black
                ********************************/
                if($(el).css('color') == 'rgb(255, 255, 255)')
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
                $(text_el).css
                    (
                        'color',
                        'rgb('+r+', '+g+', '+b+')'
                    );
            }
        
        return text_el;
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

function create_option_el(value)
    {
        var option = document.createElement('OPTION');
        $(option).attr('value', value)
            .text(value);

        return option;
    }

function is_ignored(id)
    {
        if( user[id] != undefined && session._ignored[user[id].ihash] ) { return true; }
        else { return false; }
    }

function is_ignoring(id)
    {
        if( user[id] != undefined && ignoring[user[id].ihash] ) { return true; }
        else { return false; }
    }

function is_muted(id)
    {
        if( user[id] != undefined && muted[user[id].ihash] ) { return true; }
        else { return false; }
    }

function format_log(type, args)
    {
        if(session.room() == 'main') { return; }
        
        console.log('format', type, args);
        
        var time    = new Date().toLocaleTimeString();
        var time_el = create_text_el('['+time+'] ');
        
        
        if(type == 'enter')
            {
                var id = args[0];
                if(is_muted(id)){ return; }
                
                
                var {name, character, stat, trip, ihash, r, g, b} = user[id];

                
                var user_el = create_text_el
                    (
                        '--> '
                        + name             + ' '
                        + WHITE_TRIP_SYM
                        + ihash.substr(-6) + ' '
                        + '(' + id + ') '
                        + (trip == '' ? '' : (BLACK_TRIP_SYM + trip + ' '))
                        + stat             + ' '
                        + character        + ' ',
                        
                        r, g, b
                    );
                
                
                var info_el = create_text_el('has logged in.');

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'exit')
            {
                var id = args[0];
                if(is_muted(id)) { return; }
                
                var {name, character, stat, trip, ihash, r, g, b} = user[id];

                var user_el = create_text_el
                    (
                        '<-- '
                        + name             + ' '
                        + WHITE_TRIP_SYM
                        + ihash.substr(-6) + ' '
                        + '(' + id + ') '
                        + (trip == '' ? '' : (BLACK_TRIP_SYM + trip + ' ')),
                        
                        r, g, b
                    );
                
                var info_el = create_text_el('has exited the room.')

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'room')
            {
                var room = args[0];
                
                var first_hr_el  = document.createElement('HR');
                var second_hr_el = document.createElement('HR');
                
                
                var line = 'ROOM '+ room;
                var room_el = create_text_el(line);
                    
                var nbsp_el = create_nbsp_el(55);
                
                
                log([first_hr_el]);
                log([nbsp_el, room_el]);
                log([second_hr_el]);
            }
        else if(type == 'stat')
            {
                var id = args[0];
                if(is_muted(id)) { return; }
                
                var {name, character, stat, trip, ihash, r, g, b} = user[id];

                var user_el = create_text_el
                    (
                        name               + ' '
                        + '(' + id + ') '
                        + ihash.substr(-6) + ' '
                        + (trip == '' ? '': (trip + ' ')),
                        
                        r, g, b
                    );

                console.log(user_el);
                
                var info_el = create_text_el('changed status to ' + stat);

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'ig')
            {
                var [id, ihash, stat] = args;
                if(is_muted(id)) { return; }
                
                var ig_ihash = ihash;
                
                console.log([id, ihash, stat]);
                
                if(user[id] == undefined)
                    {
                        format_log('error', ['IG: User with id '+id+' doesnt exist.']);
                        return;
                    }
                
                
                var {name, ihash, r, g, b} = user[id];
                var [id_name, id_ihash, id_r, id_g, id_b] = [name, ihash, r, g, b];
                
                
                var ig_id   = get_id_from_ihash(ig_ihash);
                if(user[ig_id] == undefined)
                    {
                        format_log('error', ['IG: User with id '+id+' doesnt exist.']);
                        return;
                    }
                
                
                var {name, r, g, b} = user[ig_id];
                var [ig_name, ig_r, ig_g, ig_b] = [name, r, g, b];
                
                
                var id_el = create_text_el
                    (
                        id_name + ' ' + WHITE_TRIP_SYM + id_ihash.substr(-6) + '('+id+') ',
                        id_r, id_g, id_b
                    );
                
                var ig_el = create_text_el
                    (
                        ig_name + ' ' + WHITE_TRIP_SYM + ig_ihash.substr(-6) + '('+ig_id+') ',
                        ig_r, ig_g, ig_b
                    );
                
                var stat_el = create_text_el
                    (
                        stat == 'on' ? 'ignored ' : 'stopped ignoring '
                    );
                    
                
                log([time_el, id_el, stat_el, ig_el]);
            }
        else if(type == 'com')
            {
                var [id, cmt] = args;
                if(is_muted(id)) { return; }
                
                var {name, trip, ihash, r, g, b} = user[id];
                
                
                /************
                * User data
                ************/
                var user_el = create_text_el
                    (
                        name + ' '
                        + WHITE_TRIP_SYM
                        + ihash.substr(-6)
                        //+ (trip == '' ? '' : (' ' + BLACK_TRIP_SYM + trip + ' '))
                        + ' (' + id + '): ',
                        
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
                                            cmt_el     = create_a_el(cmt);
                                            var img_el = create_img_el(cmt);
                                            
                                            log([time_el, user_el, cmt_el]);
                                            //log_newline(1);
                                            log([img_el]);
                                            //log_newline(1);
                                        }
                                    else if(cmt.match('youtube.com/'))
                                        {
                                            var iframe_el = document.createElement('iframe');
                                            $(iframe_el).attr('width', 373)
                                                .attr('height', 210)
                                                .attr('src', cmt.replace('watch?v=', 'embed/'))
                                                .attr('frameborder', 0)
                                                .attr('allowfullscreen', 1);
                                            
                                            cmt_el = create_a_el(cmt);
                                            
                                            log([time_el, user_el, cmt_el]);
                                            log([iframe_el]);
                                            //log_newline(1);
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


                /************************************************************
                * Send a popup to the OS if the comments contains a trigger
                ************************************************************/
                if(POPUP_ALL)
                    {
                        popup
                            (
                                name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ': ',
                                cmt
                            );
                    }
                if(POPUP_ENABLED)
                    {
                        for(var i = 0; i < config['popup_trigger'].length; i++)
                            {
                                if(cmt.match(config['popup_trigger'][i]))
                                    {
                                        popup
                                            (
                                                name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ': ',
                                                cmt
                                            );
                                    }
                            }
                    }
            }
        else if(type == 'triplist')
            {
                var data = args.shift();
                var id   = args.shift();
                
                
                var line = 'Trips found for ' + data + ' (id ' + id + '):';
                var info_el = create_text_el(line);
                
                
                log_newline(1);
                log([info_el]);

                for(var i = 0; i < args.length; i++)
                    {
                        var nbsp_el = create_nbsp_el(4);
                        
                        var res_el = create_text_el(args[i]);
                        
                        log([nbsp_el, res_el]);
                    }
                
                log_newline(1);
            }
        else if(type == 'error')
            {
                var [error] = args;
                
                var error_el = create_text_el
                    (
                        'Error: ' + error,
                        
                        255, 0, 0
                    );
                
                log([time_el, error_el]);
            }
        else
            {
                var text_el = create_text_el('Command not recognized: '+args[0]);
                
                log(text_el);
            }
    }

function save_log()
    {
        var text = '';
        
        /********************************************************
        * Replace characters not accepted for windows filenames
        ********************************************************/
        var date = new Date().toLocaleString().replace(/\/|:/g, '-');
        
        
        /*******************************************************
        * Add the text of all div elements with a \r\n newline 
        *******************************************************/
        var children = log_textarea.children();
        
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

function get_id_from_ihash(ihash)
    {
        for(var id in user)
            {
                if(ihash == user[id].ihash)
                    {
                        return parseInt(id);
                    }
            }

        
        format_log('error', ['id not found from ihash '+ihash]);
        
        return 1;
    }

function clear_screen()
    {
        if(session.room() == 'main')
            {
                $('.main_room_button').remove();
                //$('#main_title').remove();
            }
        else
            {
                $('.user_div').remove();
            }
    }

function sort_rooms(a, b)
    {
        if     (isNaN(a-1)) { return -1; }
        else if(isNaN(b-1)) { return  1; }
        return parseInt(a)-parseInt(b);
    }

function get_sorted_rooms()
    {
        var sorted = [];
        
        for(var key in main)
            {
                if(main[key] != 0) { sorted.push(key); }
            }

        sorted = sorted.sort(sort_rooms);

        return sorted;
    }

function get_index(str, arr)
    {
        for(var i = 0; i < arr.length; i++)
            {
                if(arr[i] == str)
                    {
                        return i;
                    }
            }

        return false;
    }

function refresh_main()
    {
        var sorted_rooms = get_sorted_rooms();
        
        
        clear_screen();
        main_button_table.children().remove();
        
        var total_users = 0;
        var room_n      = 0;
        for(var key in main)
            {
                total_users += parseInt(main[key]);
                if(main[key] != 0) { room_n++; }
            }


        $('#main_title').text('Monachat ('+room_n+' rooms, '+total_users+' users)');

        
        /**************************
        * Add all room with users
        **************************/
        var last_tr = document.createElement('TR');
        $(last_tr).attr('class', 'main_button_table_tr');
        
       var td; 
        
        main_button_table.append(last_tr);
        
        
        for(let i = 0; i < sorted_rooms.length; i++)
            {
                let [n, c] = [ sorted_rooms[i], main[ sorted_rooms[i] ] ];
                
                if(c > 0)
                    {
                        n = sorted_rooms[i];
                        var button_el = document.createElement('button');
                        
                        $(button_el).attr('class', 'main_room_button')
                            .text('Room ' + n + ': ' + c)
                            .on('click', function()
                                {
                                    session._name      = main_data['name'].val();
                                    session._character = main_data['character'].val();
                                    session._stat      = main_data['stat'].val();
                                    session._trip      = main_data['trip'].val();
                                    
                                    var {_r, _g, _b} = main_data['color_picker'].spectrum('get');
                                    
                                    session._r = _r;
                                    session._g = _g;
                                    session._b = _b;
                                    
                                    change_room(sorted_rooms[i]);
                                });
                        
                        
                        td = document.createElement('TD');
                        $(td).attr('class', 'main_button_table_td');
                        $(td).append(button_el);
                        
                        if($(last_tr).children().length < 5)
                            {
                                $(last_tr).append(td);
                            }
                        else
                            {
                                last_tr = document.createElement('TR');
                                $(last_tr).attr('class', 'main_button_table_tr');
                                
                                $(last_tr).append(td);
                                main_button_table.append(last_tr);
                            }
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
                var {width, height} = img;
                
                ctx.drawImage(img, 0, 0);
                var data = ctx.getImageData(0, 0, width, height);
                
                
                if(user[id].r != 255 || user[id].g != 255 || user[id].b != 255)
                    {
                        for(var i = 0; i < data.data.length; i += 4)
                            {
                                var r = data.data[i];
                                var g = data.data[i+1];
                                var b = data.data[i+2];
                        
                                /***********************
                                * Replace white pixels
                                ***********************/
                                if(r == 255 && g == 255 && b == 255)
                                    {
                                        data.data[i]   = user[id].r;
                                        data.data[i+1] = user[id].g;
                                        data.data[i+2] = user[id].b;
                                    }
                                else
                                    {
                                        data.data[i]   = parseInt( (r + user[id].r) / 4 );
                                        data.data[i+1] = parseInt( (g + user[id].g) / 4 );
                                        data.data[i+2] = parseInt( (b + user[id].b) / 4 );
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
                    .css('transform', 'rotatey('+ (user[id].scl == -100 ? 180 : 0) +'deg)')
                    .css('opacity', (is_ignoring(id) || is_ignored(id)) ? 0.5 : 1);
                    
                    

                if(id == session.id())
                    {
                        $(img).on('click', function(e)
                            {
                                session.scl();
                            });
                    }
            

                /*******************************
                * Create user container object
                *******************************/
                var div = document.createElement('div');
                
                $(div).attr('id', 'user_div_'+id)
                    .attr('class', 'user_div')
                    .attr('draggable', id == session.id())
                    .css('left', x_scale(user[id].x || 0  ))
                    .css('top',  y_scale(user[id].y || 400));
                    
                /*************************
                * Allow to click through
                *************************/
                //if(id != session.id()) { $(div).css('pointer-events', 'none'); }
                
                div.addEventListener('dragstart', function(e)
                    {
                        var img_el = document.createElement('img');
                        e.dataTransfer.setDragImage(img_el, 1000, 1000);
                    }, false);
                $(div).on('dragover', function(e)
                    {
                        user[id].x = e.clientX;
                        move_div(id);
                        
                        e.preventDefault();
                    });
                $(div).on('drop', function(e)
                    {
                        session.x(reverse_x_scale(e.clientX-35));
                    });

                $(div).on('mousedown', function(e)
                    {
                        if(e.which == 3 && id != session.id())
                            {
                                e.stopPropagation();
                                show_user_context_menu(id);
                            }
                    });
                
                /*******************************
                * Create user data text object
                *******************************/
                
                var user_data = create_text_el('');
                $(user_data).html
                    (
                        '<br>'
                        + (user[id].name || 'nanashi')
                        + '<br>' + WHITE_TRIP_SYM
                        + user[id].ihash.substr(-6)
                        + (user[id].trip == '' ? '' : ('<br>' + BLACK_TRIP_SYM + user[id].trip))
                    )
                .attr('class', 'user_div_data');
                
                
                var stat_div = document.createElement('DIV');
                $(stat_div).attr('class', 'user_div_stat')
                    .attr('id', 'user_div_stat_'+id);
                
                if(user[id].stat != '通常')
                    {
                        $(stat_div).text(user[id].stat);
                        $(stat_div).css('display', 'block');
                    }
                
                
                /***************************
                * Append them to room_view
                ***************************/
                $(div).append(img)
                    .append(user_data)
                    .append(stat_div);
                
                
                room_view.append(div);
            }
        
        
        var character = user[id].character;
        
        if(!fs.existsSync('./character/'+character+'.png'))
            {
                character = 'mona';
            }
        
        img.src = './character/'+character+'.png';
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
        
        
        $('.comment_div_'+id).css('left', x_scale(user[id].x));
    }

function remove_div(id)
    {
        var div = $('#user_div_'+id);
        
        /****************************
        * Remove user container div
        ****************************/
        div.remove();
    }

function add_comment_div(id, cmt)
    {
        if(user[id] == undefined)
            {
                format_log('error', 'id '+id+' doesnt exist.');
                return;
            }
        else if(is_muted(id))
            {
                return;
            }


        var cmt_width = 0;
        for(var i = 0; i < cmt.length; i++)
            {
                if(cmt.match(JP_REGEX)) { cmt_width += 16; }
                else                    { cmt_width +=  8; }
            }

            
        cmt_width = parseInt(cmt_width);
        
        var user_width = $('#user_div_'+id).width();
        
        var cmt_left   = reverse_x_scale(user[id].x);
        var cmt_middle = cmt_left + (cmt_width/2);
        
        var user_middle = cmt_left + (user_width/2);
        
        var diff = cmt_middle - user_middle;
        
        var cmt_left = cmt_left - diff - 75;
        
        
        var div = document.createElement('DIV');
        $(div).addClass('comment_div comment_div_'+id)
            .text(cmt)
            .css('width', cmt_width)
            .css('left', cmt_left)
            .css('background-color', 'rgb('+user[id].r+', '+user[id].g+', '+user[id].b+')')
            .on('click', () => clipboard.writeText(cmt) );

        
        /**********************************
        * Remove the div after 10 seconds
        **********************************/
        setTimeout( () => $(div).remove(), 10000 );
        
        
        room_view.append(div);
    }

function show_users_dropdown()
    {
        var keys_n = 0;
        
        users_dropdown.children().remove();
        
        for(let id in room)
            {
                if(room[id] == undefined) { continue; }
                
                
                var {name, ihash} = user[id];
                
                var dropdown_el = create_text_el(name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ' ('+id+')');
                $(dropdown_el).attr('class', 'dropdown_el')
                    .css('background-color', (is_muted(id) || is_ignored(id) || is_ignoring(id))
                            ? 'rgb(255, 0, 0)'
                            : 'rgb(150, 150, 150)'
                        )
                    .on('click', function()
                        {
                            mute(id);
                            
                            $(this).css
                                (
                                    'background-color', $(this).css('background-color') == 'rgb(150, 150, 150)'
                                        ? 'rgb(255, 0, 0)'     //red
                                        : 'rgb(150, 150, 150)' //grey
                                )
                        });

                
                
                users_dropdown.append(dropdown_el);
                
                $(dropdown_el).append('<br>');
            }
        
        users_dropdown.css('top', 340-users_dropdown.height());
        
        users_dropdown.toggle();
    }

function refresh_data_menu(data_menu)
    {
        var id = session.id();
        
        var hash = user[id] == undefined ? session._default : user[id];
        var {name, character, stat, trip, r, g, b, x, y} = hash;
        
        
        data_menu['name'].val(name);
        data_menu['character'].val(character);
        data_menu['stat'].val(stat);
        data_menu['trip'].val(trip);
        data_menu['x'].val(x);
        data_menu['y'].val(y);
        
        
        /********************************
        * Add profile selection options
        ********************************/
        data_menu['profile'].children().remove();
        
        var default_el = create_option_el('Default');
        data_menu['profile'].append(default_el);
        
        for(let key in config.profiles)
            {
                var option = create_option_el(key);
                data_menu['profile'].append(option);
            }
        
        data_menu['profile'].on('change', function(e)
            {
                var {name, character, stat, trip, r, g, b, x, y} =
                    e.target.value == 'Default'
                    ? session._default
                    : config.profiles[e.target.value];
                
                
                data_menu['name']     .val(name);
                data_menu['character'].val(character);
                data_menu['stat']     .val(stat);
                data_menu['trip']     .val(trip);
                data_menu['x']        .val(x);
                data_menu['y']        .val(y);
                
                data_menu['color_picker'].spectrum('set', 'rgb('+r+', '+g+', '+b+')');
            });

        
        data_menu['color_picker'].spectrum('set', 'rgb('+r+', '+g+', '+b+')');
    }

function show_user_context_menu(id)
    {
        var {name, ihash} = user[id];
        
        var template =
            [
                { label: name + ' ' + WHITE_TRIP_SYM + ihash + ' (' + id + ')' },
                { type: 'separator' },
                { label: 'Copy',        click() { copy(id);                } },
                { label: 'Ignore',      click() { ignore(id);              } },
                { label: 'Mute',        click() { mute(id);                } },
                { label: 'Search trip', click() { search_trip('id', id);   } },
                { label: 'Search name', click() { search_trip('name', id); } },
                { label: 'Stalk',       click() { toggle_stalk(id);        } },
                { label: 'Repeat',      click() { toggle_repeat(id);       } }
            ];
            
        menu = Menu.buildFromTemplate(template);
        menu.popup(win);
    }

function show_command_context_menu()
    {
        var template =
            [
                { label: 'Next room',      click() { next_room();     } },
                { label: 'Previous room',  click() { previous_room(); } },
                { type: 'separator' },
                {
                    label: 'Profile',
                    submenu:
                        [
                            { label: 'Save profile', click() { add_profile();   } },
                            { label: 'Default',      click() { set_default();   } },
                            { label: 'Random',       click() { set_random();    } },
                            { label: 'Invisible',    click() { set_invisible(); } },
                            { label: 'Nanashi',      click() { set_nanashi();   } }
                        ]
                },
                { type: 'separator' },
                {
                    label: 'Util',
                    submenu:
                        [
                            {
                                label: 'Upload image',
                                click()
                                    {
                                        dialog.showOpenDialog
                                            (
                                                function(path) { util.upload_image(path[0]); }
                                            );
                                    }
                            }
                        ]
                },
                { type: 'separator' },
                { label: 'Sound on/off', click() {} },
                { label: 'Popup all', click() { POPUP_ALL = !POPUP_ALL; } },
                { label: 'New',       click() { new_instance(1); } }
            ];
            
        menu = Menu.buildFromTemplate(template);
        menu.popup(win);
    }
    
function change_room(room)
    {
        clear_screen();
        
        if(room == 'main')
            {
                /**********************************
                * Clear room and room button list
                **********************************/
                
                /******************************************************
                * Clear main only if you go to main from another room
                ******************************************************/
                if(session.room() != 'main')
                    {
                        main = {};
                    }

                /********************
                * Refresh main data
                ********************/
                refresh_data_menu(main_data);
                
                var character = user[session.id()].character;
                if(!fs.existsSync('./character/'+character+'.png')) { character = 'mona'; }
                main_data['character_img'].attr('src', './character/'+character+'.png');
                
                room_view.hide();
                main_view.show();
                
                //format_log('room', [room]);
            }
        else
            {
                main_view.hide();
                room_view.show();
                
                format_log('room', [room]);
            }
        
        
        session.room(room);
    }

function change_server()
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

function copy(id)
    {
        if(user[id] == undefined)
            {
                format_log('error', ['User with id ' + id + 'doesnt exist.']);
            }
        else
            {
                clear_screen();
                session.copy(user[id]);
            }
    }

function toggle_stalk(id)
    {
        if(user[id] == undefined)
            {
                format_log('error', ['User with id ' + id + 'doesnt exist.']);
            }
        else
            {
                var ihash = user[id].ihash;
                
               stalk[ihash] = stalk[ihash] == undefined ? 1 : undefined;
            }
    }

function is_stalked(id)
    {
        return user[id] != undefined && stalk[user[id].ihash];
    }

function toggle_repeat(id)
    {
        if(user[id] == undefined)
            {
                format_log('error', ['User with id ' + id + 'doesnt exist.']);
            }
        else
            {
                var ihash = user[id].ihash;
                
               repeat[ihash] = repeat[ihash] == undefined ? 1 : undefined;
            }
    }

function is_repeated(id)
    {
        return user[id] != undefined && repeat[user[id].ihash];
    }

function add_trip(id)
    {
        var {name, ihash} = user[id];
        
        if(trip_list[ihash] == undefined)
            {
                trip_list[ihash] = [name];
                save_trip();
            }
        else
            {
                if(!trip_list[ihash].includes(name))
                    {
                        trip_list[ihash].push(name);
                        save_trip();
                    }
            }
    }

function save_trip()
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
                        format_log('error', ['User with id ' + id + ' doesnt exist.']);
                        return;
                    }
                
                var ihash = user[id].ihash;
                if(trip_list[ihash] == undefined)
                    {
                        format_log('error', ['No trips stored for this trip.']);
                        return;
                    }

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
                        format_log('error', ['No user with name ' + name + ' found.']);
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

function popup(title, msg)
    {
        notifier.notify
            ({
                'title': title,
                'message': msg
            });
    }

function add_profile()
    {
        var id = session.id();
        var {name, character, stat, trip, r, g, b, x, y, scl} = user[id];
        
        config['profiles'][name] =
            {
                'name'     : name,
                'character': character,
                'stat'     : stat,
                'trip'     : trip,
                'r'        : r,
                'g'        : g,
                'b'        : b,
                'x'        : x,
                'y'        : y,
                'scl'      : scl
            };

        
        jsonfile.writeFileSync('config.json', config);
    }

function load_profile(profile_name)
    {
        if(config['profiles'][profile_name] == undefined)
            {
                format_log('error', ['Profile '+profile_name+' doesnt exist.']);
            }
        else
            {
                session.profile(config['profiles'][profile_name]);
            }
    }

function new_instance(n)
    {
        n = n || 1;
        
        var id = session.id();
        
        
        if(BRANCH == 'dev')
            {
                for(var i = 0; i < n; i++)
                    {
                        var line = 'electron . room '+user[id].room+' proxy 1';
                        
                        require('child_process').spawn(ARGV[0], ['.', 'proxy', '1']);
                    }
            }
    }

function ignore(id)
    {
        if(user[id] == undefined)
            {
                format_log('error', ['User with id '+id+' doesnt exist.']);
            }
        else
            {
                var ihash = user[id].ihash;
                
                session.ignore(ihash);
                
                ignoring[user[id].ihash] = ignoring[user[id].ihash] ? false : true;
                
                $('#user_div_'+id+'_img').css('opacity', is_ignored(id) ? 0.5 : 1);
            }
    }

function mute(id)
    {
        if(user[id] == undefined) { return; }
        var ihash = user[id].ihash;
                
        muted[ihash] = muted[ihash] == undefined ? 1 : undefined;
                
        if($('#user_div_'+id)) { $('#user_div_'+id).toggle(); }
    }

function toggle_proxy()
    {
        clear_screen();
        
        session.proxy();
        
        room_button['proxy'].css('background-color', session._proxy ? 'rgb(100, 100, 100)' : 'white');
    }

function next_room()
    {
        var sorted = get_sorted_rooms();
        var room   = session.room();
                
        var index = get_index(room, sorted);
        if(index < sorted.length-1) { change_room(sorted[index+1]); }
    }

function previous_room()
    {
        var sorted = get_sorted_rooms();
        var room   = session.room();
        
        var index = get_index(room, sorted);
        if(index > 0) { change_room(sorted[index-1]); }
    }

function set_default()
    {
        clear_screen();
        session.set_default();
    }

function set_invisible()
    {
        clear_screen();
        session.invisible();
    }

function set_nanashi()
    {
        clear_screen();
        session.nanashi();
    }

function set_random(country)
    {
        clear_screen();
        session.random(country);
    }

function relogin()
    {
        clear_screen();
        session.relogin();
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
                        var {n, c, id, ihash, name} = xml.attr;
                        
                        console.log('uinfo', xml.attr);
                        alert('uinfo');
                    }
                else if(xml.name == 'COUNT')
                    {
                        if(session.room() != 'main')
                            {
                                var [n, c] = [xml.attr.n, xml.attr.c];
                                
                                var id     = session.id();
                                var {name, ihash} = user[id];
                                
                                //console.log('room count', xml);
                                //console.log('c:', c, 'n:', n);
                                
                                document.title =
                                    'Monachat '
                                    + '[room: ' + n + ' users: ' + c + '] '
                                    + '@ '
                                    + name + ' '
                                    + WHITE_TRIP_SYM
                                    + ihash.substr(-6)
                                    + ' ('+id+')';
                            }
                        else
                            {
                                document.title = 'Monachat';
                                
                                //console.log('main count', xml);
                                
                                /*******************************
                                * Refresh and update main_view
                                *******************************/
                                for(var i = 0; i < xml.children.length; i++)
                                    {
                                        var child = xml.children[i];
                                        var {n, c} = child.attr;
                                        
                                        main[n] = c;
                                        
                                        if(c != 0) { refresh_main(); }
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
                                
                                format_log('enter', [id]);
                                
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
                        console.log('USER', user[id]);
                        console.log('enter', xml.attr);
                        
                        if(id != session.id()) { format_log('enter', [id]); }
                    }
                else if(xml.name == 'USER')
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
                        
                        if(id == session.id())
                            {
                                room = {};
                                
                                clear_screen();
                            }
                        else
                            {
                                room[id] = undefined;
                                console.log(room);
                                
                                remove_div(id);
                                
                                format_log('exit', [id]);
                            }
                    }
                else if(xml.name == 'SET')
                    {
                        var id = xml.attr.id;
                        
                        /***********************
                        * It moves three times
                        ***********************/
                        if(xml.attr.x != undefined)
                            {
                                user[id].x = xml.attr.x;
                                move_div(id);
                                
                                if(is_stalked(id)) { session.x(xml.attr.x); }
                            }
                        if(xml.attr.y != undefined)
                            {
                                user[id].y = xml.attr.y;
                                move_div(id);

                                if(is_stalked(id)) { session.y(xml.attr.y); }
                            }
                        if(xml.attr.scl != undefined)
                            {
                                if(xml.attr.scl != user[id].scl && is_stalked(id))
                                    {
                                        session.scl();
                                    }
                                
                                user[id].scl = xml.attr.scl;
                                move_div(id);
                            }
                        
                        if(xml.attr.stat != undefined)
                            {
                                var stat = xml.attr.stat;
                                
                                user[id].stat = stat;
                                format_log('stat', [id]);
                                
                                if(stat == '通常')
                                    {
                                        $('#user_div_stat_'+id).hide();
                                    }
                                else
                                    {
                                        $('#user_div_stat_'+id).show();
                                        $('#user_div_stat_'+id).text(stat);
                                    }
                            }
                    }
                else if(xml.name == 'IG')
                    {
                        var {id, ihash, stat} = xml.attr;
                        
                        format_log('ig', [id, ihash, stat]);
                        console.log('ig', xml);
                        
                        /********************************************************
                        * Set that user half-invisible if you have been ignored
                        ********************************************************/
                        
                        if(ihash == user[session.id()].ihash)
                            {
                                $('#user_div_'+id+'_img').css('opacity', stat == 'on' ? 0.5 : 1);
                            }
                    }
                else if(xml.name == 'COM')
                    {
                        var {id, cmt} = xml.attr;
                        
                        console.log('Comment:', cmt);
                        
                        add_comment_div(id, cmt);
                        format_log('com', [id, cmt]);
                        
                        
                        if(user[id] != undefined && is_repeated(id))
                            {
                                session.comment(cmt);
                            }
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
        
        if(com[0] == 'name')             { session.name(com[1]);                }
        else if(com[0] == 'character')   { session.character(com[1]);           }
        else if(com[0] == 'stat')        { session.stat(com[1]);                }
        else if(com[0] == 'trip')        { session.trip(com[1]);                }
        else if(com[0] == 'r')           { session.r(com[1]);                   }
        else if(com[0] == 'g')           { session.g(com[1]);                   }
        else if(com[0] == 'b')           { session.b(com[1]);                   }
        else if(com[0] == 'rgb')         { session.rgb(com[1], com[2], com[3]); }
        else if(com[0] == 'x')           { session.x(com[1]);                   }
        else if(com[0] == 'y')           { session.y(com[1]);                   }
        else if(com[0] == 'scl')         { session.scl();                       }
        else if(com[0] == 'ignore')      { ignore(com[1]);                      }
        else if(com[0] == 'reenter')     { session.reenter();                   }
        else if(com[0] == 'site')        { session.site(com[1])                 }
        else if(com[0] == 'timeout')     { session.timeout(com[1])              }
        else if(com[0] == 'searchid')    { search_trip('id', com[1]);           }
        else if(com[0] == 'searchtrip')  { search_trip('trip', com[1]);         }
        else if(com[0] == 'searchname')  { search_trip('name', com[1]);         }
        else if(com[0] == 'proxy')       { toggle_proxy();                      }
        else if(com[0] == 'new')         { new_instance(com[1]);                }
        else if(com[0] == 'tinyurl')     { tinyurl(com[1]);                     }
        else if(com[0] == 'popup')       { POPUP_ENABLED = !POPUP_ENABLED;      }
        else if(com[0] == 'saveprofile') { add_profile();                       }
        else if(com[0] == 'profile')     { load_profile(com[1]);                }
        else if(com[0] == 'savelog')     { save_log();                          }
        else if(com[0] == 'next')        { next_room();                         }
        else if(com[0] == 'prev')        { previous_room();                     }
        else if(com[0] == 'copy')        { copy(id);                            }
        else if(com[0] == 'server')      { change_server(com[1]);               }
        else if(com[0] == 'default')     { set_default();                       }
        else if(com[0] == 'invisible')   { set_invisible();                     }
        else if(com[0] == 'nanashi')     { set_nanashi();                       }
        else if(com[0] == 'random')      { set_random(com[1]);                  }
        else if(com[0] == 'room')        { change_room(com[1]);                 }
        else if(com[0] == 'mute')        { mute(com[1]);                        }
        else if(com[0] == 'relogin')     { relogin();                           }
        else if(com[0] == 'exit')
            {
                session.disconnect();
                app.quit();
            }
        else
            {
                format_log('error', ['Command '+com[0]+' not recognized.']);
            }
    }

function process_arguments()
    {
        if(ARGV.length % 2 != 0)
            {
                console.log('Error: Odd number of arguments.');
                process.exit();
            }
        
        for(var i = 2; i < ARGV.length; i += 2)
            {
                login_data[ARGV[i]] = ARGV[i+1];
            }
    }


window.onload = function()
{
    config     = jsonfile.readFileSync('./config.json');
    login_data = jsonfile.readFileSync('./config.json');
    
    process_arguments();
    
    
    session = new Monachat(login_data, signal_handler);
    session.connect();
    
    
    /**********************
    * Set global elements
    **********************/
    main_view = $('#main_view');
    room_view = $('#room_view');
    
    main_button_table = $('#main_button_table');
    
    room_button['log']     = $('#log_button');
    room_button['save']    = $('#save_log_button');
    room_button['data']    = $('#data_button');
    room_button['users']   = $('#users_button');
    room_button['stat']    = $('#stat_button');
    room_button['config']  = $('#config_button');
    room_button['back']    = $('#back_button');
    room_button['reenter'] = $('#reenter_button');
    room_button['relogin'] = $('#relogin_button');
    room_button['proxy']   = $('#proxy_button');
    
    main_button['reenter'] = $('#main_reenter_button');
    
    
    room_data_menu = $('#room_data_menu');
    
    room_data_menu['profile']      = $('#room_data_profile');
    room_data_menu['name']         = $('#room_data_name');
    room_data_menu['character']    = $('#room_data_character');
    room_data_menu['stat']         = $('#room_data_stat');
    room_data_menu['trip']         = $('#room_data_trip');
    room_data_menu['x']            = $('#room_data_x');
    room_data_menu['y']            = $('#room_data_y');
    room_data_menu['color_picker'] = $('#room_data_color_picker');
    room_data_menu['cancel']       = $('#room_data_cancel_button');
    room_data_menu['accept']       = $('#room_data_accept_button');
    
    
    main_data = $('#main_data');
    
    main_data['profile']       = $('#main_data_profile');
    main_data['name']          = $('#main_data_name');
    main_data['character']     = $('#main_data_character');
    main_data['stat']          = $('#main_data_stat');
    main_data['trip']          = $('#main_data_trip');
    main_data['x']             = $('#main_data_x');
    main_data['y']             = $('#main_data_y');
    main_data['color_picker']  = $('#main_data_color_picker');
    main_data['character_img'] = $('#main_data_character_img');
    
    log_textarea = $('#log_textarea');
    text_input   = $('.text_input');
    
    config_menu    = $('#config_menu');
    
    users_dropdown = $('#users_dropdown');
    stat_dropdown  = $('#stat_dropdown');
    
    loader = $('#loader');
    
    
    trip_list = jsonfile.readFileSync('trip.json');
    
    
    $('#room_view').on('mousedown', function(e)
        {
            if(e.which == 3)
                {
                    show_command_context_menu();
                    return true;
                }
        });
    
    /*******************************
    * Toggle log textarea on click
    *******************************/
    room_button['log']    .on('click', function() { log_textarea.toggle();  });
    room_button['save']   .on('click', function() { save_log();             })
    room_button['reenter'].on('click', function() { session.reenter();      });
    room_button['back']   .on('click', function() { change_room('main');    });
    room_button['users']  .on('click', function() { show_users_dropdown();  });
    room_button['stat']   .on('click', function() { stat_dropdown.toggle(); });
    room_button['proxy']  .on('click', function() { toggle_proxy();         });
    room_button['relogin'].on('click', function() { relogin();              });
    room_button['data']   .on('click', function()
        {
            if(room_data_menu.css('display') != 'none')
                {
                    room_data_menu.toggle();
                    return;
                }
            
            refresh_data_menu(room_data_menu);
            room_data_menu.toggle();
        });

    room_data_menu['cancel'].on('click', function()
        {
            room_data_menu.toggle();
        });
    room_data_menu['accept'].on('click', function()
        {
            room_data_menu.toggle();
            
            var {_r, _g, _b} = room_data_menu['color_picker'].spectrum('get');
            
            console.log(_r, _g, _b);
            session.set_data
                ({
                    name:      room_data_menu['name'].val(),
                    character: room_data_menu['character'].val(),
                    stat:      room_data_menu['stat'].val(),
                    trip:      room_data_menu['trip'].val(),
                    r:         parseInt(_r),
                    g:         parseInt(_g),
                    b:         parseInt(_b),
                    x:         room_data_menu['x'].val(),
                    y:         room_data_menu['y'].val(),
                    scl:       session.scl()
                });
            
            clear_screen();
        });

    room_button['config'].on('click', function()
        {
            config_menu.toggle();
        });
        

    main_button['reenter'].on('click', function() { session.reenter(); });
    

    log_textarea.attr('edditable', false);
    
    
    room_data_menu['color_picker'].spectrum
        ({
            color          : 'black',
            showInput      : true,
            preferredFormat: 'rgb',
            showPalette    : true,
            palette:
                [
                    ['FFFFFF', 'FFE5FF', 'FFB2FF', 'FF65FF'],
                    ['FFFFE5', 'FFE5E5', 'FFB2E5', 'FF65E5'],
                    ['FFFFB2', 'FFE5B2', 'FFB2B2', 'FF65B2'],
                    ['FFFF65', 'FFE565', 'FFB265', 'FF6565'],
                    ['E5FFFF', 'E5E5FF', 'E5B2FF', 'E565FF'],
                    ['E5FFE5', 'E5E5E5', 'E5B2E5', 'E565E5'],
                    ['E5FFB2', 'E5E5B2', 'E5B2B2', 'E565B2'],
                    ['E5FF65', 'E5E565', 'E5B265', 'E56565'],
                    ['B2FFFF', 'B2E5FF', 'B2B2FF', 'BE65FF'],
                    ['B2FFE5', 'B2E5E5', 'B2B2E5', 'BE65E5'],
                    ['B2FFB2', 'B2E5B2', 'B2B2B2', 'B265B2'],
                    ['B2FF65', 'B2E565', 'B2B265', 'B26565'],
                    ['65FFFF', '65E5FF', '65B2FF', '6565FF'],
                    ['65FFE5', '65E5E5', '65B2E5', '6565E5'],
                    ['65FFB2', '65E5B2', '65BE65', '6565B2'],
                    ['65FF65', '65E565', '65B265', '656565']
                ]
        });

    main_data['color_picker'].spectrum
        ({
            color          : 'black',
            showInput      : true,
            preferredFormat: 'rgb',
            showPalette    : true,
            palette:
                [
                    ['FFFFFF', 'FFE5FF', 'FFB2FF', 'FF65FF'],
                    ['FFFFE5', 'FFE5E5', 'FFB2E5', 'FF65E5'],
                    ['FFFFB2', 'FFE5B2', 'FFB2B2', 'FF65B2'],
                    ['FFFF65', 'FFE565', 'FFB265', 'FF6565'],
                    ['E5FFFF', 'E5E5FF', 'E5B2FF', 'E565FF'],
                    ['E5FFE5', 'E5E5E5', 'E5B2E5', 'E565E5'],
                    ['E5FFB2', 'E5E5B2', 'E5B2B2', 'E565B2'],
                    ['E5FF65', 'E5E565', 'E5B265', 'E56565'],
                    ['B2FFFF', 'B2E5FF', 'B2B2FF', 'BE65FF'],
                    ['B2FFE5', 'B2E5E5', 'B2B2E5', 'BE65E5'],
                    ['B2FFB2', 'B2E5B2', 'B2B2B2', 'B265B2'],
                    ['B2FF65', 'B2E565', 'B2B265', 'B26565'],
                    ['65FFFF', '65E5FF', '65B2FF', '6565FF'],
                    ['65FFE5', '65E5E5', '65B2E5', '6565E5'],
                    ['65FFB2', '65E5B2', '65BE65', '6565B2'],
                    ['65FF65', '65E565', '65B265', '656565']
                ]
        });

    main_data['character'].on('keyup', function()
        {
            var character = main_data['character'].val();
            if(fs.existsSync('./character/'+character+'.png'))
                {
                    main_data['character_img'].attr('src', './character/'+character+'.png');
                };
        });
    
    
    for(let i = 0; i < DEFAULT_STAT.length; i++)
        {
            var el = create_text_el(DEFAULT_STAT[i]);
            $(el).attr('class', 'dropdown_el stat_dropdown_el')
                .on('click', function()
                    {
                        session.stat(DEFAULT_STAT[i]);
                        stat_dropdown.toggle();
                    } );

            stat_dropdown.append(el);
        }

        
    stat_dropdown.css('top', 340-DEFAULT_STAT.length*20);
    
    
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

    selection = $('#character_selection');
    var character_list =
            ('abogado agemona alice anamona aramaki asou bana batu boljoa boljoa3 boljoa4 '
            + 'charhan chichon chotto1 chotto2 chotto3 coc2 cock dokuo dokuo2 foppa fusa '
            + 'fuun gaku gakuri gari gerara giko ging ginu gyouza haa haka hat2 hati hati3 '
            + 'hati4 hikk hiyoko hokkyoku6 hosh ichi ichi2 ichineko iiajan iyou jien joruju '
            + 'joruju2 kabin kagami kamemona kappappa kasiwa kato kikko2 kita koit koya kunoichi '
            + 'kuromimi kyaku maji marumimi maturi mina miwa mona monaka mora mosamosa1 mosamosa2 '
            + 'mosamosa3 mosamosa4 mossari moudamepo mouk mouk1 mouk2 nanyo nezumi nida niku nin3 '
            + 'niraime niraime2 niramusume niraneko nyog oni oniini oomimi osa papi polygon ppa2 '
            + 'puru ranta remona riru ri_man sai sens shaitama shak shob shodai sii2 sika sira '
            + 'siranaiwa sugoi3 sumaso2 suwarifusa tahara tatigiko taxi tibifusa tibigiko tibisii '
            + 'tiraneyo tofu tokei tuu uma unknown2 unko urara usi wachoi welneco2 yamazaki1 '
            + 'yamazaki2 yokan zonu zuza').split(' ');

    for(let i = 0; i < character_list.length; i++)
        {
            let img = document.createElement('IMG');
            img.src = './character/'+character_list[i]+'.png';
            
            img.onload = function()
                {
                    let div = document.createElement('DIV');
                    $(div).attr('class', 'selection_div');
                    $(div).append(img);
                    
                    selection.append(div);
                }
        }
    
    
    POPUP_ENABLED = config['popup'];
    if(login_data['proxy'] == 1)
        {
            room_button['proxy'].css('background-color', 'rgb(100, 100, 100)');
        }
    
    
    if(session.room() == 'main')
        {
            $('.container').hide();
            refresh_data_menu(main_data);
            
            var character = main_data['character'].val();
            if(fs.existsSync('./character/'+character+'.png'))
                {
                    main_data['character_img'].attr('src', './character/'+character+'.png');
                };
            
            main_view.show();
        }
    else
        {
            main_view.hide();
        }
}