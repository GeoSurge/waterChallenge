var geojson;
var metadata;
var csvPath = "data/ca_schools_lead_testing_data_geocoded.csv";
var rmax = 30 //maximum radius for cluster pies

/*function that generates a svg markup for the pie chart*/
function bakeThePie(options) {
    /*data and valueFunc are required*/
    if (!options.data || !options.valueFunc) {
        return '';
    }
    var data = options.data,
        valueFunc = options.valueFunc,
        r = options.outerRadius?options.outerRadius:28, //Default outer radius = 28px
        rInner = options.innerRadius?options.innerRadius:r-10, //Default inner radius = r-10
        strokeWidth = options.strokeWidth?options.strokeWidth:1, //Default stroke is 1
        pathClassFunc = options.pathClassFunc?options.pathClassFunc:function(){return '';}, //Class for each path
        pathTitleFunc = options.pathTitleFunc?options.pathTitleFunc:function(){return '';}, //Title for each path
        pieClass = options.pieClass?options.pieClass:'marker-cluster-pie', //Class for the whole pie
        pieLabel = options.pieLabel?options.pieLabel:d3.sum(data,valueFunc), //Label for the whole pie
        pieLabelClass = options.pieLabelClass?options.pieLabelClass:'marker-cluster-pie-label',//Class for the pie label
        
        origo = (r+strokeWidth), //Center coordinate
        w = origo*2, //width and height of the svg element
        h = w,
        donut = d3.pie(),
        arc = d3.arc().innerRadius(rInner).outerRadius(r);
        
    //Create an svg element
    var svg = document.createElementNS(d3.namespaces.svg, 'svg');
    //Create the pie chart
    var vis = d3.select(svg)
        .data([data])
        .attr('class', pieClass)
        .attr('width', w)
        .attr('height', h);
        
    var arcs = vis.selectAll('g.arc')
        .data(donut.value(valueFunc))
        .enter().append('svg:g')
        .attr('class', 'arc')
        .attr('transform', 'translate(' + origo + ',' + origo + ')');
    
    arcs.append('svg:path')
        .attr('class', pathClassFunc)
        .attr('stroke-width', strokeWidth)
        .attr('d', arc)
        .append('svg:title')
          .text(pathTitleFunc);
                
    vis.append('text')
        .attr('x',origo)
        .attr('y',origo)
        .attr('class', pieLabelClass)
        .attr('text-anchor', 'middle')
        //.attr('dominant-baseline', 'central')
        /*IE doesn't seem to support dominant-baseline, but setting dy to .3em does the trick*/
        .attr('dy','.3em')
        .text(pieLabel);
    //Return the svg-markup rather than the actual element
    return serializeXmlNode(svg);
}

function defineClusterIcon(cluster) {
    var children = cluster.getAllChildMarkers(),
        n = children.length, //Get number of markers in cluster
        strokeWidth = 1, //Set clusterpie stroke width
        r = rmax-2*strokeWidth-(n<10?12:n<100?8:n<1000?4:0), //Calculate clusterpie radius...
        iconDim = (r+strokeWidth)*2, //...and divIcon dimensions (leaflet really want to know the size)
        data = d3.nest() //Build a dataset for the pie chart
          .key(function(d) { return getCategory(d.feature.properties); })
          .entries(children, d3.map),
        //bake some svg markup
        html = bakeThePie({data: data,
                            valueFunc: function(d){return d.values.length;},
                            strokeWidth: 1,
                            outerRadius: r,
                            innerRadius: r-10,
                            pieClass: 'cluster-pie',
                            pieLabel: n,
                            pieLabelClass: 'marker-cluster-pie-label',
                            pathClassFunc: function(d){return d.data.key;},
                            pathTitleFunc: function(d){
                            	return getTitle(d.data.key)+' ('+d.data.values.length+')';
                            }
                          }),
        //Create a new divIcon and assign the svg markup to the html property
        myIcon = new L.DivIcon({
            html: html,
            className: 'marker-cluster', 
            iconSize: new L.Point(iconDim, iconDim)
        });
    return myIcon;
}

function getCategory(properties) {
	var medianResult = properties.medianResult;
	var status = properties.status;
	if (status == "exempt") {
		return "exempt"; 
	} else if (status == "not tested") {
		return "untested";
	} else if (medianResult == "NA") {
		return "low";
	} else if (medianResult >= 5 && medianResult < 15) {
		return "medium";
	} else if (medianResult >= 15) {
		return "high";
	}
}

function getTitle(category) {
	if (category == "exempt") {
		return "Exempt"; 
	} else if (category == "untested") {
		return "Untested";
	} else if (category == "low" ) {
		return "Low";
	} else if (category == "medium") {
		return "Medium";
	} else if (category == "high") {
		return "high";
	}
}

function getMarkerClass(properties) {
	var myClass = "marker";
	var category = getCategory(properties);
	if (category) {
		myClass += " " + category;
	}
	return myClass;
}

function defineFeature(feature, latlng) {
	var props = feature.properties;
	return L.circleMarker(latlng, {className: getMarkerClass(props)});
}

function loadGeoJSON(url, callback) {
	loadText(url, function(text) {
		var options = {
			latfield: 'latitude',
			longitude: 'longitude',
			delimiter: ','
		};
		csv2geojson.csv2geojson(text, options, function(err, data) {
			callback(data);
		});
	});
}

/*Helper function*/
function serializeXmlNode(xmlNode) {
    if (typeof window.XMLSerializer != "undefined") {
        return (new window.XMLSerializer()).serializeToString(xmlNode);
    } else if (typeof xmlNode.xml != "undefined") {
        return xmlNode.xml;
    }
    return "";
}


var NWcoordinates = L.latLng(43.617188, -131.661213),
SEcoordinates = L.latLng(30.847858, -109.286723),
calBounds = L.latLngBounds(NWcoordinates, SEcoordinates);

var calLead = L.map('map', {
	maxBounds: calBounds,
	minZoom: 6
});

calLead.setView([36.778259, -119.417931], 8);

// Basemaps
L.tileLayer('https://api.mapbox.com/styles/v1/viymak/cjt7h2y9q01eq1frqxcqfptqh/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoidml5bWFrIiwiYSI6ImNqdDdndWQ2dTAyc2Y0NHF1djgwY3FqYjYifQ.G_2fY2hb7vQSDHybmMXpbw', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>'
}).addTo(calLead);

var markerclusters = L.markerClusterGroup({
	maxClusterRadius: 2*rmax,
	iconCreateFunction: defineClusterIcon //aggregates points into pie according to zoom
});
//add the empty markercluster layer
calLead.addLayer(markerclusters);

loadGeoJSON(csvPath, function(geojson) {
	console.log("geojson", geojson);
	var markers = L.geoJson(geojson, {
		pointToLayer: defineFeature //,
		// onEachFeature: defineFeatureClickEvent
	});
	markerclusters.addLayer(markers);
});



