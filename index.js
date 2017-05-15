const express = require('express'),
bodyParser = require('body-parser'),
intervalTree = require('interval-tree2'),
csv = require('csv-parser'),
fs = require('fs');

const app = express(),
urlencodedParser = bodyParser.urlencoded({ extended: false });

app.set('port', 8080);

//////////////
// Interval tree to easily bin (and colour) names according to number of dogs.

itree = new intervalTree(500);
itree.add(1, 9,  '#E5D4CE'); 
itree.add(10, 49, '#7A6563'); 
itree.add(50, 249, "#7FD1B9" ); 
itree.add(250, 999, "#DE6E4B" );
itree.add(1000, 2500, "#E56399");



//////////////
// Parse CSV and generate dogs object

dogs=[];

fs.createReadStream('dogNames2.csv')
  .pipe(csv( {
  	raw:true
  }))
  .on('data', function (data) {
  	count=parseInt(data.Count_AnimalName);
  	name=String(data.Row_Labels);
  	if (!isNaN(count)) {
  		dog={};
  		dog.name=name;
  		dog.count=count;
		dogs.push(dog);  	
  	}
  })
  .on('end', function () {
    console.log("Doggos Loaded");
});


//////////////
// Takes search result, generate attachments


function gen_attachments(results){
	attachments=[]
	for (x=0;x<results.length;x++){
		attach={};
		attach.color=itree.pointSearch(results[x].count)[0].id;
		name={"title":"Name", "value":results[x].name, "short":true};
		count={"title":"# Doggos", "value":results[x].count, "short":true};
		attach.fields=[name,count];
		attachments.push(attach);
	}
	return attachments;
}


//////////////
// Webhook waiting for Slack's slash command payload and reply with a json message.
// There should be a check for Slack's token but given the content provided, didn't feel the need to.


app.post('/',urlencodedParser, function(request, response) { 
		try {
			sanitized_input=request.body.text.match(/[\w|-|\d]+/ig).join('');

			search = (sanitized_input === "topdoggos" ? ".*": sanitized_input);

			results=dogs.filter(x => new RegExp(search,'i').test(x.name))
					.sort(function (a,b){
						return b.count - a.count;
					});

			if (results.length>0) {
				attachments=gen_attachments(results.slice(0,49));
				
				response.send({'text': results.length +" doggo(s) found \n Displaying top 50 doggos",
					"response_type": "in_channel",
					"attachments":attachments
				});
			}
			else {
				response.send({'text': 'No doggo found, try topdoggos for the most popular names'});
			} 
		}
		catch (e) {
			response.send({'text': 'Invalid search, just use letters and stuff'});
		}

	});

app.listen(app.get('port'),'0.0.0.0', function() {
  console.log("Doggorama live")
});