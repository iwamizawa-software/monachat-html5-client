/***********
* Base bot
***********/

function Bot()
    {
        this.name = require('path').basename(__filename);
        
        this._on          = false;
        this._paused      = true;
        this._timeout     = 60;
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
            };
        
        this.on = function()
            {
                this._on = true;
                this.resume();
            };
        this.off = function()
            {
                this._on = false;
                this.pause();
            };
        this.toggle = function()
            {
                if(this.is_on()) { this.off(); }
                else             { this.on(); }
            };
        
        this.is_paused = () => this._paused;
        this.is_on     = () => this._on;
        
        
        this.signal_handler  = signal_handler;
        this.command_handler = command_handler;
        this.repeat          = repeat;
    }

module.exports = new Bot();


function signal_handler(msg)
    {
        if(!this._on) { return; }
        
        var id, ihash, stat;
        var cmt;
        var n, c;
        
        /************************
        * Discard first message
        ************************/
        if(msg.match(/^\+/))
            {
                return;
            }
        else
            {
                var xml  = new xmldoc.XmlDocument(msg);
                var attr = xml.attr;
                
                
                if(xml.name == 'CONNECT')
                    {
                        id = xml.attr.id;
                    }
                else if(xml.name == 'UINFO')
                    {
                        //[n, c, id, name, ihash] = [ attr.n, attr.c, attr.id, attr.name, attr.ihash ];
                    }
                else if(xml.name == 'COUNT')
                    {
                        if(session.room() != 'main')
                            {
                                [n, c] = [xml.attr.n, xml.attr.c];
                            }
                        else
                            {
                            }
                    }
                else if(xml.name == 'ROOM')
                    {
                        var child;
                        
                        for(var i = 0; i < xml.children.length; i++)
                            {
                                child = xml.children[i];
                                id    = child.attr.id;
                            }
                    }
                else if(xml.name == 'ENTER')
                    {
                        id = xml.attr.id;
                    }
                else if(xml.name == 'USER')
                    {
                        id = xml.attr.id;
                    }
                else if(xml.name == 'EXIT')
                    {
                        id = xml.attr.id;
                    }
                else if(xml.name == 'SET')
                    {
                        id = xml.attr.id;
                        
                        /***********************
                        * It moves three times
                        ***********************/
                        if(xml.attr.x !== undefined)
                            {
                            }
                        if(xml.attr.y !== undefined)
                            {
                            }
                        if(xml.attr.scl !== undefined)
                            {
                            }
                        
                        if(xml.attr.stat !== undefined)
                            {
                                stat = xml.attr;
                            }
                    }
                else if(xml.name == 'IG')
                    {
                        [id, ihash, stat] = [attr.id, attr.ihash, attr.stat];
                    }
                else if(xml.name == 'COM')
                    {
                        [id, cmt] = [xml.attr.id, xml.attr.cmt];
                    }
            }
    }

function command_handler(com)
    {
        if(!this._on) { return; }
        
        com = com.split(' ');
        
        if(com[0] == 'test')
            {
            }
        else
            {
                return false;
            }
    }

function repeat()
    {
        if(!this._on || this._paused) { return; }
        
        //session.comment('ページ:http://tinyurl.com/monachat-html5-client-0-8-0');
    }