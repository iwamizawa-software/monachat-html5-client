// main

const {app, BrowserWindow} = require('electron');
const {shell}              = require('electron');
const {ipcMain}            = require('electron');
const {Menu, dialog}       = require('electron');
const {clipboard}          = require('electron');
const path                 = require('path');
const url                  = require('url');

const jsonfile = require('jsonfile');
const notifier = require('node-notifier');
const config   = jsonfile.readFileSync('./app/config.json');


global.argv = process.argv;

const LANGUAGE             = config.language;
const INDEX_FILE           = config.language == 'EN' ? 'index.html' : 'index_jp.html';


var IS_LOG_WINDOW_HIDDEN = true;
var CTX_MENU_ARGS        = {};


/**
* Override eval for security reasons
**/
global.eval = function() { console.log("No can do."); };


/**
* Declarate window handler so that it's not deleted when createWindow() returns
**/
var win;
var log_win;


function send_win(msg, args) { win.webContents.send(msg, args); }


function createWindow()
    {
        /****************
        * Create window
        *****************/
        var win_options =
            {
                width : 900,
                height: 500,
                autoHideMenuBar: true,
                nodeIntegration: false
            };
            
        
        win = new BrowserWindow(win_options);

        log_win = new BrowserWindow
            ({
                width          : 0,
                height         : 0,
                autoHideMenuBar: true
            });

        log_win.hide();
        
        log_win.setSize(900, 500);
        log_win.center();
        
        win.focus();

        
        /******************
        * Load index.html
        ******************/
        win.loadURL( url.format
            ({
                pathname: path.join(__dirname, INDEX_FILE),
                protocol: 'file:',
                slashes:  true,
                nodeIntegration: false
                //contextIsolation: true
            }));

        log_win.loadURL( url.format
            ({
                pathname: path.join(__dirname, 'log_window.html'),
                protocol: 'file:',
                slashes:  true,
                contextIsolation: true
            }));
        
        
        /********************
        * Set close handler
        ********************/
        win.on('close', function(e)
            {
                if(config.save_log_on_exit)
                    {
                        win.webContents.send('save_log');
                    }
                else
                    {
                        process.exit();
                    }
                
                e.preventDefault();
            });
        log_win.on('close', function(e)
            {
                log_win.hide();
                
                IS_LOG_WINDOW_HIDDEN = true;
                
                e.preventDefault();
            });
    }


ipcMain.on('toggle_log_window', function(e)
    {
        IS_LOG_WINDOW_HIDDEN ? log_win.show() : log_win.hide();
        IS_LOG_WINDOW_HIDDEN = !IS_LOG_WINDOW_HIDDEN;
    });
ipcMain.on('append_log', function(e, el_arr)
    {
        log_win.webContents.send('append_log', el_arr);
    });
ipcMain.on('open_room_context_menu', function(e, args)
    {
        for(var key in args) { CTX_MENU_ARGS[key] = args[key]; }
        
        open_room_context_menu();
    });
ipcMain.on('open_user_context_menu', function(e, args)
    {
        for(var key in args) { CTX_MENU_ARGS[key] = args[key]; }
        
        open_user_context_menu();
    });
ipcMain.on('popup', function(e, args)
    {
        notifier.notify
            ({
                'title': args.title,
                'message': args.msg
            });
    })
ipcMain.on('open_browser', function(e, url)
    {
        shell.openExternal(url);
    });
ipcMain.on('copy_clipboard', function(e, text)
    {
        clipboard.writeText(text);
    });
ipcMain.on('restart', function()
    {
        app.relaunch();
        app.quit();
    });
ipcMain.on('end', function(e)
    {
        //app.quit();
        process.exit();
    });


var index = process.argv.indexOf('slave');
var val   = process.argv[index+1];

if(index != -1 && val)
    {
        process.on('message', function(msg)
            {
                win.webContents.send('master_msg', msg);
            });
    }
else
    {
        process.on('message', function(msg)
            {
                win.webContents.send('slave_msg', msg);
            });
    }


app.on('ready', function()
    {
        createWindow();
    });
app.on('activate', function()
    {
        if(win === null) { createWindow(); }
    });

function open_room_context_menu()
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
                popup_none    : LANGUAGE == 'EN' ? 'none'               : '無',
                popup_some    : LANGUAGE == 'EN' ? 'some'               : '在',
                popup_all     : LANGUAGE == 'EN' ? 'all'                : '全',
                'new'         : LANGUAGE == 'EN' ? 'New'                : '新起動',
                copypaste     : LANGUAGE == 'EN' ? 'Copy&Paste'         : 'コピペ',
                copy          : LANGUAGE == 'EN' ? 'Copy'               : 'コピー',
                paste         : LANGUAGE == 'EN' ? 'Paste'              : 'ペスト',
                util          : LANGUAGE == 'EN' ? 'Util'               : 'ツール',
            };
        
        var template =
            [
                { label: text.next_room     + (CTX_MENU_ARGS.next_room||''), click() { send_win('ctx_menu',  ['next']); } },
                { label: text.previous_room + (CTX_MENU_ARGS.prev_room||''), click() { send_win('ctx_menu',  ['prev']); } },
                
                { type: 'separator' },
                
                {
                    label: text.profile,
                    submenu:
                        [
                            { label: text.save_profile, click() { send_win('ctx_menu', ['add_profile']); } },
                            { label: text.default,      click() { send_win('ctx_menu', ['default']);     } },
                            { label: text.random,       click() { send_win('ctx_menu', ['random']);      } },
                            { label: text.nanashi,      click() { send_win('ctx_menu', ['nanashi']);     } },
                            { label: text.invisible,    click() { send_win('ctx_menu', ['invisible']);   } },
                            { label: text.anonymous,    click() { send_win('ctx_menu', ['anonymous']);   } }
                        ]
                },
                
                { type: 'separator' },
                
                {
                    label: text.util,
                    submenu:
                        [
                            {
                                label: text.upload_image, click()
                                    {
                                        dialog.showOpenDialog( function(path) { send_win('ctx_menu', [ 'up_image', path[0] ]); } );
                                    }
                            },
                            {
                                label: text.upload_file, click()
                                    {
                                        dialog.showOpenDialog( function(path) { send_win('ctx_menu', [ 'up_file', path[0] ]); } );
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
                                label: text.sound + (CTX_MENU_ARGS.sound_on ? 'on'  : 'off' ),
                                click() { send_win('ctx_menu', ['tgl_sound']); }
                            },
                            {
                                label: text.popup + ( CTX_MENU_ARGS.show_popup === 0
                                    ? text.popup_none
                                    : CTX_MENU_ARGS.show_popup == 1
                                        ? text.popup_some
                                        : text.popup_all ),
                                    
                                    click() { send_win('ctx_menu', ['show_popup']); }
                            }
                        ]
                },
                
                { type: 'separator'},
                
                { label: text['new'], click() { send_win('ctx_menu', ['new']) }  }
            ];
        
        
        var menu = Menu.buildFromTemplate(template);
        menu.popup(win);
    }

function open_user_context_menu()
    {
        var text =
            {
                names_registered : LANGUAGE == 'EN' ? ' Names registered: ' : ' 登録済名前: ',
                copy             : LANGUAGE == 'EN' ? 'Copy'                : 'コピー',
                ignore           : LANGUAGE == 'EN' ? 'Ignore'              : '無視',
                mute             : LANGUAGE == 'EN' ? 'Mute'                : 'ミュート',
                search_name      : LANGUAGE == 'EN' ? 'Search name'         : '名前検索',
                stalk            : LANGUAGE == 'EN' ? 'Stalk '              : 'ストーカー ',
                repeat           : LANGUAGE == 'EN' ? 'Repeat '             : '繰り返し '
            };
        
        /**
        TODO: Stalk and repeat not working correctly
        **/
        
        var id = CTX_MENU_ARGS.id;
        
        var template =
            [
                { label: CTX_MENU_ARGS.user_data, click() { send_win('ctx_menu', ['user_data', id]) } },
                { type: 'separator' },
                { label: CTX_MENU_ARGS.names,     click() { send_win('ctx_menu', ['names', id]); } },
                { type: 'separator' },
                { label: text.copy,         click() { send_win('ctx_menu', ['copy',        id]); } },
                { label: text.ignore,       click() { send_win('ctx_menu', ['ignore',      id]); } },
                { label: text.mute,         click() { send_win('ctx_menu', ['mute',        id]); } },
                { label: text.search_name,  click() { send_win('ctx_menu', ['search_name', id]); } },
                { label: text.stalk  + (CTX_MENU_ARGS.is_stalked  ? 'On' : 'Off'), click() { send_win('ctx_menu', ['stalk',  id]) } },
                { label: text.repeat + (CTX_MENU_ARGS.is_repeated ? 'On' : 'Off'), click() { send_win('ctx_menu', ['repeat', id]) } }
            ];
            
        
        var menu = Menu.buildFromTemplate(template);
        menu.popup(win);
    }