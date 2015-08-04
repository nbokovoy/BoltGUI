angular.module('BoltGUI', ['ui.bootstrap']);
angular.module('BoltGUI')
  .controller('BucketsController', function($scope, $http, $modal) {
    var bucketsList = this;

    bucketsList.alerts = [];
    bucketsList.buckets = [];

    bucketsList.isEditing = false;

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
    });
    }
    

    bucketsList.addBucket = function() {
      if(bucketsList.buckets.filter(function(value){return value.name == bucketsList.newBucketName}).length > 0){
        bucketsList.addAlert("danger", "Bucket '"+bucketsList.newBucketName+"' already exist.");
        return;
      }

      $http({
        method: 'POST',
        url: '/setBucket',
        data: $.param({bucket: bucketsList.newBucketName}),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      });

      bucketsList.buckets.push({
        name: bucketsList.newBucketName,
        entries: []
      });
      bucketsList.newBucketName = '';
    };

    bucketsList.delBucket = function(bucket){
      $http({
        method: 'POST',
        url: '/delBucket',
        data: $.param({bucket: bucket.name}),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      });

      bucketsList.buckets.splice(bucketsList.buckets.indexOf(bucket), 1);
    };

    bucketsList.removeEntry = function(bucket, index){
      var key = bucket.entries[index].key;

      bucket.entries.splice(index, 1);

      $http({
        method: 'POST',
        url: '/delEntry',
        data: $.param({bucket: bucket.name, key: key}),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      })
    };

    bucketsList.editEntry = function (bucket, index) {

      var modalInstance = $modal.open({
        templateUrl: 'editmodal.html',
        controller: 'ModalInstanceCtrl',
        resolve: {
          entry: function () {
            return bucket.entries[index];
          },
          isNew: function(){
            return false;
          }
        }
      });

      modalInstance.result.then(function (entry) {
        $http({
          method: 'POST',
          url: '/setEntry',
          data: $.param({bucket: bucket.name, key: entry.key, value: entry.value}),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        })
        bucket.entries[index] = entry;
      });
    };

    bucketsList.addEntry = function(bucket){
      var modalInstance = $modal.open({
        templateUrl: 'editmodal.html',
        controller: 'ModalInstanceCtrl',
        resolve: {
          entry: function () {
            return null;
          },
          isNew: function(){
            return true;
          }
        }
      });

      modalInstance.result.then(function (entry) {
        if(bucket.entries.filter(function(value){return value.key == entry.key}).length > 0){
          bucketsList.addAlert("danger", "Entry with key '"+entry.key+"' already exist.");
          return;
        }

        $http({
          method: 'POST',
          url: '/setEntry',
          data: $.param({bucket: bucket.name, key: entry.key, value: entry.value}),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        })

        bucket.entries.push(entry);
      });
    };

    bucketsList.addAlert = function(type, msg) {
      bucketsList.alerts.push({msg: msg, type:type});
    };

    bucketsList.closeAlert = function(index) {
      bucketsList.alerts.splice(index, 1);
    };

    bucketsList.exit = function(){
      $http({
        method: 'POST',
        url: '/exit',
      })
      location.reload();
    };
});

angular.module('BoltGUI').controller('ModalInstanceCtrl', function ($scope, $modalInstance, entry, isNew) {

  $scope.entry = entry;
  $scope.isNew = isNew;
  if(isNew)
    $scope.newEntry = {key:"", value:""};
  else
    $scope.newEntry = {key:entry.key, value:entry.value};

  $scope.ok = function () {
    $modalInstance.close($scope.newEntry);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
});