function bot(msg)
    {
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
                        var id = xml.attr.id;
                    }
                else if(xml.name == 'UINFO')
                    {
                        var {n, c, id, ihash, name} = xml.attr;
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
                        var id = xml.attr.id;
                        
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
                        
                        if(id != session.id())
                            {
                                //var line = eval(cmt).toString();
                                //session.comment(line);
                                var arr = ['あ', 'い', 'う', 'え', 'お', '＞ｐ＜負けた'];
                                console.log(arr, arr.indexOf(cmt));
                                if(arr.includes(cmt))
                                    {
                                        session.comment( arr[arr.indexOf(cmt)+1 % 6] );
                                    }
                                else if(cmt == "-random")
                                    {
                                        session.comment( Math.random().toString() )
                                    }
                                else
                                    {
                                        /*
                                        var a = ['貴方の', 'わたしの', '彼氏の', 'むきゅうの'];
                                        var b = ['家が', '股が', '鼻が', 'ちんちんが', '禿が'];
                                        var c = ['薄い', 'でかい', 'すごーい♡', 'うーん', '小さい？'];
                                        
                                        var line = a[parseInt(Math.random()*a.length)]
                                            + b[parseInt(Math.random()*b.length)]
                                            + c[arseInt(Math.random()*c.length)];
                                        
                                        session.comment(line);
                                        */
                                    }
                            }
                    }
                else
                    {
                    }
            }
    }

module.exports = bot;