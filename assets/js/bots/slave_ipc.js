/***********
* Base bot
***********/

function Bot()
    {
        this.name = require('path').basename(__filename);
        
        this._on          = false;
        this._paused      = true;
        this._timeout     = 1;
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
        
        
        this.attack    = false;
        this.attack_i  = 0;
        this.attack_id = 0;
        
        this.rip    = false;
        this.rip_i  = 0;
        
        
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
        
        if(com[0] == '/kill')
            {
                for(var i = 0; i < slave.length; i++)
                    {
                        slave[i].kill();
                    }
            }
        else if(com[0] == '/comment')
            {
                var cmt  = com.splice(1);
                var line = cmt.join(' ');
                
                send_slave('comment ' + line);
            }
        else if(com[0] == '/randx')
            {
                send_each_slave( () => 'x ' + parseInt( Math.random()*700 ) )
            }
        else if(com[0] == '/attack')
            {
                this.attack_id = com[1];
                this.attack = !this.attack;
            }
        else if(com[0] == '/line')
            {
                var i = 0;
                send_each_slave( () => 'x ' + (++i*40) );
            }
        else if(com[0] == '/letter')
            {
                var letters = com[1].split('');
                
                var i = 0;
                send_each_slave( () => letters[i+1] == undefined ? '' : 'comment ' + letters[i++] );
            }
        else if(com[0] == '/rip')
            {
                this.rip = !this.rip;
            }
        else if(com[0][0] == '/')
            {
                var [com, arg] = [ com[0].substr(1, com[0].length), com.slice(1) ];
                
                var line = arg.length == 0
                    ? com
                    : com + ' ' + arg.join(' ');
                    
                send_slave(line);
            }
        else
            {
                return false;
            }
    }

function repeat()
    {
        if(!this._on || this._paused) { return; }
        
        if(this.rip)
            {
                if(this.rip_i < 8)
                    {
                        send_each_slave( () => 'x ' + parseInt(Math.random()*700) );
                        send_each_slave( () => 'enqueuecomment ' + 'あいうえおあいうえおあいうえおあいうえおあいうえおあいうえおあいうえおあいうえお' );
                    }
                else if(this.rip_i == 8)
                    {
                        send_each_slave( () => 'reenter' );
                    }
                else if(this.rip_i == 10)
                    {
                        this.rip_i = 0;
                    }
                
                
                this.rip_i++;
            }
        else if(this.attack)
            {
                var that = this;
                
                if(user[that.attack_id] == undefined) { return; }
                
                if(this.attack_i == 0)
                    {
                        send_each_slave( function()
                            {
                                var x = parseInt(user[that.attack_id].x);
                                
                                x += parseInt(Math.random()*100) * (Math.random() > 0.5 ? 1 : -1);
                                
                                return 'x ' + x.toString();
                            });
                        
                        this.attack_i = 1;
                    }
                else
                    {
                        send_each_slave( function()
                            {
                                var phrases = ['やあ！', 'えい！', 'それ！', '殺せー！'];
                                
                                return 'comment ' + phrases[ parseInt(Math.random() * phrases.length) ];
                            });
                        
                        this.attack_i = 0;
                    }
            }
    }