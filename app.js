var express=require('express');
var app=express();
var bodyParser = require('body-parser');
var session = require('express-session');
var path=require('path');
var base58 = require('./base58.js');

var mongoose=require('mongoose');

var site_name="http://localhost:3000/";

app.set('port', (process.env.PORT||3000));

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://test:test@ds127888.mlab.com:27888/shorto',function (err){
	if(err) throw err;
	console.log('Database connection successful');
});

var urlschema=mongoose.Schema({
  seq_no : {type:Number,index:true},
  long_url : {type:String},
  short_url : {type:String},
  created_at: {type:Date}
});

var counterschema=mongoose.Schema({
	seq_no : {type:Number,index:true},
	counter : {type:Number}
});

var customschema=mongoose.Schema({
	long_url : {type:String},
  short_url : {type:String},
  created_at: {type:Date}
});

var urls=mongoose.model('urls',urlschema);
var counters=mongoose.model('counters',counterschema);
var customs=mongoose.model('customs',customschema);

app.get('/', function(req, res){
  res.render('index');
});

app.get('/:encoded_id', function(req, res){
	var normalid = req.params.encoded_id;
	customs.findOne({short_url:normalid},function(err,customs){
		if(customs)
		{
			res.redirect(customs.long_url);
		}
		else
		{
			var base58Id = normalid;
		  var id = base58.decode(base58Id);

		  urls.findOne({seq_no: id}, function (err, urls){
		    if (urls) {
		      res.redirect(urls.long_url);
		    } else {
		      res.render('error');
		    }
		  });
		}
	});
});

app.get('/custom/url',function(req,res){
	res.render('custom',{code:0});
});

app.post('/custom/url/create',function(req,res){
	var long_url=req.body.urlfield;
	var short_url=req.body.keyfield;
	var date=new Date();

	customs.findOne({'short_url':short_url},function(err,result){
		if (err) throw err;

		if(result!=null)
		{
			console.log('custom url not available in custom db');
			res.render('custom',{code:1});
		}
		else
		{
			urls.findOne({'short_url':short_url},function(err,result){
				if (err) throw err;
				if(result!=null)
				{
					console.log('custom url not available in urls db');
					res.render('custom',{code:1});
				}
				else
				{
					console.log('Url available');
					var insert=customs({long_url:long_url,short_url:short_url,created_at:date}).save(function(err){
						if (err) throw err;
						console.log('Custom url added');
						res.render('url',{short_url:site_name+short_url});
					});
				}
			});
		}

	});

});


app.post('/create',function(req,res){
  var long_url=req.body.urlfield;
  var short_url="";
  var date=new Date();
	var new_seq_no;


	urls.findOne({'long_url':long_url},function(err,result){

		if (err) throw err;
		console.log(result);
		if(result!=null)
		{
			console.log('Url already exists');
			console.log(result.short_url);
			res.render('url',{short_url:site_name+result.short_url});
		}
		else
		{
			counters.findOne({seq_no: 1}, function(err,counters){
		    if(counters){
		        counters.counter += 1
		        counters.save(function(err) {
		            if (err) throw err;
		        });
		    }else{
		        console.log(err);
		    }
			});

			counters.findOne({seq_no: 1},function(err,counters){
				short_url=base58.encode(counters.counter);
				var insert=urls({seq_no:counters.counter,long_url:long_url,short_url:short_url,created_at:date}).save(function(err){
					if (err) throw err;
					console.log('Url inserted');
					console.log('Short Url'+short_url);
					res.render('url',{short_url:site_name+short_url});
				});
			});
		}
	});

});
