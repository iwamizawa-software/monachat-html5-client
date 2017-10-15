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
        
        
        this.attack    = false;
        this.attack_i  = 0;
        this.attack_id = 0;
        
        this.falseid   = [];
        
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
                        [n, c, id, name, ihash] = [attr.n, attr.c, attr.id, attr.name, attr.ihash];
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
                        
                        if(PID == 'MASTER')
                            {
                                if(slave_id.includes(id))
                                    {
                                        for(var i = 0; i < slave.length; i++)
                                            {
                                                if(slave[i].id == id)
                                                    {
                                                        slave[id].id = undefined;
                                                    }
                                            }
                                    }
                            }
                    }
                else if(xml.name == 'SET')
                    {
                        id = xml.attr.id;
                        
                        if(xml.attr.pid !== undefined)
                            {
                                if(PID != 'MASTER') { return; }
                                
                                var com = xml.attr.com;
                                
                                if(com == 'slaveid')
                                    {
                                        for(var i = 0; i < slave.length; i++)
                                            {
                                                if(slave[i].PID == xml.attr.pid)
                                                    {
                                                        if(slave[i].id === undefined)
                                                            {
                                                                slave[i]['id'] = xml.attr.id;
                                                            }
                                                    }
                                            }
                                    }
                                else
                                    {
                                        var index = valid_slave(pid, id);
                                        if(!index) { return; }
                                        
                                        if(com == 'kill')
                                            {
                                                slave.splice(index, 1);
                                            }
                                    }
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
        
        
        var cmt, line;
        var connected;
        var arg;
        
        
        com = com.split(' ');
        
        if(com[0] == '/kill')
            {
                for(var i = 0; i < slave.length; i++)
                    {
                        slave[i].kill();
                    }
                
                slave = [];
            }
        else if(com[0] == '/comment')
            {
                cmt  = com.slice(1);
                line = cmt.join(' ');
                
                send_slave('comment ' + line);
            }
        else if(com[0] == '/commentrand')
            {
                cmt  = com.slice(1);
                line = cmt.join(' ');
                
                //send_each_slave( () => setTimeout( 'comment ' + line, parseInt(Math.rand()*4000) );
                
                connected = slave.filter( (obj) => obj.connected );

                for(let i = 0; i < connected.length; i++)
                    {
                        setTimeout( () => connected[i].send( 'comment ' + cmt ), parseInt(Math.random()*4000) );
                    }
            }
        else if(com[0] == '/randx')
            {
                send_each_slave( () => 'x ' + parseInt( Math.random()*700 ) );
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
                var letters = com.slice(1).join(' ').split('');
                
                var i = 0;
                send_each_slave( () => letters[i] === undefined ? '' : 'comment ' + letters[i++] );
            }
        else if(com[0] == '/talk')
            {
                send_slave_with_id(com[1], 'comment ' + com.slice(2).join(' '));
            }
        else if(com[0] == '/talkrandom')
            {
                var index = parseInt(Math.random()*slave.length);
                send_slave_with_id( slave[index].id, 'comment ' + com.slice(1).join(' ') );
                
                send_each_slave( () => 'ifid ' + Object.keys(room) );
            }
        else if(com[0] == '/randrgb')
            {
                send_each_slave( function()
                    {
                        return 'rgb '
                            + parseInt(Math.random()*255) + ' '
                            + parseInt(Math.random()*255) + ' '
                            + parseInt(Math.random()*255);
                    });
            }
        else if(com[0] == '/copyall')
            {
                var keys = Object.keys(room);
                var i    = 0;
                
                connected = slave.filter( (obj) => obj.connected );
                
                for(var j = 0; j < connected.length; j++)
                    {
                        connected[j].send('copy ' + keys[i++ % keys.length]);
                    }
            }
        else if(com[0] == '/distribute')
            {
                if(Object.keys(main).length === 0) { return; }
                
                var rooms = Object.keys(main).filter( (key) => main[key] !== 0 );
                
                connected = slave.filter( (obj) => obj.connected );
                
                for(var i = 0; i < connected.length; i++)
                    {
                        line = 'room ' + rooms[i%rooms.length];
                        
                        connected[i].send('room ' + rooms[i % rooms.length]);
                    }
            }
        else if(com[0] == '/divide')
            {
                var coms = com.splice(1).join(' ').split('|').filter( (com) => com !== '' );

                connected = slave.filter( (obj) => obj.connected );

                for(var i = 0; i < connected.length; i++)
                    {
                        connected[i].send( coms[i%coms.length] );
                    }
            }
        else if(com[0] == '/rip')
            {
                this.rip = !this.rip;
            }
        else if(com[0] == '/listn')
            {
                for(var i = 0; i < slave.length; i++)
                    {
                        try { slave[i].send('stat ' + (i+1)); }
                        catch(err) { console.error(err); }
                    }
            }
        else if(com[0] == '/listid')
            {
                for(var i = 0; i < slave.length; i++)
                    {
                        try { slave[i].send('stat ' + slave[i].id); }
                        catch(err) { console.error(err); }
                    }
            }
        else if(com[0] == 'to')
            {
                send_slave_with_id(com[1], com.slice(2).join(' '));
            }
        else if(com[0][0] == '/')
            {
                [com, arg] = [ com[0].substr(1, com[0].length), com.slice(1) ];
                
                line = arg.length === 0
                    ? com
                    : com + ' ' + arg.join(' ');
                    
                send_slave(line);
            }
        else
            {
                return false;
            }
    }

function valid_slave(pid, id)
    {
        for(var i = 0; i < slave.length; i++)
            {
                if(slave.PID == pid && slave.id !== undefined && slave.id == id)
                    {
                        return [pid, id];
                    }
            }
        
        return false;
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
                
                if(user[that.attack_id] === undefined) { return; }
                
                if(this.attack_i === 0)
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