# Smarter Advocacy

This cloud-native express/node.js microservice, is part of a set which comprise a 'Smarter Advocacy' capability. More details about this will follow soon.

# The microservice in this repo

The simple goal for this microservice is to offer a stateless generic capability, that can create and update reports (containing total/delta metrics), for supported reportTypes such as Twitter user/tweets and YouTube video views/likes. 

**Quick demo**   
hitting enpoint --> then walk through JSON output:

![example endpoint hit](images/build-report-demo.gif?raw=true "Example endpoint hit")

**For you to build and deploy:**  
- see [separate BLOG](https://medium.com/nikcanvin/how-to-develop-update-a-docker-microservice-in-a-git-repo-a6118da2d92f), for how to develop changes to this cloud-native express/node.js microservice in 4 simple steps.
- see [separate BLOG](https://medium.com/nikcanvin/how-to-build-a-docker-microservice-application-and-deploy-to-openshift-fdb0769f1b9f), for how to deploy the latest microservice into production (an OpenShift Kubernetes cluster).

**Only within IBM, this microservice is already deployed:**  
- [deployed on a OpenShift cluster here](http://smart-adv-build-report-install-metrics-default.apps.riffled.os.fyre.ibm.com/).

**Overview of workflow:**  
![overview picture](images/overview.png?raw=true "Diagramatic overview of this picture")

**Supported reports to build are:**  
1. Twitter (for any given user name), reporting totals/deltas for followers, friends, tweets, retweets and likes
2. YouTube channel videos, reporting totals/deltas for videos, likes and dislikes

**Notes:** 
1. currently, the microservice is hardcoded to push the resultant JSON document to a hardcorded COUCHDB instance (but we should probably split the microservice into two parts, the first to produce the JSON document with an option where to the send it and the second to handle store in a COUCHDB. Other places to send/store the data could also be supported in future). 
2. currently the backup strategy for report JSON documents, is to keep a latest copy of the report in this Github repo. When the 'build-report' endpoint is hit in production mode, it attempts to get the latest report from Couch DB first, but if that's unavailable it looks in this repo/public directory.

...

![Codewind logo](images/codewind.png?raw=true "Codewind logo")

***This microservice was created and iteratively developed using [Codewind](https://www.eclipse.org/codewind/).***  
*Codewind is an open source plugin for Eclispe and VS Code IDEs, that simplifies and enhances development in containers by extending industry standard IDEs with features to write, debug, and deploy cloud-native applications.* 