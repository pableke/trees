# Tree-Ss

Build an HTML DOM in server side and response it to client.

## How It Works

1. Build a tree DOM on server to render HTML.
2. Send response procesed to client.

## Usage

### JS Applications

An express alternative

<details><summary><b>Show instructions</b></summary>

1. Install by npm:

    ```sh
    $ npm install tree-ss
    ```

</details>

## Config

Tree-Ss cahe index template, charset and static file age

1. trees.start():

	```
	trees.start({
		templateIndex: __dirname + "/views/index.html", //template index
		staticage: 1000 * 60 * 60 * 24 * 7, //default = 7days
		charset: "utf-8"
	});
	```

2. trees.init(req, res):

	```
	trees.init(req, res).render();
	```

### test

```
npm test
```