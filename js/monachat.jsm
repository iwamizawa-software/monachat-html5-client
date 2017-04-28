// nodejs tcp test

var net    = require('net');
var xmldoc = require('xmldoc');
var socks  = require('socks');


const ADDR = '153.122.46.192';


function Monachat(callback, data)
    {
        if(data == undefined) { data = {}; }
        
        
        this.client;
        this.ping_timer_id;
        
        this.callback = callback;
        
        
        this._id;
        this._ihash;
        
        this._name      = data.name      || 'Wednesday';
        this._character = data.character || 'chotto1';
        this._stat      = data.stat      || 'normal';
        this._trip      = data.trip      || '';
        this._r         = data.r         || '100';
        this._g         = data.g         || '100';
        this._b         = data.b         || '100';
        this._x         = data.x         || '200';
        this._y         = data.y         || '400';
        this._scl       = data.scl       || '100';
        
        this._attrib = data.attrib || 'no';
        this._port   = data.port   || '9095';
        this._server = data.server || 'MONA8094';
        this._room   = data.room   || '100';
        
        this._timeout = data.timeout || 1;
        
        this._proxy      = 0;
        this._site       = 1;
        this.proxy_list = [];
        
        
        this.connect             = connect.bind(this);
        this.connect_normal      = connect_normal.bind(this);
        this.connect_proxy       = connect_proxy.bind(this);
        this.disconnect          = disconnect;
        this.relogin             = relogin;
        this.set_client_events   = set_client_events;
        this.ping                = ping.bind(this);
        this.check_proxy_list    = check_proxy_list;
        this.download_proxy_list = download_proxy_list.bind(this);
        
        this.name      = name;
        this.id        = id;
        this.character = character;
        this.stat      = stat;
        this.trip      = trip;
        this.r         = r;
        this.g         = g;
        this.b         = b;
        this.rgb       = rgb;
        this.x         = x;
        this.y         = y;
        this.scl       = scl;
        this.x_y_scl   = x_y_scl;
        
        this.room      = room;
        this.server    = server;
        
        this.proxy   = proxy;
        this.site    = site;
        this.timeout = timeout;
        
        
        this._enter_main = _enter_main;
        this._enter_room = _enter_room;
        this._exit_room  = _exit_room;
        this.reenter    = reenter;
        
        
        this._send_stat    = _send_stat;
        this._send_x_y_scl = _send_x_y_scl;
        
        this.comment = comment;
        
        
        this.signal_handler = signal_handler;
    }


module.exports = Monachat;



function connect()
    {
        this._proxy ? this.check_proxy_list() : this.connect_normal();
    }

function connect_normal()
    {
        var that = this;
        
        console.log(this);
        
        var options =
            {
                host: ADDR,
                port: this._port,
                //localAddress: '127.0.0.1',
                //localPort: 1000
            }
        
        this.client = net.connect( options, function()
            {
                console.log('Connected to server.');
                
                that.client.setEncoding('utf8');
                
                /******************
                * Send login data
                ******************/
                that.client.write('MojaChat\0');
                that._enter_room();
                
                /****************
                * Set ping loop
                ****************/
                that.ping_timer_id = setInterval( () => that.ping(), 20000 );
                
                /******************************
                * Set socket listening events
                ******************************/
                that.set_client_events();
            });
    }

function check_proxy_list()
    {
        if(this.proxy_list.length == 0)
            {
                this.download_proxy_list();
            }
        else
            {
                this.connect_proxy();
            }
    }

function connect_proxy()
    {
        var that = this;
        
        
        var proxy = this.proxy_list.shift();
        
        var options =
            {
                proxy:
                    {
                        ipaddress: proxy.addr,
                        port     : proxy.port,
                        type     : proxy.version
                    },
                target:
                    {
                        host: ADDR,
                        port: this._port
                    },
                timeout: this._timeout*1000
            };
        
        
        socks.createConnection(options, function(err, socket, info)
            {
                console.log('Trying: ', proxy.addr + ':' + proxy.port);
                
                if(err)
                    {
                        console.log('Error connecting to proxy: ', err)
                        
                        that.check_proxy_list();
                    }
                else
                    {
                        console.log('Proxy connected.');
                        
                        that.client = socket;
                        
                        that.client.setEncoding('utf8');
                        
                        /******************
                        * Send login data
                        ******************/
                        that.client.write('MojaChat\0');
                        that._enter_room();
                        
                        /****************
                        * Set ping loop
                        ****************/
                        that.ping_timer_id = setInterval( () => that.ping(), 20000 );
                        
                        /******************************************
                        * Socket is deactivated previous this call
                        ******************************************/
                        that.client.resume();
                        
                        /******************************
                        * Set socket listening events
                        ******************************/
                        that.set_client_events();
                    }
            });
    }

function set_client_events()
    {
        var that = this;
        
        this.client.on('data', function(data)
            {
                data = data.split('\0')
                    .filter( (msg) => msg != '' );
                
                //console.log(data);
                
                for(var i = 0; i < data.length; i++)
                    {
                        that.callback(data[i]);
                    }
            });

        this.client.on('error', function(err)
            {
                console.log('Error:',err);
                /*
                that.disconnect();
                
                clearInterval(that.ping_timer_id);
                
                console.log('Trying to reconnect...');
                
                setTimeout( () => connect(that), that._timeout*1000);
                */
            });

        this.client.on('end', function()
            {
                console.log('Disconnected from server.');
                clearInterval(that.ping_timer_id);
                
                console.log('Trying to reconnect...');
                
                //setTimeout( () => that.connect(), that._timeout*1000);
            });
    }

function disconnect()
    {
        this.client.end();
    }

function relogin()
    {
        this.disconnect();
        
        this._proxy ? this.check_proxy_list() : this.connect();
    }

function ping()
    {
        console.log('ping');
        
        this.client.write('<NOP />\0');
    }

function download_proxy_list()
    {
        var that = this;
        
        
        var sites = 
            [
                'http://socks-proxy.net',
                'http://socksproxylist24.blogspot.com'
            ];
        
        if(this._site == 1)
            {
                $.get(sites[0], function(data)
                    {
                        /*********************
                        * Search proxy table
                        *********************/
                        var table = data.replace(/\n/g, '')
                            .match(/(<table.+?id="proxylisttable">.+?<\/table>)/);

                        /*******************
                        * Parse proxy table
                        *******************/
                        var xml  = new xmldoc.XmlDocument(table);
                        var list = xml.children[1].children;
                        
                        for(var i = 0; i < list.length; i++)
                            {
                                that.proxy_list.push
                                    ({
                                        'addr'   : list[i].children[0].val,
                                        'port'   : parseInt(list[i].children[1].val),
                                        'country': list[i].children[2].val,
                                        'version': parseInt(list[i].children[4].val.substr(-1))
                                    });
                            }
                        
                        
                        that.connect_proxy();
                    });
            }
        else if(this._site == 2)
            {
                $.get(sites[1], (data) => console.log(data));
            }
    }

function _enter_main()
    {
        this.client.write('<ENTER room="' + this._server + '" attrib="no" />\0');
    }    

function _enter_room()
    {
        var msg =
            '<ENTER '
            + 'room="' + this._server + '/' + this._room + '" '
            + 'umax="0" '
            + 'type="'   + this._character + '" '
            + 'name="'   + this._name      + '" '
            + 'x="'      + this._x         + '" '
            + 'trip="'   + this._trip      + '" '
            + 'attrib="yes" '
            + 'y="'      + this._y         + '" '
            + 'r="'      + this._r         + '" '
            + 'g="'      + this._g         + '" '
            + 'b="'      + this._b         + '" '
            + 'scl="'    + this._scl       + '" '
            + 'stat="'   + this._stat      + '" '
            + '/>\0';

        
        this.client.write(msg);
    }

function _exit_room()
    {
        this.client.write('<EXIT no="' + this._id + '" />\0');
    }

function room(room)
    {
        if(room == undefined)
            {
                return this._room;
            }
        else
            {
                this._room = room;
                
                this._exit_room();
                this._room == 'main' ? this.enter_main() : this._enter_room();
            }
    }

function server(server)
    {
        if(server == undefined)
            {
                return this._server;
            }
        else
            {
                this._server = server;
                relogin();
            }
    }

function reenter()
    {
        this._exit_room();
        
        this._room == 'main' ? this._enter_main() : this._enter_room();
    }

function name(name)
    {
        if(name == undefined)
            {
                return this._name;
            }
        else
            {
                this._name = name;
                
                this.reenter();
            }
    }

function id(id)
    {
        if(id == undefined)
            {
                return this._id;
            }
        else
            {
                this._id = id;
            }
    }

function character(character)
    {
        if(character == undefined)
            {
                return this._character;
            }
        else
            {
                this._character = character;
                this.reenter();
            }
    }

function stat(stat)
    {
        if(stat == undefined)
            {
                return this._stat;
            }
        else
            {
                this._stat = stat;
                this._send_stat(stat);
            }
    }

function trip(trip)
    {
        if(trip == undefined)
            {
                return this._trip;
            }
        else
            {
                this._trip = trip;
                this.reenter();
            }
    }

function r(r)
    {
        if(r == undefined)
            {
                return this._r;
            }
        else
            {
                this._r = r;
                this.reenter();
            }
    }

function g(g)
    {
        if(g == undefined)
            {
                return this._g;
            }
        else
            {
                this._g = g;
                this.reenter();
            }
    }

function b(b)
    {
        if(b == undefined)
            {
                return this._b;
            }
        else
            {
                this._b = b;
                this.reenter();
            }
    }

function rgb(r, g, b)
    {
        if(r == undefined)
            {
                return [this._r, this._g, this._b];
            }
        else
            {
                this._r = r;
                this._g = g;
                this._b = b;
                
                this.reenter();
            }
    }

function x(x)
    {
        if(x == undefined)
            {
                return this._x;
            }
        else
            {
                this._x = x;
                this._send_x_y_scl();
            }
    }

function y(y)
    {
        if(y == undefined)
            {
                return this._y;
            }
        else
            {
                this._y = y;
                this._send_x_y_scl();
            }
    }



function scl()
    {
        if(scl == undefined)
            {
                return this._scl;
            }
        else
            {
                this._scl = this._scl == 100 ? -100 : 100;
        
                this._send_x_y_scl();
            }
    }

function x_y_scl(x, y, scl)
    {
        if(arguments.length != 3)
            {
                return [this._x, this._y, this._scl];
            }
        else
            {
                this._x   = x;
                this._y   = y;
                this._scl = scl;
                
                this._send_x_y_scl();
            }
    }

function _send_stat(stat)
    {
        this.client.write('<SET stat="'+stat+'" />\0');
    }

function _send_x_y_scl()
    {
        this.client.write('<SET x="'+this._x+'" scl="'+this._scl+'" y="'+this._y+'"/>\0');
    }

function proxy()
    {
        this._proxy = !this._proxy;
        
        this.relogin();
    }

function site(n)
    {
        if(n == undefined)
            {
                return this._site;
            }
        else
            {
                this._site = n;
            }    
    }

function timeout(timeout)
    {
        if(timeout == undefined)
            {
                return this._timeout;
            }
        else
            {
                this._timeout = timeout;
            }
    }

function comment(cmt)
    {
        cmt = cmt.substr(-50);
        
        this.client.write('<COM cmt="' + cmt + '" />\0');
    }