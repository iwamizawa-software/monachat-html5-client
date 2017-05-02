// nodejs tcp test

var net    = require('net');
var xmldoc = require('xmldoc');
var socks  = require('socks');


const ADDR = '153.122.46.192';

const SERVER_LIST =
    {
        'iriguchi'    : ["MONA8094",    9095],
        'atochi'      : ["ANIKI8080",   9092],
        'ooheya'      : ["MONABIG8093", 9093],
        'chibichato'  : ["ANIMAL8098",  9090],
        'moa'         : ["MOA8088",     9092],
        'chiikibetsu' : ["AREA8089",    9095],
        'wadaibetsu'  : ["ROOM8089",    9090],
        'tateyokoheya': ["MOXY8097",    9093],
        'cool'        : ["COOL8099",    9090],
        'kanpu'       : ["kanpu8000",   9094],
        'monafb'      : ["MOFB8000",    9090]
    };

const PROXY_SITES = 
    [
        'http://socks-proxy.net',
        'http://socksproxylist24.blogspot.com'
    ];


function Monachat(data, callback)
    {
        if(data == undefined) { data = {}; }
        
        
        this.client;
        this.ping_timer_id;
        
        this.callback = callback;
        
        
        this._id;
        this._ihash;
        
        this._name      = data.name      || '名無しさん';
        this._character = data.character || 'mona';
        this._stat      = data.stat      || '通常';
        this._trip      = data.trip      || '';
        this._r         = data.r         || 100;
        this._g         = data.g         || 100
        this._b         = data.b         || 100;
        this._x         = data.x         || 200;
        this._y         = data.y         || 400;
        this._scl       = data.scl       || 100;
        
        this._port   = data.port   || 9095;
        this._server = data.server || 'MONA8094';
        this._room   = data.room   || 100;
        
        this._timeout = data.timeout || 1;
        
        this._proxy      = data.proxy || 0;
        this._site       = data.site  || 1;
        this.proxy_list  = [];
        
        
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
        this.set_data  = set_data;
        
        this.room      = room;
        this.server    = server;
        
        this.proxy   = proxy;
        this.site    = site;
        this.timeout = timeout;
        
        
        this._enter_main = _enter_main;
        this._enter_room = _enter_room;
        this._exit_room  = _exit_room;
        this.reenter    = reenter;
        
        
        this.ignore       = ignore;
        this._send_stat    = _send_stat;
        this._send_x_y_scl = _send_x_y_scl;
        
        this.comment = comment;
        
        
        this.set_default = set_default;
        this.invisible   = invisible;
        this.nanashi     = nanashi;
        this.copy        = copy;
        this.random      = random;
        this.profile     = profile;
        
        
        this.signal_handler = signal_handler;
        
        
        this._ignored = [];
        
        this._default =
            {
                name     : this._name,
                character: this._character,
                stat     : this._stat,
                trip     : this._trip,
                r        : this._r,
                g        : this._g,
                b        : this._b,
                x        : this._x,
                y        : this._y,
                scl      : this._scl
            };
    }


module.exports = Monachat;


function parse_special_characters(line)
    {
        line = line.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
            

        return line;
    }


function connect()
    {
        this._proxy ? this.check_proxy_list() : this.connect_normal();
    }

function connect_normal()
    {
        var that = this;
        
        
        var options =
            {
                host: ADDR,
                port: this._port
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
                
                console.log('SOCKET: ', data);
                
                for(let i = 0; i < data.length; i++)
                    {
                        data[i] = data[i].match(/.*?(<.+>|\+connect id=\d+)/)[1];
                        
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
                
                /*
                console.log('Trying to reconnect...');
                
                setTimeout( () => that.connect(), that._timeout*1000);
                */
            });
    }

function disconnect()
    {
        this.client.end();
    }

function relogin()
    {
        this._exit_room();
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
        
        
        if(this._site == 1)
            {
                $.get(PROXY_SITES[0], function(data)
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
                $.get(PROXY_SITES[1], function(data)
                    {
                        var list_page = data.match(/(http:\/\/socksproxylist24\.blogspot\.com\.?\w*.+?-socks-proxy-list.+?\.html)/)[1];
                        
                        $.get(list_page, function(data)
                            {
                                var list = data.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{3,5}/g);
                                
                                for(var i = 0; i < list.length; i++)
                                    {
                                        that.proxy_list.push
                                            ({
                                                'addr'   : list[i].match(/(.+):/)[1],
                                                'port'   : list[i].match(/:(.+)/)[1],
                                                'version': 5
                                            });
                                    }
                                
                                
                                that.connect_proxy();
                            })
                    });
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
            + (this._trip == '' ? '' : ('trip="'   + this._trip      + '" '))
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
                this._room == 'main' ? this._enter_main() : this._enter_room();
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
                if(SERVER_LIST[server] == undefined)
                    {
                        return false;
                    }
                else
                    {
                        var [server_room, port] = SERVER_LIST[server];
                        
                        this._server = server_room;
                        this._port   = port;
                        
                        relogin();
                    }
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
                this._name = name.substr(-20);
                
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
                this._stat = stat.substr(-20);
                this._send_stat();
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

function set_data(data)
    {
        if(data == undefined)
            {
                var {name, id, ihash, trip, r, g, b, x, y, scl} = this;
                return [name, id, ihash, trip, r, g, b, x, y, scl];
            }
        else
            {
                this._name      = data.name;
                this._character = data.character;
                this._trip      = data.trip;
                this._r         = data.r;
                this._g         = data.g;
                this._b         = data.b;
                this._x         = data.x;
                this._y         = data.y;
                this._scl       = data.scl;
                
                session.reenter();
            }
    }

function _send_stat()
    {        
        this.client.write('<SET stat="'+this._stat+'" />\0');
    }

function _send_x_y_scl()
    {
        this.client.write('<SET x="'+this._x+'" scl="'+this._scl+'" y="'+this._y+'" />\0');
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

function ignore(ihash)
    {
        var stat;
        
        if(ignore[ihash] == undefined)
            {
                stat = 'on';
                ignore[ihash] = true;
            }
        else
            {
                stat = 'off';
                ignore[ihash] = undefined;
            }
        
        
        this.client.write('<IG ihash="'+ihash+'" stat="'+stat+'" />\0');
    }

function comment(cmt)
    {
        cmt = parse_special_characters( cmt.substr(-50) );
        console.log('comment', '<COM cmt="'+cmt+'" />\0');
        
        this.client.write('<COM cmt="' + cmt + '" />\0');
    }

function set_default()
    {
        var {name, character, stat, trip, r, g, b, x, y, scl} = this._default;
        
        this.set_data
            ({
                name     : name,
                character: character,
                stat     : stat,
                trip     : trip,
                r        : r,
                g        : g,
                b        : b,
                x        : x,
                y        : y,
                scl      : scl
            })
    }

function nanashi()
    {
        this.set_data
            ({
                name     : '名無しさん',
                character: 'mona',
                stat     : '通常',
                trip     : '',
                r        : 100,
                g        : 100,
                b        : 100,
                x        : parseInt(Math.random()*600),
                y        : parseInt(Math.random()*400),
                scl      : 100
            });
    }

function invisible()
    {
        this.set_data
            ({
                name     : '',
                character: '',
                stat     : '',
                trip     : '',
                r        : '',
                g        : '',
                b        : '',
                x        : '',
                y        : '',
                scl      : ''
            });
    }

function copy(data)
    {
        if(data == undefined)
            {
                return false;
            }
        else
            {
                this.set_data
                    ({
                        name     : data.name,
                        character: data.character,
                        stat     : data.stat,
                        trip     : data.trip,
                        r        : data.r,
                        g        : data.g,
                        b        : data.b,
                        x        : data.x,
                        y        : data.y,
                        scl      : data.scl
                    })
            }
    }

function random(country)
    {
        var that = this;
        
        if(country == undefined) { country = 'japan'; }
        
        
        /************
        * Character
        ************/
        var character_list =
            ('abogado agemona alice anamona aramaki asou bana batu boljoa boljoa3 boljoa4 '
            + 'charhan chichon chotto1 chotto2 chotto3 coc2 cock dokuo dokuo2 foppa fusa '
            + 'fuun gaku gakuri gari gerara giko ging ginu gyouza haa haka hat2 hati hati3 '
            + 'hati4 hikk hiyoko hokkyoku6 hosh ichi ichi2 ichineko iiajan iyou jien joruju '
            + 'joruju2 kabin kagami kamemona kappappa kasiwa kato kikko2 kita koit koya kunoichi '
            + 'kuromimi kyaku maji marumimi maturi mina miwa mona monaka mora mosamosa1 mosamosa2 '
            + 'mosamosa3 mosamosa4 mossari moudamepo mouk mouk1 mouk2 nanyo nezumi nida niku nin3 '
            + 'niraime niraime2 niramusume niraneko nyog oni oniini oomimi osa papi polygon ppa2 '
            + 'puru ranta remona riru ri_man sai sens shaitama shak shob shodai sii2 sika sira '
            + 'siranaiwa sugoi3 sumaso2 suwarifusa tahara tatigiko taxi tibifusa tibigiko tibisii '
            + 'tiraneyo tofu tokei tuu uma unknown2 unko urara usi wachoi welneco2 yamazaki1 '
            + 'yamazaki2 yokan zonu zuza').split(' ');
        
        var character = character_list[ parseInt(Math.random()*character_list.length) ];
        
        var trip = '';

        /*********
        * Status
        *********/
        var stat = '通常';
        
        /********
        * Color
        ********/
        var r = parseInt(Math.random()*100)+1;
        var g = parseInt(Math.random()*100)+1;
        var b = parseInt(Math.random()*100)+1;
    
        /***********
        * Position
        ***********/
        var x   = parseInt(Math.random()*600)+1;
        var y   = parseInt(Math.random()*400)+1;
        var scl = Math.random() < 0.5 ? 100 : -100;
        
        
        var sex = Math.random() > 0.5 ? 'male' : 'female';
        
        var url =
                'http://namegen.chobitool.com/?sex='
                + sex
                + '&country='
                + country
                + '&middlename=&middlename_cond=fukumu'
                + '&middlename_rarity=&middlename_rarity_cond=ika&lastname=&lastname_cond=fukumu&lastname_rarity='
                + '&lastname_rarity_cond=ika&lastname_type=name&firstname=&firstname_cond=fukumu&firstname_rarity='
                + '&firstname_rarity_cond=ika&firstname_type=name';
    
        console.log('Getting name (country:', country, ')...');
        
        $.get(url, function(data)
            {
                var name = '';
                
                if( country == 'japan' )
                    {
                        var match;
                        
                        var fullname = data.match(/<td class="name">\s+(.+?)\s+?<\/td>/)[1];
                        var kana     = data.match(/<td class="pron">(.+?)<\/td>/)[1];
                
                        match = fullname.match(/(.+?)\s+(.+)/);
                        var first = match[1];
                        var last = match[2];
                        
                        match = kana.match(/(.+?)\s+(.+)/);
                        var kanafirst = match[1];
                        var kanalast = match[2]
                
                        fullname.trim();
                        kana.trim();
                        //fullname.replace(/\s/g, '');
                        //kana.replace(/\s/g, '');

                        //Sort randomly
                        var rand = parseInt(Math.random()*10);
                        
                        name =
                            rand < 1 ? fullname  : // 10%
                            rand < 3 ? kana      : // 20%
                            rand < 4 ? first     : // 10%
                            rand < 5 ? last      : // 10%
                            rand < 7 ? kanafirst : // 20%
                                       kanalast;   // 30%

                        that.set_data
                            ({
                                name     : name.trim(),
                                character: character,
                                stat     : stat,
                                trip     : trip,
                                r        : r,
                                g        : g,
                                b        : b,
                                x        : x,
                                y        : y,
                                scl      : scl
                            });
                    }
                else
                    {
                        name = data.match(/<span class="name">\s+?<.+?>(.+?)<span class="middlename">(.+?)<\/span>(.+?)<\/a>/);
                        var first  = name[1];
                        var middle = name[2];
                        var last   = name[3];
                        
                        //Remove spaces
                        first.trim();//replace(/\s/g, '');
                        last.trim();//replace(/\s/g, '');
                        
                        //Sort randomly
                        name = Math.random() < 0.5 ? first : last;
                        name = Math.random() < 0.5 ? name  : name.toLowerCase();
                        
                        name = name.trim();
                        
                        if(Math.random() < 0.5)
                            {
                                //Set language code
                                var lngcode =
                                    country == 'america' ? 'en' :
                                    country == 'uk'      ? 'en' :
                                    country == 'canada'  ? 'en' :
                                    country == 'france'  ? 'fr' :
                                    country == 'germany' ? 'de' :
                                                           'en';
                                
                                //Get kana
                                var url =
                                    'https://translate.googleapis.com/translate_a/single?client=gtx&sl='
                                    + lngcode
                                    + '&tl=ja&dt=t&q='
                                    + name;
                                
                                $.get(url, function(data)
                                    {
                                        var kana = data[0][0][0];
                                        
                                        console.log('name: '+name+', kana: '+kana);
                                        
                                        that.set_data
                                            ({
                                                name     : kana,
                                                character: character,
                                                stat     : stat,
                                                trip     : trip,
                                                r        : r,
                                                g        : g,
                                                b        : b,
                                                x        : x,
                                                y        : y,
                                                scl      : scl
                                            });
                                    });
                            }
                        else
                            {
                                that.set_data
                                    ({
                                        name     : name.trim(),
                                        character: character,
                                        stat     : stat,
                                        trip     : trip,
                                        r        : r,
                                        g        : g,
                                        b        : b,
                                        x        : x,
                                        y        : y,
                                        scl      : scl
                                    });
                            }
                    }
            });
    }
function profile(data)
    {
        this.set_data(data);
    }