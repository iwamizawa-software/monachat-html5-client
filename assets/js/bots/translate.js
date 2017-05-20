/***********
* Base bot
***********/

function Bot()
    {
        this.name    = require('path').basename(__filename);
        
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
        
        this.trans_com   = false;
        this.trans_from  = 'ja';
        this.trans_to    = 'en';
        
        
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
                        
                        if(id != session.id() && this.trans_com)
                            {
                                translate(this.trans_from, this.trans_to, cmt, true);
                            }
                    }
            }
    }

function command_handler(com)
    {
        if(!this._on) { return; }
        
        com = com.split(' ');
                
        if(com[0] == 'transto')
            {
                translate('ja', com[1], com[2], false);
            }
        else if(com[0] == 'transfrom')
            {
                translate(com[1], 'ja', com[2], false);
            }
        else if(com[0] == 'transcom')
            {
                if(com[1] == undefined) { this.trans_com = false; }
                
                else
                    {
                        this.trans_com  = true;
                        
                        this.trans_from = com[1];
                        this.trans_to   = com[2];
                    }
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

function translate(from_lng, to_lng, text, comment)
    {
        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='
            + from_lng
            + '&tl='
            + to_lng
            + '&dt=t&q='
            + text;
            
            console.log(arguments, url);

        $.get(url, function(data)
            {
                console.log(data);
                
                if(!data[0]) { return; }
                
                if(comment)
                    {
                        session.enqueue_comment(data[0][0][0]);
                    }
                else
                    {
                        var text_el = log_text_el
                            (
                                data[0][0][1]
                                + ' ('
                                + from_lng
                                + ' -> '
                                + ' +): '
                                + data[0][0][0],
                                
                                0, 100, 0
                            );
                        
                        var time    = new Date().toLocaleTimeString();
                        var time_el = log_text_el('['+time+'] ');
                        
                        log([time_el, text_el]);
                    }
            });
    }