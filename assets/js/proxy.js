var fs       = require('fs');
var jsonfile = require('jsonfile');
var request  = require('request');
var xmldoc   = require('xmldoc');

var $        = require('jquery');


function Proxy()
    {
        return {
            list: { socks_proxy: [], socksproxylist24: [] },
            
            get: function(name)
                {
                    if     (name == 'socks_proxy')      { this.get_socks_proxy();      }
                    else if(name == 'socksproxylist24') { this.get_socksproxylist24(); }
                },
            get_all: function()
                {
                    this.get_socks_proxy();
                    this.get_socksproxylist24();
                },
            get_socks_proxy: function()
                {
                    var that = this;
                    
                    this.list.socks_proxy = [];
                    
                    var options =
                        {
                            method: 'GET',
                            url   : 'http://socks-proxy.net',
                        };
                    
                    request(options, function(err, b, data)
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
                                    that.list.socks_proxy.push
                                        ({
                                            'addr'   : list[i].children[0].val,
                                            'port'   : parseInt(list[i].children[1].val),
                                            'country': list[i].children[2].val,
                                            'version': parseInt(list[i].children[4].val.substr(-1))
                                        });
                                }
                        });
                },
            get_socksproxylist24: function()
                {
                    var that = this;
                    
                    this.list.socksproxylist24 = [];
                    
                    var options =
                        {
                            method: 'GET',
                            url   : 'http://socksproxylist24.blogspot.com'
                        };
                    
                    request(options, function(err, b, data)
                        {
                            options.url = data.match
                                (
                                    /(http:\/\/socksproxylist24\.blogspot\.com\.?\w*.+?-socks-proxy-list.+?\.html)/
                                )[1];
                            
                            request(options, function(err, b, data)
                                {
                                    var list = data.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{3,5}/g);
                                    
                                    for(var i = 0; i < list.length; i++)
                                        {
                                            that.list.socksproxylist24.push
                                                ({
                                                    'addr'   : list[i].match(/(.+):/)[1],
                                                    'port'   : list[i].match(/:(.+)/)[1],
                                                    'country': 'unknown',
                                                    'version': 5
                                                });
                                        }
                                });
                        });
                }
        };
    }

var proxy = new Proxy();
proxy.get_all();

setTimeout(() => console.log(proxy.list), 5000);