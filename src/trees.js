
//required node modeules and config
const fs = require("fs"); //file system
const mt = require("./mime-ext"); //extensions mime-types

//regexp to split nodes (auto remove coments multiline) and attributes from input string
const RE_NODES = /(<!\[CDATA\[)([\s\S]*?)\]\]>|<!--[\s\S]*?-->|(<[^>]*>)/; //split nodes
const RE_ATTRS = /[\w\-]+|=|"[^"]*"|'[^']*'/g; //attributes selector
const TYPES = {
	NONE: 0,
	DECLARATION: 1,
	ELEMENT: 2,
	END_ELEMENT: 3,
	ATTRIBUTE: 4,
	TEXT: 5,
	CDATA: 6,
	COMMENT: 7
};

//containers
const ATTR = {};
const EMPTY = ""; //empty string
const RE_VAR = /@(\w+);/g; //reg-ex for variables
const SELF_CLOSING_TAGS = ["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];

//helpers
function isset(val) { return (typeof val != "undefined") && (val != null); }
function nvl(val, def) { return isset(val) ? val : def; }
function minify(str) { return str ? str.trim().replace(/>\s+</g, "><") : str; }
function format(str, obj) { return str.replace(RE_VAR, function(m, k) { return nvl(obj[k], m); }); }
function parse(str, obj) { return str.replace(RE_VAR, function(m, k) { return nvl(obj[k], EMPTY); }); }

//build and iterator tree
function newNode(root, parent, name, value, type, isEmpty, nodes, attributes) {
	return { //new child node
		name: name, valueHtml: value, type: type, 
		level: parent.level + 1, isEmptyElement: isEmpty, childnodes: [],
		nextAttr: function() { readAttrs(root, parent, this, nodes, attributes); },
		nextNode: function() { readNode(root, parent, nodes); }
	};
}
function newText(root, parent, value) { //add child to tree
	let child = newNode(root, parent, "#text", value, TYPES.TEXT, true);
	child.nextAttr = child.nextNode; //has no attributes
	parent.childnodes.push(child); //add child in array
	parent.valueHtml += value; //build outher html
	return parent;
}
function readAttrs(root, parent, node, nodes, attributes) {
	if (attributes.length) { //exit recursion?
		let fn = ATTR[attributes.shift()]; //read attrname
		if (fn) {
			attributes.shift(); //=
			let value = attributes.shift(); //attrvalue
			fn(root, parent, node, value.substr(1, value.length - 2));
		}
		else
			readAttrs(root, parent, node, nodes, attributes);
	}
	else {
		parent.childnodes.push(node); //push child
		node.valueHtml += node.isEmptyElement ? "" : ("</" + node.name + ">"); //close child tag
		parent.valueHtml += node.valueHtml; //add child tag to parent
		readNode(root, parent, nodes); //go sibling
	}
	return parent;
}
function readNode(root, node, nodes) { //tree
	if (nodes.length) { //exit recursion?
		let value = nodes.shift(); //read node value
		if (!value) //ignore null's and comments
			return readNode(root, node, nodes); //go sibling
		if (value.startsWith("</") || (value == "]]>"))
			return node; //end element tag => close node
		if (value.startsWith("<!") || value.startsWith("<?")) { //transform node to text
			newText(root, node, value.startsWith("<![CDATA[") ? nodes.shift() : value);
			readNode(root, node, nodes); //go sibling
		}
		else if (value.startsWith("<")) { //new node element for tree
			let attributes = value.match(RE_ATTRS); //node attributes
			let name = attributes.shift(); //extract tag name
			let isEmptyElement = value.endsWith("/>") || (SELF_CLOSING_TAGS.indexOf(name) > -1);
			let child = newNode(root, node, name, value, TYPES.ELEMENT, isEmptyElement, nodes, attributes);
			isEmptyElement || readNode(root, child, nodes); //build tree in preorder
			//execute attributes in postorder, when close element tag
			readAttrs(root, node, child, nodes, attributes);
		}
		else {
			newText(root, node, value); //default text
			readNode(root, node, nodes); //go sibling
		}
	}
	return node;
}
/*********************************************************/

/************************ HELPERS ************************/
function boolval(val) { return (val && (val != "false") && (val != "0")); };
function fnReset(res) { res.childnodes.splice(0); delete this.value; delete this.valueHtml; } //clear childnodes and output
function fnParse(root, node, text) { return text ? readNode(root, node, format(text, root.data).split(RE_NODES)) : node; }
function fnRemoveAt(str, i, n) { return /*(i < 0) ? str :*/ str.substr(0, i) + str.substr(i + n); };
function fnRemoveAttr(node, attrname, attrval) {
	let i = node.valueHtml.indexOf(attrname) - 1; //indeox of previous attribute sapce
	node.valueHtml = fnRemoveAt(node.valueHtml, i, attrname.length + attrval.length + 4);
	return node;
}
function fnReadFile(root, file) {
	try {
		return file && minify(fs.readFileSync(file, _charset));
	} catch (ex) {
		//root.msgError(ex.toString());
	}
	return null;
}
function fnLoadFile(root, node, file) {
	return fnParse(root, node, fnReadFile(root, file));
}
/************************ HELPERS ************************/

/********************* LOAD ATTRIBUTES ON TAG *********************/
ATTR.render = function(root, parent, node, attrval) { //render node and subtree
	boolval(attrval) ? node.nextAttr() : node.nextNode();
}
ATTR.remove = function(root, parent, node, attrval) { //remove node and subtree
	boolval(attrval) ? node.nextNode() : node.nextAttr();
}
ATTR.root = function(root, parent, node, attrval, nodes) { //util to html ajax
	fnRemoveAttr(node, "root", attrval);
	if (boolval(attrval)) {
		root.value = node.valueHtml + "</" + node.name + ">";
		//remove root chilnodes and set node as unique child
		root.childnodes.splice(0, root.childnodes.length - 1, node);
		return !nodes.splice(0); //stop recursion
	}
	return true;
}
ATTR.contents = function(root, parent, node, attrval, nodes) { //util to html ajax
	if (boolval(attrval)) {
		root.value = node.valueHtml.substr(node.valueHtml.indexOf(">") + 1);
		root.childnodes.splice(0); //remove root chilnodes
		root.childnodes = node.childnodes; //update childnodes
		return !nodes.splice(0); //stop recursion
	}
	fnRemoveAttr(node, "contents", attrval);
	return true;
}
ATTR.import = function(root, parent, node, attrval) {
	fnLoadFile(root, fnRemoveAttr(node, "import", attrval), attrval); //add sub-tree
	node.nextAttr();
}
ATTR.append = function(root, parent, node, attrval) {
	let data = fnReadFile(root, attrval); //read file data
	fnRemoveAttr(node, "append", attrval); //remove append attribute
	data && newText(root, node, format(data, root.data));	
	node.nextAttr();
}
ATTR.repeat = function(root, parent, node, attrval) {
	//IMPORTANT! extract repeat attribute to avoid cycles in subtree
	let html = fnRemoveAttr(node, "repeat", attrval).valueHtml + "</" + node.name + ">";
	let data = root.get(attrval) || []; //get array data
	data.forEach((row, i) => {
		row.index = i; //index base 0
		row.count = i + 1; //index base 1
		readNode(root, parent, parse(html, row).split(RE_NODES));
	});
	node.nextNode();
}
ATTR.mask = function(root, parent, node, attrval) {
	let mask = parseInt(attrval) || 0; //force intval
	fnRemoveAttr(node, "mask", attrval); //remove mask attribute
	node.childnodes = node.childnodes.filter((e, i) => { return (mask >> i) & 1; });
	node.valueHtml = node.valueHtml.substr(0, node.valueHtml.indexOf(">") + 1);
	node.childnodes.forEach(e => { node.valueHtml += e.valueHtml; });
	node.nextAttr();
}
/********************* LOAD ATTRIBUTES ON TAG *********************/

exports.attr = function(name, callback) {
	ATTR[name] = callback;
	return this;
}

//global config vars
var _tplIndex;
//var _maxage = 3600000; //1h in miliseconds
var _charset = "utf-8"; //default charset
var _staticage = 604800000; //default = 7dias

exports.start = function(opts) {
	_charset = opts.charset || _charset;
	_staticage = opts.staticage || _staticage;

	opts.templateIndex && fs.readFile(opts.templateIndex, _charset, (err, data) => {
		_tplIndex = err || minify(data);
	});
	return this;
}

exports.init = function(req, res) {
	var time = new Date(); //sysdate
	var mtime = time.getTime(); //microtime

	//extends responses
	res.status = function(status) { this.statusCode = status; return this; }
	res.setContentType = function(type) { this.setHeader("Content-Type", type); return this; }
	res.contentType = function(ext) { return this.setContentType(mt[ext] || mt.bin); }
	res.attachment = function(filename) { this.setHeader("Content-disposition", "attachment; filename=" + filename); return this; }
	res.send = function(data, type, encode) {
		this.setHeader("Content-Length", Buffer.byteLength(data, encode));
		return this.setContentType(type).end(data, encode, () => {
			fnReset(res); delete res.data; //clear childnodes and output
			console.log(">", req.url, (Date.now() - mtime) + " ms");
		});
	}
	res.text = function(data) { return this.status(200).send(data, mt.txt, _charset); } //response plain text
	res.error = function(data) { return this.status(500).send(data, mt.txt, _charset); } //response error text
	res.json = function(data) { return this.status(200).send(JSON.stringify(data), mt.json, _charset); } //response data as json
	res.html = function(data) { return this.status(200).send(data, mt.html, _charset); } //response data as html
	res.bin = function(data, type) { //response binary data to client
		this.setHeader("Cache-Control", "public, max-age=" + _staticage);
		return this.status(200).send(data, mt[type] || mt.bin, "binary");
	}

	//configure response
	res.get = function(name) { return this.data[name]; }
	res.set = function(name, value) { this.data[name] = value; return this; }
	res.add = function(data) { Object.assign(this.data, data); return this; }
	res.nvl = function(name, value) { return this.set(name, nvl(this.data[name], value)); }
	res.ifFalse = function(name, value) { return this.data[name] ? this : this.set(name, value); }
	res.copy = function(name, key) { return this.set(name, this.data[key] || EMPTY); }
	res.flush = function(name) { return this.set(name, EMPTY); }
	res.delete = function(name) { delete this.data[name]; return this.flush(name); }
	res.msgOk = function(msg) { this.data.msgOk = msg; return this; }
	res.i18nOk = function(key) { return this.msgOk(this.data[key]); }
	res.msgInfo = function(msg) { this.data.msgInfo = msg; return this; }
	res.i18nInfo = function(key) { return this.msgInfo(this.data[key]); }
	res.msgWarn = function(msg) { this.data.msgWarn = msg; return this; }
	res.i18nWarn = function(key) { return this.msgWarn(this.data[key]); }
	res.msgError = function(msg) { this.data.msgError = msg; return this; }
	res.i18nError = function(key) { return this.msgError(this.data[key]); }
	res.isOk = function() { return !this.data.msgError; } //not exists error message
	res.isError = function() { return this.data.msgError; } //exists error message
	res.flushMsgs = function() { return this.msgOk(EMPTY).msgInfo(EMPTY).msgWarn(EMPTY).msgError(EMPTY); }
	res.getValue = function() { return this.value || this.valueHtml; } //serialized html tree
	res.render = function(tpl) { return this.build(tpl).html(this.getValue()); } //response html tree
	res.build = function(tpl) { //build html tree from tpl or from preload index
		return tpl ? fnLoadFile(res, res, tpl) : fnParse(res, res, _tplIndex);
	}
	res.reset = function() {
		fnReset(res); //clear childnodes and output
		this.value = this.valueHtml = EMPTY;
		return this;
	}

	/*res.logged = function() { return this.data.startSession; } //session exists
	res.expired = function() { return ((this.data.sysdate - this.data.lastClick) > _maxage); }
	res.startSession = function() { this.data.startSession = this.data.sysdate; return this; }
	res.closeSession = function() { return this.delete("startSession"); }
	res.getSessionHelper = function() { return this.dataHelper; }
	res.setSessionHelper = function(fn, req) { //clear helper and call handler
		this.sessionHelper = function() { delete this.dataHelper; fn(req, this); };
		return this;
	}*/

	res.level = 0; //deep level
	res.name = "#root"; //default name
	res.childnodes = []; //child container
	res.data = res.data || {}; //initialize data container
	return res.reset().set("charset", _charset).copy("lastClick", "sysdate") //reset + prev click
				.set("sysdate", time).set("mtime", mtime).set("yyyy", time.getFullYear()); //sysdate
}
