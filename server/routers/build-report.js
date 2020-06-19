const express = require('express');
//var runMode="production";
//var runMode=""; //var testDocsNumber=400;
var github = require('octonode');


module.exports = function (app) {
  const router = express.Router();

  const timestamp = require('time-stamp');
  //var reportId = "build-report"
  var request = require('request');
  var dataCreatedTimestamp = timestamp.utc('YYYY/MM/DD:HH:mm:ss');
  // var reportObject = { 
  //   "docType": "report",
  //   "docName": "build-report",
  //   "campaign": "Codewind",
  //   "dataCreatedTimestamp": dataCreatedTimestamp,
  //   "docs": [ {"dateTimeKey": "dateTimeKey"} ] 
  // };
  var docNumber=0;
  const eclispeInstallsBeforeJan2020=781;
  const vscodeInstallsBefore23Feb2020=3213;
  var hasMonthChanged="";



  router.get('/', function (req, res, next) {

    console.log("START - build report")

    //// START set up credentials ////////////
    var publicOrIbmGitForBackupReport = "publicGit" // "ibmGit"
    var gitAuthTok="";
    if ( publicOrIbmGitForBackupReport == "ibmGit" ) {
      var repo='smarteradvocacy/build-report';
      if ( process.env.IbmGitNikCanvin ) { // test and use environment var if it exists (production case)
        gitAuthTok=process.env.IbmGitNikCanvin;
      } 
    } else if ( publicOrIbmGitForBackupReport == "publicGit" ) {
      var repo='IBM/smarteradvocacy-build-report';
      if ( process.env.GitNikCanvin ) { // test and use environment var if it exists (production case)
        gitAuthTok=process.env.GitHubForNikC;
      } 
    } 
    if ( req.query.GitToken ) {// test and use request parameter var if it exists (local dev case)
      gitAuthTok = req.query.GitToken; 
    }
    if ( gitAuthTok ) {
      console.log("--- GitToken request parameter = "+gitAuthTok);
    } else { // error case
      console.log("ERROR - Git access crendentials were not set");
      res.send("ERROR - Git access crendentials were not set");
    }

    if ( process.env.CouchDbUsername && process.env.CouchDbPassword ) { // test and use environment var if it exists (production case)
      var username=process.env.CouchDbUsername; console.log("--- couch username secret = "+username);
      var password=process.env.CouchDbPassword; console.log("--- couch password secret = "+password);
    } else if ( req.query.CouchDbUsername && req.query.CouchDbPassword ) { // test and use request parameter var if it exists (local dev case)
      var username = req.query.CouchDbUsername; console.log("--- couch username request parameter = "+username);
      var password = req.query.CouchDbPassword; console.log("--- couch password request parameter = "+password);
    } else { // error case
      console.log("ERROR - CouchDb access crendentials were not set");
      res.send("ERROR - CouchDb access crendentials were not set");
    }
    //// ENDED set up credentials ////////////

    //// START getting endpoint parms and setting vars ////////
    var runMode = req.query.runMode; //console.log(runMode);
    var campaign = req.query.campaign; //console.log(campaign);
    var reportType = req.query.reportType; //console.log(reportType);
    var reportId = campaign+"--Report--"+reportType
    const timestamp = require('time-stamp'); //console.log(timestamp);
    var dataCreatedTimestamp = timestamp.utc('YYYY/MM/DD:HH:mm:ss');
    var timePart = dataCreatedTimestamp.split(":"); console.log(dataCreatedTimestamp); var hour = timePart[1]; var minute = timePart[2]; var second = timePart[3];
    var datePart = timePart[0].split("/"); var year = datePart[0]; var month = datePart[1]; var day = datePart[2];
    var reportIdDateTimeKey=year+month+day+hour+minute+second
    var dateTimeKey = year+month+day+hour; console.log(dateTimeKey)


    var request = require('request');
    var TwitterScreenName = req.query.TwitterScreenName; //console.log(reportType);
    //// ENDED getting endpoint parms and setting vars ////////

    function getAllDocsIndex() { 
      return new Promise(resolve => {
        console.log("START: getAllDocsIndex")
        //var url = 'http://' + username + ':' + password + '@datastore-default.apps.riffled.os.fyre.ibm.com/advocacy2/_all_docs'; //TEST case for missing DB
        var url = 'http://' + username + ':' + password + '@datastore-default.apps.riffled.os.fyre.ibm.com/advocacy/_all_docs';
        request({
          method: "GET",
          url: url, 
          Accept: "application/json",
          json: true,
          }, function (error, response, getDocsIndex) { 
            //console.log("error:");  console.log(error);
            //console.log("response:");  console.log(response);
            //console.log("getDocsIndex:"); console.log(getDocsIndex);
            if ( getDocsIndex.error == "not_found" ) {
              console.log("--- ERROR --- getDocsIndex:"); console.log(getDocsIndex);
              console.log("ENDED: getAllDocsIndex")
              resolve(getDocsIndex);
            } else {
              console.log("ENDED: getAllDocsIndex")
              resolve(getDocsIndex);
            }
          });
      });
    }

    function getLatestReportDocId(docsIndex) { 
      return new Promise(resolve => {
        console.log("START: getLatestReportDocId")
        console.log("--- DEBUG: reportId = "+reportId)
        var latestReportDocId="";
        for (var rowid in docsIndex.rows) {
          //if ( docsIndex.rows[rowid].id.includes("Report2") && docsIndex.rows[rowid].id.includes("-")) { // TEST case for missing reportDocId in docsIndex
          if ( docsIndex.rows[rowid].id.includes(reportId)) {
            console.log("------ DEBUG: found "+docsIndex.rows[rowid].id)
            if (docsIndex.rows[rowid].id > latestReportDocId ) {
              latestReportDocId=docsIndex.rows[rowid].id
            }
          } 
        }
        console.log("--- DEBUG: latestReportDocId = "+latestReportDocId)
        resolve(latestReportDocId)
        console.log("ENDED: getLatestReportDocId")
      });
    }

    function getRepoPublicDocs() {
      return new Promise(resolve => {
        console.log("START: getRepoPublicDocs"); console.log("--- DEBUG reportId = "+reportId); console.log("--- DEBUG gitAuthTok = "+gitAuthTok)
        var previousBackupReportsArray=[];//[{value: 'test'}];
        if ( publicOrIbmGitForBackupReport == "ibmGit" ) {
          var client = github.client(gitAuthTok,{
            hostname: 'github.ibm.com/api/v3'
          });
        } else {
          var client = github.client(gitAuthTok);
        }
        var ghrepo = client.repo(repo); console.log("--- DEBUG repo = "+repo)
        //console.log(newReport)
        ghrepo.contents('public', function(err, gitRepoPublicDocs, headers) {
          if (err) { 
            console.log (err);
            previousBackupReportsArray.push(repo+"/public folder not_found")
            resolve(previousBackupReportsArray)
          } else { 
            var backupReportFound="no"
            for (var docNum in gitRepoPublicDocs) {
              if (gitRepoPublicDocs[docNum].name.includes(reportId)) {
                var tempObj={name: gitRepoPublicDocs[docNum].name, sha: gitRepoPublicDocs[docNum].sha}
                previousBackupReportsArray.push(tempObj)
                backupReportFound="yes"
              }
            }
            if (backupReportFound=="no") {
              console.log("--- DEBUG no previous backuip report ever existed in git repo")
              var tempObj={
                name:"repo/public/"+reportId+"* file not_found"
              }
              previousBackupReportsArray.push(tempObj)
            }
            console.log("--- DEBUG previousBackupReportsArray:"); console.log(previousBackupReportsArray)
            resolve(previousBackupReportsArray)
          }
        });
        console.log("ENDED: getRepoPublicDocs")
        //resolve(previousBackupReportsArray);
      });
    }

    function createBlankTwitterReport(currentDateTimeKey){
      return new Promise(resolve => {
        console.log("START: createBlankTwitterReport")
        var latestReport=[];
        // var latestReport = { 
        //   _id: reportId+"--timeStampToFollow",
        //   docType: "report",
        //   docName: campaign+" "+reportType+" report",
        //   campaign: campaign,
        //   dataCreatedTimestamp: dataCreatedTimestamp,
        //   data: {
        //     twitterUsers:{},
        //     monthlyMetrics:[],
        //     dailyMetrics:[],
        //     hourlyMetrics:[],
        //     twitterUserTimeline:[]
        //   }
        // };
        //////
        // var latestReport = { 
        //   "_id": reportId+"--timeStampToFollow",
        //   "docType": "report",
        //   "docName": campaign+" "+reportType+" report",
        //   "campaign": campaign,
        //   "dataCreatedTimestamp": dataCreatedTimestamp,
        //   "data": {
        //     "summary": {
        //       "id": "",
        //       "id_str": "",
        //       "name": "",
        //       "screen_name": TwitterScreenName,
        //       "location": "",
        //       "profile_location": "",
        //       "description": "",
        //       "url": "",
        //       "entities": {
        //         "url": {
        //           "urls": [
        //             {
        //               "url": "",
        //               "expanded_url": "",
        //               "display_url": ""
        //             }
        //           ]
        //         },
        //         "description": {
        //           "urls": []
        //         }
        //       },
        //       "protected": "",
        //       "followers_count": 0,
        //       "friends_count": 0,
        //       "listed_count": 0,
        //       "created_at": "",
        //       "favorite_count": 0,
        //       "utc_offset": "",
        //       "timezone_offset": "",
        //       "geo_enabled": "",
        //       "verified": "",
        //       "statuses_count": 0,
        //       "lang": ""
        //     },
        //     "baselineAdjustments": {
        //       "totalFollowersCount": 0,
        //       "totalTweetsCount": 0,
        //       "totalFavouritesCount": 0
        //     },
        //     "monthlyMetrics": [

        //     ],
        //     "weeklyMetrics": [
        //     ],
        //     "dailyMetrics": [

        //     ],
        //     "hourlyMetrics": [ 
        //       {
        //         //"dateTimeKey": currentDateTimeKey,
        //         "dateTimeKey": 0,
        //         "newFollowersCount": 0,
        //         "totalFollowersCount": 0,
        //         "newFollowers": [
        //           {
        //             "id": "",
        //             "followerUrl": "",
        //             "name": ""
        //           }
        //         ],
        //         "newTweetsCount": 0,
        //         "newTweetsRetweetCount": 0,
        //         "newTweetsFavouriteCount": 0,
        //         "totalTweetsCount": 0,
        //         "totalFavouritesCount": 0,
        //         "newTweets": [
        //           {
        //             "id": "",
        //             "tweetUrl": "",
        //             "text": "",
        //             "retweetCount": 0,
        //             "favoritesCount": 0
        //           }
        //         ]
        //       }
        //     ] 
        //   }
        // };
        resolve(latestReport)
        console.log("ENDED: createBlankTwitterReport")
      });
    }

    function determineCurrentDateTimeKey(){
      return new Promise(resolve => {
        console.log("START: currentDateTimeKey")
        var timePart = dataCreatedTimestamp.split(":"); console.log(dataCreatedTimestamp);
        var hour = timePart[1]; //console.log("hour = "+hour);
        var datePart = timePart[0].split("/");
        var year = datePart[0]; var month = datePart[1]; var day = datePart[2];
        var dateTimeKey = year+month+day+hour; console.log(dateTimeKey)
        resolve(dateTimeKey)
        console.log("ENDED: currentDateTimeKey")
      });
    }

    async function processDoc(doc) {
        //console.log(doc); 
        var timePart = doc.dataCreatedTimestamp.split(":"); //console.log(doc.dataCreatedTimestamp);
        var hour = timePart[1]; //console.log("hour = "+hour);
        var datePart = timePart[0].split("/");
        var year = datePart[0]; var month = datePart[1]; var day = datePart[2];
        var dateTimeKey = year+month+day+hour;
        if (doc._id.includes('EclipsePluginMarketplaceMetrics')) {
          //console.log(doc.metrics[0]);
          var rankingCurrentValue = parseInt(doc.metrics[0].rankingCurrentValue);
          var rankingOfTotalPlugins = parseInt(doc.metrics[0].rankingOfTotalPlugins);
          var installsCurrentValue = parseInt(doc.metrics[0].installsCurrentValue);
          var percentageOfAllInstalls = doc.metrics[0].percentageOfAllInstalls;
          var clickThroughs = parseInt(doc.metrics[0].clickThroughs);
          var dataObj = { 
              "dateTimeKey": dateTimeKey,
              "eclipseRankingCurrentValue": rankingCurrentValue,
              "eclipseRankingOfTotalPlugins": rankingOfTotalPlugins,
              "eclipseInstallsCurrentValue": installsCurrentValue,
              "eclipsePercentageOfAllInstalls": percentageOfAllInstalls,
              "eclipseClickThroughs": clickThroughs
          }
        } 
        else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind" )) {
          var vscodeInstalls = doc.metrics.installs;
          var vscodeAverageRating = doc.metrics.averagerating;
          var dataObj = { 
            "dateTimeKey": dateTimeKey,
            "vscodeInstalls": vscodeInstalls,
            "vscodeAverageRating": vscodeAverageRating
          }
        }
        else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind-node-profiler" )) {
          console.log("-- processDoc 'codewind-node-profiler' case");
          var vscodeInstalls = doc.metrics.installs;
          var vscodeAverageRating = doc.metrics.averagerating;
          var dataObj = { 
            "dateTimeKey": dateTimeKey,
            "vscodeInstallsCodewindNodeProfiler": vscodeInstalls,
            "vscodeAverageRatingCodewindNodeProfiler": vscodeAverageRating
          }
        }
        else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind-java-profiler" )) {
          console.log("-- processDoc 'codewind-java-profiler' case");
          var vscodeInstalls = doc.metrics.installs;
          var vscodeAverageRating = doc.metrics.averagerating;
          var dataObj = { 
            "dateTimeKey": dateTimeKey,
            "vscodeInstallsCodewindJavaProfiler": vscodeInstalls,
            "vscodeAverageRatingCodewindJavaProfiler": vscodeAverageRating
          }
        }
        else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind-openapi-tools" )) {
          console.log("-- processDoc 'codewind-openapi-tools' case");
          var vscodeInstalls = doc.metrics.installs;
          var vscodeAverageRating = doc.metrics.averagerating;
          var dataObj = { 
            "dateTimeKey": dateTimeKey,
            "vscodeInstallsCodewindOpenApiTools": vscodeInstalls,
            "vscodeAverageRatingCodewindOpenApiTools": vscodeAverageRating
          }
        }
        else if (doc._id.includes('JetBrainsPluginMarketplaceMetrics')) {
          var jetBrainsInstalls = doc.metrics.installs;
          var jetBrainsRating = doc.metrics.rating;
          var dataObj = { 
            "dateTimeKey": dateTimeKey,
            "jetBrainsInstalls": jetBrainsInstalls,
            "jetBrainsRating": jetBrainsRating
          }
        }
        return dataObj
    }

    async function processTwitterUserDataDoc(doc) {
      console.log("START processTwitterUserDataDoc")
      //console.log(doc); 
      var timePart = doc.dataCreatedTimestamp.split(":"); //console.log(doc.dataCreatedTimestamp);
      var hour = timePart[1]; //console.log("hour = "+hour);
      var datePart = timePart[0].split("/");
      var year = datePart[0]; var month = datePart[1]; var day = datePart[2];
      var dateTimeKey = year+month+day+hour;
      if (doc._id.includes('EclipsePluginMarketplaceMetrics')) {
        //console.log(doc.metrics[0]);
        var rankingCurrentValue = parseInt(doc.metrics[0].rankingCurrentValue);
        var rankingOfTotalPlugins = parseInt(doc.metrics[0].rankingOfTotalPlugins);
        var installsCurrentValue = parseInt(doc.metrics[0].installsCurrentValue);
        var percentageOfAllInstalls = doc.metrics[0].percentageOfAllInstalls;
        var clickThroughs = parseInt(doc.metrics[0].clickThroughs);
        var dataObj = { 
            "dateTimeKey": dateTimeKey,
            "eclipseRankingCurrentValue": rankingCurrentValue,
            "eclipseRankingOfTotalPlugins": rankingOfTotalPlugins,
            "eclipseInstallsCurrentValue": installsCurrentValue,
            "eclipsePercentageOfAllInstalls": percentageOfAllInstalls,
            "eclipseClickThroughs": clickThroughs
        }
      } 
      else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind" )) {
        var vscodeInstalls = doc.metrics.installs;
        var vscodeAverageRating = doc.metrics.averagerating;
        var dataObj = { 
          "dateTimeKey": dateTimeKey,
          "vscodeInstalls": vscodeInstalls,
          "vscodeAverageRating": vscodeAverageRating
        }
      }
      else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind-node-profiler" )) {
        console.log("-- processDoc 'codewind-node-profiler' case");
        var vscodeInstalls = doc.metrics.installs;
        var vscodeAverageRating = doc.metrics.averagerating;
        var dataObj = { 
          "dateTimeKey": dateTimeKey,
          "vscodeInstallsCodewindNodeProfiler": vscodeInstalls,
          "vscodeAverageRatingCodewindNodeProfiler": vscodeAverageRating
        }
      }
      else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind-java-profiler" )) {
        console.log("-- processDoc 'codewind-java-profiler' case");
        var vscodeInstalls = doc.metrics.installs;
        var vscodeAverageRating = doc.metrics.averagerating;
        var dataObj = { 
          "dateTimeKey": dateTimeKey,
          "vscodeInstallsCodewindJavaProfiler": vscodeInstalls,
          "vscodeAverageRatingCodewindJavaProfiler": vscodeAverageRating
        }
      }
      else if ( (doc._id.includes('VSCodePluginMarketplaceMetrics')) && (doc.artifact === "codewind-openapi-tools" )) {
        console.log("-- processDoc 'codewind-openapi-tools' case");
        var vscodeInstalls = doc.metrics.installs;
        var vscodeAverageRating = doc.metrics.averagerating;
        var dataObj = { 
          "dateTimeKey": dateTimeKey,
          "vscodeInstallsCodewindOpenApiTools": vscodeInstalls,
          "vscodeAverageRatingCodewindOpenApiTools": vscodeAverageRating
        }
      }
      else if (doc._id.includes('JetBrainsPluginMarketplaceMetrics')) {
        var jetBrainsInstalls = doc.metrics.installs;
        var jetBrainsRating = doc.metrics.rating;
        var dataObj = { 
          "dateTimeKey": dateTimeKey,
          "jetBrainsInstalls": jetBrainsInstalls,
          "jetBrainsRating": jetBrainsRating
        }
      }
      console.log("ENDED processTwitterUserDataDoc")
      return dataObj
  }

    function getLatestReport(latestReportDocId) { 
      return new Promise(resolve => {
        console.log("START: getLatestReport")

        // get the latest report
        var url = 'http://' + username + ':' + password + '@datastore-default.apps.riffled.os.fyre.ibm.com/advocacy/'+latestReportDocId;
        console.log("-- url to get = "+url)
        request({
          method: "GET",
          url: url, 
          Accept: "application/json",
          json: true,
          }, function (error, response, latestReport) { 
            //console.log(latestReport)
            resolve(latestReport)
            console.log("ENDED: getLatestReport")
          });
      });
    }

    function determineLatestGetDataDateInReport(latestReport) { 
      return new Promise(resolve => {
        console.log("-- START: determineLatestGetDataDateInReport")
        //console.log("--- DEBUG latestReport = "+latestReport)
        var oldInstallsReport = "no";
        if ( latestReport.data ) {
          var latestGetDataDateInReport = latestReport.data.hourlyMetrics[0].dateTimeKey
        } else if ( oldInstallsReport == "yes" ){
          var latestGetDataDateInReport = latestReport.docs[1].dateTimeKey
        } else {
          var latestGetDataDateInReport = 20200101;
        }
        console.log("---- latestGetDataDateInReport = "+latestGetDataDateInReport)
        console.log("-- ENDED: determineLatestGetDataDateInReport")
        resolve(latestGetDataDateInReport)
      });
    }

    function determineNewGetDataDocIds(docsIndex, latestGetDataDateInReport) { 
      return new Promise(resolve => {
        console.log("START: determineNewGetDataDocIds")
        var newGetDataDocIds=[];
        var latestGetDataDateInReportInteger = parseInt(latestGetDataDateInReport)
        //console.log(docsIndex)
        for (var rowid in docsIndex.rows) {
          //console.log(docsIndex.rows[rowid].id)
          var docIdToCompare = docsIndex.rows[rowid].id;
          var docIdToCompareLength = docIdToCompare.length;
          var docsIndexDocDateToCompare = docIdToCompare.substring(docIdToCompareLength-14, docIdToCompareLength-4)
          var docsIndexDocDateToCompareInteger = parseInt(docsIndexDocDateToCompare)
          var includeDocsIndexDoc="no";
          if (!reportType) { //then do the old stuff for codewind installs report
            if ( (!docsIndex.rows[rowid].key.includes("-")) || (docsIndex.rows[rowid].key.includes("Codewind--EclipsePluginMarketplaceMetrics")) || (docsIndex.rows[rowid].key.includes("Codewind--VSCodePluginMarketplaceMetrics")) || (docsIndex.rows[rowid].key.includes("Codewind--JetBrainsPluginMarketplaceMetrics")) ) {
              includeDocsIndexDoc="yes"; //console.log("--a metrics doc: "+docsIndex.rows[rowid].key)
            }
          } else {
            if ( docsIndex.rows[rowid].key.includes(campaign+"--"+reportType)) {
              includeDocsIndexDoc="yes"; //console.log("--- DEBUG docsIndex.rows[rowid].key = "+docsIndex.rows[rowid].key)
            }
          }
          //console.log(docsIndexDocDateToCompareInteger+" > "+latestGetDataDateInReportInteger)
          if ( (docsIndexDocDateToCompareInteger > latestGetDataDateInReportInteger) && ( includeDocsIndexDoc === "yes" )) { // && (docsIndexCampaign === "Codewind") ) {
            //console.log(docsIndexDocDateToCompareInteger+" vs "+latestGetDataDateInReportInteger)
            newGetDataDocIds.push(docIdToCompare)
          } //else { console.log("NO") }
        }
        console.log("--newGetDataDocIds = "+newGetDataDocIds)
        resolve(newGetDataDocIds)
        console.log("ENDED: determineNewGetDataDocIds")
      });
    }

    async function buildNewInstallsReport(latestReport, newGetDataDocIds) { 
        console.log("START: buildNewReport")
        console.log("-- newGetDataDocIds = "+newGetDataDocIds)
        for (var newGetDataDocId in newGetDataDocIds) {
          var docUrl = newGetDataDocIds[newGetDataDocId] 
          var docUrl = 'http://' + username + ':' + password + '@datastore-default.apps.riffled.os.fyre.ibm.com/advocacy/'+docUrl;
          console.log("-- url to get = "+docUrl);
          var doc = await getDoc(docUrl)
          .then((doc) => processDoc(doc))
          //console.log("-- doc.dateTimeKey = "+doc.dateTimeKey)
          // if docDate not in report, then parse doc data and add to report
          var docDateInLastReport = "";
          var rememberReportMatchDocId = "";
          for (var latestReportDocId in latestReport.docs) {
            //console.log("-- test: "+doc.dateTimeKey+" vs"+latestReport.docs[latestReportDocId].dateTimeKey)
            //console.log("DEBUG:"); console.log(latestReport.docs[latestReportDocId])
            if ( doc.dateTimeKey === latestReport.docs[latestReportDocId].dateTimeKey) {
              docDateInLastReport="YEP";
              rememberReportMatchDocId=latestReportDocId
            }
          }
          if (docDateInLastReport === "YEP") {
            // if vs code, then how to merge:
            console.log("-- merge to existing Doc")
            if (doc.jetBrainsInstalls) {
              latestReport.docs[rememberReportMatchDocId].jetBrainsInstalls = doc.jetBrainsInstalls
              latestReport.docs[rememberReportMatchDocId].jetBrainsRating = doc.jetBrainsRating
            } else if (doc.vscodeInstalls) {
              latestReport.docs[rememberReportMatchDocId].vscodeInstalls = doc.vscodeInstalls
              latestReport.docs[rememberReportMatchDocId].vscodeAverageRating = doc.vscodeAverageRating
            } else if (doc.vscodeInstallsCodewindNodeProfiler) {
              console.log("-- doc.vscodeInstallsCodewindNodeProfiler -- CASE")
              latestReport.docs[rememberReportMatchDocId].vscodeInstallsCodewindNodeProfiler = doc.vscodeInstallsCodewindNodeProfiler
              latestReport.docs[rememberReportMatchDocId].vscodeAverageRatingCodewindNodeProfiler = doc.vscodeAverageRatingCodewindNodeProfiler
            } else if (doc.vscodeInstallsCodewindJavaProfiler) {
              latestReport.docs[rememberReportMatchDocId].vscodeInstallsCodewindJavaProfiler = doc.vscodeInstallsCodewindJavaProfiler
              latestReport.docs[rememberReportMatchDocId].vscodeAverageRatingCodewindJavaProfiler = doc.vscodeAverageRatingCodewindJavaProfiler
            } else if (doc.vscodeInstallsCodewindOpenApiTools) {
              latestReport.docs[rememberReportMatchDocId].vscodeInstallsCodewindOpenApiTools = doc.vscodeInstallsCodewindOpenApiTools
              latestReport.docs[rememberReportMatchDocId].vscodeAverageRatingCodewindOpenApiTools = doc.vscodeAverageRatingCodewindOpenApiTools
            } else if (doc.eclipseInstalls) {
              console.log("-- eclipse isntalls doc needs adding")
            }
          } else {
            console.log("-- push new Doc")
            latestReport.docs.push(doc)
          }
        }
        //latestReport = await latestReport.docs.sort( compare );
        latestReport.docs.sort( compare )
        // now need loop backwards through latest report, if it finds missing totals, it calcs them in 
        console.log("ENDED: buildNewReport")
        //latestReport = await fillMissingMetrics(latestReport);
        //console.log(latestReport)
        latestReport = await fillMissingMetrics(latestReport);
        latestReport = await calcMonthlyMetrics(latestReport);
        //latestReport = await calcMissingTotals(latestReport);
        // now update the report id to current timestamp
        //latestReport._id = latestReport._id.substring(0,latestReport._id.length-14)+flatternCurrentDateTimeStamp();
        //delete latestReport._id;
        delete latestReport._rev
        latestReport.dataCreatedTimestamp = dataCreatedTimestamp
        return latestReport
    }

    async function buildNewTwitterUserDataReport(latestReport, newGetDataDocIds, currentDateTimeKey) { 
      console.log("START: buildNewTwitterUserDataReport - at: "+currentDateTimeKey)
      console.log("-- DEBUG about to process:"); console.log(newGetDataDocIds)
      // set smartAdv report fields -and- creat data sub-object
      var newReport = {
        _id: reportId+"--"+reportIdDateTimeKey,
        reportType:reportType,
        TwitterScreenName:TwitterScreenName,
        dataCreatedTimestamp:dataCreatedTimestamp,
        dateTimeKey:currentDateTimeKey,
        data:{
          twitterUsers:{},
          monthlyMetrics:[],
          dailyMetrics:[],
          hourlyMetrics:[],
          twitterUserTimeline:[]
        }
      }

      // handle no previous latestReport exists, then initialise a new one to compare with later
      if ( latestReport.data ) {
        var previousTwitterUserTimeline=latestReport.data.twitterUserTimeline
        //console.log("-- DEBUG latestReport.data.dailyMetrics:"); console.log(latestReport.data.dailyMetrics)
        var previouslyReportedLatestHour=latestReport.data.hourlyMetrics[0].dateTimeKey; console.log("-- DEBUG previouslyReportedLatestHour = "+previouslyReportedLatestHour)
        newReport._id=reportId+"--"+reportIdDateTimeKey;
        newReport.reportType=latestReport.reportType,
        newReport.TwitterScreenName=latestReport.TwitterScreenName,
        newReport.dataCreatedTimestamp=dataCreatedTimestamp,
        newReport.dateTimeKey=latestReport.currentDateTimeKey,
        newReport.data.twitterUsers=latestReport.data.twitterUsers
        newReport.data.monthlyMetrics=latestReport.data.monthlyMetrics
        newReport.data.dailyMetrics=latestReport.data.dailyMetrics
        newReport.data.hourlyMetrics=latestReport.data.hourlyMetrics
        newReport.data.twitterUserTimeline=latestReport.data.twitterUserTimeline
      } else {
        var previousTwitterUserTimeline=[];
      }
  
     
       
      ///////////////////////////////////////////////////////////////
      ///// TEMP set NUMBER of couch doc to process to 4 only ///////
      //newGetDataDocIds=[newGetDataDocIds[0],newGetDataDocIds[1],newGetDataDocIds[2]];
      // newGetDataDocIds=[newGetDataDocIds[0],newGetDataDocIds[1],newGetDataDocIds[2],newGetDataDocIds[3]
      // ,newGetDataDocIds[5],newGetDataDocIds[6],newGetDataDocIds[7],newGetDataDocIds[8],newGetDataDocIds[9]];

      // ,newGetDataDocIds[10],newGetDataDocIds[11],newGetDataDocIds[12],newGetDataDocIds[13],newGetDataDocIds[14],
      // newGetDataDocIds[15],newGetDataDocIds[16],newGetDataDocIds[17],newGetDataDocIds[18],newGetDataDocIds[19]]
      ////////////////////////////////////////////////////////////////
       // for each couchDoc (oldest first)
      newGetDataDocIds=newGetDataDocIds.sort( );
      console.log("-- DEBUG about to process:"); console.log(newGetDataDocIds)
      //console.log("-- newGetDataDocIds = "+newGetDataDocIds)
      var numberOfNewGetDataDocId = newGetDataDocIds.length;
      //var previousDateTimeKey=0;
      for (var newGetDataDocId in newGetDataDocIds) { 
        console.log("--- DEBUG processing newGetDataDocId "+newGetDataDocId+" of "+numberOfNewGetDataDocId+" in couchDb doc");
        var docUrl = newGetDataDocIds[newGetDataDocId] 
        var docUrl = 'http://' + username + ':' + password + '@datastore-default.apps.riffled.os.fyre.ibm.com/advocacy/'+docUrl; //console.log("-- url to get = "+docUrl);
        //var couchDoc = await getDoc(docUrl)
        var dateTimeKeyPart=newGetDataDocIds[newGetDataDocId].split("--");
        var dateTimeKey=dateTimeKeyPart[2].substring(0,10); console.log("--- DEBUG dateTimeKey = "+dateTimeKey)
        var tempHourlyMetrics = {
          dateTimeKey:dateTimeKey,
          total: {followers:0,friends:0,usersFavorites:0,tweets:0,retweets:0,tweetFavorites:0},
          delta: {followers:0,friends:0,usersFavorites:0,tweets:0,tweetIds:[],retweets:0,retweetIds:[],tweetFavorites:0,favoriteIds:[]}
        }
        await getDoc(docUrl)
          .then((couchDoc) => {
            // -replace twitterUsers in newReport
            newReport.data.twitterUsers = couchDoc.twitterUsers;
            // -replace twitterUserTimeline in newReport
            newReport.data.twitterUserTimeline = couchDoc.twitterUserTimeline
            // handle twitterUsers metrics
            tempHourlyMetrics.total.followers=couchDoc.twitterUsers.followers_count
            tempHourlyMetrics.total.friends=couchDoc.twitterUsers.friends_count
            tempHourlyMetrics.total.usersFavorites=couchDoc.twitterUsers.favourites_count
            if (newReport.data.hourlyMetrics[0]) {
              tempHourlyMetrics.delta.followers=couchDoc.twitterUsers.followers_count - newReport.data.hourlyMetrics[0].total.followers
              tempHourlyMetrics.delta.friends=couchDoc.twitterUsers.friends_count - newReport.data.hourlyMetrics[0].total.friends
              tempHourlyMetrics.delta.usersFavorites=couchDoc.twitterUsers.favourites_count - newReport.data.hourlyMetrics[0].total.usersFavorites
            }
            // -for each couchDoc/tweet
            var numberOfTweetsInCouchDoc = couchDoc.twitterUserTimeline.length;
            console.log("--- DEBUG number of docs in previousTwitterUserTimeline = "+previousTwitterUserTimeline.length)
            for (var tweet in couchDoc.twitterUserTimeline) { //console.log("--- DEBUG processing tweet "+tweet+" of "+numberOfTweetsInCouchDoc+" in couchDb doc")
              tempHourlyMetrics.total.tweets=tempHourlyMetrics.total.tweets + 1
              tempHourlyMetrics.total.retweets=tempHourlyMetrics.total.retweets + couchDoc.twitterUserTimeline[tweet].retweet_count
              tempHourlyMetrics.total.tweetFavorites=tempHourlyMetrics.total.tweetFavorites + couchDoc.twitterUserTimeline[tweet].favorite_count
              // ---compare metrics to previousReport, to find deltas
              var isNewTweet="yes"; // set for run, will toggle to NO ifg a match is found
              for (var previousTweet in previousTwitterUserTimeline) {              
                if ( couchDoc.twitterUserTimeline[tweet].id == previousTwitterUserTimeline[previousTweet].id ) {
                  isNewTweet="no"
                  // tweet IS previously reported, so calc any deltas
                  var retweetDelta = couchDoc.twitterUserTimeline[tweet].retweet_count - previousTwitterUserTimeline[previousTweet].retweet_count
                  tempHourlyMetrics.delta.retweets = tempHourlyMetrics.delta.retweets + retweetDelta
                  var favoriteDelta = couchDoc.twitterUserTimeline[tweet].favorite_count - previousTwitterUserTimeline[previousTweet].favorite_count
                  tempHourlyMetrics.delta.tweetFavorites = tempHourlyMetrics.delta.tweetFavorites + favoriteDelta
                  // also store tweet IDs where deltas not ZERO
                  if ( retweetDelta != 0 ) {tempHourlyMetrics.delta.retweetIds.push(couchDoc.twitterUserTimeline[tweet].id)}
                  if ( favoriteDelta != 0 ) {tempHourlyMetrics.delta.favoriteIds.push(couchDoc.twitterUserTimeline[tweet].id)}
                } 
              }
              if ( isNewTweet=="yes" && previousTwitterUserTimeline.length>0 ) {
                console.log("--- DEBUG is "+couchDoc.twitterUserTimeline[tweet].id+" a newTweet = "+isNewTweet); 
                tempHourlyMetrics.delta.tweets = tempHourlyMetrics.delta.tweets + 1
                tempHourlyMetrics.delta.tweetIds.push(couchDoc.twitterUserTimeline[tweet].id)
                tempHourlyMetrics.delta.retweets = tempHourlyMetrics.delta.retweets + couchDoc.twitterUserTimeline[tweet].retweet_count
                if ( couchDoc.twitterUserTimeline[tweet].retweet_count != 0 ) {tempHourlyMetrics.delta.retweetIds.push(couchDoc.twitterUserTimeline[tweet].id)}
                tempHourlyMetrics.delta.tweetFavorites = tempHourlyMetrics.delta.tweetFavorites + couchDoc.twitterUserTimeline[tweet].favorite_count
                if ( couchDoc.twitterUserTimeline[tweet].favorite_count != 0 ) {tempHourlyMetrics.delta.favoriteIds.push(couchDoc.twitterUserTimeline[tweet].id)}
              }
              isNewTweet="yes"; // reset for next run
            }
          })
          // check start - Duplicate periodic metric found, so rolling up deltas
          var currentHour=dateTimeKey;
          if ( newReport.data.hourlyMetrics[0] ) {
            if ( currentHour == newReport.data.hourlyMetrics[0].dateTimeKey ) { console.log("--- DEBUG Duplicate periodic metric found, so rolling up deltas")
              tempHourlyMetrics.delta.followers = tempHourlyMetrics.delta.followers + newReport.data.hourlyMetrics[0].delta.followers
              tempHourlyMetrics.delta.friends = tempHourlyMetrics.delta.friends + newReport.data.hourlyMetrics[0].delta.friends
              tempHourlyMetrics.delta.usersFavorites = tempHourlyMetrics.delta.usersFavorites + newReport.data.hourlyMetrics[0].delta.usersFavorites
              for (var tempId in newReport.data.hourlyMetrics[0].delta.tweetIds) {
                tempHourlyMetrics.delta.tweetIds.push(newReport.data.hourlyMetrics[0].delta.tweetIds[tempId])
              }
              tempHourlyMetrics.delta.tweets = tempHourlyMetrics.delta.tweets + newReport.data.hourlyMetrics[0].delta.tweets
              for (var tempId in newReport.data.hourlyMetrics[0].delta.tweetIds) {
                tempHourlyMetrics.delta.tweetIds.push(newReport.data.hourlyMetrics[0].delta.tweetIds[tempId])
              } 
              tempHourlyMetrics.delta.retweets = tempHourlyMetrics.delta.retweets + newReport.data.hourlyMetrics[0].delta.retweets
              for (var tempId in newReport.data.hourlyMetrics[0].delta.retweetIds) {
                tempHourlyMetrics.delta.retweetIds.push(newReport.data.hourlyMetrics[0].delta.retweetIds[tempId])
              } 
              tempHourlyMetrics.delta.tweetFavorites = tempHourlyMetrics.delta.tweetFavorites + newReport.data.hourlyMetrics[0].delta.tweetFavorites
              for (var tempId in newReport.data.hourlyMetrics[0].delta.favoriteIds) {
                tempHourlyMetrics.delta.favoriteIds.push(newReport.data.hourlyMetrics[0].delta.favoriteIds[tempId])
              } 
            }
          }
          // check end - Duplicate periodic metric found, so rolling up deltas
          // now write temp metrics to newReport
          var tempObj=[];
          tempObj.push(tempHourlyMetrics)
          for (var hourlyMetricInstance in newReport.data.hourlyMetrics ){
            if (newReport.data.hourlyMetrics[hourlyMetricInstance].dateTimeKey != tempHourlyMetrics.dateTimeKey) {
              tempObj.push(newReport.data.hourlyMetrics[hourlyMetricInstance])
            }
          }
          newReport.data.hourlyMetrics=tempObj;
          // remember previous tweets, before sarting to process next couch doc
          previousTwitterUserTimeline=newReport.data.twitterUserTimeline;
      }

      // NEXT PROCESS daily metrics..
      var numberOfHourlyMetrics=newReport.data.hourlyMetrics.length; console.log("--DEBUG numberOfHourlyMetrics = "+numberOfHourlyMetrics)
      for (var numberOfHourlyMetrics=newReport.data.hourlyMetrics.length; numberOfHourlyMetrics > 0; numberOfHourlyMetrics--) {
        var elementNumber=numberOfHourlyMetrics-1; console.log(elementNumber);
        if ( newReport.data.dailyMetrics.length == 0 ) { console.log("---DEBUG no previous dailyMetrics ever")
          var yyMmDd=newReport.data.hourlyMetrics[0].dateTimeKey.substring(0,8); console.log(yyMmDd)
          newReport.data.dailyMetrics = [{
            dateTimeKey:yyMmDd,
            total:{
              followers:newReport.data.hourlyMetrics[0].total.followers,
              friends:newReport.data.hourlyMetrics[0].total.friends,
              usersFavorites:newReport.data.hourlyMetrics[0].total.usersFavorites,
              tweets:newReport.data.hourlyMetrics[0].total.tweets,
              retweets:newReport.data.hourlyMetrics[0].total.retweets,
              tweetFavorites:newReport.data.hourlyMetrics[0].total.tweetFavorites},
            delta:{
              followers:newReport.data.hourlyMetrics[0].delta.followers,
              friends:newReport.data.hourlyMetrics[0].delta.friends,
              usersFavorites:newReport.data.hourlyMetrics[0].delta.usersFavorites,
              tweets:newReport.data.hourlyMetrics[0].delta.tweets,
              tweetIds:newReport.data.hourlyMetrics[0].delta.tweetIds,
              retweets:newReport.data.hourlyMetrics[0].delta.retweets,
              retweetIds:newReport.data.hourlyMetrics[0].delta.retweetIds,
              tweetFavorites:newReport.data.hourlyMetrics[0].delta.tweetFavorites,
              favoriteIds:newReport.data.hourlyMetrics[0].delta.favoriteIds}
          }]
        } else { console.log("---DEBUG previous dailyMetrics pre-exists")
          // only process hourMetrics not previously reported
          console.log("-- DEBUG previouslyReportedLatestHour = "+previouslyReportedLatestHour)
          // ignore hourlyMetrics entries previously included in a latestReport
          if (newReport.data.hourlyMetrics[elementNumber].dateTimeKey > previouslyReportedLatestHour) {  
            // if day changed, create new daily materics, else append
            var yyMmDd=newReport.data.hourlyMetrics[elementNumber].dateTimeKey.substring(0,8); console.log(yyMmDd)
            var mostRecentDailMetricYyMmDd=newReport.data.dailyMetrics[0].dateTimeKey; console.log(mostRecentDailMetricYyMmDd)
            var thisHourMetricYyMmDd=newReport.data.hourlyMetrics[elementNumber].dateTimeKey.substring(0,8); console.log(thisHourMetricYyMmDd)
            if (mostRecentDailMetricYyMmDd != thisHourMetricYyMmDd ){ console.log("---DEBUG day CHANGED")
              var tempDailyMetrics = {
                dateTimeKey:yyMmDd,
                total:{
                  followers:newReport.data.hourlyMetrics[elementNumber].total.followers,
                  friends:newReport.data.hourlyMetrics[elementNumber].total.friends,
                  usersFavorites:newReport.data.hourlyMetrics[elementNumber].total.usersFavorites,
                  tweets:newReport.data.hourlyMetrics[elementNumber].total.tweets,
                  retweets:newReport.data.hourlyMetrics[elementNumber].total.retweets,
                  tweetFavorites:newReport.data.hourlyMetrics[elementNumber].total.tweetFavorites},
                delta:{
                  followers:newReport.data.hourlyMetrics[elementNumber].delta.followers,
                  friends:newReport.data.hourlyMetrics[elementNumber].delta.friends,
                  usersFavorites:newReport.data.hourlyMetrics[elementNumber].delta.usersFavorites,
                  tweets:newReport.data.hourlyMetrics[elementNumber].delta.tweets,
                  tweetIds:newReport.data.hourlyMetrics[elementNumber].delta.tweetIds,
                  retweets:newReport.data.hourlyMetrics[elementNumber].delta.retweets,
                  retweetIds:newReport.data.hourlyMetrics[elementNumber].delta.retweetIds,
                  tweetFavorites:newReport.data.hourlyMetrics[elementNumber].delta.tweetFavorites,
                  favoriteIds:newReport.data.hourlyMetrics[elementNumber].delta.favoriteIds}
              }
            } else { console.log("---DEBUG day NOT changed")
              // csonsolidate metrics
              var tempDailyMetrics = {
                dateTimeKey:yyMmDd,
                total:{
                  followers:newReport.data.hourlyMetrics[elementNumber].total.followers,
                  friends:newReport.data.hourlyMetrics[elementNumber].total.friends,
                  usersFavorites:newReport.data.hourlyMetrics[elementNumber].total.usersFavorites,
                  tweets:newReport.data.hourlyMetrics[elementNumber].total.tweets,
                  retweets:newReport.data.hourlyMetrics[elementNumber].total.retweets,
                  tweetFavorites:newReport.data.hourlyMetrics[elementNumber].total.tweetFavorites},
                delta:{
                  followers:newReport.data.hourlyMetrics[elementNumber].delta.followers + newReport.data.dailyMetrics[0].delta.followers,
                  friends:newReport.data.hourlyMetrics[elementNumber].delta.friends + newReport.data.dailyMetrics[0].delta.friends,
                  usersFavorites:newReport.data.hourlyMetrics[elementNumber].delta.usersFavorites + newReport.data.dailyMetrics[0].delta.usersFavorites,
                  tweets:newReport.data.hourlyMetrics[elementNumber].delta.tweets + newReport.data.dailyMetrics[0].delta.tweets,
                  tweetIds:newReport.data.hourlyMetrics[elementNumber].delta.tweetIds.concat(newReport.data.dailyMetrics[0].delta.tweetIds),
                  retweets:newReport.data.hourlyMetrics[elementNumber].delta.retweets + newReport.data.dailyMetrics[0].delta.retweets,
                  retweetIds:newReport.data.hourlyMetrics[elementNumber].delta.retweetIds.concat(newReport.data.dailyMetrics[0].delta.retweetIds),
                  tweetFavorites:newReport.data.hourlyMetrics[elementNumber].delta.tweetFavorites + newReport.data.dailyMetrics[0].delta.tweetFavorites,
                  favoriteIds:newReport.data.hourlyMetrics[elementNumber].delta.favoriteIds.concat(newReport.data.dailyMetrics[0].delta.favoriteIds)}
              }
              // remove previous dailyMetrics (which is about to be replaced)
              newReport.data.dailyMetrics.splice(0,1);
            }
            var tempObj=[];
            tempObj.push(tempDailyMetrics)
            for (var dailyMetric in newReport.data.dailyMetrics) {
              tempObj.push(newReport.data.dailyMetrics[dailyMetric])
            }
            newReport.data.dailyMetrics=tempObj;
          }
        }
      }

      // NEXT PROCESS monthly metrics..
      console.log("START processing MONTHLY metrics")
      newReport.data.monthlyMetrics=[];
      var numberOfDailyMetrics=newReport.data.dailyMetrics.length; console.log("--- DEBUG numberOfDailyMetrics = "+numberOfDailyMetrics)
      for (var numberOfDailyMetrics=newReport.data.dailyMetrics.length; numberOfDailyMetrics > 0; numberOfDailyMetrics--) {
        var elementNumber=numberOfDailyMetrics-1; console.log("---DEBUG processing "+newReport.data.dailyMetrics[elementNumber].dateTimeKey+" which is elementNumber: "+elementNumber);
        //var elementNumber=numberOfDailyMetrics-1; console.log("--- DEBUG processing metric = "+elementNumber);
        if ( newReport.data.monthlyMetrics.length == 0 ) { console.log("--- DEBUG -- no previous monthlyMetrics ever")
          var yyMm=newReport.data.dailyMetrics[elementNumber].dateTimeKey.substring(0,6); //console.log(yyMm)
          newReport.data.monthlyMetrics = [{
            dateTimeKey:yyMm,
            total:{
              followers:newReport.data.dailyMetrics[elementNumber].total.followers,
              friends:newReport.data.dailyMetrics[elementNumber].total.friends,
              usersFavorites:newReport.data.dailyMetrics[elementNumber].total.usersFavorites,
              tweets:newReport.data.dailyMetrics[elementNumber].total.tweets,
              retweets:newReport.data.dailyMetrics[elementNumber].total.retweets,
              tweetFavorites:newReport.data.dailyMetrics[elementNumber].total.tweetFavorites
            },
            delta:{
              followers:newReport.data.dailyMetrics[elementNumber].delta.followers,
              friends:newReport.data.dailyMetrics[elementNumber].delta.friends,
              usersFavorites:newReport.data.dailyMetrics[elementNumber].delta.usersFavorites,
              tweets:newReport.data.dailyMetrics[elementNumber].delta.tweets,
              tweetIds:newReport.data.dailyMetrics[elementNumber].delta.tweetIds,
              retweets:newReport.data.dailyMetrics[elementNumber].delta.retweets,
              retweetIds:newReport.data.dailyMetrics[elementNumber].delta.retweetIds,
              tweetFavorites:newReport.data.dailyMetrics[elementNumber].delta.tweetFavorites,
              favoriteIds:newReport.data.dailyMetrics[elementNumber].delta.favoriteIds
            }
          }]
        } else { 
          console.log("---DEBUG -- previous monthlyMetrics pre-exists")
          // only process hourMetrics not previously reported
          console.log("---DEBUG previouslyReportedLatestHour = "+previouslyReportedLatestHour)
          // ignore dailyMetrics entries previously included in a latestReport
          //if (newReport.data.dailyMetrics[elementNumber].dateTimeKey > previouslyReportedLatestHour) {
          if ( 1 == 1) { // ALWAYS do:  
            // if day changed, create new monthly materics, else append
            var yyMm=newReport.data.dailyMetrics[elementNumber].dateTimeKey.substring(0,6); //console.log(yyMm)
            var mostRecentDailyMetricYyMmDd=newReport.data.monthlyMetrics[0].dateTimeKey; //console.log(mostRecentDailyMetricYyMmDd)
            var thisHourMetricYyMmDd=newReport.data.dailyMetrics[elementNumber].dateTimeKey.substring(0,6); //console.log(thisHourMetricYyMmDd)
            if (mostRecentDailyMetricYyMmDd != thisHourMetricYyMmDd ){ 
              console.log("---DEBUG -- month CHANGED")
              var tempMonthlyMetrics = {
                dateTimeKey:yyMm,
                total:{
                  followers:newReport.data.dailyMetrics[elementNumber].total.followers,
                  friends:newReport.data.dailyMetrics[elementNumber].total.friends,
                  usersFavorites:newReport.data.dailyMetrics[elementNumber].total.usersFavorites,
                  tweets:newReport.data.dailyMetrics[elementNumber].total.tweets,
                  retweets:newReport.data.dailyMetrics[elementNumber].total.retweets,
                  tweetFavorites:newReport.data.dailyMetrics[elementNumber].total.tweetFavorites
                },
                delta:{
                  followers:newReport.data.dailyMetrics[elementNumber].delta.followers,
                  friends:newReport.data.dailyMetrics[elementNumber].delta.friends,
                  usersFavorites:newReport.data.dailyMetrics[elementNumber].delta.usersFavorites,
                  tweets:newReport.data.dailyMetrics[elementNumber].delta.tweets,
                  tweetIds:newReport.data.dailyMetrics[elementNumber].delta.tweetIds,
                  retweets:newReport.data.dailyMetrics[elementNumber].delta.retweets,
                  retweetIds:newReport.data.dailyMetrics[elementNumber].delta.retweetIds,
                  tweetFavorites:newReport.data.dailyMetrics[elementNumber].delta.tweetFavorites,
                  favoriteIds:newReport.data.dailyMetrics[elementNumber].delta.favoriteIds
                }
              }
            } else { 
              console.log("---DEBUG -- month NOT changed, consolidate metrics")
              // csonsolidate metrics
              var tempFollowers=[];
              if ( !newReport.data.monthlyMetrics[0].delta.followers ) { 
                tempFollowers = newReport.data.dailyMetrics[elementNumber].delta.followers
                console.log("---DEBUG -- delta.followers does NOT exist")
              } else {
                tempFollowers = newReport.data.monthlyMetrics[0].delta.followers + newReport.data.dailyMetrics[elementNumber].delta.followers
                console.log("---DEBUG -- delta.followers DOES exist")
              }
              var tempFriends=[];
              if ( !newReport.data.monthlyMetrics[0].delta.friends ) { 
                tempFriends = newReport.data.dailyMetrics[elementNumber].delta.friends
                console.log("---DEBUG -- delta.friends does NOT exist")
              } else {
                tempFriends = newReport.data.monthlyMetrics[0].delta.friends + newReport.data.dailyMetrics[elementNumber].delta.friends
                console.log("---DEBUG -- delta.friends DOES exist")
              }
              var tempUsersFavorites=[];
              if ( !newReport.data.monthlyMetrics[0].delta.usersFavorites ) { 
                tempUsersFavorites = newReport.data.dailyMetrics[elementNumber].delta.usersFavorites
                console.log("---DEBUG -- delta.usersFavorites does NOT exist")
              } else {
                tempUsersFavorites = newReport.data.monthlyMetrics[0].delta.usersFavorites + newReport.data.dailyMetrics[elementNumber].delta.usersFavorites
                console.log("---DEBUG -- delta.usersFavorites DOES exist")
              }
              var tempTweets=[];
              if ( !newReport.data.monthlyMetrics[0].delta.tweets ) { 
                tempTweets = newReport.data.dailyMetrics[elementNumber].delta.tweets
                console.log("---DEBUG -- delta.tweets does NOT exist")
              } else {
                tempTweets = newReport.data.monthlyMetrics[0].delta.tweets + newReport.data.dailyMetrics[elementNumber].delta.tweets
                console.log("---DEBUG -- delta.tweets DOES exist")
              }
              var tempTweetIds=[];
              if ( !newReport.data.monthlyMetrics[0].delta.tweetIds ) { 
                tempTweetIds = newReport.data.dailyMetrics[elementNumber].delta.tweetIds
                console.log("---DEBUG -- delta.tweetIds does NOT exist")
              } else {
                tempTweetIds = newReport.data.monthlyMetrics[0].delta.tweetIds.concat(newReport.data.dailyMetrics[elementNumber].delta.tweetIds)
                console.log("---DEBUG -- delta.tweetIds DOES exist")
              }
              var tempRetweets=[];
              if ( !newReport.data.monthlyMetrics[0].delta.retweets ) { 
                tempRetweets = newReport.data.dailyMetrics[elementNumber].delta.retweets
                console.log("---DEBUG -- delta.retweets does NOT exist")
              } else {
                tempRetweets = newReport.data.monthlyMetrics[0].delta.retweets + newReport.data.dailyMetrics[elementNumber].delta.retweets
                console.log("---DEBUG -- delta.retweets DOES exist")
              }
              var tempRetweetIds=[];
              if ( !newReport.data.monthlyMetrics[0].delta.retweetIds ) { 
                tempRetweetIds = newReport.data.dailyMetrics[elementNumber].delta.retweetIds
                console.log("---DEBUG -- delta.retweetIds does NOT exist")
              } else {
                tempRetweetIds = newReport.data.monthlyMetrics[0].delta.retweetIds.concat(newReport.data.dailyMetrics[elementNumber].delta.retweetIds)
                console.log("---DEBUG -- delta.retweetIds DOES exist")
              }
              var tempTweetFavorites=[];
              if ( !newReport.data.monthlyMetrics[0].delta.tweetFavorites ) { 
                tempTweetFavorites = newReport.data.dailyMetrics[elementNumber].delta.tweetFavorites
                console.log("---DEBUG -- delta.tweetFavorites does NOT exist")
              } else {
                tempTweetFavorites = newReport.data.monthlyMetrics[0].delta.tweetFavorites + newReport.data.dailyMetrics[elementNumber].delta.tweetFavorites
                console.log("---DEBUG -- delta.tweetFavorites DOES exist")
              }
              var tempFavoriteIds=[];
              if ( !newReport.data.monthlyMetrics[0].delta.favoriteIds ) { 
                tempFavoriteIds = newReport.data.dailyMetrics[elementNumber].delta.favoriteIds
                console.log("---DEBUG -- delta.favoriteIds does NOT exist")
              } else {
                tempFavoriteIds = newReport.data.monthlyMetrics[0].delta.favoriteIds.concat(newReport.data.dailyMetrics[elementNumber].delta.favoriteIds)
                console.log("---DEBUG -- delta.favoriteIds DOES exist")
              }
              var tempMonthlyMetrics = {
                dateTimeKey:yyMm,
                total:{
                  followers:newReport.data.dailyMetrics[elementNumber].total.followers,
                  friends:newReport.data.dailyMetrics[elementNumber].total.friends,
                  usersFavorites:newReport.data.dailyMetrics[elementNumber].total.usersFavorites,
                  tweets:newReport.data.dailyMetrics[elementNumber].total.tweets,
                  retweets:newReport.data.dailyMetrics[elementNumber].total.retweets,
                  tweetFavorites:newReport.data.dailyMetrics[elementNumber].total.tweetFavorites
                },
                delta:{
                  followers:tempFollowers,
                  friends:tempFriends,
                  usersFavorites:tempUsersFavorites,
                  tweets:tempTweets,
                  tweetIds:tempTweetIds,
                  retweets:tempRetweets,
                  retweetIds:tempRetweetIds,
                  tweetFavorites:tempTweetFavorites,
                  favoriteIds:tempFavoriteIds
                }
              }
              // remove previous monthlyMetrics (which is about to be replaced)
              newReport.data.monthlyMetrics.splice(0,1);
            }
            var tempObj=[];
            tempObj.push(tempMonthlyMetrics)
            for (var monthlyMetric in newReport.data.monthlyMetrics) {
              tempObj.push(newReport.data.monthlyMetrics[monthlyMetric])
            }
            newReport.data.monthlyMetrics=tempObj;
          } else { console.log("---DEBUG -- ignore dailyMetric which was previously rolled up into a daily one")}
        }
      }
      console.log("ENDED processing MONTHLY metrics")



      console.log("ENDED: buildNewTwitterUserDataReport")
      return newReport
  }

  async function buildNewYouTubeChannelReport(latestReport, newGetDataDocIds, currentDateTimeKey) { 
    console.log("START: buildNewYouTubeChannelReport") //console.log("-- DEBUG about to process:"); console.log(newGetDataDocIds)
    // set smartAdv report fields -and- creat data sub-object
    var newReport = {
      _id: reportId+"--"+currentDateTimeKey,
      reportType:reportType,
      dataCreatedTimestamp:dataCreatedTimestamp,
      dateTimeKey:currentDateTimeKey,
      data:{
        videos:[],
        monthlyMetrics:[],
        dailyMetrics:[],
        hourlyMetrics:[]
      }
    }
    // handle no previous latestReport exists, then initialise a new one to compare with later
    if ( latestReport.data ) {
      var previousVideos=latestReport.data.videos
      console.log("-- DEBUG latestReport.data.dailyMetrics = "+latestReport.data.dailyMetrics)
      //var previouslyReportedLatestHour=latestReport.data.hourlyMetrics[0].dateTimeKey; console.log("-- DEBUG previouslyReportedLatestHour = "+previouslyReportedLatestHour)
    // } else if ( newReport.data.videos.length < 1) {
    //   // console.log("--- DEBUG setting ")
    //   var previousVideos=newReport.data.videos;
    //console.log("-- DEBUG latestReport.data.dailyMetrics:"); console.log(latestReport.data.dailyMetrics)
      var previouslyReportedLatestHour=latestReport.data.hourlyMetrics[0].dateTimeKey; console.log("-- DEBUG previouslyReportedLatestHour = "+previouslyReportedLatestHour)
      newReport._id=reportId+"--"+reportIdDateTimeKey;
      newReport.reportType=latestReport.reportType,
      newReport.data.videos=latestReport.videos,
      newReport.dateTimeKey=currentDateTimeKey,
      newReport.data.monthlyMetrics=latestReport.data.monthlyMetrics
      newReport.data.dailyMetrics=latestReport.data.dailyMetrics
      newReport.data.hourlyMetrics=latestReport.data.hourlyMetrics
    } else {
      console.log("--- DEBUG setting previousVideos to an EMPTY array")
      var previousVideos=[];
      var previouslyReportedLatestHour=20200101
    } console.log("--- DEBUG newReport:"); console.log(newReport)

    // for each couchDoc (oldest first)
    newGetDataDocIds=newGetDataDocIds.sort( ); 
    ///////////////////////////////////////////////////////////////
    ///// TEMP set NUMBER of couch doc to process to 4 only ///////
    //newGetDataDocIds=[newGetDataDocIds[0],newGetDataDocIds[1],newGetDataDocIds[2]];
    //////////////////////////////////////////////////////////////
    console.log("-- DEBUG about to process:"); console.log(newGetDataDocIds)

    // process each new get-data doc/////
    var numberOfNewGetDataDocId = newGetDataDocIds.length;
    //var previousDateTimeKey=0;
    for (var newGetDataDocId in newGetDataDocIds) { 
      console.log("--- DEBUG processing newGetDataDocId "+newGetDataDocId+" of "+numberOfNewGetDataDocId+" in couchDb doc");
      var docUrl = newGetDataDocIds[newGetDataDocId];  var docUrl = 'http://' + username + ':' + password + '@datastore-default.apps.riffled.os.fyre.ibm.com/advocacy/'+docUrl; //console.log("-- url to get = "+docUrl);
      //var couchDoc = await getDoc(docUrl)
      var dateTimeKeyPart=newGetDataDocIds[newGetDataDocId].split("--"); var yyyyMmDdHh=dateTimeKeyPart[2].substring(0,10); console.log("--- DEBUG yyyyMmDdHh = "+yyyyMmDdHh)
      var tempHourlyMetrics = {
        dateTimeKey:yyyyMmDdHh,
        total: {views:0,likes:0,dislikes:0},
        delta: {views:0,viewIds:[],likes:0,likeIds:[],dislikes:0,dislikeIds:[]}
      }
      await getDoc(docUrl)
        .then((couchDoc) => { //console.log(couchDoc)
          /// IMPORTANT - sometimes youTube data includes NULLs, 
          /// so step 1 is to update the inventory of videos data, and retain previous video data if new data is NULL
          /// so loop through previous inventory and update if values changes in this new data (ignore if NULL in this new data)
          var tempVideos=[];
          if ( previousVideos.length == 0 ) {
            console.log("---DEBUG - NO previous videos EVER, so initialling data for the first time NOW, with:"); //console.log(couchDoc.metrics)
            for (var couchVideo in couchDoc.metrics) { //console.log("--- DEBUG couchDoc.metrics[couchVideo]:"); console.log(couchDoc.metrics[couchVideo])
              if (couchDoc.metrics[couchVideo] == null) { 
                console.log("--- DEBUG do nothing for 'null' entry in couchDB doc") } 
              else { 
                console.log("--- DEBUG pushed video: "+couchDoc.metrics[couchVideo].videoCode)             
                newReport.data.videos.push(couchDoc.metrics[couchVideo])
              }
            }
            //previousVideos=newReport.data.videos; //console.log("--- DEBUG previousVideos:");console.log(previousVideos)
          } else {            
            console.log("HAS PREVIOUS Vids")
            for (var couchVideo in couchDoc.metrics) {
              var isCouchVideoFound=0
              if (couchDoc.metrics[couchVideo] == null) { console.log("--- DEBUG do nothing for 'null' entry in couchDB doc") } 
              else {
                for (var previousVideo in previousVideos) {
                  if ( couchDoc.metrics[couchVideo].videoCode == previousVideos[previousVideo].videoCode ) { 
                    isCouchVideoFound=1;
                  }
                } 
                if ( isCouchVideoFound == 0 ) {
                  console.log("--- DEBUG missing video detected = "+couchDoc.metrics[couchVideo].videoCode)
                  tempVideos.push(couchDoc.metrics[couchVideo])
                  console.log("--- DEBUG pushed video: "+couchDoc.metrics[couchVideo].videoCode)
                } else {
                  // now handle (retain old value) if a specific video metric is null
                  if (couchDoc.metrics[couchVideo].views != null ){
                    //console.log("--- DEBUG here - couchDoc.metrics[couchVideo].views = "+couchDoc.metrics[couchVideo].views)
                    var tempViews=couchDoc.metrics[couchVideo].views
                  } else {
                    var tempViews=previousVideos[previousVideo].views
                    //console.log("--- DEBUG here - previousVideos[previousVideo].views = "+previousVideos[previousVideo].views)
                  }
                  if (couchDoc.metrics[couchVideo].likes!=null){var tempLikes=couchDoc.metrics[couchVideo].likes} else {var tempLikes=previousVideos[previousVideo].likes}
                  if (couchDoc.metrics[couchVideo].dislikes!=null){var tempDislikes=couchDoc.metrics[couchVideo].dislikes} else {var tempDislikes=previousVideos[previousVideo].dislikes}                   
                  var tempVideo={
                    dataType:couchDoc.metrics[couchVideo].dataType,
                    dataCreatedTimeStamp:couchDoc.metrics[couchVideo].dataCreatedTimeStamp,
                    uri:couchDoc.metrics[couchVideo].uri,
                    videoCode:couchDoc.metrics[couchVideo].videoCode,
                    title:couchDoc.metrics[couchVideo].title,
                    datePublished:couchDoc.metrics[couchVideo].datePublished,
                    views:tempViews,
                    likes:tempLikes,
                    dislikes:tempDislikes
                  }
                  tempVideos.push(tempVideo)
                }
              }
              
            }

            //now make sure NO vidoes missing in new video data, from old videos
            if ( previousVideos != [] ) {
              //console.log("--- DEBUG testing for missing previous VIDs to restore"); console.log("--- DEBUG previousVideos:"); console.log(previousVideos)
              for(var previousVideo in previousVideos) {
                var isPreviousVideoFound = 0
                for (var tempVideo in tempVideos) {
                  //console.log("TESTING "+tempVideos[tempVideo].videoCode+" vs "+previousVideos[previousVideo].videoCode)
                  if (tempVideos[tempVideo].videoCode == previousVideos[previousVideo].videoCode ) { 
                    isPreviousVideoFound = 1; //console.log("--- DEBUG ignore previous video found")
                  }
                }
                if ( isPreviousVideoFound == 0 ) {
                  console.log("--- DEBUG old video missing from new data, so restoring: "+previousVideos[previousVideo].videoCode)
                  tempVideos.push(previousVideos[previousVideo])
                }
              }
            }
            newReport.data.videos = tempVideos
          }
          //previousVideos = newReport.data.videos; console.log("--- DEBUG previousVideos.length = "+previousVideos.length)



          // now newReport.data.videos has newst data, time to crunch HOURLY metrics
          for (var video in newReport.data.videos) {
            tempHourlyMetrics.total.views=tempHourlyMetrics.total.views + newReport.data.videos[video].views; 
            tempHourlyMetrics.total.likes=tempHourlyMetrics.total.likes + newReport.data.videos[video].likes;
            tempHourlyMetrics.total.dislikes=tempHourlyMetrics.total.dislikes + newReport.data.videos[video].dislikes;
            if (newReport.data.hourlyMetrics.length > 0) { 
              //console.log("--- DEBUG previousHourly metrics exists, so crunch DELTAs now")
              tempHourlyMetrics.delta.views=tempHourlyMetrics.total.views - newReport.data.hourlyMetrics[0].total.views; 
              for (var i = 0; i < tempHourlyMetrics.delta.views; i++) {
                tempHourlyMetrics.delta.viewIds.push(newReport.data.videos[video].videoCode)
              }
              tempHourlyMetrics.delta.likes=tempHourlyMetrics.total.likes - newReport.data.hourlyMetrics[0].total.likes;
              for (var i = 0; i < tempHourlyMetrics.delta.likes; i++) {
                tempHourlyMetrics.delta.likeIds.push(newReport.data.videos[video].videoCode)
              }
              tempHourlyMetrics.delta.dislikes=tempHourlyMetrics.total.dislikes - newReport.data.hourlyMetrics[0].total.dislikes; 
              for (var i = 0; i < tempHourlyMetrics.delta.dislikes; i++) {
                tempHourlyMetrics.delta.dislikeIds.push(newReport.data.videos[video].videoCode)
              }
             
            } else { 
              //console.log("--- DEBUG previousHourly metrics does NOT exist, set them now") 
              tempHourlyMetrics.delta.views=tempHourlyMetrics.total.views; 
              tempHourlyMetrics.delta.likes=tempHourlyMetrics.total.likes; 
              tempHourlyMetrics.delta.dislikes=tempHourlyMetrics.total.dislikes; 
            }
          }

          previousVideos = newReport.data.videos; console.log("--- DEBUG previousVideos.length = "+previousVideos.length)


          // check start - Duplicate periodic metric found, so rolling up deltas
          // if ( newReport.data.hourlyMetrics[0] ) {
          //   if ( yyyyMmDdHh == newReport.data.hourlyMetrics[0].dateTimeKey ) { 
          //     console.log("--- DEBUG Duplicate periodic metric found, so rolling up deltas")
          //     //tempHourlyMetrics.total.views = tempHourlyMetrics.total.views
          //     //tempHourlyMetrics.total.likes = tempHourlyMetrics.total.likes
          //     //tempHourlyMetrics.total.dislikes = tempHourlyMetrics.total.dislikes
          //     tempHourlyMetrics.delta.views = tempHourlyMetrics.total.views - newReport.data.hourlyMetrics[0].total.views
          //     tempHourlyMetrics.delta.likes = tempHourlyMetrics.total.likes - newReport.data.hourlyMetrics[0].total.likes
          //     tempHourlyMetrics.delta.dislikes = tempHourlyMetrics.total.dislikes - newReport.data.hourlyMetrics[0].total.dislikes
          //   }
          // }
          // check end - Duplicate periodic metric found, so rolling up deltas

          // now write temp metrics to newReport
          var tempObj=[];
          tempObj.push(tempHourlyMetrics)
          for (var hourlyMetricInstance in newReport.data.hourlyMetrics ){
            //if (newReport.data.hourlyMetrics[hourlyMetricInstance].dateTimeKey != tempHourlyMetrics.dateTimeKey) {
              tempObj.push(newReport.data.hourlyMetrics[hourlyMetricInstance])
            //}
          }
          newReport.data.hourlyMetrics=tempObj;
        })
    }



    // NEXT PROCESS daily metrics..
    console.log("START crunching DAILY METRICS")
    var numberOfHourlyMetrics=newReport.data.hourlyMetrics.length; //console.log("--DEBUG numberOfHourlyMetrics = "+numberOfHourlyMetrics)
    for (var numberOfHourlyMetrics=newReport.data.hourlyMetrics.length; numberOfHourlyMetrics > 0; numberOfHourlyMetrics--) {
      var elementNumber=numberOfHourlyMetrics-1; console.log("---DEBUG processing "+newReport.data.hourlyMetrics[elementNumber].dateTimeKey+" which is elementNumber: "+elementNumber);
      if ( newReport.data.dailyMetrics.length == 0 ) { console.log("---DEBUG -- no previous dailyMetrics ever")
        var yyMmDd=newReport.data.hourlyMetrics[elementNumber].dateTimeKey.substring(0,8); //console.log(yyMmDd)
        newReport.data.dailyMetrics = [{
          dateTimeKey:yyMmDd,
          total:{
            views:newReport.data.hourlyMetrics[elementNumber].total.views,
            likes:newReport.data.hourlyMetrics[elementNumber].total.likes,
            dislikes:newReport.data.hourlyMetrics[elementNumber].total.dislikes
          },
          delta:{
            views:0,
            viewIds:[],
            likes:0,
            likeId:[],
            dislikes:0,
            dislikeIds:[]
          }
        }]
      } else { console.log("---DEBUG -- previous dailyMetrics pre-exists")
        // only process hourMetrics not previously reported
        //console.log("--- DEBUG previouslyReportedLatestHour = "+previouslyReportedLatestHour)
        // ignore hourlyMetrics entries previously included in a latestReport
        if (newReport.data.hourlyMetrics[elementNumber].dateTimeKey > previouslyReportedLatestHour) {  
          console.log("---DEBUG -- this is a NEW hourlyMetric")
          // if day changed, create new daily materics, else append
          var yyMmDd=newReport.data.hourlyMetrics[elementNumber].dateTimeKey.substring(0,8); //console.log(yyMmDd)
          var mostRecentDailMetricYyMmDd=newReport.data.dailyMetrics[0].dateTimeKey; //console.log(mostRecentDailMetricYyMmDd)
          var thisHourMetricYyMmDd=newReport.data.hourlyMetrics[elementNumber].dateTimeKey.substring(0,8); //console.log(thisHourMetricYyMmDd)
          if (mostRecentDailMetricYyMmDd != thisHourMetricYyMmDd ){ console.log("---DEBUG -- day CHANGED in Hourly metrics (easy case, just use hourly values)")
            var tempDailyMetrics = {
              dateTimeKey:yyMmDd,
              total:{
                views:newReport.data.hourlyMetrics[elementNumber].total.views,
                likes:newReport.data.hourlyMetrics[elementNumber].total.likes,
                dislikes:newReport.data.hourlyMetrics[elementNumber].total.dislikes
              },
              delta:{
                views:newReport.data.hourlyMetrics[elementNumber].delta.views,
                viewIds:newReport.data.hourlyMetrics[elementNumber].delta.viewIds,
                likes:newReport.data.hourlyMetrics[elementNumber].delta.likes,
                likeIds:newReport.data.hourlyMetrics[elementNumber].delta.likeIds,
                dislikes:newReport.data.hourlyMetrics[elementNumber].delta.dislikes,
                dislikeIds:newReport.data.hourlyMetrics[elementNumber].delta.dislikeIds
              }
            }
          } else { console.log("---DEBUG -- day NOT changed (harder case, need to consolidate hourly values)")
            // csonsolidate metrics
            // first handle any 'nulls'
            // if (!newReport.data.hourlyMetrics[elementNumber].delta || newReport.data.hourlyMetrics[elementNumber].delta.viewIds == null ) { 
            //   console.log("---DEBUG ignore NULL views value");
            //   var tempViewIds=newReport.data.dailyMetrics[0].delta.views
            // } else {
            //   console.log("---DEBUG consolidate value");
            //   var tempViewIds=newReport.data.dailyMetrics[elementNumber].delta.viewIds.concat(newReport.data.hourlyMetrics[0].delta.viewIds)
            // }
            var tempDailyMetrics = {
              dateTimeKey:yyMmDd,
              total:{
                views:newReport.data.hourlyMetrics[elementNumber].total.views,
                likes:newReport.data.hourlyMetrics[elementNumber].total.likes,
                dislikes:newReport.data.hourlyMetrics[elementNumber].total.dislikes
              },
              delta:{
                views:newReport.data.dailyMetrics[0].delta.views + newReport.data.hourlyMetrics[elementNumber].delta.views,
                viewIds:newReport.data.dailyMetrics[0].delta.viewIds.concat(newReport.data.hourlyMetrics[elementNumber].delta.viewIds),
                //viewIds:tempViewIds,
                likes:newReport.data.dailyMetrics[0].delta.likes + newReport.data.hourlyMetrics[elementNumber].delta.likes,
                likeIds:newReport.data.dailyMetrics[0].delta.likeIds.concat(newReport.data.hourlyMetrics[elementNumber].delta.likeIds),
                dislikes:newReport.data.dailyMetrics[0].delta.dislikes + newReport.data.hourlyMetrics[elementNumber].delta.dislikes,
                dislikeIds:newReport.data.dailyMetrics[0].delta.dislikeIds.concat(newReport.data.hourlyMetrics[elementNumber].delta.dislikeIds)
              }
            }
            // remove previous dailyMetrics (which is about to be replaced)
            newReport.data.dailyMetrics.splice(0,1);
          }
          var tempObj=[];
          tempObj.push(tempDailyMetrics)
          for (var dailyMetric in newReport.data.dailyMetrics) {
            tempObj.push(newReport.data.dailyMetrics[dailyMetric])
          }
          newReport.data.dailyMetrics=tempObj;
        } else { console.log("---DEBUG -- ignore hourlyMetric which was previously rolled up into a daily one")}
      }
    }
    console.log("ENDED crunching DAILY METRICS")



    // NEXT PROCESS monthly metrics..
    console.log("START processing MONTHLY metrics")
    var numberOfDailyMetrics=newReport.data.dailyMetrics.length; console.log("--- DEBUG numberOfDailyMetrics = "+numberOfDailyMetrics)
    for (var numberOfDailyMetrics=newReport.data.dailyMetrics.length; numberOfDailyMetrics > 0; numberOfDailyMetrics--) {
      var elementNumber=numberOfDailyMetrics-1; console.log("---DEBUG processing "+newReport.data.dailyMetrics[elementNumber].dateTimeKey+" which is elementNumber: "+elementNumber);
      //var elementNumber=numberOfDailyMetrics-1; console.log("--- DEBUG processing metric = "+elementNumber);
      if ( newReport.data.monthlyMetrics.length == 0 ) { console.log("--- DEBUG -- no previous monthlyMetrics ever")
        var yyMm=newReport.data.dailyMetrics[elementNumber].dateTimeKey.substring(0,6); //console.log(yyMm)
        newReport.data.monthlyMetrics = [{
          dateTimeKey:yyMm,
          total:{
            views:newReport.data.dailyMetrics[elementNumber].total.views,
            likes:newReport.data.dailyMetrics[elementNumber].total.likes,
            dislikes:newReport.data.dailyMetrics[elementNumber].total.dislikes,
          },
          delta:{
            views:newReport.data.dailyMetrics[elementNumber].delta.views,
            viewIds:newReport.data.dailyMetrics[elementNumber].delta.viewIds,
            likes:newReport.data.dailyMetrics[elementNumber].delta.likes,
            likeIds:newReport.data.dailyMetrics[elementNumber].delta.likeIds,
            dislikes:newReport.data.dailyMetrics[elementNumber].delta.dislikes,
            dislikeIds:newReport.data.dailyMetrics[elementNumber].delta.dislikeIds
          }
        }]
      } else { 
        console.log("---DEBUG -- previous monthlyMetrics pre-exists")
        // only process hourMetrics not previously reported
        //console.log("-- DEBUG previouslyReportedLatestHour = "+previouslyReportedLatestHour)
        // ignore dailyMetrics entries previously included in a latestReport
        if (newReport.data.dailyMetrics[elementNumber].dateTimeKey > previouslyReportedLatestHour) {  
          // if day changed, create new monthly materics, else append
          var yyMm=newReport.data.dailyMetrics[elementNumber].dateTimeKey.substring(0,6); //console.log(yyMm)
          var mostRecentDailyMetricYyMmDd=newReport.data.monthlyMetrics[0].dateTimeKey; //console.log(mostRecentDailyMetricYyMmDd)
          var thisHourMetricYyMmDd=newReport.data.dailyMetrics[elementNumber].dateTimeKey.substring(0,6); //console.log(thisHourMetricYyMmDd)
          if (mostRecentDailyMetricYyMmDd != thisHourMetricYyMmDd ){ 
            console.log("---DEBUG -- month CHANGED")
            var tempMonthlyMetrics = {
              dateTimeKey:yyMm,
              total:{
                views:newReport.data.dailyMetrics[elementNumber].total.views,
                likes:newReport.data.dailyMetrics[elementNumber].total.likes,
                dislikes:newReport.data.dailyMetrics[elementNumber].total.dislikes
              },
              delta:{
                views:newReport.data.dailyMetrics[elementNumber].delta.views,
                viewIds:newReport.data.dailyMetrics[elementNumber].delta.viewIds,
                likes:newReport.data.dailyMetrics[elementNumber].delta.likes,
                likeIds:newReport.data.dailyMetrics[elementNumber].delta.likeIds,
                dislikes:newReport.data.dailyMetrics[elementNumber].delta.dislikes,
                dislikeIds:newReport.data.dailyMetrics[elementNumber].delta.dislikeIds
              }
            }
          } else { 
            console.log("---DEBUG -- month NOT changed, consolidate metrics")
            // csonsolidate metrics
            var tempViewIds=[];
            if ( !newReport.data.monthlyMetrics[0].delta.viewIds ) { 
              tempViewIds = newReport.data.dailyMetrics[elementNumber].delta.viewIds
              console.log("---DEBUG -- delta.viewIDs does NOT exist")
            } else {
              tempViewIds = newReport.data.monthlyMetrics[0].delta.viewIds.concat(newReport.data.dailyMetrics[elementNumber].delta.viewIds)
              console.log("---DEBUG -- delta.viewIDs DOES exist")
            }
            var tempLikeIds=[];
            if ( !newReport.data.monthlyMetrics[0].delta.likeIds ) { 
              tempLikeIds = newReport.data.dailyMetrics[elementNumber].delta.likeIds
              console.log("---DEBUG -- delta.likeIDs does NOT exist")
            } else {
              tempLikeIds = newReport.data.monthlyMetrics[0].delta.likeIds.concat(newReport.data.dailyMetrics[elementNumber].delta.likeIds)
              console.log("---DEBUG -- delta.likeIDs DOES exist")
            }
            var tempDislikeIds=[];
            if ( !newReport.data.monthlyMetrics[0].delta.likeIds ) { 
              tempDislikeIds = newReport.data.dailyMetrics[elementNumber].delta.dislikeIds
              console.log("---DEBUG -- delta.dislikeIDs does NOT exist")
            } else {
              tempDislikeIds = newReport.data.monthlyMetrics[0].delta.dislikeIds.concat(newReport.data.dailyMetrics[elementNumber].delta.dislikeIds)
              console.log("---DEBUG -- delta.dislikeIDs DOES exist")
            }
            var tempMonthlyMetrics = {
              dateTimeKey:yyMm,
              total:{
                views:newReport.data.dailyMetrics[elementNumber].total.views,
                likes:newReport.data.dailyMetrics[elementNumber].total.likes,
                dislikes:newReport.data.dailyMetrics[elementNumber].total.dislikes
              },
              delta:{
                views:newReport.data.dailyMetrics[elementNumber].delta.views + newReport.data.monthlyMetrics[0].delta.views,
                viewIds:tempViewIds,
                likes:newReport.data.dailyMetrics[elementNumber].delta.likes + newReport.data.monthlyMetrics[0].delta.likes,
                likeIds:tempLikeIds,
                dislikes:newReport.data.dailyMetrics[elementNumber].delta.dislikes + newReport.data.monthlyMetrics[0].delta.dislikes,
                dislikeIds:tempDislikeIds
              }
            }
            // remove previous monthlyMetrics (which is about to be replaced)
            newReport.data.monthlyMetrics.splice(0,1);
          }
          var tempObj=[];
          tempObj.push(tempMonthlyMetrics)
          for (var monthlyMetric in newReport.data.monthlyMetrics) {
            tempObj.push(newReport.data.monthlyMetrics[monthlyMetric])
          }
          newReport.data.monthlyMetrics=tempObj;
        } else { console.log("---DEBUG -- ignore dailyMetric which was previously rolled up into a daily one")}
      }
    }
    console.log("ENDED processing MONTHLY metrics")




    console.log("ENDED: buildNewYouTubeChannelReport")
    return newReport
}

    function getDoc(docUrl) { 
      return new Promise(resolve => {
        request({
          method: "GET",
          url: docUrl, 
          Accept: "application/json",
          json: true,
          }, function (error, response, doc) { //console.log(doc)
            if ( error ) {
              console.log("--- ERROR - could not get doc:")
              console.log(docUrl)
              console.log(error)
            } else {
              //console.log("--- DEBUG successfully retrieved doc: "+docUrl)
            }
            resolve(doc);
          });
      });
    }

    function compare( a, b ) {
      if ( a.dateTimeKey < b.dateTimeKey ){
        return 1;
      }
      if ( a.dateTimeKey > b.dateTimeKey ){
        return -1;
      }
      return 0;
    }

    function fillMissingMetrics(latestReport) {
      // read report in reverse order
      // if key/value missing (and previous key/value exists), then set previous key/value and set key/value in TempObject
      // else set key/value to TempObject
      // then push TempObject to TempReport
      // then sort TempReport
      // then set latestReport = TempReport (and delete TempReport and TempObject)
      console.log("START: fillMissingMetrics")
      var id= timestamp.utc('YYYY/MM/DD:HH:mm:ss');
      id = id.replace(/:/g, "");
      id = id.replace(/\//g, "");
      console.log("-- reportId = "+reportId);
      var tempReport = {
        "_id": reportId+"--"+id,
        "docType": "report",
        "docName": "Codewind install metrics report",
        "campaign": "Codewind",
        "dataCreatedTimestamp": dataCreatedTimestamp,
        "docs": [ {"dateTimeKey": "dateTimeKey"} ]
      }; //console.log(tempReport)
      var previousTempHourlyMetrics={};
      for (var docNum = latestReport.docs.length-1; docNum > 0; docNum--) { //docNum > 1 used, to avoid processing report doc 1 (which is table titles only)
        var docYearMonthDay = parseInt(latestReport.docs[docNum].dateTimeKey.substring(0,8)); //console.log(docYearMonth)
        var docYearMonth = parseInt(latestReport.docs[docNum].dateTimeKey.substring(0,6)); //console.log(docYearMonth)

        
        // initialise a temp var to build up this hours data in
        var tempHourlyMetrics={
          "dateTimeKey": (latestReport.docs[docNum].dateTimeKey),
          "eclipseRankingCurrentValue": 0,
          "eclipseRankingOfTotalPlugins": 0,
          "eclipseInstallsCurrentValue": 0,
          "eclipsePercentageOfAllInstalls": 0,
          "eclipseClickThroughs": 0,
          "jetBrainsInstalls": 0,
          "jetBrainsInstallsUntilLastMonth": 0,
          "jetBrainsInstallsThisMonth": 0,
          "jetBrainsRating": 0,
          "vscodeInstalls": 0,
          "vscodeAverageRating": 0,
          "vscodeInstallsUntilLastMonth": 0,
          "vscodeInstallsThisMonth": 0,
          "vscodeInstallsCodewindNodeProfiler": 0,
          "vscodeAverageRatingCodewindNodeProfiler": 0,
          "vscodeInstallsCodewindJavaProfiler": 0,
          "vscodeAverageRatingCodewindJavaProfiler": 0,
          "vscodeInstallsCodewindOpenApiTools": 0,
          "vscodeAverageRatingCodewindOpenApiTools": 0,
          "eclipseTotalInstallsUntilLastMonth": 0,
          "eclipseTotalInstalls": 0,
          "totalInstallsEver": 0
        }

        if ( docNum === latestReport.docs.length-1 ) { //console.log(latestReport.docs[docNum])
          tempReport.docs.push(latestReport.docs[docNum]);
        } else if ( docNum > 1) {
          // scenarios
          // newEclipseMonth
          // when to start eclipse/vscode metrics vs when to use history
          // when JetBrains numbers start
          
          // initialise metrics not cacl'ed by this function
          if ((latestReport.docs[docNum].eclipseRankingCurrentValue != "-") && (latestReport.docs[docNum].eclipseRankingCurrentValue )) { tempHourlyMetrics.eclipseRankingCurrentValue=latestReport.docs[docNum].eclipseRankingCurrentValue }
          if ((latestReport.docs[docNum].eclipseRankingOfTotalPlugins != "-") && (latestReport.docs[docNum].eclipseRankingOfTotalPlugins )) { tempHourlyMetrics.eclipseRankingOfTotalPlugins=latestReport.docs[docNum].eclipseRankingOfTotalPlugins }
          if ((latestReport.docs[docNum].eclipseInstallsCurrentValue != "-") && (latestReport.docs[docNum].eclipseInstallsCurrentValue )) { tempHourlyMetrics.eclipseInstallsCurrentValue=latestReport.docs[docNum].eclipseInstallsCurrentValue }
          if ((latestReport.docs[docNum].eclipsePercentageOfAllInstalls != "-") && (latestReport.docs[docNum].eclipsePercentageOfAllInstalls )) { tempHourlyMetrics.eclipsePercentageOfAllInstalls=latestReport.docs[docNum].eclipsePercentageOfAllInstalls }
          if ((latestReport.docs[docNum].eclipseClickThroughs != "-") && (latestReport.docs[docNum].eclipseClickThroughs )) { tempHourlyMetrics.eclipseClickThroughs=latestReport.docs[docNum].eclipseClickThroughs }
          if ((latestReport.docs[docNum].jetBrainsInstalls != "-") && (latestReport.docs[docNum].jetBrainsInstalls )) { tempHourlyMetrics.jetBrainsInstalls=latestReport.docs[docNum].jetBrainsInstalls }
          if ((latestReport.docs[docNum].jetBrainsRating != "-") && (latestReport.docs[docNum].jetBrainsRating )) { tempHourlyMetrics.jetBrainsRating=latestReport.docs[docNum].jetBrainsRating }
          if ((latestReport.docs[docNum].vscodeAverageRating != "-") && (latestReport.docs[docNum].vscodeAverageRating )) { tempHourlyMetrics.vscodeAverageRating=latestReport.docs[docNum].vscodeAverageRating }
          if ((latestReport.docs[docNum].vscodeInstallsCodewindNodeProfiler != "-") && (latestReport.docs[docNum].vscodeInstallsCodewindNodeProfiler )) { tempHourlyMetrics.vscodeInstallsCodewindNodeProfiler=latestReport.docs[docNum].vscodeInstallsCodewindNodeProfiler }
          if ((latestReport.docs[docNum].vscodeAverageRatingCodewindNodeProfiler != "-") && (latestReport.docs[docNum].vscodeAverageRatingCodewindNodeProfiler )) { tempHourlyMetrics.vscodeAverageRatingCodewindNodeProfiler=latestReport.docs[docNum].vscodeAverageRatingCodewindNodeProfiler }
          if ((latestReport.docs[docNum].vscodeInstallsCodewindJavaProfiler != "-") && (latestReport.docs[docNum].vscodeInstallsCodewindJavaProfiler )) { tempHourlyMetrics.vscodeInstallsCodewindJavaProfiler=latestReport.docs[docNum].vscodeInstallsCodewindJavaProfiler }
          if ((latestReport.docs[docNum].vscodeAverageRatingCodewindJavaProfiler != "-") && (latestReport.docs[docNum].vscodeAverageRatingCodewindJavaProfiler )) { tempHourlyMetrics.vscodeAverageRatingCodewindJavaProfiler=latestReport.docs[docNum].vscodeAverageRatingCodewindJavaProfiler }
          if ((latestReport.docs[docNum].vscodeInstallsCodewindOpenApiTools != "-") && (latestReport.docs[docNum].vscodeInstallsCodewindOpenApiTools )) { tempHourlyMetrics.vscodeInstallsCodewindOpenApiTools=latestReport.docs[docNum].vscodeInstallsCodewindOpenApiTools }
          if ((latestReport.docs[docNum].vscodeAverageRatingCodewindOpenApiTools != "-") && (latestReport.docs[docNum].vscodeAverageRatingCodewindOpenApiTools )) { tempHourlyMetrics.vscodeAverageRatingCodewindOpenApiTools=latestReport.docs[docNum].vscodeAverageRatingCodewindOpenApiTools }
          // no need to add missing numbers for vscode, as previously done
          if ((latestReport.docs[docNum].vscodeInstalls != "-") && (latestReport.docs[docNum].vscodeInstalls )) { tempHourlyMetrics.vscodeInstalls=latestReport.docs[docNum].vscodeInstalls }
          


          var dayOfJetBrainsFirstRelease=20200225

          if (docYearMonthDay<20200206) { // use Historical Values
            tempHourlyMetrics.eclipseTotalInstallsUntilLastMonth=latestReport.docs[docNum].eclipseTotalInstallsUntilLastMonth
            tempHourlyMetrics.vscodeInstallsUntilLastMonth=3038
            tempHourlyMetrics.jetBrainsInstallsUntilLastMonth=0;
          } else { 
            // DETECT when Eclipse metrics month HAS CHANGED
            var lastDocNum=docNum+1; //console.log(nextDocNum)
            //console.log("--- TESTING: "+latestReport.docs[docNum].eclipseInstallsCurrentValue+" -vs- "+latestReport.docs[lastDocNum].eclipseInstallsCurrentValue)
            if ((latestReport.docs[docNum].eclipseInstallsCurrentValue<latestReport.docs[lastDocNum].eclipseInstallsCurrentValue) && ((tempHourlyMetrics.eclipseRankingCurrentValue>0) || tempHourlyMetrics.eclipseClickThroughs>0)) {
              console.log("-- DEBUG: Eclipse metrics month HAS CHANGED in docNum: "+docNum+" from: "+latestReport.docs[lastDocNum].eclipseInstallsCurrentValue+" to: "+latestReport.docs[docNum].eclipseInstallsCurrentValue)
              tempHourlyMetrics.eclipseTotalInstallsUntilLastMonth=previousTempHourlyMetrics.eclipseTotalInstallsUntilLastMonth+previousTempHourlyMetrics.eclipseInstallsCurrentValue
              tempHourlyMetrics.vscodeInstallsUntilLastMonth=previousTempHourlyMetrics.vscodeInstalls
              tempHourlyMetrics.jetBrainsInstallsUntilLastMonth=previousTempHourlyMetrics.jetBrainsInstalls
            } else { // ELSE Eclipse metrics Month NOT changed, so use pre
              tempHourlyMetrics.eclipseTotalInstallsUntilLastMonth=previousTempHourlyMetrics.eclipseTotalInstallsUntilLastMonth
              tempHourlyMetrics.vscodeInstallsUntilLastMonth=previousTempHourlyMetrics.vscodeInstallsUntilLastMonth
              tempHourlyMetrics.jetBrainsInstallsUntilLastMonth=previousTempHourlyMetrics.jetBrainsInstallsUntilLastMonth
            }
            
          }
          // no longer behaving like this, so commented out following:
          // ODD case, docNum1 loses 3213 vscode installs (related to 0.9.0 release reseting vscode installs number!), so repairing that now:
          // console.log("-- DEBUG: docNum: "+docNum)
          // console.log("-- DEBUG: tempHourlyMetrics.vscodeInstalls: "+tempHourlyMetrics.vscodeInstalls)
          // console.log("-- DEBUG: previousTempHourlyMetrics.vscodeInstalls: "+previousTempHourlyMetrics.vscodeInstalls)
          // console.log("-- DEBUG: tempHourlyMetrics.jetBrainsInstalls: "+tempHourlyMetrics.jetBrainsInstalls)
          // console.log("-- DEBUG: previousTempHourlyMetrics.jetBrainsInstalls: "+previousTempHourlyMetrics.jetBrainsInstalls)
          if ( (tempHourlyMetrics.vscodeInstalls < 3213) && ( docYearMonthDay > 20200223 ) ) {
            tempHourlyMetrics.vscodeInstalls=tempHourlyMetrics.vscodeInstalls+3213
            console.log("-- FIXED: previousTempHourlyMetrics.vscodeInstalls: "+previousTempHourlyMetrics.vscodeInstalls)
            tempHourlyMetrics.vscodeInstallsPost090=latestReport.docs[docNum].vscodeInstalls
          }
          if ( tempHourlyMetrics.jetBrainsInstalls < previousTempHourlyMetrics.jetBrainsInstalls ) {
            tempHourlyMetrics.jetBrainsInstalls=previousTempHourlyMetrics.jetBrainsInstalls
          }
          tempHourlyMetrics.eclipseTotalInstalls=tempHourlyMetrics.eclipseTotalInstallsUntilLastMonth+tempHourlyMetrics.eclipseInstallsCurrentValue
          tempHourlyMetrics.vscodeInstallsThisMonth=tempHourlyMetrics.vscodeInstalls-tempHourlyMetrics.vscodeInstallsUntilLastMonth
          tempHourlyMetrics.jetBrainsInstallsThisMonth=tempHourlyMetrics.jetBrainsInstalls-tempHourlyMetrics.jetBrainsInstallsUntilLastMonth
          tempHourlyMetrics.totalInstallsEver=tempHourlyMetrics.vscodeInstalls+tempHourlyMetrics.eclipseTotalInstalls+tempHourlyMetrics.jetBrainsInstalls

          tempReport.docs.push(tempHourlyMetrics)


        } else {
          //console.log("-- processin: "+docNum+" - "+latestReport.docs[docNum].dateTimeKey)
          latestReport = tempReport
          latestReport.docs.sort( compare )
          console.log("ENDED: fillMissingMetrics")
          return latestReport
        }
        previousTempHourlyMetrics=tempHourlyMetrics;
      }
    }

    function calcMonthlyMetrics(latestReport) {
      console.log("START: calcMonthlyMetrics");
      var monthlyMetrics={};
      var tempLastMonthMetrics={};
      var tempAllMonthlyMetrics={};
      // initialise monhtlyMetrics start
      if (!latestReport.monthlyMetrics) {console.log("-- latestReport.monthlyMetrics never prviously existed, so use hardcoded history data")
        monthlyMetrics = [
          {
            "yearMonth": 202001,
            "totalInstallsThisMonth": 322,
            "totalInstallsLastMonthDelta": -10,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 122,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 200,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 122,
            "eclipseInstallsLastMonthDelta": -10,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201912,
            "totalInstallsThisMonth": 132,
            "totalInstallsLastMonthDelta": -19,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 132,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 132,
            "eclipseInstallsLastMonthDelta": -19,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201911,
            "totalInstallsThisMonth": 151,
            "totalInstallsLastMonthDelta": 13,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 151,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 151,
            "eclipseInstallsLastMonthDelta": 13,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201910,
            "totalInstallsThisMonth": 138,
            "totalInstallsLastMonthDelta": -11,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 138,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 138,
            "eclipseInstallsLastMonthDelta": -11,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201909,
            "totalInstallsThisMonth": 149,
            "totalInstallsLastMonthDelta": 67,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 149,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 149,
            "eclipseInstallsLastMonthDelta": 67,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201908,
            "totalInstallsThisMonth": 82,
            "totalInstallsLastMonthDelta": -9,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 82,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 82,
            "eclipseInstallsLastMonthDelta": -9,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201907,
            "totalInstallsThisMonth": 93,
            "totalInstallsLastMonthDelta": 67,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 93,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 93,
            "eclipseInstallsLastMonthDelta": 67,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201906,
            "totalInstallsThisMonth": 26,
            "totalInstallsLastMonthDelta": 16,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 26,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 26,
            "eclipseInstallsLastMonthDelta": 16,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          },
          {
            "yearMonth": 201905,
            "totalInstallsThisMonth": 10,
            "totalInstallsLastMonthDelta": 0,
            "totalInstallTargetPercentage": 0,
            "totalInstallsTarget": 10,
            "totalInstallsTargetDelta": 0,
            "vscodeInstallsThisMonth": 0,
            "vscodeInstallsLastMonthDelta": 0,
            "eclipseInstallsThisMonth": 10,
            "eclipseInstallsLastMonthDelta": 0,
            "jetBrainsInstallsThisMonth": 0,
            "jetBrainsInstallsLastMonthDelta": 0
          }
        ]
      } else {  console.log("-- latestReport.monthlyMetrics = preEXISTS in earlier report, so use that")
        monthlyMetrics=latestReport.monthlyMetrics
      }
      // initialise monhtlyMetrics end 
      // then     - For each hourlyMetric + Detect end of month (and ignore < 202002)
      for (var docNum = latestReport.docs.length-1; docNum > 0; docNum--) {
        var docYearMonth = parseInt(latestReport.docs[docNum].dateTimeKey.substring(0,6)); //console.log(docYearMonth)
        var previousDocNum=docNum-1; 
        var previousDocYearMonth = parseInt(latestReport.docs[previousDocNum].dateTimeKey.substring(0,6));
        if ( docYearMonth > 202001 ) { 
          //console.log("-- process old hourlyMetric doc with docYearMonth = "+docYearMonth)
          //console.log("-- -- (previous yearDate = "+previousDocYearMonth+")")
          if ( (docYearMonth != previousDocYearMonth) || (docNum === 1) ) { 
            console.log("-- MONTH changed or latestHourReport")
            // compare metrics from latest nthly MEtrics with latestReportDoc and built this month metrics
            // then push it temp object, then push monthlyMetrics (should be sorted!)
            //then display it!
            tempLastMonthMetrics=monthlyMetrics[0]; //console.log(tempLastMonthMetrics); console.log(" -- vs --"); console.log(latestReport.docs[docNum]);
            // calc tempThisMonthMetrics
            var tempThisMonthMetrics = {
              "yearMonth": 0,
              "totalInstallsThisMonth": 0,
              "totalInstallsLastMonthDelta": 0,
              "totalInstallTargetPercentage": 0,
              "totalInstallsTarget": 0,
              "totalInstallsTargetDelta": 0,
              "vscodeInstallsThisMonth": 0,
              "vscodeInstallsLastMonthDelta": 0,
              "eclipseInstallsThisMonth": 0,
              "eclipseInstallsLastMonthDelta": 0,
              "jetBrainsInstallsThisMonth": 0,
              "jetBrainsInstallsLastMonthDelta": 0
            }
            tempThisMonthMetrics.yearMonth = docYearMonth
            var totalInstallsThisMonth=latestReport.docs[docNum].vscodeInstallsThisMonth+latestReport.docs[docNum].eclipseInstallsCurrentValue+latestReport.docs[docNum].jetBrainsInstallsThisMonth
            tempThisMonthMetrics.totalInstallsThisMonth = totalInstallsThisMonth
            var totalInstallsLastMonthDelta=totalInstallsThisMonth-monthlyMetrics[0].totalInstallsThisMonth
            tempThisMonthMetrics.totalInstallsLastMonthDelta=totalInstallsLastMonthDelta;
            tempThisMonthMetrics.totalInstallTargetPercentage=totalInstallTargetPercentage
            var totalInstallsTarget=Math.round(((totalInstallTargetPercentage/100)+1)*monthlyMetrics[0].totalInstallsThisMonth)
            tempThisMonthMetrics.totalInstallsTarget=totalInstallsTarget
            tempThisMonthMetrics.totalInstallsTargetDelta=totalInstallsThisMonth-totalInstallsTarget
            
            //tempThisMonthMetrics.vscodeInstallsThisMonth = latestReport.docs[docNum].vscodeInstalls-latestReport.docs[docNum].vscodeInstallsUntilLastMonth-monthlyMetrics[0].vscodeInstallsThisMonth
            //if ( latestReport.docs[docNum].vscodeInstallsThisMonth ) { //detect when vscode installs data changes
            tempThisMonthMetrics.vscodeInstallsThisMonth = latestReport.docs[docNum].vscodeInstallsThisMonth
            //}

            tempThisMonthMetrics.vscodeInstallsLastMonthDelta = latestReport.docs[docNum].vscodeInstallsThisMonth-monthlyMetrics[0].vscodeInstallsThisMonth
            tempThisMonthMetrics.eclipseInstallsThisMonth = latestReport.docs[docNum].eclipseInstallsCurrentValue
            tempThisMonthMetrics.eclipseInstallsLastMonthDelta = latestReport.docs[docNum].eclipseInstallsCurrentValue-monthlyMetrics[0].eclipseInstallsThisMonth
            tempThisMonthMetrics.jetBrainsInstallsThisMonth = latestReport.docs[docNum].jetBrainsInstallsThisMonth
            tempThisMonthMetrics.jetBrainsInstallsLastMonthDelta = latestReport.docs[docNum].jetBrainsInstallsThisMonth-monthlyMetrics[0].jetBrainsInstallsThisMonth
            // "jetBrainsInstallsLastMonthDelta": 0
            var newTempMonthlyMetrics=[]
            newTempMonthlyMetrics.push(tempThisMonthMetrics)
            for (arrayItem in monthlyMetrics) {
              newTempMonthlyMetrics.push(monthlyMetrics[arrayItem])
            }
            monthlyMetrics=newTempMonthlyMetrics
            latestReport.monthlyMetrics=monthlyMetrics
            // ensure final report stores monthlyMetrics above docs:
            allDocs=latestReport.docs; delete latestReport.docs; latestReport.docs=allDocs

            // then push to tempAllMonthlyMetrics (then push previous monthlyMetrics to tempAllMonthlyMetrics) .. should already be sorted!
            // then replace write tempAllMonthMetrics, over MonthlyMetrics, ready for next loop iteration
          }
        }
        previousDocYearMonth=docYearMonth
      }
      // finally write updated monthlyMetrics into latestReport Object!
      //console.log(monthlyMetrics)
      console.log("ENDED: calcMonthlyMetrics");
      return latestReport
    };


    async function putReportIntoDB(newReport) {
      console.log("START - put into couch DB");
      //console.log(newReport);
      var id= timestamp.utc('YYYY/MM/DD:HH:mm:ss');
      id = id.replace(/:/g, "");
      id = id.replace(/\//g, "");
      // var tempReport = {
      //   _id: newReport._id,
      //   reportType:newReport.reportType,
      //   TwitterScreenName:newReport.TwitterScreenName,
      //   dataCreatedTimestamp:newReport.dataCreatedTimestamp,
      //   dateTimeKey:newReport.currentDateTimeKey,
      //   data:{
      //      twitterUsers:newReport.data.twitterUsers,
      //      monthlyMetrics:newReport.data.monthlyMetrics,
      //      dailyMetrics:newReport.data.dailyMetrics,
      //      hourlyMetrics:newReport.data.hourlyMetrics,
      //      twitterUserTimeline:newReport.data.twitterUserTimeline
      //   }
      // }
      //console.log("-- reportId = "+reportId);
      //console.log("-- id = "+id);
      var uri = "http://"+username+":"+password+"@datastore-default.apps.riffled.os.fyre.ibm.com/advocacy/"+reportId+"--"+id;
      console.log("-- DEBUG uri = "+uri)
      //console.log(newReport);
      console.log("--- DEBUG starting write to couchDB:")
      request({
        uri: uri,
        method: "PUT",
        headers: {
            'Content-type': 'application/json'
        },
        body: newReport,
        //body: tempReport,
        json: true
      }, (error, response, body) => {
        if (error) { console.log("-- couchDB error:"); console.log(error)}
        console.log("-- couchDB response = "+response);
        console.log(body)
      })
      console.log("ENDED - put into couch DB");
      return
    }

    async function backupReport(newReport){
      return new Promise(resolve => {
        console.log("START - backupReport");
        if ( publicOrIbmGitForBackupReport == "ibmGit") {
          var client = github.client(gitAuthTok,{
            hostname: 'github.ibm.com/api/v3'
          });
        } else if ( publicOrIbmGitForBackupReport == "publicGit") {
          var client = github.client(gitAuthTok,{
            hostname: 'api.github.com'
          });
        };
        var ghrepo = client.repo(repo);
        var reportId=newReport._id; reportId=reportId+".json"; console.log("- for report: "+reportId)
        var docName="public/"+reportId; console.log(docName)
        var reportForBackup = JSON.stringify(newReport); //console.log(reportForBackup)
        
        ghrepo.createContents(docName, 'backup latest report', reportForBackup, function(err, data, headers) {
          if (err) { console.log(err) } else { 
            console.log("------ SUCESSS")
            console.log("ENDED - backupReport");
          }
          resolve();
        });
      });
    }

    function removeBackupReport(reportDetailsObj) {
      return new Promise(resolve => {
        console.log ("--- START: removeBackupReport - with: "+reportDetailsObj.name+" with sha: "+reportDetailsObj.sha)
        if ( publicOrIbmGitForBackupReport == "ibmGit") {
          var client = github.client(gitAuthTok,{
            hostname: 'github.ibm.com/api/v3'
          });
        } else {
          var client = github.client(gitAuthTok);
        }
        var ghrepo = client.repo(repo);
        ghrepo.deleteContents("public/"+reportDetailsObj.name, 'remove previous report', reportDetailsObj.sha, function(err, data, headers) {
          if (err) { console.log(err)} else { 
            setTimeout(() => {
              console.log("--- SUCCESS");
              console.log ("--- ENDED: removeBackupReport - with: "+reportDetailsObj.name+" with sha: "+reportDetailsObj.sha)
              resolve();
            }, 3000);
          }
        })
      })
    }

    async function getBackupReportFromGithub(latestReportSha) {
      return new Promise(async resolve => {
        console.log ("--- START: getBackupReportFromGithub - with blob sha: "+latestReportSha)
        if ( publicOrIbmGitForBackupReport == "ibmGit") {
          var octokitBaseUrl="https://api.github.ibm.com"
        } else if ( publicOrIbmGitForBackupReport == "publicGit") {
          var octokitBaseUrl="https://api.github.com"
        }
        const { Octokit } = require("@octokit/rest");
        const octokit = new Octokit({ 
          auth: gitAuthTok,
          baseUrl: octokitBaseUrl
        });
        //const { userData } = await octokit.request("/user");
        // const { data } = await octokit.repos.getContents({
        //   owner: "smarteradvocacy",
        //   repo: "build-report",
        //   path: "public"
        // });

        //const { dataValue } = await octokit.request("GET /repos/smarteradvocacy/build-report/git/blobs/19f1ab2975779c8a37248f1c9b9c3bb8f6a81737");
        const { data } = await octokit.git.getBlob({
          owner: "smarteradvocacy",
          repo: "build-report",
          file_sha: latestReportSha
        });
        let buff = Buffer.from(data.content, 'base64');  
        let text = buff.toString('utf-8');
        var latestReport=JSON.parse(text);
        //console.log(latestReport)
        console.log ("--- ENDED: getBackupReportFromGithub - with blob sha: "+latestReportSha)
        resolve(latestReport);
      })
    }

    async function run() {
      // test if couch up (attempt to get index of all docs)
      var docsIndex = await getAllDocsIndex(); //console.log("--- DEBUG: docsIndex:"); console.log(docsIndex)
      if ( docsIndex.error == "not_found" ) { // STOP if the DB is down
        console.log("END"); res.send("DB docs index could not be pulled (suspect DB down, or it's only just UP and before 'get-data' run")
      } else { // CONTINUE as DB is UP
        var latestReportDocId = await getLatestReportDocId(docsIndex); console.log("--- DEBUG latestReportDocId = "+latestReportDocId)
        if (latestReportDocId == "" ){ // no latest report from CouchDB found (could be the Couch server was restarted)
          // get+use backup report from GIT
          var previousBackupReportsArray = await getRepoPublicDocs(); console.log("--- DEBUG previousBackupReportsArray:"); console.log(previousBackupReportsArray)
          if (previousBackupReportsArray[0].name.includes("not_found")) { console.log("--- DEBUG need to create NEW blank report")
            // need to create NEW BLANK REPORT
            if (reportType ){
              //if (reportType == "TwitterUserData" ){
              var currentDateTimeKey = await determineCurrentDateTimeKey(); console.log("--- DEBUG currentDateTimeKey = "+currentDateTimeKey)
              //var latestReport = await createBlankTwitterReport(currentDateTimeKey);
              var latestReport = [];
            }
          } else {
            // need to get latest report from github   
            var latestReportSha = previousBackupReportsArray[0].sha; //console.log("--- latestReportUri = "+latestReportUri)
            var latestReport = await getBackupReportFromGithub(latestReportSha);  
          }
        } else {
          // get+use backup last report from the DB
          var latestReport = await getLatestReport(latestReportDocId); // the function is paused here until the promise is fulfilled
        }
        //console.log(latestReport)
        var latestGetDataDateInReport = await determineLatestGetDataDateInReport(latestReport); console.log("-- latestGetDataDateInReport = "+latestGetDataDateInReport) // the function is paused here until the promise is fulfilled
        var newGetDataDocIds = await determineNewGetDataDocIds(docsIndex, latestGetDataDateInReport); //console.log(newGetDataDocIds)
        if ( newGetDataDocIds.length === 0 ) {
          console.log("--- NO new get-data doc ids to process...");
          res.send("No new docs to add to report");
          console.log("END")
        } else {
          var currentDateTimeKey = await determineCurrentDateTimeKey();
          if ( !reportType) {
            var newReport = await buildNewInstallsReport(latestReport,newGetDataDocIds); // the function is paused here until the promise is fulfilled
          } else if ( reportType == "TwitterUserData" ) {
            console.log("--- DEBUG building new type of report: "+reportType)
            var newReport = await buildNewTwitterUserDataReport(latestReport,newGetDataDocIds, currentDateTimeKey); // the function is paused here until the promise is fulfilled
          } else if ( reportType == "YouTubeChannel" ) {
            console.log("--- DEBUG building new type of report: "+reportType)
            var newReport = await buildNewYouTubeChannelReport(latestReport,newGetDataDocIds, currentDateTimeKey); // the function is paused here until the promise is fulfilled
            await putReportIntoDB(newReport); // put report into couch db
          }

          if ( runMode === "production" ) {
            console.log("--- 'production case' (new report WILL be written to DB)")
            await putReportIntoDB(newReport); // put report into couch db
            var previousBackupReportsArray = await getRepoPublicDocs(); console.log("--- DEBUG - previousBackupReportsArray:"); console.log("---DEBUG previousBackupReportsArray:"); console.log(previousBackupReportsArray)
            await backupReport(newReport); // backup newRport in Github
            console.log("--- --- SUPER DEBUG reportId = "+reportId)            
            for (var objNum in previousBackupReportsArray){
              if ( previousBackupReportsArray[objNum].name.includes(reportId) && !previousBackupReportsArray[objNum].name.includes("not_found")) {
              console.log("--- DEBUG -- atempt to DELETE from git: "); console.log(previousBackupReportsArray[objNum])
              await removeBackupReport(previousBackupReportsArray[objNum]);
              }
            }
            res.send(newReport)
            console.log("END")
          } else {
            console.log("--- none 'production case' (new report will NOT be written to DB)")
            res.send(newReport)
            console.log("END")
          }
        }
      }
    }

    run();
  });




  app.use('/build-report', router);
}