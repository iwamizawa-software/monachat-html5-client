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
        
        if(com[0] == 'weather')
            {
                var city   = com.slice(1).join(' ');
                var apikey = '62261a49d1a79b9462e1372237e1a75b';
                
                var url = 'http://api.openweathermap.org/data/2.5/weather?'
                    + 'q='      + city
                    + '&units=' + 'metric'
                    + '&appid=' + apikey;
                
                console.log(url);
                
                $.ajax
                    ({
                        method: 'GET',
                        url: url,
                        
                        success: function(json, data, xhr)
                            {
                                console.log(json);
                                
                                var date_sunrise = new Date(0);
                                var date_sunset  = new Date(0);
                                
                                date_sunrise.setUTCSeconds(json.sys.sunrise);
                                date_sunset.setUTCSeconds(json.sys.sunset);
                                
                                var sunrise = date_sunrise.toLocaleTimeString();
                                var sunset  = date_sunset.toLocaleTimeString();
                                
                                
                                var cmt =
                                    [
                                        json.name
                                            + ','
                                            + json.sys.country,
                                        
                                        '日出: '
                                            + sunrise,
                                        
                                        '日没: '
                                            + sunset,
                                        
                                        '気温: '
                                            + json.main.temp
                                            + 'ºＣ',
                                        
                                        '最大気温: '
                                            + json.main.temp_max
                                            + 'ºＣ',
                                        
                                        '最小気温: '
                                            + json.main.temp_min
                                            + 'ºＣ',
                                        
                                        '湿度: '
                                            + json.main.humidity
                                            + '％'
                                    ];
                                
                                for(var i = 0; i < cmt.length; i++) { session.enqueue_comment(cmt[i]); }
                            },
                        error: function(err)
                            {
                                console.error('Error:', err);
                            }
                    });
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