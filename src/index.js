
//required node modeules
const http = require("http"); //http server
const url = require("url"); //url parser
const trees = require("./trees"); //server DOM parser

// Settings
trees.start({
	templateIndex: __dirname + "/views/index.html", //template index
	staticage: 1000 * 60 * 60 * 24 * 7, //default = 7days
	charset: "utf-8"
});

//create server instance
const server = http.createServer(function(req, res) {
	//set cookie and enable Cross Origin Resource Sharing (CORS)
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
	res.setHeader("Access-Control-Request-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Request-Method", "*");
	res.setHeader("Access-Control-Allow-Credentials", true);

	let parts = url.parse(req.url.toLowerCase(), true); //parse url
	let pathname = parts.pathname; //https://example.org/abc/xyz?123 = /abc/xyz
	//Static request => res.end()
	if (pathname.indexOf("/favicon.ico") > -1)
		return res.end(); //ignore icon request
	if (pathname.indexOf("/static/") > -1)
		return trees.init(req, res).file(pathname.substr(1)); //serve static file

	var time = new Date(); //sysdate
	trees.init(req, res)
		.flush("startSession").set("lang", "es").copy("lastClick", "sysdate") //prev click
		.set("sysdate", time).set("mtime", time.getTime()).set("yyyy", time.getFullYear())
		.set("steps", [{ pref: "trabajando.html", text: "working" }])
		.render();
});

//start http and https server
let port = process.env.port || 3000;
server.listen(port, "localhost");
module.exports = server;
