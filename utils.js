function loadText(url, callback) {
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open("GET", url, true);
	xobj.onreadystatechange = function () {
		if (xobj.readyState == 4 && xobj.status == 200) {
			callback(xobj.responseText);
		}
	}
	xobj.send(null);
}

function loadTSV(url, callback) {
	loadText(url + '.tsv', function(text){
		const lines = text.split("\n").slice(1, -1);
		const rows = lines.map(function(line) {
			return line.split("\t");
		});
		callback(rows);
    });
}

function getValue(id) {
	return document.getElementById(id).value;
}