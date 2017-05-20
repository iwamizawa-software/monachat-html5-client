// log window

const {ipcRenderer} = require('electron');
const {shell}       = require('electron');


var log_window = { log: '' };


function open_with_browser(e, url)
    {
        e.preventDefault()
        
        shell.openExternal(url);
    }


ipcRenderer.on('append_log', function(e, el_arr)
    {
        console.log(el_arr);
        
        var div_el = $(document.createElement('DIV'))
            .attr('class', 'log_div_el')
            .css('padding-top', 4)[0];

        for(let i = 0; i < el_arr.length; i++)
            {
                let el = $(el_arr[i])[0];
                
                if(el.tagName == 'TEXT')
                    {
                    }
                else if(el.tagName == 'A')
                    {
                        $(el).on('click', (e) => open_with_browser(e, el.href));
                    }
                else if(el.tagName == 'IFRAME')
                    {
                        
                    }
                else if(el.tagName == 'IMG')
                    {
                        $(el).on('click', (e) => open_with_browser(e, el.src));
                    }

                
                $(div_el).append(el);
            }
        
        
        var is_buttom =
            log_window.log[0].scrollHeight - log_window.log[0].clientHeight <= log_window.log[0].scrollTop + 1;
        
        log_window.log.append(div_el);
        
        /**********************************
        * Scroll automatically to the end
        **********************************/
        if(is_buttom) { log_window.log[0].scrollTop = log_window.log[0].scrollHeight; }
    });

window.onload = function()
    {
        log_window['log'] = $('#log_window_log');
    }