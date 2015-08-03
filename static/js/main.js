$(document).ready(function() {
  getBuckets();

  $(document).on('click', ".bucket h4", function() {
    getBucketEnties(this);
     $(this).parent().children(".collapse").toggle(100);
  });

  $(document).on('dblclick', ".editable", function() {
    if (!$(this).hasClass("editing")) {
      startEditing(this);
    }
  });

  $(document).on('click', ".del", function() {
    var row = $(this).parent();
    deleteBucketEntry(getBucket(row), getKey(row));
    $(row).hide(200);
  });
  $(document).on('click', ".del-bucket", function(){
  	var bucket = getBucket(this);
  	deleteBucket(bucket);
  	$(this).parent().remove();
  });
  
  $(document).on('click', ".createEntry", function(){
    var table = $(this).parent().find("table");
    var newRow = $("<tr class='editable'><td class='del'>Del</td><td><div class='key'>New key here</div></td><td><div class='value'>New value here</div></td></tr>");
    $("tr:first", table).after(newRow);
    startEditing(newRow);
  });


	$(document).on("submit", "#new-bucket-form", function(){
            $.post( '/setBucket', {bucket: $("#bucket").val()}, function(res){
                console.log(res);
            });
        });
});

function fillEntries(bucket, entries) {
  var buckName = $(bucket).text();

  var container = $("<div></div>").addClass("collapse");
  var createButton = $("<button>").addClass("createEntry btn btn-primary").text("New entry");
  $(container).append(createButton);
  var table = $("<table></table>").addClass("table");

  $(table).append("<tr><th/><th>Key</th><th>Value</th></tr>");

  for (var key in entries) {
    if (entries.hasOwnProperty(key)) {
    	var value
    	try {
    		value = JSON.parse(entries[key]);
    		value = JSON.stringify(value ,null, '\t');
  		}
  		catch (e) {
    		console.log("error: "+e);
    		value = entries[key]
  		};
    		

      $(table).append("<tr class='editable'><td class='del'>Del</td><td><div class='key'>" + key + "</div></td><td><div class='value'>" + value + "</div></td></tr>");

    }
  }
  $(table).appendTo(container);
  $(bucket).parent().append(container);

  $(bucket).parent().children(".collapse").toggle(100);
}

function fillBuckets(buckets) {
  buckets.forEach(function(bucket, index, array) {
    //Create main container for bucket
    $("body").append("<div class=\"bucket\"><div class='del-bucket btn btn-xs'></div><h4>" + bucket + "</h4></div>");
  });
}

function getBuckets() {
  $.getJSON('/getBuckets', function(data){

		fillBuckets(data);
});
}

function getBucketEnties(bucket) {
	if ($(bucket).parent().has(".collapse").length) {
    return;
  }
	$.getJSON('/getEntries',{buck: $(bucket).text()}, function(data){

		fillEntries(bucket, data);
});
}

function deleteBucket(bucket){
	$.post('/delBucket',{bucket:bucket}, function( data ) {
});
}

function deleteBucketEntry(bucket, key) {
	$.post('/delEntry',{bucket:bucket,key:key}, function( data ) {
});
  alert("Deleting from " + bucket + " key: " + key);
}

function saveBucketEntry(bucket, key, value) {
  $.post('/setEntry',{bucket:bucket,key:key,value:value}, function( data ) {
});
}

function startEditing(row) {
  stopEditing();
  $(row).addClass("editing");

  var key = getKey(row);
  var value = getValue(row);

  //Saving old values
  addHidden(row, key, value);

  //Show editable textarea
  showEditable(row);

  showButtos(row);
}

function showEditable(row) {
  //Geting current values
  var key = $(row).find(".old-key").val();
  var value = $(row).find(".old-value").val();

  //Create textarea
  var editableKey = $("<textarea />");
  var editableValue = $("<textarea />");
  editableKey.val(key);
  editableValue.val(value);
  editableKey.addClass("key");
  editableValue.addClass("value");

  //making fields editable
  $(row).find(".key").replaceWith(editableKey);
  $(row).find(".value").replaceWith(editableValue);
  editableValue.focus();
}

function showButtos(row) {
  var saveButton = $('<input/>', {
    type: "button",
    class: "btn btn-success save-btn",
    value: "Save"
  });
  var cancelButton = $('<input/>', {
    type: "button",
    class: "btn btn-default cancel-btn",
    value: "Cancel"
  });

  saveButton.click(function() {
    var row = $(this).parent();
    var key = getKey(row);
    var value = getValue(row);
    var bucket = getBucket(row);

    var isNew = $(row).find(".old-key").val() != key;
    alert($(row).find(".old-key").val());

    $(row).find(".old-key").val(key);
    $(row).find(".old-value").val(value);
    saveBucketEntry(bucket, key, value);

    stopEditing();
    if(isNew){
      alert("New");
      getBucketEnties($(this).parents(".bucket"));
    }

  })

  cancelButton.click(function() {
    stopEditing();
  })

  $(row).append(saveButton);
  $(row).append(cancelButton);

}

function addHidden(row, key, value) {
  $('<input/>', {
    type: 'hidden',
    class: 'old-key',
    value: key
  }).appendTo(row);
  $('<input/>', {
    type: 'hidden',
    class: 'old-value',
    value: value
  }).appendTo(row);
}

function stopEditing() {
  var row = $(".editing");
    //Geting current values, it will be new if Save button pressed
  var key = $(row).find(".old-key").val();
  var value = $(row).find(".old-value").val();

  var viewKey = $("<div>");
  var viewValue = $("<div>");
  viewKey.html(key);
  viewValue.html(value);
  viewKey.addClass("key");
  viewValue.addClass("value");

  $(row).find(".key").replaceWith(viewKey);
  $(row).find(".value").replaceWith(viewValue);

  $(row).find(".save-btn").remove();
  $(row).find(".cancel-btn").remove();

  $(row).removeClass("editing");
}

function getKey(row) {
  var field = $(row).find(".key");
  if ($(field).val() != "")
    return $(field).val();

  return field.text();
}

function getValue(row) {
  var field = $(row).find(".value");
  if ($(field).val() != "")
    return $(field).val();

  return field.text();
}

function getBucket(row) {
  return $(row).parents(".bucket").find("h4").text();
}