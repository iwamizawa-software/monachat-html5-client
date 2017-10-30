// generate quiz from jservice io

var jsonfile = require('jsonfile');
var request  = require('request');


function gen_random(n)
    {
        var json = [];
        
        var url = 'http://jservice.io'
            + '/api'
            + '/random'
            + '?count='
            + n;

        request(url, function(err, res, body)
            {
                body = JSON.parse(body);
                
                for(var key in body)
                    {
                        json.push(body[key]);
                    }
                    
                for(var key in json)
                    {
                        json[key].question.replace(/(<i>|<\/i>/g, '');
                        json[key].answer.replace(/(<i>|<\/i>/g, '');
                    }
                
                jsonfile.writeFileSync('jservice.json', json);
            });
    }

function gen_category(category, n)
    {
        var json = [];
        var url = 'http://jservice.io'
            + '/api'
            + '/random';
        
        get_data(json, url, 0, n);
    }

gen_random(100);