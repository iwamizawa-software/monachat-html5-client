/***********
* Base bot
***********/

console.log('LOADED');

function Bot()
    {
        this.name = require('path').basename(__filename);
        
        this._on          = false;
        this._paused      = true;
        this._timeout     = 5;
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
        
        
        this.ask_question    = ask_question;
        this.next_question   = next_question;
        this.get_points      = get_points;
        this.announce_winner = announce_winner;
        this.time_over       = time_over;
        this.end             = end;
        this.timeout         = timeout;
        this.interval        = interval;
        this.clear_timers    = clear_timers;
        
        this.file     = jsonfile.readFileSync('./assets/js/bots/quiz/quiz.json');
        this.points   = {};
        this.question = '';
        this.answer   = '';
        this.waiting  = false;
        
        this.timeout_id  = [];
        this.interval_id = [];
    }

module.exports = new Bot();


function signal_handler(msg)
    {
        if(!this._on || !this.waiting || this.answer == '') { return; }
        
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
                        let {id, cmt} = xml.attr;
                        
                        if(this.waiting)
                            {
                                if(cmt.match(this.answer))
                                    {
                                        this.announce_winner(id);
                                    }
                            }
                    }
            }
    }

function command_handler(com)
    {
        if(!this._on) { return; }
        
        com = com.split(' ');
        
        if(com[0] == 'quiz')
            {
                if(com[1] == undefined) { return; }
                
                
                var questions = [];
                for(var i = 0; i < com[1]; i++)
                    {
                        questions.push( this.file[ parseInt(Math.random()*this.file.length) ] );
                    }
                
                this.quiz = questions;
                
                this.waiting = true;
                this.next_question([]);
            }
        else if(com[0] == 'load')
            {
                this.file = jsonfile.readFileSync('./../../quiz/'+com[1]+'.json');
            }
        else if(com[0] == 'stopquiz')
            {
                session.stat('通常');
                
                this.clear_timers();
                session._comment_queue = [];
                
                this.waiting = false;
            }
        else if(com[0] == 'nextquestion')
            {
                this.next_question(['答えは「'+this.answer.source+'」でした～']);
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

function ask_question()
    {
        var that = this;
        
        
        var rand = parseInt(Math.random()*this.quiz.length);
        
        /********************************************
        * Get question and remove it from the array
        ********************************************/
        this.question = this.quiz[rand];
        this.quiz.splice(rand, 1);
        
        this.answer = new RegExp(this.question.answer, 'i');
        
        
        /*********************************
        * Ask it and wait for the answer
        *********************************/
        session.enqueue_comment( this.question.question );
        
        log([ log_time_el(), log_text_el('Answer: ' + this.answer.source, 0, 255, 0) ]);
        
        
        /*************
        * Set timers
        *************/
        this.interval(that.question.question, 30);
        this.timeout('後３０秒だよ～', 60);
        
        this.timeout_id.push( setTimeout( () => that.time_over(), 90*1000 ) );
    }

function next_question(cmt)
    {
        this.clear_timers();
        
        console.log('NEXT QUESTION', cmt);
        
        session._comment_queue = [];
        
        if(this.quiz.length > 0)
            {
                for(var i = 0; i < cmt.length; i++)
                    {
                        session.enqueue_comment(cmt[i]);
                    }
                
                session.stat('＠'+this.quiz.length+'問');
                
                this.ask_question();
            }
        
        else
            {
                this.end();
            }
    }

function announce_winner(id)
    {
        this.points[id] = this.points[id] == undefined ? 1 : this.points[id] + 1;
        
        var cmt =
            [
                user[id].name + '正解～',
                'おめでとう～',
                '今のところの結果:'
            ];
        
        
        var points = this.get_points();
        for(var i = 0; i < points.length; i++) { cmt.push(points[i]); }
        
        cmt.push('次行きますね～');
        
        
        this.next_question(cmt);
    }

function time_over()
    {
        var cmt =
            [
                '終了～',
                '答えは「'+this.answer.source+'」でした～'
            ];
        
        this.next_question(cmt);
    }

function end()
    {
        session.stat('終了～');
        
        var cmt =
            [
                'はい終了～',
                '終了終了終了～',
                'ジ・エンド！',
                'さて、結果はどうなったかな？'
            ];
        
        for(var i = 0; i < cmt.length; i++) { session.enqueue_comment(cmt[i]); }
        
        
        var points = this.get_points();
        for(var i = 0; i < points.length; i++) { session.enqueue_comment(points[i]) }
        
        
        var winner_id     = 0;
        var winner_points = 0;
        for(var id in this.points)
            {
                if(this.points[id] > winner_points)
                    {
                        winner_id     = id;
                        winner_points = this.points[id];
                    }
            }
        
        
        var line = user[winner_id].name+'の勝利です～おめでとうございますちゅっちゅ';
        session.enqueue_comment(line);
    }

function get_points()
    {
        var line = '';
        var sorted = [];
        
        for(var id in this.points) { sorted.push(id); }
        sorted.sort( (id1, id2) => this.points[id2] - this.points[id1] );
        
        var cmt  = [];
        var line = '';
        
        for(var i = 0; i < sorted.length; i++)
            {
                var user_points = user[ sorted[i] ].name+': '+this.points[ sorted[i] ]+'点    ';
                
                if(line.length + user_points.length > 50)
                    {
                        cmt.push(line.trim());
                        line = user_points;
                    }
                else
                    {
                        line += user_points;
                    }
            }
        
        cmt.push(line.trim());
        
        return cmt;
    }

function clear_timers()
    {
        for(var i = 0; i < this.timeout_id.length; i++)
            {
                clearTimeout(this.timeout_id[i]);
            }
        for(var i = 0; i < this.interval_id.length; i++)
            {
                clearInterval(this.interval_id[i]);
            }

        this.timeout_id  = [];
        this.interval_id = [];
    }

function interval(str, s) { this.interval_id.push( setInterval( () => session.enqueue_comment(str), s*1000) ); }
function timeout(str, s)  { this.timeout_id.push ( setTimeout ( () => session.enqueue_comment(str), s*1000) ); }