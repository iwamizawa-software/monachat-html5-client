//ver 2.1
var origLog = global.log;
global.log = function (type, el) {
  if (type === 'error') {
    if (!el || !(el[0] === 'Unknown message' || typeof el === 'string'))
      format_log(type, el);
  } else {
    origLog.apply(this, arguments);
  }
};

var getName = function (id) {
  var info = user[id];
  return (info ? (
    (info.name || '') +
    '◇' + (info.ihash || '....不明').substr(4) +
    (info.trip ? '◆' + info.trip : '')
  ) : '不明') + ' (ID:' + id + ')';
};

var DirectMessage = function () {
  var keyList = {};
  var self = this;
  var genAESKey = function (id) {
    var key = keyList[id];
    crypto.subtle.deriveBits({ name : 'ECDH', namedCurve : 'P-256', public: key.remotePublicKey }, key.privateKey, 128)
    .then(function (bits) {
      return crypto.subtle.digest({ name : 'SHA-256' }, bits);
    }).then(function (digest) {
      keyList[id] = { shareIV : new Uint8Array(digest.slice(16, 19)) };
      return crypto.subtle.importKey('raw', digest.slice(0, 16), { name : 'AES-GCM', length : 128 }, false, ['encrypt', 'decrypt']);
    }).then(function (key) {
      keyList[id].key = key;
    });
  };
  this.genPubKey = function (id, callback) {
    if (keyList[id] && keyList[id].key)
      return;
    crypto.subtle.generateKey({ name : 'ECDH', namedCurve : 'P-256' }, false, ['deriveKey', 'deriveBits'])
    .then(function (key) {
      if (keyList[id] && keyList[id].remotePublicKey) {
        keyList[id].privateKey = key.privateKey;
        genAESKey(id);
      } else {
        keyList[id] = { privateKey : key.privateKey };
      }
      return crypto.subtle.exportKey('jwk', key.publicKey);
    }).then(callback);
  };
  this.acceptPubKey = function (id, jwk, callback) {
    if (keyList[id] && keyList[id].key)
      return;
    crypto.subtle.importKey('jwk', jwk, { name : 'ECDH', namedCurve : 'P-256' }, false, [])
    .then(function (key) {
      if (keyList[id] && keyList[id].privateKey) {
        keyList[id].remotePublicKey = key;
        genAESKey(id);
      } else {
        keyList[id] = { remotePublicKey : key };
        self.genPubKey(id, callback);
      }
    });
  };
  this.ready = function () {
    var list = [];
    for (var id in keyList)
      if (keyList[id].key)
        list.push(getName(id));
    return list.join(', ');
  };
  this.getKey = function (id) {
    return keyList[id];
  };
  this.remove = function (id) {
    delete keyList[id];
  };
};

var arrayToBase64 = function (array) {
  return btoa(String.fromCharCode.apply(String, array));
};

var base64ToArray = function (base64) {
  return new Uint8Array([].map.call(atob(base64), function (c) { return c.charCodeAt(0);}));
};

var arrayToStr = function (array) {
  return String.fromCharCode.apply(String, array);
};

var strToArray = function (str) {
  return [].map.call(str, function (c) { return c.charCodeAt(0);});
};

DirectMessage.prototype.encrypt = function (id, msg, callback) {
  var key = this.getKey(id);
  if (!key)
    return false;
  var iv = crypto.getRandomValues(new Uint8Array(12));
  for (var i = 0; i < key.shareIV.length; ++i)
    iv[i] = key.shareIV[i];
  crypto.subtle.encrypt({ name: 'AES-GCM', iv : iv, tagLength : 128 }, key.key, new Uint16Array(strToArray(msg))).then(function (data) {
    callback(arrayToBase64(iv.slice(3, 12)) + arrayToBase64(new Uint8Array(data)));
  }, function (err) {
    log(session.id(), '暗号化エラー:' + err);
    console.log(err);
  });
  return true;
};

DirectMessage.prototype.decrypt = function (id, msg, callback) {
  var key = this.getKey(id);
  if (!key)
    return false;
  crypto.subtle.decrypt({ name : 'AES-GCM', iv : base64ToArray(arrayToBase64(key.shareIV) + msg.substr(0, 12)), tagLength : 128 }, key.key, base64ToArray(msg.substr(12))).then(function (data) {
    callback(arrayToStr(new Uint16Array(data)));
  }, function (err) {
    log(session.id(), '復号エラー:' + err);
    console.log(err);
  });
  return true;
};

var dm, entered;

var sendXML = function (name, attr) {
  if (!entered)
    return;
  var list = [];
  for (var i in attr)
    list.push(' ' + i + '="' + ('' + attr[i]).replace(/[<>&"']/g, function (s) { return '&#' + s.charCodeAt(0) + ';'}) + '"');
  session.send('<' + name + list.join('') + '/>\0');
};

var log = function (id, msg) {
  format_log('com', [id, '' + msg]);
};

var on = function () {
  dm = new DirectMessage();
  if (session && session.room() !== 'main')
    sendXML('RSET', { req : 1});
};

var off = function () {
  dm = null;
  if (session && session.room() !== 'main')
    sendXML('RSET', { req : 0});
};

module.exports = {
  name : require('path').basename(__filename),
  _on : false,
  _paused : true,
  pause : function () {
    if (this._paused)
      return;
    this._paused = true;
    off();
  },
  resume : function () {
    if (this._paused) {
      this._paused = false;
      on();
    }
  },
  on : function () { this._on = true; this.resume();},
  off : function () { this._on = false; this.pause();},
  toggle : function () { this[this._on ? 'off' : 'on']();},
  is_on : function () { return this._on;},
  is_paused : function () { return this._paused;},
  timeout : function () {},
  repeat : function () {},
  command_handler : function (com) {
    if(!this._on)
      return;
    var com = com.split(/\s+/);
    if (com[0] === 'dm') {
      if (com.length > 2 && com[2].length && dm.getKey(com[1])) {
        dm.encrypt(com[1], com.slice(2).join(' ').substr(0, 50), function (msg) { sendXML('RSET', {msg : msg, target : com[1]});});
        setTimeout(function () {
          (document.getElementById('room_text_input') || {}).value = '/dm ' + com[1] + ' ';
        }, 0);
      } else {
        log(session.id(), 'DM可能一覧:' + dm.ready());
      }
      return;
    }
    return false;
  },
  signal_handler : function (msg) {
    if (!this._on || msg[0] === '+')
      return;
    var xml  = new xmldoc.XmlDocument(msg);
    if (xml.name === 'ENTER' && xml.attr.id === session.id()) {
      entered = true;
      on();
    } else if (dm) switch (xml.name) {
      case 'RSET':
        var id = xml.attr.id, myid = session.id();
        if (myid === id) {
          if (xml.attr.msg && xml.attr.target) {
            dm.decrypt(xml.attr.target, xml.attr.msg, function (msg) {
              log(session.id(), getName(xml.attr.target) + 'にDM送信:' + msg);
            });
          }
        } else {
          if (xml.attr.req !== undefined) {
            dm.remove(xml.attr.id);
            if (-xml.attr.req) {
              dm.genPubKey(id, function (jwk) {
                sendXML('RSET', { pub : JSON.stringify(jwk), target : id});
              });
            }
          } else if (xml.attr.target === myid) {
            if (xml.attr.pub) {
              dm.acceptPubKey(id, JSON.parse(xml.attr.pub), function (jwk) {
                sendXML('RSET', { pub : JSON.stringify(jwk), target : id});
              });
            } else if (xml.attr.msg) {
              dm.decrypt(id, xml.attr.msg, function (msg) {
                log(id, 'DM受信:' + msg);
              });
            }
          }
        }
        break;
      case 'EXIT':
        if (xml.attr.id === session.id()) {
          entered = false;
          off();
        } else {
          dm.remove(xml.attr.id);
        }
        break;
    }
  }
};