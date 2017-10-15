// monachat.js

const {app}          = require('electron').remote;
const {Menu, dialog} = require('electron').remote;
const {shell}        = require('electron');
const {clipboard}    = require('electron');
const {ipcRenderer}  = require('electron');

//var child = require('child_process');

const fs       = require('fs');

const xmldoc   = require('xmldoc');
const jsonfile = require('jsonfile');
const notifier = require('node-notifier');
const spectrum = require('spectrum-colorpicker'); // Neccesary or it bugs on start

const Monachat = require('./assets/js/monachat.jsm');
const util     = require('./assets/js/util.js');
const contrast = require('./assets/js/contrast.js');

const win = require('electron').remote.getCurrentWindow();


/************
* Constants
************/
const ARGV           = require('electron').remote.getGlobal('argv');
//const JP_REGEX       = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;
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

var room_view = { button: {}, el: '', data: {}, new_menu: {}, dropdown: {} };
var main_view = { button: {}, el: '', data: {}, dropdown: {} };

//var data_menu   = {};

var muted       = {};
var muted_stat  = {};
var stalk       = {};
var repeat      = {};
var filtered    = {};

var config      = {};
var login_data  = {};

var ignoring    = {};

var config_menu = {};


var slave    = [];
var slave_id = []; // For master in slave_ipc


/***********************************
* Placeholders for global elements
***********************************/

/*********
* Global
*********/
var session;

var loader;
var loader_small;
var eye_icon;

/************
* Room view
************/
var audio;


/***************
* Global flags
***************/
var LANGUAGE;
var POPUP_ALL       = false;
var IS_LOADING_MAIN = false;
var IS_MASTER       = true;
var KEEP_LOOKING_ID = false;
var ALWAYS_ON_TOP   = false;
//var SHOW_ALL_ROOMS  = false;
var LOOP_ID         = false;
var MAX_Y           = 275;
var PID             = 'MASTER';

var LOG_TEXT_BACKGROUND;
var GET_ALL_MAIN;
var POPUP_ENABLED;
var SOUND_ON;
var IS_TRANSPARENT;
var LOG_POS;
var PREV_ROOM;


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

/***********
* Bot list
***********/
var bots = [];

/****************************************
* Offset of the character click on drag
* If this is not set, the stop event
* target is set to room_view
****************************************/
//var drag_offset_x;


/*********************
* Load configuration
*********************/
try
    {
        config         = jsonfile.readFileSync('./config.json');
        login_data     = jsonfile.readFileSync('./config.json');
        trip_list      = jsonfile.readFileSync('./trip.json');
        character_list = jsonfile.readFileSync('./character_list.json');
        
        LANGUAGE            = config.language;
        SOUND_ON            = config.sound;
        POPUP_ENABLED       = config.popup;
        GET_ALL_MAIN        = config.get_all_main;
        LOG_TEXT_BACKGROUND = config.log_text_background;
        
        var room_view_css = document.styleSheets[4];
        
        room_view_css.insertRule('.comment_div { animation-duration: ' + config.comment_speed*2 + 's; }', 0);
        room_view_css.insertRule('.log { background-color: ' + config.background + '; }', 0);
    }
catch(err)
    {
        throw err;
        //process.exit();
    }
    
process_arguments();
load_bots();


/*******************
* Master-slave IPC
*******************/
ipcRenderer.on('master_msg', function(e, msg)
    {
        console.log('Message from master: ', msg);
        console.log(e);
        
        command_handler(msg);
        
        //e.sender.send('Message received.');
    });
ipcRenderer.on('slave_msg', function(e, msg)
    {
        console.log('Message from child: ', msg);
    });


/***************************************************
* Name        : send_slave
* Description : Sends a message to all slaves
* Takes       : msg (str) - Message for the slaves
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
***************************************************/
function send_slave(msg)
    {
        for(var i = 0; i < slave.length; i++)
            {
                if(slave[i].connected) { slave[i].send(msg); }
            }
    }

function send_each_slave(f)
    {
        var connected = slave.filter( (obj) => obj.connected );
        
        for(var i = 0; i < connected.length; i++)
            {
                connected[i].send( f() );
            }
    }

function send_slave_id()
    {
        session.send('<SET com="slaveid" pid="'+PID+'" />\0');
    }

function send_slave_with_id(id, data)
    {
        for(var i = 0; i < slave.length; i++)
            {
                if(slave[i].id !== undefined && slave[i].id == id)
                    {
                        slave[i].send(data);
                    }
            }
    }

ipcRenderer.on('save_log', function(e)
    {
        save_log();
        
        ipcRenderer.send('end');
    });


/*************
* User class
*************/
function User(xml)
    {
        var user = xml.attr;
        
        this.name      = user.name  || 'nanashi';
        this.character = user.type  || 'mona';
        this.stat      = user.stat  || '通常';
        this.trip      = user.trip  || '';
        this.ihash     = user.ihash || 'ANON';
        this.r         = rgb_scale(user.r || 100);
        this.g         = rgb_scale(user.g || 100);
        this.b         = rgb_scale(user.b || 100);
        this.x         = user.x     || 0;
        this.y         = user.y     || 400;
        this.scl       = user.scl   || 100;
    }


/*************************
* Signal limits: 30, 704
* Screen limits: 60, 740
*************************/
var SCREEN_MIN_X = 60;
var SCREEN_MAX_X = 662;
var SIGNAL_MIN_X = 30;
var SIGNAL_MAX_X = 704;
function x_to_left(x)
    {
        if     (x < SIGNAL_MIN_X)     { return x_to_left(SIGNAL_MIN_X); }
        else if(x > SIGNAL_MAX_X)     { return x_to_left(SIGNAL_MAX_X); }
        else if(isNaN(parseFloat(x))) { return x_to_left(SIGNAL_MIN_X); }
        else
            {
                var [a, b]     = [SIGNAL_MIN_X, SIGNAL_MAX_X];
                var [min, max] = [SCREEN_MIN_X, SCREEN_MAX_X];
                
                return parseInt((((b-a)*(x-min))/(max-min)) + a);
            }
    }

function left_to_x(left)
    {
        var [a, b]     = [SCREEN_MIN_X, SCREEN_MAX_X];
        var [min, max] = [SIGNAL_MIN_X, SIGNAL_MAX_X];
        
        return parseInt((((b-a)*(left-min))/(max-min)) + a);
    }

function y_to_top(y)
    {
        y = MAX_Y; //// temporal and fixed by css
        
        if     (y < 235) { return y_to_top(235); }
        else if(y > MAX_Y) { return y_to_top(MAX_Y); }
        
        var [a, b]     = [0, MAX_Y];
        var [min, max] = [0, 366];
        
        return parseInt(　(((b-a)　*　(y-min))　/　(max-min)) + a　);
    }

function top_to_y(top)
    {
        if     (top < 235) { return y_to_top(235); }
        else if(top > 275) { return y_to_top(275); }
        
        var [a, b]     = [0, 275];
        var [min, max] = [0, 275];
        
        return parseInt(　(((b-a)　*　(top-min))　/　(max-min)) + a　);
    }

function rgb_scale(c)
    {
        var [a, b] 　　　= [0, 255];
        var [min, max] = [0, 100];
        
        return parseInt((((b-a)*(c-min))/(max-min)) + a);
    }

function get_px_len(str)
    {
        var span = $(document.createElement('SPAN'))
            .attr('id', 'px_len')
            .css('display', 'none')
            .text(str)[0];

        $('body').append(span);
        
        var len = $(span).width();
        
        $(span).remove();
        
        return len;
    }

function save_config()
    {
        /*********************
        * Check if it's void
        *********************/
        if(config.name === undefined) { return; }
        
        try { jsonfile.writeFileSync('./config.json', config); }
        catch(err) { alert(err); throw err; }
    }

function save_trip()
    {
        /*********************
        * Check if it's void
        *********************/
        if(Object.keys(trip_list).length > 0)
            {
                try { jsonfile.writeFileSync('./trip.json', trip_list); }
                catch(err) { alert(err); throw err; }
            }
    }

function load_bots()
    {
        var bot_list = fs.readdirSync('./assets/js/bots').filter( (file) => file.match(/\.js$/) );

        for(let i = 0; i < bot_list.length; i++)
            {
                if( require.cache[ require.resolve('./assets/js/bots/' + bot_list[i]) ] !== undefined)
                    {
                        delete require.cache[ require.resolve('./assets/js/bots/' + bot_list[i]) ];
                    }
                
                bots.push( require('./assets/js/bots/' + bot_list[i]) );
                
                if(config.default_bots[bots[i].name] !== undefined)
                    {
                        config.default_bots[ bots[i].name ] === true
                            ? bots[i].on()
                            : bots[i].off();
                    }
            }
    }

function open_with_browser(e, url)
    {
        e.preventDefault();
        
        shell.openExternal(url);
    }

function log(el_arr)
    {
        /*********************
        * Create div element
        *********************/
        var div_el = $(document.createElement('DIV'))
            .attr('class', 'log_div_el')
            .css('padding-top', 4)[0];
        
        
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
        
        
        var is_buttom =
            room_view.log[0].scrollHeight - room_view.log[0].clientHeight <= room_view.log[0].scrollTop + 1;
            
        
        room_view.log.append(div_el);
        
        if(el_arr !== undefined && el_arr.length > 0)
            {
                ipcRenderer.send( 'append_log', el_arr.map( (el) => el.outerHTML ) );
            }
        
        
        
        /**********************************
        * Scroll automatically to the end
        **********************************/
        if(is_buttom) { room_view.log[0].scrollTop = room_view.log[0].scrollHeight; }
    }

function log_newline(n)
    {
        for(var i = 0; i < n; i++)
            {
                log(['<br>']);
            }
    }

function log_nbsp_el(n)
    {
        return $(document.createElement('NBSP'))
            .html('&nbsp'.repeat(n))[0];
    }

function log_text_el(line, r, g, b)
    {
        r = r || 0;
        g = g || 0;
        b = b || 0;
        
        var text_el = $(document.createElement('TEXT'))
            .text(line)
            .addClass('log_text_el')
            .css('color', 'rgb('+r+', '+g+', '+b+')')[0];
        
        
        var L1    = contrast.luminiscence(200, 200, 200);
        var L2    = contrast.luminiscence(r, g, b);
        var ratio = contrast.contrast_ratio(L1, L2);
        
        if(ratio < 3 && !(r == 255 && g == 255 && b == 255))
            {/*
                while(ratio < 4)
                    {
                        r = (r + 1) % 255;
                        g = (g + 1) % 255;
                        b = (b + 1) % 255;
                        
                        L1    = contrast.luminiscence(200, 200, 200);
                        L2    = contrast.luminiscence(r, g, b);
                        ratio = contrast.contrast_ratio(L1, L2);
                        
                        console.log('ratio: ', ratio);
                    }
*/
                r = (200-r) < 0 ? -(200-r) : (200-r);
                g = (200-g) < 0 ? -(200-g) : (200-g);
                b = (200-b) < 0 ? -(200-b) : (200-b);
                if(LOG_TEXT_BACKGROUND) { $(text_el).css('background-color', 'rgb('+r+', '+g+', '+b+')'); }
            }
        
        
        return text_el;
    }

function log_a_el(url)
    {
        return $(document.createElement('A'))
            .text(url)
            .attr('href', url)
            .attr('class', 'log_div_a')
            .on('click', (e) => open_with_browser(e, url))[0];
    }

function log_img_el(url)
    {
        return $(document.createElement('IMG'))
            .attr('src', url)
            .attr('href', url)
            .addClass('log_img_el')
            .on('click', (e) => open_with_browser(e, url))[0];
    }

function log_time_el()
    {
        return log_text_el('['+ new Date().toLocaleTimeString() +'] ');
    }

function create_option_el(value)
    {
        return $(document.createElement('OPTION'))
            .text(value)
            .attr('value', value)[0];
    }

function is_ignored(id)    { return (user[id] !== undefined && session._ignored[user[id].ihash] === true); }
function is_ignoring(id)   { return (user[id] !== undefined && ignoring[user[id].ihash]         === true); }
function is_muted(id)      { return (user[id] !== undefined && muted[user[id].ihash]            === true); }
function is_muted_stat(id) { return (user[id] !== undefined && muted_stat[user[id].ihash]       === true); }

function is_filtered(id)
    {
        if(user[id] === undefined && Object.keys(filtered).length > 0) { return false; }
        
        for(var param in user[id])
            {
                if( filtered[param] !== undefined && filtered[param].includes(user[id][param]) )
                    {
                        return true;
                    }
            }
    }

function format_user_data(id, n)
    {
        if(user[id] === undefined)
            {
                user[id] = new User
                    ({ attr:
                            {
                                name     : '',
                                character: '',
                                ihash    : '_ANONYMOUS'
                            }
                    });
                room[id] = user[id];
            }
        
        var {name, character, stat, trip, ihash, r, g, b, x, y} = user[id];
        
        var line = name;
        if(n > 1) { line += ' ' + WHITE_TRIP_SYM + ihash.substr(-6); }
        if(n > 2) { line += ' ' + (trip === '' ? '' : (BLACK_TRIP_SYM + trip)); }
        if(n > 3) { line += ' ' + stat; }
        if(n > 4) { line += ' ' + character; }
        if(n > 5) { line += ' r:' + r + ' g:' + g + ' b:' + b; }
        if(n > 6) { line += ' x:' + x + ' y:' + y; }
        
        line += ' (' + id + ')';
        
        return line;
    }

function format_log(type, args)
    {
        if(session.room() == 'main') { return; }
        
        var id, stat, room, ihash, r, g, b;
        var user_el, info_el, nbsp_el;
        var first_hr_el, second_hr_el;
        
        var i;
        
        var text =
            {
                has_logged_in : LANGUAGE == 'EN' ? ' has logged in.'       : ' が入室しました。' ,
                has_exited    : LANGUAGE == 'EN' ? ' has exited the room.' : ' が退室しました。'
            };
        
        
        var time_el = log_time_el();
        var r_arrow = log_text_el('--> ');
        var l_arrow = log_text_el('<-- ');
        
        if(type == 'enter')
            {
                id = args[0];
                if(is_muted(id) || is_filtered(id)) { return; }
                
                
                user_el = log_text_el
                    (
                        format_user_data(id, 5),
                        user[id].r, user[id].g, user[id].b
                    );
                
                
                info_el = log_text_el( text.has_logged_in );

                
                log([time_el, r_arrow, user_el, info_el]);
            }
        else if(type == 'exit')
            {
                id = args[0];
                if(is_muted(id) || is_filtered(id)) { return; }
                
                
                user_el = log_text_el
                    (
                        format_user_data(id, 5),
                        
                        user[id].r, user[id].g, user[id].b
                    );
                
                info_el = log_text_el( text.has_exited );

                
                log([time_el, l_arrow, user_el, info_el]);
            }
        else if(type == 'room')
            {
                room = args[0];
                
                first_hr_el  = document.createElement('HR');
                second_hr_el = document.createElement('HR');
                nbsp_el      = log_nbsp_el(68);
                
                room_el = log_text_el('ROOM ' + room.toString());
                
                
                log([first_hr_el]);
                log([nbsp_el, room_el]);
                log([second_hr_el]);
            }
        else if(type == 'stat')
            {
                id = args[0];
                if(is_muted(id) || is_filtered(id)) { return; }
                
                [r, g, b, stat] = [ user[id].r, user[id].g, user[id].b, user[id].stat ];
                
                user_el = log_text_el( format_user_data(id, 3), r, g, b );
                
                info_el = log_text_el
                    (
                        LANGUAGE == 'EN'
                            ? ' changed status to ' + stat
                            : ' が状態を「' + stat + '」に変更しました。'
                    );

                
                log([time_el, user_el, info_el]);
            }
        else if(type == 'ig')
            {
                [id, ihash, stat] = args;
                if(is_muted(id) || is_filtered(id)) { return; }
                
                var ig_ihash = ihash;
                
                if(user[id] === undefined)
                    {
                        format_log('error', ['IG: User with id '+id+' doesnt exist.']);
                        return;
                    }

                
                var ig_id   = get_id_from_ihash(ig_ihash);
                if(user[ig_id] === undefined)
                    {
                        format_log('error', ['IG: User with id '+id+' doesnt exist.']);
                        return;
                    }
                
                
                var id_el = log_text_el
                    (
                        format_user_data(id, 2) + ' ',
                        user[id].r, user[id].g, user[id].b
                    );
                var ig_el = log_text_el
                    (
                        format_user_data(ig_id, 2) + ' ',
                        user[ig_id].r, user[ig_id].g, user[ig_id].b
                    );
                
                if(LANGUAGE == 'EN')
                    {
                        var stat_el = log_text_el( stat == 'on' ? 'ignored ' : 'stopped ignoring ' );
                        
                        log([time_el, id_el, stat_el, ig_el]);
                    }
                else
                    {
                        var stat_1_el = log_text_el(' が ');
                        var stat_2_el = log_text_el(' を' + (stat == 'on' ? '無視' : '無視解除') + 'しました。 ');
                        
                        log([time_el, id_el, stat_1_el, ig_el, stat_2_el]);
                    }
            }
        else if(type == 'com')
            {
                id = args[0];
                var cmt = args[1];
                
                console.log('COM', id, cmt);
               
               //// test
               if(user[id] === undefined)
                    {
                        user[id] = new User
                            ({
                                attr:
                                    {
                                        name     : 'cantread',
                                        ihash    : '_CANTREAD'
                                    }   
                            });
                        
                        room[id] = user[id];
                    }
                
                if(is_muted(id) || is_filtered(id)) { return; }
                
                user_el = log_text_el
                    (
                        format_user_data(id, 3),
                        r, g, b
                    );
                
                var two_dot = log_text_el(': ');
                
                $(user_el).attr('class', 'log_cmt_user');

                
                /***************
                * Comment data
                ***************/
                var cmt_el;
                
                if(config.load_content && util.is_url(cmt))
                    {
                        cmt_el = log_a_el(cmt);
                        
                        if(cmt.match(/^www\./)) { cmt = 'http://' + cmt; }
                        
                        
                        /********************************************
                        * Request headers to check if it's an image
                        ********************************************/
                        $.ajax
                            ({
                                type : 'HEAD',
                                async: true,
                                url  : cmt,
                                
                                success: function(msg, data, jqXHR)
                                    {
                                        var type = jqXHR.getResponseHeader('content-type');
                                        var size = jqXHR.getResponseHeader('content-length');
                                        
                                        var src, iframe_el;
                                        console.log([type, size]);
                                        
                                        /***********
                                        * Get host
                                        ***********/
                                        var host = new URL(cmt).hostname;
                                        console.log('host:', host);
                                        
                                        /************************************************
                                        * If it's an image smaller than 20mb, render it
                                        ************************************************/
                                        if(type.match('image') && size/1024 < 20000)
                                            {
                                                var img_el = log_img_el(cmt);
                                                
                                                log([time_el, user_el, two_dot, cmt_el]);
                                                log([img_el]);
                                            }
                                        else if(type == 'video/webm' && size/1024 < 200000)
                                            {
                                                var video_el = $(document.createElement('video'))
                                                    .addClass('log_video_el')
                                                    .attr('src', cmt)
                                                    .attr('controls', '')[0];
                                                
                                                log([time_el, user_el, two_dot, cmt_el]);
                                                log([video_el]);
                                            }
                                        else if(type.match('audio') && size/1024 < 20000)
                                            {
                                                var audio_el = $(document.createElement('audio'))
                                                    .attr('src', cmt)
                                                    .attr('controls', '')[0];
                                                
                                                log([time_el, user_el, two_dot, cmt_el]);
                                                log([audio_el]);
                                            }
                                        else if(host == 'www.youtube.com' || host == 'youtu.be')
                                            {
                                                if(host == 'www.youtube.com')
                                                    {
                                                        src = cmt.replace('watch?v=', 'embed/');
                                                    }
                                                else if(host == 'youtu.be')
                                                    {
                                                        src = cmt.replace('.be/', 'be.com/embed/');
                                                    }
                                                
                                                iframe_el = $(document.createElement('iframe'))
                                                    .attr('width', 373)
                                                    .attr('height', 210)
                                                    .attr('src', src)
                                                    .attr('frameborder', 0)
                                                    .attr('allowfullscreen', 1)[0];
                                                
                                                
                                                log([time_el, user_el, two_dot, cmt_el]);
                                                log([iframe_el]);
                                            }
                                        else if(host == 'www.nicovideo.jp')
                                            {
                                                src = cmt.replace('www.nicovideo','embed.nicovideo');

                                                iframe_el = $(document.createElement('iframe'))
                                                    .attr('width', 373)
                                                    .attr('height', 210)
                                                    .attr('src', src)
                                                    .attr('frameborder', 0)
                                                    .attr('allowfullscreen', 1)[0];

                                                log([time_el, user_el, two_dot, cmt_el]);                                         
                                                log([iframe_el]);
                                            }
                                        else if(type.match('text/html'))
                                            {
                                                $.ajax
                                                    ({
                                                        type: 'GET',
                                                        async: true,
                                                        url: cmt,
                                                        
                                                        success: function(msg, data, jqXHR)
                                                            {
                                                               var title = $(msg).filter('title').text();
                                                                
                                                               var text_el = log_text_el('[ '+title+' ]');
                                                               var nbsp_el = log_nbsp_el(2);
                                                                
                                                               log
                                                                ([
                                                                    time_el, user_el, two_dot,
                                                                    cmt_el,  nbsp_el, text_el
                                                                ]);
                                                            }
                                                    });
                                            }
                                        else
                                            {
                                                log([time_el, user_el, two_dot, cmt_el]);
                                            }
                                    },
                                
                                error: function(err)
                                    {
                                        var error_el = log_text_el('[ Could not retrieve URL ]');
                                        var nbsp_el  = log_nbsp_el(1);
                                        
                                        log
                                            ([
                                                time_el, user_el, two_dot,
                                                cmt_el,  nbsp_el, error_el
                                            ]);
                                    }
                            });
                    }
                else
                    {
                        cmt_el = log_text_el(cmt);
                        log([time_el, user_el, two_dot, cmt_el]);
                    }


                /************************************************************
                * Send a popup to the OS if the comments contains a trigger
                ************************************************************/
                if(is_ignored(id) || is_muted(id) || is_filtered(id)) { return; }
                [name, ihash] = [ user[id].name, user[id].ihash ];
                
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
                        for(i = 0; i < config.popup_trigger.length; i++)
                            {
                                if(cmt.match(config.popup_trigger[i]))
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
                id   = args.shift();
                
                
                info_el = log_text_el('Trips found for ' + data + ' (id ' + id + '):');
                
                log_newline(1);
                log([info_el]);
                

                for(i = 0; i < args.length; i++)
                    {
                        nbsp_el = log_nbsp_el(4);
                        
                        var res_el = log_text_el(args[i]);
                        
                        log([nbsp_el, res_el]);
                    }
                
                log_newline(1);
            }
        else if(type == 'error')
            {
                var [error] = args;
                
                var error_el = log_text_el
                    (
                        'Error: ' + error,
                        255, 0, 0
                    );
                
                log([time_el, error_el]);
            }
        else
            {
                var text_el = log_text_el('Command not recognized: '+args[0]);
                
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

function search_log(word)
    {
        var logs = fs.readdirSync('log')
            .filter( (filename) => filename.match(/\.txt$/) );
        
        log_newline(1);
        
        for(var i = 0; i < logs.length; i++)
            {
                log( [log_text_el('File: ' + logs[i], 0, 255, 255)] );
                
                var file = fs.readFileSync(__dirname + '/log/' + logs[i], 'utf8').split('\n');
                for(var j = 0; j < file.length; j++)
                    {
                        if(file[j].match(word))
                            {
                                log( [log_text_el(file[j])] );
                            }
                    }
            }
        
        log( [log_text_el('LOG SEARCH END', 0, 255, 255)] );
        log_newline(1);
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
                $('.user_div').fadeOut
                    ({
                        duration: 200,
                        complete: () => $('.user_div').remove()
                    });
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
                if(main[key] !== '0') { sorted.push(key); }
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
        
        loader_small.show();
                
        /****************************************************
        * If a room is loaded, put the loader for 4 seconds
        ****************************************************/
        if(!IS_LOADING_MAIN)
            {
                IS_LOADING_MAIN = true;
                
                setTimeout( function()
                    {
                        loader_small.hide();
                        IS_LOADING_MAIN = false;
                    }, 4000 );
            }
        
        
        /*********************
        * Remove all buttons
        *********************/
        main_view.button_table.children().remove();
        
        
        var sorted_rooms = get_sorted_rooms();
        
        var user_n = 0;
        var room_n = 0;
        for(var key in main)
            {
                user_n += parseInt(main[key]);
                if(main[key] != '0') { room_n++; }
            }


        $('#main_title').text
            (
                LANGUAGE == 'EN'
                    ? (session.server_name() + ' ('+room_n+' rooms, '+user_n+' users)')
                    : (session.server_name() + ' ('+room_n+'室, '+user_n+'ユーザー)')
            );
        eye_icon.show();

        
        /**************************
        * Add all room with users
        **************************/
        var tr_el, td_el, button_el;
        var tr_length = 6;
        
        tr_el = $(document.createElement('TR'))
            .attr('class', 'main_button_table_tr')[0];
        
        main_view.button_table.append(tr_el);
        
        for(let i = 0; i < sorted_rooms.length; i++)
            {
                let [n, c] = [ sorted_rooms[i], main[ sorted_rooms[i] ] ];
                
                if(c == '0') { continue; }
                
                n = sorted_rooms[i];
                
                var scale =
                    {
                        '1':  '5dade2',
                        '2':  '3498db',
                        '3':  '48c9b0',
                        '4':  '48c9b0',
                        '5':  '45b39d',
                        '6':  '16a085',
                        '7':  '58d68d',
                        '8':  '2ecc71',
                        '9':  '52be80',
                        '10': '27ae60',
                        '11': 'f1c40f',
                        '12': 'e74c3c',
                        '13': 'cb4335',
                        '14': 'c0392b',
                        '15': 'a93226'
                    };
                
                
                button_el = $(document.createElement('button'))
                    .text
                        (
                            LANGUAGE == 'EN'
                                ? ('Room ' + n + ': ' + c)
                                : (n + '室: ' + c + '人' )
                        )
                    .attr('class', 'main_room_button')
                    //.css('background-color', scale[c] ? scale[c] : '2c3e50')
                    //.css('border', '2px solid ' + (scale[c] ? scale[c] : '2c3e50'))
                    .on('click', function()
                        {
                            session._name      = main_view.data.name.val();
                            session._character = main_view.data.character.val();
                            session._stat      = main_view.data.stat.val();
                            session._trip      = main_view.data.trip.val();
                            
                            var {_r, _g, _b} = main_view.data.color_picker.spectrum('get');
                            
                            session._r = _r;
                            session._g = _g;
                            session._b = _b;
                            
                            loader.hide();
                            loader_small.hide();
                            
                            change_room(n);
                        })[0];
                
                let band_el = $(document.createElement('DIV'))
                    .addClass('band_el')
                    .css('background-color', scale[c] ? scale[c] : '2c3e50')[0];
                
                $(button_el).append(band_el);

                        
                        
                td_el = $(document.createElement('TD'))
                    .attr('class', 'main_button_table_td')
                    .append(button_el)[0];
                        
                if($(tr_el).children().length < tr_length)
                    {
                        $(tr_el).append(td_el);
                    }
                else
                    {
                        tr_el = $(document.createElement('TR'))
                            .attr('class', 'main_button_table_tr')[0];
                        
                        $(tr_el).append(td_el);
                        main_view.button_table.append(tr_el);
                    }
            }
    }

function change_character_color(img, r, g, b)
    {
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

function check_transparency(id, e)
    {
        var img = new Image();
        
        img.onload = function()
            {
                buffer_ctx.drawImage(img, 0, 0);
                var data = buffer_ctx.getImageData(0, 0, 128, 128);
                
                if(data.data[e.offsetY*(128*4) + e.offsetX*4 + 3] !== 0)
                    {
                        show_user_context_menu(id);
                    }
                else
                    {
                        console.log('Transparent');
                        
                        $(e.target).hide();
                        
                        var target = document.elementFromPoint(e.clientX, e.clientY);
                        $(target).trigger({type: 'mousedown', which: 3});
                        
                        $(e.target).show();
                    }

                
                buffer_ctx.clearRect(0, 0, 128, 128);
            };
        
        
        var character = user[id].character;
        
        if(!fs.existsSync('./assets/character/'+character+'.png'))
            {
                character = 'mona';
            }
        
        img.src = './assets/character/'+character+'.png';
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
                
                
                /*******************************
                * Create user container object
                *******************************/
                var div = $(document.createElement('div'))
                    .attr('id', 'user_div_'+id)
                    .attr('class', 'user_div')
                    .attr('draggable', id == session.id())
                    .css('left', x_to_left(user[id].x))
                    .css('top',  y_to_top(user[id].y))
                    .css('z-index', id == session.id() ? 2 : 1)[0];
                    
                
                if(id == session.id())
                    {
                        var drag_offset_x;
                        var drag_offset_y;
                        
                        $( () => $(div).draggable
                            ({
                                containment: [0, 180, 750, 206],
                                start: function(e)
                                    {
                                        drag_offset_x = e.offsetX;
                                        drag_offset_y = e.offsetY;
                                    },
                                drag : function(e)
                                    {
                                        //var img = $('#user_div_'+session.id()+'_img');
                                        
                                        //img.css('width', 128 - (e.clientX/100));
                                    },
                                stop : function(e)
                                    {
                                        //var name_width = get_px_len(user[id].name);
                                        //var width = 128 > name_width ? 128 : name_width;
                                        
                                        var x = session.get_scl() == 100
                                            ? drag_offset_x
                                            : (128 - drag_offset_x);
                                        
                                        //var y = drag_offset_y;
                                        
                  
                                        //console.log(e.clientY, e.offsetY, y, top_to_y(e.clientY))
                  
                                        //session._y = top_to_y(e.clientY);
                                        //session._y = e.clientY;
                                        session.x( left_to_x(e.clientX - x + 1) );
                                    }
                            })
                         );
                    
                        $(div).on('mousedown', function(e)
                            {
                                if(e.which == 3) { session.scl(); }
                            });
                    }
                else
                    {
                        $(img).on('mousedown', function(e)
                            {
                                if(e.which == 3) { check_transparency(id, e); }
                            });
                    }
                
                /*******************************
                * Create user data text object
                *******************************/
                var user_data = $(document.createElement('TEXT'))
                    .addClass('user_data')
                    .html(
                            (user[id].name || 'nanashi')
                            + '<br>' + WHITE_TRIP_SYM
                            + user[id].ihash.substr(-6)
                            + (user[id].trip === '' ? '' : ('<br>' + BLACK_TRIP_SYM + user[id].trip))
                         )[0];
                
                var data_div = $(document.createElement('DIV'))
                    .addClass('user_data_div')[0];
                
                $(data_div).append(user_data);
                
                
                if(config.user_data_background)
                    {
                        $(data_div).css('display', 'table')
                            .css('background-color', 'black')
                            .css('color', 'white')
                            .css('opacity', '0.6')
                            .css('top', '-5px')
                            .css('padding', '2px')
                            .css('margin-left', 'auto')
                            .css('margin-right', 'auto');
                    }
                
                
                /**********************
                * Create stat element
                **********************/
                var stat_div = $(document.createElement('DIV'))
                    .attr('class', 'user_stat_div')
                    .attr('id', 'user_stat_div_'+id)
                    .css('z-index', 3);
                
                if(user[id].stat != '通常')
                    {
                        var name_width = get_px_len(user[id].name);
                        var width = 128 > name_width ? 128 : name_width;
                        var len   = get_px_len(user[id].stat);
                        
                        $(stat_div).text(user[id].stat)
                            .width(len+6)
                            .css('left', width/2 - len/2 - 9);
                    }
                else
                    {
                        $(stat_div).hide();
                    }
                
                
                /***************************
                * Append them to room_view
                ***************************/
                $(div).append(img)
                    .append(data_div)
                    .append(stat_div);
                
                $(div).css('display', 'none');
                room_view.el.append(div);
                
                if(!is_muted(id) && !is_filtered(id))
                    {
                        $(div).fadeIn
                            ({
                                duration: 300,
                                complete: () => $(div).css('display', 'default')
                            });
                    }
            };
        
        
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
        div.css('left', x_to_left(user[id].x));
        div.css('top', y_to_top(user[id].y));
        
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
        if(user[id] === undefined)
            {
                format_log('error', ['id '+id+' doesnt exist.']);
                return;
            }
        else if(is_muted(id) || is_filtered(id))
            {
                return;
            }


        var name_width = get_px_len(user[id].name);
        var width      = name_width > 128 ? name_width : 128;
        var len        = get_px_len(cmt) + 6;
        
        
        /**********************************************
        * Set background colour to white if it's dark
        **********************************************/
        var {r, g, b} = user[id];
        if(r === 0 && g === 0 && b === 0) { [r, g, b] = [255, 255, 255]; }
        
        if(r < 80 && g < 80 && b < 80)
            {
                [r, g, b] = [255, 255, 255];
            }
        
        
        var div_el = $(document.createElement('DIV'))
            .text(cmt)
            .addClass('comment_div')
            .css('background-color', 'rgb('+r+', '+g+', '+b+')')
            .css('width', len+10)
            .css('left', width/2 - len/2 - 15)
            .on('click', () => clipboard.writeText(cmt) )[0];

        
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
        setTimeout( () => $(div_el).remove(), 60000 );
        
        
        $('#user_div_'+id).append(div_el);
    }

function show_users_dropdown()
    {
        room_view.dropdown.users.children().remove();
        
        for(let id in room)
            {
                if(room[id] === undefined) { continue; }
                
                
                var {name, ihash} = user[id];
                
                var dropdown_el = $(document.createElement('TEXT'))
                    .text(name + ' ' + WHITE_TRIP_SYM + ihash.substr(-6) + ' ('+id+')')
                    .attr('class', 'dropdown_el')
                    .css(
                            'background-color',
                            is_muted(id)  ? 'red'                          :
                            (is_ignored(id) || is_ignoring(id)) ? 'yellow' :
                                                                  'white'
                        )
                    .on('mousedown', function(e)
                        {
                            if(e.which == 1)
                                {
                                    mute(id);
                                    
                                    $(this).css
                                        (
                                            'background-color',
                                            is_muted(id)
                                                ? 'red'
                                                : (is_ignored(id) || is_ignoring(id))
                                                    ? 'yellow'
                                                    : 'white'
                                        );
                                }
                            else if(e.which == 2)
                                {
                                    search_trip('id', id);
                                }
                            else if(e.which == 3)
                                {
                                    ignore(id);
                                    
                                    $(this).css
                                        (
                                            'background-color',
                                            is_ignored(id)
                                                ? 'yellow'
                                                : is_muted(id)
                                                    ? 'red'
                                                    : 'white'
                                        );
                                }
                        })[0];
                
                room_view.dropdown.users.append(dropdown_el);
            }
        
        
        room_view.dropdown.users.css( 'bottom', 50);
        room_view.dropdown.users.toggle();
    }

function refresh_data_menu(data_menu)
    {
        data_menu.name     .val(session.name());
        data_menu.character.val(session.character());
        data_menu.stat     .val(session.stat());
        data_menu.trip     .val(session.trip());
        data_menu.x        .val(session.x());
        data_menu.y        .val(session.y());
        
        
        /********************************
        * Add profile selection options
        ********************************/
        data_menu.profile.children().remove();
        
        var default_el = create_option_el('Default');
        data_menu.profile.append(default_el);
        
        for(let key in config.profiles)
            {
                var option_el = create_option_el(key);
                
                data_menu.profile.append(option_el);
            }
        
        data_menu.profile.on('change', function(e)
            {
                var {name, character, stat, trip, r, g, b, x, y} = e.target.value == 'Default'
                    ? session._default
                    : config.profiles[e.target.value];
                
                
                data_menu.name     .val(name);
                data_menu.character.val(character);
                data_menu.stat     .val(stat);
                data_menu.trip     .val(trip);
                data_menu.x        .val(x);
                data_menu.y        .val(y);
                
                data_menu.color_picker.spectrum('set', 'rgb('+r+', '+g+', '+b+')');
            });

        
        data_menu.color_picker.spectrum('set', 'rgb('+session.r()+', '+session.g()+', '+session.b()+')');
    }

function refresh_new_menu()
    {
        room_view.new_menu.profile.children().remove();
        
        var default_el = create_option_el('Default');
        room_view.new_menu.profile.append(default_el);
        
        for(let key in config.profiles)
            {
                var option_el = create_option_el(key);
                
                room_view.new_menu.profile.append(option_el);
            }
        
        room_view.new_menu.room.val(session.room());
        room_view.new_menu.n.val(1);
        room_view.new_menu.site.val(session.site());
        room_view.new_menu.timeout.val(session.timeout());
    }

function show_user_context_menu(id)
    {
        var text =
            {
                names_registered : LANGUAGE == 'EN' ? ' Names registered: ' : ' 登録済名前: ',
                copy             : LANGUAGE == 'EN' ? 'Copy'                : 'コピー',
                ignore           : LANGUAGE == 'EN' ? 'Ignore'              : '無視',
                mute             : LANGUAGE == 'EN' ? 'Mute'                : 'ミュート',
                search_name      : LANGUAGE == 'EN' ? 'Search name'         : '名前検索',
                stalk            : LANGUAGE == 'EN' ? 'Stalk '               : 'ストーカー ',
                repeat           : LANGUAGE == 'EN' ? 'Repeat '              : '繰り返し '
            };
        
        var ihash = user[id].ihash;
        
        var trip  = trip_list[ihash];
        var names = '';
        var len   = 0;
        
        for(var i = 0; i < trip.length; i++)
            {
                if((names + trip[i]).length <= 16)
                    {
                        names += trip[i] + ', ';
                        len++;
                    }
                else
                    {
                        break;
                    }
            }
        
        names = names.substr(0, names.length-2);
        names = len < trip.length
            ? '「' + names + '...」 (' + trip.length + ')'
            : '「' + names + '」';
        
        var template =
            [
                {
                    label: format_user_data(id, 3), click()
                        {
                            var {r, g, b, x, y} = user[id];
                            
                            log_newline(1);
                            log([ log_time_el(), log_text_el( ' ' + format_user_data(id, 5),        0, 255, 255 ) ]);
                            log([ log_time_el(), log_text_el( ' r: ' + r + ' g: ' + g + ' b: ' + b, 0, 255, 255 ) ]);
                            log([ log_time_el(), log_text_el( ' x: ' + x + ' y: ' + y,              0, 255, 255 ) ]);
                            log([ log_time_el(), log_text_el( text.names_registered + trip.length,  0, 255, 255 ) ]);
                            log_newline(1);
                        }
                },
                { type: 'separator' },
                { label: names,          click() { search_trip('id', id); } },
                { type: 'separator' },
                { label: text.copy,         click() { copy(id);   } },
                { label: text.ignore,       click() { ignore(id); } },
                { label: text.mute,         click() { mute(id);   } },
                /**
                {
                    label: 'Selective mute',
                    submenu:
                        [
                            { label: 'Mute com' , click() { console.log('UNIMPLEMENTED!') } },
                            { label: 'Mute stat', click() { console.log('UNIMPLEMENTED!') } }
                        ]
                },
                **/
                { label: text.search_name, click() { search_trip('namerecursive', user[id].name); } },
                {
                    label: text.stalk  + (is_stalked(id) ? 'On' : 'Off'),
                    click() { toggle_stalk(id); }
                },
                {
                    label: text.repeat + (is_repeated(id) ? 'On' : 'Off'),
                    click() { toggle_repeat(id); }
                }
            ];
            
        menu = Menu.buildFromTemplate(template);
        menu.popup(win);
    }

function show_command_context_menu()
    {
        var text =
            {
                next_room     : LANGUAGE == 'EN' ? 'Next room'          : '次の部屋',
                previous_room : LANGUAGE == 'EN' ? 'Previous room'      : '前の部屋',
                profile       : LANGUAGE == 'EN' ? 'Profile'            : 'プロファイル     ',
                save_profile  : LANGUAGE == 'EN' ? 'Save profile'       : 'プロファイル保存',
                'default'     : LANGUAGE == 'EN' ? 'Default'            : '初期ログインデータ',
                random        : LANGUAGE == 'EN' ? 'Random'             : 'ランダムキャラ',
                nanashi       : LANGUAGE == 'EN' ? 'Nanashi'            : '名無し',
                invisible     : LANGUAGE == 'EN' ? 'Invisible'          : '透明',
                anonymous     : LANGUAGE == 'EN' ? 'Anonymous'          : 'アノニマス',
                upload_image  : LANGUAGE == 'EN' ? 'Upload image'       : '画像アップロード',
                upload_file   : LANGUAGE == 'EN' ? 'Upload file'        : 'ファイルアップロード',
                config        : LANGUAGE == 'EN' ? 'Config'             : '設定',
                sound         : LANGUAGE == 'EN' ? 'Sound '             : '効果音 ',
                popup         : LANGUAGE == 'EN' ? 'Popup '             : '通知 ',
                show_buttons  : LANGUAGE == 'EN' ? 'Show buttons'       : 'ボタン表示',
                'new'         : LANGUAGE == 'EN' ? 'New'                : '新起動',
                transparent   : LANGUAGE == 'EN' ? 'Transparent'        : '透明'
            };
        
        
        /******************************
        * Get next and previous rooms
        ******************************/
        var sorted = get_sorted_rooms();
        var room   = session.room();
                
        var index = get_index(room, sorted);
        
        var next = (sorted.length > 0 && sorted[index+1] !== undefined) ? ' ('+sorted[index+1]+')' : '';
        var prev = (sorted.length > 0 && sorted[index-1] !== undefined) ? ' ('+sorted[index-1]+')' : '';
        
        
        /******************
        * Create template
        ******************/
        var template =
            [
                { label: text.next_room     + next, click() { next_room();     } },
                { label: text.previous_room + prev, click() { previous_room(); } },
                { type: 'separator' },
                {
                    label: text.profile,
                    submenu:
                        [
                            { label: text.save_profile, click() { add_profile();   } },
                            { label: text.default,      click() { set_default();   } },
                            { label: text.random,       click() { set_random();    } },
                            { label: text.nanashi,      click() { set_nanashi();   } },
                            { label: text.invisible,    click() { set_invisible(); } },
                            { label: text.anonymous,    click() { set_anonymous(); } }
                        ]
                },
                { type: 'separator' },
                {
                    label: 'Util',
                    submenu:
                        [
                            {
                                label: text.upload_image,
                                click()
                                    {
                                        dialog.showOpenDialog
                                            (
                                                function(path) { util.upload_image(path[0]); }
                                            );
                                    }
                            },
                            {
                                label: text.upload_file,
                                click()
                                    {
                                        dialog.showOpenDialog
                                            (
                                                function(path) { util.upload_file(path[0]); }
                                            );
                                    }
                            }
                        ]
                },
                { type: 'separator' },
                {
                    label: text.config,
                    submenu:
                        [
                            {
                                label: text.sound + (SOUND_ON  ? 'on'  : 'off' ), click()
                                    {
                                        SOUND_ON  = !SOUND_ON;
                                    }
                            },
                            {
                                label: text.popup + (POPUP_ALL ? 'all' : 'some'), click()
                                    {
                                        POPUP_ALL = !POPUP_ALL;
                                    }
                            },
                            {
                                label: (ALWAYS_ON_TOP ? 'Always' : 'Never') + ' on top', click()
                                    {
                                        ALWAYS_ON_TOP = !ALWAYS_ON_TOP;
                                        win.setAlwaysOnTop(ALWAYS_ON_TOP);
                                    }
                            },
                            {
                                label: text.show_buttons, click()
                                    {
                                        $('#log_button, #log_window_button, #save_log_button, #data_button').toggle();
                                        $('#reenter_button, #relogin_button, #proxy_button, #new_button').toggle();
                                    }
                            }
                        ]
                },
                { type: 'separator'},
                {
                    label: text['new'], click()
                    {
                        new_instance( { n: 1, room: session.room(), prof: session.get_data() } );
                    }
                },
                { label: text.transparent, click() { toggle_transparent(); } }
            ];
            
        menu = Menu.buildFromTemplate(template);
        menu.popup(win);
    }

function show_config_login_menu()
    {
        config_menu.name      .val(config.name);
        config_menu.character .val(config.character);
        config_menu.stat      .val(config.stat);
        config_menu.trip      .val(config.trip);
        config_menu.rgb       .val(config.r+' '+config.g+' '+config.b);
        config_menu.x         .val(config.x);
        config_menu.y         .val(config.y);
        config_menu.scl       .val(config.scl);
        config_menu.room      .val(config.room);
        config_menu.server    .val(config.server);
        config_menu.proxy     .val(config.proxy);
        config_menu.timeout   .val(config.timeout);
        config_menu.site      .val(config.site);
        
        config_menu.login.toggle();
    }
    
function change_room(room)
    {
        PREV_ROOM = session.room();
        
        clear_screen();
        
        if(room == 'main')
            {
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
                main_view.data.character_img.one('load', function()
                    {
                        var [r, g, b] = [session.r(), session.g(), session.b()];
                        
                        change_character_color(this, r, g, b);
                    });
                main_view.data.character_img.attr('src', './assets/character/'+session.character()+'.png');

                
                var character = session.character();
                
                if(!fs.existsSync('./assets/character/'+character+'.png')) { character = 'mona'; }
                main_view.data.character_img.attr('src', './assets/character/'+character+'.png');
                
                
                room_view.el.hide();
                main_view.el.show();
            }
        else
            {
                main_view.el.hide();
                room_view.el.show();
                
                eye_icon.hide();
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
        if(user[id] === undefined)
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
        if(user[id] === undefined)
            {
                format_log('error', ['User with id ' + id + 'doesnt exist.']);
            }
        else
            {
                var ihash = user[id].ihash;
                
               stalk[ihash] = stalk[ihash] === undefined ? 1 : undefined;
            }
    }

function is_stalked(id)
    {
        return user[id] !== undefined && stalk[user[id].ihash];
    }

function toggle_repeat(id)
    {
        if(user[id] === undefined)
            {
                format_log('error', ['User with id ' + id + 'doesnt exist.']);
            }
        else
            {
                var ihash = user[id].ihash;
                
               repeat[ihash] = repeat[ihash] === undefined ? 1 : undefined;
            }
    }

function is_repeated(id)
    {
        return user[id] !== undefined && repeat[user[id].ihash];
    }

function add_trip(id)
    {
        var {name, ihash} = user[id];
        
        if(trip_list[ihash] === undefined)
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

function search_trip(type, data)
    {
        var name, trip, ihash;
        var match;
        var i;
        
        if(type == 'id')
            {
                var id = data;
                if(user[id] === undefined)
                    {
                        format_log('error', ['User with id ' + id + ' doesnt exist.']);
                        return;
                    }
                
                ihash = user[id].ihash;
                if(trip_list[ihash] === undefined)
                    {
                        format_log('error', ['No trips stored for this trip.']);
                        return;
                    }

                format_log('triplist', [ihash, id].concat(trip_list[ihash]));
            }
        else if(type == 'trip')
            {
                ihash = data;
                
                if(ihash.length < 10)
                    {
                        for(trip in trip_list)
                            {
                                if(trip.endsWith(ihash))
                                    {
                                        ihash = trip;
                                        break;
                                    }
                            }
                    }
                
                if(ihash.length != 10 || trip_list[ihash] === undefined)
                    {
                        format_log('error', ['No trips stored for this trip.']);
                        return;
                    }
                
                format_log('triplist', [ihash, 'unknown'].concat(trip_list[ihash]));
            }
        else if(type == 'name')
            {
                name = data;
                match = [name, 'unknown'];
                
                for(trip in trip_list)
                    {
                        for(i = 0; i < trip_list[trip].length; i++)
                            {
                                if(trip_list[trip][i] == name)
                                    {
                                        match.push(trip);
                                        break;
                                    }
                            }
                    }
                
                if(match.length == 2)
                    {
                        format_log('error', ['No trips for ' + name + ' found.']);
                    }
                else
                    {
                        format_log('triplist', match);
                    }
            }
        else if(type == 'namerecursive')
            {
                name = data;
                match = [name, 'unknown'];
                
                search_trip('name', name);
                
                for(trip in trip_list)
                    {
                        for(i = 0; i < trip_list[trip].length; i++)
                            {
                                if(trip_list[trip][i] == name)
                                    {
                                        search_trip('trip', trip);
                                    }
                            }
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
        var name = session.name();
        
        config.profiles[name] = session.get_data();
        
        save_config();
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
                
                save_config();
            }
    }

function load_profile(name)
    {
        if(config.profiles[name] === undefined)
            {
                format_log('error', ['Profile '+name+' doesnt exist.']);
            }
        else
            {
                session.profile(config.profiles[name]);
            }
    }

function new_instance(data)
    {
        var PID;
        
        if(data.n === undefined || data.room === undefined || data.prof === undefined)
            {
                return;
            }
        
        if(data.slave === undefined)
            {
                data.slave = false;
                
            }
        else
            {
                PID = parseInt(Math.random()*123456789123456789);
            }
        
        
        var login_args =
            [
                '.',
                'proxy',     '1',
                'site',      data.site    || session.site(),
                'timeout',   data.timeout || session.timeout(),
                
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
                'room',      data.room,
                
                'slave',     data.slave
            ];
        
        if(data.slave)       { login_args.push('PID', PID); }
        if(data.transparent) { login_args.push('transparent', 'true'); }
        
        
        for(var i = 0; i < data.n; i++)
            {                
                var spawn = require('child_process').spawn
                    (
                        ARGV[0],
                        login_args,
                        {
                            detached: !data.slave,
                            stdio: [null, null, null, 'ipc']
                        }
                    );
                
                if(data.slave)
                    {
                        spawn.on('message', function(e, msg)
                            {
                                alert('slave');
                                
                                console.log(e, msg);
                            });
                        
                        spawn.PID = PID;
                        slave.push(spawn);
                    }
            }
    }

function toggle_transparent()
    {
        var options = {};
        
        options.args = IS_TRANSPARENT
            ?   [ARGV[1]]
            :   ARGV.slice(1).concat(['transparent', 'true']);
        
        
        session.disconnect();
        app.relaunch(options);
        app.quit();
    }

function ignore(id)
    {
        if(user[id] === undefined)
            {
                format_log('error', ['User with id '+id+' doesnt exist.']);
            }
        else
            {
                var ihash = user[id].ihash;
                
                session.ignore(ihash);
                
                ignoring[ihash] = !ignoring[ihash];
                
                $('#user_div_'+id+'_img').css('opacity', ignoring[ihash] ? 0.5 : 1);
            }
    }

function mute(id)
    {
        if(user[id] === undefined)
            {
                return;
            }
        else
            {            
                var ihash = user[id].ihash;
                
                muted[ihash] = !muted[ihash];
                
                if($('#user_div_'+id)) { $('#user_div_'+id).toggle(); }
            }
    }

function mute_stat(id)
    {
        if(user[id] === undefined) { return; }         
        
        var ihash = user[id].ihash;
        
        muted_stat[ihash] = !muted_stat[ihash];
    }

function filter(params)
    {
        for(var id in room)
            {
                for(var param in room[id])
                    {
                        /****************************************************
                        * If the user and params include the same parameter
                        ****************************************************/
                        if(room[id][param] == params[param])
                            {
                                if(filtered[param] === undefined) { filtered[param] = []; }
                                
                                /************************************
                                * Add parameter if it doesn't exist
                                ************************************/
                                if( !filtered[param].includes(params[param]) )
                                    {
                                        filtered[param].push(params[param]);
                                
                                    }
                                /*****************
                                * Else remove it
                                *****************/
                                else
                                    {
                                        filtered[param].splice( filtered[param].indexOf(params[param]), 1 );
                                    }
                                
                                if($('#user_div_'+id)) { $('#user_div_'+id).toggle(); }
                            }
                    }
            }
    }

function toggle_proxy()
    {
        clear_screen();
        
        session.proxy();
        
        room_view.button.proxy.css('background-color', session._proxy ? 'rgb(100, 100, 100)' : 'white');
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

function set_anonymous()
    {
        clear_screen();
        session.anonymous();
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
        session.relogin();
    }

function signal_handler(msg)
    {
        console.log(msg);
        
        var id;
        var stat;
        var child, n, c;
        
        var i;
        
        
        /***********************
        * Parse xml characters
        ***********************/
        msg = msg.replace(/#d/g, '\'')
            .replace(/#e/, '=');
        
        
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
                        id = xml.attr.id;
                        
                        //console.log('connected', id);
                        
                        session.id(id);
                    }
                else if(xml.name == 'UINFO')
                    {
                        //var {n, c, id, ihash, name} = xml.attr;
                    }
                else if(xml.name == 'COUNT')
                    {
                        if(session.room() != 'main')
                            {
                                [n, c] = [xml.attr.n, xml.attr.c];
                                
                                document.title = LANGUAGE == 'EN'
                                    ? ( 'Monachat '
                                        + '[room: '+ n + ' users: ' + c + '] '
                                        + '@ '
                                        + format_user_data(session.id(), 3) )
                                    : ( 'もなちゃと '
                                        + '[' + n + '室 ' + c + '人]'
                                        + ' @ '
                                        + format_user_data(session.id(), 3) );
                            }
                        else
                            {
                                document.title = 'Monachat';
                                
                                /*******************************
                                * Refresh and update main_view
                                *******************************/
                                for(i = 0; i < xml.children.length; i++)
                                    {
                                        child = xml.children[i];
                                        [n, c] = [child.attr.n, child.attr.c];
                                        
                                        main[n] = c;
                                        
                                        if(c !== 0) { refresh_main(); }
                                    }
                            }
                    }
                else if(xml.name == 'ROOM')
                    {
                        if(session.room() != 'main') { format_log('room', [session.room()]); }
                        
                        for(i = 0; i < xml.children.length; i++)
                            {
                                child = xml.children[i];
                                id = child.attr.id;
                                
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
                        id = xml.attr.id;
                        
                        user[id] = new User(xml);
                        room[id] = user[id];
                        add_trip(id);
                        
                        append_div(id);
                        console.log('user', user[id]);
                        console.log('enter', xml.attr);
                        
                        
                        if(!is_muted(id) && !is_filtered(id))
                            {
                                if(id != session.id()) { format_log('enter', [id]); }
                                
                                if(SOUND_ON && session.room() != 'main')
                                    {
                                        play('./assets/sound/enter.wav');
                                    }
                            }
                    }
                else if(xml.name == 'USER')
                    {
                        id = xml.attr.id;
                        
                        user[id] = new User(xml);
                        room[id] = user[id];
                        add_trip(id);
                        
                        append_div(id);
                        
                        console.log('enter', xml.attr);
                        
                        if(id != session.id()) { format_log('enter', [id]); }
                    }
                else if(xml.name == 'EXIT')
                    {
                        id = xml.attr.id;
                        
                        //console.log('exit', xml.attr);
                        
                        if(id == session.id())
                            {
                                room = {};
                                
                                clear_screen();
                            }
                        else
                            {
                                delete room[id];
                                
                                remove_div(id);
                                
                                if(!is_muted(id) && !is_filtered(id))
                                    {
                                        format_log('exit', [id]);
                                        
                                        if(SOUND_ON && session.room() != 'main')
                                            {
                                                play('./assets/sound/enter.wav');
                                            }
                                    }
                            }
                    }
                else if(xml.name == 'SET')
                    {
                        id = xml.attr.id;
                        
                        
                        /***********************
                        * It moves three times
                        ***********************/
                        if(xml.attr.x !== undefined)
                            {
                                var x = xml.attr.x;
                                
                                if(x != user[id].x)
                                    {
                                        user[id].x = x;
                                        move_div(id);
                                        
                                        if(is_stalked(id))  { session.x(x); }
                                        if(KEEP_LOOKING_ID == id)
                                            {
                                                console.log('KEEP LOOKING', x, session.x());
                                                
                                                session._scl = x < session.x() ? -100 : 100;
                                                session._send_x_y_scl();
                                            }
                                    }
                            }
                        if(xml.attr.y !== undefined)
                            {
                                var y = xml.attr.y;
                                
                                if(y != user[id].y)
                                    {
                                        user[id].y = xml.attr.y;
                                        move_div(id);
                                        
                                        if(is_stalked(id)) { session.y(xml.attr.y); }
                                    }
                            }
                        if(xml.attr.scl !== undefined)
                            {
                                if(is_stalked(id) && xml.attr.scl != user[id].scl)
                                    {
                                        session.scl();
                                    }
                                
                                user[id].scl = xml.attr.scl;
                                move_div(id);
                            }
                        
                        if(xml.attr.stat !== undefined)
                            {
                                stat = xml.attr.stat;
                                if(stat == user[id].stat) { return; }
                                
                                
                                user[id].stat = stat;
                                
                                if(!is_muted(id) && is_filtered(id) && !is_muted_stat(id))
                                    {
                                        format_log('stat', [id]);
                                    }
                                
                                
                                /***************
                                * Set stat div
                                ***************/
                                if(stat == '通常')
                                    {
                                        $('#user_stat_div_'+id).hide();
                                    }
                                else
                                    {
                                        var name_width = get_px_len(user[id].name);
                                        var width = 128 > name_width ? 128 : name_width;
                                        var len   = get_px_len(stat);
                                        
                                        $('#user_stat_div_'+id).text(stat)
                                            .width(len+6)
                                            .css('left', width/2 - len/2 - 9)
                                            .show();
                                    }
                            }
                    }
                else if(xml.name == 'IG')
                    {
                        [id, ihash, stat] = [xml.attr.id, xml.attr.ihash, xml.attr.stat];
                        
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
                        [id, cmt] = [xml.attr.id, xml.attr.cmt];
                        
                        console.log('Comment:', cmt);
                        
                        if(!is_muted(id) && !is_filtered(id))
                            {
                                if(config.show_comments) { add_comment_div(id, cmt); }
                                format_log('com', [id, cmt]);
                                
                                if(SOUND_ON) { play('./assets/sound/comment.wav'); }
                        
                                if(is_repeated(id)) { session.comment(cmt); }
                            }
                    }
                else if(xml.name == 'RSET')
                    {
                        // ignore
                    }
                else
                    {
                        console.log('Unknown message');
                        console.log('msg:',msg);
                        console.log('xml',xml);
                        
                        log('error', ['Unknown message']);
                        log('error', msg);
                    }
                
                
                /***********************************
                * Send the signal too all the bots
                ***********************************/
                for(i = 0; i < bots.length; i++)
                    {
                        bots[i].signal_handler(msg);
                    }
            }
    }

function command_handler(com)
    {
        com = com.split(' ');
        
        var id;
        var name;
        var index;
        var options;
        
        var i;
        let x;
        
        var full_arg = com.slice(1).join(' ');
        
        console.log('com', com);
        
        if(com[0] == 'name')             { session.name(full_arg);              }
        else if(com[0] == 'character' || com[0] == 'char'  ) { session.character(full_arg); }
        else if(com[0] == 'stat'      || com[0] == 'status') { session.stat(full_arg);      }
        else if(com[0] == 'trip')        { session.trip(full_arg);              }
        else if(com[0] == 'r')           { session.r(com[1]);                   }
        else if(com[0] == 'g')           { session.g(com[1]);                   }
        else if(com[0] == 'b')           { session.b(com[1]);                   }
        else if(com[0] == 'rgb')         { session.rgb(com[1], com[2], com[3]); }
        else if(com[0] == 'x')           { session.x(com[1] == 'random' ? parseInt(Math.random()*600) : com[1]); }
        else if(com[0] == 'y')           { session.y(com[1]);                   }
        else if(com[0] == 'scl')         { session.scl();                       }
        else if(com[0] == 'ignore')      { ignore(com[1]);                      }
        else if(com[0] == 'reenter')     { session.reenter();                   }
        else if(com[0] == 'site')        { session.site(com[1]);                }
        else if(com[0] == 'timeout')     { session.timeout(com[1]);             }
        else if(com[0] == 'comment')     { session.comment(com.slice(1).join(' ')); }
        else if(com[0] == 'enqueuecomment') { session.enqueue_comment(com.slice(1).join(' '));  }
        else if(com[0] == 'searchid')    { search_trip('id', com[1]);           }
        else if(com[0] == 'searchtrip')  { search_trip('trip', com[1]);         }
        else if(com[0] == 'searchname')  { search_trip('name', full_arg);       }
        else if(com[0] == 'searchrecursive') { search_trip('namerecursive', full_arg); }
        else if(com[0] == 'proxy')       { toggle_proxy();                      }
        else if(com[0] == 'tinyurl')     { tinyurl(com[1]);                     }
        else if(com[0] == 'popup')       { POPUP_ENABLED = !POPUP_ENABLED;      }
        else if(com[0] == 'profile')     { load_profile(full_arg);              }
        else if(com[0] == 'saveprofile') { add_profile();                       }
        else if(com[0] == 'delprofile')  { delete_profile(full_arg);            }
        else if(com[0] == 'ev')          { session.ev();                        }
        else if(com[0] == 'savelog')     { save_log();                          }
        else if(com[0] == 'next')        { next_room();                         }
        else if(com[0] == 'prev')        { previous_room();                     }
        else if(com[0] == 'copy')        { copy(com[1]);                        }
        else if(com[0] == 'server')      { change_server(com[1]);               }
        else if(com[0] == 'default')     { set_default();                       }
        else if(com[0] == 'invisible')   { set_invisible();                     }
        else if(com[0] == 'anonymous')   { set_anonymous();                     }
        else if(com[0] == 'nanashi')     { set_nanashi();                       }
        else if(com[0] == 'random')      { set_random(com[1]);                  }
        else if(com[0] == 'room')        { change_room(full_arg);               }
        else if(com[0] == 'mute')        { mute(com[1]);                        }
        else if(com[0] == 'stalk')       { toggle_stalk(com[1]);                }
        else if(com[0] == 'repeat')      { toggle_repeat(com[1]);               }
        else if(com[0] == 'relogin')     { relogin();                           }
        else if(com[0] == 'log')         { ipcRenderer.send('toggle_log_window'); }
        else if(com[0] == 'back')        { change_room(PREV_ROOM);              }
        else if(com[0] == 'filter')
            {
                if(com.length == 1)
                    {
                        filtered = {};
                        $('.user_div').show();
                        
                        return;
                    }

                var params = {};
                
                for(i = 1; i < com.length; i +=2)
                    {
                        params[com[i]] = com[i+1];
                    }
                
                filter(params);
            }
        else if(com[0] == 'filterlog')
            {
                if(com[1] === undefined) { $('.log_div_el').show(); }
                
                var name_regex = new RegExp( '^' + com[1] );
                
                var selection = $('.log_div_el')
                    .children('.log_cmt_user')
                    .filter( (i, user_div) => user_div.textContent.match(name_regex) );
                
                if(selection.length > 0)
                    {
                        $('.log_div_el').hide();
                        selection.parent().show();
                    }
                else
                    {
                        $('.log_div_el').show();
                    }
            }
        else if(com[0] == 'lookat')
            {
                id = com[1];
                if( !user[id] ) { return; }
                
                session._scl = user[id].x < session.x() ? -100 : 100;
                session._send_x_y_scl();
            }
        else if(com[0] == 'loop')
            {
                if(com.length == 1)
                    {
                        clearInterval(LOOP_ID);
                        LOOP_ID = false;
                        
                        return;
                    }
                
                if(LOOP_ID) { clearInterval(LOOP_ID); }
                
                var time = parseInt(com[1]);
                if(time < 100) { return; }
                
                com = com.slice(2).join(' ');
                
                LOOP_ID = setInterval( () => command_handler(com), time );
            }
        else if(com[0] == 'keeplooking')
            {
                id = com[1];
                if( !user[id] ) { return; }
                
                KEEP_LOOKING_ID = id;
            }
        else if(com[0] == 'getclose')
            {
                id = com[1];
                if(!user[id]) { return; }
                
                var target_x = user[id].x;
                var step     = 20;
                var diff     = step * ( parseFloat(session.x) < target_x ? 1 : -1 );
                
                for(x = parseFloat(session.x()), i = 0; Math.abs(x - target_x) > step; x += diff, i++)
                    {
                        console.log(x, target_x);
                        //setTimeout( () => session.x(x), i*500 );
                    }
            }
        else if(com[0] == 'randrgb')
            {
                command_handler
                    (
                        'rgb '
                        + parseInt(Math.random()*255) + ' '
                        + parseInt(Math.random()*255) + ' '
                        + parseInt(Math.random()*255)
                    );
            }
        else if(com[0] == 'ifid')
            {
                if(session.id() == com[1])
                    {
                        command_handler(com.slice(2).join(' '));
                    }
            }
        else if(com[0] == 'clearall')
            {
                muted            = {};
                ignoring         = {};
                session._ignored = {};
                
                stalk  = {};
                repeat = {};
                
                KEEP_LOOKING_ID  = false;
                GET_CLOSE_ID     = false;
            }
        else if(com[0] == 'buttons')
            {
                $('#log_button, #log_window_button, #save_log_button, #data_button').toggle();
                $('#reenter_button, #relogin_button, #proxy_button, #new_button').toggle();
            }
        else if(com[0] == 'searchlog')
            {
                search_log(com[1]);
            }
        else if(com[0] == 'addname')
            {
                [undefined, id, name] = com;
                var ihash = user[id].ihash;
        
                if(trip_list[ihash] === undefined)
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
        else if(com[0] == 'new')
            {
                options = { n: 1, room: session.room(), prof: session.get_data(), transparent: false };
                
                if(com.includes('n'))
                    {
                        index = com.indexOf('n');
                        if(!com[index+1]) { return; }
                        
                        options.n = com[index+1];
                    }
                if(com.includes('room'))
                    {
                        index = com.indexOf('room');
                        if(!com[index+1]) { return; }
                        
                        options.room = com[index+1];
                    }
                if(com.includes(n))
                    {
                        index = com.indexOf('prof');
                        if(!com[index+1]) { return; }
                        
                        options.prof = config.profiles[ com[index+1] ];
                    }
                if(com.includes('transparent'))
                    {
                        options.transparent = true;
                    }
                
                
                new_instance(options);
            }
        else if(com[0] == 'transparent')
            {
                toggle_transparent();
            }
        else if(com[0] == 'slave')
            {
                options = { n: 1, room: session.room(), prof: session.get_data(), slave: true };
                var n = com[1] || 1;
                
                for(i = 0; i < n; i++) { new_instance(options); }
            }
        else if(com[0] == 'reloadbots')
            {
                bots = [];
                load_bots();
                
                log( [log_text_el('Bots reloaded.')] );
            }
        else if(com[0] == 'restart')
            {
                session.disconnect();
                app.relaunch();
                app.quit();
            }
        else if(com[0] == 'exit' || com[0] == 'kill')
            {
                if(config.save_log_on_exit)
                    {
                        save_log();
                    }
                
                if(PID != 'MASTER')
                    {
                        session.send('<SET type="kill" pid="'+PID+'" />\0');
                    }
                
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
        if(ARGV.length % 2 !== 0)
            {
                console.log('Error: Odd number of arguments.');
                process.exit();
            }
        
        for(var i = 2; i < ARGV.length; i += 2)
            {
                if(ARGV[i] == 'slave')
                    {
                        IS_MASTER     = !ARGV[i+1];
                        POPUP_ENABLED = false;
                    }
                else if(ARGV[i] == 'PID')
                    {
                        PID = ARGV[i+1];
                    }
                else
                    {
                        login_data[ARGV[i]] = ARGV[i+1];
                    }
            }
    }
var prev_x, prev_y;
window.onload = function()
{
    var character;
    
    let i;
    
    /*************************
    * Set room view elements
    *************************/
    room_view.el = $('#room_view');
    
    room_view.log        = $('#log_div');
    room_view.log_search = $('#log_search');
    room_view.input      = $('.text_input');
    
    
    room_view.dropdown['users']  = $('#users_dropdown');
    room_view.dropdown['stat']   = $('#stat_dropdown');
    room_view.dropdown['config'] = $('#config_dropdown');
    
    
    room_view.button['log']        = $('#log_button');
    room_view.button['log_window'] = $('#log_window_button');
    room_view.button['save']       = $('#save_log_button');
    room_view.button['data']       = $('#data_button');
    room_view.button['users']      = $('#users_button');
    room_view.button['stat']       = $('#stat_button');
    room_view.button['config']     = $('#config_button');
    room_view.button['back']       = $('#back_button');
    room_view.button['reenter']    = $('#reenter_button');
    room_view.button['relogin']    = $('#relogin_button');
    room_view.button['proxy']      = $('#proxy_button');
    room_view.button['new']        = $('#new_button');
    
    room_view.button['config_login']   = $('#config_login');
    room_view.button['config_trigger'] = $('#config_trigger');
    room_view.button['config_client']  = $('#config_client');
    room_view.button['config_bots']    = $('#config_bots');
    
    
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
    
    
    room_view.new_menu['el'] = $('#room_new_menu');
    
    room_view.new_menu['profile'] = $('#room_new_profile');
    room_view.new_menu['room']    = $('#room_new_room');
    room_view.new_menu['n']       = $('#room_new_n');
    room_view.new_menu['site']    = $('#room_new_site');
    room_view.new_menu['timeout'] = $('#room_new_timeout');
    room_view.new_menu['accept']  = $('#room_new_menu_accept_button');
    
    
    /***************************
    * Set config menu elements
    ***************************/
    config_menu['login']   = $('#config_login_menu');
    config_menu['trigger'] = $('#config_trigger_menu');
    config_menu['client']  = $('#config_client_menu');
    config_menu['bots']    = $('#config_bots_menu');
    
    config_menu['name']          = $('#config_menu_name');
    config_menu['character']     = $('#config_menu_character');
    config_menu['stat']          = $('#config_menu_stat');
    config_menu['trip']          = $('#config_menu_trip');
    config_menu['rgb']           = $('#config_menu_rgb');
    config_menu['x']             = $('#config_menu_x');
    config_menu['y']             = $('#config_menu_y');
    config_menu['scl']           = $('#config_menu_scl');
    config_menu['room']          = $('#config_menu_room');
    config_menu['server']        = $('#config_menu_server');
    config_menu['proxy']         = $('#config_menu_proxy');
    config_menu['site']          = $('#config_menu_site');
    config_menu['timeout']       = $('#config_menu_timeout');
    config_menu['add_config']    = $('#config_menu_timeout');
    config_menu['add_trip_list'] = $('#config_menu_add_trip_list');
    
    
    config_menu['sound']            = $('#config_menu_sound');
    config_menu['comment_speed']    = $('#config_menu_comment_speed');
    config_menu['x_y_mode']         = $('#config_menu_x_y_mode');
    config_menu['show_comments']    = $('#config_menu_show_comments');
    config_menu['background']       = $('#config_menu_background');
    config_menu['data_background']  = $('#config_menu_data_background');
    config_menu['load_content']     = $('#config_menu_load_content');
    config_menu['get_all_main']     = $('#config_menu_get_all_main');
    config_menu['save_log_on_exit'] = $('#config_menu_save_log_on_exit');
    
    
    config_menu['login_accept'] = $('#config_menu_login_accept_button');
    config_menu['login_cancel'] = $('#config_menu_login_cancel_button');
    
    config_menu['bots_accept'] = $('#config_menu_bots_accept_button');
    
        
    
    /*********************
    * Main view elements
    *********************/
    main_view.el = $('#main_view');
    
    main_view.button['reenter'] = $('#main_reenter_button');
    main_view.button['relogin'] = $('#main_relogin_button');
    
    main_view.button_table = $('#main_button_table');
    
    main_view.data['el'] = $('#main_data');
    
    main_view.data['profile']         = $('#main_data_profile');
    main_view.data['name']            = $('#main_data_name');
    main_view.data['character']       = $('#main_data_character');
    main_view.data['character_arrow'] = $('#main_data_character_arrow');
    main_view.data['stat']            = $('#main_data_stat');
    main_view.data['trip']            = $('#main_data_trip');
    main_view.data['x']               = $('#main_data_x');
    main_view.data['y']               = $('#main_data_y');
    main_view.data['color_picker']    = $('#main_data_color_picker');
    main_view.data['character_img']   = $('#main_data_character_img');
    
    
    main_view['server'] = $('#main_server_select');
    main_view['room']   = $('#main_room_input');
    
    
    /**********************
    * Set global elements
    **********************/
    audio = $('#audio');
    
    loader       = $('#loader');
    loader_small = $('#loader_small');
    eye_icon     = $('#eye_icon');
    
    
    /*******************
    * Global shortcuts
    *******************/
    $('html').on('keydown', function(e)
        {
            if(e.key == 'F11')
                {
                    /**********
                    * Restart
                    **********/
                    session.disconnect();
                    app.relaunch();
                    app.quit();
                }
            else if(e.key == 'F12')
                {
                    require('electron').remote.getCurrentWindow().toggleDevTools();
                }
        });
    
    
    /******************
    * Room view events
    ******************/
    room_view.el.on('mousedown', function(e)
        {
            var el_class = e.target.className;
            
            if(
                (
                    el_class == 'container'
                    || el_class == 'log'
                    || e.target.parentElement.className == 'log'
                    || e.target.parentElement.className == 'log_div_el'
                )
                && e.which == 3
              )
                {
                    show_command_context_menu();
                }
        });
    room_view.el.on('keyup', function(e)
        {
            if(e.key == 'Tab' && e.target.parentElement.className == 'container')
                {
                    room_view.input.focus();
                }
            else if(e.key == 'f' && e.ctrlKey)
                {
                    if( $('#log_search_div').css('display') == 'none' )
                        {
                            $('#log_search_div').show();
                            log_search.focus();
                        }
                    else
                        {
                            $('#log_search_div').hide();
                            
                            win.webContents.stopFindInPage('clearSelection');
                            
                            room_view.input.focus();
                        }
                }
        });
    
    room_view.button.log    .on('click', () => room_view.log.toggle()                );
    room_view.button.save   .on('click', () => save_log()                            );
    room_view.button.reenter.on('click', () => session.reenter()                     );
    room_view.button.users  .on('click', () => show_users_dropdown()                 );
    room_view.button.proxy  .on('click', () => toggle_proxy()                        );
    room_view.button.relogin.on('click', () => relogin()                             );
    room_view.button.config .on('click', () => room_view.dropdown.config.toggle()    );
    room_view.button.stat.on('click', function()
        {
            $('#stat_dropdown_input').val(session.stat());
            room_view.dropdown.stat.toggle();
        });
    room_view.button.new.on('click', function()
        {
            refresh_new_menu();
            room_view.new_menu.el.toggle();
        });
    room_view.button.log_window.on('click', function()
        {
            ipcRenderer.send('toggle_log_window');
        });
    room_view.button.back.on('click', function()
        {
            change_room('main');
            
            if(GET_ALL_MAIN) { setTimeout(() => session.reenter(), 1000); }
        });
    room_view.button.data.on('click', function()
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

    room_view.button.config_login.on('click', function()
        {
            if(config_menu.login.css('display') == 'none')
                {
                    $('.config_menu').hide();
                    show_config_login_menu();
                }
            else
                {
                    config_menu.login.hide();
                }

            room_view.dropdown.config.hide();
        });
    room_view.button.config_trigger.on('click', function()
        {
            var list = '';
            for(var i = 0; i < config.popup_trigger.length; i++)
                {
                    list += config.popup_trigger[i] + '\n';
                }

            $('#config_trigger_list').val(list);

            if(config_menu.trigger.css('display') == 'none')
                {
                    $('.config_menu').hide();
                    config_menu.trigger.show();
                }
            else
                {
                    config_menu.trigger.hide();
                }

            room_view.dropdown.config.hide();
        });
    room_view.button.config_client.on('click', function()
        {
            config_menu.sound            .val(config.sound);
            config_menu.comment_speed    .val(config.comment_speed);
            config_menu.x_y_mode         .val(config.x_y_mode);
            config_menu.show_comments    .val(config.show_comments);
            config_menu.background       .val(config.background);
            config_menu.data_background  .val(config.user_data_background);
            config_menu.load_content     .val(config.load_content);
            config_menu.get_all_main     .val(config.get_all_main);
            config_menu.save_log_on_exit .val(config.save_log_on_exit);
            
            
            if(config_menu.client.css('display') == 'none')
                {
                    $('.config_menu').hide();
                    config_menu.client.show();
                }
            else
                {
                    config_menu.client.hide();
                }
            
            room_view.dropdown.config.hide();
        });
    room_view.button.config_bots.on('click', function()
        {
            var child = $('.bot_list_checkbox');
            
            for(var i = 0; i < child.length; i++)
                {
                    $(child[i]).attr('checked', bots[i].is_on());
                }

            
            if(config_menu.bots.css('display') == 'none')
                {
                    $('.config_menu').hide();
                    config_menu.bots.show();
                }
            else
                {
                    config_menu.bots.hide();
                }
            
            room_view.dropdown.config.hide();
        });
    room_view.el[0].ondragover = function(e){ e.preventDefault(); };
    room_view.el[0].ondrop     = function(e)
        {
            e.preventDefault();
            
            var file = e.dataTransfer.files[0];
            
            if( file.type.includes('image') ) {　util.upload_image(file.path); }
            else                              {　util.upload_file(file.path);  }
        };
    
    
    /************************
    * Room view config menu
    ************************/
    $('#config_menu_trigger_cancel_button').on('click', function()
        {
            config_menu.trigger.toggle();
        });
    $('#config_menu_trigger_accept_button').on('click', function()
        {
            var list = $('#config_trigger_list').val().split('\n').filter( (line) => line !== '' );
            
            config.popup_trigger = list;
            
            if(list.length > 0)
                {
                    save_config();
                }
            
            config_menu.trigger.toggle();
        });
    $('#config_menu_client_add_config').on('click', function()
        {
            dialog.showOpenDialog
                (
                    function(path)
                        {
                            var file = jsonfile.readFileSync(path[0]);
                            
                            for(var key in file) { config[key] = file[key]; }
                            save_config();
                        }
                );
        });
    $('#config_menu_client_add_trip_list').on('click', function()
        {
            dialog.showOpenDialog
                (
                    function(path)
                        {
                            var file = jsonfile.readFileSync(path[0]);
                            
                            for(var key in file) { trip_list[key] = file[key]; }
                            save_trip();
                        }
                );
        });
    $('#config_menu_client_cancel_button').on('click', function()
        {
            config_menu.client.hide();
        });
    $('#config_menu_client_accept_button').on('click', function()
        {
            config.sound                = config_menu.sound           .val() == 'true';
            config.comment_speed        = config_menu.comment_speed   .val();
            config.x_y_mode             = config_menu.x_y_mode        .val();
            config.show_comments        = config_menu.show_comments   .val() == 'true';
            config.background           = config_menu.background      .val();
            config.user_data_background = config_menu.data_background .val() == 'true';
            config.load_content         = config_menu.load_content    .val() == 'true';
            config.get_all_main         = config_menu.get_all_main    .val() == 'true';
            config.save_log_on_exit     = config_menu.save_log_on_exit.val() == 'true';
            
            save_config();
            
            config_menu.client.hide();
        });
    
    room_view.log_search.on('keyup', function(e)
        {
            if(e.key == 'Enter')
                {
                    var text = room_view.log_search.val();
                    ipcRenderer.send('search', text);
                }
            else if(e.key == 'Escape')
                {
                    ipcRenderer.send('stopsearch');
                    $('#log_search_div').hide();
                    
                    log_search.blur();
                }
        });
    
    room_view.data.character_arrow.on('click', function()
        {
            if(character_menu.css('display') != 'none') { character_menu.hide(); return; }
            
            var children = $('.character_menu_div');
            $('.character_menu_img').remove();
            
            for(let i = 0; i < children.length; i++)
                {
                    let character = $(children[i]).attr('character');
                    var img_el    = new Image();
            
                    $(img_el).one('load', function()
                        {
                            var {_r, _g, _b} = room_view.data.color_picker.spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });
            
                    $(img_el).attr('src', './assets/character/'+character+'.png')
                        .addClass('character_menu_img')
                        .on('click', function()
                            {
                                room_view.data.character.val(character);
                                character_menu.hide();
                            });
                    
                    $(children[i]).append(img_el);
                }
            
            character_menu.css('left', '250px')
                .css('top', '10px')
                .css('width', '593px')
                .css('height', '270px')
                .toggle();
        });
    room_view.data.color_picker.on('change', function()
        {
            if(character_menu.css('display') == 'none') { return; }
            
            var imgs = $('.character_menu_img');
            if(!imgs) { return; }
            
            for(let i = 0; i < imgs.length; i++)
                {
                    let character = $(imgs[i]).parent().attr('character');
                    
                    $(imgs[i]).one('load', function()
                        {
                            var {_r, _g, _b} = room_view.data.color_picker.spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });
                        
                    $(imgs[i]).attr('src', './assets/character/' + character + '.png')
                        .on('click', function()
                            {
                                room_view.data.character.val(character);
                                character_menu.hide();
                            });
                }
        });
    room_view.data.accept.on('click', function()
        {
            var {_r, _g, _b} = room_view.data.color_picker.spectrum('get');
            
            session.set_data
                ({
                    name:      room_view.data.name.val(),
                    character: room_view.data.character.val(),
                    stat:      room_view.data.stat.val(),
                    trip:      room_view.data.trip.val(),
                    r:         parseInt(_r),
                    g:         parseInt(_g),
                    b:         parseInt(_b),
                    x:         room_view.data.x.val(),
                    y:         room_view.data.y.val(),
                    scl:       session.get_scl()
                });
            
            
            room_view.data.el.hide();
            character_menu.hide();
            
            clear_screen();
        });

    character_menu = $('#character_menu');
    
    room_view.new_menu.accept.on('click', function(e)
        {
            var profile = room_view.new_menu.profile.val();
            var room    = room_view.new_menu.room.val();
            var n       = room_view.new_menu.n.val();
            var site    = room_view.new_menu.site.val();
            var timeout = room_view.new_menu.timeout.val();
            
            new_instance
                ({
                    prof   : ( profile == 'Default' ? session.get_data() : config.profiles[profile] ),
                    room   : room,
                    n      : n,
                    site   : site,
                    timeout: timeout
                });
        });

    
    /**************
    * Config menu
    **************/
    config_menu.login_cancel.on('click', function()
        {
            config_menu.login.toggle();
        });
    config_menu.login_accept.on('click', function()
        {
            var rgb = config_menu.rgb.val().match(/(\d+) (\d+) (\d+)/);
            if(!rgb) { return; }
            
            var [r, g, b] = rgb.splice(1, 4);
            
            
            config.name     　= config_menu.name.val();
            config.character = config_menu.character.val();
            config.stat     　= config_menu.stat.val();
            config.trip     　= config_menu.trip.val();
            config.r         = parseInt(r);
            config.g         = parseInt(g);
            config.b         = parseInt(b);
            config.x        　= config_menu.x.val();
            config.y        　= config_menu.y.val();
            config.scl      　= config_menu.scl.val();
            config.room     　= config_menu.room.val();
            config.server   　= config_menu.server.val();
            config.proxy    　= config_menu.proxy.val() == "false" ? false : true;
            config.timeout  　= config_menu.timeout.val();
            config.site     　= config_menu.site.val();
            
            save_config();
            
            
            config_menu.login.toggle();
        });
    
    config_menu.bots_accept.on( 'click', () => config_menu.bots.hide() );

    
    /**************************
    * Input bar keydown event
    **************************/
    room_view.input.on('keydown', function(e)
        {
            if(e.key == 'Enter' && e.target.value !== '')
                {
                    var text = e.target.value;
                    
                    if(text[0] == '/')
                        {
                            var com    = text.substr(1);
                            var exists = false;
                            
                            for(var i = 0; i < bots.length; i++)
                                {
                                    if(bots[i].is_on())
                                        {
                                            var ret = bots[i].command_handler(com);
                                            if(ret === undefined) { exists = true; }
                                        }
                                }

                            /*************************************************
                            * If the command isn't in the handler of any bot
                            *************************************************/
                            if(!exists)
                                {
                                    command_handler(com);
                                }
                        }
                    else
                        {
                            if( text.length > 50 && util.is_url(text) && !(text.includes('youtube') || text.includes('youtu.be')) )
                                {
                                    tinyurl(text);
                                }
                            else
                                {
                                    session.comment(text);
                                }
                        }
                    
                    e.target.value = '';
                    
                    prev_input.push(text);
                    prev_input_n = 0;
                }
            else if(e.key == 'ArrowUp')
                {
                    if(prev_input.length !== 0 && prev_input_n < prev_input.length)
                        {
                            prev_input_n++;
                            
                            room_view.input.val( prev_input[prev_input.length - prev_input_n] );
                        }
                }
            else if(e.key == 'ArrowDown')
                {
                    if(prev_input.length !== 0 && prev_input_n > 0)
                        {
                            prev_input_n--;
                            
                            room_view.input.val( prev_input[prev_input.length - prev_input_n] );
                        }
                }
        });
    room_view.input.on('mousedown', function(e)
        {
            if(e.which == 3) { show_command_context_menu(); }
        });

    
    /*******************
    * Main view events
    *******************/
    main_view.button.reenter.on('click', function() { session.reenter(); });
    main_view.button.relogin.on('click', function() { session.relogin(); });
    
    main_view.data.color_picker.on('change', function()
        {
            main_view.data.character_img.one('load', function()
                {
                    var {_r, _g, _b} = main_view.data.color_picker.spectrum('get');
                    
                    change_character_color(this, _r, _g, _b);
                });

            
            main_view.data.character_img.attr('src', './assets/character/'+session.character()+'.png');
        });
    room_view.data.color_picker.on('change', function()
        {
            if(character_menu.css('display') == 'none') { return; }
            
            var imgs = $('.character_menu_img');
            if(!imgs) { return; }
            
            for(let i = 0; i < imgs.length; i++)
                {
                    let character = $(imgs[i]).parent().attr('character');
                    
                    $(imgs[i]).one('load', function()
                        {
                            var {_r, _g, _b} = room_view.data.color_picker.spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });
                        
                    $(imgs[i]).attr('src', './assets/character/' + character + '.png')
                        .on('click', function()
                            {
                                room_view.data.character.val(character);
                                character_menu.hide();
                            });
                }
        });
    
    main_view.data.character.on('keyup', function()
        {
            var character = main_view.data.character.val();
            if(fs.existsSync('./assets/character/'+character+'.png'))
                {
                    main_view.data.character_img.one('load', function()
                        {
                            var {_r, _g, _b} = main_view.data.color_picker.spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });

                    main_view.data.character_img.attr('src', './assets/character/'+character+'.png');
                }
        });

    main_view.data.character_arrow.on('click', function()
        {
            if(character_menu.css('display') != 'none') { character_menu.hide(); return; }
            
            var children = $('.character_menu_div');
            $('.character_menu_img').remove();
            
            for(let i = 0; i < children.length; i++)
                {
                    let character = $(children[i]).attr('character');
                    var img_el    = new Image();
            
                    $(img_el).one('load', function()
                        {
                            var {_r, _g, _b} = main_view.data.color_picker.spectrum('get');
                            
                            change_character_color(this, _r, _g, _b);
                        });
            
                    $(img_el).attr('src', './assets/character/'+character+'.png')
                        .addClass('character_menu_img')
                        .on('click', function()
                            {
                                main_view.data.character.val(character);
                                main_view.data.character.trigger('keyup'); //to change the character image
                                
                                character_menu.hide();
                            });
                    
                    $(children[i]).append(img_el);
                }
            
            character_menu.css('left', '193px')
                .css('top', '10px')
                .css('width', '593px')
                .css('height', '287px')
                .toggle();
        });

    main_view.server.on('change', function(e)
        {
            main = {};
            refresh_main();
            
            change_server(e.target.value);
            
            if(GET_ALL_MAIN) { setTimeout(() => session.reenter(), 1000); }
        });
    main_view.room.on('keydown', function(e)
        {
            if(e.key == 'Enter')
                {
                    change_room( main_view.room.val() );
                    loader_small.hide();
                }
        });

    eye_icon.on('click', function()
        {
            room_view.el.toggle();
            main_view.el.toggle();
        });
    $('#github_icon').on
        (
            'click',
            (e) => open_with_browser(e, 'https://github.com/nishinishi9999/monachat-html5-client')
        );
    
    
    room_view.data.color_picker.spectrum
        ({
            color          : 'black',
            showInput      : true,
            preferredFormat: 'rgb',
            showPalette    : true,
            palette        : COLOR_LIST
        });
    
    main_view.data.color_picker.spectrum
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
    for(character in character_list)
        {
            sorted_n.push(character);
        }
    
    sorted_n.sort((a, b) => character_list[a].n - character_list[b].n);
    
    for(i = 0; i < sorted_n.length; i++)
        {
            var div_el = $(document.createElement('DIV'))
                .addClass('character_menu_div')
                .addClass('category_'+character_list[sorted_n[i]].category)
                .attr('character', sorted_n[i])[0];

            $(character_menu).append(div_el);
        }
    
    
    /**************************************
    * Add default status to stat dropdown
    **************************************/
    var row = $(document.createElement('DIV'))
        .addClass('stat_dropdown_row')
        .css('display', 'table-row')[0];
    
    room_view.dropdown.stat.append(row);
    
    for(let i = 0; i < DEFAULT_STAT.length; i++)
        {
            let text_el = $(document.createElement('TEXT'))
                .text(DEFAULT_STAT[i])
                .addClass('stat_dropdown_cell')
                .css('display', 'table-cell')
                .on('click', function()
                    {
                        session.stat(DEFAULT_STAT[i]);
                        
                        room_view.dropdown.stat.toggle();
                    })[0];
            
            if($(row).children().length == 2)
                {
                    row = $(document.createElement('DIV'))
                        .addClass('stat_dropdown_row')
                        .css('display', 'table-row')[0];
                    
                    room_view.dropdown.stat.append(row);
                }
            
            $(row).append(text_el);
        }

    var div = $(document.createElement('DIV'))
        .addClass('stat_dropdown_cell')[0];
    
    var label = $(document.createElement('LABEL'))
        .text('Stat:')
        .attr('for', 'stat_dropdown_input')[0];
    
    var input = $(document.createElement('INPUT'))
        .attr('id', 'stat_dropdown_input')
        .on('keydown', function(e)
            {
                if(e.key == 'Enter') { session.stat($(this).val()); }
            })[0];
    
    $(div).append(label);
    $(div).append(input);
    
    $(row).append(div);
    
    
    /*******************************
    * Add bots to bots config list
    *******************************/
    for(let i = 0; i < bots.length; i++)
        {
            var tr_el = $(document.createElement('TR'))
                .addClass('bot_list_tr')[0];
            
            
            var name_td = $(document.createElement('TD'))
                .text(bots[i].name)
                .addClass('bot_list_name')
                .addClass('bot_list_td bot_list_cell')
                .on('click', function()
                    {
                        require('child_process').exec( 'explorer .\\assets\\js\\bots' );
                    })[0];
            
            
            var check_td = $(document.createElement('TD'))
                .addClass('bot_list_td bot_list_cell')[0];
            
            let checkbox_el = $(document.createElement('INPUT'))
                .attr('type', 'checkbox')
                .attr('checked', bots[i].is_on())
                .addClass('bot_list_checkbox')
                .on('click', function()
                    {
                        bots[i].toggle();
                    })[0];
            
            $(check_td).append(checkbox_el);
            
            
            var default_td = $(document.createElement('TD'))
                .addClass('bot_list_td bot_list_cell')[0];

            let default_el = $(document.createElement('INPUT'))
                .attr('type', 'checkbox')
                .attr('checked', bots[i].is_on())
                .addClass('bot_list_default')
                .on('click', function(e)
                    {
                        config.default_bots[ bots[i].name ] = e.target.checked;
                        
                        save_config();
                    })[0];
            
            $(default_td).append(default_el);
                
            
            $(tr_el).append(name_td)
                .append(check_td)
                .append(default_td);
            
            $('#bot_list').append(tr_el);
        }


    /**************************************************
    * Change text and element formatting for japanese
    **************************************************/
    if(LANGUAGE == 'JP')
        {
            $('.room_view_button').css('font', 'var(--default_font)') /////
                .css('font-size', '13px');
            
            $('#config_menu_client_add_config').css('left', '-11px');
            $('#config_menu_client_add_trip_list').css('left', '-11px');
            $('#config_menu_client_accept_button').css('top', '-16px');
            $('#config_menu_client_cancel_button').css('top', '24px');
        }
    
    
    /****************************************************************
    * Set login button background if it is initialized with a proxy
    ****************************************************************/
    POPUP_ENABLED = config.popup;
    if(login_data.proxy) { room_view.button.proxy.css('background-color', 'rgb(100, 100, 100)'); }
    
    
    IS_TRANSPARENT = config.transparent || ARGV.includes('transparent');
    
    if(IS_TRANSPARENT)
        {
            ALWAYS_ON_TOP = true;
            MAX_Y = 305;
            
            room_view.log.hide();
            $('#log_button, #log_window_button, #save_log_button, #data_button').hide();
            $('#reenter_button, #relogin_button, #proxy_button, #new_button').hide();
            
            $( () => $('.text_input').draggable
                ({
                    cancel: false,
                    
                    start: function(e)
                        {
                            prev_x = e.screenX;
                            prev_y = e.screenY;
                            
                            LOG_POS = { left: room_view.input.css('left'), top: room_view.input.css('bottom') };
                        },
                    drag:  function(e)
                        {
                            var [pos_x, pos_y] = win.getPosition();
                            
                            var x_diff = e.screenX - prev_x;
                            var y_diff = e.screenY - prev_y;
                            
                            prev_x = e.screenX;
                            prev_y = e.screenY;
                            
                            var x = pos_x + x_diff;
                            var y = pos_y + y_diff;
                            
                            win.setPosition(x, y);
                            
                            //return false;
                        },
                    stop: function(e)
                        {
                            room_view.input.css('left', LOG_POS.left);
                            room_view.input.css('bottom',  LOG_POS.bottom );
                        }
                })
            );
        }
    
    
    /********
    * Login
    ********/
    session = new Monachat(login_data, signal_handler);
    session.connect();
    
    
    loader.show();
    
    /******************
    * Show login room
    ******************/
    if(session.room() == 'main')
        {
            $('.container').hide();
            
            refresh_data_menu(main_view.data);
            
            character = main_view.data.character.val();
            if(fs.existsSync('./assets/character/'+character+'.png'))
                {
                    main_view.data.character_img.attr('src', './assets/character/'+character+'.png');
                }
            
            main_view.el.show();
            
            setTimeout(() => session.reenter(), 1000); //// test
        }
    else
        {
            main_view.el.hide();
        }
};