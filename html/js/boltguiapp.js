angular.module('BoltGUI', ['ui.bootstrap', 'RecursionHelper']);
angular.module('BoltGUI')
  .controller('BucketsController', function($scope, $http, $modal) {
    var bucketsList = this;

    bucketsList.alerts = [];
    bucketsList.buckets = [];

    bucketsList.isEditing = false;

    $http.get('/getBuckets').success(function(response){
      response.forEach(function(value){
        bucketsList.buckets.push(NewBucket({
          name:value,
          entries: [],
          subbuckets: []
        }, bucketsList)
        )
        bucketsList.getEntries(value)
      });
    });

    function NewEntry(key, value){
      var entry = {
        key: key, 
        value: value,
        edit: function(){
          console.log("start edit");
          console.log(this);
        }
      }
      return entry
    }

    function NewBucket(bucket, parent){
      var newBucket = {
        parent: parent,
        name: bucket.name,
        entries: [],
        subbuckets: [],
        addEntry: function(entry){
          this.entries.push(entry);
        },
        removeEntry: function(entry){
          var index = this.entries.indexOf(entry);
          if (index > -1) {
            this.entries.splice(index, 1);
          }
        },
        addBucket: function(name){
          this.subbuckets.push(NewBucket({
                      name: name,
                      entries: [],
                      subbuckets: []
                    }, this));
        },
        removeBucket: function(bucket){
          var index = this.subbuckets.indexOf(bucket);
          if (index > -1) {
            this.subbuckets.splice(index, 1);
          }
        },
        getFullName: function(){
          return this.parent.getFullName() + this.name;
        }
      }

      bucket.entries.forEach(function(entry){
        newBucket.entries.push(NewEntry(entry.key, entry.value));
      });

      bucket.subbuckets.forEach(function(bucket){
        newBucket.subbuckets.push(NewBucket(bucket));
      });

      return newBucket;
    }

    bucketsList.getFullName = function(){
      return "list";
    }

    bucketsList.getEntries = function(bucket){
      $http.get('/getEntries',{params:{buck:bucket}}).success(function(response){
        var buck = bucketsList.buckets.filter(function(value){
          return value.name == bucket;
        })[0];

        if (buck.entries.length > 0) buck.entries = [];

         response.entries.forEach(function(entry){
          buck.entries.push(NewEntry(entry.key, entry.value));
         });

         if (buck.subbuckets.length > 0) buck.subbuckets = [];

         response.subbuckets.forEach(function(bucket){
          buck.subbuckets.push(NewBucket(bucket, buck));
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

    bucketsList.removeBucket = function(bucket){
      // $http({
      //   method: 'POST',
      //   url: '/delBucket',
      //   data: $.param({bucket: bucket.name}),
      //   headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      // });

      var index = bucketsList.buckets.indexOf(bucket);
          if (index > -1) {
            bucketsList.buckets.splice(index, 1);
          }
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

angular.module('BoltGUI').directive('bucketView', function (RecursionHelper) {
  return {
    restrict: "E",
    scope: {
      parent: "=",
      bucket: "=bucket"
    },
    template: '<div class="bucket">\
    <div class="cross btn btn-xs" ng-click="parent.removeBucket(bucket)"></div>\
            <h4 role="button" data-toggle="collapse" href="#{{bucket.getFullName()}}" aria-expanded="true" aria-controls="{{bucket.getFullName()}}">{{bucket.name}}</h4>\
            <div class="collapse" id="{{bucket.getFullName()}}">\
              <div class="well">\
                <bucket-view class="bucket" ng-repeat="subbucket in bucket.subbuckets" bucket="subbucket" parent="bucket"></bucket-view>\
                <button type="button" class="btn btn-primary" ng-click="bucketsList.addEntry(bucket)">New entry</button>\
                <table class="table">\
                  <tr>\
                    <th></th>\
                    <th>Key</th>\
                    <th>Value</th>\
                  </tr>\
                  <tr ng-repeat="entry in bucket.entries">\
                    <td class="cross" role="button" ng-click="bucket.removeEntry(entry)"></td>\
                    <td>{{entry.key}}</td> \
                    <td>{{entry.value}}</td>\
                    <td ng-click="entry.edit()" class="btn btn-default">Edit</td>\
                  </tr>\
                </table>\
              </div>\
            </div>\
            </div>',
    compile: function(element) {
            // Use the compile function from the RecursionHelper,
            // And return the linking function(s) which it returns
            return RecursionHelper.compile(element);
        }
  };

});


