this.in_array = function (val, tab) {
	for (var i in tab) {
		if (tab[i] == val) {
			return true;
		}
	}
	return false;
};

this.getMyDate = function () {
	var myDate = new Date();
	//return myDate.toLocaleString();
	return myDate.getFullYear() + '-' + myDate.getMonth() + '-' + myDate.getDate() + ' ' + myDate.getHours() + ':' + myDate.getMinutes() + ':' + myDate.getSeconds();
};

this.escapeSearch = function (txt) {
	var
		res = txt.replace(/\\/g, '\\\\');
	  	res = res.replace(/\$/g, '\\$');
		res = res.replace(/"/g, '\\"');
		res = res.replace(/\./g, '\\.');
		res = res.replace(/\[/g, '\\[');
		res = res.replace(/\]/g, '\\]');
		res = res.replace(/\{/g, '\\{');
		res = res.replace(/\}/g, '\\}');
		res = res.replace(/\*/g, '\\*');
		res = res.replace(/\//g, '\\/');
	return res;
};

this.escapeLog = function (txt) {
	return txt.replace(/"/g, '\\"');
}
