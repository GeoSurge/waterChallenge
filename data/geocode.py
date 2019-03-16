from csv import DictReader, DictWriter
from requests import get
from time import sleep

outpath = "ca_schools_lead_testing_data_geocoded.csv"
with open("ca_schools_lead_testing_data.csv") as f:
  dictReader = DictReader(f)
  schools = list(dictReader)
  fieldnames = dictReader.fieldnames + ["latitude", "longitude"]

with open(outpath, "w") as f:
  dictWriter = DictWriter(f, fieldnames=fieldnames)
  dictWriter.writeheader()

for index, school in enumerate(schools):
  url = "https://nominatim.openstreetmap.org/search"
  params = {
    "format": "json",
    "q": school["schoolAddress"],
    "state": "CA",
    "country": "US"
  }
  responses = get(url, params=params).json()
  if len(responses) > 0:
    response = responses[0]
    school['latitude'] = response['lat']
    school['longitude'] = response['lon']
    print("response:", response)
  else:
    print("none found")
  print("sleeping")
  sleep(5)
  if (index > 5):
    break

  with open("ca_schools_lead_testing_data_geocoded.csv", "a") as f:
    DictWriter(f, fieldnames=fieldnames).writerow(school)
