
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

function loadCSVFromText(text, callback) {
	const splat = text.split("\n");
	const header = splat[0].split(",");
	console.log("header:", header);
	const lines = splat.slice(1, -1);
	const rows = lines.map(function(line) {
		const row = {};
		line.split(",").forEach(function(cellValue, index) {
			row[header[index]] = cellValue;
		});
		return row;
	});
	callback(rows);
}

function getValue(id) {
	return document.getElementById(id).value;
}