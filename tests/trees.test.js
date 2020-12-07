
const request = require("supertest");
const server = require("../src/index");

describe("GET /", () => {
	it("it should has status code 200", function(done) {
		request(server)
			.get("/")
			.expect("Content-Type", /html/)
			.expect(200)
			.end(function(err, res) {
				done(err);
			});
	});
});

describe("Attributes parser", () => {
	const RE_ATTRS = /[\w\-]+|="([\s\S]*?)"|='([\s\S]*?)'/g; //attributes selector

	test("Elements without attributes", () => {
		expect("".match(RE_ATTRS)).toBeNull();
		expect("<br/>".match(RE_ATTRS)).toEqual(["br"]);
		expect("<br />".match(RE_ATTRS)).toEqual(["br"]);
		expect("<br>".match(RE_ATTRS)).toEqual(["br"]);
		expect(" < hr /> ".match(RE_ATTRS)).toEqual(["hr"]);
	});

	test("Multi-attributes elements", () => {
		const INPUT1 = '<input type="password" id="clave" name="clave" value="" size="35" maxlength="200" class="form-control" tabindex="2" title=" jdk fjkdlsf kdsfkla fsd" placeholder="********" />';
		expect(INPUT1.match(RE_ATTRS)).toEqual([
			"input", "type", '="password"', "id", '="clave"', "name", '="clave"', "value", '=""', "size", '="35"', 
			"maxlength", '="200"', "class", '="form-control"', "tabindex", '="2"', "title", '=" jdk fjkdlsf kdsfkla fsd"', 
			"placeholder", '="********"'
		]);

		const INPUT2 = '   <input type="password" id="clave" name="clave" value="" size="35" maxlength="200" class="form-control" tabindex="2" title=" jdk fjkdlsf kdsfkla fsd" placeholder="********" data-id="34"/>  ';
		expect(INPUT2.match(RE_ATTRS)).toEqual([
			"input", "type", '="password"', "id", '="clave"', "name", '="clave"', "value", '=""', "size", '="35"', 
			"maxlength", '="200"', "class", '="form-control"', "tabindex", '="2"', "title", '=" jdk fjkdlsf kdsfkla fsd"', 
			"placeholder", '="********"', "data-id", '="34"'
		]);

		const INPUT3 = '   <input type="password"   id="clave " name="clave" value=" jhgf " size="35" maxlength="200" class="form-control" tabindex="2" title=" jdk fjkdlsf kdsfkla fsd" placeholder="********" data-id="34"  />   ';
		expect(INPUT3.match(RE_ATTRS)).toEqual([
			"input", "type", '="password"', "id", '="clave "', "name", '="clave"', "value", '=" jhgf "', "size", '="35"', 
			"maxlength", '="200"', "class", '="form-control"', "tabindex", '="2"', "title", '=" jdk fjkdlsf kdsfkla fsd"', 
			"placeholder", '="********"', "data-id", '="34"'
		]);
	});
});
