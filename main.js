// main

var {app, BrowserWindow} = require('electron');
var path = require('path');
var url  = require('url');


global.argv = process.argv;


/********************************************************************************
* Declarate window handler so that it's not deleted when createWindow() returns
********************************************************************************/
var win;

function createWindow()
    {
        /****************
        * Create window
        *****************/
        win = new BrowserWindow
            ({
                width:           812,
                height:          465,
                autoHideMenuBar: true
                //frame:           false
            });

        
        /******************
        * Load index.html
        ******************/
        win.loadURL( url.format
            ({
                pathname: path.join(__dirname, 'index.html'),
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
        win.on('closed', () => {win = null} );
    }

app.on
    (
        'ready',
        createWindow
    );
app.on
    (
        'activate',
        () => { if(win == null) { createWindow(); } }
    );