// monachat.js

const {app}          = require('electron').remote;
const {Menu, dialog} = require('electron').remote;
const {shell}        = require('electron');
const {clipboard}    = require('electron');

const fs             = require('fs');

const xmldoc   = require('xmldoc');
const jsonfile = require('jsonfile');
const notifier = require('node-notifier');
const spectrum = require('spectrum-colorpicker');

const Monachat = require('./assets/js/monachat.jsm');
const util     = require('./assets/js/util.js');
const bot      = require('./assets/js/bot.js');

const win    = require('electron').remote.getCurrentWindow();


/************
* Constants
************/
const ARGV           = require('electron').remote.getGlobal('argv');
const JP_REGEX       = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;
const BLACK_TRIP_SYM = '\u2666';
const WHITE_TRIP_SYM = '\u2662';

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

const COLOR_LIST =
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
    ];

/****************
* Global hashes
****************/
var user        = {};
var room        = {};
var main        = {};

var room_view = { button: {}, el: '', data: {}, dropdown: {} };
var main_view = { button: {}, el: '', data: {}, dropdown: {} };

var data_menu   = {};

var muted       = {};
var stalk       = {};
var repeat      = {};

var config      = {};
var login_data  = {};

var ignoring    = {};

var config_menu = {};

/***********************************
* Placeholders for global elements
***********************************/

/*********
* Global
*********/
var session;

var loader;

/************
* Room view
************/
var audio;

/************
* Main view
************/
var main_title;


/***************
* Global flags
***************/
var POPUP_ALL     = false;
var IS_CLICK      = true;

var POPUP_ENABLED;
var SOUND_ON;

/*******************
* Global variables
*******************/

/***************************************************
* Buffer canvas used for coloring character images
***************************************************/
var buffer_canvas = document.createElement('CANVAS');
var buffer_ctx    = buffer_canvas.getContext('2d');

buffer_canvas.width  = 128;
buffer_canvas.height = 128;

/*********************************
* Placeholder for trip list hash
*********************************/
var trip_list;

/********************************************
* Stores the historial of previous comments
********************************************/
var prev_input   = [];
var prev_input_n = 0;

/*****************
* Character list
*****************/
var character_list;


function User(xml)
    {
        var user = xml.attr;
        
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
        y = 480; /** disabled **/
        
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

function get_px_len(str)
    {
        var span = document.createElement('SPAN');
        $(span).attr('id', 'px_len')
            .css('display', 'none')
            .text(str);

        $('body').append(span);
        
        var len = $(span).width();
        
        $(span).remove();
        
        return len;
    }

function open_with_browser(e, url)
    {
        e.preventDefault()
        
        shell.openExternal(url);
    }

function log(el_arr)
    {
        /*********************
        * Create div element
        *********************/
        var div_el = document.createElement('DIV');
        $(div_el).attr('class', 'log_div_el')
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
                
                $(div_el).append(el_arr[i]);
            }
        
        
        room_view.log.append(div_el);
        
        /**********************************
        * Scroll automatically to the end
        **********************************/
        room_view.log[0].scrollTop = room_view.log[0].scrollHeight;
    }

function log_newline(n)
    {
        for(var i = 0; i < n; i++) { log(['<br>']); }
    }

function create_nbsp_el(n)
    {
        var nbsp_el = document.createElement('NBSP');
        $(nbsp_el).html('&nbsp'.repeat(n));
        
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

function create_a_el(url)
    {
        var a_el = document.createElement('A');
        
        $(a_el).text(url)
            .attr('href', url)
            .attr('class', 'log_div_a')
            .on('click', (e) => open_with_browser(e, url));

        return a_el;
    }

function create_img_el(url)
    {
        var img_el = document.createElement('IMG');
        $(img_el).attr('src', url)
            .attr('href', url)
            .addClass('log_img_el')
            .on('click', (e) => open_with_browser(e, url));


        return img_el;
    }

function create_option_el(value)
    {
        var option_el = document.createElement('OPTION');
        $(option_el).attr('value', value)
            .text(value);

        return option_el;
    }

function is_ignored(id)  { return user[id] != undefined && session._ignored[user[id].ihash]; }
function is_ignoring(id) { return user[id] != undefined && ignoring[user[id].ihash];         }
function is_muted(id)    { return user[id] != undefined && muted[user[id].ihash];            }

function format_user_data(id, n)
    {
        var {name, character, stat, trip, ihash, r, g, b} = user[id];
        
        var line = name
        if(n > 1) { line += ' ' + WHITE_TRIP_SYM + ihash.substr(-6);          }
        if(n > 2) { line += ' ' + (trip == '' ? '' : (BLACK_TRIP_SYM + trip)) }
        if(n > 3) { line += ' ' + stat; }
        if(n > 4) { line += ' ' + character; }
        
        line += ' (' + id + ') ';
        
        return line;
    }

function format_log(type, args)
    {
        if(session.room() == 'main') { return; }
        
        var time    = new Date().toLocaleTimeString();
        var time_el = create_text_el('['+time+'] ');
        
        
        if(type == 'enter')
            {
                var id = args[0];
                if(is_muted(id)) { return; }
                
                
                var user_el = create_text_el
                    (
                        '--> ' + format_user_data(id, 5),
                        user[id].r, user[id].g, user[id].b
                    );
                
                
                var info_el = create_text_el('has logged in.');

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'exit')
            {
                var id = args[0];
                if(is_muted(id)) { return; }
                
                
                var user_el = create_text_el
                    (
                        '<-- ' + format_user_data(id, 5),
                        user[id].r, user[id].g, user[id].b
                    );
                
                var info_el = create_text_el('has exited the room.')

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'room')
            {
                var room = args[0];
                
                var first_hr_el  = document.createElement('HR');
                var second_hr_el = document.createElement('HR');
                var nbsp_el      = create_nbsp_el(55);
                
                var room_el = create_text_el('ROOM' + room);
                
                
                log([first_hr_el]);
                log([nbsp_el, room_el]);
                log([second_hr_el]);
            }
        else if(type == 'stat')
            {
                var id = args[0];
                if(is_muted(id)) { return; }
                
                var {r, g, b, stat} = user[id];
                
                var user_el = create_text_el( format_user_data(id, 3), r, g, b );
                
                var info_el = create_text_el('changed status to ' + stat);

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'ig')
            {
                var [id, ihash, stat] = args;
                if(is_muted(id)) { return; }
                
                var ig_ihash = ihash;
                
                if(user[id] == undefined)
                    {
                        format_log('error', ['IG: User with id '+id+' doesnt exist.']);
                        return;
                    }

                
                var ig_id   = get_id_from_ihash(ig_ihash);
                if(user[ig_id] == undefined)
                    {
                        format_log('error', ['IG: User with id '+id+' doesnt exist.']);
                        return;
                    }
                
                
                var id_el = create_text_el(format_user_data(id, 2),    user[id].r,    user[id].g,    user[id].b   );
                var ig_el = create_text_el(format_user_data(ig_id, 2), user[ig_id].r, user[ig_id].g, user[ig_id].b);
                
                var stat_el = create_text_el( stat == 'on' ? 'ignored ' : 'stopped ignoring ' );
                    
                
                log([time_el, id_el, stat_el, ig_el]);
            }
        else if(type == 'com')
            {
                var [id, cmt] = args;
                if(is_muted(id)) { return; }
                
                var {name, trip, ihash, r, g, b} = user[id];
                
                var user_el = create_text_el
                    (
                        name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ' (' + id + '): ',
                        r, g, b
                    );
                $(user_el).attr('class', 'log_cmt_user');

                
                /***************
                * Comment data
                ***************/
                var cmt_el;
                
                if(util.is_url(cmt))
                    {
                        cmt_el = create_a_el(cmt);
                        
                        log([time_el, user_el, cmt_el]);
                        
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
                                            var img_el = create_img_el(cmt);
                                            
                                            log([img_el]);
                                        }
                                    else if(cmt.match(/youtube.com|youtu.be/))
                                        {
                                            var src;
                                            
                                            if(cmt.match('youtube.com/'))
                                                {
                                                    src = cmt.replace('watch?v=', 'embed/');
                                                }
                                            else if(cmt.match('youtu.be'))
                                                {
                                                    src = cmt.replace('.be/', 'be.com/embed/');
                                                }
                                            
                                            var iframe_el = document.createElement('iframe');
                                            $(iframe_el).attr('width', 373)
                                                .attr('height', 210)
                                                .attr('src', src)
                                                .attr('frameborder', 0)
                                                .attr('allowfullscreen', 1);
                                            
                                            log([iframe_el]);
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
                                name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ':',
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
                                                name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ':',
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
                
                
                var info_el = create_text_el('Trips found for ' + data + ' (id ' + id + '):');
                
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
        var children = room_view.log.children();
        
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
        
        
        fs.writeFileSync('./log/'+date+'.txt', text);
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
                $('.main_room_view_button').remove();
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
        clear_screen();
        
        main_view.button_table.children().remove();
        
        
        var sorted_rooms = get_sorted_rooms();
        
        var user_n = 0;
        var room_n = 0;
        for(var key in main)
            {
                user_n += parseInt(main[key]);
                if(main[key] != 0) { room_n++; }
            }


        $('#main_title').text('Monachat ('+room_n+' rooms, '+user_n+' users)');

        
        /**************************
        * Add all room with users
        **************************/
        var tr_el, td_el, button_el;
        var tr_length = 5;
        
        tr_el = document.createElement('TR');
        $(tr_el).attr('class', 'main_button_table_tr');
        
        main_view.button_table.append(tr_el);
        
        for(let i = 0; i < sorted_rooms.length; i++)
            {
                let [n, c] = [ sorted_rooms[i], main[ sorted_rooms[i] ] ];
                if(c == 0) { continue; }
                
                n = sorted_rooms[i];
                
                button_el = document.createElement('button');
                $(button_el).text('Room ' + n + ': ' + c)
                    .attr('class', 'main_room_button')
                    .on('click', function()
                        {
                            session._name      = main_view.data['name'].val();
                            session._character = main_view.data['character'].val();
                            session._stat      = main_view.data['stat'].val();
                            session._trip      = main_view.data['trip'].val();
                            
                            var {_r, _g, _b} = main_view.data['color_picker'].spectrum('get');
                            
                            session._r = _r;
                            session._g = _g;
                            session._b = _b;
                            
                            change_room(n);
                        });
                        
                        
                td_el = document.createElement('TD');
                $(td_el).attr('class', 'main_button_table_td')
                    .append(button_el);
                        
                if($(tr_el).children().length < tr_length)
                    {
                        $(tr_el).append(td_el);
                    }
                else
                    {
                        tr_el = document.createElement('TR');
                        $(tr_el).attr('class', 'main_button_table_tr');
                        
                        $(tr_el).append(td_el);
                        main_view.button_table.append(tr_el);
                    }
            }
            
        
        loader.hide();
    }

function change_character_color(img, r, g, b)
    {
        var {width, height} = img;
        
        buffer_ctx.drawImage(img, 0, 0);
        var data = buffer_ctx.getImageData(0, 0, 128, 128);
        
        
        if(r != 255 || g != 255 || b != 255)
            {
                for(var i = 0; i < data.data.length; i += 4)
                    {
                        var px_r = data.data[i];
                        var px_g = data.data[i+1];
                        var px_b = data.data[i+2];
                        
                        /***********************
                        * Replace white pixels
                        ***********************/
                        if(px_r == 255 && px_g == 255 && px_b == 255)
                            {
                                data.data[i]   = r;
                                data.data[i+1] = g;
                                data.data[i+2] = b;
                            }
                        else
                            {
                                data.data[i]   = parseInt( (px_r + r) / 4 );
                                data.data[i+1] = parseInt( (px_g + g) / 4 );
                                data.data[i+2] = parseInt( (px_b + b) / 4 );
                            }
                    }
            }
                
                
        /******************************************************
        * Convert canvas data to img and set it as img source
        ******************************************************/
        buffer_ctx.putImageData(data, 0, 0);
        
        img.onload = '';
        img.src    = buffer_canvas.toDataURL();
        
        buffer_ctx.clearRect(0, 0, 128, 128);
    }

function append_div(id)
    {
        /********************************
        * Create character image object
        ********************************/
        var img = new Image();
        
        img.onload = function()
            {
                change_character_color(this, user[id].r, user[id].g, user[id].b);
                                
                $(img).attr('id', 'user_div_'+id+'_img')
                    .attr('class', 'user_div_img')
                    .attr('draggable', id == session.id())
                    .css('transform', 'rotatey('+ (user[id].scl == -100 ? 180 : 0) +'deg)')
                    .css('opacity', (is_ignoring(id) || is_ignored(id)) ? 0.5 : 1);
                    
/*
                if(id == session.id())
                    {
                        $(img).on('click', function(e)
                            {
                                session.scl();
                            });
                    }
*/            

                /*******************************
                * Create user container object
                *******************************/
                var div = document.createElement('div');
                
                $(div).attr('id', 'user_div_'+id)
                    .attr('class', 'user_div')
                    .attr('draggable', id == session.id())
                    .css('left', x_scale(user[id].x || 0  ))
                    .css('top',  y_scale(user[id].y || 400))
                    .css('z-index', id == session.id() ? 2 : 1);
                    
                
                if(id == session.id())
                    {
                        $(div).on('click', function()
                            {
                                if(IS_CLICK) { session.scl() }
                                IS_CLICK = true;
                            });
                        
                        $( () => $(div).draggable
                            ({
                                axis       : 'x',
                                revert     : false,
                                containment: 'parent',
                                stop       : function(e)
                                    {
                                        session.x(reverse_x_scale(e.clientX-e.offsetX+1));
                                        
                                        IS_CLICK = false;
                                    }
                            })
                         );
                    }
                else
                    {
                        $(div).on('mousedown', function(e)
                            {
                                if(e.which == 3)
                                    {
                                        show_user_context_menu(id);
                                        e.stopPropagation();
                                    }
                            });
                    }
                
                /*******************************
                * Create user data text object
                *******************************/
                var user_data = create_text_el('');
                $(user_data).attr('class', 'user_div_data')
                    .html(
                        '<br>'
                        + (user[id].name || 'nanashi')
                        + '<br>' + WHITE_TRIP_SYM
                        + user[id].ihash.substr(-6)
                        + (user[id].trip == '' ? '' : ('<br>' + BLACK_TRIP_SYM + user[id].trip))
                    );
                
                
                /**********************
                * Create stat element
                **********************/
                var stat_div = document.createElement('DIV');
                $(stat_div).attr('class', 'user_div_stat')
                    .attr('id', 'user_div_stat_'+id)
                    .css('z-index', 2);
                
                if(user[id].stat != '通常')
                    {
                        var stat   = user[id].stat;
                        
                        var width  = 128;
                        var len = get_px_len(stat);
                        
                        $(stat_div).text(user[id].stat)
                            .width(get_px_len(user[id].stat))
                            .css('display', 'block')
                            .css('left', width/2 - len/2 - 10);
                    }
                
                
                /***************************
                * Append them to room_view
                ***************************/
                $(div).append(img)
                    .append(user_data)
                    .append(stat_div);
                
                $(div).css('display', 'none');
                room_view.el.append(div);
                
                $(div).fadeIn
                ({
                    duration: 300,
                    complete: () => $(div).css('display', 'default')
                });
            }
        
        
        var character = user[id].character;
        
        if(!fs.existsSync('./assets/character/'+character+'.png'))
            {
                character = 'mona';
            }
        
        img.src = './assets/character/'+character+'.png';
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
        div.fadeOut
            ({
                duration: 300,
                complete: () => div.remove()
            });
    }

function add_comment_div(id, cmt)
    {
        if(user[id] == undefined)
            {
                format_log('error', ['id '+id+' doesnt exist.']);
                return;
            }
        else if(is_muted(id))
            {
                return;
            }


        var width = 128;
        var len   = get_px_len(cmt);
        
        var div_el = document.createElement('DIV');
        $(div_el).text(cmt)
            .addClass('comment_div')
            .css('background-color', 'rgb('+user[id].r+', '+user[id].g+', '+user[id].b+')')
            .css('width', len+10)
            .css('left', width/2 - len/2 - 10)
            .on('click', () => clipboard.writeText(cmt) );

        
        $( () => $(div_el).draggable
            ({
                revert: true,
                zIndex: 10,
                start : () => $(div_el).addClass('stop'),
                stop  : () => $(div_el).removeClass('stop')
            })
         );

        
        /**********************************
        * Remove the div after 60 seconds
        **********************************/
        var timeout = setTimeout( () => $(div_el).remove(), 60000 );
        
        
        $('#user_div_'+id).append(div_el);
    }

function show_users_dropdown()
    {
        var keys_n = 0;
        
        room_view.dropdown['users'].children().remove();
        
        for(let id in room)
            {
                if(room[id] == undefined) { continue; }
                
                
                var {name, ihash} = user[id];
                
                var dropdown_el = create_text_el(name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ' ('+id+')');
                $(dropdown_el).attr('class', 'dropdown_el')
                    .css(
                            'background-color',
                            (is_muted(id) || is_ignored(id) || is_ignoring(id))
                                ? 'rgb(255, 0, 0)'
                                : 'rgb(150, 150, 150)'
                        )
                    .on('click', function()
                        {
                            mute(id);
                            
                            $(this).css
                                (
                                    'background-color',
                                    $(this).css('background-color') == 'rgb(150, 150, 150)'
                                        ? 'rgb(255, 0, 0)'     //red
                                        : 'rgb(150, 150, 150)' //grey
                                )
                        });

                
                
                room_view.dropdown['users'].append(dropdown_el);
                
                //$(dropdown_el).append('<hr>');
            }
        
        room_view.dropdown['users'].css( 'top', 370 - room_view.dropdown['users'].height() );
        
        room_view.dropdown['users'].toggle();
    }

function refresh_data_menu(data_menu)
    {
        data_menu['name']     .val(session.name());
        data_menu['character'].val(session.character());
        data_menu['stat']     .val(session.stat());
        data_menu['trip']     .val(session.trip());
        data_menu['x']        .val(session.x());
        data_menu['y']        .val(session.y());
        
        
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
                var {name, character, stat, trip, r, g, b, x, y} = e.target.value == 'Default'
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

        
        data_menu['color_picker'].spectrum('set', 'rgb('+session.r()+', '+session.g()+', '+session.b()+')');
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
                { label: 'Sound ' + (SOUND_ON  ? 'on'  : 'off' ), click() { SOUND_ON  = !SOUND_ON;  } },
                { label: 'Popup ' + (POPUP_ALL ? 'all' : 'some'), click() { POPUP_ALL = !POPUP_ALL; } },
                {
                    label: 'New', click()
                    {
                        new_instance( { n: 1, room: session.room(), prof: session.get_data() } );
                    }
                }
            ];
            
        menu = Menu.buildFromTemplate(template);
        menu.popup(win);
    }

function show_config_login_menu()
    {
        config_menu['name']      .val(config.name);
        config_menu['character'] .val(config.character);
        config_menu['stat']      .val(config.stat);
        config_menu['trip']      .val(config.trip);
        config_menu['rgb']       .val('test');
        config_menu['x']         .val(config.x);
        config_menu['y']         .val(config.y);
        config_menu['scl']       .val(config.scl);
        config_menu['room']      .val(config.room);
        config_menu['server']    .val(config.server);
        config_menu['proxy']     .val(config.proxy);
        config_menu['timeout']   .val(config.timeout);
        config_menu['site']      .val(config.site);
        
        config_menu.login.toggle();
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
                refresh_data_menu(main_view.data);
                
                
                /**************************
                * Refresh character color
                **************************/
                main_view.data['character_img'].one('load', function()
                    {
                        var [r, g, b] = [session.r(), session.g(), session.b()];
                        
                        change_character_color(this, r, g, b);
                    });
                main_view.data['character_img'].attr('src', './assets/character/'+session.character()+'.png');

                
                var character = session.character();
                
                if(!fs.existsSync('./assets/character/'+character+'.png')) { character = 'mona'; }
                main_view.data['character_img'].attr('src', './assets/character/'+character+'.png');
                
                
                room_view.el.hide();
                main_view.el.show();
                
                //format_log('room', [room]);
            }
        else
            {
                main_view.el.hide();
                room_view.el.show();
                
                format_log('room', [room]);
            }
        
        
        session.room(room);
    }

function change_server(server)
    {
        var res = session.server(server);
        
        if(!res)
            {
                format_log('error', ['Server name not valid.']);
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
                try { jsonfile.writeFileSync('trip.json', trip_list); }
                catch(err) { throw err; alert(err); }
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

function play(path)
    {
        audio[0].pause();
        audio[0].src = path;
        audio[0].play();
    }

function add_profile()
    {
        var {_name, _character, _stat, _trip, _r, _g, _b, _x, _y, _scl} = session;
        
        config['profiles'][_name] =
            {
                'name'     : session.name(),
                'character': session.character(),
                'stat'     : session.stat(),
                'trip'     : session.trip(),
                'r'        : session.r(),
                'g'        : session.g(),
                'b'        : session.b(),
                'x'        : session.x(),
                'y'        : session.y(),
                'scl'      : session.scl()
            };

        
        try { jsonfile.writeFileSync('./config.json', config); }
        catch(err) { throw err; alert(err); }
    }

function delete_profile(name)
    {
        if(!config.profiles[name])
            {
                return;
            }
        else
            {
                delete config.profiles[name];
                
                try { jsonfile.writeFileSync('./config.json', config); }
                catch(err) { throw err; alert(err); }
            }
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

function new_instance(data)
    {
        if(data.n == undefined || data.room == undefined || data.prof == undefined)
            {
                return;
            }
        
        for(var i = 0; i < data.n; i++)
            {
                require('child_process').spawn
                    (
                        ARGV[0],
                        [
                            '.',
                            'proxy',     '1',
                            'name',      data.prof.name,
                            'character', data.prof.character,
                            'stat',      data.prof.stat,
                            'trip',      data.prof.trip,
                            'r',         data.prof.r,
                            'g',         data.prof.g,
                            'b',         data.prof.b,
                            'x',         data.prof.x,
                            'y',         data.prof.y,
                            'scl',       data.prof.scl,
                            'room',      data.room
                        ],
                        {
                            detached: true
                        }
                    );
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
                
                ignoring[user[id].ihash] = is_ignored(id) ? false : true;
                
                $('#user_div_'+id+'_img').css('opacity', is_ignored(id) ? 0.5 : 1);
            }
    }

function mute(id)
    {
        if(user[id] == undefined)
            {
                return;
            }
        else
            {            
                var ihash = user[id].ihash;
                
                muted[ihash] = is_muted(id) ? 1 : undefined;
                
                if($('#user_div_'+id)) { $('#user_div_'+id).toggle(); }
            }
    }

function toggle_proxy()
    {
        clear_screen();
        
        session.proxy();
        
        room_view.button['proxy'].css('background-color', session._proxy ? 'rgb(100, 100, 100)' : 'white');
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
                        
                        //console.log('connected', id);
                        
                        session.id(id);
                    }
                else if(xml.name == 'UINFO')
                    {
                        var {n, c, id, ihash, name} = xml.attr;
                        
                        //console.log('uinfo', xml.attr);
                        alert('uinfo');
                    }
                else if(xml.name == 'COUNT')
                    {
                        if(session.room() != 'main')
                            {
                                var [n, c] = [xml.attr.n, xml.attr.c];
                                
                                //console.log('room count', xml);
                                //console.log('c:', c, 'n:', n);
                                
                                document.title = 'Monachat '
                                    + '[room: '+ n + ' users: ' + c + '] '
                                    + '@ '
                                    + format_user_data(session.id(), 3);
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
                        console.log('user', user[id]);
                        console.log('enter', xml.attr);
                        
                        if(id != session.id()) { format_log('enter', [id]); }
                        
                        
                        if(SOUND_ON) { play('./sound/enter.wav'); }
                    }
                else if(xml.name == 'USER')
                    {
                        var {id} = xml.attr;
                        
                        user[id] = new User(xml);
                        room[id] = user[id];
                        add_trip(id);
                        
                        append_div(id);
                        
                        console.log('enter', xml.attr);
                        
                        if(id != session.id()) { format_log('enter', [id]); }
                    }
                else if(xml.name == 'EXIT')
                    {
                        var {id} = xml.attr;
                        
                        //console.log('exit', xml.attr);
                        
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
                                
                                
                                if(SOUND_ON) { play('./sound/enter.wav'); }
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
                                
                                move_div(id);
                                user[id].scl = xml.attr.scl;
                            }
                        
                        if(xml.attr.stat != undefined)
                            {
                                var {stat} = xml.attr;
                                
                                
                                user[id].stat = stat;
                                format_log('stat', [id]);
                                
                                
                                /***************
                                * Set stat div
                                ***************/
                                if(stat == '通常')
                                    {
                                        $('#user_div_stat_'+id).hide();
                                    }
                                else
                                    {
                                        var width = 128;
                                        var len   = get_px_len(stat);
                                        
                                        $('#user_div_stat_'+id).text(stat)
                                            .width(get_px_len(user[id].stat))
                                            .css('left', width/2 - len/2 - 10)
                                            .show();
                                    }
                            }
                    }
                else if(xml.name == 'IG')
                    {
                        var {id, ihash, stat} = xml.attr;
                        
                        format_log('ig', [id, ihash, stat]);
                        //console.log('ig', xml);
                        
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
                        
                        
                        if(SOUND_ON) { play('./sound/comment.wav'); }
                        
                        if(is_repeated(id)) { session.comment(cmt); }
                    }
                else
                    {
                        console.log('Unknown message');
                        console.log('msg:',msg);
                        console.log('xml',xml);
                        
                        log('error', ['Unknown message']);
                        log('error', msg);
                    }
                
                
                bot(msg);
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
        else if(com[0] == 'tinyurl')     { tinyurl(com[1]);                     }
        else if(com[0] == 'popup')       { POPUP_ENABLED = !POPUP_ENABLED;      }
        else if(com[0] == 'profile')     { load_profile(com[1]);                }
        else if(com[0] == 'saveprofile') { add_profile();                       }
        else if(com[0] == 'delprofile')  { delete_profile(com[1]);              }
        else if(com[0] == 'savelog')     { save_log();                          }
        else if(com[0] == 'next')        { next_room();                         }
        else if(com[0] == 'prev')        { previous_room();                     }
        else if(com[0] == 'copy')        { copy(com[1]);                        }
        else if(com[0] == 'server')      { change_server(com[1]);               }
        else if(com[0] == 'default')     { set_default();                       }
        else if(com[0] == 'invisible')   { set_invisible();                     }
        else if(com[0] == 'nanashi')     { set_nanashi();                       }
        else if(com[0] == 'random')      { set_random(com[1]);                  }
        else if(com[0] == 'room')        { change_room(com[1]);                 }
        else if(com[0] == 'mute')        { mute(com[1]);                        }
        else if(com[0] == 'relogin')     { relogin();                           }
        else if(com[0] == 'new')
            {
                if(com.length == 2)
                    {
                        new_instance( {n: com[1], prof: session.get_data()} );
                    }
                else if(com.length == 3)
                    {
                        if(Number.isInteger(com[2]))
                            {
                                new_instance( {n: com[1], room: com[2]} )
                            }
                        else
                            {
                                new_instance( {n: com[1], prof: config.profiles[com[2]]} );
                            }
                    }
                else if(com.length == 4)
                    {
                        new_instance( {n: com[1], room: com[2], prof: config.profiles[com[3]]} );
                    }
            }
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
    try
        {
            config         = jsonfile.readFileSync('./config.json');
            login_data     = jsonfile.readFileSync('./config.json');
            trip_list      = jsonfile.readFileSync('./trip.json');
            character_list = jsonfile.readFileSync('./character_list.json');
        }
   catch(err)
        {
            throw err;
            process.exit();
        }
    
    process_arguments();
    
    
    /*****************
    * Load constants
    *****************/
    POPUP_ENABLED = config['popup'];
    SOUND_ON      = config['sound'];
    
    
    /*************************
    * Set room view elements
    *************************/
    room_view.el = $('#room_view');
    
    room_view.log   = $('#log_div');
    room_view.input = $('.text_input');
    
    
    room_view.dropdown['users']  = $('#users_dropdown');
    room_view.dropdown['stat']   = $('#stat_dropdown');
    room_view.dropdown['config'] = $('#config_dropdown');
    
    
    room_view.button['log']     = $('#log_button');
    room_view.button['save']    = $('#save_log_button');
    room_view.button['data']    = $('#data_button');
    room_view.button['users']   = $('#users_button');
    room_view.button['stat']    = $('#stat_button');
    room_view.button['config']  = $('#config_button');
    room_view.button['back']    = $('#back_button');
    room_view.button['reenter'] = $('#reenter_button');
    room_view.button['relogin'] = $('#relogin_button');
    room_view.button['proxy']   = $('#proxy_button');
    
    room_view.button['config_login']   = $('#config_login');
    room_view.button['config_trigger'] = $('#config_trigger');
    room_view.button['config_client']  = $('#config_client');
    
    
    room_view.data['el'] = $('#room_data_menu');
    
    room_view.data['profile']         = $('#room_data_profile');
    room_view.data['name']            = $('#room_data_name');
    room_view.data['character']       = $('#room_data_character');
    room_view.data['character_arrow'] = $('#room_data_character_arrow');
    room_view.data['stat']            = $('#room_data_stat');
    room_view.data['trip']            = $('#room_data_trip');
    room_view.data['x']               = $('#room_data_x');
    room_view.data['y']               = $('#room_data_y');
    room_view.data['color_picker']    = $('#room_data_color_picker');
    room_view.data['cancel']          = $('#room_data_cancel_button');
    room_view.data['accept']          = $('#room_data_accept_button');
    
    
    /***************************
    * Set config menu elements
    ***************************/
    config_menu['login']   = $('#config_login_menu');
    config_menu['trigger'] = $('#config_trigger_menu');
    config_menu['client']  = $('#config_client_menu');
    
    config_menu['name']      = $('#config_menu_name');
    config_menu['character'] = $('#config_menu_character');
    config_menu['stat']      = $('#config_menu_stat');
    config_menu['trip']      = $('#config_menu_trip');
    config_menu['rgb']       = $('#config_menu_rgb');
    config_menu['x']         = $('#config_menu_x');
    config_menu['y']         = $('#config_menu_y');
    config_menu['scl']       = $('#config_menu_scl');
    config_menu['room']      = $('#config_menu_room');
    config_menu['server']    = $('#config_menu_server');
    config_menu['proxy']     = $('#config_menu_proxy');
    config_menu['site']      = $('#config_menu_site');
    config_menu['timeout']   = $('#config_menu_timeout');
    
    config_menu['login_accept'] = $('#config_menu_login_accept_button');
    config_menu['login_cancel'] = $('#config_menu_login_cancel_button');
        
    
    /*********************
    * Main view elements
    *********************/
    main_view.el = $('#main_view');
    
    main_view.button['reenter'] = $('#main_reenter_button');
    
    main_view.button_table = $('#main_button_table');
    
    main_view.data['el'] = $('#main_data');
    
    main_view.data['profile']       = $('#main_data_profile');
    main_view.data['name']          = $('#main_data_name');
    main_view.data['character']     = $('#main_data_character');
    main_view.data['stat']          = $('#main_data_stat');
    main_view.data['trip']          = $('#main_data_trip');
    main_view.data['x']             = $('#main_data_x');
    main_view.data['y']             = $('#main_data_y');
    main_view.data['color_picker']  = $('#main_data_color_picker');
    main_view.data['character_img'] = $('#main_data_character_img');
    
    
    main_view['server'] = $('#main_server_select');
    main_view['room']   = $('#main_room_input');
    
    
    /**********************
    * Set global elements
    **********************/
    audio = $('#audio');
    
    loader = $('#loader');
    
    
    /******************
    * Room view events
    ******************/
    room_view.el.on('mousedown', function(e)
        {
            if(e.which == 3)
                {
                    show_command_context_menu();
                    return true;
                }
        });
    room_view.el.on('keyup', function(e)
        {
            if(e.key == 'Tab' && e.target.parentElement.className == 'container')
                {
                    room_view.input.focus();
                }
        });
    
    room_view.button['log']    .on('click', () => room_view.log.toggle()                );
    room_view.button['save']   .on('click', () => save_log()                            );
    room_view.button['reenter'].on('click', () => session.reenter()                     );
    room_view.button['users']  .on('click', () => show_users_dropdown()                 );
    room_view.button['stat']   .on('click', () => room_view.dropdown['stat'].toggle()   );
    room_view.button['proxy']  .on('click', () => toggle_proxy()                        );
    room_view.button['relogin'].on('click', () => relogin()                             );
    room_view.button['config'] .on('click', () => room_view.dropdown['config'].toggle() );
    room_view.button['back']   .on('click', function()
        {
            change_room('main');
            
            setTimeout(() => session.reenter(), 1000); ////test
        });
    room_view.button['data'].on('click', function()
        {
            if(room_view.data.el.css('display') != 'none')
                {
                    room_view.data.el.toggle();
                    character_menu.hide();
                }
            else
                {
                    refresh_data_menu(room_view.data);
                    room_view.data.el.show();
                }
        });

    room_view.button['config_login'].on('click', function()
        {
            show_config_login_menu();
            room_view.dropdown['config'].toggle();
        });
    room_view.button['config_trigger'].on('click', function()
        {
            var list = '';
            for(var i = 0; i < config['popup_trigger'].length; i++)
                {
                    list += config['popup_trigger'][i] + '\n';
                }

            $('#config_trigger_list').val(list);
            
            config_menu['trigger'].toggle();
        });
    $('#config_menu_trigger_cancel_button').on('click', function()
        {
            config_menu['trigger'].toggle();
        });
    $('#config_menu_trigger_accept_button').on('click', function()
        {
            var list = $('#config_trigger_list').val().split('\n').filter( (line) => line != '' );
            
            config['popup_trigger'] = list;
            
            if(list.length > 0)
                {
                    try { jsonfile.writeFileSync('./config.json', config); }
                    catch(err) { throw err; alert(err); }
                }
            
            config_menu['trigger'].toggle();
        });
    room_view.button['config_client'].on('click', function()
        {
            config_menu['client'].toggle();
        });
    
    room_view.data['character_arrow'].on('click', function()
        {
            if(character_menu.css('display') != 'none') { character_menu.hide(); return; }
            
            var children = $('.character_menu_div');
            $('.character_menu_img').remove();
            
            for(let i = 0; i < children.length; i++)
                {
                    console.log(children[i]);
                    let character = $(children[i]).attr('character');
                    var img_el    = new Image();
            
                    $(img_el).one('load', function()
                        {
                            var {_r, _g, _b} = room_view.data['color_picker'].spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });
            
                    $(img_el).attr('src', './assets/character/'+character+'.png')
                        .addClass('character_menu_img')
                        .on('click', function()
                            {
                                room_view.data['character'].val(character);
                                character_menu.hide();
                            });
                    
                    $(children[i]).append(img_el);
                }
            
            character_menu.toggle();
        });
    room_view.data['color_picker'].on('change', function()
        {
            if(character_menu.css('display') == 'none') { return; }
            
            var imgs = $('.character_menu_img');
            if(!imgs) { return; }
            
            for(let i = 0; i < imgs.length; i++)
                {
                    let character = $(imgs[i]).parent().attr('character');
                    
                    $(imgs[i]).one('load', function()
                        {
                            var {_r, _g, _b} = room_view.data['color_picker'].spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });
                        
                    $(imgs[i]).attr('src', './assets/character/' + character + '.png')
                        .on('click', function()
                            {
                                room_view.data['character'].val(character);
                                character_menu.hide();
                            });
                }
        });
    room_view.data['cancel'].on('click', function()
        {
            room_view.data.el.toggle();
        });
    room_view.data['accept'].on('click', function()
        {
            var {_r, _g, _b} = room_view.data['color_picker'].spectrum('get');
            
            session.set_data
                ({
                    name:      room_view.data['name'].val(),
                    character: room_view.data['character'].val(),
                    stat:      room_view.data['stat'].val(),
                    trip:      room_view.data['trip'].val(),
                    r:         parseInt(_r),
                    g:         parseInt(_g),
                    b:         parseInt(_b),
                    x:         room_view.data['x'].val(),
                    y:         room_view.data['y'].val(),
                    scl:       session.scl()
                });
            
            
            room_view.data.el.hide();
            character_menu.hide();
            
            clear_screen();
        });

    character_menu = $('#character_menu');

    
    /**************
    * Config menu
    **************/
    config_menu['login_cancel'].on('click', function()
        {
            config_menu.login.toggle();
        });
    config_menu['login_accept'].on('click', function()
        {
            config.name     　= config_menu['name'].val();
            config.character = config_menu['character'].val();
            config.stat     　= config_menu['stat'].val();
            config.trip     　= config_menu['trip'].val();
          //config_menu['rgb'].val('test');
            config.x        　= config_menu['x'].val();
            config.y        　= config_menu['y'].val();
            config.scl      　= config_menu['scl'].val();
            config.room     　= config_menu['room'].val();
            config.server   　= config_menu['server'].val();
            config.proxy    　= config_menu['proxy'].val() == "false" ? false : true;
            config.timeout  　= config_menu['timeout'].val();
            config.site     　= config_menu['site'].val();
            
            try { jsonfile.writeFileSync('./config.json', config); }
            catch(err) { throw err; alert(err); }
            
            
            config_menu.login.toggle();
        });

    
    /**************************
    * Input bar keydown event
    **************************/
    room_view.input.on('keydown', function(e)
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
                            
                            room_view.input.val( prev_input[prev_input.length - prev_input_n] );
                        }
                }
            else if(e.key == 'ArrowDown')
                {
                    if(prev_input.length != 0 && prev_input_n > 0)
                        {
                            prev_input_n--;
                            
                            room_view.input.val( prev_input[prev_input.length - prev_input_n] );
                        }
                }
        });

    
    /*******************
    * Main view events
    *******************/
    main_view.button['reenter'].on('click', function() { session.reenter(); });
    
    main_view.data['color_picker'].on('change', function()
        {
            main_view.data['character_img'].one('load', function()
                {
                    var {_r, _g, _b} = main_view.data['color_picker'].spectrum('get');
                    
                    change_character_color(this, _r, _g, _b);
                });

            
            main_view.data['character_img'].attr('src', './assets/character/'+session.character()+'.png');
        });
    
    main_view.data['character'].on('keyup', function()
        {
            var character = main_view.data['character'].val();
            if(fs.existsSync('./assets/character/'+character+'.png'))
                {
                    main_view.data['character_img'].one('load', function()
                        {
                            var {_r, _g, _b} = main_view.data['color_picker'].spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });

                    main_view.data['character_img'].attr('src', './assets/character/'+character+'.png');
                };
        });

    main_view['server'].on('change', function(e)
        {
            main = {};
            refresh_main();
            
            change_server(e.target.value);
            setTimeout(() => session.reenter(), 1000); ////test
        });
    main_view['room'].on('keydown', function(e)
        {
            if(e.key == 'Enter')
                {
                    change_room(main_view['room'].val());
                }
        });

    $('#github_icon').on
        (
            'click',
            (e) => open_with_browser(e, 'https://github.com/nishinishi9999/monachat-html5-client')
        );
    
    
    room_view.data['color_picker'].spectrum
        ({
            color          : 'black',
            showInput      : true,
            preferredFormat: 'rgb',
            showPalette    : true,
            palette        : COLOR_LIST
        });
    
    main_view.data['color_picker'].spectrum
        ({
            color          : 'black',
            showInput      : true,
            preferredFormat: 'rgb',
            showPalette    : true,
            palette        : COLOR_LIST
        });


    /*************************
    * Add character_menu_div
    *************************/
    var sorted_n = [];
    for(var character in character_list)
        {
            sorted_n.push(character);
        }
    
    sorted_n.sort((a, b) => character_list[a].n - character_list[b].n);
    
    for(var i = 0; i < sorted_n.length; i++)
        {
            var div_el = document.createElement('DIV');
            $(div_el).addClass('character_menu_div')
                .addClass('category_'+character_list[sorted_n[i]].category)
                .attr('character', sorted_n[i]);

            $(character_menu).append(div_el);
        }
    
    
    /**************************************
    * Add default status to stat dropdown
    **************************************/
    var row = document.createElement('DIV');
    $(row).addClass('stat_dropdown_row')
        .css('display', 'table-row');
    
    room_view.dropdown['stat'].append(row);
    
    for(let i = 0; i < DEFAULT_STAT.length; i++)
        {
            let text_el = create_text_el(DEFAULT_STAT[i]);
            $(text_el).addClass('stat_dropdown_cell')
                .css('display', 'table-cell')
                .on('click', function()
                    {
                        session.stat(DEFAULT_STAT[i]);
                        
                        room_view.dropdown['stat'].toggle();
                    } );
            
            if($(row).children().length == 2)
                {
                    row = document.createElement('DIV');
                    $(row).addClass('stat_dropdown_row')
                        .css('display', 'table-row');
                    
                    room_view.dropdown['stat'].append(row);
                }
            
            $(row).append(text_el);
        }

    var div = document.createElement('DIV');
    $(div).addClass('stat_dropdown_cell');
    
    var label = document.createElement('LABEL');
    $(label).text('Stat:')
        .attr('for', 'stat_dropdown_input');
    
    var input = document.createElement('INPUT');
    $(input).attr('id', 'stat_dropdown_input');
    
    
    $(div).append(label);
    $(div).append(input);
    
    
    $(row).append(div);
    
    
    /****************************************************************
    * Set login button background if it is initialized with a proxy
    ****************************************************************/
    POPUP_ENABLED = config['popup'];
    if(login_data['proxy']) { room_view.button['proxy'].css('background-color', 'rgb(100, 100, 100)'); }
    
    
    
    /********
    * Login
    ********/
    session = new Monachat(login_data, signal_handler);
    session.connect();
    
    
    /******************
    * Show login room
    ******************/
    if(session.room() == 'main')
        {
            $('.container').hide();
            refresh_data_menu(main_view.data);
            
            var character = main_view.data['character'].val();
            if(fs.existsSync('./assets/character/'+character+'.png'))
                {
                    main_view.data['character_img'].attr('src', './assets/character/'+character+'.png');
                };
            
            main_view.el.show();
            
            setTimeout(() => session.reenter(), 1000); //// test
        }
    else
        {
            main_view.el.hide();
        }
}