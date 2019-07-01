from csv import DictReader, DictWriter
from requests import get
from time import sleep

outpath = "ca_schools_lead_testing_data_geocoded_june.csv"
with open("ca_schools_lead_testing_data_june.csv") as f:
  dictReader = DictReader(f)
  schools = list(dictReader)
  fieldnames = dictReader.fieldnames

with open(outpath, "w") as f:
  dictWriter = DictWriter(f, fieldnames=fieldnames)
  dictWriter.writeheader()

misses = 0

for index, school in enumerate(schools):
  print("\nindex:", index)
  if school['latitude'] == 'N/A':
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
    else:
      print("none found")
      misses += 1
    print("sleeping")
    sleep(10)
    print("percentage missed:", float(misses) / (index+1))

  with open(outpath, "a") as f:
    DictWriter(f, fieldnames=fieldnames).writerow(school)
