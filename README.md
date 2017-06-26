# csv-pushapi
Using the push API to index files from CSV with Coveo

# How to build
`npm install`

# How to run
```sh
export SOURCEID=ID of your push source
export ORGANIZATIONID=ID of your Coveo organization
export PUSHAPIKEY=APIKEY to push to your Coveo organization

node src/index.js input.csv documentUrlColumn
```

# Available documentation
https://developers.coveo.com/display/CloudPlatform/Push+API+Usage+Overview
