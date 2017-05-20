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
        
        
        this.signal_handler  = signal_handler;
        this.command_handler = command_handler;
        this.repeat          = repeat;
    }

module.exports = new Bot();


function signal_handler(msg)
    {
        if(!this._on) { return; }
        
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
                        var {id} = xml.attr;
                    }
                else if(xml.name == 'UINFO')
                    {
                        var {n, c, id, name, ihash} = xml.attr;
                    }
                else if(xml.name == 'COUNT')
                    {
                        if(session.room() != 'main')
                            {
                                var {n, c} = xml.attr;
                            }
                        else
                            {
                            }
                    }
                else if(xml.name == 'ROOM')
                    {
                        for(var i = 0; i < xml.children.length; i++)
                            {
                                var child = xml.children[i];
                                var id    = child.attr.id;
                            }
                    }
                else if(xml.name == 'ENTER')
                    {
                        var {id} = xml.attr;
                    }
                else if(xml.name == 'USER')
                    {
                        var {id} = xml.attr;
                    }
                else if(xml.name == 'EXIT')
                    {
                        var {id} = xml.attr;
                    }
                else if(xml.name == 'SET')
                    {
                        var {id} = xml.attr;
                        if(id == session.id()) { return; }
                        
                        
                        /***********************
                        * It moves three times
                        ***********************/
                        if(xml.attr.x != undefined)
                            {
                                evade();
                            }
                        if(xml.attr.y != undefined)
                            {
                            }
                        if(xml.attr.scl != undefined)
                            {
                            }
                        
                        if(xml.attr.stat != undefined)
                            {
                                var {stat} = xml.attr;
                            }
                    }
                else if(xml.name == 'IG')
                    {
                        var {id, ihash, stat} = xml.attr;
                    }
                else if(xml.name == 'COM')
                    {
                        var {id, cmt} = xml.attr;
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
    }

function evade()
    {
        var pos = [];
        
        for(var id in room) { pos.push(room[id]); }
        pos.sort( (user1, user2) => user1.x - user2.x );
        pos.unshift({x: -96});
        pos.push({x: 754});
        
        console.log(pos);
        
        var diff = 0;
        var x;
        
        for(var i = 0; i < pos.length-1; i++)
            {
                var x1 = parseInt(pos[i].x);
                var x2 = parseInt(pos[i+1].x);
                
                console.log('X', x1, x2);
                
                if( x2 - x1 > diff )
                    {
                        diff = x2 - x1;
                        x    = parseInt((x1+x2) / 2);
                        
                        console.log(diff, x);
                    }
            }

        console.log('EVADE', x);
        session.x(x+40);
    }