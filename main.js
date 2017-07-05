// main

const {app, BrowserWindow} = require('electron');
const {ipcMain}            = require('electron');
const path                 = require('path');
const url                  = require('url');

var jsonfile = require('jsonfile');
var config   = jsonfile.readFileSync('./config.json');


global.argv = process.argv;


var IS_LOG_WINDOW_HIDDEN = true;


/********************************************************************************
* Declarate window handler so that it's not deleted when createWindow() returns
********************************************************************************/
var win;
var log_win;

function createWindow()
    {
        /****************
        * Create window
        *****************/
        var win_options =
            {
                width : 812,
                height: 465,
                autoHideMenuBar: true
            };
        
        if(config.transparent || process.argv.includes('transparent'))
            {
                win_options['frame']       = false;
                win_options['transparent'] = true;
                win_options['alwaysOnTop'] = true;
            }
            
        
        win = new BrowserWindow(win_options);

        log_win = new BrowserWindow
            ({
                width          : 0,
                height         : 0,
                autoHideMenuBar: true
            });

        log_win.hide();
        
        log_win.setSize(650, 500);
        log_win.center();
        
        win.focus();

        
        /******************
        * Load index.html
        ******************/
        win.loadURL( url.format
            ({
                pathname: path.join(__dirname, 'index.html'),
                protocol: 'file:',
                slashes:  true
            }));

        log_win.loadURL( url.format
            ({
                pathname: path.join(__dirname, 'log_window.html'),
                protocol: 'file:',
                slashes:  true
            }));
        
        
        /***********************
        * Open developer tools
        ***********************/
        //win.webContents.openDevTools();
        
        
        /********************
        * Set close handler
        ********************/
        win.on('close', function(e)
            {
                if(config['save_log_on_exit'])
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
ipcMain.on('search', function(e, text)
    {
        win.webContents.findInPage(text);
        log_win.webContents.findInPage(text);
    });
ipcMain.on('stopsearch', function()
    {
        win.webContents.stopFindInPage('clearSelection');
        log_win.webContents.stopFindInPage('clearSelection');
    });
ipcMain.on('end', function(e, el_arr)
    {
        app.quit();
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
        if(win == null) { createWindow(); }
    });