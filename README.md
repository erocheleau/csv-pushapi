# csv-pushapi
Using the push API to index files from CSV with Coveo

# How to build
`npm install`

# How to run
```sh
export COVEO_SOURCEID=ID of your push source
export COVEO_ORGANIZATIONID=ID of your Coveo organization
export COVEO_PUSH_TOKEN=APIKEY to push to your Coveo organization

node src/index.js input.csv
```

# Where to get your tokens

## Available documentation
* Coveo push API https://developers.coveo.com/display/CloudPlatform/Push+API+Usage+Overview
