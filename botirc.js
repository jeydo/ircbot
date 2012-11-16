var
	sys  = require('util'),
	bot  = require('./bot');

//Config IRC
var params = {
		authPwd    : 'password', //Password for identification via irc
		nickname   : 'ircbot',   //irc nickname 
		chanName   : 'ircbot',   //irc channel
		server     : 'euroserv.fr.quakenet.org', //irc server
		serverPort : 6667, //irc server port
		logPath    : '/paht/to/log/', //path to log file, used for history
		debug      : false
};

var Botirc = new bot.botObj(params).connect();

Botirc.bindAction();
