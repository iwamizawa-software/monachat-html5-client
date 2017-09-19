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
        
        /*********************************
        * Accepted syntax:
        *   Range: 1-10
        *   Top  : 10
        *   List : 1 2 3 4 5 6 7 8 9 10
        *********************************/
        if(com[0] == 'dice')
            {
                var arg　    = com[1];
                var entries = [];
                
                if(arg == '0')
                    {
                        session.enqueue_comment('サイコロ（'+entries.length+'面）を投げます');
                        session.enqueue_comment('そうしようとすると、あれ・・・？投げるサイコロがありませんよ？');
                        
                        return;
                    }
                else if(com.length > 2)
                    {
                        entries = com.slice(1);
                        
                        session.enqueue_comment('エントリー: ' + entries.join(' '));
                        session.enqueue_comment('クルックル・・・クルックル・・・クルックル・・・パッ');
                    }
                else if(arg.includes('-'))
                    {
                        var [undefined, a, b] = arg.match(/(\d+)-(\d+)/);
                        for(var i = parseInt(a); i <= b; i++) { entries.push(i); }
                        
                        session.enqueue_comment('サイコロ（'+entries.length+'面 (範囲: ' + a + '-' + b + ')）を投げます')
                        session.enqueue_comment('コロッコロッコロッコロ・・・パ');
                    }
                else if(Number.isInteger(parseInt(arg)))
                    {
                        var [a, b] = [1, parseInt(arg)];
                        for(var i = a; i <= b; i++) { entries.push(i); }
                        
                        session.enqueue_comment('サイコロ（'+entries.length+'面）を投げます');
                        session.enqueue_comment('コロッコロッコロッコロ・・・パ');
                    }
                else
                    {
                        return;
                    }
                
                var res = entries[ parseInt(Math.random() * entries.length) ];
                session.enqueue_comment(res + 'です');
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