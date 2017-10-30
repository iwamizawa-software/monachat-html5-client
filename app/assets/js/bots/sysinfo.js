/***********
* Base bot
***********/
var {exec, spawn} = require('child_process');
var os = require('os');

function Bot()
    {
        this.name = require('path').basename(__filename);
        
        this._on          = false;
        this._paused      = true;
        this._timeout     = 10;
        this._interval_id = 100;
        
        
        this.pause = function()
            {
                this._paused = true;
                clearInterval(this._interval_id);
            };
        this.resume = function()
            {
                if(this._paused)
                    {
                        this._paused      = false;
                        this._interval_id = setInterval( () => this.repeat(), this._timeout * 1000 );
                    }
            };
        this.timeout = function(s)
            {
                this._timeout = s;
                this.pause();
                this.resume();
            }
        
        this.on = function()
            {
                this._on = true;
                this.resume();
            }
        this.off = function()
            {
                this._on = false;
                this.pause();
            }
        this.toggle = function()
            {
                if(this.is_on()) { this.off(); }
                else             { this.on(); }
            }
        
        this.is_paused = () => this._paused;
        this.is_on     = () => this._on;
        
        this.top = '';
        this.toggle_top = toggle_top;
        
        this.prev_stat  = '';
        
        this.signal_handler  = signal_handler;
        this.command_handler = command_handler;
        this.repeat          = repeat;
    }

module.exports = new Bot();


function signal_handler(msg)
    {
        if(!this._on) { return; }
        
        return;
        
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
                        //var {id} = xml.attr;
                    }
                else if(xml.name == 'UINFO')
                    {
                        //var {n, c, id, name, ihash} = xml.attr;
                    }
                else if(xml.name == 'COUNT')
                    {
                        if(session.room() != 'main')
                            {
                                //var {n, c} = xml.attr;
                            }
                        else
                            {
                            }
                    }
                else if(xml.name == 'ROOM')
                    {
                        /**
                        for(var i = 0; i < xml.children.length; i++)
                            {
                                var child = xml.children[i];
                                var id    = child.attr.id;
                            }
                        **/
                    }
                else if(xml.name == 'ENTER')
                    {
                        //var {id} = xml.attr;
                    }
                else if(xml.name == 'USER')
                    {
                        //var {id} = xml.attr;
                    }
                else if(xml.name == 'EXIT')
                    {
                        //var {id} = xml.attr;
                    }
                else if(xml.name == 'SET')
                    {
                        //var {id} = xml.attr;
                        
                        /***********************
                        * It moves three times
                        ***********************/
                        if(xml.attr.x != undefined)
                            {
                            }
                        if(xml.attr.y != undefined)
                            {
                            }
                        if(xml.attr.scl != undefined)
                            {
                            }
                        
                        if(xml.attr.stat != undefined)
                            {
                                //var {stat} = xml.attr;
                            }
                    }
                else if(xml.name == 'IG')
                    {
                        //var {id, ihash, stat} = xml.attr;
                    }
                else if(xml.name == 'COM')
                    {
                        //var {id, cmt} = xml.attr;
                    }
            }
    }

function command_handler(com)
    {
        if(!this._on) { return; }
        
        com = com.split(' ');
        
        if(com[0] == 'top')
            {
                this.toggle_top();
            }
        else
            {
                return false;
            }
    }

function repeat()
    {
        if(!this._on || this._paused) { return; }
    }


function toggle_top()
    {
        if(this.top != '')
            {
                this.top.kill();
                this.top = '';
                
                session.stat(this.prev_stat);
                this.prev_stat = '';
                
                return;
            }
        
        this.prev_stat = session.stat();
        
        
        this.top = spawn('top', ['-b']);
        this.top.stdout.setEncoding('utf8');
        
        this.top.stdout.on('data', function(data)
            {
                var match = data.match(/%Cpu\d\s+:\s+(\d+?,\d+?\/\d+?,\d+?)\s+/g);
                if(!match) { return; }
                
                var temps = match.map( (str) => str.match(/(\d+,\d+)\/(\d+,\d+)/) )
                    .map( (arr) =>
                        [
                            parseFloat( arr[1].replace(',', '.') ),
                            parseFloat( arr[2].replace(',', '.') )
                        ]);
                
                
                var [a, b] = [0.0, 0.0];
                for(var i = 0; i < temps.length; i++)
                    {
                        a += temps[i][0];
                        b += temps[i][1];
                    }
                
                a = (a/temps.length).toFixed(2);
                b = (b/temps.length).toFixed(2);
                
                //a = temps[0][0].toFixed(2);
                
                
                var ram = (　(　os.totalmem() - os.freemem()　)/1024/1024/1024　).toFixed(2);
                
                session.stat('CPU ' + a + '% | ' + ram + ' GB' );
            });
        
        this.top.stderr.on('data', (err) => console.log('Error'));
        
        this.top.on('exit', (code) => console.log('Child process exited, code:', code) );
    }