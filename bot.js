var
	io   = require('socket.io').listen(6667),
	irc  = require('./irc'),
	bot  = exports,
	fn   = require('./functions'),
	exec = require('child_process').exec;

var Botirc = bot.botObj = function(config) {
	this.conf          = config;
	this.chan          = '#' + config.chanName;
	this.logFile       =  config.logPath + config.chanName + '.log';
	this.usersAllowed  = [];
	this.specialAction = ['!op', '!deop', '!kick', '!slap', '!log', '!more'];
	this.userLog       = [];
}

io.set('log level', Botirc.conf.debug ? 2 : 1);

Botirc.prototype.connect = function() {
	this.client = new irc.Client(this.conf.server, this.conf.serverPort);
	this.client.connect(this.conf.nickname);
	this.client.on('001', function (obj) {
		this.send('JOIN', obj.chan);
	}.bind(this.client, this));
	return this;
}

Botirc.prototype.registerUsers = function(usersList) {
	if (usersList.length <= 1) {
		return this.userLog;
	}
	this.userLog = [];
	usersList.forEach(function (val, index) {
		if (val != this.conf.nickname) {
			this.userLog[irc.user(val)] = [];
		}
	}.bind(this));
	return this.userLog;
}

Botirc.prototype.sendMessage = function (user, message) {
	this.client.send('PRIVMSG', user, ':' + message);
}

Botirc.prototype.setMode = function (user, mode) {
	this.client.send('MODE', this.chan, mode, user);
}

Botirc.prototype.kick = function (user, message) {
	this.client.send('KICK', this.chan, user, ':' + message);
}

Botirc.prototype.privateMsgAction = function (content, prefix) {
	switch (content[0]) {
		case 'auth' :
			if ("undefined" == typeof content[1] || content[1] != this.conf.authPwd) {
				return;
			}
			this.auth(prefix);
		break;
		case 'list' :
			this.listAllowedUsers(prefix);
		break;
	}
	return;
}

Botirc.prototype.auth = function (prefix) {
	if (fn.in_array(prefix, this.usersAllowed)) {
		this.client.send('PRIVMSG', irc.user(prefix), ':Already auth!');
		return;
	}
	
	this.usersAllowed.push(prefix);
	this.sendMessage(irc.user(prefix), 'Access granted...');
	this.setMode(irc.user(prefix), '+o');
	return;
}

Botirc.prototype.listAllowedUsers = function (prefix) {
	if (!fn.in_array(prefix, this.usersAllowed)) {
		return;
	}
	this.usersAllowed.forEach(function (val, index) {
		this.sendMessage(irc.user(prefix), irc.user(val) + ' :: ' + val);
	}.bind(this));
}

Botirc.prototype.logMessage = function (prefix, message) {
	exec('echo "[' + fn.getMyDate() + '] <' + irc.user(prefix) + '> ' + fn.escapeLog(message) + '" >> ' + this.logFile);
}

Botirc.prototype.searchLog = function (user, search) {
	this.userLog[user]['search'] = search;
	this.userLog[user]['start']  = 0;
	var res                      = false;
	exec('grep -i "\\[.*\\] <.*> .*' + fn.escapeSearch(search) + '.*" ' + this.logFile, function (err, stdout, stderr) {
		if (null !== err) {
			this.sendMessage(this.chan, 'No result...');
		} else {
			res = stdout.split("\n");
			res.pop();
			res.reverse();
			this.userLog[user]['max'] = res.length;
			this.sendMessage(this.chan, res.length + ' result(s)');
			for (i in res) {
				this.sendMessage(this.chan, res[i]);
				if (i > 3) {
					break;
				}
			}
		}
	}.bind(this));
}

Botirc.prototype.chanMsgAction = function (content, prefix) {
	switch (content[0]) {
		case '!op' :
		case '!deop' :
			if (!fn.in_array(prefix, this.usersAllowed)) {
				return;
			}
			var mode = '';
			if ('!op' == content[0]) {
				mode = '+';
			} else if ('!deop' == content[0]) {
				mode = '-';
			}
			this.setMode(undefined != typeof content[1] ? content[1] : irc.user(prefix), mode + 'o');
		break;

		case '!kick' :
			if (undefined == typeof content[1]
				|| content[1] == this.conf.nickname
				|| !fn.in_array(prefix, this.usersAllowed)) {
				return;
			}
				var userToKick = content[1];
				delete content[0];
				delete content[1];
				this.kick(userToKick, content.join(' '));
		break;

		case '!log' :
			if (undefined == content[1]) {
				return;
			}
			content.shift();
			this.searchLog(irc.user(prefix), content.join(' '));
		break;
	}
	return;
}

Botirc.prototype.bindAction = function() {
	
	//Bind la commande NAMES pour lister les utilisateurs du chan
	this.client.on('353', function (prefix, myUser, equal, channel, text) {
		this.registerUsers(text.split(' '));
	}.bind(this));

	//Bind le départ d'un utilisateur
	this.client.on('PART', function (prefix) {
		exec('echo "** [' + fn.getMyDate() + '] <' + irc.user(prefix) + '> left **" >> ' + this.logFile);
		delete this.userLog[irc.user(prefix)];
	}.bind(this));

	//Bind l'arrivée d'un utilisateur
	this.client.on('JOIN', function (prefix, channel) {
		if (fn.in_array(prefix, this.usersAllowed)) {
			this.setMode(irc.user(prefix), '+o');
		}
		exec('echo "** [' + fn.getMyDate() + '] <' + irc.user(prefix) + '> joined **" >> ' + this.logFile);
		this.userLog[irc.user(prefix)] = [];
	}.bind(this));

	//Bind les messages
	this.client.on('PRIVMSG', function (prefix, channel, text) {
		var content = text.split(' ');
		if (undefined == typeof content[0]) {
			return;
		}

		//private message
		if (channel == this.conf.nickname) {
			this.privateMsgAction(content, prefix);
		}

		if (channel == this.chan) {
			if (!fn.in_array(content[0], this.specialAction)) {
				this.logMessage(prefix, text);
				return;
			}

			this.chanMsgAction(content, prefix);
		}
	}.bind(this));
}
