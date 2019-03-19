var cache = {
  cooccurrences: {},
  markers: null,
  indices: {}
};

/* tab switching */
var tabs =  Array.prototype.slice.call(document.querySelectorAll("#sub-panel .tabs li a"));

tabs.forEach(function(tab) {
  tab.addEventListener('click', function(event) {
    const target = event.target;
    const active = target.className.indexOf('active') > -1;
    if (active) {
      console.log("you clicked a tab that is already active");
    } else {
      console.log("you clicked a closed tab", target);
      tabs.forEach(function(tab) {
        tab.className = '';
      });
      target.className = 'active';
      var li = target.parentElement;
      var tabID = li.id;
      if (tabID === 'info-tab') {
        document.getElementById('one').style.display = 'block';
        document.getElementById('two').style.display = 'none';
      } else if (tabID=== 'dashboard-tab') {
        document.getElementById('one').style.display = 'none';
        document.getElementById('two').style.display = 'block';
      }
    }
  });
})

/*

//tab 1 collapse
var infoTab = document.getElementById("one");
var infoContent = document.getElementById("one");

infoTab.addEventListener("click", function() {
  if (infoContent.style.display === "none") {
    infoContent.style.display = null;
  } else {
    infoContent.display = "none";
  }
});


//tab 2 collapse
var dashboardTab = document.getElementById("two");
var dashboardContent = document.getElementById("two");

dashboardTab.addEventListener("click", function() {
  if (dashboardContent.style.display === "none") {
    dashboardContent.style.display = null;
  } else {
    dashboardContent.display = "none";
  }
}); 
*/

//Filters
function populateDropdown(id, defaultName, optionArray) {
  var options = defaultName ? [ { 'val': -1, 'txt': defaultName }] : [];
  optionArray.map(function(optionValue, i) {
    options.push({ val: i, txt: optionValue });
  });
  console.log("options:", options);
  fillDropdown(id, options);
}

function fillDropdown(dropdownID, options) {
  var dropdown = document.getElementById(dropdownID);  
  var innerHTML = '';
  options.forEach(function(option) {
    innerHTML += '<option value="' + option.val + '">' + option.txt + '</option>';
  });
  dropdown.innerHTML = innerHTML;
}

function populateCountyDropdown() {
  loadIndex("county", function(countyIndex) {
    populateDropdown('countyDropdown', 'County', countyIndex);
  });
}

function loadIndex(name, callback) {
  if (cache.indices[name]) {
    callback(cache.indices[name]);
  } else {
    loadText("data/indices/" + name + "-index.txt", function(text){
      const index = text.split("\n").slice(0, -1);
      cache.indices[name] = index;
      callback(index);
    });
  }
}

/*
  {
    "Alameda County": ["Berekely", "Fremont"]
  }
*/

function loadCooccurrences(name, callback) {
  if (cache.cooccurrences[name]) {
    callback(cache.cooccurrences[name]);
  } else {
    loadTSV('data/cooccurrences/' + name, function(rows) {
      var result = {};
      rows.forEach(function(row) {
        var key = row[0];
        var values = row[1].split(",").map(Number);
        result[key] = values;
      });
      cache.cooccurrences[name] = result;
      callback(result);
    });
  }
}

populateCountyDropdown();

function populateCityDropdown() {
  var selectedCounty = getValue("countyDropdown");
  if (selectedCounty === "County") {
    populateDropdown("cityDropdown", "City", []);
  } else {
    loadCooccurrences("county-to-city", function(cooccurrences) {
      var includedCityIds = cooccurrences[selectedCounty];
      if (includedCityIds !== undefined) { // undefined when page is loading
        loadIndex("city", function(cityIndex) {
          var options = [{ val: -1, txt: 'City'}];
          includedCityIds.forEach(function(cityID) {
            var cityName = cityIndex[cityID];
            if (cityName !== '' && cityName !== 'NA') {
              options.push({ val: cityID, txt: cityName });
            }
          });
          fillDropdown('cityDropdown', options);
        });        
      }
    });
  }
}

populateCityDropdown();

function populateDistrictDropdown() {
  var selectedCounty = getValue("countyDropdown");
  if (selectedCounty === "County") {
    populateDropdown("districtDropdown", "District", []);
  } else {
    loadCooccurrences("county-to-district", function(cooccurrences) {
      var includedDistrictIds = cooccurrences[selectedCounty];
      if (includedDistrictIds !== undefined) { //undefined when page is loading
        loadIndex("district", function(districtIndex) {
          var options = [{ val: -1, txt: 'School District'}];
          includedDistrictIds.forEach(function(districtID) {
            var districtName = districtIndex[districtID];
            if (districtName !== '' || districtName !== 'NA') {
              options.push({ val: districtID, txt: districtName });
            }
          });
          fillDropdown('districtDropdown', options);
        });
      }
    });
  }
}

populateDistrictDropdown();

function fillSchoolDropdown(schoolIDs) {
  if (schoolIDs != undefined) { //undefined when page is loading
    loadIndex("schoolName", function(schoolIndex) {
      var options = [{ val: -1, txt: 'School'}];  
      schoolIDs.forEach(function(schoolID) {
        var schoolName = schoolIndex[schoolID];
        options.push({ val: schoolID, txt: schoolName });
      });
      fillDropdown('schoolDropdown', options);  
    });
  }
}

function fillSchoolDropdownBySelection(cooccurrencesName, selectionID) {
  loadCooccurrences(cooccurrencesName, function(cooccurrences) {
      var idsOfSchools = cooccurrences[selectionID];
      fillSchoolDropdown(idsOfSchools);
  });  
}

function populateSchoolDropdown() {
  var selectedCounty = getValue("countyDropdown");
  var selectedCity = getValue("cityDropdown");
  var selectedDistrict = getValue("districtDropdown");

  var userHasSelectedCounty = selectedCounty != -1 && selectedCounty != '';
  var userHasSelectedCity = selectedCity != -1 && selectedCity != '';
  var userHasSelectedDistrict = selectedDistrict != -1 && selectedDistrict != '';

  if (userHasSelectedCity) {
    fillSchoolDropdownBySelection("city-to-schoolName", selectedCity);
  } else if (userHasSelectedDistrict) {
    fillSchoolDropdownBySelection("district-to-schoolName", selectedDistrict);
  } else if (userHasSelectedCounty) {
    fillSchoolDropdownBySelection("county-to-schoolName", selectedCounty);
  } else {
    populateDropdown("schoolDropdown", "School", []);      
  }
}

var geojson;
var metadata;
var csvPath = "data/compressed.csv";
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
  var children = cluster.getAllChildMarkers();
  var n = children.length; //Get number of markers in cluster
  var strokeWidth = 1; //Set clusterpie stroke width
  var r = rmax-2*strokeWidth-(n<10?12:n<100?8:n<1000?4:0); //Calculate clusterpie radius...
  var iconDim = (r+strokeWidth)*2; //...and divIcon dimensions (leaflet really want to know the size)
  var data = d3.nest() //Build a dataset for the pie chart
        .key(function(d) {
          return getCategory(d.feature.properties);
        })
        .entries(children, d3.map);
      //bake some svg markup
  var html = bakeThePie({
    data: data,
    valueFunc: function(d){
      return d.values.length;
    },
    strokeWidth: 1,
    outerRadius: r,
    innerRadius: r-10,
    pieClass: 'cluster-pie',
    pieLabel: n,
    pieLabelClass: 'marker-cluster-pie-label',
    pathClassFunc: function(d){
      return d.data.key;
    },
    pathTitleFunc: function(d){
      return getTitle(d.data.key)+' ('+d.data.values.length+')';
    }
  });
  //Create a new divIcon and assign the svg markup to the html property
  var myIcon = new L.DivIcon({
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
  } else if (medianResult >= 5) {
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
  } else if (category == "high") {
    return "High";
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
  props.hidden = false;
  var options = {
    className: getMarkerClass(props),
    fillOpacity: 0.8,
    weight: 1
  };
  return L.circleMarker(latlng, options);
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
  cache.geojson = geojson
  var markers = L.geoJson(geojson, {
    pointToLayer: defineFeature //,
    // onEachFeature: defineFeatureClickEvent
  });
  markerclusters.addLayer(markers);
});

function filterMapByPropertyValue(property, value) {
  markerclusters.clearLayers();
  var newGeoJson = {
    features: cache.geojson.features.filter(function(feature) {
      return feature.properties[property] == value;
    }),
    type: "FeatureCollection"
  };
  var markers = L.geoJson(newGeoJson, {
    pointToLayer: defineFeature
  });
  markerclusters.addLayer(markers);

  // zoom to filtered data
  calLead.fitBounds(markerclusters.getBounds())
}

function resetMap() {
  var markers = L.geoJson(cache.geojson, {
    pointToLayer: defineFeature
  });
  markerclusters.addLayer(markers);
}

function filterMap() {
  var selectedCounty = getValue("countyDropdown");
  var selectedCity = getValue("cityDropdown");
  var selectedDistrict = getValue("districtDropdown");

  var userHasSelectedCounty = selectedCounty != -1 && selectedCounty != '';
  var userHasSelectedCity = selectedCity != -1 && selectedCity != '';
  var userHasSelectedDistrict = selectedDistrict != -1 && selectedDistrict != '';

  if (userHasSelectedCity) {
    filterMapByPropertyValue("city", selectedCity);
  } else if (userHasSelectedDistrict) {
    filterMapByPropertyValue("district", selectedDistrict);
  } else if (userHasSelectedCounty) {
    filterMapByPropertyValue("county", selectedCounty);
  } else {
    resetMap();
  }
}

function onChangeCountyDropdown() {
  populateCityDropdown();
  populateDistrictDropdown();
  populateSchoolDropdown();
  filterMap();
}

function onChangeCityDropdown() {
  getValue('districtDropdown').value = -1;
  populateSchoolDropdown();
  filterMap();   
}

function onChangeDistrictDropdown() {
  document.getElementById('cityDropdown').value = -1;
  populateSchoolDropdown();
  filterMap();
}
