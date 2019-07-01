from csv import DictReader, DictWriter
from requests import get
from time import sleep

with open("ca_schools_lead_testing_data_geocoded.csv") as f:
  dictReader = DictReader(f)
  previous_schools = list(dictReader)

def triedBefore(school):
  matches = [prev for prev in previous_schools if prev["schoolName"] == school["schoolName"] and prev["schoolAddress"] == school["schoolAddress"]]
  matchcount = len(matches)
  print("matchcount:", matchcount)
  return matchcount > 0

outpath = "ca_schools_lead_testing_data_geocoded_june.csv"
with open("ca_schools_lead_testing_data_june.csv") as f:
  dictReader = DictReader(f)
  schools = list(dictReader)
  fieldnames = dictReader.fieldnames

with open(outpath, "w") as f:
  dictWriter = DictWriter(f, fieldnames=fieldnames)
  dictWriter.writeheader()

previous = 0
misses = 0
newly_geocoded = 0

for index, school in enumerate(schools):
  print("\nindex:", index)
  if school['latitude'] == 'NA':
    if not(triedBefore(school)):
      url = "https://nominatim.openstreetmap.org/search"
      params = {
        "addressdetails": 1,
        "format": "json",
        "q": school["schoolAddress"],
        "state": "CA",
        "country": "US"
      }
      responses = get(url, params=params).json()
      if len(responses) > 0:
        response = responses[0]
        print("response:", response)
        address = response['address']
        school['city'] = address.get('city','')
        school['county'] = address.get('county', '')
        school['latitude'] = response['lat']
        school['longitude'] = response['lon']
        newly_geocoded += 1
      else:
        print("none found")
        misses += 1
      print("sleeping")
      sleep(10)
    else:
      print("previously tried and missed:", school['schoolName'])
      misses += 1
  else:
    previous += 1

  print("newly_geocoded:", newly_geocoded)
  print("previously geocoded:", previous)
  print("percentage missed:", float(misses) / (index+1))

  with open(outpath, "a") as f:
    DictWriter(f, fieldnames=fieldnames).writerow(school)
