// main

const {app, BrowserWindow} = require('electron');
const {ipcMain}            = require('electron');
const path                 = require('path');
const url                  = require('url');


/*
var jsonfile = require('jsonfile');
var config   = jsonfile.readFileSync('./config.json');
*/


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
        win = new BrowserWindow
            ({
                width          : 812,
                height         : 465,
                autoHideMenuBar: true
                //frame:           false
            });

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
        win.on('closed', function()
            {
                process.exit();
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
        process.exit();
        
    });


app.on('ready', function()
    {
        createWindow();
    });
app.on('activate', function()
    {
        if(win == null) { createWindow(); }
    });