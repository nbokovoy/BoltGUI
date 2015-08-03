angular.module('BoltGUI', [])
  .controller('BucketsController', function($scope, $http) {
    var bucketsList = this;

    bucketsList.buckets = [];

    $http.get('/getBuckets').success(function(response){
      response.forEach(function(value){
        bucketsList.buckets.push({
        name: value,
        entries: []
      })
      });
    });
    
    bucketsList.getEntries = function(bucket){
      $http.get('/getEntries',{params:{buck:bucket}}).success(function(response){
        var buck = bucketsList.buckets.filter(function(value){
          return value.name == bucket;
        })[0];

        if (buck.entries.length > 0) buck.entries = [];

         response.forEach(function(entry){
          buck.entries.push({key:entry.key, value:entry.value});
         });
        //value = JSON.stringify(JSON.parse(response) ,null, '\t');
        //alert(bucketsList.buckets[bucket].entries);
        //bucketsList.buckets[bucket].entries = response;
    });
    }
    

    bucketsList.addBucket = function() {
      bucketsList.buckets.push({
        name: bucketsList.bucketName,
        entries: []
      });
      bucketsList.bucketName = '';
    };

  });