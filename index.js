'use strict'

/* Required Packages */
const express  = require("express")
const http = require('https');
const request = require('request')
const fs = require("fs")
const path = require('path')
const XLSX = require('xlsx') // https://github.com/SheetJS/sheetjs

setupPyFormat()

let allBricks = []

class Brick {
	constructor(section, size, number, sponsor, dedication) {
		this.section = section

    // "Translate" sizes
		if (size == "S")
			this.size = "sm"
		else if (size == "M")
			this.size = "md"
		else if (size == "L")
			this.size = "lg"
		else
			this.size = size
			
		this.number = number
		this.sponsor = sponsor
		this.dedication = dedication

    this.id = this.section + this.size + this.number
	}
}

/*
** The Server
*/

const app = express()
const port = 80

app.use(express.static(path.join(__dirname, "Website"), {index: "index.html", extensions:["html"]}))

app.listen(port, () => {
	console.log("Example app listening at http://localhost:{port}".format({port: port}))
})

/*
** Periodically downloading google sheets & updating website
*/

// The sheet that you want to read NEEDS to be the first one
const google_sheet_id = "1fcKhRxRhF7vuqle7uSEYNV7x6XFNQjOHNhHbFIPEZFE"

function download_n_build() {
  request.head(`https://docs.google.com/spreadsheets/d/${google_sheet_id}/export?format=xlsx`, function(err, res, body) {
    request(`https://docs.google.com/spreadsheets/d/${google_sheet_id}/export?format=xlsx`)
    .pipe(fs.createWriteStream("Data/database.xlsx"))
    .on('close', () => { buildWebsite() }) // When its done downloading file build website
  })
}

setInterval(function () {
  download_n_build()

  console.log("Updated xlsx Sheet & Built Website")
}, 1000 * 60 * 60 * 6) // Last num is hour(s)

// When server is turned on, download data & build site
download_n_build()

/*
** Build the Website's Main Page
*/

function setAllBricksFromXLSX(file_location) {
	allBricks = []

	let sheet = XLSX.readFile(file_location);
	let sheetJSON = XLSX.utils.sheet_to_json(sheet.Sheets[sheet.SheetNames[0]])
	sheetJSON.forEach(brick => {
		allBricks.push(new Brick(brick.Section, brick.Location, brick.Brick, brick.Sponsor, brick.Dedication))
	})
}

/*function setAllBricksFromJSON(file_location) {
	allBricks = []
	
	allBricks = JSON.parse(fs.readFileSync(file_location, "utf-8"))
}*/

function exportBricksToJSON(new_file_location) {
	fs.writeFileSync(new_file_location, JSON.stringify(allBricks))
}

function viewBricks(section, size) {
	let finalBricks = []

	allBricks.forEach(brick => {
		if(brick.section == section && brick.size == size)
			finalBricks.push(brick) 
	})

	return finalBricks
}

function getSpecificBrick(view, number) {
	let output
	view.forEach(brick => { if(brick.number == number) output = brick; return; })
	if (output == undefined)
    output = new Brick("", "", 0, "None", "None")
  if (output.sponsor == undefined)
    output.sponsor = "None"
  if (output.dedication == undefined)
    output.dedication = "None"
  
  return output
}

function getOuterBrickOldNumber(number) {
	if (number <= 10)
		return number
	else if (number == 11)
		return 36
	else if (number == 12)
		return 11
	else if (number == 13)
		return 35
	else if (number == 14)
		return 12
	else if (number == 15)
		return 34
	else if (number == 16)
		return 13
	else if (number == 17)
		return 33
	else if (number == 18)
		return 14
	else if (number == 19)
		return 32
	else if (number == 20)
		return 15
	else if (number == 21)
		return 31
	else if (number == 22)
		return 16
	else if (number == 23)
		return 30
	else if (number == 24)
		return 17
	else if (number == 25)
		return 29
	else if (number == 26)
		return 18
	else if (number == 27)
		return 28
	else if (number == 28)
		return 27
	else if (number == 29)
		return 26
	else if (number == 30)
		return 25
	else if (number == 31)
		return 24
	else if (number == 32)
		return 23
	else if (number == 33)
		return 22
	else if (number == 34)
		return 21
	else if (number == 35)
		return 20
	else if (number == 36)
		return 19
}

function isEven(number) { return number % 2 == 0 ? true : false }

/*
** Build Website
*/

function buildWebsite() {
	setAllBricksFromXLSX("Data/database.xlsx")
	let website_template_HTML = fs.readFileSync("Data/index.template.html", "utf-8")

  let md_brick_template = (
  `
  <td rowspan="2" class="md" id="{BrickID}" onclick="showModal({BrickID})">
    <div class="dropdown-content">
      <div class="sponsor"><b>Sponsor:</b> {Sponsor}</div>
      <div class="dedication"><p><b>Dedication:</b> {Dedication}</p></div>
    </div>
  </td>
  `)

  let sm_brick_template = (
  `
  <td class="sm" id="{BrickID}" onclick="showModal({BrickID})">
    <div class="dropdown-content">
      <div class="sponsor"><b>Sponsor:</b> {Sponsor}</div>
      <div class="dedication"><p><b>Dedication:</b> {Dedication}</p></div>
    </div>
  </td>
  `)

  let lg_brick_template = (
  `
  <div class="lg" id="{BrickID}" onclick="showModal({BrickID})">
    <div class="dropdown-content">
      <div class="sponsor"><b>Sponsor:</b> {Sponsor}</div>
      <div class="dedication"><p><b>Dedication:</b> {Dedication}</p></div>
    </div>
  </div>
  `)

	function buildBrickGroup(section) {
		let finalGroup = (
    `
    <div class="grid-container">
      {OuterBricks}
      <div class="inner-bricks">
      <table>{InnerBricks}</table>
      </div>
    </div>
    `)

		function buildInnerBricks() {
			if(section != "W") {
				let was_last_sm = false
				function buildRow(iteration, md_bricks, sm_bricks) {
					let finalRow = "<tr>{Top}</tr> <tr>{Bottom}</tr>"
		
					let topPart = ""
					let bottomPart = ""
		
					let md_iter = 1
					let sm_iter = 1
		
          // Iterate thru all 12 rows
					for (let i = 1; i <= 12; i++) {
						if(!was_last_sm) {
							let tmp_md = getSpecificBrick(md_bricks, md_iter + iteration * 6)
              topPart += md_brick_template.format({Sponsor: tmp_md.sponsor, Dedication: tmp_md.dedication, BrickID: tmp_md.id})

							md_iter++
              
						} else {

							let tmp_sm_top = getSpecificBrick(sm_bricks, sm_iter + iteration * 12)
              topPart += sm_brick_template.format({Sponsor: tmp_sm_top.sponsor, Dedication: tmp_sm_top.dedication, BrickID: tmp_sm_top.id})

							sm_iter++
		
							let tmp_sm_bottom = getSpecificBrick(sm_bricks, sm_iter + iteration * 12)
              bottomPart += sm_brick_template.format({Sponsor: tmp_sm_bottom.sponsor, Dedication: tmp_sm_bottom.dedication, BrickID: tmp_sm_bottom.id})

							sm_iter++
						}
		
						was_last_sm = !was_last_sm
					}
		
					was_last_sm = !was_last_sm
					return finalRow.format({Top: topPart, Bottom: bottomPart})
				}
		
				let md_bricks = viewBricks(section, "md")
				let sm_bricks = viewBricks(section, "sm")
		
				let innerBricks_tmp = ""
		
				for (let i = 0; i < 12; i++)
					innerBricks_tmp += buildRow(i, md_bricks, sm_bricks)
					
				return innerBricks_tmp
			} else {
				return (
        `
        <div class="cares-logo">
          <img src="Assets/logo.jpg" width="397px" height="397px">
        </div>
        `)
			}
		}

		function buildOuterBricks() {
			let finalOuterBricks = ""

			let lg_bricks = viewBricks(section, "lg")

			for (let i = 1; i <= 36; i++) {
				let tmp_lg_brick = getSpecificBrick(lg_bricks, getOuterBrickOldNumber(i))
        finalOuterBricks += lg_brick_template.format({Sponsor: tmp_lg_brick.sponsor, Dedication: tmp_lg_brick.dedication, BrickID: tmp_lg_brick.id})
			}

			return finalOuterBricks
		}

		if(section == "W")
			finalGroup = (
      `
      <div class="grid-container">
        {OuterBricks}
        <div class="inner-bricks">
          {InnerBricks}
        </div>
      </div>
      `)

		finalGroup = finalGroup.format({OuterBricks: buildOuterBricks(), InnerBricks: buildInnerBricks()})

		return finalGroup
	}

  // To add more brick groups you need to call buildBrickGroup()
  // w/ the ID/name of the group 
  // & then add it to the template file

	//let A_Section_HTML = buildBrickGroup("A")
	let P_Section_HTML = buildBrickGroup("P")
	let W_Section_HTML = buildBrickGroup("W")
	let G_Section_HTML = buildBrickGroup("G")
	//let B_Section_HTML = buildBrickGroup("B")

	fs.writeFileSync("Website/index.html", website_template_HTML.format({P_GroupBricks: P_Section_HTML, W_GroupBricks: W_Section_HTML, G_GroupBricks: G_Section_HTML/*, A_GroupBricks: A_Section_HTML, B_GroupBricks: B_Section_HTML*/}))
}

buildWebsite()

/*
** END SOURCE -----------------------
*/

/*
** hacky fix:
**
** Needed to copy & paste an external module here for formatting b/c something's wrong with replit's module system itself
*/

function setupPyFormat() { Object.defineProperty(String.prototype,"format",{value:function(...e){let l,t=this,n=0,r=[],c=t.match(/({.*?})/g),a=(e,...l)=>e.includes("{")?(e.match(/({.*?})/g).map(t=>{let r=t.replace(/[}{]/g,""),c=+r.slice(1)&&!r.includes(".")?+r.slice(1):/:(\D)?((\d+)(\D)(\d+)?|(\D)*?(\d+))/g.exec(r),a=c.length-1;if("number"==typeof c)e=e.replace(t," ".repeat(c).replace(RegExp(`.{${l[n].length}}`),l[n]));else{let r=c[1],i=[..."<^>."].includes(r)?" ":r,o=+c[a]-l[n].length;o=o<0?l[n].length-1:o;let p=[r.includes(".")?"":i.repeat(o),l[n]],s=l[n].match(/(\d+)([.])(\d+)/g)?(+l[n]).toFixed(+c[a]):l[n].slice(0,+c[a]),d=i.repeat(+c[a]),u=Math.floor((d.length-l[n].length)/2),g=u>0?i.repeat(u)+l[n]:"",f=d.replace(RegExp(`.{${g.length||o}}`),g);n++,e=e.replace(t,(c.includes(">")?p:[...">^."].filter(e=>c.includes(e)).length<1||+t.slice(1)>0?p.reverse():c.includes("^")?[f]:[s]).join(""))}}),e):e;if("object"==typeof e[0])return c.map(l=>t=t.replace(l,e[0][/{.*?(\w+)?}/.exec(l)[1]])),t;let i=c.map(e=>{let l=/{(\w+)/.exec(e);return l?+l[1]:l});if(!i.filter(e=>isNaN(+e)||null==e).length)return i.map((l,n)=>t=t.replace(c[n],e[l])),t;let o=e.map(e=>e+""),p=[],s=[];if(c.map(e=>{let l=/{(\d+):?/.exec(e);if(l)if(+l[1]>=o.length)p.push(1);else{s.push(1);let n=e.replace(l[1],"").format(o[l[1]]);t=t.replace(e,n)}}),p.length?l="ValueError: cannot switch from automatic field numbering to manual field specification":c.length-s.length>o.length||c.length-s.length>=o.length&&s.length?l="IndexError: tuple index out of range":c.map((e,n)=>{let c=/{(\d+)?:?([+_-])?(\d+)?(\W|_)?(\d+)?([eEfFdxXobcGgn])?}/.exec(e),i=/{.*?([a-zA-Z])?}/.exec(e);if(i&&i[1]&&!c&&!["eEfFdxXobcGg"].includes(i))l=`ValueError: Unknown format code '${i[1]}' for object of type '${typeof(+o[n]||o[n])}'`;else if(e.includes("%")){let l=(100*+o[n]).toFixed(6)+"%";t=t.replace(e,l)}else if(c&&[",","_"].includes(c[4])&&+o[n]){let l=o[n].split(/(?=(?:...)*$)/).join(c[4]);t=t.replace(e,l),r.push(n)}else c&&+c[5]<=o[n].length&&!c.includes(".")?(t=t.replace(e,o[n]),r.push(n)):c&&c[3]&&!c[c.length-1]?(t=t.replace(e,a(e,o[n])),r.push(n)):c&&!c[5]&&!c[6]||c&&c[1]?(t=t.replace(e,o[n]),r.push(n)):c&&((e,l,n)=>{let c,i=e[e.length-1],p={for:{n:10,d:10,x:16,X:16,o:8,b:2},mask:{n:"",d:"",x:"0x",X:"0X",o:"0o",b:"0b","":""}},s=n.replace(/[eEfFgGdxXobn#%]/g,"");i&&(i.toLowerCase().includes("f")?c=(+o[l]>0?n.includes(" ")?" ":n.includes("+")?"+":"":"")+parseFloat(o[l]).toFixed(6):[..."dxXobn"].includes(i)?(c=(+o[l]>0?n.includes(" ")?" ":n.includes("+")?"+":n.includes("-")?"+":"":"-")+(n.includes("#")?p.mask[i]:"")+(+o[l]).toString(p.for[i]).replace("-",""),c=n.includes("X")?c.toUpperCase():c):"g"==i.toLowerCase()?c="G"==i?o[l].toUpperCase():o[l]:(c=(+o[l]).toExponential(),c=n.includes("E")?c.toUpperCase():c),c=e[5]?a(s,c):c,t=t.replace(n,c),r.push(l))})(c,n,e)}),l)throw new Error(`Traceback (most recent call last):\n\t"${t}".format(${e.map(e=>"string"==typeof e?`"${e}"`:e).join(", ")})\n`+l);return r.reverse().map(e=>o.splice(e,1)),a(t,...o)}}); }