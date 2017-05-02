// monachat.js

var {app}   = require('electron').remote;
var {shell} = require('electron');
var fs      = require('fs');

var $        = require('jquery');
var xmldoc   = require('xmldoc');
var jsonfile = require('jsonfile');
var notifier = require('node-notifier');

var Monachat = require('./js/monachat.jsm');
var util     = require('./js/util.js');


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
var user   = {};
var room   = {};
var main   = {};
var button = {};
var muted  = {};

var config     = {};
var login_data = {};


/***********************************
* Placeholders for global elements
***********************************/
var session;

var log_textarea;

var text_input;

var users_dropdown;
var stat_dropdown;

var main_button_table;


/***************
* Global flags
***************/
var POPUP_ENABLED;


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
        if     (x <  30)              { return x_scale(30);  }
        else if(x > 690)              { return x_scale(690); }
        else if(isNaN(parseFloat(x))) { return x_scale(30);  }
        else
            {
                var [a, b]     = [30, 690];
                var [min, max] = [60, 770];
                
                return parseInt((((b-a)*(x-min))/(max-min)) + a);
            }
    }

function y_scale(y)
    {
        y = 440; /** disabled **/
        
        var [a, b]     = [0, 500];
        var [min, max] = [220, 850];
        
        return parseInt((((b-a)*(y-min))/(max-min)) + a);
    }

function log(el_arr)
    {
        //console.log('log', el_arr);
        
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
                        if(el.textContent.match(JP_REGEX))
                            {
                                padding = 2;
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
                
                
                var first_dashed_line_el  = create_dashed_line_el(73);
                var second_dashed_line_el = create_dashed_line_el(73);                
                
                
                var line = 'ROOM '+ room;
                var room_el = create_text_el(line);
                    
                
                var nbsp_el = create_nbsp_el(31);
                
                
                log([first_dashed_line_el]);
                log([nbsp_el, room_el]);
                log([second_dashed_line_el]);
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
                
                var dashed_line = create_dashed_line_el(72);
                
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
        sorted_rooms = sorted_rooms.sort( function(a, b)
            {
                if     (isNaN(a-1)) { return -1; }
                else if(isNaN(b-1)) { return  1; }
                return parseInt(a)-parseInt(b);
            });
        
        
        clear_screen();
        main_button_table.children().remove();
        
        var total_users = 0;
        var room_n      = 0;
        for(var key in main)
            {
                total_users += parseInt(main[key]);
                if(main[key] != 0) { room_n++; }
            }


        var text = create_text_el('Monachat ('+room_n+' rooms, '+total_users+' users)');

        $(text).attr('id', 'main_title');

        main_view.append(text);

        
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
                        
                        $(button_el).attr('id', 'main_room_button_'+n )
                            .attr('class', 'main_room_button')
                            .text( 'Room ' + n + ': ' + c)
                            .on('click', function()
                                {
                                    format_log('room', [sorted_rooms[i]]);
                                    change_room(sorted_rooms[i]);
                                });
                        
                        
                        td = document.createElement('TD');
                        $(td).attr('class', 'main_button_table_td');
                        $(td).append(button_el);
                        
                        if($(last_tr).children().length < 6)
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
                    .attr('draggable', false)
                    .css('left', x_scale(user[id].x || 0  ))
                    .css('top',  y_scale(user[id].y || 400));
                    
                /*************************
                * Allow to click through
                *************************/
                if(id != session.id()) { $(div).css('pointer-events', 'none'); }
                
                
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
                
                
                /***************************
                * Append them to room_view
                ***************************/
                $(div).append(img)
                    .append(user_data)
                    .append(stat_div);
                
                
                room_view.append(div);
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
                if(room[id] == undefined) { continue; }
                
                
                var {name, ihash} = user[id];
                
                var el = create_text_el(name + ' (' + id + ') ' +  WHITE_TRIP_SYM + ihash.substr(-6));
                $(el).attr('class', 'dropdown_el')
                    .on('click', () => alert(id));
                
                users_dropdown.append(el);
                
                $(el).append('<br>');
            }
        
        users_dropdown.css('top', 340-users_dropdown.height());
        
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

                console.log(trip_list[ihash]);
                format_log('triplist', [ihash, id].concat(trip_list[ihash]));
                
                
                for(var i = 0; i < trip_list[ihash].length; i++)
                    {
                        //search_trip[]
                    }
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

function add_profile(profile_name)
    {
        var id = session.id();
        var {name, character, stat, trip, r, g, b, x, y, scl} = user[id];
        
        config['profiles'][profile_name] =
            {
                "name"     : name,
                "character": character,
                "stat"     : stat,
                "trip"     : trip,
                "r"        : r,
                "g"        : g,
                "b"        : b,
                "x"        : x,
                "y"        : y,
                "scl"      : scl
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
            }
    }    

function toggle_proxy()
    {
        clear_screen();
        
        session.proxy();
        
        button['proxy'].css('background-color', session._proxy ? 'rgb(100, 100, 100)' : 'white');
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
                    }
                else if(xml.name == 'COM')
                    {
                        var {id, cmt} = xml.attr;
                        
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
        else if(com[0] == 'saveprofile') { add_profile(com[1]);                 }
        else if(com[0] == 'profile')     { load_profile(com[1]);                }
        else if(com[0] == 'savelog')     { save_log();                          }
        
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
                        format_log('error', ['User with id ' + id + 'doesnt exist.']);
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
                
                format_log('room', [com[1]]);
            }
        else if(com[0] == 'relogin')
            {
                clear_screen();
                session.relogin();
            }
        else if(com[0] == 'mute')
            {
                var id    = com[1];
                
                if(user[id] == undefined) { return; }
                var ihash = user[id].ihash;
                
                muted[ihash] = muted[ihash] == undefined ? 1 : undefined;
                
                if($('#user_div_'+id)) { $('#user_div_'+id).toggle(); }
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

function read_config()
    {
        config = jsonfile.readFileSync('config.json');
    }


window.onload = function()
{
    config     = jsonfile.readFileSync('config.json');
    login_data = jsonfile.readFileSync('config.json');
    
    process_arguments();
    
    session = new Monachat(login_data, signal_handler);
    session.connect();
    
    
    POPUP_ENABLED = config['popup'];
    
    
    /**********************
    * Set global elements
    **********************/
    main_view = $('#main_view');
    room_view = $('#room_view');
    
    main_button_table = $('#main_button_table');
    
    button['log']     = $('#log_button');
    button['data']    = $('#data_button');
    button['users']   = $('#users_button');
    button['stat']    = $('#stat_button');
    button['config']  = $('#config_button');
    button['back']    = $('#back_button');
    button['reenter'] = $('#reenter_button');
    button['relogin'] = $('#relogin_button');
    button['proxy']   = $('#proxy_button');
    
    button['main_reenter'] = $('#main_reenter_button');
    
    log_textarea = $('#log_textarea');
    
    text_input   = $('.text_input');
    
    users_dropdown = $('#users_dropdown');
    stat_dropdown  = $('#stat_dropdown');
    
    
    trip_list = jsonfile.readFileSync('trip.json');
    
    
    //main_view.append(text_input);
    
    
    /*******************************
    * Toggle log textarea on click
    *******************************/
    button['log'].on('click', function()
        {
            log_textarea.toggle();
        });

    button['reenter'].on('click', function()
        {
            session.reenter();
        });
    
    button['relogin'].on('click', function()
        {
            clear_screen();
            session.relogin();
        });
        
    button['back'].on('click', function()
        {
            change_room('main');
        });
    
    button['users'].on('click', function()
        {
            show_users_dropdown();
        });
    button['stat'].on('click', function()
        {
            stat_dropdown.toggle();
        });
        
    button['proxy'].on('click', function()
        {
            toggle_proxy();
        });
        

    button['main_reenter'].on('click', function()
        {
            session.reenter();
        });
    

    log_textarea.attr('edditable', false);
    
    
    for(let i = 0; i < DEFAULT_STAT.length; i++)
        {
            var el = create_text_el(DEFAULT_STAT[i]);
            $(el).attr('class', 'dropdown_el')
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
}