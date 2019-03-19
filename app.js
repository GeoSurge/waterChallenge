var cache = {
  cooccurrences: {},
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
  var selectedCounty = document.getElementById("countyDropdown").value;
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
  var selectedCounty = document.getElementById("countyDropdown").value;
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

function onChangeCountyDropdown() {
  populateCityDropdown();
  populateDistrictDropdown();
  populateSchoolDropdown();
}

function onChangeCityDropdown() {
  document.getElementById('districtDropdown').value = -1;
  populateSchoolDropdown();      
}

function onChangeDistrictDropdown() {
  document.getElementById('cityDropdown').value = -1;
  populateSchoolDropdown();  
}

/*
mapboxgl.accessToken = 'pk.eyJ1Ijoidml5bWFrIiwiYSI6ImNqdDdndWQ2dTAyc2Y0NHF1djgwY3FqYjYifQ.G_2fY2hb7vQSDHybmMXpbw';
// restrict map panning
const bounds = [
  [-131.661213, 43.617188], //NW coordinates
  [-109.286723, 30.847858] //SE coordinates
];

const map = new mapboxgl.Map({
  container: 'map', // container id
  //style: 'mapbox://styles/viymak/cjt7h2y9q01eq1frqxcqfptqh', // stylesheet location
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [
    -122.473373, 37.767579
  ], // starting position [lng, lat]
  zoom: 11,//, // starting zoom
  maxBounds: bounds
});

map.addControl(new mapboxgl.NavigationControl());


const range = d3.scaleThreshold().domain([1, 5, 15]).range(['#C8D2D3', '#f2d434', '#eb980b', '#eb470b']);

const imagePath = {
  '#C8D2D3': 'img/school-blue.svg',
  '#f2d434': 'img/school-yellow.svg',
  '#eb980b': 'img/school-orange.svg',
  '#eb470b': 'img/school-red.svg'
};

map.on('load', () => {

  map.addSource('schools', {
    type: 'vector',
    url: 'mapbox://sadie-gill.076g5x2v'
  });

  map.addSource('schoolsHover', {
    type: 'vector',
    url: 'mapbox://sadie-gill.076g5x2v'
  });

  map.addLayer({
    'id': 'schoolLayer',
    'type': 'circle',
    'source': 'schools',
    'source-layer': 'schools',
    'paint': {
      'circle-radius': [
        'case',
        [
          'boolean',
          [
            'feature-state', 'hover'
          ],
          false
        ],
        9,
        5
      ],
      'circle-stroke-color': 'rgba(47, 47, 47, 0.65)',
      'circle-stroke-width': [
        'case',
        [
          'boolean',
          [
            'feature-state', 'hover'
          ],
          false
        ],
        15,
        2
      ],
      'circle-color': [
        'step',
        [
          'get', 'ppb'
        ],
        '#C8D2D3',
        1,
        '#f2d434',
        5,
        '#eb980b',
        15,
        '#eb470b'
      ]
    }
  })
  map.addLayer({
    'id': 'schoolLayerHover',
    'type': 'circle',
    'source': 'schoolsHover',
    'source-layer': 'schools',
    'paint': {
      'circle-radius': 5,
      'circle-color': 'rgba(68, 91, 244, 0)'
    }
  })

  const updateDashboard = (id) => {
    const dash = document.getElementById('dashboard');
    const ppb = document.getElementById(id).value;
    const color = range(ppb);
    const selection = document.getElementById(id);
    selection.selected = true;
    dash.innerHTML = `
    <img class='w120' src='${imagePath[color]}' alt='school icon' />
    <div><span style='color:${color};' class='txt-h2'>${ppb == 0
      ? '< 1'
      : ppb}</span><span style='color:${color};'> ppb</span></div>
    <div><span class='txt-h4'>${selection.text}</span></div>`
  }

  let hoveredId = null;

  const updateMap = (id) => {
    if (hoveredId) {
      // set the hover attribute to false with feature state
      map.setFeatureState({
        source: 'schools',
        sourceLayer: 'schools',
        id: hoveredId
      }, {hover: false});
    }

    hoveredId = id;
    // set the hover attribute to true with feature state
    map.setFeatureState({
      source: 'schools',
      sourceLayer: 'schools',
      id: id
    }, {hover: true});
  }

  const setAfterLoad = (e) => {
    if (e.sourceId === 'schools' && e.isSourceLoaded) {
      const features = map.queryRenderedFeatures({layers: ['schoolLayer']});
      const divSelect = document.createElement('div');
      const arrow = document.createElement('div');
      const select = document.createElement('select');
      arrow.className = 'select-arrow color-gray-dark'
      divSelect.className = 'select-container mt6';
      select.className = 'select select--s select--white color-gray-dark';
      select.id = 'SchoolList';
      const sortAlpha = (data) => {
        return data.sort((x, y) => {
          return d3.ascending(x.properties.school_name, y.properties.school_name);
        });
      }
      sortAlpha(features);
      select.innerHTML = `
        <option disabled selected value>Select A school</option>
        ${features.map((f) => {
        return `<option id='${f.id}' value='${f.properties.ppb}'>
          ${f.properties.school_name}
          </option>`}).join(' ')}`;
        divSelect.append(select);
        divSelect.append(arrow)
        document.getElementById('key').append(divSelect);
        document.getElementById('SchoolList').addEventListener('change', (e) => {
          const id = document.getElementById('SchoolList').options[document.getElementById('SchoolList').selectedIndex].id
          updateDashboard(id);
          updateMap(id)
        })
        map.off('sourcedata', setAfterLoad);
      }}

    if (map.isSourceLoaded('schools')) {
      setAfterLoad()
    } else {
      map.on('sourcedata', setAfterLoad);
    }

    map.on('mouseenter', 'schoolLayerHover', function(e) {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features.length > 0) {
        if (hoveredId) {
          // set the hover attribute to false with feature state
          map.setFeatureState({
            source: 'schools',
            sourceLayer: 'schools',
            id: hoveredId
          }, {hover: false});
        }

        hoveredId = e.features[0].id;
        // set the hover attribute to true with feature state
        map.setFeatureState({
          source: 'schools',
          sourceLayer: 'schools',
          id: hoveredId
        }, {hover: true});

        updateDashboard(hoveredId);
      }
    });

    //
    // map.on('mouseleave', 'schoolLayerHover', function() {
    //   map.getCanvas().style.cursor = '';
    //   map.setFeatureState({
    //     source: 'schools',
    //     sourceLayer: 'schools',
    //     id: hoveredId
    //   }, {hover: false});
    //   hoveredId = null;
    // });
  })
*/